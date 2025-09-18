import React from 'react';
import { countriesEnglish } from '../data/countriesEnglish';

interface SimpleCountryFlagProps {
  nationality?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const SimpleCountryFlag: React.FC<SimpleCountryFlagProps> = ({
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
    sm: 'w-6 h-6 text-lg',
    md: 'w-8 h-8 text-xl',
    lg: 'w-12 h-12 text-3xl'
  };

  // تحديد موقع العلم
  const positionClasses = {
    'top-right': 'top-0 right-0',
    'top-left': 'top-0 left-0',
    'bottom-right': 'bottom-0 right-0',
    'bottom-left': 'bottom-0 left-0'
  };

  // خريطة أعلام SVG المحلية
  const svgFlags: { [key: string]: string } = {
    'المملكة العربية السعودية': '/countries/saudi arabia.svg',
    'الإمارات العربية المتحدة': '/countries/united arab emirates.svg',
    'مصر': '/countries/egypt.svg',
    'الأردن': '/countries/jordan.svg',
    'الكويت': '/countries/kuwait.svg',
    'قطر': '/countries/qatar.svg',
    'عُمان': '/countries/oman.svg',
    'لبنان': '/countries/lebanon.svg',
    'سوريا': '/countries/syria.svg',
    'العراق': '/countries/iraq.svg',
    'اليمن': '/countries/yemen.svg',
    'تونس': '/countries/tunisia.svg',
    'السودان': '/countries/sudan.svg',
    'الصومال': '/countries/somalia.svg',
    'فلسطين': '/countries/palestine.svg',
    'جزر القمر': '/countries/comoros.svg',
    // الأسماء المختصرة والبديلة
    'سعودي': '/countries/saudi arabia.svg',
    'سعودية': '/countries/saudi arabia.svg',
    'egypt': '/countries/egypt.svg',
    'Jordan': '/countries/jordan.svg'
  };

  // خريطة احتياطية لرموز Unicode
  const fallbackFlags: { [key: string]: string } = {
    'المملكة العربية السعودية': '🇸🇦',
    'الإمارات العربية المتحدة': '🇦🇪',
    'مصر': '🇪🇬',
    'الأردن': '🇯🇴',
    'الكويت': '🇰🇼',
    'قطر': '🇶🇦',
    'البحرين': '🇧🇭',
    'عُمان': '🇴🇲',
    'لبنان': '🇱🇧',
    'سوريا': '🇸🇾',
    'العراق': '🇮🇶',
    'اليمن': '🇾🇪',
    'ليبيا': '🇱🇾',
    'تونس': '🇹🇳',
    'الجزائر': '🇩🇿',
    'المغرب': '🇲🇦',
    'السودان': '🇸🇩',
    'فلسطين': '🇵🇸',
    'سعودي': '🇸🇦',
    'سعودية': '🇸🇦',
    'egypt': '🇪🇬',
    'Jordan': '🇯🇴'
  };

  // الحصول على مسار علم SVG أو العلم الاحتياطي
  const svgFlagPath = svgFlags[nationality];
  const fallbackFlag = fallbackFlags[nationality] || country.flag || '🏳️';

  console.log('Flag Debug:', {
    nationality,
    svgFlagPath,
    fallbackFlag,
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
      {svgFlagPath ? (
        <img
          src={svgFlagPath}
          alt={`علم ${nationality}`}
          className="w-full h-full object-cover rounded-full"
          onError={(e) => {
            // في حالة فشل تحميل SVG، عرض emoji كبديل
            console.log(`فشل تحميل علم SVG ${nationality}, استخدام emoji كبديل`);
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              const fallbackSpan = document.createElement('span');
              fallbackSpan.className = 'leading-none select-none';
              fallbackSpan.style.fontSize = 'inherit';
              fallbackSpan.style.fontFamily = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Segoe UI Symbol", sans-serif';
              fallbackSpan.style.lineHeight = '1';
              fallbackSpan.textContent = fallbackFlag;
              parent.appendChild(fallbackSpan);
            }
          }}
        />
      ) : (
        <span
          className="leading-none select-none"
          style={{
            fontSize: 'inherit',
            fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Segoe UI Symbol", sans-serif',
            lineHeight: 1
          }}
        >
          {fallbackFlag}
        </span>
      )}
    </div>
  );
};

export default SimpleCountryFlag;
