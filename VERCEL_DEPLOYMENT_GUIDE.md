# 🚀 دليل النشر على Vercel - موقع رزقي

## 📋 نظرة عامة

هذا الدليل يوضح كيفية نشر موقع رزقي على Vercel مع دعم إرسال البريد الإلكتروني باستخدام Serverless Functions.

## 🔄 الفرق بين البيئات

### 🏠 البيئة المحلية:
```
التطبيق (localhost:5173) ←→ خادم SMTP (localhost:3001)
```

### ☁️ Vercel:
```
التطبيق (your-app.vercel.app) ←→ API Route (/api/send-email)
```

## 📁 هيكل الملفات المطلوب

```
rezgee-main/
├── api/
│   └── send-email.js          # Vercel API Route
├── src/
│   └── lib/
│       └── localSMTPService.ts # خدمة البريد المحدثة
├── vercel.json                # إعدادات Vercel
└── package.json               # متطلبات المشروع
```

## 🛠️ خطوات النشر

### 1️⃣ إعداد المتطلبات

تأكد من وجود `nodemailer` في `package.json`:

```json
{
  "dependencies": {
    "nodemailer": "^6.9.8"
  }
}
```

### 2️⃣ إعداد متغيرات البيئة في Vercel

في لوحة تحكم Vercel:

```
Settings → Environment Variables

SMTP_HOST = smtp.hostinger.com
SMTP_PORT = 465
SMTP_USER = manage@kareemamged.com
SMTP_PASS = Kareem@2024
```

### 3️⃣ النشر

```bash
# تثبيت Vercel CLI
npm i -g vercel

# تسجيل الدخول
vercel login

# النشر
vercel --prod
```

## 🧪 اختبار النظام

### اختبار محلي:
```bash
# 1. تشغيل الخادم المحلي
node smtp-server.js

# 2. تشغيل التطبيق
npm run dev

# 3. اختبار إرسال كلمة مرور مؤقتة
```

### اختبار على Vercel:
```bash
# اختبار API Route مباشرة
curl -X POST https://your-app.vercel.app/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "اختبار Vercel",
    "html": "<h1>مرحبا من Vercel!</h1>"
  }'
```

## 🔧 كيف يعمل النظام

### في البيئة المحلية:
1. `LocalSMTPService` يكتشف `localhost`
2. يرسل طلب إلى `http://localhost:3001/send-email`
3. الخادم المحلي يرسل البريد عبر SMTP

### على Vercel:
1. `LocalSMTPService` يكتشف `vercel.app`
2. يرسل طلب إلى `/api/send-email`
3. Vercel Function يرسل البريد عبر SMTP

## 📊 مراقبة النظام

### في Vercel Dashboard:
- **Functions** → `send-email` → عرض السجلات
- **Analytics** → مراقبة الاستخدام
- **Settings** → Environment Variables

### رسائل النجاح:
```
✅ Vercel API: تم إرسال البريد بنجاح
📧 Message ID: <message-id>
```

### رسائل الخطأ:
```
❌ Vercel API: خطأ في إرسال البريد
🔍 السبب: Authentication failed
```

## 🛡️ الأمان

### 1. حماية متغيرات البيئة:
- لا تضع كلمات المرور في الكود
- استخدم Vercel Environment Variables
- فعل "Encrypted" للمتغيرات الحساسة

### 2. تقييد الوصول:
```javascript
// في api/send-email.js
const allowedOrigins = [
  'https://your-domain.com',
  'https://your-app.vercel.app'
];

if (!allowedOrigins.includes(req.headers.origin)) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

## 🔍 استكشاف الأخطاء

### مشاكل شائعة:

#### 1. خطأ "Module not found":
```bash
# الحل: تأكد من إضافة nodemailer في package.json
npm install nodemailer
```

#### 2. خطأ "Function timeout":
```json
// في vercel.json
"functions": {
  "api/send-email.js": {
    "maxDuration": 30
  }
}
```

#### 3. خطأ SMTP Authentication:
- تحقق من متغيرات البيئة في Vercel
- تأكد من صحة بيانات SMTP

#### 4. خطأ CORS:
```javascript
// إضافة headers في API route
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'POST');
```

## 📈 تحسين الأداء

### 1. تخزين مؤقت للـ transporter:
```javascript
// تجنب إنشاء transporter في كل طلب
let cachedTransporter;

export default async function handler(req, res) {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransporter(SMTP_CONFIG);
  }
  // باقي الكود...
}
```

### 2. معالجة الأخطاء المحسنة:
```javascript
try {
  await transporter.sendMail(mailOptions);
} catch (error) {
  // تسجيل مفصل للأخطاء
  console.error('SMTP Error:', {
    code: error.code,
    command: error.command,
    response: error.response
  });
}
```

## 🔄 البدائل الأخرى

### إذا فشل SMTP على Vercel:

#### 1. استخدام SendGrid:
```bash
npm install @sendgrid/mail
```

#### 2. استخدام Resend:
```bash
npm install resend
```

#### 3. استخدام EmailJS:
```bash
npm install emailjs-com
```

## 📞 الدعم

### سجلات مفيدة:
```bash
# عرض سجلات Vercel
vercel logs your-app.vercel.app

# مراقبة الطلبات المباشرة
vercel dev
```

### اختبار سريع:
```javascript
// في المتصفح (Developer Console)
fetch('/api/send-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'test@example.com',
    subject: 'اختبار',
    html: '<h1>مرحبا</h1>'
  })
}).then(r => r.json()).then(console.log);
```

---

## ✅ قائمة التحقق النهائية

- [ ] ملف `api/send-email.js` موجود
- [ ] `vercel.json` محدث
- [ ] `nodemailer` في `package.json`
- [ ] متغيرات البيئة مضبوطة في Vercel
- [ ] اختبار API Route يعمل
- [ ] إرسال كلمة المرور المؤقتة يعمل

**🎉 بعد اكتمال هذه الخطوات، سيعمل إرسال البريد الإلكتروني على Vercel بنفس الطريقة المحلية!**
