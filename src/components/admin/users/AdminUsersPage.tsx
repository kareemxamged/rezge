import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,

  Download,
  UserPlus,
  MoreVertical,
  Eye,
  Edit,

  Ban,
  Unlock,
  Mail,
  Phone,
  Calendar,
  MapPin,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAdmin } from '../../../contexts/AdminContext';
import { useToast } from '../../ToastContainer';
import { adminUsersService, type User, type UserFilters } from '../../../lib/adminUsersService';
import ModernAdminContainer from '../ModernAdminContainer';
import UserDetailsModal from './UserDetailsModal';
import BlockUserModal from './BlockUserModal';
import EditContactInfoModal from './EditContactInfoModal';
import { getBanTypeText } from '../../../utils/banDurationUtils';
import '../../../styles/admin-users.css';

// تم نقل التعريفات إلى adminUsersService

const AdminUsersPage: React.FC = () => {
  const { hasPermission, logActivity } = useAdmin();
  const { showSuccess, showError } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    gender: 'all',
    verified: undefined,
    status: 'all',
    nationality: '',
    date_range: 'all'
  });
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    verifiedUsers: 0,
    pendingVerification: 0,
    blockedUsers: 0
  });

  // تحميل المستخدمين
  const loadUsers = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminUsersService.getUsers(page, 10, filters);

      if (response.success && response.data) {
        setUsers(response.data.users);
        setTotalUsers(response.data.total);
        setTotalPages(response.data.totalPages);
        setCurrentPage(response.data.page);

        await logActivity('view_users', 'users_management');
      } else {
        setError(response.error || 'حدث خطأ في جلب البيانات');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  // تحميل الإحصائيات
  const loadStats = async () => {
    try {
      const stats = await adminUsersService.getUserStats();
      setUserStats({
        totalUsers: stats.totalUsers,
        verifiedUsers: stats.verifiedUsers,
        pendingVerification: stats.pendingVerification,
        blockedUsers: stats.blockedUsers
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  useEffect(() => {
    if (hasPermission('view_users')) {
      loadUsers();
      loadStats();
    }
  }, [hasPermission]);

  // إعادة تحميل المستخدمين عند تغيير الفلاتر
  useEffect(() => {
    if (hasPermission('view_users')) {
      loadUsers(1);
    }
  }, [filters]);

  // المستخدمون المعروضون (الفلترة تتم في الخادم)
  const filteredUsers = users;

  // تحديد المستخدم
  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // تحديد جميع المستخدمين
  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id));
    }
  };

  // عرض تفاصيل المستخدم
  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };





  // حظر/إلغاء حظر المستخدم
  const handleToggleBlock = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setSelectedUser(user);
      setShowBlockModal(true);
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
      const response = await adminUsersService.blockUser(userId, reason, evidenceFiles, banType, duration);

      if (response.success) {
        // تحديث قائمة المستخدمين
        setUsers(prev => prev.map(u =>
          u.id === userId
            ? {
                ...u,
                status: 'banned',
                block_reason: reason,
                blocked_at: new Date().toISOString()
              }
            : u
        ));

        // تسجيل النشاط
        await logActivity('block_user', 'users_management', userId);

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
      const response = await adminUsersService.unblockUser(userId);

      if (response.success) {
        // تحديث قائمة المستخدمين
        setUsers(prev => prev.map(u =>
          u.id === userId
            ? {
                ...u,
                status: 'active',
                block_reason: undefined,
                blocked_at: undefined
              }
            : u
        ));

        // تسجيل النشاط
        await logActivity('unblock_user', 'users_management', userId);

        // إظهار رسالة نجاح
        const user = users.find(u => u.id === userId);
        const userName = user ? `${user.first_name} ${user.last_name}` : 'المستخدم';

        showSuccess(
          'تم إلغاء حظر المستخدم بنجاح',
          `تم إلغاء حظر ${userName} بنجاح. يمكنه الآن الوصول للموقع مرة أخرى.`
        );
      } else {
        showError('فشل في إلغاء حظر المستخدم', response.error || 'حدث خطأ في إلغاء حظر المستخدم');
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
        // تحديث قائمة المستخدمين
        setUsers(prev => prev.map(u =>
          u.id === userId
            ? {
                ...u,
                email: contactInfo.email,
                phone: contactInfo.phone
              }
            : u
        ));

        // تسجيل النشاط
        await logActivity('update_contact_info', 'users_management', userId);

        // إظهار رسالة نجاح
        const user = users.find(u => u.id === userId);
        const userName = user ? `${user.first_name} ${user.last_name}` : 'المستخدم';

        showSuccess(
          'تم تحديث معلومات التواصل بنجاح',
          `تم تحديث معلومات التواصل للمستخدم ${userName} بنجاح. السبب: ${reason}`
        );
      } else {
        showError('فشل في حفظ التعديلات', response.error || 'حدث خطأ في حفظ التعديلات');
      }
    } catch (error) {
      console.error('Error updating contact info:', error);
      showError('فشل في حفظ التعديلات', 'حدث خطأ غير متوقع في حفظ التعديلات');
    }
  };

  // تصدير البيانات
  const handleExportUsers = async () => {
    try {
      const exportedUsers = await adminUsersService.exportUsers(filters);

      // تحويل البيانات إلى CSV
      const csvContent = [
        ['الاسم الأول', 'الاسم الأخير', 'البريد الإلكتروني', 'الهاتف', 'الجنس', 'البلد', 'المدينة', 'حالة الحساب', 'حالة التحقق', 'تاريخ التسجيل'].join(','),
        ...exportedUsers.map(user => [
          user.first_name,
          user.last_name,
          user.email,
          user.phone || '',
          user.gender === 'male' ? 'ذكر' : 'أنثى',
          user.country || '',
          user.city || '',
          user.account_status,
          user.verification_status,
          new Date(user.created_at).toLocaleDateString('ar-SA')
        ].join(','))
      ].join('\n');

      // تنزيل الملف
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      await logActivity('export_users', 'users_management');
    } catch (error) {
      console.error('Error exporting users:', error);
    }
  };

  if (!hasPermission('view_users')) {
    return (
      <ModernAdminContainer>
        <div className="text-center py-12">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">غير مصرح لك</h2>
          <p className="text-gray-600">ليس لديك صلاحية لعرض هذه الصفحة</p>
        </div>
      </ModernAdminContainer>
    );
  }

  return (
    <ModernAdminContainer maxWidth="2xl" padding="lg">
      <div className="users-management-page">
        {/* رأس الصفحة */}
        <div className="page-header modern-card p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">إدارة المستخدمين</h1>
                <p className="text-gray-600">عرض وإدارة جميع المستخدمين المسجلين</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportUsers}
                className="modern-btn modern-btn-secondary flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                تصدير
              </button>
              
              {hasPermission('create_users') && (
                <button className="modern-btn modern-btn-primary flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  إضافة مستخدم
                </button>
              )}
            </div>
          </div>
        </div>

        {/* إحصائيات سريعة */}
        <div className="stats-grid modern-grid modern-grid-4 mb-6">
          <div className="stat-card modern-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">{userStats.totalUsers}</div>
                <div className="text-sm text-gray-600">إجمالي المستخدمين</div>
              </div>
            </div>
          </div>

          <div className="stat-card modern-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {userStats.verifiedUsers}
                </div>
                <div className="text-sm text-gray-600">مستخدمون محققون</div>
              </div>
            </div>
          </div>

          <div className="stat-card modern-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {userStats.pendingVerification}
                </div>
                <div className="text-sm text-gray-600">في انتظار التحقق</div>
              </div>
            </div>
          </div>

          <div className="stat-card modern-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {userStats.blockedUsers}
                </div>
                <div className="text-sm text-gray-600">مستخدمون محظورون</div>
              </div>
            </div>
          </div>
        </div>

        {/* أدوات البحث والفلترة */}
        <div className="filters-section modern-card p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* البحث */}
            <div className="search-container relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="البحث بالاسم أو البريد الإلكتروني..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* فلتر الجنس */}
            <select
              value={filters.gender}
              onChange={(e) => setFilters(prev => ({ ...prev, gender: e.target.value as any }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">جميع الأجناس</option>
              <option value="male">ذكر</option>
              <option value="female">أنثى</option>
            </select>

            {/* فلتر حالة التحقق */}
            <select
              value={filters.verified === undefined ? 'all' : filters.verified ? 'verified' : 'unverified'}
              onChange={(e) => {
                const value = e.target.value;
                setFilters(prev => ({
                  ...prev,
                  verified: value === 'all' ? undefined : value === 'verified'
                }));
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">جميع حالات التحقق</option>
              <option value="verified">محقق</option>
              <option value="unverified">غير محقق</option>
            </select>

            {/* فلتر حالة الحساب */}
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">جميع حالات الحساب</option>
              <option value="active">نشط</option>
              <option value="suspended">معلق</option>
              <option value="banned">محظور</option>
            </select>
          </div>

          {/* أزرار الإجراءات المجمعة */}
          {selectedUsers.length > 0 && (
            <div className="bulk-actions mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-800">
                  تم تحديد {selectedUsers.length} مستخدم
                </span>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600">
                    تفعيل
                  </button>
                  <button className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600">
                    تعليق
                  </button>
                  <button className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600">
                    حظر
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* جدول المستخدمين */}
        <div className="users-table modern-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
              <span className="mr-3 text-gray-600">جاري تحميل المستخدمين...</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right">
                        <input
                          type="checkbox"
                          checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        المستخدم
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        معلومات الاتصال
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        الموقع
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        الحالة
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        تاريخ التسجيل
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => handleSelectUser(user.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center ml-4">
                              {user.profile_image_url ? (
                                <img 
                                  src={user.profile_image_url} 
                                  alt={`${user.first_name} ${user.last_name}`}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-gray-500 font-medium">
                                  {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.first_name} {user.last_name}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                              <div className="flex items-center gap-2 mt-1">
                                {user.gender && (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    user.gender === 'male'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-pink-100 text-pink-800'
                                  }`}>
                                    {user.gender === 'male' ? 'ذكر' : 'أنثى'}
                                  </span>
                                )}
                                {user.verified && (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="space-y-1">
                            {user.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-gray-400" />
                                <span>{user.phone}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span>{user.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="space-y-1">
                            {user.nationality && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <span>{user.nationality}</span>
                              </div>
                            )}
                            {user.city && (
                              <div className="text-gray-500">{user.city}</div>
                            )}
                            {user.age && (
                              <div className="text-gray-500">{user.age} سنة</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              user.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : user.status === 'suspended'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {user.status === 'active' ? 'نشط' :
                               user.status === 'suspended' ? 'معلق' : 'محظور'}
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              user.verified
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {user.verified ? 'محقق' : 'غير محقق'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span>{new Date(user.created_at).toLocaleDateString('en-GB')}</span>
                            </div>
                            {user.last_login && (
                              <div className="text-gray-500 text-xs">
                                آخر دخول: {new Date(user.last_login).toLocaleDateString('en-GB')}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewUser(user)}
                              className="text-blue-600 hover:text-blue-900"
                              title="عرض التفاصيل"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            
                            {hasPermission('edit_users') && (
                              <button
                                onClick={() => handleEditUser(user.id)}
                                className="text-green-600 hover:text-green-900"
                                title="تعديل معلومات التواصل"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            
                            {hasPermission('manage_users') && (
                              <button
                                onClick={() => handleToggleBlock(user.id)}
                                className={`${user.status === 'banned' ? 'text-green-600 hover:text-green-900' : 'text-red-600 hover:text-red-900'}`}
                                title={user.status === 'banned' ? 'إلغاء الحظر' : 'حظر'}
                              >
                                {user.status === 'banned' ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                              </button>
                            )}
                            
                            <div className="relative">
                              <button className="text-gray-400 hover:text-gray-600">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* التصفح */}
              {totalPages > 1 && (
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      عرض {((currentPage - 1) * 10) + 1} إلى {Math.min(currentPage * 10, totalUsers)} من {totalUsers} مستخدم
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center gap-1"
                      >
                        <ChevronRight className="w-4 h-4" />
                        السابق
                      </button>

                      {/* أرقام الصفحات */}
                      {(() => {
                        const pages = [];
                        const maxVisiblePages = 5;

                        if (totalPages <= maxVisiblePages) {
                          for (let i = 1; i <= totalPages; i++) {
                            pages.push(i);
                          }
                        } else {
                          const start = Math.max(1, currentPage - 2);
                          const end = Math.min(totalPages, start + maxVisiblePages - 1);

                          for (let i = start; i <= end; i++) {
                            pages.push(i);
                          }
                        }

                        return pages.map((pageNum) => (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-1 text-sm rounded ${
                              pageNum === currentPage
                                ? 'bg-blue-500 text-white'
                                : 'border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        ));
                      })()}

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center gap-1"
                      >
                        التالي
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* نافذة تفاصيل المستخدم */}
        <UserDetailsModal
          user={selectedUser}
          isOpen={showUserModal}
          onClose={() => {
            setShowUserModal(false);
            setSelectedUser(null);
          }}
        />

        {/* نافذة حظر المستخدم */}
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
      </div>
    </ModernAdminContainer>
  );
};

export default AdminUsersPage;
