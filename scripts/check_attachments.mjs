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

for (const t of ['PolicyItem', 'Standard', '[Procedure]']) {
  const r = await pool.request().query(`SELECT COL_LENGTH('${t}', 'attachments') AS L`);
  console.log(`${t}.attachments: ${r.recordset[0].L === null ? 'MISSING' : 'OK'}`);
}
await pool.close();
