import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Mail, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { twoFactorService } from '../lib/twoFactorService';
import { userTwoFactorService } from '../lib/userTwoFactorService';
import { useAuth } from '../contexts/AuthContext';
import { notificationEmailService } from '../lib/notificationEmailService';


interface LocationState {
  email?: string;
  userId?: string;
  redirectTo?: string;
  codeType?: 'login' | 'enable_2fa' | 'disable_2fa';
  developmentCode?: string; // رمز المصادقة للتطوير فقط
}

const TwoFactorVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { user, userProfile, updateProfile, completeTwoFactorLogin } = useAuth();
  
  const state = location.state as LocationState;
  const email = state?.email || userProfile?.email || '';
  const userId = state?.userId || user?.id || '';
  const redirectTo = state?.redirectTo || '/dashboard';
  const codeType = state?.codeType || 'login';
  const developmentCode = state?.developmentCode; // رمز المصادقة للتطوير
  
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // التحقق من وجود البيانات المطلوبة
  useEffect(() => {
    if (!email || !userId) {
      navigate('/login');
      return;
    }

    // بدء العد التنازلي لإعادة الإرسال (30 ثانية دائماً)
    const initialWaitTime = 30;
    setTimeLeft(initialWaitTime);
    setCanResend(false);
  }, [email, userId, navigate]);

  // العد التنازلي
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  // التركيز على أول حقل (اليسار) عند تحميل الصفحة
  useEffect(() => {
    // تأخير صغير للتأكد من تحميل العنصر بالكامل
    const timer = setTimeout(() => {
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleInputChange = (index: number, value: string) => {
    // تحويل الأرقام العربية إلى إنجليزية والسماح بالأرقام الإنجليزية فقط
    const arabicToEnglish = (str: string) => {
      const arabicNumbers = '٠١٢٣٤٥٦٧٨٩';
      const englishNumbers = '0123456789';
      return str.replace(/[٠-٩]/g, (char) => englishNumbers[arabicNumbers.indexOf(char)]);
    };

    const convertedValue = arabicToEnglish(value);

    // السماح بالأرقام الإنجليزية فقط
    if (!/^\d*$/.test(convertedValue)) return;

    const newCode = [...code];
    newCode[index] = convertedValue;
    setCode(newCode);

    // الانتقال للحقل التالي تلقائياً (من اليسار إلى اليمين)
    if (convertedValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // مسح رسائل الخطأ عند الكتابة
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // الرجوع للحقل السابق عند الضغط على Backspace (من اليمين إلى اليسار)
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
    // التحقق عند الضغط على Enter
    if (e.key === 'Enter') {
      handleVerification();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');

    // تحويل الأرقام العربية إلى إنجليزية
    const arabicToEnglish = (str: string) => {
      const arabicNumbers = '٠١٢٣٤٥٦٧٨٩';
      const englishNumbers = '0123456789';
      return str.replace(/[٠-٩]/g, (char) => englishNumbers[arabicNumbers.indexOf(char)]);
    };

    const convertedText = arabicToEnglish(pastedText);
    const pastedData = convertedText.replace(/\D/g, '');

    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setCode(newCode);
      // التركيز على المربع الأخير (اليمين) بعد اللصق
      setTimeout(() => {
        inputRefs.current[5]?.focus();
      }, 50);
    }
  };

  const handleVerification = async () => {
    const verificationCode = code.join('');
    
    if (verificationCode.length !== 6) {
      setErrorMessage(t('auth.twoFactor.codeLength'));
      return;
    }
    
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      // استخدام الخدمة المناسبة حسب نوع التحقق
      let result;
      if (codeType === 'login') {
        // للمستخدمين العاديين، استخدم الخدمة الجديدة
        result = await userTwoFactorService.verifyCode(userId, verificationCode, codeType);
      } else {
        // للمشرفين أو العمليات الأخرى، استخدم الخدمة القديمة
        result = await twoFactorService.verifyCode(userId, verificationCode, codeType);
      }

      if (result.success) {
        setSuccessMessage(t('auth.twoFactor.successMessage'));

        // تحديث حالة المصادقة الثنائية في قاعدة البيانات
        if (codeType === 'enable_2fa') {
          await updateProfile({ two_factor_enabled: true });

          // إرسال إشعار تفعيل المصادقة الثنائية
          try {
            if (userProfile) {
              const userName = `${userProfile.first_name} ${userProfile.last_name || ''}`.trim() || 'المستخدم';
              await notificationEmailService.sendTwoFactorEnabledNotification(
                userProfile.email,
                userName
              );
              console.log('✅ تم إرسال إشعار تفعيل المصادقة الثنائية');
            }
          } catch (emailError) {
            console.error('⚠️ فشل في إرسال إشعار تفعيل المصادقة الثنائية:', emailError);
            // لا نعرض خطأ للمستخدم لأن التفعيل تم بنجاح
          }
        } else if (codeType === 'disable_2fa') {
          await updateProfile({ two_factor_enabled: false });
        }

        // تأخير قصير لإظهار رسالة النجاح
        setTimeout(async () => {
          if (codeType === 'login') {
            // للمصادقة الثنائية في تسجيل الدخول، نحتاج لإعادة إنشاء الجلسة
            try {
              console.log('Completing 2FA login process...');

              // إكمال تسجيل الدخول بعد التحقق من المصادقة الثنائية
              // البيانات المطلوبة محفوظة مؤقتاً في AuthContext
              const loginResult = await completeTwoFactorLogin(userId, email, '');

              if (loginResult.success) {
                console.log('2FA login completed successfully, redirecting to:', redirectTo);
                navigate(redirectTo);
              } else {
                console.error('Failed to complete 2FA login:', loginResult.error);
                // في حالة الفشل، نوجه المستخدم لصفحة تسجيل الدخول مع رسالة
                navigate('/login', {
                  state: {
                    message: 'تم التحقق بنجاح ولكن فشل في إكمال تسجيل الدخول. يرجى المحاولة مرة أخرى.',
                    email: email
                  }
                });
              }
            } catch (error) {
              console.error('Error handling 2FA login:', error);
              // في حالة الخطأ، نوجه المستخدم لصفحة تسجيل الدخول
              navigate('/login', {
                state: {
                  message: 'حدث خطأ أثناء إكمال تسجيل الدخول. يرجى المحاولة مرة أخرى.',
                  email: email
                }
              });
            }
          } else if (codeType === 'enable_2fa') {
            // العودة لصفحة الإعدادات مع رسالة نجاح
            navigate('/security', {
              state: { message: t('auth.twoFactor.enabledSuccess') }
            });
          } else if (codeType === 'disable_2fa') {
            // العودة لصفحة الإعدادات مع رسالة نجاح
            navigate('/security', {
              state: { message: t('auth.twoFactor.disabledSuccess') }
            });
          }
        }, 1500);
      } else {
        // إرسال إشعار فشل التحقق الثنائي فقط عند تسجيل الدخول
        if (codeType === 'login' && userProfile) {
          try {
            const userName = `${userProfile.first_name} ${userProfile.last_name || ''}`.trim() || 'المستخدم';
            await notificationEmailService.sendTwoFactorFailureNotification(
              userProfile.email,
              userName,
              {
                timestamp: new Date().toISOString(),
                ipAddress: window.location.hostname, // يمكن تحسينه لاحقاً للحصول على IP الحقيقي
                attemptsCount: 1 // يمكن تتبع العدد الفعلي لاحقاً
              }
            );
            console.log('✅ تم إرسال إشعار فشل التحقق الثنائي لتسجيل الدخول');
          } catch (emailError) {
            console.error('⚠️ فشل في إرسال إشعار فشل التحقق الثنائي:', emailError);
          }
        }

        setErrorMessage(translateErrorMessage(result.error || result.message));
        // مسح الرمز المدخل عند الخطأ
        setCode(['', '', '', '', '', '']);
        // التركيز على أول حقل بعد مسح الرمز
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 100);
      }
    } catch (error) {
      console.error('Verification error:', error);
      setErrorMessage(t('auth.twoFactor.unexpectedError'));
      // مسح الرمز والتركيز على أول حقل عند حدوث خطأ غير متوقع
      setCode(['', '', '', '', '', '']);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend || isResending) return;
    
    setIsResending(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      const result = await userTwoFactorService.sendVerificationCode(
        userId,
        email,
        codeType
      );
      
      if (result.success) {
        setSuccessMessage(t('auth.twoFactor.newCodeSent'));
        const waitTime = 30; // 30 ثانية دائماً
        setTimeLeft(waitTime);
        setCanResend(false);
        setCode(['', '', '', '', '', '']);
        // التركيز على أول حقل بعد إرسال رمز جديد
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 100);
      } else {
        const errorMessage = result.error || result.message;
        setErrorMessage(translateErrorMessage(errorMessage));

        // معالجة محسنة لرسائل الخطأ والأوقات
        if (errorMessage && errorMessage.includes('ثانية')) {
          const match = errorMessage.match(/(\d+)\s*ثانية/);
          if (match) {
            const waitSeconds = parseInt(match[1]);
            setTimeLeft(waitSeconds);
            setCanResend(false);
          }
        } else if (errorMessage && errorMessage.includes('ساعة') && errorMessage.includes('دقيقة')) {
          // معالجة رسائل الساعات والدقائق (مثل: "يجب الانتظار 1 ساعة 30 دقيقة")
          const hourMatch = errorMessage.match(/(\d+)\s*ساعة/);
          const minuteMatch = errorMessage.match(/(\d+)\s*دقيقة/);
          let totalSeconds = 0;
          if (hourMatch) totalSeconds += parseInt(hourMatch[1]) * 3600;
          if (minuteMatch) totalSeconds += parseInt(minuteMatch[1]) * 60;
          if (totalSeconds > 0) {
            setTimeLeft(totalSeconds);
            setCanResend(false);
          }
        } else if (result.message.includes('ساعة')) {
          // معالجة الساعات فقط
          const hourMatch = result.message.match(/(\d+)\s*ساعة/);
          if (hourMatch) {
            const waitHours = parseInt(hourMatch[1]);
            setTimeLeft(waitHours * 3600);
            setCanResend(false);
          }
        } else if (result.message.includes('غداً') || result.message.includes('24') || result.message.includes('اليومي')) {
          // إذا تم تجاوز الحد اليومي، نعطل الزر لفترة طويلة
          setTimeLeft(24 * 60 * 60); // 24 ساعة بالثواني
          setCanResend(false);
        }
      }
    } catch (error) {
      console.error('Resend error:', error);
      setErrorMessage(t('auth.twoFactor.unexpectedError'));
    } finally {
      setIsResending(false);
    }
  };

  const getPageTitle = () => {
    switch (codeType) {
      case 'enable_2fa':
        return t('auth.twoFactor.enableTitle');
      case 'disable_2fa':
        return t('auth.twoFactor.disableTitle');
      default:
        return t('auth.twoFactor.loginTitle');
    }
  };

  const getPageDescription = () => {
    switch (codeType) {
      case 'enable_2fa':
        return t('auth.twoFactor.enableDescription');
      case 'disable_2fa':
        return t('auth.twoFactor.disableDescription');
      default:
        return t('auth.twoFactor.description');
    }
  };

  // Get current language direction
  const isRTL = i18n.language === 'ar';

  // Function to translate error messages from server
  const translateErrorMessage = (message: string | undefined): string => {
    // التحقق من وجود الرسالة
    if (!message || typeof message !== 'string') {
      return t('auth.twoFactor.unexpectedError');
    }

    const errorTranslations: { [key: string]: { ar: string; en: string } } = {
      'رمز التحقق غير صحيح': {
        ar: 'رمز التحقق غير صحيح',
        en: 'Invalid verification code'
      },
      'انتهت صلاحية رمز التحقق': {
        ar: 'انتهت صلاحية رمز التحقق',
        en: 'Verification code has expired'
      },
      'تم استخدام رمز التحقق من قبل': {
        ar: 'تم استخدام رمز التحقق من قبل',
        en: 'Verification code has already been used'
      },
      'تم تجاوز الحد الأقصى للمحاولات': {
        ar: 'تم تجاوز الحد الأقصى للمحاولات',
        en: 'Maximum attempts exceeded'
      },
      'لم يتم العثور على رمز التحقق': {
        ar: 'لم يتم العثور على رمز التحقق',
        en: 'Verification code not found'
      },
      'حدث خطأ في التحقق من الرمز': {
        ar: 'حدث خطأ في التحقق من الرمز',
        en: 'Error occurred while verifying code'
      },
      'حدث خطأ غير متوقع': {
        ar: 'حدث خطأ غير متوقع',
        en: 'An unexpected error occurred'
      },
      'يرجى الانتظار دقيقة واحدة قبل طلب رمز جديد': {
        ar: 'يرجى الانتظار دقيقة واحدة قبل طلب رمز جديد',
        en: 'Please wait one minute before requesting a new code'
      },
      'تم إرسال رمز التحقق إلى بريدك الإلكتروني': {
        ar: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني',
        en: 'Verification code sent to your email'
      },
      'فشل في إرسال رمز التحقق عبر البريد الإلكتروني': {
        ar: 'فشل في إرسال رمز التحقق عبر البريد الإلكتروني',
        en: 'Failed to send verification code via email'
      },
      'تم إرسال رمز جديد إلى بريدك الإلكتروني': {
        ar: 'تم إرسال رمز جديد إلى بريدك الإلكتروني',
        en: 'New code sent to your email'
      },
      'كود التحقق غير صحيح أو منتهي الصلاحية': {
        ar: 'كود التحقق غير صحيح أو منتهي الصلاحية',
        en: 'Verification code is invalid or expired'
      },
      'فشل في التحقق من الكود': {
        ar: 'فشل في التحقق من الكود',
        en: 'Failed to verify code'
      }
    };

    const currentLang = i18n.language === 'ar' ? 'ar' : 'en';

    // البحث عن ترجمة مطابقة
    for (const [key, translations] of Object.entries(errorTranslations)) {
      if (message.includes(key) || key.includes(message)) {
        return translations[currentLang];
      }
    }

    // إذا لم توجد ترجمة، إرجاع الرسالة الأصلية
    return message;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-emerald-50 py-8" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-20 right-20 w-64 h-64 bg-primary-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-emerald-500 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-primary-600 to-emerald-600 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2 font-display">
            {getPageTitle()}
          </h1>
          <p className="text-slate-600">
            {getPageDescription()}
          </p>
        </div>

        {/* Email Info */}
        <div className={`bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center gap-3 ${isRTL ? 'flex-row' : 'flex-row'}`}>
          <Mail className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div>
            <p className="text-blue-800 text-sm font-medium">{t('auth.twoFactor.codeSentTo')}</p>
            <p className="text-blue-700 text-sm">{email}</p>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-emerald-800 text-sm">{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 text-sm">{errorMessage}</p>
          </div>
        )}

        {/* Verification Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
          <div className="mb-6">
            <label className="block text-slate-700 font-medium mb-4 text-center">
              {t('auth.twoFactor.enterCode')}
            </label>
            
            {/* Code Input - ترتيب المربعات من اليسار إلى اليمين */}
            <div className="flex gap-2 sm:gap-3 justify-center mb-6" onPaste={handlePaste} style={{ direction: 'ltr' }}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-10 h-10 sm:w-12 sm:h-12 text-center text-lg sm:text-xl font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 font-mono"
                  style={{ direction: 'ltr' }}
                  disabled={isLoading}
                  aria-label={`Verification code digit ${index + 1}`}
                  autoComplete="one-time-code"
                />
              ))}
            </div>

            {/* Verify Button */}
            <button
              onClick={handleVerification}
              disabled={isLoading || code.join('').length !== 6}
              className="w-full px-6 py-3 bg-gradient-to-r from-primary-600 to-emerald-600 text-white rounded-xl font-medium hover:from-primary-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {t('auth.twoFactor.verifyingButton')}
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  {t('auth.twoFactor.verifyButton')}
                </>
              )}
            </button>


          </div>

          {/* Resend Section */}
          <div className="text-center pt-6 border-t border-slate-200">
            <p className="text-slate-600 text-sm mb-3">
              {t('auth.twoFactor.didntReceiveCode')}
            </p>

            {canResend ? (
              <button
                onClick={handleResendCode}
                disabled={isResending}
                className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center justify-center gap-2 mx-auto transition-colors"
              >
                {isResending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                    {t('auth.twoFactor.resendingButton')}
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    {t('auth.twoFactor.resendCode')}
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
                <Clock className="w-4 h-4" />
                <span>
                  {t('auth.twoFactor.canResendIn')}
                  <span className="font-bold text-primary-600 mx-1">
                    {timeLeft > 3600 ?
                      `${Math.floor(timeLeft / 3600)}:${Math.floor((timeLeft % 3600) / 60).toString().padStart(2, '0')}:${(timeLeft % 60).toString().padStart(2, '0')}` :
                      timeLeft > 60 ?
                      `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}` :
                      timeLeft
                    }
                  </span>
                  {timeLeft > 3600 ? t('auth.twoFactor.hours') :
                   timeLeft > 60 ? t('auth.twoFactor.minutes') :
                   t('auth.twoFactor.seconds')}
                </span>
              </div>
            )}
          </div>
        </div>



        {/* Back Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              if (codeType === 'login') {
                navigate('/login');
              } else {
                navigate('/security');
              }
            }}
            className="text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
          >
            {codeType === 'login' ? t('auth.twoFactor.backToLogin') : t('auth.twoFactor.backToSecurity')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorVerificationPage;
