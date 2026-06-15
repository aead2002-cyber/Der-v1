// Adds OTP, password_reset and password_changed templates if missing.
// Run: node scripts/seed_notification_templates.mjs
const API = 'http://localhost:4000/api';

const newId = () => Math.random().toString(36).slice(2, 11);

const desired = [
  {
    type: 'otp',
    name: 'OTP Verification Code',
    subject: 'DER3 — رمز التحقق / Verification Code',
    body: '<div style="font-family:system-ui,sans-serif;max-width:480px"><p>مرحباً <b>{{user_name}}</b>,</p><p>رمز التحقق الخاص بك هو:</p><p style="font-size:28px;letter-spacing:6px;font-weight:bold;background:#f1f5f9;padding:12px 20px;border-radius:8px;display:inline-block;font-family:monospace">{{otp_code}}</p><p style="color:#64748b;font-size:13px">صالح لمدة <b>{{expires_in}}</b>.</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"><p style="color:#94a3b8;font-size:12px">إذا لم تطلب هذا الرمز، تجاهل الرسالة.</p></div>'
  },
  {
    type: 'password_reset',
    name: 'Password Reset Request',
    subject: 'DER3 — طلب إعادة تعيين كلمة المرور / Password Reset Request',
    body: '<div style="font-family:system-ui,sans-serif;max-width:480px"><p>مرحباً <b>{{user_name}}</b>,</p><p>لقد طلبت إعادة تعيين كلمة المرور. استخدم الرابط التالي خلال <b>{{expires_in}}</b>:</p><p><a href="{{reset_link}}" style="display:inline-block;background:#1f3a5f;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">إعادة تعيين كلمة المرور</a></p><p style="color:#64748b;font-size:12px;word-break:break-all">{{reset_link}}</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"><p style="color:#94a3b8;font-size:12px">إذا لم تطلب هذا، تجاهل الرسالة.</p></div>'
  },
  {
    type: 'password_changed',
    name: 'Password Changed Confirmation',
    subject: 'DER3 — تم تغيير كلمة المرور / Password Changed',
    body: '<div style="font-family:system-ui,sans-serif;max-width:480px"><p>مرحباً <b>{{user_name}}</b>,</p><p>تم تغيير كلمة المرور الخاصة بحسابك بنجاح بتاريخ <b>{{date}}</b>.</p><p>إذا لم تكن أنت من قام بهذا التغيير، يرجى التواصل مع المسؤول فوراً.</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"><p style="color:#94a3b8;font-size:12px">DER3 Shield System</p></div>'
  }
];

const existing = await (await fetch(`${API}/notificationTemplates`)).json();
const haveTypes = new Set((existing || []).map(t => t.type));

let added = 0;
for (const tpl of desired) {
  if (haveTypes.has(tpl.type)) {
    console.log(`• already exists: ${tpl.type}`);
    continue;
  }
  const r = await fetch(`${API}/notificationTemplates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: newId(), ...tpl })
  });
  if (r.ok) {
    console.log(`✓ added ${tpl.type}`);
    added++;
  } else {
    console.error(`✗ ${tpl.type} — ${r.status} ${await r.text()}`);
  }
}
console.log(`\nDone. Added ${added}/${desired.length}.`);
