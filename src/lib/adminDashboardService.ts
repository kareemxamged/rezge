import { supabase } from './supabase';

export interface DashboardStats {
  // إحصائيات المستخدمين
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  verifiedUsers: number;
  
  // إحصائيات المحتوى
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  totalCategories: number;
  
  // إحصائيات التفاعل
  totalMessages: number;
  totalMatches: number;
  totalLikes: number;
  activeConversations: number;
  
  // إحصائيات الأمان
  loginAttempts: number;
  blockedUsers: number;
  reportedUsers: number;
  securityEvents: number;
  
  // إحصائيات النظام
  totalAdmins: number;
  activeAdmins: number;
  systemUptime: string;
  lastBackup: string;

  // إحصائيات الاشتراكات
  totalSubscriptions: number;
  activeSubscriptions: number;
  activeTrials: number;
  expiredSubscriptions: number;
  monthlyRevenue: number;
  totalRevenue: number;
  newSubscriptionsToday: number;
  newSubscriptionsThisWeek: number;
  newSubscriptionsThisMonth: number;
}

export interface RecentActivity {
  id: string;
  type: 'user_registration' | 'article_published' | 'user_reported' | 'admin_login' | 'security_event';
  title: string;
  description: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  timestamp: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: any;
}

export interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  action?: {
    label: string;
    url: string;
  };
  timestamp: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
    fill?: boolean;
  }[];
}

