import React from 'react';
import { 
  UserPlus, 
  FileText, 
  AlertTriangle, 
  Shield, 
  LogIn,
  Clock,
  ExternalLink
} from 'lucide-react';
import type { RecentActivity } from '../../lib/adminDashboardService';

interface RecentActivitiesProps {
  activities: RecentActivity[];
  loading?: boolean;
  onViewAll?: () => void;
}

const RecentActivities: React.FC<RecentActivitiesProps> = ({
  activities,
  loading = false,
  onViewAll
}) => {
  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'user_registration':
        return UserPlus;
      case 'article_published':
        return FileText;
      case 'user_reported':
        return AlertTriangle;
      case 'admin_login':
        return LogIn;
      case 'security_event':
        return Shield;
      default:
        return Clock;
    }
  };

  const getActivityColor = (severity?: RecentActivity['severity']) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'الآن';
    if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `منذ ${diffInDays} يوم`;
    
    return activityTime.toLocaleDateString('ar-SA');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-800">الأنشطة الأخيرة</h3>
          <div className="w-20 h-4 bg-slate-200 rounded animate-pulse"></div>
        </div>
        
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-start gap-4 animate-pulse">
              <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </div>
              <div className="w-16 h-3 bg-slate-200 rounded"></div>
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
        <h3 className="text-lg font-semibold text-slate-800">الأنشطة الأخيرة</h3>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 transition-colors"
          >
            عرض الكل
            <ExternalLink className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* قائمة الأنشطة */}
      <div className="space-y-4">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لا توجد أنشطة حديثة</p>
          </div>
        ) : (
          activities.map((activity) => {
            const Icon = getActivityIcon(activity.type);
            const colorClass = getActivityColor(activity.severity);
            
            return (
              <div
                key={activity.id}
                className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors"
              >
                {/* أيقونة النشاط */}
                <div className={`p-2 rounded-full border ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>

                {/* تفاصيل النشاط */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-slate-800 mb-1">
                        {activity.title}
                      </h4>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {activity.description}
                      </p>
                      
                      {/* معلومات المستخدم */}
                      {activity.user && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-primary-600">
                              {activity.user.name.charAt(0)}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">
                            {activity.user.name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* الوقت */}
                    <div className="text-xs text-slate-400 whitespace-nowrap">
                      {formatTimeAgo(activity.timestamp)}
                    </div>
                  </div>

                  {/* معلومات إضافية للأحداث الأمنية */}
                  {activity.type === 'security_event' && activity.metadata && (
                    <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-600">
                      <strong>تفاصيل:</strong> {JSON.stringify(activity.metadata, null, 2)}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* رابط عرض المزيد */}
      {activities.length > 0 && onViewAll && (
        <div className="mt-6 pt-4 border-t border-slate-200">
          <button
            onClick={onViewAll}
            className="w-full text-center text-sm text-slate-600 hover:text-slate-800 transition-colors"
          >
            عرض جميع الأنشطة
          </button>
        </div>
      )}
    </div>
  );
};

export default RecentActivities;
