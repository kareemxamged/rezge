# 📧 دليل إعداد SMTP المباشر

## 🎯 المفهوم

بدلاً من استخدام خدمات وسيطة مثل Resend أو SendGrid، سنستخدم إعدادات SMTP المباشرة للنطاق المخصص:

- **الخادم:** smtp.hostinger.com
- **المنفذ:** 465 (SSL)
- **المستخدم:** manage@kareemamged.com
- **كلمة المرور:** [تحتاج إضافتها]

## 🚀 الطرق المتاحة

### 1. خدمة PHP مع PHPMailer (الأفضل)

#### أ. تثبيت PHPMailer:
```bash
# في مجلد المشروع
composer require phpmailer/phpmailer
```

#### ب. اختبار الخدمة:
```javascript
// في الكونسول
DirectSMTPService.sendEmail({
  to: "kemoamego@gmail.com",
  subject: "اختبار SMTP مباشر",
  html: "<h2>مرحباً من رزقي!</h2>",
  text: "مرحباً من رزقي!",
  type: "test"
}, "كلمة_مرور_SMTP")
```

### 2. خدمة Node.js مع Nodemailer

#### أ. إنشاء خدمة Node.js:
```javascript
// server/smtp-service.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  auth: {
    user: 'manage@kareemamged.com',
    pass: 'كلمة_المرور'
  }
});

app.post('/send-email', async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;
    
    await transporter.sendMail({
      from: 'رزقي - موقع الزواج الإسلامي <manage@kareemamged.com>',
      to: to,
      subject: subject,
      html: html,
      text: text
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

#### ب. تشغيل الخدمة:
```bash
npm install nodemailer express cors
node server/smtp-service.js
```

### 3. خدمة Python مع smtplib

#### أ. إنشاء خدمة Python:
```python
# smtp_service.py
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/send-email', methods=['POST'])
def send_email():
    try:
        data = request.json
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = data['subject']
        msg['From'] = 'رزقي - موقع الزواج الإسلامي <manage@kareemamged.com>'
        msg['To'] = data['to']
        
        text_part = MIMEText(data['text'], 'plain', 'utf-8')
        html_part = MIMEText(data['html'], 'html', 'utf-8')
        
        msg.attach(text_part)
        msg.attach(html_part)
        
        server = smtplib.SMTP_SSL('smtp.hostinger.com', 465)
        server.login('manage@kareemamged.com', 'كلمة_المرور')
        server.send_message(msg)
        server.quit()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=3001)
```

#### ب. تشغيل الخدمة:
```bash
pip install flask flask-cors
python smtp_service.py
```

## 🔧 إعداد النظام

### 1. الحصول على كلمة مرور SMTP:

#### أ. تسجيل دخول لوحة تحكم Hostinger
#### ب. الانتقال إلى إعدادات البريد الإلكتروني
#### ج. إنشاء أو عرض كلمة مرور للحساب manage@kareemamged.com

### 2. تحديث النظام:

```javascript
// في الكونسول، بعد الحصول على كلمة المرور
const smtpPassword = "كلمة_المرور_الفعلية";

// اختبار الاتصال
DirectSMTPService.testSMTPConnection(smtpPassword);

// إرسال إيميل تجريبي
DirectSMTPService.sendEmail({
  to: "kemoamego@gmail.com",
  subject: "اختبار SMTP مباشر من رزقي",
  html: "<h2>🕌 مرحباً من رزقي!</h2><p>هذا اختبار للإرسال المباشر عبر SMTP.</p>",
  text: "مرحباً من رزقي! هذا اختبار للإرسال المباشر عبر SMTP.",
  type: "test"
}, smtpPassword);
```

## 🎯 المزايا

### ✅ **الاستقلالية الكاملة:**
- لا نعتمد على خدمات خارجية
- تحكم كامل في الإرسال
- لا توجد حدود خارجية

### ✅ **الموثوقية:**
- اتصال مباشر بخادم SMTP
- لا توجد طبقات وسيطة
- أداء أسرع

### ✅ **الأمان:**
- كلمة المرور محفوظة محلياً
- لا تمرير عبر خدمات خارجية
- تشفير SSL مباشر

### ✅ **التكلفة:**
- لا توجد تكاليف إضافية
- استخدام الاستضافة الحالية
- لا حدود على عدد الإيميلات

## 🧪 الاختبار

### 1. اختبار PHP:
```bash
# تأكد من وجود PHP
php -v

# اختبار الخدمة
curl -X POST http://localhost/api/send-smtp-email.php \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"Test","html":"<h1>Test</h1>","smtp_config":{"host":"smtp.hostinger.com","port":465,"secure":true,"user":"manage@kareemamged.com","pass":"PASSWORD"}}'
```

### 2. اختبار من المتصفح:
```javascript
// في الكونسول
DirectSMTPService.testSMTPConnection("كلمة_المرور_الفعلية")
```

## 🔍 استكشاف الأخطاء

### 1. خطأ "Authentication failed":
- تحقق من كلمة المرور
- تأكد من تفعيل SMTP في لوحة التحكم

### 2. خطأ "Connection refused":
- تحقق من إعدادات الجدار الناري
- تأكد من المنفذ 465

### 3. خطأ "SSL/TLS":
- تأكد من دعم SSL في الخادم
- جرب المنفذ 587 مع STARTTLS

## 📋 الخطوات التالية

1. **احصل على كلمة مرور SMTP** من لوحة تحكم Hostinger
2. **اختر الطريقة المفضلة** (PHP/Node.js/Python)
3. **اختبر الاتصال** باستخدام الأدوات المتاحة
4. **ادمج مع النظام** الحالي
5. **اختبر جميع أنواع الإيميلات**

## 🎉 النتيجة المتوقعة

بعد الإعداد، ستحصل على:
- ✅ إرسال فوري ومباشر
- ✅ موثوقية عالية
- ✅ تحكم كامل
- ✅ لا توجد قيود خارجية
- ✅ أمان محسن
