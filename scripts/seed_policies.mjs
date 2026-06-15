// One-shot seeder. Run: node scripts/seed_policies.mjs
const API = 'http://localhost:4000/api';
const FRAMEWORK_ID = '1emw463lm';

const policies = [
  ['السياسة العامة للأمن السيبراني', 'General Cybersecurity Policy'],
  ['سياسة اختبار الاختراق', 'Penetration Testing Policy'],
  ['سياسة إدارة الأصول', 'Asset Management Policy'],
  ['سياسة إدارة الثغرات', 'Vulnerability Management Policy'],
  ['سياسة إدارة حوادث وتهديدات الأمن السيبراني', 'Cybersecurity Incident and Threat Management Policy'],
  ['سياسة إدارة سجلات الأحداث ومراقبة الأمن السيبراني', 'Event Logs Management and Cybersecurity Monitoring Policy'],
  ['سياسة إدارة مخاطر الأمن السيبراني', 'Cybersecurity Risk Management Policy'],
  ['سياسة إدارة هويات الدخول والصلاحيات', 'Identity and Access Management (IAM) Policy'],
  ['سياسة الاستخدام المقبول للأصول', 'Acceptable Use of Assets Policy'],
  ['سياسة الإعدادات والتحصين', 'Configuration and Hardening Policy'],
  ['سياسة الالتزام بتشريعات وتنظيمات الأمن السيبراني', 'Compliance with Cybersecurity Legislations and Regulations Policy'],
  ['سياسة الأمن السيبراني المتعلق بالأطراف الخارجية', 'Cybersecurity Policy for Third Parties'],
  ['سياسة الأمن السيبراني المتعلق بالأمن المادي', 'Physical Security Related to Cybersecurity Policy'],
  ['سياسة الأمن السيبراني المتعلق بالحوسبة السحابية والاستضافة', 'Cloud Computing and Hosting Cybersecurity Policy'],
  ['سياسة الأمن السيبراني ضمن استمرارية الأعمال', 'Cybersecurity within Business Continuity Policy'],
  ['سياسة الأمن السيبراني للبيانات', 'Data Cybersecurity Policy'],
  ['سياسة الأمن السيبراني للموارد البشرية', 'Human Resources Cybersecurity Policy'],
  ['سياسة التشفير', 'Cryptography Policy'],
  ['سياسة الحماية من البرمجيات الضارة', 'Protection Against Malware Policy'],
  ['سياسة النسخ الاحتياطية', 'Backup Policy'],
  ['سياسة امن أجهزة المستخدمين والأجهزة المحمولة والأجهزة الشخصية', 'User Devices, Mobile and BYOD Security Policy'],
  ['سياسة أمن البريد الإلكتروني', 'Email Security Policy'],
  ['سياسة أمن الخوادم', 'Server Security Policy'],
  ['سياسة أمن الشبكات', 'Network Security Policy'],
  ['سياسة أمن قواعد البيانات', 'Database Security Policy'],
  ['سياسة أمن وسائط التخزين', 'Storage Media Security Policy'],
  ['سياسة حماية تطبيقات الويب', 'Web Applications Protection Policy'],
  ['سياسة دورة حياة تطوير البرمجيات الآمنة', 'Secure Software Development Life Cycle (S-SDLC) Policy'],
  ['سياسة مراجعة وتدقيق الأمن السيبراني', 'Cybersecurity Audit and Review Policy']
];

const newId = () => Math.random().toString(36).slice(2, 11);
const now = new Date().toISOString();

let ok = 0, fail = 0;
for (const [nameAr, nameEn] of policies) {
  const body = {
    id: newId(),
    nameAr,
    nameEn,
    descriptionAr: '',
    descriptionEn: '',
    frameworkId: FRAMEWORK_ID,
    createdAt: now,
    updatedAt: now
  };
  try {
    const res = await fetch(`${API}/policies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (res.ok) {
      console.log(`✓ ${nameEn}`);
      ok++;
    } else {
      const txt = await res.text();
      console.error(`✗ ${nameEn} — ${res.status} ${txt}`);
      fail++;
    }
  } catch (err) {
    console.error(`✗ ${nameEn} — ${err.message}`);
    fail++;
  }
}
console.log(`\nDone. Inserted: ${ok}, Failed: ${fail}`);
