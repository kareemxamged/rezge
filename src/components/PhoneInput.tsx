import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Phone } from 'lucide-react';
import { arabCountries, getDefaultCountry, validatePhoneNumber } from '../data/arabCountries';
import { countriesEnglish } from '../data/countriesEnglish';
import type { ArabCountry } from '../data/arabCountries';


interface PhoneInputProps {
  value?: string;
  onChange: (fullPhoneNumber: string, isValid: boolean) => void;
  onCountryChange?: (country: ArabCountry) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  // حالة التحقق من التوفر
  availabilityStatus?: 'idle' | 'checking' | 'available' | 'taken';
}

const PhoneInput: React.FC<PhoneInputProps> = ({
  value = '',
  onChange,
  onCountryChange,
  placeholder = 'رقم الهاتف',
  error,
  disabled = false,
  className = '',
  availabilityStatus = 'idle'
}) => {
  const { i18n } = useTranslation();
  const [selectedCountry, setSelectedCountry] = useState<ArabCountry>(getDefaultCountry());
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isValid, setIsValid] = useState(false);

  const isRTL = i18n.language === 'ar';

  // دالة للحصول على اسم الدولة المناسب حسب اللغة
  const getDisplayCountryName = (country: ArabCountry): string => {
    if (i18n.language === 'ar') {
      return country.name; // عرض الاسم العربي كما هو
    } else {
      // البحث عن الدولة في قائمة الدول الإنجليزية
      const englishCountry = countriesEnglish.find(c => c.code === country.code);
      return englishCountry ? englishCountry.nameEn : country.name;
    }
  };

  // دالة للحصول على النص الفرعي (رمز الهاتف أو الاختصار)
  const getDisplaySubtext = (country: ArabCountry): string => {
    if (i18n.language === 'ar') {
      return country.phoneCode; // عرض رمز الهاتف في العربية
    } else {
      return ''; // لا نعرض أي نص فرعي في الإنجليزية
    }
  };

  // استخدام useRef لتتبع آخر قيمة معالجة لتجنب الحلقة اللانهائية
  const lastProcessedValue = useRef<string>('');
  const isProcessingExternalValue = useRef<boolean>(false);

  console.log('PhoneInput: Render with value:', value, 'phoneNumber:', phoneNumber, 'selectedCountry:', selectedCountry.name);

  // تحليل القيمة الأولية فقط عند تغييرها من الخارج
  useEffect(() => {
    console.log('PhoneInput: useEffect triggered with value:', value, 'lastProcessedValue:', lastProcessedValue.current);

    // تجنب معالجة نفس القيمة مرتين
    if (value === lastProcessedValue.current) {
      console.log('PhoneInput: Skipping same value');
      return;
    }

    console.log('PhoneInput: Processing new value from props:', value);
    lastProcessedValue.current = value || '';
    isProcessingExternalValue.current = true;

    if (value) {
      // البحث عن رمز الدولة في القيمة
      console.log('PhoneInput: Searching for country in value:', value);
      console.log('PhoneInput: Available countries:', arabCountries.map(c => ({ name: c.name, code: c.phoneCode })));

      const foundCountry = arabCountries.find(country =>
        value.startsWith(country.phoneCode)
      );

      if (foundCountry) {
        console.log('PhoneInput: Found country:', foundCountry.name, foundCountry.phoneCode);
        setSelectedCountry(foundCountry);
        const phoneWithoutCode = value.replace(foundCountry.phoneCode, '').trim();
        console.log('PhoneInput: Phone without code:', phoneWithoutCode);
        setPhoneNumber(phoneWithoutCode);
      } else {
        console.log('PhoneInput: No country found for value:', value);
        console.log('PhoneInput: Setting raw value');
        setPhoneNumber(value);
      }
    } else {
      console.log('PhoneInput: Empty value, clearing phone number');
      setPhoneNumber('');
    }

    // إعادة تعيين العلم في النهاية
    setTimeout(() => {
      isProcessingExternalValue.current = false;
    }, 0);
  }, [value]);

  // التحقق من صحة الرقم عند تغييره
  useEffect(() => {
    // إزالة الصفر من بداية الرقم في الخلفية (دون تغيير الواجهة)
    const cleanedPhoneNumber = phoneNumber.startsWith('0') ? phoneNumber.substring(1) : phoneNumber;

    const valid = phoneNumber ? validatePhoneNumber(cleanedPhoneNumber, selectedCountry.code) : false;
    setIsValid(valid);

    const fullNumber = phoneNumber ? `${selectedCountry.phoneCode}${cleanedPhoneNumber}` : '';

    console.log('PhoneInput: Validation effect - phoneNumber:', phoneNumber, 'cleanedPhoneNumber:', cleanedPhoneNumber, 'valid:', valid, 'fullNumber:', fullNumber, 'isProcessingExternal:', isProcessingExternalValue.current);

    // استدعاء onChange فقط إذا لم نكن نعالج قيمة خارجية
    if (!isProcessingExternalValue.current) {
      onChange(fullNumber, valid);
    } else {
      // إعادة تعيين العلم بعد المعالجة
      isProcessingExternalValue.current = false;
    }
  }, [phoneNumber, selectedCountry, onChange]);

  const handleCountrySelect = (country: ArabCountry) => {
    setSelectedCountry(country);
    setIsDropdownOpen(false);
    onCountryChange?.(country);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // السماح بالأرقام والمسافات والشرطات فقط
    const cleanValue = inputValue.replace(/[^\d\s\-]/g, '');
    setPhoneNumber(cleanValue);
  };

  const getInputClassName = () => {
    let baseClass = `w-full px-4 py-3 border rounded-xl focus:ring-2 transition-all duration-200 bg-white ${isRTL ? 'text-right' : 'text-left'}`;

    if (error) {
      baseClass += " border-red-300 focus:ring-red-500 focus:border-transparent";
    } else if (availabilityStatus === 'checking') {
      // أثناء التحقق - لون أزرق
      baseClass += " border-blue-300 focus:ring-blue-500 focus:border-transparent bg-blue-50/30";
    } else if (availabilityStatus === 'taken') {
      // الرقم مأخوذ - لون أحمر
      baseClass += " border-red-300 focus:ring-red-500 focus:border-transparent bg-red-50/30";
    } else if (!isValid && phoneNumber) {
      // الرقم غير صحيح - لون أصفر/برتقالي
      baseClass += " border-amber-300 focus:ring-amber-500 focus:border-transparent bg-amber-50/30";
    } else if (isValid && availabilityStatus === 'available') {
      // الرقم صحيح ومتاح - لون أخضر
      baseClass += " border-emerald-300 focus:ring-emerald-500 focus:border-transparent bg-emerald-50/30";
    } else if (isValid && phoneNumber) {
      // الرقم صحيح لكن لم يتم فحص التوفر - لون أزرق
      baseClass += " border-blue-300 focus:ring-blue-500 focus:border-transparent bg-blue-50/30";
    } else {
      // الحالة الافتراضية
      baseClass += " border-slate-300 hover:border-slate-400 focus:ring-primary-500 focus:border-transparent";
    }

    if (disabled) {
      baseClass += " bg-slate-50 text-slate-500 cursor-not-allowed";
    } else {
      baseClass += " hover:shadow-sm";
    }

    return baseClass;
  };

  return (
    <div className={`relative ${className}`}>
      {/* حقل الهاتف الموحد */}
      <div className="relative">
        {/* أيقونة الهاتف */}
        <Phone className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 z-10`} />

        {/* زر اختيار الدولة داخل الحقل */}
        <button
          type="button"
          onClick={() => !disabled && setIsDropdownOpen(!isDropdownOpen)}
          disabled={disabled}
          className={`absolute ${isRTL ? 'right-10' : 'left-10'} top-1/2 transform -translate-y-1/2 flex items-center gap-0.5 px-1 py-0.5 rounded-md transition-all duration-200 z-10 max-w-[72px] ${
            disabled ? 'cursor-not-allowed' : 'hover:bg-slate-100'
          }`}
        >
          <span className="text-xs">{selectedCountry.flag}</span>
          <span className={`text-xs font-medium text-slate-600 min-w-[32px] max-w-[32px] truncate ${isRTL ? 'text-right' : 'text-left'}`}>
            {selectedCountry.phoneCode}
          </span>
          <ChevronDown className={`w-2.5 h-2.5 text-slate-400 transition-transform flex-shrink-0 ${
            isDropdownOpen ? 'rotate-180' : ''
          }`} />
        </button>

        {/* حقل إدخال رقم الهاتف */}
        <input
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneChange}
          placeholder={placeholder}
          disabled={disabled}
          className={getInputClassName()}
          dir={isRTL ? 'rtl' : 'ltr'}
          style={isRTL ? { paddingRight: '115px' } : { paddingLeft: '115px' }} // مساحة لأيقونة الهاتف وزر الدولة
        />

        {/* أيقونة التحقق */}
        {phoneNumber && (
          <div className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 transform -translate-y-1/2 z-10`}>
            {availabilityStatus === 'checking' ? (
              // أيقونة التحميل أثناء التحقق
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            ) : availabilityStatus === 'taken' ? (
              // أيقونة الخطأ - الرقم مأخوذ
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            ) : !isValid ? (
              // أيقونة الخطأ - الرقم غير صحيح
              <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            ) : availabilityStatus === 'available' ? (
              // أيقونة النجاح - الرقم صحيح ومتاح
              <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            ) : (
              // أيقونة محايدة - الرقم صحيح لكن لم يتم فحص التوفر بعد
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
        )}

        {/* قائمة اختيار الدولة */}
        {isDropdownOpen && !disabled && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-xl shadow-lg z-[999999] max-h-60 overflow-y-auto">
            {arabCountries.map((country) => {
              const displayName = getDisplayCountryName(country);
              const subtext = getDisplaySubtext(country);

              return (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleCountrySelect(country)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  <span className="text-lg">{country.flag}</span>
                  <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="text-sm font-medium text-slate-800">{displayName}</div>
                    {subtext && (
                      <div className="text-xs text-slate-500">{subtext}</div>
                    )}
                  </div>
                  {country.phoneFormat && (
                    <div className="text-xs text-slate-400 font-mono">
                      {country.phoneFormat}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className={`text-red-500 text-sm mt-1 flex items-center gap-1 ${isRTL ? 'text-right' : 'text-left'}`}>
          <Phone className="w-4 h-4" />
          {error}
        </p>
      )}

      {/* Format Hint */}
      {selectedCountry.phoneFormat && !error && (
        <p className={`text-slate-500 text-xs mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
          {isRTL ? `تنسيق الرقم: ${selectedCountry.phoneCode} ${selectedCountry.phoneFormat}` : `Format: ${selectedCountry.phoneCode} ${selectedCountry.phoneFormat}`}
        </p>
      )}



      {/* Click outside to close dropdown */}
      {isDropdownOpen && (
        <div 
          className="fixed inset-0 z-[999998]"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
};

export default PhoneInput;
