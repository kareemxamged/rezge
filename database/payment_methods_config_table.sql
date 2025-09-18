-- جدول إعدادات طرق الدفع المتقدمة
-- Payment Methods Configuration Table

CREATE TABLE IF NOT EXISTS payment_methods_config (
    id VARCHAR(50) PRIMARY KEY, -- معرف طريقة الدفع (creditcard, mada, stcpay, applepay, banktransfer)
    name VARCHAR(100) NOT NULL, -- الاسم بالعربية
    name_en VARCHAR(100) NOT NULL, -- الاسم بالإنجليزية
    enabled BOOLEAN DEFAULT true, -- حالة التفعيل
    fees DECIMAL(5,2) DEFAULT 0.00, -- نسبة الرسوم (%)
    min_amount DECIMAL(10,2) DEFAULT 10.00, -- الحد الأدنى للمبلغ
    max_amount DECIMAL(10,2) DEFAULT 50000.00, -- الحد الأقصى للمبلغ
    countries TEXT[] DEFAULT ARRAY['SA'], -- البلدان المدعومة
    currency VARCHAR(3) DEFAULT 'SAR', -- العملة
    processing_time VARCHAR(20) DEFAULT 'instant', -- وقت المعالجة
    description TEXT, -- الوصف
    api_settings JSONB DEFAULT '{}', -- إعدادات API خاصة بكل طريقة
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء فهارس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_payment_methods_enabled ON payment_methods_config(enabled);
CREATE INDEX IF NOT EXISTS idx_payment_methods_countries ON payment_methods_config USING GIN(countries);
CREATE INDEX IF NOT EXISTS idx_payment_methods_currency ON payment_methods_config(currency);

-- إدراج البيانات الافتراضية
INSERT INTO payment_methods_config (id, name, name_en, enabled, fees, min_amount, max_amount, countries, currency, processing_time, description, api_settings) VALUES
('creditcard', 'البطاقات الائتمانية', 'Credit Cards', true, 2.75, 10.00, 50000.00, ARRAY['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'EG', 'JO'], 'SAR', 'instant', 'فيزا، ماستركارد - عبر PayTabs', '{"paytabs_enabled": true, "supported_cards": ["visa", "mastercard"]}'),
('mada', 'مدى', 'Mada', true, 2.00, 10.00, 30000.00, ARRAY['SA'], 'SAR', 'instant', 'بطاقة مدى السعودية - عبر PayTabs', '{"paytabs_enabled": true, "mada_specific": true}'),
('stcpay', 'STC Pay', 'STC Pay', true, 1.50, 5.00, 10000.00, ARRAY['SA'], 'SAR', 'instant', 'محفظة STC Pay الرقمية - عبر PayTabs', '{"paytabs_enabled": true, "stc_integration": true}'),
('applepay', 'Apple Pay', 'Apple Pay', true, 2.75, 10.00, 25000.00, ARRAY['SA', 'AE', 'KW', 'QA', 'BH', 'OM'], 'SAR', 'instant', 'الدفع عبر Apple Pay - عبر PayTabs', '{"paytabs_enabled": true, "apple_merchant_id": "merchant.com.yourapp"}'),
('banktransfer', 'التحويل البنكي', 'Bank Transfer', true, 0.00, 50.00, 100000.00, ARRAY['SA', 'AE', 'KW', 'QA', 'BH', 'OM'], 'SAR', '1-24_hours', 'تحويل مباشر إلى الحساب البنكي', '{"manual_verification": true, "bank_details_required": true}')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    name_en = EXCLUDED.name_en,
    enabled = EXCLUDED.enabled,
    fees = EXCLUDED.fees,
    min_amount = EXCLUDED.min_amount,
    max_amount = EXCLUDED.max_amount,
    countries = EXCLUDED.countries,
    currency = EXCLUDED.currency,
    processing_time = EXCLUDED.processing_time,
    description = EXCLUDED.description,
    api_settings = EXCLUDED.api_settings,
    updated_at = NOW();

-- إنشاء دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_payment_methods_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لتحديث updated_at
DROP TRIGGER IF EXISTS trigger_update_payment_methods_config_updated_at ON payment_methods_config;
CREATE TRIGGER trigger_update_payment_methods_config_updated_at
    BEFORE UPDATE ON payment_methods_config
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_methods_config_updated_at();

-- إعطاء صلاحيات للمستخدمين
GRANT SELECT, INSERT, UPDATE, DELETE ON payment_methods_config TO authenticated;
GRANT SELECT ON payment_methods_config TO anon;

-- إنشاء RLS (Row Level Security) policies
ALTER TABLE payment_methods_config ENABLE ROW LEVEL SECURITY;

-- السماح للجميع بقراءة إعدادات طرق الدفع
CREATE POLICY "Allow public read access" ON payment_methods_config
    FOR SELECT USING (true);

-- السماح للمدراء فقط بتعديل الإعدادات
CREATE POLICY "Allow admin full access" ON payment_methods_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- إنشاء view للحصول على طرق الدفع المفعلة فقط
CREATE OR REPLACE VIEW enabled_payment_methods AS
SELECT 
    id,
    name,
    name_en,
    fees,
    min_amount,
    max_amount,
    countries,
    currency,
    processing_time,
    description,
    api_settings
FROM payment_methods_config 
WHERE enabled = true
ORDER BY 
    CASE id
        WHEN 'creditcard' THEN 1
        WHEN 'mada' THEN 2
        WHEN 'stcpay' THEN 3
        WHEN 'applepay' THEN 4
        WHEN 'banktransfer' THEN 5
        ELSE 6
    END;

-- إعطاء صلاحيات للview
GRANT SELECT ON enabled_payment_methods TO authenticated, anon;

-- إنشاء دالة للحصول على طرق الدفع المتاحة لدولة محددة
CREATE OR REPLACE FUNCTION get_payment_methods_for_country(country_code TEXT)
RETURNS TABLE (
    id VARCHAR(50),
    name VARCHAR(100),
    name_en VARCHAR(100),
    fees DECIMAL(5,2),
    min_amount DECIMAL(10,2),
    max_amount DECIMAL(10,2),
    currency VARCHAR(3),
    processing_time VARCHAR(20),
    description TEXT,
    api_settings JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pmc.id,
        pmc.name,
        pmc.name_en,
        pmc.fees,
        pmc.min_amount,
        pmc.max_amount,
        pmc.currency,
        pmc.processing_time,
        pmc.description,
        pmc.api_settings
    FROM payment_methods_config pmc
    WHERE pmc.enabled = true 
    AND country_code = ANY(pmc.countries)
    ORDER BY 
        CASE pmc.id
            WHEN 'creditcard' THEN 1
            WHEN 'mada' THEN 2
            WHEN 'stcpay' THEN 3
            WHEN 'applepay' THEN 4
            WHEN 'banktransfer' THEN 5
            ELSE 6
        END;
END;
$$ LANGUAGE plpgsql;

-- إنشاء دالة لحساب الرسوم
CREATE OR REPLACE FUNCTION calculate_payment_fees(amount DECIMAL, method_id VARCHAR(50))
RETURNS DECIMAL AS $$
DECLARE
    fee_percentage DECIMAL;
BEGIN
    SELECT fees INTO fee_percentage 
    FROM payment_methods_config 
    WHERE id = method_id AND enabled = true;
    
    IF fee_percentage IS NULL THEN
        RETURN 0;
    END IF;
    
    RETURN (amount * fee_percentage / 100);
END;
$$ LANGUAGE plpgsql;

-- إنشاء دالة للتحقق من صحة المبلغ
CREATE OR REPLACE FUNCTION validate_payment_amount(amount DECIMAL, method_id VARCHAR(50))
RETURNS BOOLEAN AS $$
DECLARE
    min_amt DECIMAL;
    max_amt DECIMAL;
BEGIN
    SELECT min_amount, max_amount INTO min_amt, max_amt
    FROM payment_methods_config 
    WHERE id = method_id AND enabled = true;
    
    IF min_amt IS NULL OR max_amt IS NULL THEN
        RETURN false;
    END IF;
    
    RETURN (amount >= min_amt AND amount <= max_amt);
END;
$$ LANGUAGE plpgsql;

-- إنشاء جدول لتسجيل تغييرات الإعدادات (audit log)
CREATE TABLE IF NOT EXISTS payment_methods_config_audit (
    id SERIAL PRIMARY KEY,
    method_id VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء trigger لتسجيل التغييرات
CREATE OR REPLACE FUNCTION log_payment_methods_config_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO payment_methods_config_audit (method_id, action, new_values, changed_by)
        VALUES (NEW.id, 'INSERT', row_to_json(NEW), auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO payment_methods_config_audit (method_id, action, old_values, new_values, changed_by)
        VALUES (NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO payment_methods_config_audit (method_id, action, old_values, changed_by)
        VALUES (OLD.id, 'DELETE', row_to_json(OLD), auth.uid());
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- إنشاء triggers للتسجيل
DROP TRIGGER IF EXISTS trigger_payment_methods_config_audit ON payment_methods_config;
CREATE TRIGGER trigger_payment_methods_config_audit
    AFTER INSERT OR UPDATE OR DELETE ON payment_methods_config
    FOR EACH ROW
    EXECUTE FUNCTION log_payment_methods_config_changes();

-- إعطاء صلاحيات لجدول التسجيل
GRANT SELECT ON payment_methods_config_audit TO authenticated;

COMMENT ON TABLE payment_methods_config IS 'جدول إعدادات طرق الدفع المتقدمة';
COMMENT ON TABLE payment_methods_config_audit IS 'جدول تسجيل تغييرات إعدادات طرق الدفع';
COMMENT ON VIEW enabled_payment_methods IS 'عرض طرق الدفع المفعلة فقط';
COMMENT ON FUNCTION get_payment_methods_for_country(TEXT) IS 'دالة للحصول على طرق الدفع المتاحة لدولة محددة';
COMMENT ON FUNCTION calculate_payment_fees(DECIMAL, VARCHAR) IS 'دالة لحساب رسوم الدفع';
COMMENT ON FUNCTION validate_payment_amount(DECIMAL, VARCHAR) IS 'دالة للتحقق من صحة مبلغ الدفع';
