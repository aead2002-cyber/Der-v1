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
await pool.request().query(`IF COL_LENGTH('[User]','displayNameEn') IS NULL ALTER TABLE [User] ADD displayNameEn NVARCHAR(255) NULL;`);
console.log('✓ User.displayNameEn ensured');
await pool.close();
