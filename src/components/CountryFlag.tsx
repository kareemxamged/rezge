import React from 'react';
import { countriesEnglish } from '../data/countriesEnglish';

interface CountryFlagProps {
  nationality?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const CountryFlag: React.FC<CountryFlagProps> = ({
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

  // التحقق من وجود العلم وأنه ليس مجرد نص
  const flagEmoji = country.flag;
  const isValidFlag = flagEmoji && flagEmoji.length > 1 && /[\u{1F1E6}-\u{1F1FF}]/u.test(flagEmoji);

  // إذا لم يكن العلم صالحاً، استخدم أيقونة بديلة
  const displayFlag = isValidFlag ? flagEmoji : '🏳️';

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
        ${className}
      `}
      title={showTooltip ? `${country.nameAr} - ${country.nameEn}` : undefined}
    >
      <span
        className="leading-none select-none drop-shadow-sm"
        style={{
          fontSize: 'inherit',
          fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'
        }}
      >
        {displayFlag}
      </span>
    </div>
  );
};

export default CountryFlag;
