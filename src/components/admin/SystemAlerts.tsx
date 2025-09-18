import React from 'react';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  X,
  ExternalLink,
  Bell
} from 'lucide-react';
import type { SystemAlert } from '../../lib/adminDashboardService';

interface SystemAlertsProps {
  alerts: SystemAlert[];
  loading?: boolean;
  onDismiss?: (alertId: string) => void;
  onAction?: (alert: SystemAlert) => void;
}

const SystemAlerts: React.FC<SystemAlertsProps> = ({
  alerts,
  loading = false,
  onDismiss,
  onAction
}) => {
  const getAlertIcon = (type: SystemAlert['type']) => {
    switch (type) {
      case 'error':
        return AlertCircle;
      case 'warning':
        return AlertTriangle;
      case 'success':
        return CheckCircle;
      case 'info':
      default:
        return Info;
    }
  };

  const getAlertStyles = (type: SystemAlert['type'], priority: SystemAlert['priority']) => {
    const baseStyles = "border-l-4 rounded-lg p-4 transition-all duration-200";
    
    const typeStyles = {
      error: "bg-red-50 border-red-400 text-red-800",
      warning: "bg-amber-50 border-amber-400 text-amber-800",
      success: "bg-green-50 border-green-400 text-green-800",
      info: "bg-blue-50 border-blue-400 text-blue-800"
    };

    const priorityStyles = {
      critical: "ring-2 ring-red-200 shadow-lg",
      high: "ring-1 ring-amber-200 shadow-md",
      medium: "shadow-sm",
      low: "shadow-sm opacity-90"
    };

    return `${baseStyles} ${typeStyles[type]} ${priorityStyles[priority]}`;
  };

  const getIconColor = (type: SystemAlert['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-500';
      case 'warning':
        return 'text-amber-500';
      case 'success':
        return 'text-green-500';
      case 'info':
      default:
        return 'text-blue-500';
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'الآن';
    if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;
    
    return date.toLocaleDateString('ar-SA');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-800">تنبيهات النظام</h3>
        </div>
        
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="border-l-4 border-slate-200 rounded-lg p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-slate-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
      {/* الهيدر */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-800">تنبيهات النظام</h3>
          {alerts.length > 0 && (
            <span className="bg-red-100 text-red-600 text-xs font-medium px-2 py-1 rounded-full">
              {alerts.length}
            </span>
          )}
        </div>
      </div>

      {/* قائمة التنبيهات */}
      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
            <p className="font-medium text-green-600">لا توجد تنبيهات</p>
            <p className="text-sm text-slate-500 mt-1">النظام يعمل بشكل طبيعي</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const Icon = getAlertIcon(alert.type);
            const iconColor = getIconColor(alert.type);
            
            return (
              <div
                key={alert.id}
                className={getAlertStyles(alert.type, alert.priority)}
              >
                <div className="flex items-start gap-3">
                  {/* أيقونة التنبيه */}
                  <Icon className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />

                  {/* محتوى التنبيه */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">
                          {alert.title}
                        </h4>
                        <p className="text-sm opacity-90 leading-relaxed">
                          {alert.message}
                        </p>
                        
                        {/* الوقت والأولوية */}
                        <div className="flex items-center gap-3 mt-2 text-xs opacity-75">
                          <span>{formatTimestamp(alert.timestamp)}</span>
                          <span className="px-2 py-1 bg-black/10 rounded">
                            {alert.priority === 'critical' && 'حرج'}
                            {alert.priority === 'high' && 'عالي'}
                            {alert.priority === 'medium' && 'متوسط'}
                            {alert.priority === 'low' && 'منخفض'}
                          </span>
                        </div>
                      </div>

                      {/* زر الإغلاق */}
                      {onDismiss && (
                        <button
                          onClick={() => onDismiss(alert.id)}
                          className="p-1 hover:bg-black/10 rounded transition-colors"
                          title="إغلاق التنبيه"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* زر الإجراء */}
                    {alert.action && (
                      <div className="mt-3 pt-3 border-t border-black/10">
                        <button
                          onClick={() => onAction?.(alert)}
                          className="flex items-center gap-2 text-sm font-medium hover:underline transition-all"
                        >
                          {alert.action.label}
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* إحصائيات سريعة */}
      {alerts.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-200">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-red-600">
                {alerts.filter(a => a.priority === 'critical').length}
              </div>
              <div className="text-xs text-slate-500">حرج</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-amber-600">
                {alerts.filter(a => a.priority === 'high').length}
              </div>
              <div className="text-xs text-slate-500">عالي</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-600">
                {alerts.filter(a => a.priority === 'medium').length}
              </div>
              <div className="text-xs text-slate-500">متوسط</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-600">
                {alerts.filter(a => a.priority === 'low').length}
              </div>
              <div className="text-xs text-slate-500">منخفض</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemAlerts;
