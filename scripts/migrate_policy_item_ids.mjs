// Add Standard.policyItemIds (NVARCHAR MAX) column and migrate legacy single
// policyItemId values into the new array column.
// Run: node scripts/migrate_policy_item_ids.mjs
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
  IF COL_LENGTH('Standard', 'policyItemIds') IS NULL
    ALTER TABLE Standard ADD policyItemIds NVARCHAR(MAX);
`);
console.log('✓ column ensured: Standard.policyItemIds');

// Migrate any rows that have policyItemId but empty policyItemIds
const r = await pool.request().query(`
  SELECT id, policyItemId, policyItemIds FROM Standard
  WHERE policyItemId IS NOT NULL AND LEN(policyItemId) > 0
    AND (policyItemIds IS NULL OR LEN(policyItemIds) = 0 OR policyItemIds = '[]')
`);
let migrated = 0;
for (const row of r.recordset) {
  const arr = JSON.stringify([row.policyItemId]);
  await pool.request()
    .input('id', row.id)
    .input('arr', arr)
    .query(`UPDATE Standard SET policyItemIds = @arr WHERE id = @id`);
  migrated++;
}
console.log(`✓ migrated ${migrated} legacy single-id rows into policyItemIds[]`);
await pool.close();
