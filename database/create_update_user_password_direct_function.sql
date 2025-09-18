-- دالة تحديث كلمة المرور مباشرة بدون الحاجة لجلسة مصادقة
-- Direct password update function without authentication session

BEGIN;

-- ===================================
-- دالة تحديث كلمة المرور مباشرة
-- ===================================
CREATE OR REPLACE FUNCTION update_user_password_direct(
    p_user_id UUID,
    p_email VARCHAR,
    p_new_password TEXT
)
RETURNS TABLE(
    success BOOLEAN,
    error TEXT
) AS $$
DECLARE
    v_user_exists BOOLEAN := FALSE;
    v_hashed_password TEXT;
BEGIN
    -- التحقق من وجود المستخدم
    SELECT EXISTS(
        SELECT 1 FROM users 
        WHERE id = p_user_id 
        AND email = p_email 
        AND status = 'active'
    ) INTO v_user_exists;
    
    IF NOT v_user_exists THEN
        RETURN QUERY SELECT 
            FALSE as success,
            'المستخدم غير موجود أو غير نشط' as error;
        RETURN;
    END IF;
    
    -- تشفير كلمة المرور الجديدة
    v_hashed_password := crypt(p_new_password, gen_salt('bf'));
    
    -- محاولة تحديث كلمة المرور في auth.users
    BEGIN
        UPDATE auth.users 
        SET 
            encrypted_password = v_hashed_password,
            updated_at = NOW()
        WHERE id = p_user_id;
        
        -- إذا نجح التحديث في auth.users
        IF FOUND THEN
            -- تحديث timestamp في جدول users أيضاً
            UPDATE users 
            SET updated_at = NOW()
            WHERE id = p_user_id;
            
            RETURN QUERY SELECT 
                TRUE as success,
                NULL as error;
            RETURN;
        END IF;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- إذا فشل التحديث في auth.users، جرب في جدول users
            NULL;
    END;
    
    -- محاولة بديلة: تحديث في جدول users إذا كان يحتوي على password_hash
    BEGIN
        UPDATE users 
        SET 
            password_hash = v_hashed_password,
            updated_at = NOW()
        WHERE id = p_user_id;
        
        IF FOUND THEN
            RETURN QUERY SELECT 
                TRUE as success,
                NULL as error;
            RETURN;
        ELSE
            RETURN QUERY SELECT 
                FALSE as success,
                'فشل في تحديث كلمة المرور في جميع الجداول' as error;
            RETURN;
        END IF;
        
    EXCEPTION
        WHEN OTHERS THEN
            RETURN QUERY SELECT 
                FALSE as success,
                'خطأ في تحديث كلمة المرور: ' || SQLERRM as error;
            RETURN;
    END;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- دالة بديلة مبسطة لتحديث كلمة المرور في جدول users فقط
-- ===================================
CREATE OR REPLACE FUNCTION update_user_password_simple(
    p_user_id UUID,
    p_new_password TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_hashed_password TEXT;
BEGIN
    -- تشفير كلمة المرور
    v_hashed_password := crypt(p_new_password, gen_salt('bf'));
    
    -- تحديث في جدول users
    UPDATE users 
    SET 
        password_hash = v_hashed_password,
        updated_at = NOW()
    WHERE id = p_user_id AND status = 'active';
    
    RETURN FOUND;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- منح الصلاحيات اللازمة
-- ===================================
GRANT EXECUTE ON FUNCTION update_user_password_direct(UUID, VARCHAR, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION update_user_password_direct(UUID, VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_password_direct(UUID, VARCHAR, TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION update_user_password_simple(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION update_user_password_simple(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_password_simple(UUID, TEXT) TO service_role;

COMMIT;

SELECT 'Password update functions created successfully!' as status;
