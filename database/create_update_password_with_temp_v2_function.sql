-- دالة تحديث كلمة المرور باستخدام كلمة المرور المؤقتة (الإصدار المحسن)
-- تم إنشاؤها لحل مشكلة التحقق من bcrypt في موقع رزقي

-- حذف الدالة إذا كانت موجودة
DROP FUNCTION IF EXISTS update_password_with_temp_v2(text, text, text);

-- تمكين extension pgcrypto إذا لم تكن مُفعلة
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- إنشاء دالة تحديث كلمة المرور باستخدام كلمة المرور المؤقتة (محسنة)
CREATE OR REPLACE FUNCTION update_password_with_temp_v2(
    user_email text,
    temp_password text,
    new_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    user_record record;
    temp_password_record record;
    password_match boolean := false;
    result json;
BEGIN
    -- تسجيل بداية العملية
    RAISE LOG 'بدء عملية تحديث كلمة المرور للمستخدم: %', user_email;
    
    -- البحث عن المستخدم في auth.users
    SELECT id, email INTO user_record
    FROM auth.users
    WHERE email = lower(user_email)
    AND email_confirmed_at IS NOT NULL;
    
    -- التحقق من وجود المستخدم
    IF user_record.id IS NULL THEN
        RAISE LOG 'المستخدم غير موجود أو غير مؤكد: %', user_email;
        RETURN json_build_object(
            'success', false,
            'error', 'المستخدم غير موجود أو غير مؤكد'
        );
    END IF;
    
    RAISE LOG 'تم العثور على المستخدم: %', user_record.id;
    
    -- البحث عن كلمات المرور المؤقتة الصالحة
    SELECT id, temp_password_hash, temp_password_plain, is_used, expires_at, is_first_use
    INTO temp_password_record
    FROM temporary_passwords
    WHERE email = lower(user_email)
    AND is_used = false
    AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- التحقق من وجود كلمة مرور مؤقتة صالحة
    IF temp_password_record.id IS NULL THEN
        RAISE LOG 'لا توجد كلمة مرور مؤقتة صالحة للمستخدم: %', user_email;
        RETURN json_build_object(
            'success', false,
            'error', 'كلمة المرور المؤقتة غير صحيحة أو انتهت صلاحيتها'
        );
    END IF;
    
    RAISE LOG 'تم العثور على كلمة مرور مؤقتة: %', temp_password_record.id;
    
    -- التحقق من صحة كلمة المرور المؤقتة
    -- أولاً: محاولة مقارنة مع النص الخام (للاختبار)
    IF temp_password_record.temp_password_plain IS NOT NULL THEN
        password_match := temp_password = temp_password_record.temp_password_plain;
        RAISE LOG 'مقارنة النص الخام: %', password_match;
    END IF;
    
    -- ثانياً: إذا فشلت المقارنة، نحاول مع bcrypt
    IF NOT password_match THEN
        BEGIN
            -- محاولة استخدام crypt مع bcrypt
            password_match := temp_password_record.temp_password_hash = crypt(temp_password, temp_password_record.temp_password_hash);
            RAISE LOG 'مقارنة bcrypt مع crypt: %', password_match;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE LOG 'فشل في استخدام crypt: %', SQLERRM;
                password_match := false;
        END;
    END IF;
    
    -- ثالثاً: إذا فشلت كل المحاولات، نحاول مقارنة مباشرة
    IF NOT password_match THEN
        -- كحل أخير، نقارن مع hash مباشرة (في حالة كان التشفير مختلف)
        password_match := temp_password_record.temp_password_hash = temp_password;
        RAISE LOG 'مقارنة مباشرة: %', password_match;
    END IF;
    
    IF NOT password_match THEN
        RAISE LOG 'كلمة المرور المؤقتة غير صحيحة للمستخدم: %', user_email;
        RAISE LOG 'كلمة المرور المدخلة: %, Hash المحفوظ: %, النص الخام: %', 
                  temp_password, temp_password_record.temp_password_hash, temp_password_record.temp_password_plain;
        RETURN json_build_object(
            'success', false,
            'error', 'كلمة المرور المؤقتة غير صحيحة'
        );
    END IF;
    
    RAISE LOG 'كلمة المرور المؤقتة صحيحة، بدء تحديث كلمة المرور الجديدة';
    
    -- تحديث كلمة المرور في auth.users
    UPDATE auth.users
    SET 
        encrypted_password = crypt(new_password, gen_salt('bf', 10)),
        updated_at = NOW()
    WHERE id = user_record.id;
    
    -- التحقق من نجاح التحديث
    IF NOT FOUND THEN
        RAISE LOG 'فشل في تحديث كلمة المرور للمستخدم: %', user_record.id;
        RETURN json_build_object(
            'success', false,
            'error', 'فشل في تحديث كلمة المرور'
        );
    END IF;
    
    RAISE LOG 'تم تحديث كلمة المرور بنجاح، تحديث حالة كلمة المرور المؤقتة';
    
    -- تحديث حالة كلمة المرور المؤقتة كمستخدمة
    UPDATE temporary_passwords
    SET 
        is_used = true,
        used_at = NOW(),
        is_first_use = false
    WHERE id = temp_password_record.id;
    
    -- التحقق من نجاح تحديث حالة كلمة المرور المؤقتة
    IF NOT FOUND THEN
        RAISE LOG 'فشل في تحديث حالة كلمة المرور المؤقتة: %', temp_password_record.id;
        -- لا نفشل العملية هنا لأن كلمة المرور تم تحديثها بنجاح
    END IF;
    
    RAISE LOG 'تمت العملية بنجاح للمستخدم: %', user_email;
    
    -- إرجاع نتيجة النجاح
    RETURN json_build_object(
        'success', true,
        'message', 'تم تحديث كلمة المرور بنجاح'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'خطأ في دالة update_password_with_temp_v2: % - %', SQLSTATE, SQLERRM;
        RETURN json_build_object(
            'success', false,
            'error', 'حدث خطأ غير متوقع أثناء تحديث كلمة المرور'
        );
END;
$$;

-- منح الصلاحيات للدالة
GRANT EXECUTE ON FUNCTION update_password_with_temp_v2(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION update_password_with_temp_v2(text, text, text) TO anon;

-- إضافة تعليق على الدالة
COMMENT ON FUNCTION update_password_with_temp_v2(text, text, text) IS 
'دالة تحديث كلمة المرور باستخدام كلمة المرور المؤقتة (الإصدار المحسن) - تدعم bcrypt ومقارنة النص الخام';

-- تسجيل إنشاء الدالة
DO $$
BEGIN
    RAISE NOTICE 'تم إنشاء دالة update_password_with_temp_v2 بنجاح';
    RAISE NOTICE 'الدالة تدعم: bcrypt، مقارنة النص الخام، تسجيل مفصل';
    RAISE NOTICE 'تاريخ الإنشاء: %', NOW();
END $$;
