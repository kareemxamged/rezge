# 🚀 دليل نشر دوال Supabase Edge Functions

## 📋 المتطلبات الأساسية

1. **تثبيت Supabase CLI:**
   ```bash
   npm install -g supabase
   ```

2. **تسجيل الدخول إلى Supabase:**
   ```bash
   supabase login
   ```

3. **ربط المشروع:**
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

## 📧 نشر دالة إرسال الإيميلات

### 1. نشر الدالة:
```bash
supabase functions deploy send-email
```

### 2. إعداد مفتاح Resend API:

#### أ. الحصول على مفتاح API من Resend:
1. اذهب إلى [resend.com](https://resend.com)
2. أنشئ حساب أو سجل دخول
3. اذهب إلى API Keys
4. أنشئ مفتاح API جديد

#### ب. إعداد المفتاح في Supabase:
```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. إعداد النطاق (Domain) في Resend:
1. في لوحة تحكم Resend، اذهب إلى Domains
2. أضف نطاقك (مثل: rezge.com)
3. اتبع التعليمات لإعداد DNS records
4. انتظر التحقق من النطاق

### 4. اختبار الدالة:
```bash
supabase functions invoke send-email --data '{
  "to": "test@example.com",
  "subject": "Test Email",
  "html": "<h1>Hello World</h1>",
  "text": "Hello World",
  "type": "test"
}'
```

## 🔧 إعداد البيئة المحلية للاختبار

### 1. تشغيل Supabase محلياً:
```bash
supabase start
```

### 2. تشغيل الدالة محلياً:
```bash
supabase functions serve send-email
```

### 3. إعداد متغيرات البيئة المحلية:
```bash
# إنشاء ملف .env.local في مجلد supabase/functions/send-email/
echo "RESEND_API_KEY=your_resend_api_key" > supabase/functions/send-email/.env.local
```

## 🌐 إعداد النطاق والبريد الإلكتروني

### 1. إعداد DNS Records في Resend:
```
Type: TXT
Name: @
Value: resend-domain-verification=xxxxxxxxxx

Type: MX
Name: @
Value: feedback-smtp.resend.com
Priority: 10

Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all

Type: TXT
Name: resend._domainkey
Value: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...
```

### 2. التحقق من النطاق:
- انتظر حتى يتم التحقق من النطاق في لوحة تحكم Resend
- قد يستغرق هذا من دقائق إلى ساعات

## 🧪 اختبار النظام

### 1. اختبار من التطبيق:
```javascript
// في الكونسول
emailTests.runAllEmailTests("your@email.com")
```

### 2. اختبار مباشر للدالة:
```javascript
// في الكونسول
const { supabase } = await import('./src/lib/supabase.js');
const result = await supabase.functions.invoke('send-email', {
  body: {
    to: 'your@email.com',
    subject: 'Test من رزقي',
    html: '<h1>مرحباً من رزقي!</h1>',
    text: 'مرحباً من رزقي!',
    type: 'test'
  }
});
console.log(result);
```

## 🔍 استكشاف الأخطاء

### 1. فحص سجلات الدالة:
```bash
supabase functions logs send-email
```

### 2. الأخطاء الشائعة:

#### خطأ: "RESEND_API_KEY not found"
```bash
# تأكد من إعداد المفتاح
supabase secrets list
supabase secrets set RESEND_API_KEY=your_key
```

#### خطأ: "Domain not verified"
- تأكد من إعداد DNS records بشكل صحيح
- انتظر التحقق من النطاق في Resend

#### خطأ: "Invalid from address"
- تأكد من استخدام نطاق محقق في Resend
- استخدم عنوان مثل: `noreply@yourdomain.com`

### 3. وضع التطوير:
إذا لم يكن لديك مفتاح API أو نطاق محقق، ستعمل الدالة في وضع المحاكاة وستظهر الإيميلات في السجلات.

## 📊 مراقبة الأداء

### 1. فحص إحصائيات Resend:
- اذهب إلى لوحة تحكم Resend
- راجع إحصائيات الإرسال والتسليم

### 2. مراقبة سجلات Supabase:
```bash
supabase functions logs send-email --follow
```

## 🔐 الأمان

### 1. حماية مفاتيح API:
- لا تشارك مفاتيح API في الكود
- استخدم Supabase Secrets فقط

### 2. تحديد معدل الإرسال:
- راجع حدود Resend لخطتك
- أضف منطق Rate Limiting إذا لزم الأمر

### 3. التحقق من المدخلات:
- الدالة تتحقق من صحة البيانات المدخلة
- تأكد من تنظيف البيانات قبل الإرسال
