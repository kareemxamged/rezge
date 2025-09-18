import React, { useState, useEffect } from 'react';
import { 
  Users, 
  FileText, 
  MessageSquare, 
  Shield,

  Activity,
  AlertTriangle,
  Settings,
  RefreshCw,
  Eye,
  UserPlus,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard
} from 'lucide-react';
import { useSeparateAdmin } from './SeparateAdminProvider';
import { adminDashboardService } from '../../lib/adminDashboardService';
import type { DashboardStats, RecentActivity, SystemAlert } from '../../lib/adminDashboardService';
import ModernAdminContainer from './ModernAdminContainer';

const ModernAdminDashboard: React.FC = () => {
  const { adminAccount } = useSeparateAdmin();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // تحميل البيانات
  const loadDashboardData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);

      const [statsData, activitiesData, alertsData] = await Promise.all([
        adminDashboardService.getDashboardStats(),
        adminDashboardService.getRecentActivities(10),
        adminDashboardService.getSystemAlerts()
      ]);

      setStats(statsData);
      setActivities(activitiesData);
      setAlerts(alertsData);

      // تسجيل النشاط - يمكن إضافة نظام تسجيل للنظام الإداري المنفصل لاحقاً
      console.log('Dashboard viewed by admin:', adminAccount?.username);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleRefresh = () => {
    loadDashboardData(true);
  };

  const statsCards = [
    {
      id: 'users',
      title: 'إجمالي المستخدمين',
      value: stats?.totalUsers || 0,
      subtitle: 'المستخدمين المسجلين',
      icon: Users,
      color: 'blue',
      trend: { value: 12, isPositive: true, label: 'هذا الشهر' },
      path: '/admin/users'
    },
    {
      id: 'articles',
      title: 'المقالات المنشورة',
      value: stats?.publishedArticles || 0,
      subtitle: 'المحتوى المتاح',
      icon: FileText,
      color: 'green',
      trend: { value: 8, isPositive: true, label: 'هذا الأسبوع' },
      path: '/admin/articles'
    },
    {
      id: 'subscriptions',
      title: 'الاشتراكات النشطة',
      value: stats?.activeSubscriptions || 0,
      subtitle: 'المشتركون الحاليون',
      icon: CreditCard,
      color: 'emerald',
      trend: { value: 18, isPositive: true, label: 'هذا الشهر' },
      path: '/admin/subscriptions'
    },
    {
      id: 'messages',
      title: 'الرسائل النشطة',
      value: stats?.totalMessages || 0,
      subtitle: 'المحادثات الجارية',
      icon: MessageSquare,
      color: 'amber',
      trend: { value: 5, isPositive: true, label: 'اليوم' },
      path: '/admin/messages'
    },
    {
      id: 'security',
      title: 'أحداث الأمان',
      value: stats?.securityEvents || 0,
      subtitle: 'التنبيهات الأمنية',
      icon: Shield,
      color: 'red',
      trend: { value: 15, isPositive: false, label: 'هذا الأسبوع' },
      path: '/admin/security'
    }
  ];

  const quickStats = [
    {
      title: 'مستخدمون جدد اليوم',
      value: stats?.newUsersToday || 0,
      icon: UserPlus,
      color: 'indigo'
    },
    {
      title: 'المستخدمون النشطون',
      value: stats?.activeUsers || 0,
      icon: Activity,
      color: 'purple'
    },
    {
      title: 'الفترات التجريبية النشطة',
      value: stats?.activeTrials || 0,
      icon: Clock,
      color: 'orange'
    },
    {
      title: 'إجمالي الإيرادات الشهرية',
      value: `${stats?.monthlyRevenue || 0} ر.س`,
      icon: CreditCard,
      color: 'emerald'
    }
  ];

  return (
    <ModernAdminContainer maxWidth="2xl" padding="lg">
      <div className="modern-dashboard">
        {/* رأس لوحة التحكم */}
        <div className="dashboard-header">
          <div className="header-content">
          <div className="header-info">
            <h1 className="dashboard-title">لوحة التحكم الإدارية</h1>
            <p className="dashboard-subtitle">
              مرحباً {adminAccount?.first_name && adminAccount?.last_name
                ? `${adminAccount.first_name} ${adminAccount.last_name}`
                : adminAccount?.email || 'المشرف'
              } - نظرة شاملة على حالة النظام
            </p>
          </div>
          <div className="header-actions">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="modern-btn modern-btn-primary"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              تحديث البيانات
            </button>
          </div>
        </div>
      </div>

      {/* الإحصائيات الرئيسية */}
      <div className="stats-section">
        <div className="modern-grid modern-grid-4">
          {statsCards.map((card) => (
            <div
              key={card.id}
              className="modern-stats-card"
              onClick={() => window.location.href = card.path}
            >
              <div className={`icon-container bg-${card.color}-100`}>
                <card.icon className={`w-6 h-6 text-${card.color}-600`} />
              </div>
              <div className="value">{card.value.toLocaleString('ar-SA')}</div>
              <div className="title">{card.title}</div>
              <div className="subtitle">{card.subtitle}</div>
              {card.trend && (
                <div className={`trend ${card.trend.isPositive ? 'positive' : 'negative'}`}>
                  {card.trend.isPositive ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  <span>{card.trend.value}%</span>
                  <span className="trend-label">{card.trend.label}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* الإحصائيات السريعة */}
      <div className="quick-stats-section">
        <div className="modern-grid modern-grid-4">
          {quickStats.map((stat, index) => (
            <div key={index} className="quick-stat-card">
              <div className={`stat-icon bg-${stat.color}-100`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{stat.value.toLocaleString('ar-SA')}</div>
                <div className="stat-title">{stat.title}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="main-content-grid">
        {/* الأنشطة الأخيرة */}
        <div className="content-card activities-card">
          <div className="card-header">
            <h3>الأنشطة الأخيرة</h3>
            <button className="view-all-btn">
              <Eye className="w-4 h-4" />
              عرض الكل
            </button>
          </div>
          <div className="activities-list">
            {activities.slice(0, 6).map((activity, index) => (
              <div key={index} className="activity-item">
                <div className="activity-icon">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="activity-content">
                  <p className="activity-description">{activity.description}</p>
                  <span className="activity-time">{activity.timestamp}</span>
                </div>
                <div className="activity-status">
                  {activity.severity === 'low' || activity.severity === 'medium' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* التنبيهات */}
        <div className="content-card alerts-card">
          <div className="card-header">
            <h3>التنبيهات</h3>
            <span className="alerts-count">{alerts.length} تنبيه</span>
          </div>
          <div className="alerts-list">
            {alerts.slice(0, 5).map((alert, index) => (
              <div key={index} className={`alert-item ${alert.type}`}>
                <div className="alert-icon">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="alert-content">
                  <p className="alert-title">{alert.title}</p>
                  <p className="alert-message">{alert.message}</p>
                </div>
                <div className="alert-time">
                  <Clock className="w-3 h-3" />
                  <span>{alert.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* معلومات النظام */}
      <div className="system-info-section">
        <div className="modern-card">
          <div className="modern-card-header">
            <h3>معلومات النظام</h3>
          </div>
          <div className="modern-card-body">
            <div className="system-stats-grid">
              <div className="system-stat">
                <div className="stat-label">وقت التشغيل</div>
                <div className="stat-value text-green-600">{stats?.systemUptime || 'غير متوفر'}</div>
              </div>
              <div className="system-stat">
                <div className="stat-label">آخر نسخة احتياطية</div>
                <div className="stat-value text-blue-600">{stats?.lastBackup || 'غير متوفر'}</div>
              </div>
              <div className="system-stat">
                <div className="stat-label">تصنيفات المحتوى</div>
                <div className="stat-value text-purple-600">{stats?.totalCategories || 0}</div>
              </div>
              <div className="system-stat">
                <div className="stat-label">مستخدمون محققون</div>
                <div className="stat-value text-amber-600">{stats?.verifiedUsers || 0}</div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </ModernAdminContainer>
  );
};

export default ModernAdminDashboard;
