import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface AdminStatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  onClick?: () => void;
  className?: string;
}

const AdminStatsCard: React.FC<AdminStatsCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-primary-600',
  iconBgColor = 'bg-primary-100',
  trend,
  onClick,
  className = ''
}) => {
  const isClickable = !!onClick;

  return (
    <div 
      className={`
        admin-card admin-transition p-6 rounded-xl
        ${isClickable ? 'admin-interactive cursor-pointer hover:shadow-lg' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        {/* المحتوى الرئيسي */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            {/* الأيقونة */}
            <div className={`admin-icon w-12 h-12 ${iconBgColor} rounded-lg flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${iconColor}`} />
            </div>
            
            {/* العنوان */}
            <div>
              <h3 className="text-sm font-medium text-slate-600 mb-1">{title}</h3>
              {subtitle && (
                <p className="text-xs text-slate-500">{subtitle}</p>
              )}
            </div>
          </div>

          {/* القيمة */}
          <div className="mb-3">
            <p className="text-3xl font-bold text-slate-800 mb-1">
              {typeof value === 'number' ? value.toLocaleString('ar-SA') : value}
            </p>
          </div>

          {/* الاتجاه */}
          {trend && (
            <div className="flex items-center gap-2">
              <div className={`
                flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                ${trend.isPositive 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
                }
              `}>
                <span className={`
                  w-0 h-0 border-l-[4px] border-r-[4px] border-l-transparent border-r-transparent
                  ${trend.isPositive 
                    ? 'border-b-[6px] border-b-green-600' 
                    : 'border-t-[6px] border-t-red-600'
                  }
                `} />
                <span>{Math.abs(trend.value)}%</span>
              </div>
              {trend.label && (
                <span className="text-xs text-slate-500">{trend.label}</span>
              )}
            </div>
          )}
        </div>

        {/* مؤشر القابلية للنقر */}
        {isClickable && (
          <div className="admin-transition opacity-0 group-hover:opacity-100">
            <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminStatsCard;
