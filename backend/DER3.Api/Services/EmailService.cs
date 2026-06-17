using System.Net;
using System.Net.Mail;
using System.Net.Security;
using System.Net.Sockets;
using System.Security.Authentication;
using System.Text;

namespace DER3.Api.Services
{
    public sealed record SmtpDiagnosticsResult(
        bool Ok,
        string Stage,
        string? Error,
        string? Inner,
        string? SmtpStatusCode,
        string? Host,
        int Port,
        string? Encryption,
        bool EnableSsl,
        bool HasAuth,
        string? FromEmail);

    public interface IEmailService
    {
        Task SendOtpAsync(string recipientEmail, string otp, CancellationToken cancellationToken);

        Task<SmtpDiagnosticsResult> TestSmtpAsync(CancellationToken cancellationToken);
    }

    public sealed class EmailService : IEmailService
    {
        private const int SmtpTimeoutMilliseconds = 5000;
        private readonly IConfiguration _configuration;

        public EmailService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task SendOtpAsync(string recipientEmail, string otp, CancellationToken cancellationToken)
        {
            var host = _configuration["Smtp:Host"];
            var fromEmail = _configuration["Smtp:FromEmail"];
            var fromName = _configuration["Smtp:FromName"];
            var username = _configuration["Smtp:Username"];
            var password = _configuration["Smtp:Password"];
            var port = _configuration.GetValue<int?>("Smtp:Port") ?? 587;
            var enableSsl = _configuration.GetValue<bool?>("Smtp:EnableSsl") ?? true;

            if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(fromEmail))
            {
                throw new InvalidOperationException("SMTP settings are not configured.");
            }

            using var message = new MailMessage
            {
                From = new MailAddress(fromEmail, string.IsNullOrWhiteSpace(fromName) ? fromEmail : fromName),
                Subject = "DER3 login verification code",
                Body = $"Your DER3 verification code is {otp}. This code expires in 5 minutes.",
                IsBodyHtml = false
            };
            message.To.Add(recipientEmail);

            using var client = new SmtpClient(host, port)
            {
                EnableSsl = enableSsl,
                Timeout = SmtpTimeoutMilliseconds
            };

            if (!string.IsNullOrWhiteSpace(username))
            {
                client.Credentials = new NetworkCredential(username, password);
            }

            using var registration = cancellationToken.Register(client.SendAsyncCancel);
            await client.SendMailAsync(message, cancellationToken);
        }

        public async Task<SmtpDiagnosticsResult> TestSmtpAsync(CancellationToken cancellationToken)
        {
            var settings = ReadSettings();
            if (string.IsNullOrWhiteSpace(settings.Host) || string.IsNullOrWhiteSpace(settings.FromEmail))
            {
                return settings.Result(false, "config", "SMTP host or from email is not configured.");
            }

            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeout.CancelAfter(SmtpTimeoutMilliseconds);
            var token = timeout.Token;

            try
            {
                using var tcpClient = new TcpClient();
                await tcpClient.ConnectAsync(settings.Host, settings.Port, token);
                await using var networkStream = tcpClient.GetStream();

                var stream = (Stream)networkStream;
                var banner = await ReadResponseAsync(stream, token);
                if (!banner.IsPositive)
                {
                    return settings.Result(false, "connect", banner.Text, smtpStatusCode: banner.StatusCodeText);
                }

                var ehlo = await SendCommandAsync(stream, $"EHLO {Environment.MachineName}", token);
                if (!ehlo.IsPositive)
                {
                    return settings.Result(false, "connect", ehlo.Text, smtpStatusCode: ehlo.StatusCodeText);
                }

                if (settings.EnableSsl || IsTls(settings.Encryption))
                {
                    var startTls = await SendCommandAsync(stream, "STARTTLS", token);
                    if (!startTls.IsPositive)
                    {
                        return settings.Result(false, "tls", startTls.Text, smtpStatusCode: startTls.StatusCodeText);
                    }

                    var sslStream = new SslStream(networkStream, leaveInnerStreamOpen: false);
                    await sslStream
                        .AuthenticateAsClientAsync(settings.Host)
                        .WaitAsync(token);
                    stream = sslStream;

                    var tlsEhlo = await SendCommandAsync(stream, $"EHLO {Environment.MachineName}", token);
                    if (!tlsEhlo.IsPositive)
                    {
                        return settings.Result(false, "tls", tlsEhlo.Text, smtpStatusCode: tlsEhlo.StatusCodeText);
                    }
                }

                if (settings.HasAuth)
                {
                    var auth = await SendCommandAsync(stream, "AUTH LOGIN", token);
                    if (auth.StatusCode != 334)
                    {
                        return settings.Result(false, "auth", auth.Text, smtpStatusCode: auth.StatusCodeText);
                    }

                    var user = Convert.ToBase64String(Encoding.UTF8.GetBytes(settings.Username ?? string.Empty));
                    var userResponse = await SendCommandAsync(stream, user, token);
                    if (userResponse.StatusCode != 334)
                    {
                        return settings.Result(false, "auth", userResponse.Text, smtpStatusCode: userResponse.StatusCodeText);
                    }

                    var pass = Convert.ToBase64String(Encoding.UTF8.GetBytes(settings.Password ?? string.Empty));
                    var passResponse = await SendCommandAsync(stream, pass, token);
                    if (!passResponse.IsPositive)
                    {
                        return settings.Result(false, "auth", passResponse.Text, smtpStatusCode: passResponse.StatusCodeText);
                    }
                }

                var mailFrom = await SendCommandAsync(stream, $"MAIL FROM:<{settings.FromEmail}>", token);
                if (!mailFrom.IsPositive)
                {
                    return settings.Result(false, "send", mailFrom.Text, smtpStatusCode: mailFrom.StatusCodeText);
                }

                var rcptTo = await SendCommandAsync(stream, $"RCPT TO:<{settings.FromEmail}>", token);
                if (!rcptTo.IsPositive)
                {
                    return settings.Result(false, "send", rcptTo.Text, smtpStatusCode: rcptTo.StatusCodeText);
                }

                var data = await SendCommandAsync(stream, "DATA", token);
                if (data.StatusCode != 354)
                {
                    return settings.Result(false, "send", data.Text, smtpStatusCode: data.StatusCodeText);
                }

                var body = "Subject: DER3 SMTP diagnostic\r\n\r\nSMTP diagnostic test only.\r\n.";
                var send = await SendCommandAsync(stream, body, token);
                if (!send.IsPositive)
                {
                    return settings.Result(false, "send", send.Text, smtpStatusCode: send.StatusCodeText);
                }

                await SendCommandAsync(stream, "QUIT", token);
                return settings.Result(true, "send", null, smtpStatusCode: send.StatusCodeText);
            }
            catch (OperationCanceledException ex) when (!cancellationToken.IsCancellationRequested)
            {
                return settings.Result(false, "connect", "SMTP diagnostic timed out after 5 seconds.", ex.GetType().Name);
            }
            catch (SocketException ex)
            {
                return settings.Result(false, "connect", ex.Message, ex.GetType().Name, ex.SocketErrorCode.ToString());
            }
            catch (AuthenticationException ex)
            {
                return settings.Result(false, "tls", ex.Message, ex.InnerException?.Message);
            }
            catch (IOException ex)
            {
                return settings.Result(false, "send", ex.Message, ex.InnerException?.Message);
            }
            catch (Exception ex)
            {
                return settings.Result(false, "send", ex.Message, ex.InnerException?.Message);
            }
        }

