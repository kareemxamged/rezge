import React from 'react';
import { countriesEnglish } from '../data/countriesEnglish';

interface CountryFlagImageProps {
  nationality?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const CountryFlagImage: React.FC<CountryFlagImageProps> = ({
  nationality,
  size = 'md',
  className = '',
  showTooltip = true,
  position = 'top-right'
}) => {
  // البحث عن الدولة في قائمة الدول
  const country = countriesEnglish.find(c => c.nameAr === nationality);
  
  // إذا لم توجد الدولة، لا نعرض شيئاً
  if (!country || !nationality) {
    return null;
  }

  // تحديد أحجام العلم
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  // تحديد موقع العلم
  const positionClasses = {
    'top-right': 'top-0 right-0',
    'top-left': 'top-0 left-0',
    'bottom-right': 'bottom-0 right-0',
    'bottom-left': 'bottom-0 left-0'
  };

  // خريطة الأعلام المحلية بصيغة SVG
  const localFlagPaths: { [key: string]: string } = {
    'SA': '/countries/saudi arabia.svg', // السعودية
    'AE': '/countries/united arab emirates.svg', // الإمارات
    'EG': '/countries/egypt.svg', // مصر
    'JO': '/countries/jordan.svg', // الأردن
    'KW': '/countries/kuwait.svg', // الكويت
    'QA': '/countries/qatar.svg', // قطر
    'OM': '/countries/oman.svg', // عُمان
    'LB': '/countries/lebanon.svg', // لبنان
    'SY': '/countries/syria.svg', // سوريا
    'IQ': '/countries/iraq.svg', // العراق
    'YE': '/countries/yemen.svg', // اليمن
    'TN': '/countries/tunisia.svg', // تونس
    'SD': '/countries/sudan.svg', // السودان
    'SO': '/countries/somalia.svg', // الصومال
    'PS': '/countries/palestine.svg', // فلسطين
    'KM': '/countries/comoros.svg', // جزر القمر
  };

  // خريطة الجنسيات إلى رموز الدول
  const nationalityToCode: { [key: string]: string } = {
    'المملكة العربية السعودية': 'SA',
    'الإمارات العربية المتحدة': 'AE',
    'مصر': 'EG',
    'الأردن': 'JO',
    'الكويت': 'KW',
    'قطر': 'QA',
    'عُمان': 'OM',
    'لبنان': 'LB',
    'سوريا': 'SY',
    'العراق': 'IQ',
    'اليمن': 'YE',
    'تونس': 'TN',
    'السودان': 'SD',
    'الصومال': 'SO',
    'فلسطين': 'PS',
    'جزر القمر': 'KM'
  };

  // الحصول على مسار العلم المحلي
  const countryCode = nationalityToCode[nationality] || country.code;
  const flagUrl = localFlagPaths[countryCode];

  console.log('Flag Debug:', {
    nationality,
    countryCode,
    flagUrl,
    countryFound: !!country
  });

  return (
    <div 
      className={`
        absolute ${positionClasses[position]} 
        ${sizeClasses[size]} 
        bg-white rounded-full 
        flex items-center justify-center 
        shadow-lg border-2 border-white
        transform translate-x-1 -translate-y-1
        hover:scale-110 transition-all duration-200
        hover:shadow-xl
        cursor-pointer
        z-10
        overflow-hidden
        ${className}
      `}
      title={showTooltip ? `${country.nameAr} - ${country.nameEn}` : undefined}
    >
      {flagUrl ? (
        <img 
          src={flagUrl}
          alt={`علم ${country.nameAr}`}
          className="w-full h-full object-cover rounded-full"
          onError={(e) => {
            // في حالة فشل تحميل الصورة SVG، عرض emoji كبديل
            console.log(`فشل تحميل علم SVG ${country.nameAr}, استخدام emoji كبديل`);
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = `<span style="font-size: inherit; font-family: Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif;">${country.flag || '🏳️'}</span>`;
            }
          }}
        />
      ) : (
        <span 
          className="leading-none select-none drop-shadow-sm"
          style={{ 
            fontSize: 'inherit',
            fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'
          }}
        >
          {country.flag || '🏳️'}
        </span>
      )}
    </div>
  );
};

export default CountryFlagImage;
