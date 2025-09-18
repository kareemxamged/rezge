import React, { useState, useEffect } from 'react';
import {
  IdCard,
  Calendar,
  User,
  FileText,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Ban,
  Pause,
  RotateCcw,
  Clock,
  MapPin
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { verificationService } from '../../../lib/verificationService';
import { useToast } from '../../ToastContainer';
import type { User as UserType } from '../../../lib/adminUsersService';
import ConfirmationModal from './ConfirmationModal';

interface UserVerificationTabProps {
  userId: string;
  user: UserType;
  onUserUpdate?: (updatedFields: Partial<UserType>) => void;
}

interface VerificationRequest {
  id: string;
  full_name_arabic: string;
  full_name_english: string;
  birth_date: string;
  nationality: string;
  document_type: string;
  document_number: string;
  document_issue_date: string;
  document_expiry_date: string;
  issuing_authority: string;
  document_front_image_url: string;
  document_back_image_url: string;
  selfie_image_url: string;
  status: string;
  reviewed_by: string;
  reviewed_at: string;
  admin_notes: string;
  rejection_reason: string;
  created_at: string;
  updated_at: string;
}

const UserVerificationTab: React.FC<UserVerificationTabProps> = ({ userId, user, onUserUpdate }) => {
  const [verificationData, setVerificationData] = useState<VerificationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  // حالة النوافذ المنبثقة
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);

  // جلب بيانات التوثيق
  const fetchVerificationData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching verification data:', error);
        return;
      }

      setVerificationData(data);
    } catch (error) {
      console.error('Error in fetchVerificationData:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerificationData();
  }, [userId]);

  // إلغاء التوثيق
  const handleCancelVerification = async () => {
    try {
      setActionLoading(true);

      // تحديث حالة المستخدم
      const { error: userError } = await supabase
        .from('users')
        .update({ verified: false })
        .eq('id', userId);

      if (userError) {
        console.error('Error updating user:', userError);
        showError('خطأ', `فشل في تحديث حالة المستخدم: ${userError.message}`);
        return;
      }

      // تحديث طلب التوثيق إذا وجد
      if (verificationData) {
        const { error: requestError } = await supabase
          .from('verification_requests')
          .update({
            status: 'cancelled',
            admin_notes: 'تم إلغاء التوثيق من قبل الإدارة',
            reviewed_at: new Date().toISOString()
          })
          .eq('id', verificationData.id);

        if (requestError) {
          console.error('Error updating verification request:', requestError);
          showError('خطأ', `فشل في تحديث طلب التوثيق: ${requestError.message}`);
          return;
        }
      }

      showSuccess('تم الإلغاء', 'تم إلغاء توثيق المستخدم بنجاح');
      setShowCancelModal(false);
      fetchVerificationData();

      // تحديث حالة المستخدم في المكون الأب
      onUserUpdate?.({ verified: false });
    } catch (error) {
      console.error('Error cancelling verification:', error);
      showError('خطأ', 'حدث خطأ في إلغاء التوثيق');
    } finally {
      setActionLoading(false);
    }
  };

  // تعليق التوثيق
  const handleSuspendVerification = async (reason?: string) => {
    if (!verificationData || !reason) return;

    try {
      setActionLoading(true);

      // تحديث حالة المستخدم
      const { error: userError } = await supabase
        .from('users')
        .update({ verified: false })
        .eq('id', userId);

      if (userError) {
        console.error('Error updating user:', userError);
        showError('خطأ', `فشل في تحديث حالة المستخدم: ${userError.message}`);
        return;
      }

      // تحديث طلب التوثيق
      const { error: requestError } = await supabase
        .from('verification_requests')
        .update({
          status: 'suspended',
          admin_notes: `تم تعليق التوثيق: ${reason}`,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', verificationData.id);

      if (requestError) {
        console.error('Error updating verification request:', requestError);
        showError('خطأ', `فشل في تحديث طلب التوثيق: ${requestError.message}`);
        return;
      }

      showSuccess('تم التعليق', 'تم تعليق توثيق المستخدم بنجاح');
      setShowSuspendModal(false);
      fetchVerificationData();

      // تحديث حالة المستخدم في المكون الأب
      onUserUpdate?.({ verified: false });
    } catch (error) {
      console.error('Error suspending verification:', error);
      showError('خطأ', 'حدث خطأ في تعليق التوثيق');
    } finally {
      setActionLoading(false);
    }
  };

  // إعادة تفعيل التوثيق
  const handleReactivateVerification = async () => {
    if (!verificationData) return;

    try {
      setActionLoading(true);

      // تحديث حالة المستخدم
      const { error: userError } = await supabase
        .from('users')
        .update({ verified: true })
        .eq('id', userId);

      if (userError) {
        console.error('Error updating user:', userError);
        showError('خطأ', `فشل في تحديث حالة المستخدم: ${userError.message}`);
        return;
      }

      // تحديث طلب التوثيق
      const { error: requestError } = await supabase
        .from('verification_requests')
        .update({
          status: 'approved',
          admin_notes: 'تم إعادة تفعيل التوثيق من قبل الإدارة',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', verificationData.id);

      if (requestError) {
        console.error('Error updating verification request:', requestError);
        showError('خطأ', `فشل في تحديث طلب التوثيق: ${requestError.message}`);
        return;
      }

      showSuccess('تم التفعيل', 'تم إعادة تفعيل توثيق المستخدم بنجاح');
      setShowReactivateModal(false);
      fetchVerificationData();

      // تحديث حالة المستخدم في المكون الأب
      onUserUpdate?.({ verified: true });
    } catch (error) {
      console.error('Error reactivating verification:', error);
      showError('خطأ', 'حدث خطأ في إعادة تفعيل التوثيق');
    } finally {
      setActionLoading(false);
    }
  };

  // عرض الصورة في نافذة جديدة
  const viewImage = (imageUrl: string, title: string) => {
    window.open(imageUrl, '_blank');
  };

  // تحميل الصورة
  const downloadImage = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading image:', error);
      showError('خطأ', 'فشل في تحميل الصورة');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600 bg-green-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      case 'cancelled':
        return 'text-gray-600 bg-gray-100';
      case 'suspended':
        return 'text-orange-600 bg-orange-100';
      case 'under_review':
        return 'text-blue-600 bg-blue-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'مقبول';
      case 'rejected':
        return 'مرفوض';
      case 'cancelled':
        return 'ملغي';
      case 'suspended':
        return 'معلق';
      case 'under_review':
        return 'تحت المراجعة';
      case 'pending':
        return 'في الانتظار';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="mr-3 text-gray-600">جاري تحميل بيانات التوثيق...</span>
      </div>
    );
  }

  if (!verificationData) {
    // إذا كان المستخدم موثق ولكن لا توجد بيانات في verification_requests
    if (user.verified) {
      return (
        <div className="space-y-6">
          {/* حالة التوثيق وأزرار التحكم */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <IdCard className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">حالة التوثيق</h3>
              </div>
              <span className="px-3 py-1 rounded-full text-sm font-medium text-green-600 bg-green-100">
                موثق
              </span>
            </div>

            {/* أزرار التحكم */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={actionLoading}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Ban className="w-4 h-4" />
                إلغاء التوثيق
              </button>
            </div>
          </div>

          {/* رسالة توضيحية */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">مستخدم موثق بدون بيانات تفصيلية</h4>
                <p className="text-sm text-blue-700">
                  هذا المستخدم موثق في النظام ولكن لا توجد بيانات تفصيلية للتوثيق في قاعدة البيانات.
                  قد يكون تم توثيقه من خلال نظام قديم أو تم حذف بيانات التوثيق.
                </p>
              </div>
            </div>
          </div>

          {/* نوافذ التأكيد */}
          <ConfirmationModal
            isOpen={showCancelModal}
            onClose={() => setShowCancelModal(false)}
            onConfirm={handleCancelVerification}
            title="إلغاء التوثيق"
            message="هل أنت متأكد من إلغاء توثيق هذا المستخدم؟ هذا الإجراء سيؤثر على حالة التوثيق للمستخدم."
            type="cancel"
            loading={actionLoading}
          />
        </div>
      );
    }

    // إذا لم يكن المستخدم موثق ولا توجد بيانات
    return (
      <div className="text-center py-8">
        <IdCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">لا توجد بيانات توثيق لهذا المستخدم</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* حالة التوثيق وأزرار التحكم */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <IdCard className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">حالة التوثيق</h3>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(verificationData.status)}`}>
            {getStatusText(verificationData.status)}
          </span>
        </div>

        {/* أزرار التحكم */}
        <div className="flex gap-2 flex-wrap">
          {verificationData.status === 'approved' && (
            <>
              <button
                onClick={() => setShowSuspendModal(true)}
                disabled={actionLoading}
                className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                <Pause className="w-4 h-4" />
                تعليق التوثيق
              </button>
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={actionLoading}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Ban className="w-4 h-4" />
                إلغاء التوثيق
              </button>
            </>
          )}

          {(verificationData.status === 'suspended' || verificationData.status === 'cancelled') && (
            <button
              onClick={() => setShowReactivateModal(true)}
              disabled={actionLoading}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              إعادة تفعيل التوثيق
            </button>
          )}
        </div>
      </div>

      {/* معلومات الهوية */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">معلومات الهوية</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <User className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-sm text-gray-500">الاسم بالعربية</div>
              <div className="font-medium">{verificationData.full_name_arabic}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <User className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-sm text-gray-500">الاسم بالإنجليزية</div>
              <div className="font-medium">{verificationData.full_name_english}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-sm text-gray-500">تاريخ الميلاد</div>
              <div className="font-medium">{new Date(verificationData.birth_date).toLocaleDateString('en-US')}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <MapPin className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-sm text-gray-500">الجنسية</div>
              <div className="font-medium">{verificationData.nationality}</div>
            </div>
          </div>
        </div>
      </div>

      {/* معلومات المستند */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">معلومات المستند</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <IdCard className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-sm text-gray-500">نوع المستند</div>
              <div className="font-medium">
                {verificationData.document_type === 'national_id' ? 'هوية وطنية' : 
                 verificationData.document_type === 'passport' ? 'جواز سفر' : 
                 verificationData.document_type === 'residence_permit' ? 'إقامة' : 
                 verificationData.document_type}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <FileText className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-sm text-gray-500">رقم المستند</div>
              <div className="font-medium">{verificationData.document_number}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-sm text-gray-500">تاريخ الإصدار</div>
              <div className="font-medium">{new Date(verificationData.document_issue_date).toLocaleDateString('en-US')}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-sm text-gray-500">تاريخ الانتهاء</div>
              <div className="font-medium">{new Date(verificationData.document_expiry_date).toLocaleDateString('en-US')}</div>
            </div>
          </div>
          
          {verificationData.issuing_authority && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg md:col-span-2">
              <FileText className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-sm text-gray-500">جهة الإصدار</div>
                <div className="font-medium">{verificationData.issuing_authority}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* المستندات المرفقة */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">المستندات المرفقة</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* صورة المستند الأمامية */}
          {verificationData.document_front_image_url && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">الوجه الأمامي للمستند</h4>
              <div className="aspect-video bg-gray-200 rounded-lg mb-3 overflow-hidden">
                <img
                  src={verificationData.document_front_image_url}
                  alt="الوجه الأمامي للمستند"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500"><span>لا يمكن تحميل الصورة</span></div>';
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => viewImage(verificationData.document_front_image_url, 'الوجه الأمامي للمستند')}
                  className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Eye className="w-4 h-4" />
                  عرض
                </button>
                <button
                  onClick={() => downloadImage(verificationData.document_front_image_url, 'document_front.jpg')}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  تحميل
                </button>
              </div>
            </div>
          )}

          {/* صورة المستند الخلفية */}
          {verificationData.document_back_image_url && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">الوجه الخلفي للمستند</h4>
              <div className="aspect-video bg-gray-200 rounded-lg mb-3 overflow-hidden">
                <img
                  src={verificationData.document_back_image_url}
                  alt="الوجه الخلفي للمستند"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500"><span>لا يمكن تحميل الصورة</span></div>';
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => viewImage(verificationData.document_back_image_url, 'الوجه الخلفي للمستند')}
                  className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Eye className="w-4 h-4" />
                  عرض
                </button>
                <button
                  onClick={() => downloadImage(verificationData.document_back_image_url, 'document_back.jpg')}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  تحميل
                </button>
              </div>
            </div>
          )}

          {/* صورة السيلفي */}
          {verificationData.selfie_image_url && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">صورة السيلفي</h4>
              <div className="aspect-video bg-gray-200 rounded-lg mb-3 overflow-hidden">
                <img
                  src={verificationData.selfie_image_url}
                  alt="صورة السيلفي"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500"><span>لا يمكن تحميل الصورة</span></div>';
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => viewImage(verificationData.selfie_image_url, 'صورة السيلفي')}
                  className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Eye className="w-4 h-4" />
                  عرض
                </button>
                <button
                  onClick={() => downloadImage(verificationData.selfie_image_url, 'selfie.jpg')}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  تحميل
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* معلومات المراجعة */}
      {(verificationData.reviewed_at || verificationData.admin_notes) && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">معلومات المراجعة</h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            {verificationData.reviewed_at && (
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">تاريخ المراجعة</div>
                  <div className="font-medium">{new Date(verificationData.reviewed_at).toLocaleString('en-US')}</div>
                </div>
              </div>
            )}
            
            {verificationData.admin_notes && (
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <div className="text-sm text-gray-500">ملاحظات الإدارة</div>
                  <div className="font-medium">{verificationData.admin_notes}</div>
                </div>
              </div>
            )}
            
            {verificationData.rejection_reason && (
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-400 mt-1" />
                <div>
                  <div className="text-sm text-gray-500">سبب الرفض</div>
                  <div className="font-medium text-red-600">{verificationData.rejection_reason}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* معلومات الطلب */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">معلومات الطلب</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-sm text-gray-500">تاريخ الإرسال</div>
              <div className="font-medium">{new Date(verificationData.created_at).toLocaleString('en-US')}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Clock className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-sm text-gray-500">آخر تحديث</div>
              <div className="font-medium">{new Date(verificationData.updated_at).toLocaleString('en-US')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* نوافذ التأكيد */}
      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelVerification}
        title="إلغاء التوثيق"
        message="هل أنت متأكد من إلغاء توثيق هذا المستخدم؟ هذا الإجراء سيؤثر على حالة التوثيق للمستخدم."
        type="cancel"
        loading={actionLoading}
      />

      <ConfirmationModal
        isOpen={showSuspendModal}
        onClose={() => setShowSuspendModal(false)}
        onConfirm={handleSuspendVerification}
        title="تعليق التوثيق"
        message="سيتم تعليق توثيق هذا المستخدم مؤقتاً. يمكنك إعادة تفعيله لاحقاً."
        type="suspend"
        loading={actionLoading}
      />

      <ConfirmationModal
        isOpen={showReactivateModal}
        onClose={() => setShowReactivateModal(false)}
        onConfirm={handleReactivateVerification}
        title="إعادة تفعيل التوثيق"
        message="هل أنت متأكد من إعادة تفعيل توثيق هذا المستخدم؟"
        type="reactivate"
        loading={actionLoading}
      />
    </div>
  );
};

export default UserVerificationTab;