        private SmtpSettings ReadSettings()
        {
            var host = _configuration["Smtp:Host"];
            var fromEmail = _configuration["Smtp:FromEmail"];
            var username = _configuration["Smtp:Username"];
            var password = _configuration["Smtp:Password"];
            var encryption = _configuration["Smtp:Encryption"];
            var port = _configuration.GetValue<int?>("Smtp:Port") ?? 587;
            var enableSsl = _configuration.GetValue<bool?>("Smtp:EnableSsl") ?? true;

            return new SmtpSettings(
                host,
                port,
                encryption,
                enableSsl,
                !string.IsNullOrWhiteSpace(username),
                fromEmail,
                username,
                password);
        }

        private static bool IsTls(string? encryption) =>
            string.Equals(encryption, "tls", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(encryption, "starttls", StringComparison.OrdinalIgnoreCase);

        private static async Task<SmtpResponse> SendCommandAsync(Stream stream, string command, CancellationToken cancellationToken)
        {
            var bytes = Encoding.ASCII.GetBytes(command + "\r\n");
            await stream.WriteAsync(bytes, cancellationToken);
            await stream.FlushAsync(cancellationToken);
            return await ReadResponseAsync(stream, cancellationToken);
        }

        private static async Task<SmtpResponse> ReadResponseAsync(Stream stream, CancellationToken cancellationToken)
        {
            var buffer = new byte[4096];
            var text = new StringBuilder();

            while (true)
            {
                var read = await stream.ReadAsync(buffer, cancellationToken);
                if (read == 0)
                {
                    break;
                }

                text.Append(Encoding.ASCII.GetString(buffer, 0, read));
                var responseText = text.ToString();
                var lines = responseText.Split("\r\n", StringSplitOptions.RemoveEmptyEntries);
                if (lines.Length > 0 && lines[^1].Length >= 4 && lines[^1][3] == ' ')
                {
                    break;
                }
            }

            return SmtpResponse.Parse(text.ToString());
        }

        private sealed record SmtpSettings(
            string? Host,
            int Port,
            string? Encryption,
            bool EnableSsl,
            bool HasAuth,
            string? FromEmail,
            string? Username,
            string? Password)
        {
            public SmtpDiagnosticsResult Result(
                bool ok,
                string stage,
                string? error,
                string? inner = null,
                string? smtpStatusCode = null) =>
                new(ok, stage, error, inner, smtpStatusCode, Host, Port, Encryption, EnableSsl, HasAuth, FromEmail);
        }

        private sealed record SmtpResponse(int StatusCode, string Text)
        {
            public bool IsPositive => StatusCode is >= 200 and < 400;

            public string? StatusCodeText => StatusCode > 0 ? StatusCode.ToString() : null;

            public static SmtpResponse Parse(string text)
            {
                var trimmed = text.Trim();
                var firstLine = trimmed.Split("\r\n", StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? string.Empty;
                return firstLine.Length >= 3 && int.TryParse(firstLine[..3], out var statusCode)
                    ? new SmtpResponse(statusCode, trimmed)
                    : new SmtpResponse(0, trimmed);
            }
        }
    }
}
