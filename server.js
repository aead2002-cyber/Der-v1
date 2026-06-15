import express from 'express';
import cors from 'cors';
import sql from 'mssql';
import dotenv from 'dotenv';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Use memory storage so we can encrypt the buffer and store it directly in DB
const storage = multer.memoryStorage();

// ─── File encryption (AES-256-GCM) ───────────────────────────────────────
// Key from FILE_ENCRYPTION_KEY env var (64 hex chars = 32 bytes).
// If missing, derive a stable key from a fallback secret + DB name (with warning).
const getEncryptionKey = () => {
  const fromEnv = process.env.FILE_ENCRYPTION_KEY;
  if (fromEnv && /^[0-9a-fA-F]{64}$/.test(fromEnv)) {
    return Buffer.from(fromEnv, 'hex');
  }
  if (!global.__FILE_KEY_WARNED__) {
    console.warn('[security] FILE_ENCRYPTION_KEY not set — deriving from fallback secret. Set a 32-byte hex key in .env for production.');
    global.__FILE_KEY_WARNED__ = true;
  }
  return crypto.createHash('sha256').update(`der3-fallback-${process.env.DB_DATABASE || 'Der3'}`).digest();
};

const encryptBuffer = (plain) => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 12 bytes recommended for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { ciphertext, iv, authTag };
};

const decryptBuffer = (ciphertext, iv, authTag) => {
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
};

const ALLOWED_MIME_PREFIXES = ['image/'];
const ALLOWED_MIME_EXACT = new Set(['application/pdf']);
const ALLOWED_EXT = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg', '.heic', '.heif']);

const fileFilter = (req, file, cb) => {
  const mime = (file.mimetype || '').toLowerCase();
  const ext = path.extname(file.originalname || '').toLowerCase();
  const ok =
    ALLOWED_MIME_PREFIXES.some(p => mime.startsWith(p)) ||
    ALLOWED_MIME_EXACT.has(mime) ||
    ALLOWED_EXT.has(ext);
  if (ok) return cb(null, true);
  const err = new Error('Only images and PDF files are allowed');
  err.code = 'INVALID_FILE_TYPE';
  cb(err);
};

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB
const upload = multer({ storage, limits: { fileSize: MAX_UPLOAD_BYTES }, fileFilter });

const PASSWORD_FIELDS = ['passwordHash', 'passwordSalt'];

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
  return { passwordHash: hash, passwordSalt: salt };
};

const verifyPasswordHash = (password, salt, hash) => {
  if (!salt || !hash) return false;
  const computed = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
  const a = Buffer.from(computed, 'hex');
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

app.post('/api/uploads', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: `File exceeds the maximum allowed size of ${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)} MB` });
      }
      if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(415).json({ error: err.message });
      }
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const { ciphertext, iv, authTag } = encryptBuffer(req.file.buffer);
    const id = `f_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

    const pool = await connectPool();
    await pool.request()
      .input('id', sql.NVarChar(64), id)
      .input('originalName', sql.NVarChar(500), originalName)
      .input('mimeType', sql.NVarChar(255), req.file.mimetype || 'application/octet-stream')
      .input('size', sql.Int, req.file.size)
      .input('iv', sql.VarBinary(16), iv)
      .input('authTag', sql.VarBinary(16), authTag)
      .input('data', sql.VarBinary(sql.MAX), ciphertext)
      .input('createdAt', sql.DateTime, new Date())
      .query(`INSERT INTO FileBlob (id, originalName, mimeType, size, iv, authTag, data, createdAt)
              VALUES (@id, @originalName, @mimeType, @size, @iv, @authTag, @data, @createdAt)`);

    return res.json({
      url: `/api/files/${id}`,
      name: originalName,
      size: req.file.size,
      mimeType: req.file.mimetype
    });
  } catch (err) {
    console.error('upload encrypt+save failed:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/files/:id', async (req, res) => {
  try {
    const pool = await connectPool();
    const r = await pool.request()
      .input('id', sql.NVarChar(64), req.params.id)
      .query(`SELECT originalName, mimeType, iv, authTag, data FROM FileBlob WHERE id = @id`);
    const row = r.recordset[0];
    if (!row) return res.status(404).json({ error: 'File not found' });
    const plain = decryptBuffer(row.data, row.iv, row.authTag);
    res.setHeader('Content-Type', row.mimeType || 'application/octet-stream');
    // Encode filename per RFC 5987 so non-ASCII (Arabic) names work
    const safeName = encodeURIComponent(row.originalName || 'file');
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${safeName}`);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(plain);
  } catch (err) {
    console.error('file fetch/decrypt failed:', err);
    return res.status(500).json({ error: err.message });
  }
});

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'Der3',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

