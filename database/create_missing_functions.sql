-- إنشاء الدوال المفقودة لنظام التحقق من البريد الإلكتروني وإنشاء الملفات الشخصية

-- حذف الدوال الموجودة أولاً لتجنب تضارب أنواع البيانات
DROP FUNCTION IF EXISTS create_user_profile_safe(jsonb);
DROP FUNCTION IF EXISTS confirm_user_email(uuid);

-- 1. دالة تأكيد البريد الإلكتروني
CREATE OR REPLACE FUNCTION confirm_user_email(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE auth.users
  SET email_confirmed_at = NOW()
  WHERE id = user_id AND email_confirmed_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. دالة إنشاء الملف الشخصي بشكل آمن
CREATE OR REPLACE FUNCTION create_user_profile_safe(profile_data JSONB)
RETURNS VOID AS $$
BEGIN
  -- إدراج الملف الشخصي مع تجنب التضارب
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    phone,
    age,
    gender,
    city,
    membership_number,
    education,
    profession,
    job_title,
    work_field,
    religious_commitment,
    bio,
    nationality,
    weight,
    height,
    religiosity_level,
    prayer_commitment,
    smoking,
    beard,
    hijab,
    education_level,
    financial_status,
    verified,
    status,
    created_at,
    updated_at
  ) VALUES (
    (profile_data->>'id')::UUID,
    profile_data->>'email',
    profile_data->>'first_name',
    profile_data->>'last_name',
    profile_data->>'phone',
    (profile_data->>'age')::INTEGER,
    profile_data->>'gender',
    profile_data->>'city',
    profile_data->>'membership_number',
    profile_data->>'education',
    profile_data->>'profession',
    profile_data->>'job_title',
    profile_data->>'work_field',
    profile_data->>'religious_commitment',
    profile_data->>'bio',
    profile_data->>'nationality',
    CASE WHEN profile_data->>'weight' IS NOT NULL THEN (profile_data->>'weight')::NUMERIC END,
    CASE WHEN profile_data->>'height' IS NOT NULL THEN (profile_data->>'height')::NUMERIC END,
    profile_data->>'religiosity_level',
    profile_data->>'prayer_commitment',
    profile_data->>'smoking',
    profile_data->>'beard',
    profile_data->>'hijab',
    profile_data->>'education_level',
    profile_data->>'financial_status',
    COALESCE((profile_data->>'verified')::BOOLEAN, false), -- التأكد من أن القيمة الافتراضية false
    COALESCE(profile_data->>'status', 'active'),
    COALESCE((profile_data->>'created_at')::TIMESTAMPTZ, NOW()),
    COALESCE((profile_data->>'updated_at')::TIMESTAMPTZ, NOW())
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone,
    age = EXCLUDED.age,
    gender = EXCLUDED.gender,
    city = EXCLUDED.city,
    membership_number = EXCLUDED.membership_number,
    education = EXCLUDED.education,
    profession = EXCLUDED.profession,
    job_title = EXCLUDED.job_title,
    work_field = EXCLUDED.work_field,
    religious_commitment = EXCLUDED.religious_commitment,
    bio = EXCLUDED.bio,
    nationality = EXCLUDED.nationality,
    weight = EXCLUDED.weight,
    height = EXCLUDED.height,
    religiosity_level = EXCLUDED.religiosity_level,
    prayer_commitment = EXCLUDED.prayer_commitment,
    smoking = EXCLUDED.smoking,
    beard = EXCLUDED.beard,
    hijab = EXCLUDED.hijab,
    education_level = EXCLUDED.education_level,
    financial_status = EXCLUDED.financial_status,
    verified = COALESCE(EXCLUDED.verified, false), -- التأكد من أن القيمة الافتراضية false حتى عند التحديث
    status = EXCLUDED.status,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إضافة تعليقات للدوال
COMMENT ON FUNCTION confirm_user_email(UUID) IS 'دالة تأكيد البريد الإلكتروني للمستخدم';
COMMENT ON FUNCTION create_user_profile_safe(JSONB) IS 'دالة إنشاء الملف الشخصي بشكل آمن مع ضمان verified = false';