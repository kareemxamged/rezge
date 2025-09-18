import React, { useState, useEffect } from 'react';
import {
  Lock,
  Eye,

  Calendar,
  Mail,
  Phone,

  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Unlock,
  Search,
  Filter
} from 'lucide-react';
import { type User } from '../../../lib/adminUsersService';
import UnblockConfirmModal from './UnblockConfirmModal';
import { useToast } from '../../ToastContainer';
import VerificationBadge from '../../VerificationBadge';

interface BlockedUsersTabProps {
  users: User[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  onViewUser: (user: User) => void;
  onPageChange: (page: number) => void;
  onToggleBlock: (userId: string) => void;
  onRefresh?: () => void;
}

const BlockedUsersTab: React.FC<BlockedUsersTabProps> = ({
  users,
  loading,
  error,
  currentPage,
  totalPages,
  totalUsers,
  onViewUser,
  onPageChange,
  onToggleBlock,
  onRefresh
}) => {
  const { showSuccess, showError } = useToast();

  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUnblocking, setIsUnblocking] = useState(false);

  // حالات الفلترة والبحث
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [banTypeFilter, setBanTypeFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [filteredUsers, setFilteredUsers] = useState<User[]>(users);
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

  // تطبيق الفلاتر والبحث
  useEffect(() => {
    // تتبع البيانات للتشخيص
    console.log('🔍 BlockedUsersTab - Users data:', users);
    console.log('🔍 BlockedUsersTab - Sample user blocked_at:', users[0]?.blocked_at);

    let filtered = [...users];

    // فلترة حسب نوع الحظر
    if (banTypeFilter !== 'all') {
      filtered = filtered.filter(user => user.ban_type === banTypeFilter);
    }

    // فلترة حسب البحث
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(user => {
        // البحث في الاسم
        if (user.first_name?.toLowerCase().includes(query)) return true;
        if (user.last_name?.toLowerCase().includes(query)) return true;

        // البحث في الإيميل
        if (user.email?.toLowerCase().includes(query)) return true;

        // البحث في رقم الهاتف
        if (user.phone?.includes(query)) return true;

        // البحث في الاسم الكامل
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
        if (fullName.includes(query)) return true;

        return false;
      });
    }

    // ترتيب حسب تاريخ الحظر
    filtered = filtered.sort((a, b) => {
      const dateA = new Date(a.blocked_at || 0).getTime();
      const dateB = new Date(b.blocked_at || 0).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    setFilteredUsers(filtered);
  }, [users, searchQuery, banTypeFilter, sortOrder]);

  const handleUnblockUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setSelectedUser(user);
      setShowUnblockModal(true);
    }
  };

  const handleConfirmUnblock = async (userId: string) => {
    setIsUnblocking(true);
    try {
      await onToggleBlock(userId);

      const user = users.find(u => u.id === userId);
      const userName = user ? `${user.first_name} ${user.last_name}` : 'المستخدم';

      showSuccess(
        'تم إلغاء الحظر بنجاح',
        `تم إلغاء حظر ${userName} بنجاح. يمكنه الآن الوصول للموقع والتفاعل مع المستخدمين الآخرين.`
      );

      setShowUnblockModal(false);
      setSelectedUser(null);
    } catch (error: any) {
      console.error('Error unblocking user:', error);
      const errorMessage = error.message || 'حدث خطأ في إلغاء الحظر';
      showError('فشل في إلغاء الحظر', errorMessage);
    } finally {
      setIsUnblocking(false);
    }
  };

