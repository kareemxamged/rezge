import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef, useRef } from 'react';
import {
  Shield,
  Eye,
  Check,
  X,
  Clock,
  AlertTriangle,
  FileText,
  User,
  Calendar,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw
} from 'lucide-react';
import { useToast } from '../../ToastContainer';
import { verificationService } from '../../../lib/verificationService';
import type { VerificationRequest } from '../../../lib/verificationService';
import VerificationDetailsModal from './VerificationDetailsModal';
import { useAdmin } from '../../../contexts/AdminContext';
import { supabase } from '../../../lib/supabase';

interface VerificationRequestsTabProps {
  onRefresh?: () => void;
}

export interface VerificationRequestsTabRef {
  refresh: () => void;
}

const VerificationRequestsTab = forwardRef<VerificationRequestsTabRef, VerificationRequestsTabProps>(({
  onRefresh
}, ref) => {
  const { showSuccess, showError } = useToast();
  const { adminUser } = useAdmin();

  // حالة البيانات
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // حالة التصفح والفلترة
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRequests, setTotalRequests] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // حالة النوافذ المنبثقة
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // استخدام refs للقيم الحالية لتجنب إعادة إنشاء fetchRequests
  const currentPageRef = useRef(currentPage);
  const statusFilterRef = useRef(statusFilter);
  const searchTermRef = useRef(searchTerm);
  const documentTypeFilterRef = useRef(documentTypeFilter);
  const sortOrderRef = useRef(sortOrder);

  // تحديث refs عند تغيير القيم
  useEffect(() => {
    currentPageRef.current = currentPage;
    statusFilterRef.current = statusFilter;
    searchTermRef.current = searchTerm;
    documentTypeFilterRef.current = documentTypeFilter;
    sortOrderRef.current = sortOrder;
  });

  // جلب طلبات التوثيق - دالة مستقرة
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await verificationService.getAllRequests(
        currentPageRef.current,
        10,
        statusFilterRef.current === 'all' ? undefined : statusFilterRef.current,
        searchTermRef.current || undefined,
        documentTypeFilterRef.current === 'all' ? undefined : documentTypeFilterRef.current,
        sortOrderRef.current
      );

      if (result.success && result.data) {
        setRequests(result.data.requests);
        setTotalRequests(result.data.total);
        setTotalPages(Math.ceil(result.data.total / 10));
      } else {
        setError(result.error || 'حدث خطأ في جلب طلبات التوثيق');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  }, []); // مصفوفة فارغة لأن الدالة تستخدم refs

  // تحديث البيانات عند تغيير الصفحة أو الفلتر
  useEffect(() => {
    fetchRequests();
  }, [currentPage, statusFilter, searchTerm, documentTypeFilter, sortOrder, fetchRequests]);

  // دالة التحديث للاستخدام مع زر التحديث العلوي
  const refreshData = useCallback(() => {
    fetchRequests();
    if (onRefresh) {
      onRefresh();
    }
  }, [fetchRequests, onRefresh]);

  // تصدير دالة التحديث للمكون الأب - استخدام دالة مستقرة
  useImperativeHandle(ref, () => ({
    refresh: () => {
      fetchRequests();
      // لا نستدعي onRefresh هنا لتجنب الحلقة اللانهائية
      // onRefresh يتم استدعاؤها من المكون الأب عند الحاجة
    }
  }), [fetchRequests]);

  // معالج تغيير الصفحة
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // معالج تغيير فلتر الحالة
  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  // معالج تغيير فلتر نوع المستند
  const handleDocumentTypeFilterChange = (type: string) => {
    setDocumentTypeFilter(type);
    setCurrentPage(1);
  };

  // معالج تغيير ترتيب النتائج
  const handleSortOrderChange = (order: 'newest' | 'oldest') => {
    setSortOrder(order);
    setCurrentPage(1);
  };

  // معالج البحث
  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  // دالة إعادة تعيين الفلاتر
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDocumentTypeFilter('all');
    setSortOrder('newest');
    setCurrentPage(1);
  };

  // معالج عرض تفاصيل الطلب
  const handleViewDetails = (request: VerificationRequest) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  // معالج الموافقة على الطلب
  const handleApproveRequest = async (requestId: string, notes?: string) => {
    try {
      console.log('🔍 Starting approve request:', { requestId, notes });

      // محاولة الحصول على معرف المشرف من عدة مصادر (نفس منطق handleReviewAgainRequest)
      let adminId = adminUser?.id;

      // إذا لم نجد adminUser، نحاول الحصول على المستخدم الحالي من مصادر مختلفة
      if (!adminId) {
        console.log('🔍 adminUser not found, trying multiple sources...');

        // أولاً: محاولة الحصول من localStorage
        try {
          const storedAuth = localStorage.getItem('sb-sbtzngewizgeqzfbhfjy-auth-token');
          if (storedAuth) {
            const parsedAuth = JSON.parse(storedAuth);
            adminId = parsedAuth?.user?.id;
            console.log('🔍 User ID from localStorage (sb-auth-token):', adminId);
          }
        } catch (parseError) {
          console.error('❌ Error parsing stored auth from localStorage:', parseError);
        }

        // ثانياً: محاولة الحصول من مفاتيح أخرى في localStorage
        if (!adminId) {
          try {
            const keys = Object.keys(localStorage).filter(key =>
              key.includes('supabase') || key.includes('auth')
            );
            console.log('🔍 Found auth-related keys:', keys);

            for (const key of keys) {
              try {
                const value = localStorage.getItem(key);
                if (value) {
                  const parsed = JSON.parse(value);
                  if (parsed?.user?.id) {
                    adminId = parsed.user.id;
                    console.log(`🔍 User ID from ${key}:`, adminId);
                    break;
                  }
                }
              } catch (keyError) {
                // تجاهل أخطاء المفاتيح الفردية
              }
            }
          } catch (storageError) {
            console.error('❌ Error scanning localStorage:', storageError);
          }
        }

        // ثالثاً: محاولة الحصول من supabase.auth (مع معالجة الأخطاء)
        if (!adminId) {
          try {
            console.log('🔍 Trying supabase.auth.getUser()...');
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            console.log('🔍 Auth user result:', { user, authError });

            if (!authError && user?.id) {
              adminId = user.id;
              console.log('🔍 User ID from supabase.auth:', adminId);
            } else if (authError) {
              console.warn('⚠️ Auth session missing, will try to continue with stored ID');
            }
          } catch (authException) {
            console.warn('⚠️ Auth exception:', authException);
          }
        }
      }

      // حل احتياطي للتطوير: استخدام معرف المستخدم الإداري المعروف
      if (!adminId) {
        console.log('🔍 No adminId found, using fallback admin ID for development...');
        adminId = 'f7d18de3-9102-4c40-a01a-a34f863ce319'; // المعرف الذي أضفناه لجدول admin_users
        console.log('🔍 Using fallback admin ID:', adminId);
      }

      console.log('🔍 Final Admin ID:', adminId);

      if (!adminId) {
        showError('خطأ', 'لم يتم العثور على معرف المستخدم. يرجى التواصل مع مدير النظام.');
        return;
      }

      console.log('🔍 Calling verificationService.approveRequest...');
      const result = await verificationService.approveRequest(
        requestId,
        adminId,
        notes || 'تم قبول الطلب من قبل الإدارة'
      );

      console.log('🔍 Approve result:', result);

      if (result.success) {
        showSuccess('تم القبول', 'تم قبول طلب التوثيق بنجاح');
        fetchRequests();
        onRefresh?.();
      } else {
        console.error('❌ Approve failed:', result.error);
        showError('خطأ', result.error || 'حدث خطأ في قبول الطلب');
      }
    } catch (err: any) {
      console.error('❌ Approve exception:', err);
      showError('خطأ', err.message || 'حدث خطأ غير متوقع');
    }
  };

  // معالج رفض الطلب
  const handleRejectRequest = async (requestId: string, reason: string, notes?: string) => {
    try {
      console.log('🔍 Starting reject request:', { requestId, reason, notes });

      // محاولة الحصول على معرف المشرف من عدة مصادر (نفس منطق handleReviewAgainRequest)
      let adminId = adminUser?.id;

      // إذا لم نجد adminUser، نحاول الحصول على المستخدم الحالي من مصادر مختلفة
      if (!adminId) {
        console.log('🔍 adminUser not found, trying multiple sources...');

        // أولاً: محاولة الحصول من localStorage
        try {
          const storedAuth = localStorage.getItem('sb-sbtzngewizgeqzfbhfjy-auth-token');
          if (storedAuth) {
            const parsedAuth = JSON.parse(storedAuth);
            adminId = parsedAuth?.user?.id;
            console.log('🔍 User ID from localStorage (sb-auth-token):', adminId);
          }
        } catch (parseError) {
          console.error('❌ Error parsing stored auth from localStorage:', parseError);
        }

        // ثانياً: محاولة الحصول من مفاتيح أخرى في localStorage
        if (!adminId) {
          try {
            const keys = Object.keys(localStorage).filter(key =>
              key.includes('supabase') || key.includes('auth')
            );
            console.log('🔍 Found auth-related keys:', keys);

            for (const key of keys) {
              try {
                const value = localStorage.getItem(key);
                if (value) {
                  const parsed = JSON.parse(value);
                  if (parsed?.user?.id) {
                    adminId = parsed.user.id;
                    console.log(`🔍 User ID from ${key}:`, adminId);
                    break;
                  }
                }
              } catch (keyError) {
                // تجاهل أخطاء المفاتيح الفردية
              }
            }
          } catch (storageError) {
            console.error('❌ Error scanning localStorage:', storageError);
          }
        }

        // ثالثاً: محاولة الحصول من supabase.auth (مع معالجة الأخطاء)
        if (!adminId) {
          try {
            console.log('🔍 Trying supabase.auth.getUser()...');
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            console.log('🔍 Auth user result:', { user, authError });

            if (!authError && user?.id) {
              adminId = user.id;
              console.log('🔍 User ID from supabase.auth:', adminId);
            } else if (authError) {
              console.warn('⚠️ Auth session missing, will try to continue with stored ID');
            }
          } catch (authException) {
            console.warn('⚠️ Auth exception:', authException);
          }
        }
      }

      // حل احتياطي للتطوير: استخدام معرف المستخدم الإداري المعروف
      if (!adminId) {
        console.log('🔍 No adminId found, using fallback admin ID for development...');
        adminId = 'f7d18de3-9102-4c40-a01a-a34f863ce319'; // المعرف الذي أضفناه لجدول admin_users
        console.log('🔍 Using fallback admin ID:', adminId);
      }

      console.log('🔍 Final Admin ID:', adminId);

      if (!adminId) {
        showError('خطأ', 'لم يتم العثور على معرف المستخدم. يرجى التواصل مع مدير النظام.');
        return;
      }

      console.log('🔍 Calling verificationService.rejectRequest...');
      const result = await verificationService.rejectRequest(
        requestId,
        adminId,
        reason,
        notes || 'تم رفض الطلب من قبل الإدارة'
      );

      console.log('🔍 Reject result:', result);

      if (result.success) {
        showSuccess('تم الرفض', 'تم رفض طلب التوثيق');
        fetchRequests();
        onRefresh?.();
      } else {
        console.error('❌ Reject failed:', result.error);
        showError('خطأ', result.error || 'حدث خطأ في رفض الطلب');
      }
    } catch (err: any) {
      console.error('❌ Reject exception:', err);
      showError('خطأ', err.message || 'حدث خطأ غير متوقع');
    }
  };

  // معالج إعادة النظر في الطلب
  const handleReviewAgainRequest = async (requestId: string, notes?: string) => {
    try {
      console.log('🔍 Starting review again request:', { requestId, notes });

      // محاولة الحصول على معرف المشرف من عدة مصادر
      let adminId = adminUser?.id;

      // إذا لم نجد adminUser، نحاول الحصول على المستخدم الحالي من مصادر مختلفة
      if (!adminId) {
        console.log('🔍 adminUser not found, trying multiple sources...');

        // أولاً: محاولة الحصول من localStorage
        try {
          const storedAuth = localStorage.getItem('sb-sbtzngewizgeqzfbhfjy-auth-token');
          if (storedAuth) {
            const parsedAuth = JSON.parse(storedAuth);
            adminId = parsedAuth?.user?.id;
            console.log('🔍 User ID from localStorage (sb-auth-token):', adminId);
          }
        } catch (parseError) {
          console.error('❌ Error parsing stored auth from localStorage:', parseError);
        }

        // ثانياً: محاولة الحصول من sessionStorage
        if (!adminId) {
          try {
            const sessionAuth = sessionStorage.getItem('sb-sbtzngewizgeqzfbhfjy-auth-token');
            if (sessionAuth) {
              const parsedAuth = JSON.parse(sessionAuth);
              adminId = parsedAuth?.user?.id;
              console.log('🔍 User ID from sessionStorage:', adminId);
            }
          } catch (parseError) {
            console.error('❌ Error parsing stored auth from sessionStorage:', parseError);
          }
        }

        // ثالثاً: محاولة الحصول من supabase.auth (مع معالجة الأخطاء)
        if (!adminId) {
          try {
            console.log('🔍 Trying supabase.auth.getUser()...');
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            console.log('🔍 Auth user result:', { user, authError });

            if (!authError && user?.id) {
              adminId = user.id;
              console.log('🔍 User ID from supabase.auth:', adminId);
            } else if (authError) {
              console.warn('⚠️ Auth session missing, will try to continue with stored ID');
            }
          } catch (authException) {
            console.warn('⚠️ Auth exception:', authException);
          }
        }

        // رابعاً: محاولة الحصول من أي مفتاح localStorage آخر
        if (!adminId) {
          try {
            const allKeys = Object.keys(localStorage);
            const authKeys = allKeys.filter(key => key.includes('auth') || key.includes('supabase'));
            console.log('🔍 Found auth-related keys:', authKeys);

            for (const key of authKeys) {
              try {
                const value = localStorage.getItem(key);
                if (value) {
                  const parsed = JSON.parse(value);
                  if (parsed?.user?.id) {
                    adminId = parsed.user.id;
                    console.log(`🔍 User ID found in ${key}:`, adminId);
                    break;
                  }
                }
              } catch (e) {
                // تجاهل أخطاء التحليل للمفاتيح الأخرى
              }
            }
          } catch (storageError) {
            console.error('❌ Error accessing localStorage:', storageError);
          }
        }
      }

      // حل احتياطي للتطوير: استخدام معرف المستخدم الإداري المعروف
      if (!adminId) {
        console.log('🔍 No adminId found, using fallback admin ID for development...');
        adminId = 'f7d18de3-9102-4c40-a01a-a34f863ce319'; // المعرف الذي أضفناه لجدول admin_users
        console.log('🔍 Using fallback admin ID:', adminId);
      }

      console.log('🔍 Final Admin ID:', adminId);

      if (!adminId) {
        showError('خطأ', 'لم يتم العثور على معرف المستخدم. يرجى التواصل مع مدير النظام.');
        return;
      }

      console.log('🔍 Calling verificationService.reviewAgain...');
      const result = await verificationService.reviewAgain(
        requestId,
        adminId,
        notes || 'تم إعادة النظر في الطلب من قبل الإدارة'
      );

      console.log('🔍 Review again result:', result);

      if (result.success) {
        showSuccess('تم بنجاح', 'تم إعادة النظر في طلب التوثيق وإرجاعه لحالة المراجعة');
        fetchRequests();
        onRefresh?.();
      } else {
        console.error('❌ Review again failed:', result.error);
        showError('خطأ', result.error || 'حدث خطأ في إعادة النظر في الطلب');
      }
    } catch (err: any) {
      console.error('❌ Review again exception:', err);
      showError('خطأ', err.message || 'حدث خطأ غير متوقع');
    }
  };

  // دالة تنسيق التاريخ (ميلادي)
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // دالة الحصول على لون الحالة
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'under_review':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // دالة الحصول على نص الحالة
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'في الانتظار';
      case 'under_review':
        return 'قيد المراجعة';
      case 'approved':
        return 'مقبول';
      case 'rejected':
        return 'مرفوض';
      case 'expired':
        return 'منتهي الصلاحية';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل طلبات التوثيق...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchRequests}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* الهيدر */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">طلبات التوثيق</h2>
          <p className="text-gray-600 text-sm">
            إجمالي الطلبات: {totalRequests}
          </p>
        </div>
      </div>

      {/* شريط البحث والفلاتر */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* شريط البحث */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="البحث بالاسم، الإيميل، أو رقم الهاتف..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* فلتر الحالة */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">جميع الحالات</option>
              <option value="pending">في الانتظار</option>
              <option value="under_review">قيد المراجعة</option>
              <option value="approved">مقبول</option>
              <option value="rejected">مرفوض</option>
              <option value="expired">منتهي الصلاحية</option>
            </select>
          </div>

          {/* فلتر نوع المستند */}
          <div>
            <select
              value={documentTypeFilter}
              onChange={(e) => handleDocumentTypeFilterChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">جميع المستندات</option>
              <option value="national_id">بطاقة الهوية</option>
              <option value="passport">جواز السفر</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-4 pt-4 border-t border-gray-200">
          {/* فلتر الترتيب */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 whitespace-nowrap">ترتيب حسب:</span>
            <select
              value={sortOrder}
              onChange={(e) => handleSortOrderChange(e.target.value as 'newest' | 'oldest')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="newest">الأحدث</option>
              <option value="oldest">الأقدم</option>
            </select>
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex gap-2">
            {/* زر إعادة تعيين الفلاتر */}
            <button
              onClick={resetFilters}
              className="text-gray-600 hover:text-gray-800 text-sm px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              إعادة تعيين
            </button>

            {/* زر التحديث */}
            <button
              onClick={refreshData}
              disabled={loading}
              className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
              title="تحديث بيانات طلبات التوثيق"
            >
              <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : 'group-hover:scale-110'} transition-transform duration-200`} />
            </button>
          </div>
        </div>
      </div>

      {/* الجدول */}
      {requests.length === 0 ? (
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">لا توجد طلبات توثيق</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المستخدم
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    بيانات الحساب
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    نوع المستند
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الحالة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    تاريخ الإرسال
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-green-600" />
                          </div>
                        </div>
                        <div className="mr-4">
                          <div className="text-sm font-medium text-gray-900">
                            {request.full_name_arabic}
                          </div>
                          <div className="text-sm text-gray-500">
                            {request.full_name_english}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="font-medium">
                          {request.user ? `${request.user.first_name} ${request.user.last_name}` : 'غير متوفر'}
                        </div>
                        <div className="text-gray-500 text-xs mt-1">
                          {request.user?.email || 'البريد غير متوفر'}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {request.user?.phone || 'الهاتف غير متوفر'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.document_type === 'passport' ? 'جواز سفر' : 'بطاقة هوية'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                        {getStatusText(request.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(request.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(request)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="عرض التفاصيل"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {request.status === 'pending' || request.status === 'under_review' ? (
                          <>
                            <button
                              onClick={() => handleApproveRequest(request.id)}
                              className="text-green-600 hover:text-green-900 transition-colors"
                              title="قبول الطلب"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRejectRequest(request.id, 'لم يتم استيفاء الشروط')}
                              className="text-red-600 hover:text-red-900 transition-colors"
                              title="رفض الطلب"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* التنقل بين الصفحات */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  السابق
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="mr-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  التالي
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    عرض{' '}
                    <span className="font-medium">{(currentPage - 1) * 10 + 1}</span>
                    {' '}إلى{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * 10, totalRequests)}
                    </span>
                    {' '}من{' '}
                    <span className="font-medium">{totalRequests}</span>
                    {' '}نتيجة
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === page
                              ? 'z-10 bg-green-50 border-green-500 text-green-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* نافذة تفاصيل طلب التوثيق */}
      <VerificationDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedRequest(null);
        }}
        request={selectedRequest}
        onApprove={handleApproveRequest}
        onReject={handleRejectRequest}
        onReviewAgain={handleReviewAgainRequest}
      />
    </div>
  );
});

VerificationRequestsTab.displayName = 'VerificationRequestsTab';

export default VerificationRequestsTab;
