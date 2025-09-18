import React, { useState } from 'react';
import {
  Search,

  Eye,
  Edit,
  Ban,

  Mail,
  Phone,
  Calendar,

  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Bell,

} from 'lucide-react';
import { type User, type UserFilters } from '../../../lib/adminUsersService';
import { getVisibleProfileImageUrl, handleImageError } from '../../../lib/profileImageUtils';
import VerificationBadge from '../../VerificationBadge';

interface AllUsersTabProps {
  users: User[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  filters: UserFilters;
  onSearch: (searchTerm: string) => void;
  onFilterChange: (filters: Partial<UserFilters>) => void;
  onViewUser: (user: User) => void;
  onPageChange: (page: number) => void;
  hasPermission: (permission: string) => boolean;
  onUpdateUserStatus: (userId: string, status: string) => void;
  onToggleBlock: (userId: string) => void;
  onEditUser?: (userId: string) => void;
  onSendAlert?: (user: User) => void;
  onRefresh?: () => void;
}

const AllUsersTab: React.FC<AllUsersTabProps> = ({
  users,
  loading,
  error,
  currentPage,
  totalPages,
  totalUsers,
  filters,
  onSearch,
  onFilterChange,
  onViewUser,
  onPageChange,
  hasPermission,

  onToggleBlock,
  onEditUser,
  onSendAlert,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'نشط', className: 'bg-green-100 text-green-800' },
      inactive: { label: 'غير نشط', className: 'bg-gray-100 text-gray-800' },
      suspended: { label: 'معلق', className: 'bg-yellow-100 text-yellow-800' },
      banned: { label: 'محظور', className: 'bg-red-100 text-red-800' },
      pending: { label: 'في الانتظار', className: 'bg-blue-100 text-blue-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const getVerificationBadge = (verified: boolean) => {
    return verified ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  // إنشاء أرقام الصفحات للعرض
  const getPageNumbers = () => {
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
    
    return pages;
  };

  return (
    <div className="space-y-6">
      {/* أدوات البحث والفلترة */}
      <div className="modern-card p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* البحث */}
          <form onSubmit={handleSearchSubmit} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="البحث بالاسم، البريد الإلكتروني، أو رقم الهاتف..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </form>

          {/* الفلاتر */}
          <div className="flex gap-3">
            <select
              value={filters.gender || 'all'}
              onChange={(e) => onFilterChange({ gender: e.target.value === 'all' ? undefined : e.target.value as 'male' | 'female' })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">جميع الأجناس</option>
              <option value="male">ذكر</option>
              <option value="female">أنثى</option>
            </select>

            <select
              value={filters.verified === undefined ? 'all' : filters.verified.toString()}
              onChange={(e) => {
                const value = e.target.value === 'all' ? undefined : e.target.value === 'true';
                onFilterChange({ verified: value });
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">جميع الحالات</option>
              <option value="true">محقق</option>
              <option value="false">غير محقق</option>
            </select>

            <select
              value={filters.status || 'all'}
              onChange={(e) => onFilterChange({ status: e.target.value === 'all' ? undefined : e.target.value as 'active' | 'inactive' | 'suspended' | 'banned' })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
              <option value="suspended">معلق</option>
              <option value="blocked">محظور</option>
            </select>

            {/* زر التحديث */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={loading}
                className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                title="تحديث بيانات المستخدمين"
              >
                <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : 'group-hover:scale-110'} transition-transform duration-200`} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* رسالة توضيحية */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">ملاحظة مهمة</h4>
            <p className="text-sm text-blue-700">
              هذه القائمة تعرض المستخدمين العاديين فقط. المستخدمون الإداريون (المشرفون) لا يظهرون في هذه القائمة
              لأغراض الأمان والتنظيم. لإدارة المستخدمين الإداريين، يرجى استخدام قسم "إدارة المشرفين" المخصص.
            </p>
          </div>
        </div>
      </div>

      {/* جدول المستخدمين */}
      <div className="modern-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <span className="mr-3 text-gray-600">جاري تحميل البيانات...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <span className="mr-3 text-red-600">{error}</span>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">لا توجد مستخدمون مطابقون للفلاتر المحددة</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      المستخدم
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      معلومات الاتصال
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
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {getVisibleProfileImageUrl(user) ? (
                              <img
                                src={getVisibleProfileImageUrl(user)!}
                                alt={`${user.first_name} ${user.last_name}`}
                                className="h-10 w-10 rounded-full object-cover"
                                onError={handleImageError}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center user-icon-fallback">
                                <span className="text-white font-medium text-sm">
                                  {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="mr-4">
                            <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                              <span>{user.first_name} {user.last_name}</span>
                              <VerificationBadge
                                isVerified={Boolean(user.verified)}
                                size="sm"
                                className="scale-75"
                              />
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-2">
                              <span>{user.age} سنة</span>
                              <span>•</span>
                              <span>{user.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                              <span>•</span>
                              <span>{user.city}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span>{user.email}</span>
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span>{user.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(user.status)}
                          {getVerificationBadge(user.verified)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onViewUser(user)}
                            className="action-btn action-btn-view"
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {hasPermission('edit_users') && onEditUser && (
                            <button
                              onClick={() => onEditUser(user.id)}
                              className="action-btn action-btn-edit"
                              title="تعديل معلومات التواصل"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {hasPermission('manage_users') && onSendAlert && (
                            <button
                              onClick={() => onSendAlert(user)}
                              className="action-btn action-btn-alert"
                              title="إرسال تنبيه"
                            >
                              <Bell className="w-4 h-4" />
                            </button>
                          )}

                          {hasPermission('manage_users') && user.status !== 'banned' && (
                            <button
                              onClick={() => onToggleBlock(user.id)}
                              className="action-btn action-btn-block"
                              title="حظر المستخدم"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* التنقل بين الصفحات */}
            {totalPages > 1 && (
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    عرض {((currentPage - 1) * 10) + 1} إلى {Math.min(currentPage * 10, totalUsers)} من {totalUsers} مستخدم
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="pagination-btn"
                    >
                      <ChevronRight className="w-4 h-4" />
                      السابق
                    </button>

                    {/* أرقام الصفحات */}
                    {getPageNumbers().map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => onPageChange(pageNum)}
                        className={`px-3 py-1 text-sm rounded transition-colors ${
                          pageNum === currentPage
                            ? 'bg-blue-500 text-white'
                            : 'pagination-btn'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}

                    <button
                      onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="pagination-btn"
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
    </div>
  );
};

export default AllUsersTab;
