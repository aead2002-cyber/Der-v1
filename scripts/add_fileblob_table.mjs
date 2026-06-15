import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

const pool = await sql.connect({
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'Der3',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  options: { encrypt: false, trustServerCertificate: true }
});

await pool.request().query(`
  IF OBJECT_ID('FileBlob', 'U') IS NULL
    CREATE TABLE FileBlob (
      id NVARCHAR(64) PRIMARY KEY,
      originalName NVARCHAR(500),
      mimeType NVARCHAR(255),
      size INT,
      iv VARBINARY(16),
      authTag VARBINARY(16),
      data VARBINARY(MAX),
      createdAt DATETIME
    );
`);
console.log('✓ FileBlob table ensured');
await pool.close();
