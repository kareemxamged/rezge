import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ComponentType<any>;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
    period: string;
  };
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo';
  loading?: boolean;
  onClick?: () => void;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  change,
  color = 'blue',
  loading = false,
  onClick
}) => {
  const colorClasses = {
    blue: {
      bg: 'from-blue-500 to-blue-600',
      icon: 'text-blue-200',
      change: 'text-blue-100'
    },
    green: {
      bg: 'from-emerald-500 to-emerald-600',
      icon: 'text-emerald-200',
      change: 'text-emerald-100'
    },
    yellow: {
      bg: 'from-amber-500 to-amber-600',
      icon: 'text-amber-200',
      change: 'text-amber-100'
    },
    red: {
      bg: 'from-red-500 to-red-600',
      icon: 'text-red-200',
      change: 'text-red-100'
    },
    purple: {
      bg: 'from-purple-500 to-purple-600',
      icon: 'text-purple-200',
      change: 'text-purple-100'
    },
    indigo: {
      bg: 'from-indigo-500 to-indigo-600',
      icon: 'text-indigo-200',
      change: 'text-indigo-100'
    }
  };

  const getChangeIcon = () => {
    if (!change) return null;
    
    switch (change.type) {
      case 'increase':
        return <TrendingUp className="w-4 h-4" />;
      case 'decrease':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val;
    
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(1)}م`;
    } else if (val >= 1000) {
      return `${(val / 1000).toFixed(1)}ك`;
    }
    return val.toLocaleString('ar-SA');
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl bg-gradient-to-br ${colorClasses[color].bg}
        p-6 text-white shadow-lg transition-all duration-300 hover:shadow-xl
        ${onClick ? 'cursor-pointer hover:scale-105' : ''}
      `}
      onClick={onClick}
    >
      {/* خلفية زخرفية */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white"></div>
        <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white"></div>
      </div>

      {/* المحتوى */}
      <div className="relative">
        {/* الهيدر */}
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl bg-white/20 backdrop-blur-sm`}>
            <Icon className={`w-6 h-6 ${colorClasses[color].icon}`} />
          </div>
          
          {change && (
            <div className={`flex items-center gap-1 text-sm ${colorClasses[color].change}`}>
              {getChangeIcon()}
              <span className="font-medium">
                {change.value > 0 ? '+' : ''}{change.value}%
              </span>
            </div>
          )}
        </div>

        {/* القيمة */}
        <div className="mb-2">
          {loading ? (
            <div className="animate-pulse">
              <div className="h-8 bg-white/20 rounded w-24 mb-2"></div>
              <div className="h-4 bg-white/20 rounded w-32"></div>
            </div>
          ) : (
            <>
              <h3 className="text-3xl font-bold mb-1">
                {formatValue(value)}
              </h3>
              <p className={`text-sm ${colorClasses[color].change} font-medium`}>
                {title}
              </p>
            </>
          )}
        </div>

        {/* فترة التغيير */}
        {change && !loading && (
          <div className={`text-xs ${colorClasses[color].change} opacity-80`}>
            {change.period}
          </div>
        )}
      </div>

      {/* مؤشر التحميل */}
      {loading && (
        <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default StatsCard;
