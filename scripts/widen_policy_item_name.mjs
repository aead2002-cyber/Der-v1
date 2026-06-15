// Widen PolicyItem.nameAr and nameEn to NVARCHAR(MAX) and retry the failing update.
import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'Der3',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  options: { encrypt: false, trustServerCertificate: true }
};

const pool = await sql.connect(config);
await pool.request().query(`
  ALTER TABLE PolicyItem ALTER COLUMN nameAr NVARCHAR(MAX) NOT NULL;
`);
await pool.request().query(`
  ALTER TABLE PolicyItem ALTER COLUMN nameEn NVARCHAR(MAX) NOT NULL;
`);
console.log('✓ Widened PolicyItem.nameAr and nameEn to NVARCHAR(MAX)');
await pool.close();