const tableMap = {
  users: { table: '[User]', idColumn: 'uid', jsonFields: ['teams', 'departments', 'permissionOverrides'] },
  permissionGroups: { table: 'PermissionGroup', idColumn: 'id', jsonFields: ['permissions'] },
  policies: { table: 'Policy', idColumn: 'id' },
  policyItems: { table: 'PolicyItem', idColumn: 'id', jsonFields: ['attachments'] },
  standards: { table: 'Standard', idColumn: 'id', jsonFields: ['classifications', 'attachments', 'policyItemIds'] },
  procedures: { table: '[Procedure]', idColumn: 'id', jsonFields: ['assignedTo', 'assignedTeams', 'attachments', 'comments'] },
  auditLogs: { table: 'AuditLog', idColumn: 'id' },
  changeRequests: { table: 'ChangeRequest', idColumn: 'id', jsonFields: ['attachments', 'history'] },
  lookupOptions: { table: 'LookupOption', idColumn: 'id' },
  evidence: { table: 'Evidence', idColumn: 'id' },
  frameworks: { table: 'Framework', idColumn: 'id' },
  standardClassifications: { table: 'StandardClassification', idColumn: 'id' },
  teams: { table: 'Team', idColumn: 'id' },
  departments: { table: 'Department', idColumn: 'id' },
  commitments: { table: 'Commitment', idColumn: 'id' },
  notificationTemplates: { table: 'NotificationTemplate', idColumn: 'id' },
  notificationLogs: { table: 'NotificationLog', idColumn: 'id' },
  incidents: { table: 'SecurityIncident', idColumn: 'id', jsonFields: ['attachments'] },
  incidentNotes: { table: 'IncidentNote', idColumn: 'id', jsonFields: ['attachments'] },
  incidentFeedback: { table: 'IncidentFeedback', idColumn: 'id' },
  notifications: { table: 'Notification', idColumn: 'id' },
  risks: { table: 'Risk', idColumn: 'id', jsonFields: ['procedureIds'] }
};

const tableColumnsCache = new Map();
const stripBrackets = (name) => name.replace(/^\[/, '').replace(/\]$/, '');

const getTableColumns = async (pool, tableExpr) => {
  if (tableColumnsCache.has(tableExpr)) return tableColumnsCache.get(tableExpr);
  const tableName = stripBrackets(tableExpr);
  const result = await pool.request()
    .input('t', tableName)
    .query(`SELECT name FROM sys.columns WHERE object_id = OBJECT_ID(@t)`);
  const cols = new Set(result.recordset.map(r => r.name));
  tableColumnsCache.set(tableExpr, cols);
  return cols;
};

const filterToColumns = (item, cols, entity) => {
  const out = {};
  const dropped = [];
  for (const [k, v] of Object.entries(item)) {
    if (cols.has(k)) out[k] = v; else dropped.push(k);
  }
  if (dropped.length) {
    console.warn(`[${entity}] dropped unknown columns:`, dropped.join(', '));
  }
  return out;
};

const parseJsonFields = (rows, fields) => {
  if (!fields || !fields.length) return rows;
  return rows.map(row => {
    const out = { ...row };
    for (const f of fields) {
      const v = out[f];
      if (typeof v === 'string' && v.length > 0) {
        try { out[f] = JSON.parse(v); } catch { /* keep as-is */ }
      } else if (v == null) {
        out[f] = [];
      }
    }
    return out;
  });
};

const connectPool = async () => {
  const pool = await sql.connect(config);
  return pool;
};

const normalizeValue = (value) => {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value) || typeof value === 'object') {
    return JSON.stringify(value);
  }
  return value;
};

const buildInsertQuery = (table, data) => {
  const keys = Object.keys(data);
  const columns = keys.map(k => `[${k}]`).join(', ');
  const params = keys.map((_, idx) => `@p${idx}`).join(', ');
  return {
    query: `INSERT INTO ${table} (${columns}) VALUES (${params})`,
    keys
  };
};

