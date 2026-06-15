// Seed procedures for Email Security Policy, mapped to their standards.
// Run: node scripts/seed_email_procedures.mjs
const API = 'http://localhost:4000/api';
const POLICY_ID = '5d76imyzf';

// [standardNameEn substring used to find the standard, actionAr, actionEn]
const procedures = [
  // 1. Content Filtering and Analysis (12)
  ['Content Filtering and Analysis', 'فحص رسائل البريد الإلكتروني الواردة والصادرة من المحتوى الضار والمشبوه', 'Scanning all incoming/outgoing emails for malicious and suspicious content'],
  ['Content Filtering and Analysis', 'وضع وسم (Label) يعكس مستوى الحساسية والسرية (مثل: عام، خاص)', 'Applying labels reflecting sensitivity levels (e.g., Secure, Sensitive)'],
  ['Content Filtering and Analysis', 'وضع علامات (Tag) للرسائل المشبوهة (الإقتحامية، غير مرغوب فيها)', 'Tagging emails as malicious, spam, or unauthorized'],
  ['Content Filtering and Analysis', 'حجز الرسائل الواردة بعلامات وقائية', 'Blocking incoming emails with protective tags'],
  ['Content Filtering and Analysis', 'حجز الرسائل المشبوهة (Suspected SPAM)', 'Quarantining suspected SPAM'],
  ['Content Filtering and Analysis', 'حجز الرسائل الصادرة الحساسة/السرية وفقاً للسياسة', 'Blocking outgoing sensitive/confidential emails per policy'],
  ['Content Filtering and Analysis', 'حجز الرسائل عالية المخاطر وحجز متوسطة المخاطر', 'Blocking high-risk spam and quarantining medium-risk spam'],
  ['Content Filtering and Analysis', 'حجز الرسائل التي تحتوي روابط ضارة ومحاولات تصيد', 'Blocking emails with malicious URLs and phishing attempts'],
  ['Content Filtering and Analysis', 'استبدال عناوين الويب النشطة في نص الرسالة بعناوين أخرى', 'Replacing active web addresses in the email body'],
  ['Content Filtering and Analysis', 'حجز/تأخير المحتوى التفاعلي (Active Content) في نص الرسالة', 'Blocking or stripping active content from the email body'],
  ['Content Filtering and Analysis', 'حجز رسائل البريد ذات المرفقات الكبيرة أو غير المسموحة', 'Blocking or delaying oversized files or unauthorized formats'],
  ['Content Filtering and Analysis', 'حجز الرسائل المرسلة إلى قائمة عناوين غير معرفة', 'Blocking emails sent to an undefined list of addresses'],

  // 2. Secure Authentication (4)
  ['Secure Authentication', 'تطبيق التحقق متعدد العناصر (MFA) للوصول الخارجي', 'Implementing Multi-Factor Authentication (MFA) for external access'],
  ['Secure Authentication', 'استخدام الخصائص الحيوية أو مفاتيح Hardware أو OTP لإثبات الهوية', 'Using Biometrics, Hardware Keys, or OTP for identity'],
  ['Secure Authentication', 'فرض متطلبات إعدادات كلمات مرور معقدة', 'Enforcing complex password configuration requirements'],
  ['Secure Authentication', 'تطبيق التشفير (TLS, VPN) لحماية آليات التحقق', 'Applying encryption (TLS, VPN) to protect authentication mechanisms'],

  // 3. Content Protection (9)
  ['Content Protection', 'تفعيل تصنيف المرفقات وفقاً لنوع الملف ومحتواه', 'Activating attachment classification by file type and content'],
  ['Content Protection', 'وضع وسوم على المرفقات (السوداء/الرمادية/البيضاء/غير المعروفة)', 'Tagging attachments (Blacklist, Greylist, Whitelist, Unknown)'],
  ['Content Protection', 'تحديد أنواع الملفات بناءً على المحتوى وليس الامتداد', 'Identifying file types via content instead of extension'],
  ['Content Protection', 'فحص جميع المرفقات المسموحة للكشف عن الفيروسات والبرامج الضارة', 'Scanning all allowed attachments for viruses and malware'],
  ['Content Protection', 'فحص أنظمة البريد وبواباته (Mail Gateway) دورياً', 'Regularly scanning mail systems, gateways, and relays'],
  ['Content Protection', 'إجراء فحوصات إضافية على عميل البريد باستخدام أدوات متعددة', 'Performing additional scans at the email client using a number of tools'],
  ['Content Protection', 'استخدام Sandbox للتهديدات المتقدمة المستمرة (APT)', 'Using Sandboxing for Advanced Persistent Threats (APT) analysis'],
  ['Content Protection', 'حجز و/أو إزالة الرسائل التي تحتوي مرفقات ضارة', 'Blocking or stripping emails with malicious attachments'],
  ['Content Protection', 'حجز مرفقات القائمة الرمادية وغير المعروفة', 'Quarantining Greylist and unknown attachments'],

  // 4. Email Sender Verification (3)
  ['Email Sender Verification', 'اختبار التطابق مع قاعدتي بيانات سمعة المرسل على الأقل', 'Testing at least two sender reputation databases'],
  ['Email Sender Verification', 'التحقق دورياً من قوائم SPAM المحدثة يومياً', 'Verifying against daily updated SPAM lists'],
  ['Email Sender Verification', 'التحقق من IP والنطاق المرسل في قواعد بيانات RBL الفورية', 'Checking sender IP and domain against Real-time Blackhole Lists (RBL)'],

  // 5. Email Chain of Trust (6)
  ['Email Chain of Trust', 'إنشاء وتسجيل سجلات SPF و DKIM و DMARC للنطاقات', 'Establishing and registering SPF, DKIM and DMARC records'],
  ['Email Chain of Trust', 'التحقق من المرسلين عبر SenderID و SPF', 'Verifying senders via SenderID and SPF records'],
  ['Email Chain of Trust', 'التحقق من المرسلين عبر DKIM ورفض الرسائل المخالفة', 'Verifying senders via DKIM and rejecting failures'],
  ['Email Chain of Trust', 'ضبط سجلات SPF للسماح فقط للمصادر المخوّلة بالإرسال', 'Configuring SPF to allow only authorized senders'],
  ['Email Chain of Trust', 'تكوين DKIM للتوقيع الرقمي على الرسائل الصادرة', 'Configuring DKIM for digital signing of outgoing emails'],
  ['Email Chain of Trust', 'ضبط DMARC لاتخاذ إجراءات تلقائية عند فشل التحقق', 'Configuring DMARC to automate actions on authentication failures'],

  // 6. Email Systems Security (15)
  ['Email Systems Security', 'إجراء اختبارات أمنية ومسح ثغرات واختبار اختراق دورياً', 'Conducting periodic security tests, vulnerability scans, and pentesting'],
  ['Email Systems Security', 'المراجعة المستمرة وتطبيق التحديثات على جميع أنظمة البريد', 'Regularly reviewing and applying patches to all mail systems'],
  ['Email Systems Security', 'إزالة أو تعطيل الخدمات والتطبيقات غير الضرورية (مثل Telnet)', 'Removing or disabling unnecessary applications and services'],
  ['Email Systems Security', 'تحصين (Hardening) الأنظمة وقواعد البيانات كل 3 أشهر', 'Hardening systems and databases every 3 months'],
  ['Email Systems Security', 'تقييد الوصول للمسؤولين فقط وفرض MFA', 'Restricting access to admins only and enforcing MFA'],
  ['Email Systems Security', 'تطبيق مبدأ أقل الصلاحيات (Least-Privilege)', 'Applying the Least-Privilege Principle'],
  ['Email Systems Security', 'تقييد الوصول الشبكي إلى منطقة الإدارة (Management Zone)', 'Restricting network access to the management zone'],
  ['Email Systems Security', 'حظر الوصول إلى وسائط التخزين القابلة للنقل (USB, CD/DVD)', 'Blocking access to removable storage (USB, CD/DVD)'],
  ['Email Systems Security', 'ضبط البروتوكولات (SMTP, POP, IMAP) لإخفاء معلومات إصدار البرامج', 'Configuring protocols to hide software version information'],
  ['Email Systems Security', 'تفعيل الأوامر الآمنة فقط وتجنب VRFY و EXPN', 'Enabling only safe mail commands, avoiding VRFY and EXPN'],
  ['Email Systems Security', 'تفعيل تسجيل الأحداث (Event Logging) وتجميع السجلات مركزياً', 'Enabling event logging and centralizing audit logs'],
  ['Email Systems Security', 'استخدام Multi-Tier Architecture ونشر MFA عبر الأنظمة', 'Using Multi-Tier Architecture and deploying MFA across systems'],
  ['Email Systems Security', 'حماية Webmail عبر جدار حماية تطبيقات الويب (WAF)', 'Protecting Webmail with a Web Application Firewall (WAF)'],
  ['Email Systems Security', 'تعطيل خدمة تحويل البريد المفتوح من الخادم (Open Mail Relay)', 'Disabling Open Mail Relay'],
  ['Email Systems Security', 'تفعيل STARTTLS لمنع هجمات Man-in-the-Middle', 'Enabling STARTTLS to prevent Man-in-the-Middle attacks'],

  // 7. Email Client Security (5)
  ['Email Client Security', 'استخدام برامج بريد محدّثة ومدعومة', 'Using updated and supported email client software'],
  ['Email Client Security', 'تقييد وصول Webmail عبر متصفحات معتمدة', 'Restricting Webmail access to approved browsers'],
  ['Email Client Security', 'تعطيل الإضافات غير الضرورية (Add-ons)', 'Disabling unnecessary add-ons or extensions'],
  ['Email Client Security', 'منع تشغيل النصوص البرمجية (Script) داخل عميل البريد', 'Disabling script execution within the email client'],
  ['Email Client Security', 'تكامل عميل البريد مع برنامج حماية الأجهزة الطرفية (Antivirus)', 'Integrating the client with endpoint protection (Antivirus)'],

  // 8. Backup and Archival (1)
  ['Backup and Archival', 'تنفيذ النسخ الاحتياطي والأرشفة وفقاً للمعايير التقنية للأمن السيبراني', 'Implementing backup and archival in compliance with security standards']
];

