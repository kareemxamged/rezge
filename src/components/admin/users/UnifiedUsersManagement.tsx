import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users,
  Download,
  Upload,
  UserPlus,
  AlertTriangle,

  Lock,
  Bell,
  Shield
} from 'lucide-react';
import { useAdmin } from '../../../contexts/AdminContext';
import { adminUsersService, type User, type UserFilters } from '../../../lib/adminUsersService';
import { separateAdminUsersService } from '../../../lib/separateAdminUsersService';
import { separateAdminAuth } from '../../../lib/separateAdminAuth';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../ToastContainer';
import { useUsersRealtimeUpdates, useStatsRealtimeUpdates } from '../../../hooks/useRealtimeUpdates';
import { autoRefreshService, useAutoRefresh } from '../../../services/autoRefreshService';
import { runRealtimeTests } from '../../../utils/realtimeTestUtils';
import ModernAdminContainer from '../ModernAdminContainer';
import UserDetailsModal from './UserDetailsModal';
import AddUserModal from './AddUserModal';
import BlockUserModal from './BlockUserModal';
import EditContactInfoModal from './EditContactInfoModal';
import SendAlertModal from './SendAlertModal';
import ImportUsersModal from './ImportUsersModal';
import AllUsersTab from './AllUsersTab';
import ReportsTab from './ReportsTab';
import BlockedUsersTab from './BlockedUsersTab';
import VerificationRequestsTab, { type VerificationRequestsTabRef } from './VerificationRequestsTab';
import { getBanTypeText } from '../../../utils/banDurationUtils';
import { useUsersManagementTab } from '../../../hooks/useActiveTab';
import '../../../styles/admin-users.css';

