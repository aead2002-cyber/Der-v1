import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

const pool = await sql.connect({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'Der3',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  options: { encrypt: false, trustServerCertificate: true }
});

await pool.request().query(`
  IF COL_LENGTH('PolicyItem', 'attachments') IS NULL
    ALTER TABLE PolicyItem ADD attachments NVARCHAR(MAX);
  IF COL_LENGTH('Standard', 'attachments') IS NULL
    ALTER TABLE Standard ADD attachments NVARCHAR(MAX);
  IF COL_LENGTH('[Procedure]', 'attachments') IS NULL
    ALTER TABLE [Procedure] ADD attachments NVARCHAR(MAX);
`);
console.log('✓ attachments columns ensured');
await pool.close();