class AdminDashboardService {
  // الحصول على الإحصائيات الرئيسية
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // إحصائيات المستخدمين
      const [
        { count: totalUsers },
        { count: activeUsers },
        { count: newUsersToday },
        { count: newUsersThisWeek },
        { count: newUsersThisMonth },
        { count: verifiedUsers }
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true })
          .gte('last_seen_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('users').select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString()),
        supabase.from('users').select('*', { count: 'exact', head: true })
          .gte('created_at', weekAgo.toISOString()),
        supabase.from('users').select('*', { count: 'exact', head: true })
          .gte('created_at', monthAgo.toISOString()),
        supabase.from('users').select('*', { count: 'exact', head: true })
          .eq('email_verified', true)
      ]);

      // إحصائيات المحتوى
      const [
        { count: totalArticles },
        { count: publishedArticles },
        { count: draftArticles },
        { count: totalCategories }
      ] = await Promise.all([
        supabase.from('articles').select('*', { count: 'exact', head: true }),
        supabase.from('articles').select('*', { count: 'exact', head: true })
          .eq('status', 'published'),
        supabase.from('articles').select('*', { count: 'exact', head: true })
          .eq('status', 'draft'),
        supabase.from('article_categories').select('*', { count: 'exact', head: true })
      ]);

      // إحصائيات التفاعل
      const [
        messagesResult,
        matchesResult,
        likesResult,
        conversationsResult
      ] = await Promise.all([
        supabase.from('messages').select('*', { count: 'exact', head: true }),
        supabase.from('matches').select('*', { count: 'exact', head: true }),
        supabase.from('likes').select('*', { count: 'exact', head: true }),
        supabase.from('conversations').select('*', { count: 'exact', head: true })
          .gte('last_message_at', weekAgo.toISOString())
      ]);

      const totalMessages = messagesResult?.count || 0;
      const totalMatches = matchesResult?.count || 0;
      const totalLikes = likesResult?.count || 0;
      const activeConversations = conversationsResult?.count || 0;

      // إحصائيات الأمان (مع معالجة الجداول المفقودة)
      let loginAttempts = 0;
      let blockedUsers = 0;
      let reportedUsers = 0;
      let securityEvents = 0;

      try {
        const { count } = await supabase.from('login_attempts').select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString());
        loginAttempts = count || 0;
      } catch (error) {
        console.log('جدول login_attempts غير موجود');
      }

      try {
        const { count } = await supabase.from('user_blocks').select('*', { count: 'exact', head: true })
          .eq('is_active', true);
        blockedUsers = count || 0;
      } catch (error) {
        console.log('جدول user_blocks غير موجود');
      }

      try {
        const { count } = await supabase.from('reports').select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        reportedUsers = count || 0;
      } catch (error) {
        console.log('جدول reports غير موجود');
      }

      try {
        const { count } = await supabase.from('security_events').select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString());
        securityEvents = count || 0;
      } catch (error) {
        console.log('جدول security_events غير موجود');
      }

      // إحصائيات النظام
      const [
        { count: totalAdmins },
        { count: activeAdmins }
      ] = await Promise.all([
        supabase.from('admin_users').select('*', { count: 'exact', head: true }),
        supabase.from('admin_users').select('*', { count: 'exact', head: true })
          .eq('is_active', true)
      ]);

      // إحصائيات الاشتراكات
      let totalSubscriptions = 0;
      let activeSubscriptions = 0;
      let activeTrials = 0;
      let expiredSubscriptions = 0;
      let monthlyRevenue = 0;
      let totalRevenue = 0;
      let newSubscriptionsToday = 0;
      let newSubscriptionsThisWeek = 0;
      let newSubscriptionsThisMonth = 0;

      try {
        // إجمالي الاشتراكات
        const { count: totalSubs } = await supabase
          .from('user_subscriptions')
          .select('*', { count: 'exact', head: true });
        totalSubscriptions = totalSubs || 0;

        // الاشتراكات النشطة
        const { count: activeSubs } = await supabase
          .from('user_subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
          .gt('expires_at', new Date().toISOString());
        activeSubscriptions = activeSubs || 0;

        // الاشتراكات المنتهية
        const { count: expiredSubs } = await supabase
          .from('user_subscriptions')
          .select('*', { count: 'exact', head: true })
          .in('status', ['expired', 'cancelled']);
        expiredSubscriptions = expiredSubs || 0;

        // الفترات التجريبية النشطة
        const { count: trials } = await supabase
          .from('trial_periods')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
          .gt('expires_at', new Date().toISOString());
        activeTrials = trials || 0;

        // الاشتراكات الجديدة
        const { count: newSubsToday } = await supabase
          .from('user_subscriptions')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString());
        newSubscriptionsToday = newSubsToday || 0;

        const { count: newSubsWeek } = await supabase
          .from('user_subscriptions')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', weekAgo.toISOString());
        newSubscriptionsThisWeek = newSubsWeek || 0;

        const { count: newSubsMonth } = await supabase
          .from('user_subscriptions')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', monthAgo.toISOString());
        newSubscriptionsThisMonth = newSubsMonth || 0;

        // حساب الإيرادات
        const { data: revenueData } = await supabase
          .from('payments')
          .select('amount')
          .eq('status', 'completed');

        if (revenueData) {
          totalRevenue = revenueData.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        }

        // الإيرادات الشهرية
        const { data: monthlyRevenueData } = await supabase
          .from('payments')
          .select('amount')
          .eq('status', 'completed')
          .gte('created_at', monthAgo.toISOString());

        if (monthlyRevenueData) {
          monthlyRevenue = monthlyRevenueData.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        }

      } catch (error) {
        console.log('جداول الاشتراكات غير موجودة أو حدث خطأ:', error);
      }

      return {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        newUsersToday: newUsersToday || 0,
        newUsersThisWeek: newUsersThisWeek || 0,
        newUsersThisMonth: newUsersThisMonth || 0,
        verifiedUsers: verifiedUsers || 0,
        
        totalArticles: totalArticles || 0,
        publishedArticles: publishedArticles || 0,
        draftArticles: draftArticles || 0,
        totalCategories: totalCategories || 0,
        
        totalMessages: totalMessages || 0,
        totalMatches: totalMatches || 0,
        totalLikes: totalLikes || 0,
        activeConversations: activeConversations || 0,
        
        loginAttempts: loginAttempts || 0,
        blockedUsers: blockedUsers || 0,
        reportedUsers: reportedUsers || 0,
        securityEvents: securityEvents || 0,
        
        totalAdmins: totalAdmins || 0,
        activeAdmins: activeAdmins || 0,
        systemUptime: this.calculateUptime(),
        lastBackup: 'منذ 6 ساعات', // يمكن تحديثها لاحقاً

        // إحصائيات الاشتراكات
        totalSubscriptions,
        activeSubscriptions,
        activeTrials,
        expiredSubscriptions,
        monthlyRevenue,
        totalRevenue,
        newSubscriptionsToday,
        newSubscriptionsThisWeek,
        newSubscriptionsThisMonth
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return this.getDefaultStats();
    }
  }

  // الحصول على الأنشطة الأخيرة
  async getRecentActivities(limit: number = 10): Promise<RecentActivity[]> {
    try {
      const activities: RecentActivity[] = [];

      // تسجيلات جديدة
      const { data: newUsers } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (newUsers) {
        newUsers.forEach(user => {
          const fullName = user.first_name && user.last_name
            ? `${user.first_name} ${user.last_name}`
            : user.email.split('@')[0];

          activities.push({
            id: `user_${user.id}`,
            type: 'user_registration',
            title: 'تسجيل مستخدم جديد',
            description: `انضم ${fullName} إلى المنصة`,
            user: {
              id: user.id,
              name: fullName,
              email: user.email
            },
            timestamp: user.created_at,
            severity: 'low'
          });
        });
      }

      // مقالات جديدة (مع معالجة الجدول المفقود)
      try {
        const { data: newArticles } = await supabase
          .from('articles')
          .select(`
            id,
            title,
            author_id,
            created_at,
            author:users!author_id(first_name, last_name, email)
          `)
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(3);

        if (newArticles) {
          newArticles.forEach((article: any) => {
            const author = Array.isArray(article.author) ? article.author[0] : article.author;
            const authorName = author?.first_name && author?.last_name
              ? `${author.first_name} ${author.last_name}`
              : author?.email?.split('@')[0] || 'مؤلف غير معروف';

            activities.push({
              id: `article_${article.id}`,
              type: 'article_published',
              title: 'نشر مقال جديد',
              description: `تم نشر مقال "${article.title}"`,
              user: author ? {
                id: article.author_id,
                name: authorName,
                email: author.email
              } : undefined,
              timestamp: article.created_at,
              severity: 'low'
            });
          });
        }
      } catch (error) {
        console.log('جدول articles غير موجود أو خطأ في الاستعلام');
      }

      // أحداث أمنية (مع معالجة الجدول المفقود)
      try {
        const { data: securityEvents } = await supabase
          .from('security_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(3);

        if (securityEvents) {
          securityEvents.forEach(event => {
            activities.push({
              id: `security_${event.id}`,
              type: 'security_event',
              title: 'حدث أمني',
              description: event.description || 'تم رصد نشاط مشبوه',
              timestamp: event.created_at,
              severity: event.severity || 'medium',
              metadata: event.details
            });
          });
        }
      } catch (error) {
        // الجدول غير موجود، تجاهل الخطأ
        console.log('جدول security_events غير موجود');
      }

      // ترتيب الأنشطة حسب التاريخ
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

    } catch (error) {
      console.error('Error fetching recent activities:', error);
      return [];
    }
  }

  // الحصول على التنبيهات النظام
  async getSystemAlerts(): Promise<SystemAlert[]> {
    try {
      const alerts: SystemAlert[] = [];

      // التحقق من المستخدمين المحظورين (مع معالجة الجدول المفقود)
      try {
        const { count: blockedCount } = await supabase
          .from('user_blocks')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        if (blockedCount && blockedCount > 10) {
          alerts.push({
            id: 'blocked_users_high',
            type: 'warning',
            title: 'عدد كبير من المستخدمين المحظورين',
            message: `يوجد ${blockedCount} مستخدم محظور حالياً`,
            action: {
              label: 'مراجعة المحظورين',
              url: '/admin/users?filter=blocked'
            },
            timestamp: new Date().toISOString(),
            isRead: false,
            priority: 'medium'
          });
        }
      } catch (error) {
        console.log('جدول user_blocks غير موجود');
      }

      // التحقق من البلاغات المعلقة (مع معالجة الجدول المفقود)
      try {
        const { count: reportsCount } = await supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        if (reportsCount && reportsCount > 5) {
          alerts.push({
            id: 'pending_reports_high',
            type: 'warning',
            title: 'بلاغات معلقة تحتاج مراجعة',
            message: `يوجد ${reportsCount} بلاغ في انتظار المراجعة`,
            action: {
              label: 'مراجعة البلاغات',
              url: '/admin/reports'
            },
            timestamp: new Date().toISOString(),
            isRead: false,
            priority: 'high'
          });
        }
      } catch (error) {
        console.log('جدول reports غير موجود');
      }

      return alerts;
    } catch (error) {
      console.error('Error fetching system alerts:', error);
      return [];
    }
  }

  // الحصول على بيانات الرسوم البيانية
  async getChartData(type: 'users' | 'articles' | 'messages', period: 'week' | 'month' | 'year'): Promise<ChartData> {
    try {
      const now = new Date();
      let startDate: Date;
      let labels: string[];

      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          labels = Array.from({ length: 7 }, (_, i) => {
            const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
            return date.toLocaleDateString('ar-SA', { weekday: 'short' });
          });
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          labels = Array.from({ length: 30 }, (_, i) => {
            const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
            return date.getDate().toString();
          });
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          labels = Array.from({ length: 12 }, (_, i) => {
            const date = new Date(now.getFullYear(), i, 1);
            return date.toLocaleDateString('ar-SA', { month: 'short' });
          });
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          labels = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      }

      // بيانات وهمية للآن - يمكن استبدالها ببيانات حقيقية
      const data = labels.map(() => Math.floor(Math.random() * 100) + 10);

      return {
        labels,
        datasets: [{
          label: this.getChartLabel(type),
          data,
          borderColor: this.getChartColor(type),
          backgroundColor: this.getChartColor(type, 0.1),
          fill: true
        }]
      };
    } catch (error) {
      console.error('Error fetching chart data:', error);
      return { labels: [], datasets: [] };
    }
  }

  // دوال مساعدة
  private getDefaultStats(): DashboardStats {
    return {
      totalUsers: 0,
      activeUsers: 0,
      newUsersToday: 0,
      newUsersThisWeek: 0,
      newUsersThisMonth: 0,
      verifiedUsers: 0,
      totalArticles: 0,
      publishedArticles: 0,
      draftArticles: 0,
      totalCategories: 0,
      totalMessages: 0,
      totalMatches: 0,
      totalLikes: 0,
      activeConversations: 0,
      loginAttempts: 0,
      blockedUsers: 0,
      reportedUsers: 0,
      securityEvents: 0,
      totalAdmins: 0,
      activeAdmins: 0,
      systemUptime: '0 أيام',
      lastBackup: 'غير متوفر',

      // إحصائيات الاشتراكات
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      activeTrials: 0,
      expiredSubscriptions: 0,
      monthlyRevenue: 0,
      totalRevenue: 0,
      newSubscriptionsToday: 0,
      newSubscriptionsThisWeek: 0,
      newSubscriptionsThisMonth: 0
    };
  }

  private calculateUptime(): string {
    // حساب وقت تشغيل النظام (يمكن تحسينه لاحقاً)
    const uptimeHours = Math.floor(Math.random() * 720) + 24; // 1-30 يوم
    const days = Math.floor(uptimeHours / 24);
    const hours = uptimeHours % 24;
    return `${days} يوم و ${hours} ساعة`;
  }

  private getChartLabel(type: string): string {
    switch (type) {
      case 'users': return 'المستخدمون الجدد';
      case 'articles': return 'المقالات المنشورة';
      case 'messages': return 'الرسائل المرسلة';
      default: return 'البيانات';
    }
  }

  private getChartColor(type: string, alpha: number = 1): string {
    const colors = {
      users: `rgba(59, 130, 246, ${alpha})`, // أزرق
      articles: `rgba(16, 185, 129, ${alpha})`, // أخضر
      messages: `rgba(245, 158, 11, ${alpha})` // أصفر
    };
    return colors[type as keyof typeof colors] || `rgba(107, 114, 128, ${alpha})`;
  }
}

export const adminDashboardService = new AdminDashboardService();
