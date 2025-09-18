-- إضافة الحقول الجديدة للملف الشخصي المطور
-- تاريخ الإنشاء: 2025-01-11
-- الغرض: توسيع جدول المستخدمين لدعم الملف الشخصي المطور

-- إضافة رقم العضوية الفريد
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS membership_number VARCHAR(20) UNIQUE;

-- إضافة حقول الحالة الاجتماعية المطورة
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS marriage_type VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS children_count INTEGER DEFAULT 0;

-- إضافة حقول الجنسية والإقامة
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS residence_location VARCHAR(100);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS nationality VARCHAR(50);

-- إضافة حقول المواصفات الجسدية
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS weight INTEGER;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS height INTEGER;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS skin_color VARCHAR(30);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS body_type VARCHAR(30);

-- إضافة حقول الالتزام الديني المطورة
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS religiosity_level VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS prayer_commitment VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS smoking VARCHAR(10);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS beard VARCHAR(10); -- للذكور فقط
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS hijab VARCHAR(50); -- للإناث فقط

-- إضافة حقول الدراسة والعمل المطورة
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS education_level VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS financial_status VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS work_field VARCHAR(100);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS job_title VARCHAR(100);

-- إضافة حقول الدخل والصحة
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS monthly_income VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS health_status VARCHAR(50);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_users_membership_number ON public.users(membership_number);
CREATE INDEX IF NOT EXISTS idx_users_marriage_type ON public.users(marriage_type);
CREATE INDEX IF NOT EXISTS idx_users_nationality ON public.users(nationality);
CREATE INDEX IF NOT EXISTS idx_users_education_level ON public.users(education_level);
CREATE INDEX IF NOT EXISTS idx_users_financial_status ON public.users(financial_status);

-- دالة لتوليد رقم عضوية فريد
CREATE OR REPLACE FUNCTION generate_membership_number()
RETURNS VARCHAR(20) AS $$
DECLARE
    new_number VARCHAR(20);
    counter INTEGER := 1;
BEGIN
    LOOP
        -- توليد رقم عضوية بصيغة RZ + 6 أرقام
        new_number := 'RZ' || LPAD(counter::TEXT, 6, '0');
        
        -- التحقق من عدم وجود الرقم مسبقاً
        IF NOT EXISTS (SELECT 1 FROM public.users WHERE membership_number = new_number) THEN
            RETURN new_number;
        END IF;
        
        counter := counter + 1;
        
        -- حماية من اللوب اللانهائي
        IF counter > 999999 THEN
            RAISE EXCEPTION 'لا يمكن توليد رقم عضوية فريد';
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- دالة لتعيين رقم عضوية للمستخدمين الموجودين
CREATE OR REPLACE FUNCTION assign_membership_numbers()
RETURNS void AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- تعيين أرقام عضوية للمستخدمين الذين لا يملكون رقم عضوية
    FOR user_record IN 
        SELECT id FROM public.users 
        WHERE membership_number IS NULL 
        ORDER BY created_at ASC
    LOOP
        UPDATE public.users 
        SET membership_number = generate_membership_number()
        WHERE id = user_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- تشغيل الدالة لتعيين أرقام عضوية للمستخدمين الموجودين
SELECT assign_membership_numbers();

-- إنشاء trigger لتعيين رقم عضوية تلقائياً للمستخدمين الجدد
CREATE OR REPLACE FUNCTION auto_assign_membership_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.membership_number IS NULL THEN
        NEW.membership_number := generate_membership_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ربط الـ trigger بجدول المستخدمين
DROP TRIGGER IF EXISTS trigger_auto_assign_membership_number ON public.users;
CREATE TRIGGER trigger_auto_assign_membership_number
    BEFORE INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_membership_number();

-- إضافة قيود للتحقق من صحة البيانات
ALTER TABLE public.users ADD CONSTRAINT check_marriage_type 
    CHECK (marriage_type IN ('first_wife', 'second_wife', 'only_wife', 'no_objection_polygamy') OR marriage_type IS NULL);

ALTER TABLE public.users ADD CONSTRAINT check_religiosity_level 
    CHECK (religiosity_level IN ('not_religious', 'slightly_religious', 'religious', 'very_religious', 'prefer_not_say') OR religiosity_level IS NULL);

