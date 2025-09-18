import React, { useState } from 'react';
import { Clock, CheckCircle } from 'lucide-react';

interface VerificationBadgeProps {
  isVerified: boolean;
  isPending?: boolean;
  showPendingInPrivate?: boolean; // لإظهار حالة الانتظار في الملف الشخصي الخاص فقط
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  isVerified,
  isPending = false,
  showPendingInPrivate = false,
  size = 'md',
  className = ''
}) => {
  const [imageError, setImageError] = useState(false);
  // إذا كان الحساب موثق، أظهر علامة التوثيق
  if (isVerified) {
    const sizeClasses = {
      sm: 'w-5 h-5',   // زيادة أكثر للوضوح
      md: 'w-6 h-6',   // زيادة أكثر للبروز
      lg: 'w-7 h-7'    // زيادة أكثر للظهور
    };

    return (
      <div
        className={`inline-flex items-center justify-center ${className}`}
        title="حساب موثق"
      >
        {!imageError ? (
          <img
            src="/verified.svg"
            alt="حساب موثق"
            className={`${sizeClasses[size]} flex-shrink-0`}
            style={{
              filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.5)) drop-shadow(0 0 8px rgba(59, 130, 246, 0.3))'
            }}
            onError={() => setImageError(true)}
          />
        ) : (
          // Fallback إذا فشل تحميل الصورة
          <CheckCircle
            className={`${sizeClasses[size]} text-blue-500 fill-current flex-shrink-0`}
            style={{ filter: 'drop-shadow(0 0 2px rgba(59, 130, 246, 0.5))' }}
          />
        )}
      </div>
    );
  }

  // إذا كان هناك طلب توثيق معلق وهذا في الملف الشخصي الخاص
  if (isPending && showPendingInPrivate) {
    const sizeClasses = {
      sm: 'w-5 h-5',   // زيادة أكثر للوضوح
      md: 'w-6 h-6',   // زيادة أكثر للبروز
      lg: 'w-7 h-7'    // زيادة أكثر للظهور
    };

    return (
      <div 
        className={`inline-flex items-center justify-center ${className}`}
        title="طلب التوثيق قيد المراجعة"
      >
        <Clock 
          className={`${sizeClasses[size]} text-amber-500 animate-pulse`}
          style={{ filter: 'drop-shadow(0 0 2px rgba(245, 158, 11, 0.5))' }}
        />
      </div>
    );
  }

  // لا تظهر أي شيء إذا لم يكن موثق أو معلق
  return null;
};

export default VerificationBadge;
