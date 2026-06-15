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
  IF COL_LENGTH('Standard', 'potentialRisksAr') IS NULL
    ALTER TABLE Standard ADD potentialRisksAr NVARCHAR(MAX);
  IF COL_LENGTH('Standard', 'potentialRisksEn') IS NULL
    ALTER TABLE Standard ADD potentialRisksEn NVARCHAR(MAX);
`);
console.log('✓ potentialRisks columns ensured');
await pool.close();
