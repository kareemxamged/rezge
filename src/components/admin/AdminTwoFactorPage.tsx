import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Mail, RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { adminTwoFactorService } from '../../lib/adminTwoFactorService';
import { separateAdminAuth } from '../../lib/separateAdminAuth';

interface LocationState {
  adminId: string;
  email: string;
  username: string;
}

const AdminTwoFactorPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  // التحقق من وجود البيانات المطلوبة
  useEffect(() => {
    if (!state?.adminId || !state?.email) {
      navigate('/admin/login', { replace: true });
    }
  }, [state, navigate]);

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [retryAfter, setRetryAfter] = useState(0);
  const [developmentCode, setDevelopmentCode] = useState<string | null>(null);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // إرسال كود التحقق عند تحميل الصفحة
  useEffect(() => {
    if (state?.adminId && state?.email) {
      sendInitialCode();
    }
  }, [state]);

  // عداد الوقت المتبقي
  useEffect(() => {
    if (retryAfter > 0) {
      const timer = setInterval(() => {
        setRetryAfter(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [retryAfter]);

  const sendInitialCode = async () => {
    try {
      const result = await adminTwoFactorService.sendVerificationCode(state.adminId, state.email);
      if (result.success) {
        setSuccess('تم إرسال كود التحقق إلى بريدك الإلكتروني');
        setRetryAfter(result.retryAfter || 60);
        // حفظ الرمز التطويري إذا كان متوفراً
        if (result.developmentCode) {
          setDevelopmentCode(result.developmentCode);
        }
      } else {
        setError(result.error || 'فشل في إرسال كود التحقق');
        setRetryAfter(result.retryAfter || 0);
      }
    } catch (error) {
      setError('حدث خطأ في إرسال كود التحقق');
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return; // منع إدخال أكثر من رقم واحد
    if (!/^\d*$/.test(value)) return; // السماح بالأرقام فقط

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    // الانتقال للحقل التالي تلقائياً
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // التحقق التلقائي عند اكتمال الكود
    if (newCode.every(digit => digit !== '') && newCode.join('').length === 6) {
      handleVerifyCode(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      // الانتقال للحقل السابق عند الحذف
      inputRefs.current[index - 1]?.focus();
    }

    // منع إدخال الأحرف العربية أو اللاتينية
    if (e.key.length === 1 && !/^\d$/.test(e.key)) {
      e.preventDefault();
    }

    // السماح بمفاتيح التنقل والتحكم
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (allowedKeys.includes(e.key)) {
      return;
    }
  };

  const handleVerifyCode = async (verificationCode?: string) => {
    const codeToVerify = verificationCode || code.join('');
    
    if (codeToVerify.length !== 6) {
      setError('يرجى إدخال كود التحقق كاملاً');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await adminTwoFactorService.verifyCode(state.adminId, codeToVerify);
      
      if (result.success) {
        setSuccess('تم التحقق بنجاح! جاري إكمال تسجيل الدخول...');

        // إكمال تسجيل الدخول
        const loginResult = await separateAdminAuth.completeTwoFactorLogin(state.adminId);

        if (loginResult.success) {
          setSuccess('تم تسجيل الدخول بنجاح! جاري التوجيه...');
          setTimeout(() => {
            navigate('/admin', { replace: true });
          }, 1500);
        } else {
          setError(loginResult.error || 'فشل في إكمال تسجيل الدخول');
        }
      } else {
        setError(result.error || 'كود التحقق غير صحيح');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      setError('حدث خطأ في التحقق من الكود');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (retryAfter > 0) return;

    setIsResending(true);
    setError('');
    setSuccess('');

    try {
      const result = await adminTwoFactorService.sendVerificationCode(state.adminId, state.email);
      
      if (result.success) {
        setSuccess('تم إرسال كود جديد إلى بريدك الإلكتروني');
        setRetryAfter(result.retryAfter || 60);
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        // حفظ الرمز التطويري الجديد إذا كان متوفراً
        if (result.developmentCode) {
          setDevelopmentCode(result.developmentCode);
        }
      } else {
        setError(result.error || 'فشل في إرسال كود جديد');
        setRetryAfter(result.retryAfter || 0);
      }
    } catch (error) {
      setError('حدث خطأ في إرسال كود جديد');
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} ثانية`;
    } else if (seconds < 3600) {
      const minutes = Math.ceil(seconds / 60);
      return `${minutes} دقيقة`;
    } else if (seconds < 86400) {
      const hours = Math.ceil(seconds / 3600);
      return `${hours} ساعة`;
    } else {
      const days = Math.ceil(seconds / 86400);
      return `${days} يوم`;
    }
  };

  if (!state?.adminId || !state?.email) {
    return null; // سيتم التوجيه تلقائياً
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
      {/* الخلفية الهندسية */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-black">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 800" fill="none">
            <g stroke="rgba(255,255,255,0.1)" strokeWidth="1">
              <path d="M0 0 L200 0 L200 200 L0 200 Z" fill="none" />
              <path d="M50 50 L150 50 L150 150 L50 150 Z" fill="none" />
              <path d="M1000 0 L1200 0 L1200 200 L1000 200 Z" fill="none" />
              <path d="M1050 50 L1150 50 L1150 150 L1050 150 Z" fill="none" />
              <path d="M0 600 L200 600 L200 800 L0 800 Z" fill="none" />
              <path d="M50 650 L150 650 L150 750 L50 750 Z" fill="none" />
              <path d="M1000 600 L1200 600 L1200 800 L1000 800 Z" fill="none" />
              <path d="M1050 650 L1150 650 L1150 750 L1050 750 Z" fill="none" />
              <path d="M0 0 L100 100" />
              <path d="M1200 0 L1100 100" />
              <path d="M0 800 L100 700" />
              <path d="M1200 800 L1100 700" />
            </g>
          </svg>
        </div>
      </div>

      {/* الشعار في الأعلى */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-10">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-lg shadow-lg">
          <span className="text-lg font-bold">رزقي - إدارة</span>
        </div>
      </div>

      {/* نموذج التحقق */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* العنوان */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">التحقق الإضافي</h1>
            <p className="text-gray-600">تم إرسال كود التحقق إلى</p>
            <p className="text-purple-600 font-medium">{state.email}</p>
          </div>

          {/* رسائل الحالة */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 mb-6">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 mb-6">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span className="text-green-700 text-sm">{success}</span>
            </div>
          )}

          {/* عرض كود التحقق في وضع التطوير */}
          {developmentCode && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <p className="text-yellow-800 font-semibold text-sm">وضع التطوير - كود التحقق:</p>
              </div>
              <div className="bg-yellow-100 p-4 rounded-lg text-center">
                <code className="text-3xl font-bold text-yellow-900 font-mono tracking-widest">
                  {developmentCode}
                </code>
              </div>
              <p className="text-yellow-700 text-xs mt-3 text-center">
                هذا الكود يظهر فقط في وضع التطوير ولن يظهر في الإنتاج
              </p>
            </div>
          )}

          {/* حقول كود التحقق */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
              أدخل كود التحقق المكون من 6 أرقام
            </label>
            <div className="flex gap-2 justify-center" dir="ltr">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={el => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all font-mono"
                  disabled={isLoading}
                  dir="ltr"
                  style={{ fontVariantNumeric: 'lining-nums' }}
                />
              ))}
            </div>
          </div>

          {/* زر التحقق */}
          <button
            onClick={() => handleVerifyCode()}
            disabled={isLoading || code.some(digit => digit === '')}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جاري التحقق...</span>
              </div>
            ) : (
              'تحقق من الكود'
            )}
          </button>

          {/* Development Code Display - للتطوير فقط */}
          {developmentCode && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm text-center">
                <span className="font-medium">🚧 للتطوير:</span> رمز المصادقة:
                <span className="font-mono font-bold mx-2 px-2 py-1 bg-yellow-100 rounded">
                  {developmentCode}
                </span>
              </p>
            </div>
          )}

          {/* زر إعادة الإرسال */}
          <div className="text-center">
            <p className="text-gray-600 text-sm mb-2">لم تستلم الكود؟</p>
            <button
              onClick={handleResendCode}
              disabled={isResending || retryAfter > 0}
              className="text-purple-600 hover:text-purple-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
            >
              {isResending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  جاري الإرسال...
                </>
              ) : retryAfter > 0 ? (
                <>
                  <Clock className="w-4 h-4" />
                  إعادة الإرسال بعد {formatTime(retryAfter)}
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  إرسال كود جديد
                </>
              )}
            </button>
          </div>

          {/* رابط العودة */}
          <div className="text-center mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => navigate('/admin/login')}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              العودة لتسجيل الدخول
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTwoFactorPage;
