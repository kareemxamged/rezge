# 🚀 دليل البدء السريع - نظام الإشعارات البريدية

## 📋 نظرة سريعة

نظام إشعارات بريدية شامل لمنصة رزقي مع 14 نوع إشعار مختلف.

## 🔧 كيفية الاستخدام

### 1. استيراد الخدمة

```typescript
import { NotificationEmailService } from '../lib/notificationEmailService';

const emailService = new NotificationEmailService();
```

### 2. إرسال إشعار ترحيبي

```typescript
// عند تسجيل مستخدم جديد
await emailService.sendWelcomeNotification(
  userEmail, 
  userName
);
```

### 3. إشعار تغيير كلمة المرور

```typescript
// عند تغيير كلمة المرور
await emailService.sendPasswordChangeNotification(
  userEmail, 
  userName, 
  'security', // أو 'reset'
  {
    timestamp: new Date().toISOString(),
    ipAddress: req.ip,
    location: 'الرياض، السعودية',
    deviceType: 'Desktop',
    browser: 'Chrome'
  }
);
```

### 4. إشعار تسجيل الدخول

```typescript
// عند تسجيل دخول ناجح
await emailService.sendSuccessfulLoginNotification(
  userEmail,
  userName,
  {
    timestamp: new Date().toISOString(),
    ipAddress: req.ip,
    location: 'الرياض، السعودية',
    deviceType: 'Mobile',
    browser: 'Safari'
  }
);

// عند فشل تسجيل الدخول
await emailService.sendFailedLoginNotification(
  userEmail,
  userName,
  {
    timestamp: new Date().toISOString(),
    ipAddress: req.ip,
    failureReason: 'كلمة مرور خاطئة',
    attemptsCount: 3
  }
);
```

### 5. إشعارات المصادقة الثنائية

```typescript
// تفعيل المصادقة الثنائية
await emailService.sendTwoFactorEnabledNotification(userEmail, userName);

// تعطيل المصادقة الثنائية
await emailService.sendTwoFactorDisabledNotification(userEmail, userName);

// فشل التحقق الثنائي
await emailService.sendTwoFactorFailureNotification(
  userEmail,
  userName,
  {
    timestamp: new Date().toISOString(),
    attemptsCount: 2
  }
);
```

### 6. إشعارات التوثيق

```typescript
// قبول طلب التوثيق
await emailService.sendAccountVerificationNotification(
  userEmail,
  userName,
  'approved'
);

// رفض طلب التوثيق
await emailService.sendAccountVerificationNotification(
  userEmail,
  userName,
  'rejected',
  'الوثائق غير واضحة'
);
```

### 7. إشعارات البلاغات

```typescript
await emailService.sendReportNotification(
  reporterEmail,
  reporterName,
  reportedUserName,
  'تم استلام البلاغ',
  'user_report',
  'سلوك غير لائق'
);
```

### 8. الإجراءات الإدارية

```typescript
await emailService.sendAdminActionNotification(
  userEmail,
  userName,
  'ban',
  'مخالفة قوانين المنصة',
  '7 أيام',
  'تم حظرك بسبب السلوك غير اللائق'
);
```

## 📁 الملفات المهمة

- **`src/lib/notificationEmailService.ts`**: الخدمة الرئيسية
- **`EMAIL_NOTIFICATION_SYSTEM_DOCUMENTATION.md`**: التوثيق الشامل
- **`EMAIL_SYSTEM_COMPLETION_LOG.md`**: سجل إكمال العمل

## 🔍 أنواع الإشعارات المتاحة

1. **📞 نموذج التواصل** - `sendContactMessage()`
2. **🌟 ترحيب المستخدمين الجدد** - `sendWelcomeNotification()`
3. **🔐 تغيير كلمة المرور** - `sendPasswordChangeNotification()`
4. **📧 تغيير بيانات التواصل** - `sendContactInfoChangeNotification()`
5. **🔒 تفعيل المصادقة الثنائية** - `sendTwoFactorEnabledNotification()`
6. **✅ تسجيل الدخول الناجح** - `sendSuccessfulLoginNotification()`
7. **❌ محاولة تسجيل دخول فاشلة** - `sendFailedLoginNotification()`
8. **🔐 فشل التحقق الثنائي** - `sendTwoFactorFailureNotification()`
9. **🔓 تعطيل المصادقة الثنائية** - `sendTwoFactorDisabledNotification()`
10. **✅ توثيق الحساب** - `sendAccountVerificationNotification()`
11. **🚨 البلاغات** - `sendReportNotification()`
12. **⚖️ الإجراءات الإدارية** - `sendAdminActionNotification()`

## ⚙️ إعدادات الخادم

- **SMTP Server**: `localhost:3001`
- **Contact Email**: `contact@kareemamged.com`
- **Fallback**: نظام محاكاة عند فشل الإرسال

## 🎨 مميزات التصميم

- تصميم HTML احترافي
- دعم كامل للغة العربية مع RTL
- أيقونات تعبيرية
- تصميم متجاوب
- نسخة نصية لكل إشعار

## 🔒 مميزات الأمان

- تتبع تفاصيل الجلسة (IP، الموقع، الجهاز)
- تحذيرات أمنية فورية
- نصائح أمان في كل رسالة
- إشعارات تغيير الإعدادات الأمنية

## 🚨 ملاحظات مهمة

1. **تأكد من تشغيل خادم SMTP** على `localhost:3001`
2. **استخدم البيانات الصحيحة** للمستخدمين
3. **اختبر الإشعارات** قبل النشر
4. **راجع التوثيق الشامل** للتفاصيل الكاملة

## 📞 الدعم

للمساعدة: `contact@kareemamged.com`

---

**النظام جاهز للاستخدام الفوري! 🎉**
