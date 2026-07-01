using System.Security.Cryptography;
using DER3.Api.DTOs;
using DER3.Api.Repositories;

namespace DER3.Api.Services
{
    public sealed record FileServiceResult(bool Success, string? Error = null, FileUploadResponseDto? Upload = null);

    public sealed record DownloadFileResult(
        bool Success,
        string? Error = null,
        byte[]? Data = null,
        string? MimeType = null,
        string? OriginalName = null);

    public interface IFileService
    {
        Task<FileServiceResult> UploadAsync(IFormFile? file, CancellationToken cancellationToken);

        Task<DownloadFileResult> DownloadAsync(string id, CancellationToken cancellationToken);

        Task<FileServiceResult> DeleteAsync(string id, string? deletedBy, CancellationToken cancellationToken);
    }

    public sealed class FileService : IFileService
    {
        private const long MaxUploadBytes = 2 * 1024 * 1024;
        private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".pdf",
            ".png",
            ".jpg",
            ".jpeg",
            ".gif",
            ".webp",
            ".bmp",
            ".svg",
            ".heic",
            ".heif"
        };

        private readonly IFileRepository _fileRepository;
        private readonly IFileEncryptionService _fileEncryptionService;

        public FileService(
            IFileRepository fileRepository,
            IFileEncryptionService fileEncryptionService)
        {
            _fileRepository = fileRepository;
            _fileEncryptionService = fileEncryptionService;
        }

        public async Task<FileServiceResult> UploadAsync(IFormFile? file, CancellationToken cancellationToken)
        {
            if (file is null || file.Length == 0)
            {
                return new FileServiceResult(false, "No file uploaded");
            }

            if (file.Length > MaxUploadBytes)
            {
                return new FileServiceResult(false, "File exceeds the maximum allowed size of 2 MB");
            }

            if (!IsAllowedFile(file))
            {
                return new FileServiceResult(false, "Only images and PDF files are allowed");
            }

            byte[] plaintext;
            await using (var stream = file.OpenReadStream())
            {
                using var memoryStream = new MemoryStream();
                await stream.CopyToAsync(memoryStream, cancellationToken);
                plaintext = memoryStream.ToArray();
            }

            var encrypted = _fileEncryptionService.Encrypt(plaintext);
            var id = $"f_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{RandomHex(6)}";
            var originalName = string.IsNullOrWhiteSpace(file.FileName) ? "file" : Path.GetFileName(file.FileName);
            var mimeType = string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType;

            await _fileRepository.InsertAsync(
                new FileBlobRecord(
                    id,
                    originalName,
                    mimeType,
                    checked((int)file.Length),
                    encrypted.Iv,
                    encrypted.AuthTag,
                    encrypted.Ciphertext),
                cancellationToken);

            return new FileServiceResult(
                true,
                Upload: new FileUploadResponseDto
                {
                    Url = $"/api/files/{id}",
                    Name = originalName,
                    Size = file.Length,
                    MimeType = mimeType
                });
        }

        public async Task<DownloadFileResult> DownloadAsync(string id, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new DownloadFileResult(false, "File not found");
            }

            var file = await _fileRepository.FindByIdAsync(id.Trim(), cancellationToken);
            if (file is null)
            {
                return new DownloadFileResult(false, "File not found");
            }

            var plaintext = _fileEncryptionService.Decrypt(file.Data, file.Iv, file.AuthTag);
            return new DownloadFileResult(
                true,
                Data: plaintext,
                MimeType: file.MimeType,
                OriginalName: file.OriginalName);
        }

        public async Task<FileServiceResult> DeleteAsync(string id, string? deletedBy, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new FileServiceResult(false, "File not found");
            }

            var deleted = await _fileRepository.DeleteAsync(id.Trim(), deletedBy, cancellationToken);
            return deleted
                ? new FileServiceResult(true)
                : new FileServiceResult(false, "File not found");
        }

        private static bool IsAllowedFile(IFormFile file)
        {
            var mime = (file.ContentType ?? string.Empty).ToLowerInvariant();
            var extension = Path.GetExtension(file.FileName ?? string.Empty);

            return mime.StartsWith("image/", StringComparison.OrdinalIgnoreCase) ||
                mime.Equals("application/pdf", StringComparison.OrdinalIgnoreCase) ||
                AllowedExtensions.Contains(extension);
        }

        private static string RandomHex(int byteCount) =>
            Convert.ToHexString(RandomNumberGenerator.GetBytes(byteCount)).ToLowerInvariant();
    }
}
