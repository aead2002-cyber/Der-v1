namespace DER3.Api.DTOs
{
    public sealed class FileUploadResponseDto
    {
        public string Url { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

        public long Size { get; set; }

        public string MimeType { get; set; } = string.Empty;
    }
}
