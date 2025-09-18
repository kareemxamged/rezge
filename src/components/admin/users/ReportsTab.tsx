import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,

  Shield,
  RefreshCw,
  Search,
  UserCheck,

  X,

} from 'lucide-react';
import AcceptReportModal from './AcceptReportModal';
import RejectReportModal from './RejectReportModal';
import { notificationService } from '../../../lib/notificationService';
import { supabase } from '../../../lib/supabase';
import { adminSupabase } from '../../../lib/adminUsersService';
import { useToast } from '../../ToastContainer';
import VerificationBadge from '../../VerificationBadge';

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  description: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'rejected';
  severity: 'low' | 'medium' | 'high';
  review_status: 'not_assigned' | 'assigned' | 'in_progress' | 'completed';
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  priority: number;
  created_at: string;
  updated_at: string;
  reporter?: {
    first_name: string;
    last_name: string;
    email: string;
    verified?: boolean;
  };
  reported_user?: {
    first_name: string;
    last_name: string;
    email: string;
    verified?: boolean;
  };
  reviewer?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface ReportsTabProps {
  reports: Report[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const ReportsTab: React.FC<ReportsTabProps> = ({
  reports: propReports,
  loading: propLoading,
  error: propError,
  onRefresh
}) => {
  const { showSuccess, showError } = useToast();

  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [actionLoading, setActionLoading] = useState(false);

  // استخدام البيانات من props
  const [reports, setReports] = useState(propReports);
  const [error, setError] = useState(propError);
  const loading = propLoading;

  // تحديث البيانات عند تغيير props
  useEffect(() => {
    setReports(propReports);
    setError(propError);
  }, [propReports, propError]);

  // فلترة البلاغات حسب الحالة والبحث والترتيب
  useEffect(() => {
    let filtered = reports;

    // فلترة حسب الحالة
    if (statusFilter !== 'all') {
      if (statusFilter === 'unassigned') {
        filtered = filtered.filter(r => r.status === 'pending' && r.review_status === 'not_assigned');
      } else if (statusFilter === 'in_review') {
        filtered = filtered.filter(r => r.review_status === 'in_progress');
      } else if (statusFilter === 'completed') {
        filtered = filtered.filter(r => r.status === 'resolved' || r.status === 'rejected');
      } else {
        filtered = filtered.filter(r => r.status === statusFilter);
      }
    }

    // فلترة حسب البحث
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(report => {
        // البحث في معرف البلاغ
        if (report.id.toLowerCase().includes(query)) return true;

        // البحث في بيانات المبلغ
        if (report.reporter?.email?.toLowerCase().includes(query)) return true;
        if (report.reporter?.first_name?.toLowerCase().includes(query)) return true;
        if (report.reporter?.last_name?.toLowerCase().includes(query)) return true;

        // البحث في بيانات المبلغ عنه
        if (report.reported_user?.email?.toLowerCase().includes(query)) return true;
        if (report.reported_user?.first_name?.toLowerCase().includes(query)) return true;
        if (report.reported_user?.last_name?.toLowerCase().includes(query)) return true;

        // البحث في وصف البلاغ
        if (report.description?.toLowerCase().includes(query)) return true;

        return false;
      });
    }

    // ترتيب حسب التاريخ
    filtered = filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    setFilteredReports(filtered);
  }, [reports, statusFilter, searchQuery, sortOrder]);



  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'معلق', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
      reviewing: { label: 'قيد المراجعة', className: 'bg-blue-100 text-blue-800', icon: Eye },
      resolved: { label: 'محلول', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { label: 'مرفوض', className: 'bg-red-100 text-red-800', icon: XCircle }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
        <IconComponent className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const getSeverityBadge = (severity: string) => {
    const severityConfig = {
      low: { label: 'منخفض', className: 'bg-gray-100 text-gray-800' },
      medium: { label: 'متوسط', className: 'bg-orange-100 text-orange-800' },
      high: { label: 'عالي', className: 'bg-red-100 text-red-800' }
    };
    
    const config = severityConfig[severity as keyof typeof severityConfig] || severityConfig.low;
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const getReasonLabel = (reason: string) => {
    const reasons = {
      inappropriate_behavior: 'سلوك غير مناسب',
      fake_profile: 'ملف شخصي مزيف',
      harassment: 'مضايقة أو تحرش',
      spam: 'رسائل مزعجة',
      inappropriate_content: 'محتوى غير مناسب',
      fraud: 'محاولة احتيال',
      underage: 'قاصر',
      married: 'شخص متزوج',
      other: 'أخرى'
    };
    
    return reasons[reason as keyof typeof reasons] || reason;
  };

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
    setShowReportModal(true);
  };

  const handleAcceptReport = (report: Report) => {
    setSelectedReport(report);
    setShowAcceptModal(true);
  };

  const handleRejectReport = (report: Report) => {
    setSelectedReport(report);
    setShowRejectModal(true);
  };

  const handleAcceptSubmit = async (data: {
    reason: string;
    actionType: string;
    evidenceFiles: File[];
  }) => {
    if (!selectedReport) return;

    setActionLoading(true);
    try {
      // استخدام admin client لتجاوز RLS policies
      const client = adminSupabase || supabase;

      // تحديث حالة البلاغ في قاعدة البيانات
      const { error: updateError } = await client
        .from('reports')
        .update({
          status: 'resolved',
          review_status: 'completed',
          admin_notes: data.reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedReport.id);

      if (updateError) {
        throw updateError;
      }

      // إرسال تنبيه popup + إشعار للمبلغ
      if (selectedReport.reporter_id) {
        await notificationService.sendReportAlertAndNotification(
          selectedReport.reporter_id,
          'report_accepted',
          selectedReport.id,
          {
            action_type: data.actionType,
            admin_reason: data.reason
          }
        );
      }

      showSuccess(
        'تم قبول البلاغ بنجاح',
        'تم قبول البلاغ وإرسال إشعار للمبلغ. تم اتخاذ الإجراء المناسب.'
      );
      setShowAcceptModal(false);
      setSelectedReport(null);
      onRefresh(); // إعادة تحميل البلاغات
    } catch (error: any) {
      console.error('Error accepting report:', error);
      const errorMessage = error.message || 'حدث خطأ في قبول البلاغ';
      showError('فشل في قبول البلاغ', errorMessage);
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (data: {
    reason: string;
    evidenceFiles: File[];
  }) => {
    if (!selectedReport) return;

    setActionLoading(true);
    try {
      // استخدام admin client لتجاوز RLS policies
      const client = adminSupabase || supabase;

      // تحديث حالة البلاغ في قاعدة البيانات
      const { error: updateError } = await client
        .from('reports')
        .update({
          status: 'rejected',
          review_status: 'completed',
          admin_notes: data.reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedReport.id);

      if (updateError) {
        throw updateError;
      }

      // إرسال تنبيه popup + إشعار للمبلغ
      if (selectedReport.reporter_id) {
        await notificationService.sendReportAlertAndNotification(
          selectedReport.reporter_id,
          'report_rejected',
          selectedReport.id,
          {
            admin_reason: data.reason
          }
        );
      }

      showSuccess(
        'تم رفض البلاغ',
        'تم رفض البلاغ وإرسال إشعار للمبلغ بالسبب.'
      );
      setShowRejectModal(false);
      setSelectedReport(null);
      onRefresh(); // إعادة تحميل البلاغات
    } catch (error: any) {
      console.error('Error rejecting report:', error);
      const errorMessage = error.message || 'حدث خطأ في رفض البلاغ';
      showError('فشل في رفض البلاغ', errorMessage);
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignReportForReview = async (reportId: string) => {
    try {
      // تخصيص البلاغ للأدمن الحالي للمراجعة
      const currentAdminId = '27630074-bb7d-4c84-9922-45b21e699a8c'; // TODO: الحصول على معرف الأدمن الحالي

      // استخدام admin client لتجاوز RLS policies
      const client = adminSupabase || supabase;

      const { error } = await client
        .from('reports')
        .update({
          review_status: 'in_progress',
          reviewed_by: currentAdminId,
          reviewed_at: new Date().toISOString(),
          status: 'reviewing',
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId)
        .eq('review_status', 'not_assigned')
        .select(`
          *,
          reviewer:users!reports_reviewed_by_fkey(first_name, last_name, email)
        `)
        .single();

      if (error) {
        console.error('Error assigning report:', error);
        const errorMessage = 'حدث خطأ في تخصيص البلاغ للمراجعة';
        showError('فشل في تولي المراجعة', errorMessage);
        setError(errorMessage);
        return;
      }

      // تحديث البيانات المحلية
      setReports(prevReports =>
        prevReports.map(report =>
          report.id === reportId
            ? {
                ...report,
                status: 'reviewing',
                review_status: 'in_progress',
                reviewed_by: currentAdminId,
                reviewed_at: new Date().toISOString(),
                reviewer: {
                  first_name: 'Super',
                  last_name: 'Admin',
                  email: 'admin@rezge.com'
                }
              }
            : report
        )
      );

      // إرسال تنبيه popup + إشعار للمبلغ بأن البلاغ قيد المراجعة
      const report = reports.find(r => r.id === reportId);
      if (report?.reporter_id) {
        try {
          await notificationService.sendReportAlertAndNotification(
            report.reporter_id,
            'report_received',
            reportId
          );
        } catch (notificationError) {
          console.error('Error sending report received alert and notification:', notificationError);
          // لا نوقف العملية إذا فشل الإشعار
        }
      }

      showSuccess(
        'تم تولي مراجعة البلاغ',
        'تم تخصيص البلاغ لك للمراجعة بنجاح وإرسال إشعار للمبلغ.'
      );
      console.log('Report assigned for review:', reportId);
    } catch (error) {
      console.error('Error assigning report for review:', error);
      setError('حدث خطأ في تخصيص البلاغ للمراجعة');
    }
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="mr-3 text-gray-600">جاري تحميل البلاغات...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <AlertTriangle className="w-8 h-8 text-red-500" />
        <span className="mr-3 text-red-600">{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">


      {/* رسالة الخطأ */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        </div>
      )}
      {/* إحصائيات البلاغات */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="modern-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">إجمالي البلاغات</p>
              <p className="text-2xl font-bold text-gray-900">{reports.length}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        
        <div className="modern-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">في انتظار التخصيص</p>
              <p className="text-2xl font-bold text-yellow-600">
                {reports.filter(r => r.status === 'pending' && r.review_status === 'not_assigned').length}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                بحاجة لمراجع
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="modern-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">قيد المراجعة</p>
              <p className="text-2xl font-bold text-blue-600">
                {reports.filter(r => r.review_status === 'in_progress').length}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                مخصصة للمراجعين
              </p>
            </div>
            <UserCheck className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="modern-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">مكتملة</p>
              <p className="text-2xl font-bold text-green-600">
                {reports.filter(r => r.status === 'resolved' || r.status === 'rejected').length}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                محلولة أو مرفوضة
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* إحصائيات إضافية للمراجعين */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="modern-card p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">البلاغات عالية الأولوية</p>
              <p className="text-xl font-bold text-blue-900">
                {reports.filter(r => r.severity === 'high' && r.status === 'pending').length}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                تحتاج مراجعة فورية
              </p>
            </div>
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
        </div>

        <div className="modern-card p-4 bg-gradient-to-r from-orange-50 to-yellow-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">متوسط وقت المراجعة</p>
              <p className="text-xl font-bold text-orange-900">
                {reports.filter(r => r.reviewed_at).length > 0
                  ? Math.round(
                      reports
                        .filter(r => r.reviewed_at && r.status !== 'pending')
                        .reduce((acc, r) => {
                          const reviewTime = new Date(r.updated_at).getTime() - new Date(r.reviewed_at!).getTime();
                          return acc + reviewTime;
                        }, 0) /
                      (reports.filter(r => r.reviewed_at && r.status !== 'pending').length * 1000 * 60 * 60)
                    )
                  : 0
                } ساعة
              </p>
              <p className="text-xs text-orange-600 mt-1">
                للبلاغات المكتملة
              </p>
            </div>
            <Clock className="w-6 h-6 text-orange-500" />
          </div>
        </div>

        <div className="modern-card p-4 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">معدل الحل</p>
              <p className="text-xl font-bold text-green-900">
                {reports.length > 0
                  ? Math.round((reports.filter(r => r.status === 'resolved').length / reports.length) * 100)
                  : 0
                }%
              </p>
              <p className="text-xs text-green-600 mt-1">
                من إجمالي البلاغات
              </p>
            </div>
            <Shield className="w-6 h-6 text-green-500" />
          </div>
        </div>
      </div>

      {/* البحث والفلاتر */}
      <div className="modern-card p-4">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">البحث والفلترة</h3>

          {/* شريط البحث */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="البحث بمعرف البلاغ، اسم المبلغ/المبلغ عنه، الإيميل، أو رقم الهاتف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* فلتر الحالة */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[150px]"
            >
              <option value="all">جميع البلاغات</option>
              <option value="unassigned">غير مخصصة</option>
              <option value="in_review">قيد المراجعة</option>
              <option value="pending">معلقة</option>
              <option value="resolved">محلولة</option>
              <option value="rejected">مرفوضة</option>
              <option value="completed">مكتملة</option>
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
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
              title="تحديث بيانات البلاغات"
            >
              <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : 'group-hover:scale-110'} transition-transform duration-200`} />
            </button>
          </div>

          {/* معلومات النتائج */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              عرض {filteredReports.length} من أصل {reports.length} بلاغ
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

      {/* جدول البلاغات */}
      <div className="modern-card overflow-hidden">
        {filteredReports.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {reports.length === 0 ? 'لا توجد بلاغات حالياً' : 'لا توجد بلاغات تطابق الفلتر المحدد'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    البلاغ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المبلغ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المبلغ عنه
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الحالة والمراجعة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الأولوية والتاريخ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900">
                          {getReasonLabel(report.reason)}
                        </div>
                        <div className="text-sm text-gray-500 line-clamp-2">
                          {report.description}
                        </div>
                        <div>{getSeverityBadge(report.severity)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
                            <span className="text-white font-medium text-xs">
                              {(report.reporter?.first_name?.charAt(0) || '؟') + (report.reporter?.last_name?.charAt(0) || '')}
                            </span>
                          </div>
                        </div>
                        <div className="mr-3">
                          <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                            <span>
                              {report.reporter?.first_name && report.reporter?.last_name
                                ? `${report.reporter.first_name} ${report.reporter.last_name}`
                                : report.reporter?.email || 'مستخدم غير معروف'
                              }
                            </span>
                            {report.reporter?.verified === true && (
                              <VerificationBadge
                                isVerified={true}
                                size="sm"
                                className="scale-75"
                              />
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {report.reporter?.email || 'بريد إلكتروني غير متوفر'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
                            <span className="text-white font-medium text-xs">
                              {(report.reported_user?.first_name?.charAt(0) || '؟') + (report.reported_user?.last_name?.charAt(0) || '')}
                            </span>
                          </div>
                        </div>
                        <div className="mr-3">
                          <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                            <span>
                              {report.reported_user?.first_name && report.reported_user?.last_name
                                ? `${report.reported_user.first_name} ${report.reported_user.last_name}`
                                : report.reported_user?.email || 'مستخدم غير معروف'
                              }
                            </span>
                            {report.reported_user?.verified === true && (
                              <VerificationBadge
                                isVerified={true}
                                size="sm"
                                className="scale-75"
                              />
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {report.reported_user?.email || 'بريد إلكتروني غير متوفر'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(report.status)}
                        </div>
                        {report.review_status === 'in_progress' && report.reviewer && (
                          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                            <UserCheck className="w-4 h-4 text-blue-600" />
                            <div className="text-xs">
                              <div className="font-medium text-blue-800">
                                قيد المراجعة
                              </div>
                              <div className="text-blue-600">
                                بواسطة: {report.reviewer.first_name} {report.reviewer.last_name}
                              </div>
                              {report.reviewed_at && (
                                <div className="text-blue-500">
                                  منذ: {Math.floor((Date.now() - new Date(report.reviewed_at).getTime()) / (1000 * 60))} دقيقة
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="space-y-2">
                        {/* أولوية البلاغ */}
                        <div className="flex items-center gap-2">
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            report.priority >= 4
                              ? 'bg-red-100 text-red-800'
                              : report.priority >= 3
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}>
                            أولوية {report.priority}/5
                          </div>
                        </div>

                        {/* تاريخ الإنشاء */}
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{new Date(report.created_at).toLocaleDateString('en-GB')}</span>
                        </div>

                        {/* وقت مضى منذ الإنشاء */}
                        <div className="text-xs text-gray-500">
                          منذ {Math.floor((Date.now() - new Date(report.created_at).getTime()) / (1000 * 60 * 60))} ساعة
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {/* زر عرض التفاصيل - متاح دائماً */}
                        <button
                          onClick={() => handleViewReport(report)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="عرض التفاصيل"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* أزرار الإجراءات حسب حالة البلاغ */}
                        {report.status === 'pending' && report.review_status === 'not_assigned' && (
                          <button
                            onClick={() => handleAssignReportForReview(report.id)}
                            className="text-orange-600 hover:text-orange-900 transition-colors bg-orange-50 hover:bg-orange-100 px-2 py-1 rounded-lg"
                            title="تولي المراجعة"
                          >
                            <Search className="w-4 h-4" />
                          </button>
                        )}

                        {/* أزرار المراجع المخصص فقط */}
                        {report.review_status === 'in_progress' && report.reviewed_by === '27630074-bb7d-4c84-9922-45b21e699a8c' && (
                          <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                            <button
                              onClick={() => handleAcceptReport(report)}
                              className="text-green-600 hover:text-green-900 transition-colors bg-green-100 hover:bg-green-200 px-2 py-1 rounded"
                              title="قبول البلاغ"
                              disabled={actionLoading}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRejectReport(report)}
                              className="text-red-600 hover:text-red-900 transition-colors bg-red-100 hover:bg-red-200 px-2 py-1 rounded"
                              title="رفض البلاغ"
                              disabled={actionLoading}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                            <div className="text-xs text-green-700 font-medium">
                              مراجعتك
                            </div>
                          </div>
                        )}

                        {/* رسالة للأدمنز الآخرين */}
                        {report.review_status === 'in_progress' && report.reviewed_by !== '27630074-bb7d-4c84-9922-45b21e699a8c' && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                            <Shield className="w-4 h-4 text-amber-600" />
                            <div className="text-xs">
                              <div className="font-medium text-amber-800">
                                مخصص لمراجع آخر
                              </div>
                              <div className="text-amber-600">
                                {report.reviewer?.first_name} {report.reviewer?.last_name}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* نافذة عرض تفاصيل البلاغ */}
      {showReportModal && selectedReport && (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-70 backdrop-blur-lg flex items-center justify-center z-[999999] p-4 overflow-y-auto" style={{ margin: 0, width: '100vw', height: '100vh' }}>
          <div className="bg-white rounded-lg max-w-4xl w-full my-8 max-h-[calc(100vh-4rem)] overflow-hidden flex flex-col">
            {/* رأس النافذة */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">تفاصيل البلاغ</h2>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* محتوى النافذة */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-6">
                {/* معلومات أساسية */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">معلومات البلاغ</h3>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        <div>
                          <div className="text-sm text-gray-500">نوع البلاغ</div>
                          <div className="font-medium">{getReasonLabel(selectedReport.reason)}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Shield className="w-5 h-5 text-red-500" />
                        <div>
                          <div className="text-sm text-gray-500">مستوى الخطورة</div>
                          <div className={`font-medium px-2 py-1 rounded-full text-xs ${
                            selectedReport.severity === 'high'
                              ? 'bg-red-100 text-red-800'
                              : selectedReport.severity === 'medium'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}>
                            {selectedReport.severity === 'high' ? 'عالي' :
                             selectedReport.severity === 'medium' ? 'متوسط' : 'منخفض'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="text-sm text-gray-500">تاريخ البلاغ</div>
                          <div className="font-medium">
                            {new Date(selectedReport.created_at).toLocaleDateString('ar-EG')} -
                            {new Date(selectedReport.created_at).toLocaleTimeString('ar-EG')}
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-500 mb-2">الحالة الحالية</div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(selectedReport.status)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">الأطراف المعنية</h3>

                    <div className="space-y-3">
                      {/* المبلغ */}
                      <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-3 mb-2">
                          <User className="w-5 h-5 text-blue-600" />
                          <span className="font-medium text-blue-800">المبلغ</span>
                        </div>
                        <div className="text-sm">
                          <div className="font-medium text-gray-900 flex items-center gap-2">
                            <span>
                              {selectedReport.reporter?.first_name && selectedReport.reporter?.last_name
                                ? `${selectedReport.reporter.first_name} ${selectedReport.reporter.last_name}`
                                : selectedReport.reporter?.email || 'مستخدم غير معروف'
                              }
                            </span>
                            {selectedReport.reporter?.verified === true && (
                              <VerificationBadge
                                isVerified={true}
                                size="sm"
                                className="scale-75"
                              />
                            )}
                          </div>
                          <div className="text-gray-600">{selectedReport.reporter?.email || 'بريد إلكتروني غير متوفر'}</div>
                        </div>
                      </div>

                      {/* المبلغ عنه */}
                      <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                        <div className="flex items-center gap-3 mb-2">
                          <User className="w-5 h-5 text-red-600" />
                          <span className="font-medium text-red-800">المبلغ عنه</span>
                        </div>
                        <div className="text-sm">
                          <div className="font-medium text-gray-900 flex items-center gap-2">
                            <span>
                              {selectedReport.reported_user?.first_name && selectedReport.reported_user?.last_name
                                ? `${selectedReport.reported_user.first_name} ${selectedReport.reported_user.last_name}`
                                : selectedReport.reported_user?.email || 'مستخدم غير معروف'
                              }
                            </span>
                            {selectedReport.reported_user?.verified === true && (
                              <VerificationBadge
                                isVerified={true}
                                size="sm"
                                className="scale-75"
                              />
                            )}
                          </div>
                          <div className="text-gray-600">{selectedReport.reported_user?.email || 'بريد إلكتروني غير متوفر'}</div>
                        </div>
                      </div>

                      {/* المراجع */}
                      {selectedReport.reviewer && (
                        <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
                          <div className="flex items-center gap-3 mb-2">
                            <UserCheck className="w-5 h-5 text-green-600" />
                            <span className="font-medium text-green-800">المراجع</span>
                          </div>
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {selectedReport.reviewer.first_name} {selectedReport.reviewer.last_name}
                            </div>
                            <div className="text-gray-600">{selectedReport.reviewer.email}</div>
                            {selectedReport.reviewed_at && (
                              <div className="text-green-600 mt-1">
                                بدء المراجعة: {new Date(selectedReport.reviewed_at).toLocaleDateString('ar-EG')}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* وصف البلاغ */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">تفاصيل البلاغ</h3>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-700 leading-relaxed">
                      {selectedReport.description || 'لا يوجد وصف إضافي للبلاغ'}
                    </p>
                  </div>
                </div>

                {/* ملاحظات المراجعة */}
                {selectedReport.review_notes && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">ملاحظات المراجعة</h3>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-blue-800 leading-relaxed">
                        {selectedReport.review_notes}
                      </p>
                    </div>
                  </div>
                )}

                {/* معلومات إضافية */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">معلومات إضافية</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-500">معرف البلاغ</div>
                      <div className="font-mono text-xs text-gray-700">{selectedReport.id}</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-500">الأولوية</div>
                      <div className="font-medium">{selectedReport.priority}/5</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-500">آخر تحديث</div>
                      <div className="font-medium">
                        {new Date(selectedReport.updated_at).toLocaleDateString('ar-EG')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* تذييل النافذة */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة قبول البلاغ */}
      {selectedReport && (
        <AcceptReportModal
          isOpen={showAcceptModal}
          onClose={() => {
            setShowAcceptModal(false);
            setSelectedReport(null);
          }}
          onAccept={handleAcceptSubmit}
          reportId={selectedReport.id}
          reportedUser={`${selectedReport.reported_user?.first_name || ''} ${selectedReport.reported_user?.last_name || ''}`.trim() || selectedReport.reported_user?.email || 'مستخدم غير معروف'}
          loading={actionLoading}
        />
      )}

      {/* نافذة رفض البلاغ */}
      {selectedReport && (
        <RejectReportModal
          isOpen={showRejectModal}
          onClose={() => {
            setShowRejectModal(false);
            setSelectedReport(null);
          }}
          onReject={handleRejectSubmit}
          reportId={selectedReport.id}
          reportedUser={`${selectedReport.reported_user?.first_name || ''} ${selectedReport.reported_user?.last_name || ''}`.trim() || selectedReport.reported_user?.email || 'مستخدم غير معروف'}
          loading={actionLoading}
        />
      )}
    </div>
  );
};

export default ReportsTab;
