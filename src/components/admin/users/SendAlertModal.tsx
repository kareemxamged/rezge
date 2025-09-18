import React, { useState } from 'react';
import {
  X,
  Send,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Megaphone,
  Users,
  Clock,

  Loader2,
  Eye,

  Zap,
  Target,
  User
} from 'lucide-react';
import { alertsService, type CreateAlertData } from '../../../lib/alertsService';
import { useToast } from '../../ToastContainer';

interface SendAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAlertSent: () => void;
  targetUser?: {
    id: string;
    first_name?: string;
    last_name?: string;
  } | null;
}

interface AlertData {
  title: string;
  content: string;
  alert_type: 'info' | 'warning' | 'error' | 'success' | 'announcement';
  priority: number;
  show_as_popup: boolean;
  auto_dismiss_after: number | null;
  target_all_users: boolean;
  start_date: string;
  end_date: string;
}

const SendAlertModal: React.FC<SendAlertModalProps> = ({
  isOpen,
  onClose,
  onAlertSent,
  targetUser
}) => {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);

  const [alertData, setAlertData] = useState<AlertData>({
    title: '',
    content: '',
    alert_type: 'info',
    priority: 3,
    show_as_popup: true,
    auto_dismiss_after: null,
    target_all_users: !targetUser, // إذا كان هناك مستخدم محدد، فلا نستهدف الجميع
    start_date: new Date().toISOString().slice(0, 16),
    end_date: ''
  });

  // تحديث الاستهداف عند تغيير targetUser
  React.useEffect(() => {
    setAlertData(prev => ({
      ...prev,
      target_all_users: !targetUser // إذا كان هناك مستخدم محدد، فلا نستهدف الجميع
    }));
  }, [targetUser]);

  const alertTypes = [
    { value: 'info', label: 'معلومات', icon: Info, color: 'blue', bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
    { value: 'announcement', label: 'إعلان', icon: Megaphone, color: 'purple', bgColor: 'bg-purple-50', textColor: 'text-purple-600' },
    { value: 'warning', label: 'تحذير', icon: AlertTriangle, color: 'yellow', bgColor: 'bg-yellow-50', textColor: 'text-yellow-600' },
    { value: 'success', label: 'نجاح', icon: CheckCircle, color: 'green', bgColor: 'bg-green-50', textColor: 'text-green-600' },
    { value: 'error', label: 'خطأ', icon: XCircle, color: 'red', bgColor: 'bg-red-50', textColor: 'text-red-600' }
  ];

  const priorityLevels = [
    { value: 1, label: 'منخفض', color: 'gray', description: 'معلومات عامة' },
    { value: 2, label: 'عادي', color: 'blue', description: 'إشعارات اعتيادية' },
    { value: 3, label: 'متوسط', color: 'yellow', description: 'يتطلب انتباه' },
    { value: 4, label: 'عالي', color: 'orange', description: 'مهم ويحتاج إجراء' },
    { value: 5, label: 'عاجل', color: 'red', description: 'يتطلب إجراء فوري' }
  ];

  const autoDismissOptions = [
    { value: null, label: 'لا يختفي تلقائياً' },
    { value: 10, label: '10 ثواني' },
    { value: 30, label: '30 ثانية' },
    { value: 60, label: 'دقيقة واحدة' },
    { value: 300, label: '5 دقائق' },
    { value: 900, label: '15 دقيقة' }
  ];

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleClose = () => {
    if (!loading) {
      setAlertData({
        title: '',
        content: '',
        alert_type: 'info',
        priority: 3,
        show_as_popup: true,
        auto_dismiss_after: null,
        target_all_users: !targetUser, // إعادة تعيين الاستهداف الصحيح
        start_date: new Date().toISOString().slice(0, 16),
        end_date: ''
      });
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!alertData.title.trim() || !alertData.content.trim()) {
      showError('خطأ في البيانات', 'يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setLoading(true);

    try {
      // إعداد بيانات التنبيه للإرسال
      const createData: CreateAlertData = {
        title: alertData.title.trim(),
        content: alertData.content.trim(),
        alert_type: alertData.alert_type,
        priority: alertData.priority,
        show_as_popup: alertData.show_as_popup,
        auto_dismiss_after: alertData.auto_dismiss_after,
        target_all_users: targetUser ? false : alertData.target_all_users,
        target_user_ids: targetUser ? [targetUser.id] : [],
        start_date: alertData.start_date,
        end_date: alertData.end_date || null,
        metadata: {
          created_from: 'admin_panel',
          created_at: new Date().toISOString(),
          target_type: targetUser ? 'specific_user' : 'all_users',
          target_user_name: targetUser ? `${targetUser.first_name} ${targetUser.last_name}` : undefined
        }
      };

      // إرسال التنبيه باستخدام الخدمة
      await alertsService.createAlert(createData);

      const successTitle = targetUser
        ? 'تم إرسال التنبيه الفردي'
        : 'تم إرسال التنبيه الجماعي';

      const successMessage = targetUser
        ? `تم إرسال التنبيه لـ ${targetUser.first_name} ${targetUser.last_name} بنجاح! سيظهر له فوراً.`
        : 'تم إرسال التنبيه لجميع المستخدمين بنجاح! سيظهر للمستخدمين فوراً.';

      showSuccess(successTitle, successMessage);

      // إغلاق النافذة بعد النجاح
      onAlertSent();
      handleClose();

    } catch (err: any) {
      const errorMessage = err.message || 'حدث خطأ أثناء إرسال التنبيه. يرجى المحاولة مرة أخرى.';
      showError('فشل في إرسال التنبيه', errorMessage);
      console.error('Error sending alert:', err);
    } finally {
      setLoading(false);
    }
  };



  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 modal-backdrop backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={handleBackdropClick}
    >
      <div className="modal-container rounded-xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col"
           onClick={(e) => e.stopPropagation()}>
        
        {/* رأس النافذة */}
        <div className="modal-header flex items-center justify-between p-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Send className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold modal-text-primary">
                {targetUser
                  ? `إرسال تنبيه لـ ${targetUser.first_name} ${targetUser.last_name}`
                  : 'إرسال تنبيه للمستخدمين'
                }
              </h2>
              <p className="text-sm modal-text-secondary">
                {targetUser
                  ? 'إنشاء وإرسال تنبيه خاص لهذا المستخدم'
                  : 'إنشاء وإرسال تنبيه أو إعلان لجميع المستخدمين'
                }
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="modal-text-tertiary hover:modal-text-primary transition-colors p-2 hover:bg-gray-100 rounded-lg"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* محتوى النافذة */}
        <div className="modal-body flex-1 overflow-y-auto p-6">
          <form className="space-y-6">
            {/* العنوان */}
            <div>
              <label className="block text-sm font-medium modal-text-primary mb-2">
                عنوان التنبيه *
              </label>
              <input
                type="text"
                value={alertData.title}
                onChange={(e) => setAlertData(prev => ({ ...prev, title: e.target.value }))}
                className="modal-input w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="اكتب عنوان التنبيه..."
                maxLength={200}
                required
              />
              <p className="text-xs modal-text-tertiary mt-1">
                {alertData.title.length}/200 حرف
              </p>
            </div>

            {/* نوع التنبيه والأولوية */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* نوع التنبيه */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نوع التنبيه *
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {alertTypes.map((type) => {
                    const Icon = type.icon;
                    const isSelected = alertData.alert_type === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setAlertData(prev => ({ ...prev, alert_type: type.value as any }))}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                          isSelected 
                            ? `border-${type.color}-500 ${type.bgColor}` 
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isSelected ? type.textColor : 'text-gray-400'}`} />
                        <span className={`font-medium ${isSelected ? type.textColor : 'text-gray-700'}`}>
                          {type.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* مستوى الأولوية */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  مستوى الأولوية *
                </label>
                <div className="space-y-2">
                  {priorityLevels.map((level) => {
                    const isSelected = alertData.priority === level.value;
                    return (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => setAlertData(prev => ({ ...prev, priority: level.value }))}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                          isSelected 
                            ? `border-${level.color}-500 bg-${level.color}-50` 
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full bg-${level.color}-500`}></div>
                          <span className={`font-medium ${isSelected ? `text-${level.color}-700` : 'text-gray-700'}`}>
                            {level.label}
                          </span>
                        </div>
                        <span className={`text-xs ${isSelected ? `text-${level.color}-600` : 'text-gray-500'}`}>
                          {level.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* محتوى التنبيه */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                محتوى التنبيه *
              </label>
              <textarea
                value={alertData.content}
                onChange={(e) => setAlertData(prev => ({ ...prev, content: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={6}
                placeholder="اكتب محتوى التنبيه بالتفصيل..."
                maxLength={2000}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {alertData.content.length}/2000 حرف
              </p>
            </div>

            {/* إعدادات العرض */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                إعدادات العرض
              </h3>

              <div className="space-y-4">
                {/* عرض كـ popup */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-blue-500" />
                    <div>
                      <span className="text-sm font-medium text-gray-700">عرض كنافذة منبثقة</span>
                      <p className="text-xs text-gray-500">سيظهر التنبيه كنافذة منبثقة للمستخدمين</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAlertData(prev => ({ ...prev, show_as_popup: !prev.show_as_popup }))}
                    className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${
                      alertData.show_as_popup ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                    dir="ltr"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm mx-1 ${
                        alertData.show_as_popup ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* الاختفاء التلقائي */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الاختفاء التلقائي
                  </label>
                  <select
                    value={alertData.auto_dismiss_after || ''}
                    onChange={(e) => setAlertData(prev => ({
                      ...prev,
                      auto_dismiss_after: e.target.value ? parseInt(e.target.value) : null
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {autoDismissOptions.map((option) => (
                      <option key={option.value || 'null'} value={option.value || ''}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* الاستهداف */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    استهداف المستخدمين
                  </label>
                  <div className="flex items-center gap-4">
                    {targetUser ? (
                      // عرض المستخدم المحدد
                      <div className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-purple-500 bg-purple-50 text-purple-700">
                        <User className="w-4 h-4" />
                        <span>{targetUser.first_name} {targetUser.last_name}</span>
                        <span className="text-xs bg-purple-100 px-2 py-1 rounded-full">مستخدم محدد</span>
                      </div>
                    ) : (
                      // خيار جميع المستخدمين
                      <button
                        type="button"
                        onClick={() => setAlertData(prev => ({ ...prev, target_all_users: true }))}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                          alertData.target_all_users
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <Users className="w-4 h-4" />
                        جميع المستخدمين
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* إعدادات التوقيت */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                إعدادات التوقيت
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* تاريخ البداية */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    تاريخ البداية
                  </label>
                  <input
                    type="datetime-local"
                    value={alertData.start_date}
                    onChange={(e) => setAlertData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* تاريخ النهاية */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    تاريخ النهاية (اختياري)
                  </label>
                  <input
                    type="datetime-local"
                    value={alertData.end_date}
                    onChange={(e) => setAlertData(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min={alertData.start_date}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    اتركه فارغاً إذا كنت لا تريد تاريخ انتهاء
                  </p>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* أزرار التحكم */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 flex-shrink-0 bg-gray-50">
          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
            disabled={loading}
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !alertData.title.trim() || !alertData.content.trim()}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الإرسال...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                إرسال التنبيه
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SendAlertModal;