ALTER TABLE public.users ADD CONSTRAINT check_prayer_commitment 
    CHECK (prayer_commitment IN ('dont_pray', 'pray_all', 'pray_sometimes', 'prefer_not_say') OR prayer_commitment IS NULL);

ALTER TABLE public.users ADD CONSTRAINT check_smoking 
    CHECK (smoking IN ('yes', 'no') OR smoking IS NULL);

ALTER TABLE public.users ADD CONSTRAINT check_beard 
    CHECK (beard IN ('yes', 'no') OR beard IS NULL);

ALTER TABLE public.users ADD CONSTRAINT check_hijab 
    CHECK (hijab IN ('no_hijab', 'hijab', 'niqab', 'prefer_not_say') OR hijab IS NULL);

ALTER TABLE public.users ADD CONSTRAINT check_skin_color 
    CHECK (skin_color IN ('very_fair', 'fair', 'medium', 'olive', 'dark') OR skin_color IS NULL);

ALTER TABLE public.users ADD CONSTRAINT check_body_type 
    CHECK (body_type IN ('slim', 'average', 'athletic', 'heavy') OR body_type IS NULL);

ALTER TABLE public.users ADD CONSTRAINT check_education_level 
    CHECK (education_level IN ('primary', 'secondary', 'diploma', 'bachelor', 'master', 'phd') OR education_level IS NULL);

ALTER TABLE public.users ADD CONSTRAINT check_financial_status 
    CHECK (financial_status IN ('poor', 'below_average', 'average', 'above_average', 'wealthy') OR financial_status IS NULL);

ALTER TABLE public.users ADD CONSTRAINT check_monthly_income 
    CHECK (monthly_income IN ('less_3000', '3000_5000', '5000_8000', '8000_12000', '12000_20000', 'more_20000', 'prefer_not_say') OR monthly_income IS NULL);

ALTER TABLE public.users ADD CONSTRAINT check_health_status 
    CHECK (health_status IN ('excellent', 'very_good', 'good', 'fair', 'poor', 'prefer_not_say') OR health_status IS NULL);

-- إضافة تعليقات للحقول الجديدة
COMMENT ON COLUMN public.users.membership_number IS 'رقم العضوية الفريد وغير القابل للتعديل';
COMMENT ON COLUMN public.users.marriage_type IS 'نوع الزواج: للذكر (زوجة أولى/ثانية) للأنثى (الوحيدة/لا مانع من التعدد)';
COMMENT ON COLUMN public.users.children_count IS 'عدد الأطفال';
COMMENT ON COLUMN public.users.residence_location IS 'مكان الإقامة';
COMMENT ON COLUMN public.users.nationality IS 'الجنسية';
COMMENT ON COLUMN public.users.weight IS 'الوزن بالكيلوجرام';
COMMENT ON COLUMN public.users.height IS 'الطول بالسنتيمتر';
COMMENT ON COLUMN public.users.skin_color IS 'لون البشرة';
COMMENT ON COLUMN public.users.body_type IS 'بنية الجسم';
COMMENT ON COLUMN public.users.religiosity_level IS 'مستوى التدين';
COMMENT ON COLUMN public.users.prayer_commitment IS 'الالتزام بالصلاة';
COMMENT ON COLUMN public.users.smoking IS 'التدخين';
COMMENT ON COLUMN public.users.beard IS 'اللحية (للذكور فقط)';
COMMENT ON COLUMN public.users.hijab IS 'الحجاب (للإناث فقط)';
COMMENT ON COLUMN public.users.education_level IS 'المستوى التعليمي';
COMMENT ON COLUMN public.users.financial_status IS 'الوضع المادي';
COMMENT ON COLUMN public.users.work_field IS 'مجال العمل';
COMMENT ON COLUMN public.users.job_title IS 'المسمى الوظيفي';
COMMENT ON COLUMN public.users.monthly_income IS 'الدخل الشهري';
COMMENT ON COLUMN public.users.health_status IS 'الحالة الصحية';

-- تحديث الحالة الاجتماعية لتشمل الخيارات الجديدة
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_marital_status_check;
ALTER TABLE public.users ADD CONSTRAINT check_marital_status 
    CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed', 'unmarried', 'divorced_female', 'widowed_female') OR marital_status IS NULL);