// أنواع التبويبات
type TabType = 'all' | 'reports' | 'blocked' | 'verification';

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const UnifiedUsersManagement: React.FC = () => {
  const { showSuccess, showError } = useToast();

  // مراجع المكونات
  const verificationTabRef = useRef<VerificationRequestsTabRef>(null);

  // حالة التبويبات مع حفظ في localStorage
  const { activeTab, setActiveTab } = useUsersManagementTab();
  
  // حالة البيانات
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // حالة التصفح والفلترة
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [filters, setFilters] = useState<UserFilters>({});
  
  // حالة النوافذ المنبثقة
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSendAlertModal, setShowSendAlertModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // حالة البلاغات
  const [pendingReportsCount, setPendingReportsCount] = useState(0);

  // حالة طلبات التوثيق
  const [pendingVerificationCount, setPendingVerificationCount] = useState(0);

  // حالة الإحصائيات
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    blockedUsers: 0,
    verifiedUsers: 0,
    newUsersToday: 0
  });

  // السياق الإداري
  const { hasPermission } = useAdmin();

  // تكوين التبويبات
  const tabs: TabConfig[] = [
    {
      id: 'all',
      label: 'جميع المستخدمين',
      icon: <Users className="w-4 h-4" />
    },
    {
      id: 'reports',
      label: 'البلاغات',
      icon: <AlertTriangle className="w-4 h-4" />,
      badge: pendingReportsCount > 0 ? pendingReportsCount : undefined
    },
    {
      id: 'blocked',
      label: 'المحظورون',
      icon: <Lock className="w-4 h-4" />
    },
    {
      id: 'verification',
      label: 'طلبات التوثيق',
      icon: <Shield className="w-4 h-4" />,
      badge: pendingVerificationCount > 0 ? pendingVerificationCount : undefined
    }
  ];

  // جلب البلاغات
  const fetchReports = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_reports_with_users');

      if (error) {
        console.error('Error fetching reports:', error);
        setReports([]);
        return;
      }

      const reportsData = data || [];
      setReports(reportsData);

      // حساب عدد البلاغات المعلقة
      const pendingCount = reportsData.filter((report: any) => report.status === 'pending').length;
      setPendingReportsCount(pendingCount);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setReports([]);
    }
  }, []);

  // جلب عدد البلاغات المعلقة
  const fetchPendingReportsCount = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (!error) {
        setPendingReportsCount(count || 0);
      }
    } catch (err) {
      console.error('Error fetching pending reports count:', err);
    }
  }, []);

  // جلب عدد طلبات التوثيق المعلقة
  const fetchPendingVerificationCount = useCallback(async () => {
    try {
      const { verificationService } = await import('../../../lib/verificationService');
      const result = await verificationService.getAllRequests(1, 1, 'pending');
      if (result.success && result.data) {
        setPendingVerificationCount(result.data.total);
      }
    } catch (err) {
      console.error('Error fetching pending verification count:', err);
    }
  }, []);

  // جلب البيانات
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let currentFilters = { ...filters };

      // تطبيق فلاتر حسب التبويب النشط
      if (activeTab === 'blocked') {
        currentFilters.status = 'banned';
      } else if (activeTab === 'reports') {
        // سيتم تنفيذ منطق البلاغات لاحقاً
        currentFilters.hasReports = true;
      }

      const response = await adminUsersService.getUsers(currentPage, 10, currentFilters);

      if (response.success && response.data) {
        setUsers(response.data.users);
        setTotalUsers(response.data.total);
        setTotalPages(Math.ceil(response.data.total / 10));
      } else {
        setError(response.error || 'حدث خطأ في جلب البيانات');
      }
    } catch (err) {
      setError('حدث خطأ في الاتصال بالخادم');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters, activeTab]);

  // جلب الإحصائيات المحدثة
  const fetchStats = useCallback(async () => {
    try {
      const freshStats = await autoRefreshService.fetchFreshStats();
      setStats(freshStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // تحديث البيانات بشكل سلس (بدون loading)
  const refreshDataSilently = useCallback(async () => {
    try {
      // تحديث البيانات حسب التبويب النشط
      if (activeTab === 'reports') {
        // تحديث البلاغات
        await fetchReports();
      } else {
        // تحديث المستخدمين (للتبويبات الأخرى)
        let currentFilters = { ...filters };

        // تطبيق فلاتر حسب التبويب النشط
        if (activeTab === 'blocked') {
          currentFilters.status = 'banned';
        }

        // جلب البيانات المحدثة باستخدام نفس الخدمة
        const response = await adminUsersService.getUsers(currentPage, 10, currentFilters);

        if (response.success && response.data) {
          setUsers(response.data.users);
          setTotalUsers(response.data.total);
          setTotalPages(Math.ceil(response.data.total / 10));
        }
      }

      // تحديث الإحصائيات
      await fetchStats();

      // تحديث عدد البلاغات
      await fetchPendingReportsCount();

      // تحديث عدد طلبات التوثيق
      await fetchPendingVerificationCount();

      // تحديث قسم التوثيق إذا كان نشطاً
      if (activeTab === 'verification' && verificationTabRef.current) {
        verificationTabRef.current.refresh();
      }

      console.log('🔄 Data refreshed silently');
    } catch (error) {
      console.error('❌ Error in silent refresh:', error);
    }
  }, [filters, fetchStats, activeTab, currentPage, fetchPendingReportsCount, fetchReports, fetchPendingVerificationCount]);

  // دوال تحديث منفصلة لكل قسم
  const refreshAllUsers = useCallback(async () => {
    setLoading(true);
    await fetchUsers();
    await fetchStats();
    setLoading(false);
    showSuccess('تم تحديث البيانات', 'تم تحديث بيانات المستخدمين بنجاح');
  }, [fetchUsers, fetchStats, showSuccess]);

  const refreshReports = useCallback(async () => {
    setLoading(true);
    await fetchReports();
    await fetchPendingReportsCount();
    setLoading(false);
    showSuccess('تم تحديث البيانات', 'تم تحديث بيانات البلاغات بنجاح');
  }, [fetchReports, fetchPendingReportsCount, showSuccess]);

  const refreshBlockedUsers = useCallback(async () => {
    setLoading(true);
    await fetchUsers();
    await fetchStats();
    setLoading(false);
    showSuccess('تم تحديث البيانات', 'تم تحديث بيانات المستخدمين المحظورين بنجاح');
  }, [fetchUsers, fetchStats, showSuccess]);

  const refreshVerificationRequests = useCallback(async () => {
    setLoading(true);
    if (verificationTabRef.current) {
      verificationTabRef.current.refresh();
    }
    await fetchPendingVerificationCount();
    setLoading(false);
    showSuccess('تم تحديث البيانات', 'تم تحديث بيانات طلبات التوثيق بنجاح');
  }, [fetchPendingVerificationCount, showSuccess]);

  // إعداد التحديث التلقائي مع دوال مستقرة
  const stableRefreshDataSilently = useRef(refreshDataSilently);
  const stableFetchStats = useRef(fetchStats);

  // تحديث المراجع عند تغيير الدوال
  useEffect(() => {
    stableRefreshDataSilently.current = refreshDataSilently;
    stableFetchStats.current = fetchStats;
  });

  const { register: registerUsersRefresh, unregister: unregisterUsersRefresh } = useAutoRefresh(
    'users-management',
    () => stableRefreshDataSilently.current()
  );

  const { register: registerStatsRefresh, unregister: unregisterStatsRefresh } = useAutoRefresh(
    'users-stats',
    () => stableFetchStats.current()
  );

  // إعداد Real-time updates
  useUsersRealtimeUpdates(refreshDataSilently, true);
  useStatsRealtimeUpdates(fetchStats, true);

  // تأثيرات جانبية
  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports();
    } else {
      fetchUsers();
    }
    fetchPendingReportsCount();
    fetchPendingVerificationCount();
    fetchStats();
  }, [fetchUsers, fetchStats, fetchPendingReportsCount, fetchPendingVerificationCount, fetchReports, activeTab]);

  // تسجيل callbacks للتحديث التلقائي
  useEffect(() => {
    registerUsersRefresh();
    registerStatsRefresh();

    return () => {
      unregisterUsersRefresh();
      unregisterStatsRefresh();
    };
  }, []); // مصفوفة فارغة لأن الدوال مستقرة من useAutoRefresh

  // تشغيل اختبارات النظام مرة واحدة فقط عند التحميل الأول
  useEffect(() => {
    // تشغيل اختبارات النظام في وضع التطوير مرة واحدة فقط
    if (process.env.NODE_ENV === 'development') {
      runRealtimeTests();
    }
  }, []); // مصفوفة فارغة تعني تشغيل مرة واحدة فقط

  // معالجات الأحداث
  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId as any); // الـ hook يتعامل مع حفظ القسم تلقائياً
    setCurrentPage(1);
    setFilters({});

    // تحديث البيانات عند تغيير التبويب
    setTimeout(() => {
      if (tabId === 'reports') {
        fetchReports();
      } else {
        fetchUsers();
      }
    }, 100);
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleAddUser = () => {
    setShowAddUserModal(true);
  };

  const handleSendAlert = () => {
    setShowSendAlertModal(true);
  };

  const handleSendAlertToUser = (user: User) => {
    setSelectedUser(user);
    setShowSendAlertModal(true);
  };

  const handleUpdateUserStatus = async (userId: string, status: string) => {
    try {
      const response = await adminUsersService.updateUserStatus(userId, status as 'active' | 'suspended' | 'banned');
      if (response.success) {
        await refreshDataSilently();
      } else {
        setError(response.error || 'حدث خطأ في تحديث حالة المستخدم');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      setError('حدث خطأ في تحديث حالة المستخدم');
    }
  };



  const handleToggleBlock = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setSelectedUser(user);
      setShowBlockModal(true);
    }
  };

  // دالة منفصلة لفك الحظر (للاستخدام في BlockedUsersTab)
  const handleUnblockUser = async (userId: string) => {
    try {
      // الحصول على اسم المستخدم قبل إلغاء الحظر
      const user = users.find(u => u.id === userId);
      const userName = user ? `${user.first_name} ${user.last_name}` : 'المستخدم';

      // استخدام النظام الجديد إذا كان متاحاً
      const currentAdminAccount = separateAdminAuth.getCurrentAccount();
      if (currentAdminAccount) {
        await separateAdminUsersService.unblockUser(userId);
        await refreshDataSilently();

        showSuccess(
          'تم إلغاء حظر المستخدم بنجاح',
          `تم إلغاء حظر ${userName} بنجاح من قائمة المحظورين.`
        );

        console.log('✅ User unblocked successfully using new system');
      } else {
        // fallback للنظام القديم
        const response = await adminUsersService.unblockUser(userId);
        if (response.success) {
          await refreshDataSilently();

          showSuccess(
            'تم إلغاء حظر المستخدم بنجاح',
            `تم إلغاء حظر ${userName} بنجاح من قائمة المحظورين.`
          );
        } else {
          showError('فشل في إلغاء حظر المستخدم', response.error || 'حدث خطأ في إلغاء حظر المستخدم');
        }
      }
    } catch (error) {
      console.error('Error unblocking user:', error);
      showError('فشل في إلغاء حظر المستخدم', 'حدث خطأ غير متوقع في إلغاء حظر المستخدم');
    }
  };

  const handleConfirmBlock = async (
    userId: string,
    reason: string,
    evidenceFiles: File[],
    banType: 'permanent' | 'temporary',
    duration?: string
  ) => {
    try {
      // استخدام adminUsersService دائماً للحظر لضمان الدقة في حساب المدة
      const response = await adminUsersService.blockUser(userId, reason, evidenceFiles, banType, duration);
      if (response.success) {
        await refreshDataSilently();

        // إظهار رسالة نجاح
        const user = users.find(u => u.id === userId);
        const userName = user ? `${user.first_name} ${user.last_name}` : 'المستخدم';
        // استخدام النص المترجم من الاستجابة أو الدالة المساعدة كبديل احتياطي
        const banTypeText = response.data.banDurationText
          ? (banType === 'permanent' ? 'دائم' : `مؤقت (${response.data.banDurationText})`)
          : getBanTypeText(banType, duration);

        showSuccess(
          'تم حظر المستخدم بنجاح',
          `تم حظر ${userName} بنجاح. نوع الحظر: ${banTypeText}. السبب: ${reason}`
        );

        console.log('✅ User blocked successfully');
      } else {
        showError('فشل في حظر المستخدم', response.error || 'حدث خطأ في حظر المستخدم');
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      showError('فشل في حظر المستخدم', 'حدث خطأ غير متوقع في حظر المستخدم');
    }
  };

  const handleConfirmUnblock = async (userId: string) => {
    try {
      // الحصول على اسم المستخدم قبل إلغاء الحظر
      const user = users.find(u => u.id === userId);
      const userName = user ? `${user.first_name} ${user.last_name}` : 'المستخدم';

      // استخدام النظام الجديد إذا كان متاحاً
      const currentAdminAccount = separateAdminAuth.getCurrentAccount();
      if (currentAdminAccount) {
        await separateAdminUsersService.unblockUser(userId);
        await fetchUsers();

        showSuccess(
          'تم إلغاء حظر المستخدم بنجاح',
          `تم إلغاء حظر ${userName} بنجاح. يمكنه الآن الوصول للموقع مرة أخرى.`
        );

        console.log('✅ User unblocked successfully using new system');
      } else {
        // fallback للنظام القديم
        const response = await adminUsersService.unblockUser(userId);
        if (response.success) {
          await fetchUsers();

          showSuccess(
            'تم إلغاء حظر المستخدم بنجاح',
            `تم إلغاء حظر ${userName} بنجاح. يمكنه الآن الوصول للموقع مرة أخرى.`
          );
        } else {
          showError('فشل في إلغاء حظر المستخدم', response.error || 'حدث خطأ في إلغاء حظر المستخدم');
        }
      }
    } catch (error) {
      console.error('Error unblocking user:', error);
      showError('فشل في إلغاء حظر المستخدم', 'حدث خطأ غير متوقع في إلغاء حظر المستخدم');
    }
  };

  const handleEditUser = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setSelectedUser(user);
      setShowEditModal(true);
    }
  };

  const handleSaveContactInfo = async (userId: string, contactInfo: { email: string; phone: string }, reason: string, documents: File[]) => {
    try {
      const response = await adminUsersService.updateContactInfo(userId, contactInfo, reason, documents);
      if (response.success) {
        await fetchUsers();

        // عرض رسالة نجاح مخصصة
        if (response.data?.message) {
          console.log('✅ Contact info updated:', response.data.message);
          // يمكن إضافة toast notification هنا إذا كان متوفراً
        }
      } else {
        setError(response.error || 'حدث خطأ في حفظ التعديلات');
      }
    } catch (error) {
      console.error('Error updating contact info:', error);
      setError('حدث خطأ في حفظ التعديلات');
    }
  };

  const handleExportUsers = async () => {
    try {
      const exportedUsers = await adminUsersService.exportUsers(filters);

      // التحقق من وجود البيانات
      if (!exportedUsers || !Array.isArray(exportedUsers) || exportedUsers.length === 0) {
        setError('لا توجد بيانات للتصدير');
        return;
      }

      // تحويل البيانات إلى CSV
      const csvContent = [
        ['الاسم الأول', 'الاسم الأخير', 'البريد الإلكتروني', 'الهاتف', 'الجنس', 'البلد', 'المدينة', 'حالة الحساب', 'حالة التحقق', 'تاريخ التسجيل'].join(','),
        ...exportedUsers.map(user => [
          user.first_name || '',
          user.last_name || '',
          user.email || '',
          user.phone || '',
          user.gender === 'male' ? 'ذكر' : user.gender === 'female' ? 'أنثى' : '',
          user.nationality || '',
          user.city || '',
          user.status === 'active' ? 'نشط' : user.status === 'banned' ? 'محظور' : user.status,
          user.verified ? 'محقق' : 'غير محقق',
          new Date(user.created_at).toLocaleDateString('en-GB')
        ].join(','))
      ].join('\n');

      // تنزيل الملف
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } catch (error) {
      console.error('Error exporting users:', error);
      setError('حدث خطأ في تصدير البيانات');
    }
  };

  const handleImportUsers = () => {
    setShowImportModal(true);
  };

  const handleImportComplete = () => {
    setShowImportModal(false);
    fetchUsers(); // إعادة تحميل البيانات
  };

  const handleSearch = (searchTerm: string) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
    setCurrentPage(1);
  };

  const handleFilterChange = (newFilters: Partial<UserFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  return (
    <ModernAdminContainer maxWidth="2xl" padding="lg">
      <div className="users-management-page">
        {/* رأس الصفحة */}
        <div className="page-header modern-card p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800">إدارة المستخدمين</h1>
                <p className="text-sm sm:text-base text-gray-600">عرض وإدارة جميع المستخدمين والبلاغات والحظر</p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-500">
                  <span>المجموع: {stats.totalUsers}</span>
                  <span>النشطون: {stats.activeUsers}</span>
                  <span>المحظورون: {stats.blockedUsers}</span>
                  <span className="hidden sm:inline">المحققون: {stats.verifiedUsers}</span>
                  <span className="hidden lg:inline">جدد اليوم: {stats.newUsersToday}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">

              {/* أزرار الاستيراد والتصدير مخفية مؤقتاً */}
              {false && (
                <>
                  <button
                    onClick={handleExportUsers}
                    className="modern-btn modern-btn-secondary flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">تصدير</span>
                  </button>

                  {hasPermission('create_users') && (
                    <button
                      onClick={handleImportUsers}
                      className="modern-btn modern-btn-info flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span className="hidden sm:inline">استيراد</span>
                    </button>
                  )}
                </>
              )}

              {hasPermission('manage_users') && (
                <button
                  onClick={handleSendAlert}
                  className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-all duration-200 group"
                  title="إرسال تنبيه"
                >
                  <Bell className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" />
                </button>
              )}

              {hasPermission('create_users') && (
                <button
                  onClick={handleAddUser}
                  className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200 group"
                  title="إضافة مستخدم"
                >
                  <UserPlus className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* التبويبات */}
        <div className="modern-card mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex gap-6 sm:gap-8 px-4 sm:px-6 overflow-x-auto" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon}
                  <span className="hidden xs:inline sm:inline">{tab.label}</span>
                  <span className="xs:hidden sm:hidden">{tab.label.split(' ')[0]}</span>
                  {tab.badge && (
                    <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* محتوى التبويب النشط */}
        <div className="tab-content">
          {activeTab === 'all' && (
            <AllUsersTab
              users={users}
              loading={loading}
              error={error}
              currentPage={currentPage}
              totalPages={totalPages}
              totalUsers={totalUsers}
              filters={filters}
              onSearch={handleSearch}
              onFilterChange={handleFilterChange}
              onViewUser={handleViewUser}
              onPageChange={setCurrentPage}
              hasPermission={hasPermission}
              onUpdateUserStatus={handleUpdateUserStatus}
              onToggleBlock={handleToggleBlock}
              onEditUser={handleEditUser}
              onSendAlert={handleSendAlertToUser}
              onRefresh={refreshAllUsers}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsTab
              reports={reports}
              loading={loading}
              error={error}
              onRefresh={refreshReports}
            />
          )}

          {activeTab === 'blocked' && (
            <BlockedUsersTab
              users={users}
              loading={loading}
              error={error}
              currentPage={currentPage}
              totalPages={totalPages}
              totalUsers={totalUsers}
              onViewUser={handleViewUser}
              onPageChange={setCurrentPage}
              onToggleBlock={handleUnblockUser}
              onRefresh={refreshBlockedUsers}
            />
          )}

          {activeTab === 'verification' && (
            <VerificationRequestsTab
              ref={verificationTabRef}
              onRefresh={() => {
                fetchPendingVerificationCount();
                // لا نستدعي refreshDataSilently هنا لتجنب التحديث المضاعف
              }}
            />
          )}
        </div>

        {/* النوافذ المنبثقة */}
        <UserDetailsModal
          user={selectedUser}
          isOpen={showUserModal}
          onClose={() => {
            setShowUserModal(false);
            setSelectedUser(null);
          }}
        />

        <AddUserModal
          isOpen={showAddUserModal}
          onClose={() => setShowAddUserModal(false)}
          onUserAdded={() => {
            setShowAddUserModal(false);
            refreshDataSilently();
          }}
        />

        <BlockUserModal
          user={selectedUser}
          isOpen={showBlockModal}
          onClose={() => {
            setShowBlockModal(false);
            setSelectedUser(null);
          }}
          onConfirmBlock={handleConfirmBlock}
          onConfirmUnblock={handleConfirmUnblock}
        />

        <EditContactInfoModal
          user={selectedUser}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onSave={handleSaveContactInfo}
        />

        <SendAlertModal
          isOpen={showSendAlertModal}
          onClose={() => {
            setShowSendAlertModal(false);
            setSelectedUser(null);
          }}
          onAlertSent={() => {
            setShowSendAlertModal(false);
            setSelectedUser(null);
          }}
          targetUser={selectedUser}
        />

        {/* نافذة استيراد المستخدمين */}
        <ImportUsersModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImportComplete={handleImportComplete}
        />
      </div>
    </ModernAdminContainer>
  );
};



export default UnifiedUsersManagement;
