// Seed standards under "Email Security Policy".
// Run: node scripts/seed_email_standards.mjs
const API = 'http://localhost:4000/api';
const POLICY_ID = '5d76imyzf'; // سياسة امن البريد الالكتروني

const standards = [
  ['تصفية المحتوى وتحليله', 'Content Filtering and Analysis'],
  ['حماية المصادقة', 'Secure Authentication'],
  ['حماية محتوى البريد الإلكتروني', 'Content Protection'],
  ['التحقق من مرسل البريد الإلكتروني', 'Email Sender Verification'],
  ['التحقق من سلسلة الثقة', 'Email Chain of Trust Verification'],
  ['حماية أنظمة البريد الإلكتروني', 'Email Systems Security'],
  ['برنامج قارئ البريد الإلكتروني', 'Email Client Security'],
  ['النسخ الاحتياطية والأرشفة', 'Backup and Archival']
];

const newId = () => Math.random().toString(36).slice(2, 11);
const now = new Date().toISOString();

// Skip duplicates if a standard with same nameEn already exists under this policy
const existing = await (await fetch(`${API}/standards`)).json();
const haveNames = new Set(
  (existing || [])
    .filter(s => s.policyId === POLICY_ID)
    .map(s => (s.nameEn || '').trim().toLowerCase())
);

let ok = 0, skipped = 0, fail = 0;
for (const [nameAr, nameEn] of standards) {
  if (haveNames.has(nameEn.trim().toLowerCase())) {
    console.log(`• already exists: ${nameEn}`);
    skipped++;
    continue;
  }
  const body = {
    id: newId(),
    policyId: POLICY_ID,
    nameAr,
    nameEn,
    descriptionAr: '',
    descriptionEn: '',
    classifications: [],
    attachments: [],
    createdAt: now,
    updatedAt: now
  };
  const r = await fetch(`${API}/standards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (r.ok) { console.log(`✓ ${nameEn}`); ok++; }
  else { console.error(`✗ ${nameEn} — ${r.status} ${await r.text()}`); fail++; }
}
console.log(`\nDone. Inserted: ${ok}, Skipped: ${skipped}${fail ? `, Failed: ${fail}` : ''}`);
