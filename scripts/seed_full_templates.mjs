// Upsert full bilingual notification templates (with logo header) for all types.
// Run: node scripts/seed_full_templates.mjs
const API = 'http://localhost:4000/api';

const newId = () => Math.random().toString(36).slice(2, 11);

// Reusable email shell — Outlook-friendly (no gradients, bgcolor attributes,
// table-based layout, inline styles only, no external CSS).
const wrap = (titleAr, titleEn, bodyAr, bodyEn, ctaHtml = '') => `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="x-apple-disable-message-reformatting" />
<title>DER3</title>
</head>
<body bgcolor="#f1f5f9" style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#1f2a44">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#f1f5f9"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="620" align="center" bgcolor="#ffffff" style="width:100%;max-width:620px;background-color:#ffffff;border:1px solid #e2e8f0">
    <!-- Header -->
    <tr><td align="center" bgcolor="#1f3a5f" style="padding:26px 20px;background-color:#1f3a5f">
      <img src="{{logo_url}}" alt="DER3" width="180" style="height:auto;max-height:60px;background-color:#ffffff;padding:8px 14px;display:inline-block;border:0" />
      <div style="color:#ffffff;font-size:11px;font-weight:bold;letter-spacing:3px;margin-top:12px;font-family:'Segoe UI',Tahoma,Arial,sans-serif">DER3 SHIELD SYSTEM</div>
    </td></tr>

    <!-- Accent strip -->
    <tr><td bgcolor="#8ba368" style="height:4px;background-color:#8ba368;line-height:4px;font-size:0">&nbsp;</td></tr>

    <!-- Arabic block -->
    <tr><td dir="rtl" align="right" style="padding:28px 32px 14px;text-align:right">
      <h2 style="margin:0 0 12px;color:#1f3a5f;font-size:18px;font-weight:bold;font-family:'Segoe UI',Tahoma,Arial,sans-serif">${titleAr}</h2>
      <div style="line-height:1.85;font-size:14px;color:#334155;font-family:'Segoe UI',Tahoma,Arial,sans-serif">${bodyAr}</div>
    </td></tr>

    <tr><td style="padding:0 32px"><div style="border-top:1px solid #e2e8f0;height:1px;line-height:1px;font-size:0">&nbsp;</div></td></tr>

    <!-- English block -->
    <tr><td dir="ltr" align="left" style="padding:14px 32px 28px;text-align:left">
      <h2 style="margin:0 0 12px;color:#1f3a5f;font-size:18px;font-weight:bold;font-family:'Segoe UI',Tahoma,Arial,sans-serif">${titleEn}</h2>
      <div style="line-height:1.85;font-size:14px;color:#334155;font-family:'Segoe UI',Tahoma,Arial,sans-serif">${bodyEn}</div>
    </td></tr>

    ${ctaHtml ? `<tr><td align="center" style="padding:0 32px 28px;text-align:center">${ctaHtml}</td></tr>` : ''}

    <!-- Footer -->
    <tr><td align="center" bgcolor="#f8fafc" style="padding:20px 32px;background-color:#f8fafc;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #eef2f6;font-family:'Segoe UI',Tahoma,Arial,sans-serif">
      <div dir="rtl" style="margin:4px 0;direction:rtl">إذا لم تطلب هذا الإشعار يرجى تجاهل الرسالة.</div>
      <div style="margin:4px 0">If you did not request this, please ignore this message.</div>
      <div style="margin:8px 0 0;color:#cbd5e1">&copy; DER3 Shield System</div>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`.trim();