  const handleCloseModal = () => {
    if (!isUnblocking) {
      setShowUnblockModal(false);
      setSelectedUser(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* إحصائيات المستخدمين المحظورين */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="modern-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">إجمالي المحظورين</p>
              <p className="text-2xl font-bold text-red-600">{totalUsers}</p>
            </div>
            <Lock className="w-8 h-8 text-red-500" />
          </div>
        </div>
        
        <div className="modern-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">محظورين اليوم</p>
              <p className="text-2xl font-bold text-orange-600">
                {users.filter(user => {
                  if (!user.blocked_at) return false;
                  const today = new Date();
                  const blockedDate = new Date(user.blocked_at);
                  return blockedDate.toDateString() === today.toDateString();
                }).length}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="modern-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">محظورين هذا الأسبوع</p>
              <p className="text-2xl font-bold text-yellow-600">
                {users.filter(user => {
                  if (!user.blocked_at) return false;
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  const blockedDate = new Date(user.blocked_at);
                  return blockedDate >= weekAgo;
                }).length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* فلاتر البحث والترتيب */}
      <div className="modern-card p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">البحث والفلترة</h3>
          </div>

          {/* شريط البحث والفلاتر */}
          <div className="flex items-center gap-4">
            {/* شريط البحث */}
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="البحث بالاسم، الإيميل، أو رقم الهاتف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* فلتر نوع الحظر */}
            <select
              value={banTypeFilter}
              onChange={(e) => setBanTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[140px]"
            >
              <option value="all">جميع الأنواع</option>
              <option value="permanent">حظر دائم</option>
              <option value="temporary">حظر مؤقت</option>
            </select>

            {/* فلتر الترتيب */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[120px]"
            >
              <option value="newest">الأحدث أولاً</option>
              <option value="oldest">الأقدم أولاً</option>
            </select>

            {/* زر التحديث */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={loading}
                className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                title="تحديث بيانات المستخدمين المحظورين"
              >
                <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : 'group-hover:scale-110'} transition-transform duration-200`} />
              </button>
            )}
          </div>

          {/* معلومات النتائج */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              عرض {filteredUsers.length} من أصل {users.length} مستخدم محظور
              {searchQuery && ` للبحث: "${searchQuery}"`}
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                مسح البحث
              </button>
            )}
          </div>
        </div>
      </div>

      {/* جدول المستخدمين المحظورين */}
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
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {users.length === 0 ? 'لا توجد مستخدمون محظورون' : 'لا توجد نتائج'}
            </h3>
            <p className="text-gray-500">
              {users.length === 0
                ? 'لا توجد مستخدمون محظورون حالياً'
                : 'لا توجد نتائج تطابق معايير البحث والفلترة'
              }
            </p>
            {users.length === 0 && (
              <p className="text-sm text-gray-400 mt-2">هذا أمر جيد! يعني أن المجتمع يتصرف بشكل مناسب</p>
            )}
            {users.length > 0 && filteredUsers.length === 0 && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setBanTypeFilter('all');
                  setSortOrder('newest');
                }}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                مسح جميع الفلاتر
              </button>
            )}
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
                      تاريخ الحظر
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      سبب الحظر
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {user.profile_image_url ? (
                              <img
                                src={user.profile_image_url}
                                alt={`${user.first_name} ${user.last_name}`}
                                className="h-10 w-10 rounded-full object-cover"
                                onError={(e) => {
                                  // في حالة فشل تحميل الصورة، عرض الأحرف الأولى
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `
                                      <div class="h-10 w-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                                        <span class="text-white font-medium text-sm">
                                          ${user.first_name?.charAt(0) || ''}${user.last_name?.charAt(0) || ''}
                                        </span>
                                      </div>
                                    `;
                                  }
                                }}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
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
                              <span>{user.age || 'غير محدد'} سنة</span>
                              <span>•</span>
                              <span>{user.gender === 'male' ? 'ذكر' : user.gender === 'female' ? 'أنثى' : 'غير محدد'}</span>
                              <span>•</span>
                              <span>{user.city || 'غير محدد'}</span>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="font-medium">
                                {user.blocked_at
                                  ? new Date(user.blocked_at).toLocaleDateString('en-GB', {
                                      year: 'numeric',
                                      month: '2-digit',
                                      day: '2-digit'
                                    })
                                  : 'غير محدد'
                                }
                              </div>
                              {user.blocked_at && (
                                <div className="text-xs text-gray-500">
                                  {new Date(user.blocked_at).toLocaleTimeString('en-GB', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-gray-500 text-xs">
                            {user.blocked_at
                              ? `${Math.floor((Date.now() - new Date(user.blocked_at).getTime()) / (1000 * 60 * 60 * 24))} يوم مضى`
                              : 'تاريخ غير معروف'
                            }
                          </div>
                          {user.ban_type === 'temporary' && user.ban_expires_at && (
                            <div className="text-orange-600 text-xs font-medium">
                              <div>
                                ينتهي: {new Date(user.ban_expires_at).toLocaleDateString('en-GB', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit'
                                })}
                              </div>
                              <div className="text-orange-500">
                                {new Date(user.ban_expires_at).toLocaleTimeString('en-GB', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                              user.ban_type === 'temporary'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              <Lock className="w-3 h-3 mr-1" />
                              {user.ban_type === 'temporary' ? 'حظر مؤقت' : 'حظر دائم'}
                            </span>
                            {user.ban_type === 'temporary' && user.ban_duration && (
                              <span className="text-xs text-orange-600 font-medium">
                                ({user.ban_duration})
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 max-w-xs">
                            <span className="font-medium">السبب:</span>
                            <span className="mr-1">
                              {user.block_reason || 'لم يتم تحديد السبب'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onViewUser(user)}
                            className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleUnblockUser(user.id)}
                            className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition-colors"
                            title="إلغاء الحظر"
                            disabled={isUnblocking}
                          >
                            <Unlock className="w-4 h-4" />
                          </button>
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
                    عرض {((currentPage - 1) * 10) + 1} إلى {Math.min(currentPage * 10, totalUsers)} من {totalUsers} مستخدم محظور
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center gap-1"
                    >
                      <ChevronRight className="w-4 h-4" />
                      السابق
                    </button>
                    
                    {/* أرقام الصفحات */}
                    {getPageNumbers().map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => onPageChange(pageNum)}
                        className={`px-3 py-1 text-sm rounded ${
                          pageNum === currentPage
                            ? 'bg-blue-500 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
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

      {/* نافذة تأكيد إلغاء الحظر */}
      <UnblockConfirmModal
        user={selectedUser}
        isOpen={showUnblockModal}
        onClose={handleCloseModal}
        onConfirm={handleConfirmUnblock}
        isLoading={isUnblocking}
      />
    </div>
  );
};

export default BlockedUsersTab;