app.get('/api/:entity', async (req, res) => {
  const entity = req.params.entity;
  const mapping = tableMap[entity];
  if (!mapping) return res.status(404).json({ error: 'Entity not supported' });

  try {
    const pool = await connectPool();
    const result = await pool.request().query(`SELECT * FROM ${mapping.table}`);
    let records = result.recordset;
    if (entity === 'users') {
      records = records.map(row => {
        const sanitized = { ...row };
        for (const field of PASSWORD_FIELDS) delete sanitized[field];
        return sanitized;
      });
    }
    records = parseJsonFields(records, mapping.jsonFields);
    return res.json(records);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/:entity/bulk', async (req, res) => {
  const entity = req.params.entity;
  const mapping = tableMap[entity];
  const data = req.body;

  if (!mapping) return res.status(404).json({ error: 'Entity not supported' });
  if (!Array.isArray(data)) return res.status(400).json({ error: 'Bulk payload must be an array' });

  try {
    const pool = await connectPool();
    const cols = await getTableColumns(pool, mapping.table);
    const idCol = mapping.idColumn;

    // Snapshot existing IDs for diff. SQL Server uses case-insensitive collation by default,
    // so normalize to lowercase to match SQL's matching behavior.
    const norm = (v) => (v == null ? '' : String(v).toLowerCase());
    const existingRows = await pool.request().query(`SELECT [${idCol}] FROM ${mapping.table}`);
    const existingIdMap = new Map();
    for (const r of existingRows.recordset) existingIdMap.set(norm(r[idCol]), r[idCol]);
    const incomingIdsLc = new Set(data.map(d => norm(d[idCol])).filter(v => v));

    // Preserve user passwords across upserts
    const passwordsByUid = new Map();
    if (entity === 'users') {
      const pw = await pool.request().query(`SELECT uid, passwordHash, passwordSalt FROM ${mapping.table}`);
      for (const row of pw.recordset) {
        passwordsByUid.set(row.uid, { passwordHash: row.passwordHash, passwordSalt: row.passwordSalt });
      }
    }

    let upserted = 0;
    for (const item of data) {
      const merged = { ...item };
      if (entity === 'users') {
        const preserved = passwordsByUid.get(item.uid);
        if (preserved && preserved.passwordHash && merged.passwordHash === undefined) {
          merged.passwordHash = preserved.passwordHash;
          merged.passwordSalt = preserved.passwordSalt;
        }
      }
      const filtered = filterToColumns(merged, cols, entity);
      const safeItem = Object.fromEntries(Object.entries(filtered).map(([k, v]) => [k, normalizeValue(v)]));
      const id = safeItem[idCol];

      // UPSERT via IF EXISTS so SQL collation handles ID matching correctly
      const allKeys = Object.keys(safeItem);
      const updateKeys = allKeys.filter(k => k !== idCol);
      const insertCols = allKeys.map(k => `[${k}]`).join(', ');
      const insertParams = allKeys.map((_, i) => `@p${i}`).join(', ');
      const setClause = updateKeys.map((k, i) => `[${k}] = @u${i}`).join(', ');

      const request = pool.request();
      allKeys.forEach((k, i) => request.input(`p${i}`, safeItem[k]));
      updateKeys.forEach((k, i) => request.input(`u${i}`, safeItem[k]));
      request.input('idVal', id);

      const sql = updateKeys.length > 0
        ? `IF EXISTS (SELECT 1 FROM ${mapping.table} WHERE [${idCol}] = @idVal)
             UPDATE ${mapping.table} SET ${setClause} WHERE [${idCol}] = @idVal;
           ELSE
             INSERT INTO ${mapping.table} (${insertCols}) VALUES (${insertParams});`
        : `IF NOT EXISTS (SELECT 1 FROM ${mapping.table} WHERE [${idCol}] = @idVal)
             INSERT INTO ${mapping.table} (${insertCols}) VALUES (${insertParams});`;
      await request.query(sql);
      upserted++;
    }

    // Delete rows present in DB but missing in payload (use original-case IDs from DB)
    const toDelete = [];
    for (const [lc, originalId] of existingIdMap.entries()) {
      if (!incomingIdsLc.has(lc)) toDelete.push(originalId);
    }
    const deletionErrors = [];
    for (const id of toDelete) {
      try {
        await pool.request().input('id', id).query(`DELETE FROM ${mapping.table} WHERE [${idCol}] = @id`);
      } catch (err) {
        deletionErrors.push({ id, error: err.message });
      }
    }

    if (deletionErrors.length > 0) {
      return res.status(409).json({
        success: false,
        upserted,
        deletionErrors,
        error: `Could not delete ${deletionErrors.length} row(s) (foreign key constraints — delete dependent rows first)`
      });
    }

    return res.json({ success: true, upserted, deleted: toDelete.length });
  } catch (err) {
    console.error(`[${entity}] bulk failed:`, err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/:entity', async (req, res) => {
  const entity = req.params.entity;
  const mapping = tableMap[entity];
  const data = req.body;

  if (!mapping) return res.status(404).json({ error: 'Entity not supported' });
  if (!data || typeof data !== 'object') return res.status(400).json({ error: 'Payload must be an object' });

  try {
    const pool = await connectPool();
    const cols = await getTableColumns(pool, mapping.table);
    const filtered = filterToColumns(data, cols, entity);
    const safeItem = Object.fromEntries(Object.entries(filtered).map(([k, v]) => [k, normalizeValue(v)]));
    const { query, keys } = buildInsertQuery(mapping.table, safeItem);
    const request = pool.request();
    keys.forEach((key, idx) => request.input(`p${idx}`, safeItem[key]));
    await request.query(query);
    return res.json({ success: true, item: safeItem });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/:entity/:id', async (req, res) => {
  const entity = req.params.entity;
  const id = req.params.id;
  const mapping = tableMap[entity];
  const data = req.body;

  if (!mapping) return res.status(404).json({ error: 'Entity not supported' });
  if (!data || typeof data !== 'object') return res.status(400).json({ error: 'Payload must be an object' });

  try {
    const pool = await connectPool();
    const cols = await getTableColumns(pool, mapping.table);
    const filtered = filterToColumns(data, cols, entity);
    const safeItem = Object.fromEntries(Object.entries(filtered).map(([k, v]) => [k, normalizeValue(v)]));
    const setClause = Object.keys(safeItem).map((k, idx) => `[${k}] = @p${idx}`).join(', ');
    const request = pool.request();
    Object.keys(safeItem).forEach((key, idx) => request.input(`p${idx}`, safeItem[key]));
    request.input('id', id);
    await request.query(`UPDATE ${mapping.table} SET ${setClause} WHERE ${mapping.idColumn} = @id`);
    return res.json({ success: true, item: safeItem });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/:entity/:id', async (req, res) => {
  const entity = req.params.entity;
  const id = req.params.id;
  const mapping = tableMap[entity];

  if (!mapping) return res.status(404).json({ error: 'Entity not supported' });

  try {
    const pool = await connectPool();
    await pool.request().input('id', id).query(`DELETE FROM ${mapping.table} WHERE ${mapping.idColumn} = @id`);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/:uid/password', async (req, res) => {
  const uid = req.params.uid;
  const password = req.body && req.body.password;

  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const pool = await connectPool();
    const { passwordHash, passwordSalt } = hashPassword(password);
    const result = await pool.request()
      .input('uid', uid)
      .input('hash', passwordHash)
      .input('salt', passwordSalt)
      .query(`UPDATE [User] SET passwordHash = @hash, passwordSalt = @salt WHERE uid = @uid`);
    if (!result.rowsAffected[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/verify', async (req, res) => {
  const email = req.body && req.body.email;
  const password = req.body && req.body.password;

  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ ok: false, error: 'Email and password required' });
  }

  try {
    const pool = await connectPool();
    const result = await pool.request()
      .input('email', email.trim().toLowerCase())
      .query(`SELECT uid, passwordHash, passwordSalt FROM [User] WHERE LOWER(email) = @email`);
    const row = result.recordset[0];
    if (!row) return res.json({ ok: false });

    if (!row.passwordHash || !row.passwordSalt) {
      return res.json({ ok: password === 'password123', defaultPassword: true });
    }
    const ok = verifyPasswordHash(password, row.passwordSalt, row.passwordHash);
    return res.json({ ok });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

const buildTransporter = (settings) => {
  const { smtpServer, smtpPort, smtpUser, smtpPassword, encryption } = settings;
  const port = parseInt(smtpPort, 10);
  const hasAuth = Boolean(smtpUser && smtpPassword);
  return nodemailer.createTransport({
    host: smtpServer,
    port,
    secure: encryption === 'ssl',
    requireTLS: encryption === 'tls',
    auth: hasAuth ? { user: smtpUser, pass: smtpPassword } : undefined,
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
};

const formatSmtpError = (stage, err) => ({
  ok: false,
  stage,
  code: err.code || null,
  command: err.command || null,
  response: err.response || null,
  error: err.message
});

app.post('/api/email/test', async (req, res) => {
  const { settings, recipient } = req.body || {};
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ ok: false, stage: 'validation', error: 'settings required' });
  }
  if (!recipient || typeof recipient !== 'string') {
    return res.status(400).json({ ok: false, stage: 'validation', error: 'recipient required' });
  }
  const { smtpServer, smtpPort, senderEmail, senderName } = settings;
  if (!smtpServer || !smtpPort || !senderEmail) {
    return res.status(400).json({ ok: false, stage: 'validation', error: 'incomplete settings' });
  }

  const transporter = buildTransporter(settings);

  try {
    await transporter.verify();
  } catch (err) {
    return res.status(502).json(formatSmtpError('verify', err));
  }

  try {
    const info = await transporter.sendMail({
      from: senderName ? `"${senderName}" <${senderEmail}>` : senderEmail,
      to: recipient,
      subject: 'DER3 SMTP Test',
      text: 'This is a test message from DER3 to verify SMTP configuration.',
      html: '<p>This is a test message from <b>DER3</b> to verify SMTP configuration.</p>'
    });
    return res.json({
      ok: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response
    });
  } catch (err) {
    return res.status(502).json(formatSmtpError('send', err));
  }
});

app.post('/api/email/send', async (req, res) => {
  const { settings, to, cc, subject, html, text } = req.body || {};
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ ok: false, stage: 'validation', error: 'settings required' });
  }
  if (!to || !subject || (!html && !text)) {
    return res.status(400).json({ ok: false, stage: 'validation', error: 'to, subject and body required' });
  }
  const { smtpServer, smtpPort, senderEmail, senderName } = settings;
  if (!smtpServer || !smtpPort || !senderEmail) {
    return res.status(400).json({ ok: false, stage: 'validation', error: 'incomplete settings' });
  }

  const transporter = buildTransporter(settings);
  try {
    const info = await transporter.sendMail({
      from: senderName ? `"${senderName}" <${senderEmail}>` : senderEmail,
      to,
      cc: Array.isArray(cc) && cc.length ? cc : undefined,
      subject,
      text,
      html
    });
    return res.json({
      ok: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response
    });
  } catch (err) {
    console.error('email/send failed:', err.message);
    return res.status(502).json(formatSmtpError('send', err));
  }
});

const ensureSchema = async () => {
  const pool = await connectPool();
  const safeBatch = async (label, query) => {
    try {
      await pool.request().query(query);
    } catch (err) {
      console.warn(`[schema] step "${label}" skipped: ${err.message}`);
    }
  };
  // Rename legacy Policy.framework -> frameworkId (must run in its own batch before later refs).
  await safeBatch('rename Policy.framework', `
    IF COL_LENGTH('Policy', 'frameworkId') IS NULL AND COL_LENGTH('Policy', 'framework') IS NOT NULL
      EXEC sp_rename 'Policy.framework', 'frameworkId', 'COLUMN';
  `);
  await pool.request().query(`
    IF COL_LENGTH('Policy', 'frameworkId') IS NULL
      ALTER TABLE Policy ADD frameworkId NVARCHAR(64) NULL;
    IF COL_LENGTH('Standard', 'policyItemId') IS NULL
      ALTER TABLE Standard ADD policyItemId NVARCHAR(64) NULL;
    IF COL_LENGTH('AuditLog', 'ip') IS NULL
      ALTER TABLE AuditLog ADD ip NVARCHAR(64) NULL;
    IF COL_LENGTH('AuditLog', 'userAgent') IS NULL
      ALTER TABLE AuditLog ADD userAgent NVARCHAR(MAX) NULL;
  `);
  // Drop legacy PolicyItem.orderNum column (replaced by [order]).
  // Run via EXEC so SQL doesn't compile the inner statements when orderNum doesn't exist.
  await safeBatch('drop legacy orderNum', `
    IF COL_LENGTH('PolicyItem', 'orderNum') IS NOT NULL AND COL_LENGTH('PolicyItem', 'order') IS NOT NULL
    BEGIN
      EXEC('UPDATE PolicyItem SET [order] = orderNum WHERE [order] IS NULL');
      DECLARE @def NVARCHAR(200);
      SELECT @def = name FROM sys.default_constraints
      WHERE parent_object_id = OBJECT_ID('PolicyItem')
        AND parent_column_id = (SELECT column_id FROM sys.columns WHERE object_id = OBJECT_ID('PolicyItem') AND name = 'orderNum');
      IF @def IS NOT NULL EXEC('ALTER TABLE PolicyItem DROP CONSTRAINT ' + @def);
      EXEC('ALTER TABLE PolicyItem DROP COLUMN orderNum');
    END
  `);
  await pool.request().query(`
    IF COL_LENGTH('[User]', 'passwordHash') IS NULL
      ALTER TABLE [User] ADD passwordHash NVARCHAR(MAX) NULL;
    IF COL_LENGTH('[User]', 'passwordSalt') IS NULL
      ALTER TABLE [User] ADD passwordSalt NVARCHAR(MAX) NULL;

    IF OBJECT_ID('Framework', 'U') IS NULL
      CREATE TABLE Framework (
        id NVARCHAR(64) PRIMARY KEY,
        nameAr NVARCHAR(255) NOT NULL,
        nameEn NVARCHAR(255) NOT NULL,
        descriptionAr NVARCHAR(MAX),
        descriptionEn NVARCHAR(MAX),
        createdAt DATETIME,
        updatedAt DATETIME
      );

    IF OBJECT_ID('StandardClassification', 'U') IS NULL
      CREATE TABLE StandardClassification (
        id NVARCHAR(64) PRIMARY KEY,
        nameAr NVARCHAR(255) NOT NULL,
        nameEn NVARCHAR(255) NOT NULL,
        createdAt DATETIME,
        updatedAt DATETIME
      );

    IF OBJECT_ID('Team', 'U') IS NULL
      CREATE TABLE Team (
        id NVARCHAR(64) PRIMARY KEY,
        nameAr NVARCHAR(255) NOT NULL,
        nameEn NVARCHAR(255) NOT NULL,
        descriptionAr NVARCHAR(MAX),
        descriptionEn NVARCHAR(MAX),
        createdAt DATETIME,
        updatedAt DATETIME
      );

    IF OBJECT_ID('Department', 'U') IS NULL
      CREATE TABLE Department (
        id NVARCHAR(64) PRIMARY KEY,
        nameAr NVARCHAR(255) NOT NULL,
        nameEn NVARCHAR(255) NOT NULL,
        descriptionAr NVARCHAR(MAX),
        descriptionEn NVARCHAR(MAX),
        createdAt DATETIME,
        updatedAt DATETIME
      );

    IF OBJECT_ID('Commitment', 'U') IS NULL
      CREATE TABLE Commitment (
        id NVARCHAR(64) PRIMARY KEY,
        nameAr NVARCHAR(255) NOT NULL,
        nameEn NVARCHAR(255) NOT NULL,
        descriptionAr NVARCHAR(MAX),
        descriptionEn NVARCHAR(MAX),
        expiryDate DATE,
        responsibleUser NVARCHAR(64),
        status NVARCHAR(30) NOT NULL,
        evidenceTitle NVARCHAR(255),
        evidenceLink NVARCHAR(MAX),
        evidenceUploadedAt DATETIME,
        createdAt DATETIME,
        updatedAt DATETIME
      );

    IF OBJECT_ID('NotificationTemplate', 'U') IS NULL
      CREATE TABLE NotificationTemplate (
        id NVARCHAR(64) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        subject NVARCHAR(500),
        body NVARCHAR(MAX),
        type NVARCHAR(50)
      );

    IF OBJECT_ID('NotificationLog', 'U') IS NULL
      CREATE TABLE NotificationLog (
        id NVARCHAR(64) PRIMARY KEY,
        recipientId NVARCHAR(64),
        recipientEmail NVARCHAR(255),
        recipientName NVARCHAR(255),
        type NVARCHAR(50),
        subject NVARCHAR(500),
        body NVARCHAR(MAX),
        status NVARCHAR(20),
        sentAt DATETIME,
        errorMessage NVARCHAR(MAX)
      );

    IF OBJECT_ID('SecurityIncident', 'U') IS NULL
      CREATE TABLE SecurityIncident (
        id NVARCHAR(64) PRIMARY KEY,
        reporterEmail NVARCHAR(255),
        title NVARCHAR(500),
        description NVARCHAR(MAX),
        type NVARCHAR(100),
        priority NVARCHAR(20),
        status NVARCHAR(30),
        reportedAt DATETIME,
        assignedTo NVARCHAR(64),
        updatedAt DATETIME,
        closedAt DATETIME,
        attachments NVARCHAR(MAX)
      );

    IF OBJECT_ID('IncidentNote', 'U') IS NULL
      CREATE TABLE IncidentNote (
        id NVARCHAR(64) PRIMARY KEY,
        incidentId NVARCHAR(64) NOT NULL,
        authorId NVARCHAR(64),
        authorName NVARCHAR(255),
        content NVARCHAR(MAX),
        createdAt DATETIME,
        attachments NVARCHAR(MAX)
      );

    IF OBJECT_ID('IncidentFeedback', 'U') IS NULL
      CREATE TABLE IncidentFeedback (
        id NVARCHAR(64) PRIMARY KEY,
        incidentId NVARCHAR(64) NOT NULL,
        rating INT,
        comment NVARCHAR(MAX),
        submittedAt DATETIME
      );

    IF OBJECT_ID('Notification', 'U') IS NULL
      CREATE TABLE Notification (
        id NVARCHAR(64) PRIMARY KEY,
        userId NVARCHAR(64),
        titleAr NVARCHAR(500),
        titleEn NVARCHAR(500),
        messageAr NVARCHAR(MAX),
        messageEn NVARCHAR(MAX),
        type NVARCHAR(50),
        link NVARCHAR(MAX),
        isRead BIT NOT NULL DEFAULT 0,
        createdAt DATETIME
      );

    IF COL_LENGTH('ChangeRequest', 'history') IS NULL
      ALTER TABLE ChangeRequest ADD history NVARCHAR(MAX);

    IF COL_LENGTH('[User]', 'displayNameEn') IS NULL
      ALTER TABLE [User] ADD displayNameEn NVARCHAR(255) NULL;

    IF COL_LENGTH('[User]', 'bypassOtp') IS NULL
      ALTER TABLE [User] ADD bypassOtp BIT NOT NULL DEFAULT 0;

    IF COL_LENGTH('[User]', 'receiveSecurityIncidents') IS NULL
      ALTER TABLE [User] ADD receiveSecurityIncidents BIT NOT NULL DEFAULT 0;

    IF COL_LENGTH('PolicyItem', 'attachments') IS NULL
      ALTER TABLE PolicyItem ADD attachments NVARCHAR(MAX);
    IF COL_LENGTH('Standard', 'attachments') IS NULL
      ALTER TABLE Standard ADD attachments NVARCHAR(MAX);
    IF COL_LENGTH('[Procedure]', 'attachments') IS NULL
      ALTER TABLE [Procedure] ADD attachments NVARCHAR(MAX);

    IF COL_LENGTH('[Procedure]', 'weight') IS NULL
      ALTER TABLE [Procedure] ADD weight INT NOT NULL DEFAULT 1;

    IF COL_LENGTH('[User]', 'groupId') IS NULL
      ALTER TABLE [User] ADD groupId NVARCHAR(64) NULL;

    IF COL_LENGTH('[User]', 'permissionOverrides') IS NULL
      ALTER TABLE [User] ADD permissionOverrides NVARCHAR(MAX) NULL;

    IF OBJECT_ID('PermissionGroup', 'U') IS NULL
      CREATE TABLE PermissionGroup (
        id NVARCHAR(64) PRIMARY KEY,
        nameAr NVARCHAR(255),
        nameEn NVARCHAR(255),
        descriptionAr NVARCHAR(MAX),
        descriptionEn NVARCHAR(MAX),
        isSystem BIT NOT NULL DEFAULT 0,
        permissions NVARCHAR(MAX),
        createdAt NVARCHAR(64),
        updatedAt NVARCHAR(64)
      );

    IF OBJECT_ID('Risk', 'U') IS NULL
      CREATE TABLE Risk (
        id NVARCHAR(64) PRIMARY KEY,
        nameAr NVARCHAR(500),
        nameEn NVARCHAR(500),
        descriptionAr NVARCHAR(MAX),
        descriptionEn NVARCHAR(MAX),
        likelihood INT,
        impact INT,
        procedureIds NVARCHAR(MAX),
        createdAt DATETIME,
        updatedAt DATETIME
      );

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
};

const port = parseInt(process.env.API_PORT || '4000', 10);
ensureSchema()
  .catch(err => console.error('Schema migration failed:', err.message))
  .finally(() => {
    app.listen(port, () => {
      console.log(`SQL API server listening on http://localhost:${port}`);
    });
  });
