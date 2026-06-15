// Move descriptionAr → nameAr, set nameEn to English translation, clear descriptions.
// Run: node scripts/translate_email_policy_items.mjs
const API = 'http://localhost:4000/api';
const POLICY_ID = '5d76imyzf';

const translations = {
  1:  'Necessary technologies must be used to protect the confidentiality, integrity and availability of email messages during transmission and storage, and to update them continuously.',
  2:  'Technologies must be used to protect email and analyze and filter email messages, and to block suspicious messages such as Spam Emails and Phishing Emails.',
  3:  'Necessary technologies must be used to protect data from leakage through email inside and outside Madinah Chamber, such as DLP.',
  4:  'Technologies must be used to protect email servers from Advanced Persistent Threats (APT Protection) and from previously unknown viruses and malware (Zero-Day Malware).',
  5:  "Technologies must be used to scan email attachments and links in an isolated environment (sandbox) before reaching the user's inbox, whether sent from inside or outside Madinah Chamber.",
  6:  'Modern technologies must be used to verify the authenticity of incoming email domains to Madinah Chamber, including but not limited to: using the email authentication service within the National Cybersecurity Services Portal "Haseen", and applying SPF, DKIM & DMARC verification protocols to prevent Email Spoofing.',
  7:  'Necessary technologies must be used to encrypt email messages containing classified information in accordance with the regulatory policies and procedures of Madinah Chamber.',
  8:  'Multi-Factor Authentication must be applied for remote email access and access via the email Webmail page.',
  9:  'Email messages must be archived and backed up periodically in accordance with the relevant regulatory policies and procedures approved at Madinah Chamber.',
  10: 'The owners of generic and shared accounts (Generic Accounts) for email and their responsibilities must be identified.',
  11: 'Secure access to email messages must be applied and restricted to be available only to Madinah Chamber employees.',
  12: 'Necessary measures must be taken to prevent the use of Madinah Chamber email for purposes other than authorized work purposes.',
  13: "System Administrator access to any employee's email information and messages must be prevented without prior authorization and in accordance with specific approved procedures.",
  14: 'The size and type of outgoing and incoming email attachments and the mailbox capacity for each user must be specified, and the ability to send mass messages to a large number of users must be limited.',
  15: 'Email messages sent outside Madinah Chamber must include a disclaimer footer.',
  16: 'Email messages must be classified according to the sensitivity of the attachments and the information they contain, in accordance with the data and information classification policy approved at Madinah Chamber.',
  17: 'The Open Mail Relay service must be disabled on the server.',
  18: 'Email use must be prevented for Privileged Accounts.',
  19: 'Communication between Email Gateways must be encrypted to prevent passive Man-in-the-Middle attacks.',
  20: 'The Cybersecurity and Data Unit must ensure that all employees are aware of cybersecurity and educate them to perform email tasks and services securely and to detect phishing messages.',
  21: 'A Key Performance Indicator (KPI) must be used to ensure continuous improvement and the proper and effective use of email protection requirements.'
};

const res = await fetch(`${API}/policyItems`);
const all = await res.json();
const items = all
  .filter(it => it.policyId === POLICY_ID && /^البند 1-\d+/.test(it.nameAr || ''))
  .sort((a, b) => (a.order || 0) - (b.order || 0));

console.log(`Found ${items.length} items to update`);

let ok = 0, fail = 0;
for (const item of items) {
  const num = item.order;
  const newNameAr = (item.descriptionAr || '').trim();
  const newNameEn = translations[num];
  if (!newNameAr || !newNameEn) {
    console.error(`✗ 1-${num} — missing data (ar=${!!newNameAr}, en=${!!newNameEn})`);
    fail++;
    continue;
  }
  const updated = {
    ...item,
    nameAr: newNameAr,
    nameEn: newNameEn,
    descriptionAr: '',
    descriptionEn: '',
    updatedAt: new Date().toISOString()
  };
  const r = await fetch(`${API}/policyItems/${item.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updated)
  });
  if (r.ok) {
    console.log(`✓ 1-${num}`);
    ok++;
  } else {
    console.error(`✗ 1-${num} — ${r.status} ${await r.text()}`);
    fail++;
  }
}
console.log(`\nDone. Updated: ${ok}/${items.length}${fail ? `, Failed: ${fail}` : ''}`);
