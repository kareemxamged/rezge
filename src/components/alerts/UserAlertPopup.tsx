import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Megaphone,
  EyeOff,
  Clock,
  Sparkles
} from 'lucide-react';
import { alertsService, type AlertWithStatus } from '../../lib/alertsService';

interface UserAlertPopupProps {
  alert: AlertWithStatus;
  onDismiss: () => void;
  onHide: () => void;
  onTemporaryClose: () => void; // إغلاق مؤقت لزر X
}

const UserAlertPopup: React.FC<UserAlertPopupProps> = ({
  alert,
  onDismiss,
  onHide,
  onTemporaryClose
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [autoCloseTimer, setAutoCloseTimer] = useState<number | null>(null);

  // أيقونات ومعلومات أنواع التنبيهات
  const alertTypeConfig = {
    info: {
      icon: Info,
      bgGradient: 'from-blue-500 to-cyan-500',
      bgLight: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
      iconColor: 'text-blue-600',
      glowColor: 'shadow-blue-500/25'
    },
    announcement: {
      icon: Megaphone,
      bgGradient: 'from-purple-500 to-pink-500',
      bgLight: 'bg-purple-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-800',
      iconColor: 'text-purple-600',
      glowColor: 'shadow-purple-500/25'
    },
    warning: {
      icon: AlertTriangle,
      bgGradient: 'from-yellow-500 to-orange-500',
      bgLight: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-800',
      iconColor: 'text-yellow-600',
      glowColor: 'shadow-yellow-500/25'
    },
    success: {
      icon: CheckCircle,
      bgGradient: 'from-green-500 to-emerald-500',
      bgLight: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
      iconColor: 'text-green-600',
      glowColor: 'shadow-green-500/25'
    },
    error: {
      icon: XCircle,
      bgGradient: 'from-red-500 to-rose-500',
      bgLight: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
      iconColor: 'text-red-600',
      glowColor: 'shadow-red-500/25'
    }
  };

  const config = alertTypeConfig[alert.alert_type];
  const Icon = config.icon;

  // تأثير الظهور
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // تأثير الاختفاء التلقائي - مرة واحدة فقط عند تحميل التنبيه
  useEffect(() => {
    // فقط إذا كان التنبيه مضبوط للاختفاء التلقائي
    if (alert.auto_dismiss_after && alert.auto_dismiss_after > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, alert.auto_dismiss_after * 1000);

      setAutoCloseTimer(alert.auto_dismiss_after);

      // عداد تنازلي
      const countdownInterval = setInterval(() => {
        setAutoCloseTimer(prev => {
          if (prev && prev > 1) {
            return prev - 1;
          } else {
            clearInterval(countdownInterval);
            return null;
          }
        });
      }, 1000);

      return () => {
        clearTimeout(timer);
        clearInterval(countdownInterval);
      };
    } else {
      // لا تستدعي setAutoCloseTimer هنا لتجنب re-render
      // setAutoCloseTimer(null);
    }
  }, [alert.id]); // فقط alert.id، وإزالة alert.auto_dismiss_after

  // تسجيل المشاهدة عند الظهور - تم تعطيله مؤقتاً لحل مشكلة الحلقة اللا نهائية
  // useEffect(() => {
  //   if (!alert.is_viewed) {
  //     const timer = setTimeout(() => {
  //       alertsService.updateAlertStatus(alert.id, { is_viewed: true })
  //         .catch(console.error);
  //     }, 100);

  //     return () => clearTimeout(timer);
  //   }
  // }, [alert.id]);

  // إغلاق مؤقت (زر X) - لا يحفظ في قاعدة البيانات
  const handleTemporaryClose = () => {
    if (isClosing) return;

    setIsClosing(true);
    setTimeout(() => {
      onTemporaryClose();
    }, 300);
  };

  // إغلاق دائم (زر "فهمت") - يحفظ is_dismissed = true
  const handleDismiss = async () => {
    if (isClosing) return; // منع التنفيذ المتعدد

    setIsClosing(true);
    try {
      await alertsService.updateAlertStatus(alert.id, { is_dismissed: true });
      setTimeout(() => {
        onDismiss();
      }, 300);
    } catch (error) {
      console.error('Error dismissing alert:', error);
      // حتى في حالة الخطأ، نغلق التنبيه لتجنب الحلقة اللا نهائية
      setTimeout(() => {
        onDismiss();
      }, 300);
    }
  };

  // إخفاء دائم (زر "عدم عرض مجدداً") - يحفظ is_dismissed = true و is_hidden = true
  const handleHide = async () => {
    if (isClosing) return; // منع التنفيذ المتعدد

    setIsClosing(true);
    try {
      await alertsService.updateAlertStatus(alert.id, {
        is_dismissed: true,
        is_hidden: true
      });
      setTimeout(() => {
        onHide();
      }, 300);
    } catch (error) {
      console.error('Error hiding alert:', error);
      // حتى في حالة الخطأ، نخفي التنبيه لتجنب الحلقة اللا نهائية
      setTimeout(() => {
        onHide();
      }, 300);
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 5: return 'عاجل';
      case 4: return 'مهم';
      case 3: return 'متوسط';
      case 2: return 'عادي';
      case 1: return 'منخفض';
      default: return 'عادي';
    }
  };



  return (
    <div className={`fixed inset-0 z-[10000] flex items-center justify-center p-4 transition-all duration-300 ${
      isVisible && !isClosing ? 'bg-black bg-opacity-50 backdrop-blur-sm' : 'bg-transparent'
    }`}>
      <div className={`
        relative max-w-lg w-full transform transition-all duration-500 ease-out
        ${isVisible && !isClosing 
          ? 'translate-y-0 opacity-100 scale-100' 
          : 'translate-y-8 opacity-0 scale-95'
        }
      `}>
        {/* التأثير المتوهج */}
        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${config.bgGradient} opacity-20 blur-xl ${config.glowColor} shadow-2xl`}></div>
        
        {/* المحتوى الرئيسي */}
        <div className={`
          relative bg-white rounded-2xl border-2 ${config.borderColor} 
          shadow-2xl ${config.glowColor} overflow-hidden
        `}>
          {/* الشريط العلوي المتدرج */}
          <div className={`h-2 bg-gradient-to-r ${config.bgGradient}`}></div>
          
          {/* رأس التنبيه */}
          <div className={`${config.bgLight} p-6 border-b ${config.borderColor}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {/* أيقونة التنبيه */}
                <div className={`
                  w-12 h-12 rounded-xl bg-gradient-to-br ${config.bgGradient} 
                  flex items-center justify-center shadow-lg
                `}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                
                <div className="flex-1">
                  <h3 className={`text-xl font-bold ${config.textColor}`}>
                    {alert.title}
                  </h3>

                  {/* مؤشر الأولوية فقط للتنبيهات المهمة */}
                  {alert.priority > 3 && (
                    <div className={`
                      inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium mt-2
                      ${alert.priority === 5
                        ? 'bg-red-100 text-red-700'
                        : 'bg-orange-100 text-orange-700'
                      }
                    `}>
                      <Sparkles className="w-3 h-3" />
                      {getPriorityLabel(alert.priority)}
                    </div>
                  )}
                </div>
              </div>
              
              {/* زر الإغلاق المؤقت */}
              <button
                onClick={handleTemporaryClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                title="إغلاق مؤقت - سيظهر التنبيه مرة أخرى لاحقاً"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* محتوى التنبيه */}
          <div className="p-6">
            <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
              {alert.content}
            </div>
            
            {/* عداد الاختفاء التلقائي */}
            {autoCloseTimer && autoCloseTimer > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>سيختفي التنبيه تلقائياً خلال {autoCloseTimer} ثانية</span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                  <div 
                    className={`h-1 rounded-full bg-gradient-to-r ${config.bgGradient} transition-all duration-1000`}
                    style={{ 
                      width: `${((alert.auto_dismiss_after! - autoCloseTimer) / alert.auto_dismiss_after!) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>
            )}
          </div>
          
          {/* أزرار التحكم */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleHide}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <EyeOff className="w-4 h-4" />
              <span className="text-sm">عدم عرض مجدداً</span>
            </button>
            
            <button
              onClick={handleDismiss}
              className={`
                flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all
                bg-gradient-to-r ${config.bgGradient} text-white 
                hover:shadow-lg hover:scale-105 active:scale-95
              `}
            >
              <CheckCircle className="w-4 h-4" />
              <span>فهمت</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserAlertPopup;
