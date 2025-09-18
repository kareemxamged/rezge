-- إصلاح خطأ الفهرس في جدول temporary_passwords
-- Fix index error in temporary_passwords table

BEGIN;

-- حذف الفهرس المعطل إذا كان موجوداً
DROP INDEX IF EXISTS idx_temporary_passwords_active;

-- إنشاء فهرس مركب بدون دوال IMMUTABLE
CREATE INDEX IF NOT EXISTS idx_temporary_passwords_active_simple 
ON temporary_passwords(email, is_used, expires_at)
WHERE is_used = FALSE;

-- فهرس إضافي للبحث السريع عن كلمات المرور غير المنتهية الصلاحية
CREATE INDEX IF NOT EXISTS idx_temporary_passwords_valid 
ON temporary_passwords(email, user_id, is_used)
WHERE is_used = FALSE;

-- فهرس للتنظيف السريع للسجلات المنتهية الصلاحية
CREATE INDEX IF NOT EXISTS idx_temporary_passwords_cleanup 
ON temporary_passwords(expires_at, is_used, created_at);

COMMIT;

SELECT 'Index error fixed successfully!' as status;
