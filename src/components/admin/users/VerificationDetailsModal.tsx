import React, { useState } from 'react';
import {
  X,
  User,
  FileText,
  Shield,
  Check,
  XCircle,
  Eye,
  Copy,
  RotateCcw
} from 'lucide-react';
import { useToast } from '../../ToastContainer';
import type { VerificationRequest } from '../../../lib/verificationService';

interface VerificationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: VerificationRequest | null;
  onApprove?: (requestId: string, notes?: string) => void;
  onReject?: (requestId: string, reason: string, notes?: string) => void;
  onReviewAgain?: (requestId: string, notes?: string) => void;
}

const VerificationDetailsModal: React.FC<VerificationDetailsModalProps> = ({
  isOpen,
  onClose,
  request,
  onApprove,
  onReject,
  onReviewAgain
}) => {
  const { showSuccess, showError } = useToast();

  // حالة النوافذ المنبثقة
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showReviewAgainModal, setShowReviewAgainModal] = useState(false);
  const [approveNotes, setApproveNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [reviewAgainNotes, setReviewAgainNotes] = useState('');

  if (!isOpen || !request) return null;

  // دالة نسخ رقم الطلب
  const copyRequestId = async () => {
    try {
      await navigator.clipboard.writeText(request.id);
      showSuccess('تم النسخ', 'تم نسخ رقم الطلب إلى الحافظة');
    } catch (error) {
      showError('خطأ', 'فشل في نسخ رقم الطلب');
    }
  };

  // دالة تنسيق التاريخ (ميلادي)
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
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

  // معالج الموافقة
  const handleApprove = () => {
    if (onApprove) {
      onApprove(request.id, approveNotes);
      setShowApproveModal(false);
      setApproveNotes('');
      onClose();
    }
  };

  // معالج الرفض
  const handleReject = () => {
    if (!rejectReason.trim()) {
      showError('خطأ', 'يرجى كتابة سبب الرفض');
      return;
    }

    if (onReject) {
      onReject(request.id, rejectReason, rejectNotes);
      setShowRejectModal(false);
      setRejectReason('');
      setRejectNotes('');
      onClose();
    }
  };

  // معالج إعادة النظر
  const handleReviewAgain = () => {
    if (onReviewAgain) {
      onReviewAgain(request.id, reviewAgainNotes);
      setShowReviewAgainModal(false);
      setReviewAgainNotes('');
      onClose();
    }
  };

  // معالج عرض الصورة في نافذة جديدة
  const handleViewImage = (imageUrl: string, title: string) => {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { margin: 0; padding: 20px; background: #f5f5f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
              img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            </style>
          </head>
          <body>
            <img src="${imageUrl}" alt="${title}" />
          </body>
        </html>
      `);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[9999] overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div
            className="fixed inset-0 transition-opacity modal-backdrop backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="inline-block w-full max-w-6xl my-8 overflow-hidden text-right align-middle transition-all transform modal-container rounded-2xl">
            <div className="sticky top-0 z-10 bg-white flex items-center justify-between p-6 border-b border-gray-200 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">تفاصيل طلب التوثيق</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-gray-500 text-sm">رقم الطلب:</span>
                    <button
                      onClick={copyRequestId}
                      className="text-blue-600 hover:text-blue-800 text-sm font-mono bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors flex items-center gap-1"
                      title="انقر لنسخ رقم الطلب"
                    >
                      <span className="select-all">{request.id}</span>
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <User className="w-5 h-5" />
                      المعلومات الشخصية
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">الاسم بالعربية</label>
                        <p className="text-gray-900">{request.full_name_arabic}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">الاسم بالإنجليزية</label>
                        <p className="text-gray-900">{request.full_name_english}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">تاريخ الميلاد</label>
                        <p className="text-gray-900">{formatDate(request.birth_date)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">الجنسية</label>
                        <p className="text-gray-900">{request.nationality}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      معلومات المستند
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">نوع المستند</label>
                        <p className="text-gray-900">
                          {request.document_type === 'passport' ? 'جواز سفر' : 'بطاقة هوية'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">رقم المستند</label>
                        <p className="text-gray-900">{request.document_number}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">تاريخ الإصدار</label>
                        <p className="text-gray-900">{formatDate(request.document_issue_date)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">تاريخ الانتهاء</label>
                        <p className="text-gray-900">{formatDate(request.document_expiry_date)}</p>
                      </div>
                      {request.issuing_authority && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">جهة الإصدار</label>
                          <p className="text-gray-900">{request.issuing_authority}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      حالة الطلب
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">الحالة الحالية</label>
                        <div className="mt-1">
                          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(request.status)}`}>
                            {getStatusText(request.status)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">تاريخ الإرسال</label>
                        <p className="text-gray-900">{formatDate(request.created_at)}</p>
                      </div>
                      {request.reviewed_at && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">تاريخ المراجعة</label>
                          <p className="text-gray-900">{formatDate(request.reviewed_at)}</p>
                        </div>
                      )}
                      {request.admin_notes && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">ملاحظات الإدارة</label>
                          <p className="text-gray-900">{request.admin_notes}</p>
                        </div>
                      )}
                      {request.rejection_reason && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">سبب الرفض</label>
                          <p className="text-red-600">{request.rejection_reason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  {request.document_front_image_url && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">صورة المستند - الوجه الأمامي</h3>
                      <div className="relative">
                        <img
                          src={request.document_front_image_url}
                          alt="صورة المستند الأمامية"
                          className="w-full h-48 object-cover rounded-lg border"
                        />
                        <button
                          onClick={() => handleViewImage(request.document_front_image_url!, 'صورة المستند - الوجه الأمامي')}
                          className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  {request.document_back_image_url && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">صورة المستند - الوجه الخلفي</h3>
                      <div className="relative">
                        <img
                          src={request.document_back_image_url}
                          alt="صورة المستند الخلفية"
                          className="w-full h-48 object-cover rounded-lg border"
                        />
                        <button
                          onClick={() => handleViewImage(request.document_back_image_url!, 'صورة المستند - الوجه الخلفي')}
                          className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  {request.selfie_image_url && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">صورة السيلفي</h3>
                      <div className="relative">
                        <img
                          src={request.selfie_image_url}
                          alt="صورة السيلفي"
                          className="w-full h-48 object-cover rounded-lg border"
                        />
                        <button
                          onClick={() => handleViewImage(request.selfie_image_url!, 'صورة السيلفي')}
                          className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end border-t">
              {/* زر إعادة النظر - يظهر للطلبات المقبولة أو المرفوضة */}
              {(request.status === 'approved' || request.status === 'rejected') && (
                <button
                  onClick={() => setShowReviewAgainModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  إعادة النظر
                </button>
              )}

              {/* أزرار القبول والرفض - تظهر للطلبات المعلقة أو قيد المراجعة */}
              {(request.status === 'pending' || request.status === 'under_review') && (
                <>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    رفض الطلب
                  </button>
                  <button
                    onClick={() => setShowApproveModal(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    قبول الطلب
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* نافذة قبول الطلب */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">قبول طلب التوثيق</h3>
            <p className="text-gray-600 mb-4">
              هل أنت متأكد من قبول طلب التوثيق لهذا المستخدم؟
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ملاحظات إضافية (اختياري)
              </label>
              <textarea
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                placeholder="أضف أي ملاحظات إضافية..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setApproveNotes('');
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleApprove}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                قبول الطلب
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة رفض الطلب */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">رفض طلب التوثيق</h3>
            <p className="text-gray-600 mb-4">
              يرجى تحديد سبب رفض طلب التوثيق:
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                سبب الرفض <span className="text-red-500">*</span>
              </label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">اختر سبب الرفض</option>
                <option value="مستندات غير واضحة">مستندات غير واضحة</option>
                <option value="مستندات مزورة">مستندات مزورة</option>
                <option value="بيانات غير مطابقة">بيانات غير مطابقة</option>
                <option value="صورة سيلفي غير واضحة">صورة سيلفي غير واضحة</option>
                <option value="مستندات منتهية الصلاحية">مستندات منتهية الصلاحية</option>
                <option value="أخرى">أخرى</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ملاحظات إضافية (اختياري)
              </label>
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="أضف أي ملاحظات إضافية..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setRejectNotes('');
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                رفض الطلب
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إعادة النظر */}
      {showReviewAgainModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">إعادة النظر في طلب التوثيق</h3>
            <p className="text-gray-600 mb-4">
              هل أنت متأكد من إعادة النظر في هذا الطلب؟ سيتم إرجاع الطلب إلى حالة "قيد المراجعة" وإزالة حالة التوثيق من الحساب.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ملاحظات إضافية (اختياري)
              </label>
              <textarea
                value={reviewAgainNotes}
                onChange={(e) => setReviewAgainNotes(e.target.value)}
                placeholder="أضف سبب إعادة النظر أو أي ملاحظات..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowReviewAgainModal(false);
                  setReviewAgainNotes('');
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleReviewAgain}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                إعادة النظر
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VerificationDetailsModal;
