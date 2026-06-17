using System.Security.Cryptography;

namespace DER3.Api.Services
{
    public sealed record EncryptedFileBytes(byte[] Ciphertext, byte[] Iv, byte[] AuthTag);

    public interface IFileEncryptionService
    {
        EncryptedFileBytes Encrypt(byte[] plaintext);

        byte[] Decrypt(byte[] ciphertext, byte[] iv, byte[] authTag);
    }

    public sealed class FileEncryptionService : IFileEncryptionService
    {
        private const int KeyBytesLength = 32;
        private const int IvBytesLength = 12;
        private const int AuthTagBytesLength = 16;
        private readonly byte[] _key;

        public FileEncryptionService(IConfiguration configuration)
        {
            var keyHex = configuration["FileStorage:EncryptionKey"];
            if (string.IsNullOrWhiteSpace(keyHex) ||
                keyHex.Length != KeyBytesLength * 2 ||
                !keyHex.All(Uri.IsHexDigit))
            {
                throw new InvalidOperationException("File storage encryption key is not configured.");
            }

            _key = Convert.FromHexString(keyHex);
        }

        public EncryptedFileBytes Encrypt(byte[] plaintext)
        {
            var iv = RandomNumberGenerator.GetBytes(IvBytesLength);
            var ciphertext = new byte[plaintext.Length];
            var authTag = new byte[AuthTagBytesLength];

            using var aes = new AesGcm(_key, AuthTagBytesLength);
            aes.Encrypt(iv, plaintext, ciphertext, authTag);

            return new EncryptedFileBytes(ciphertext, iv, authTag);
        }

        public byte[] Decrypt(byte[] ciphertext, byte[] iv, byte[] authTag)
        {
            var plaintext = new byte[ciphertext.Length];
            using var aes = new AesGcm(_key, AuthTagBytesLength);
            aes.Decrypt(iv, ciphertext, authTag, plaintext);
            return plaintext;
        }
    }
}