const desired = [
  {
    type: 'otp',
    name: 'OTP Verification Code (Bilingual)',
    subject: 'DER3 — رمز التحقق / Verification Code',
    body: wrap(
      'رمز التحقق الخاص بك',
      'Your Verification Code',
      `<p>مرحباً <b>{{user_name}}</b>،</p>
       <p>استخدم الرمز التالي لإكمال تسجيل الدخول. الرمز صالح لمدة <b>{{expires_in}}</b>.</p>
       <p style="text-align:center;margin:20px 0"><span style="display:inline-block;font-size:30px;letter-spacing:8px;font-weight:bold;background:#f1f5f9;padding:14px 24px;border-radius:10px;font-family:monospace;color:#1f3a5f">{{otp_code}}</span></p>`,
      `<p>Hello <b>{{user_name}}</b>,</p>
       <p>Use the following code to complete sign-in. It is valid for <b>{{expires_in}}</b>.</p>
       <p style="text-align:center;margin:20px 0"><span style="display:inline-block;font-size:30px;letter-spacing:8px;font-weight:bold;background:#f1f5f9;padding:14px 24px;border-radius:10px;font-family:monospace;color:#1f3a5f">{{otp_code}}</span></p>`
    )
  },
  {
    type: 'password_reset',
    name: 'Password Reset Request (Bilingual)',
    subject: 'DER3 — طلب إعادة تعيين كلمة المرور / Password Reset',
    body: wrap(
      'طلب إعادة تعيين كلمة المرور',
      'Password Reset Request',
      `<p>مرحباً <b>{{user_name}}</b>،</p>
       <p>لقد طلبت إعادة تعيين كلمة المرور. اضغط الزر أدناه لتعيين كلمة مرور جديدة. الرابط صالح لمدة <b>{{expires_in}}</b>.</p>`,
      `<p>Hello <b>{{user_name}}</b>,</p>
       <p>You requested a password reset. Click the button below to set a new password. The link is valid for <b>{{expires_in}}</b>.</p>`,
      `<a href="{{reset_link}}" style="display:inline-block;background:#1f3a5f;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px">إعادة التعيين / Reset Password</a>
       <p style="color:#94a3b8;font-size:11px;word-break:break-all;margin-top:12px">{{reset_link}}</p>`
    )
  },
  {
    type: 'password_changed',
    name: 'Password Changed Confirmation (Bilingual)',
    subject: 'DER3 — تم تغيير كلمة المرور / Password Changed',
    body: wrap(
      'تم تغيير كلمة المرور',
      'Password Changed',
      `<p>مرحباً <b>{{user_name}}</b>،</p>
       <p>تم تغيير كلمة المرور الخاصة بحسابك بنجاح بتاريخ <b>{{date}}</b>.</p>
       <p style="color:#dc2626;font-weight:600">إذا لم تكن أنت من قام بهذا التغيير، يرجى التواصل مع المسؤول فوراً.</p>`,
      `<p>Hello <b>{{user_name}}</b>,</p>
       <p>Your account password was successfully changed on <b>{{date}}</b>.</p>
       <p style="color:#dc2626;font-weight:600">If you did not make this change, please contact your administrator immediately.</p>`
    )
  },
  {
    type: 'assignment',
    name: 'Assignment Notification (Bilingual)',
    subject: 'DER3 — إسناد جديد / New Assignment',
    body: wrap(
      'إسناد جديد لك',
      'A new task has been assigned to you',
      `<p>مرحباً <b>{{user_name}}</b>،</p>
       <p>تم إسناد العنصر التالي إليك:</p>
       <p style="background:#eef2f6;padding:14px 18px;border-radius:8px;border-right:4px solid #1f3a5f;font-weight:600"><b>{{procedure_name}}</b></p>
       <p>تاريخ الاستحقاق: <b>{{end_date}}</b></p>
       <p>يرجى مراجعة لوحة المهام لمتابعة التفاصيل.</p>`,
      `<p>Hello <b>{{user_name}}</b>,</p>
       <p>The following item has been assigned to you:</p>
       <p style="background:#eef2f6;padding:14px 18px;border-radius:8px;border-left:4px solid #1f3a5f;font-weight:600"><b>{{procedure_name}}</b></p>
       <p>Due date: <b>{{end_date}}</b></p>
       <p>Please check your tasks dashboard for details.</p>`,
      `<a href="{{link}}" style="display:inline-block;background:#1f3a5f;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px">عرض التفاصيل / View Details</a>`
    )
  },
  {
    type: 'expiry_reminder',
    name: 'Expiry Reminder (Bilingual)',
    subject: 'DER3 — تذكير بقرب انتهاء الصلاحية / Expiry Reminder',
    body: wrap(
      'تذكير بقرب انتهاء الصلاحية',
      'Upcoming Expiry Reminder',
      `<p>مرحباً <b>{{user_name}}</b>،</p>
       <p>الالتزام التالي يقترب من تاريخ انتهائه:</p>
       <p style="background:#fff7ed;padding:14px 18px;border-radius:8px;border-right:4px solid #f59e0b;font-weight:600"><b>{{commitment_name}}</b></p>
       <p>تاريخ الانتهاء: <b style="color:#b45309">{{expiry_date}}</b></p>
       <p>يرجى اتخاذ الإجراء اللازم قبل انتهاء الصلاحية.</p>`,
      `<p>Hello <b>{{user_name}}</b>,</p>
       <p>The following commitment is approaching its expiry date:</p>
       <p style="background:#fff7ed;padding:14px 18px;border-radius:8px;border-left:4px solid #f59e0b;font-weight:600"><b>{{commitment_name}}</b></p>
       <p>Expiry date: <b style="color:#b45309">{{expiry_date}}</b></p>
       <p>Please take action before it expires.</p>`
    )
  },
  {
    type: 'overdue_alert',
    name: 'Overdue Alert (Bilingual)',
    subject: 'DER3 — تنبيه: عنصر متأخر / Overdue Alert',
    body: wrap(
      'تنبيه: عنصر متأخر',
      'Overdue Alert',
      `<p>مرحباً <b>{{user_name}}</b>،</p>
       <p>العنصر التالي تجاوز تاريخ الاستحقاق ولا يزال غير مكتمل:</p>
       <p style="background:#fef2f2;padding:14px 18px;border-radius:8px;border-right:4px solid #dc2626;font-weight:600"><b>{{procedure_name}}</b></p>
       <p>تاريخ الاستحقاق: <b style="color:#dc2626">{{end_date}}</b></p>
       <p>يرجى المتابعة بأقصى سرعة ممكنة.</p>`,
      `<p>Hello <b>{{user_name}}</b>,</p>
       <p>The following item is past its due date and remains incomplete:</p>
       <p style="background:#fef2f2;padding:14px 18px;border-radius:8px;border-left:4px solid #dc2626;font-weight:600"><b>{{procedure_name}}</b></p>
       <p>Due date: <b style="color:#dc2626">{{end_date}}</b></p>
       <p>Please address it as soon as possible.</p>`
    )
  }
];

const existing = await (await fetch(`${API}/notificationTemplates`)).json();
const byType = new Map((existing || []).map(t => [t.type, t]));

let upd = 0, ins = 0;
for (const tpl of desired) {
  const cur = byType.get(tpl.type);
  if (cur) {
    const r = await fetch(`${API}/notificationTemplates/${cur.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...cur, name: tpl.name, subject: tpl.subject, body: tpl.body, type: tpl.type })
    });
    if (r.ok) { console.log(`✓ updated ${tpl.type}`); upd++; }
    else console.error(`✗ ${tpl.type} — ${r.status} ${await r.text()}`);
  } else {
    const r = await fetch(`${API}/notificationTemplates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: newId(), ...tpl })
    });
    if (r.ok) { console.log(`✓ added ${tpl.type}`); ins++; }
    else console.error(`✗ ${tpl.type} — ${r.status} ${await r.text()}`);
  }
}
console.log(`\nDone. Updated ${upd}, Added ${ins}, of ${desired.length}.`);
