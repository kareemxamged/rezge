import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  AlertCircle,
  DollarSign,
  Globe,
  Settings,
  CreditCard,
  Building2,
  Smartphone
} from 'lucide-react';
import { useToast } from '../ToastContainer';

interface PaymentMethodConfig {
  id: string;
  name: string;
  name_en: string;
  enabled: boolean;
  fees: number;
  min_amount: number;
  max_amount: number;
  countries: string[];
  currency: string;
  processing_time: string;
  description: string;
  api_settings?: {
    [key: string]: any;
  };
}

interface PaymentMethodSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  methodId: string;
  methodConfig: PaymentMethodConfig;
  onSave: (config: PaymentMethodConfig) => Promise<void>;
}

const PaymentMethodSettingsModal: React.FC<PaymentMethodSettingsModalProps> = ({
  isOpen,
  onClose,
  methodId,
  methodConfig,
  onSave
}) => {
  const { showSuccess, showError } = useToast();
  const [config, setConfig] = useState<PaymentMethodConfig>(methodConfig);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    setConfig(methodConfig);
    setErrors({});
  }, [methodConfig, isOpen]);

  const validateConfig = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (config.fees < 0 || config.fees > 10) {
      newErrors.fees = 'الرسوم يجب أن تكون بين 0% و 10%';
    }

    if (config.min_amount < 0) {
      newErrors.min_amount = 'الحد الأدنى يجب أن يكون أكبر من 0';
    }

    if (config.max_amount <= config.min_amount) {
      newErrors.max_amount = 'الحد الأقصى يجب أن يكون أكبر من الحد الأدنى';
    }

    if (config.countries.length === 0) {
      newErrors.countries = 'يجب اختيار دولة واحدة على الأقل';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateConfig()) {
      showError('خطأ في البيانات', 'يرجى تصحيح الأخطاء المعروضة');
      return;
    }

    setSaving(true);
    try {
      await onSave(config);
      showSuccess('تم الحفظ بنجاح', `تم حفظ إعدادات ${config.name} بنجاح`);
      onClose();
    } catch (error) {
      console.error('Error saving payment method config:', error);
      showError('خطأ في الحفظ', 'حدث خطأ في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const getMethodIcon = () => {
    switch (methodId) {
      case 'creditcard':
        return <CreditCard className="w-6 h-6 text-blue-600" />;
      case 'mada':
        return <img src="/Mada_pay.svg" alt="Mada" className="w-8 h-6 object-contain" />;
      case 'stcpay':
        return <img src="/stc_pay.svg" alt="STC Pay" className="w-8 h-6 object-contain" />;
      case 'applepay':
        return <img src="/apple_pay.svg" alt="Apple Pay" className="w-8 h-6 object-contain" />;
      case 'banktransfer':
        return <Building2 className="w-6 h-6 text-orange-600" />;
      default:
        return <Settings className="w-6 h-6 text-gray-600" />;
    }
  };

  const availableCountries = [
    { code: 'SA', name: 'السعودية', name_en: 'Saudi Arabia' },
    { code: 'AE', name: 'الإمارات', name_en: 'UAE' },
    { code: 'KW', name: 'الكويت', name_en: 'Kuwait' },
    { code: 'QA', name: 'قطر', name_en: 'Qatar' },
    { code: 'BH', name: 'البحرين', name_en: 'Bahrain' },
    { code: 'OM', name: 'عمان', name_en: 'Oman' },
    { code: 'EG', name: 'مصر', name_en: 'Egypt' },
    { code: 'JO', name: 'الأردن', name_en: 'Jordan' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100">
              {getMethodIcon()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">إعدادات {config.name}</h2>
              <p className="text-sm text-slate-600">تخصيص إعدادات طريقة الدفع</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Settings */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                حالة التفعيل
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({...config, enabled: e.target.checked})}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className={`text-sm font-medium ${config.enabled ? 'text-green-600' : 'text-red-500'}`}>
                  {config.enabled ? 'مفعل' : 'معطل'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                نسبة الرسوم (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={config.fees}
                  onChange={(e) => setConfig({...config, fees: parseFloat(e.target.value) || 0})}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.fees ? 'border-red-300' : 'border-slate-300'
                  }`}
                />
                <DollarSign className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              </div>
              {errors.fees && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.fees}
                </p>
              )}
            </div>
          </div>

          {/* Amount Limits */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                الحد الأدنى للمبلغ (ريال)
              </label>
              <input
                type="number"
                min="0"
                value={config.min_amount}
                onChange={(e) => setConfig({...config, min_amount: parseFloat(e.target.value) || 0})}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.min_amount ? 'border-red-300' : 'border-slate-300'
                }`}
              />
              {errors.min_amount && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.min_amount}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                الحد الأقصى للمبلغ (ريال)
              </label>
              <input
                type="number"
                min="0"
                value={config.max_amount}
                onChange={(e) => setConfig({...config, max_amount: parseFloat(e.target.value) || 0})}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.max_amount ? 'border-red-300' : 'border-slate-300'
                }`}
              />
              {errors.max_amount && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.max_amount}
                </p>
              )}
            </div>
          </div>

          {/* Countries */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Globe className="w-4 h-4 inline mr-1" />
              البلدان المدعومة
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {availableCountries.map(country => (
                <label key={country.code} className="flex items-center gap-2 p-2 border rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.countries.includes(country.code)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setConfig({...config, countries: [...config.countries, country.code]});
                      } else {
                        setConfig({...config, countries: config.countries.filter(c => c !== country.code)});
                      }
                    }}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm">{country.name}</span>
                </label>
              ))}
            </div>
            {errors.countries && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.countries}
              </p>
            )}
          </div>

          {/* Processing Time */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                وقت المعالجة
              </label>
              <select
                value={config.processing_time}
                onChange={(e) => setConfig({...config, processing_time: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="instant">فوري</option>
                <option value="1-3_minutes">1-3 دقائق</option>
                <option value="5-10_minutes">5-10 دقائق</option>
                <option value="1-24_hours">1-24 ساعة</option>
                <option value="1-3_days">1-3 أيام</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                العملة
              </label>
              <select
                value={config.currency}
                onChange={(e) => setConfig({...config, currency: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="SAR">ريال سعودي (SAR)</option>
                <option value="USD">دولار أمريكي (USD)</option>
                <option value="EUR">يورو (EUR)</option>
                <option value="AED">درهم إماراتي (AED)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              الوصف
            </label>
            <textarea
              rows={3}
              value={config.description}
              onChange={(e) => setConfig({...config, description: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="وصف مختصر لطريقة الدفع..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                حفظ الإعدادات
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodSettingsModal;