const newId = () => Math.random().toString(36).slice(2, 11);
const today = new Date();
const oneYearLater = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000);
const fmt = (d) => d.toISOString().slice(0, 10);
const now = today.toISOString();

// Build standardId map by fetching standards under this policy
const allStandards = await (await fetch(`${API}/standards`)).json();
const policyStandards = (allStandards || []).filter(s => s.policyId === POLICY_ID);
console.log(`Found ${policyStandards.length} standards under policy ${POLICY_ID}\n`);

const findStandard = (substr) => {
  const needle = substr.toLowerCase();
  return policyStandards.find(s => (s.nameEn || '').toLowerCase().includes(needle));
};

// Skip dupes by nameEn under same standard
const existing = await (await fetch(`${API}/procedures`)).json();
const existingKey = new Set(
  (existing || []).map(p => `${p.standardId}::${(p.nameEn || '').trim().toLowerCase()}`)
);

let ok = 0, skipped = 0, fail = 0, missing = 0;
for (const [stdHint, nameAr, nameEn] of procedures) {
  const std = findStandard(stdHint);
  if (!std) {
    console.error(`✗ NO STANDARD MATCH for "${stdHint}" — ${nameEn}`);
    missing++;
    continue;
  }
  const key = `${std.id}::${nameEn.trim().toLowerCase()}`;
  if (existingKey.has(key)) {
    console.log(`• exists: ${nameEn}`);
    skipped++;
    continue;
  }
  const body = {
    id: newId(),
    standardId: std.id,
    policyId: POLICY_ID,
    nameAr,
    nameEn,
    descriptionAr: '',
    descriptionEn: '',
    status: 'not_started',
    importance: 'medium',
    startDate: fmt(today),
    endDate: fmt(oneYearLater),
    assignedTo: [],
    assignedTeams: [],
    isPeriodic: false,
    frequency: 'annual',
    attachments: [],
    createdAt: now,
    updatedAt: now
  };
  const r = await fetch(`${API}/procedures`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (r.ok) { console.log(`✓ [${std.nameEn}] ${nameEn}`); ok++; }
  else { console.error(`✗ ${nameEn} — ${r.status} ${await r.text()}`); fail++; }
}
console.log(`\nDone. Inserted: ${ok}, Skipped: ${skipped}, Missing standard: ${missing}${fail ? `, Failed: ${fail}` : ''}`);
