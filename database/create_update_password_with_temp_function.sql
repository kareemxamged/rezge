-- دالة تحديث كلمة المرور باستخدام كلمة المرور المؤقتة
-- تم إنشاؤها لحل مشكلة نظام كلمة المرور المؤقتة في موقع رزقي

-- حذف الدالة إذا كانت موجودة
DROP FUNCTION IF EXISTS update_password_with_temp(text, text, text);

-- إنشاء دالة تحديث كلمة المرور باستخدام كلمة المرور المؤقتة
CREATE OR REPLACE FUNCTION update_password_with_temp(
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
    SELECT id, temp_password_hash, is_used, expires_at, is_first_use
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
    -- ملاحظة: كلمة المرور مُشفرة بـ bcrypt من الكود JavaScript
    -- لذا نحتاج للتحقق بطريقة مختلفة
    -- سنستخدم دالة مخصصة للتحقق من bcrypt
    BEGIN
        -- محاولة التحقق باستخدام bcrypt extension إذا كانت متوفرة
        -- أو استخدام طريقة بديلة
        password_match := temp_password_record.temp_password_hash = crypt(temp_password, temp_password_record.temp_password_hash);
        
        -- إذا فشل، نحاول طريقة أخرى للتحقق من bcrypt
        IF NOT password_match THEN
            -- للتوافق مع bcrypt المُستخدم في JavaScript
            -- نحتاج لاستخدام extension pgcrypto مع bcrypt
            password_match := temp_password_record.temp_password_hash = crypt(temp_password, temp_password_record.temp_password_hash);
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            password_match := false;
    END;
    
    IF NOT password_match THEN
        RAISE LOG 'كلمة المرور المؤقتة غير صحيحة للمستخدم: %', user_email;
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
        RAISE LOG 'خطأ في دالة update_password_with_temp: % - %', SQLSTATE, SQLERRM;
        RETURN json_build_object(
            'success', false,
            'error', 'حدث خطأ غير متوقع أثناء تحديث كلمة المرور'
        );
END;
$$;

-- منح الصلاحيات للدالة
GRANT EXECUTE ON FUNCTION update_password_with_temp(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION update_password_with_temp(text, text, text) TO anon;

-- إضافة تعليق على الدالة
COMMENT ON FUNCTION update_password_with_temp(text, text, text) IS 
'دالة تحديث كلمة المرور باستخدام كلمة المرور المؤقتة - تتحقق من صحة كلمة المرور المؤقتة وتحدث كلمة المرور الجديدة';

-- تسجيل إنشاء الدالة
DO $$
BEGIN
    RAISE NOTICE 'تم إنشاء دالة update_password_with_temp بنجاح';
    RAISE NOTICE 'الدالة تدعم: التحقق من كلمة المرور المؤقتة، تحديث كلمة المرور، تسجيل الاستخدام';
    RAISE NOTICE 'تاريخ الإنشاء: %', NOW();
END $$;
