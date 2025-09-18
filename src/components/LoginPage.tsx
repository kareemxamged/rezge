import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, Heart, Shield, CheckCircle, ArrowRight, AlertCircle, Clock } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useAuthStorage } from '../hooks/useLocalStorage';
import CaptchaComponent from './CaptchaComponent';
import CaptchaService, { type CaptchaVerificationResult } from '../lib/captchaService';


type LoginFormData = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

interface LoginState {
  captchaVerified: boolean;
  captchaResult: CaptchaVerificationResult | null;
}

const LoginPage: React.FC = () => {
  const { t, i18n } = useTranslation();

  // Schema validation for login
  const loginSchema = z.object({
    email: z.string().email(t('auth.login.validation.emailInvalid')),
    password: z.string().min(1, t('auth.login.validation.passwordRequired')),
    rememberMe: z.boolean().optional()
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attemptsInfo, setAttemptsInfo] = useState<{
    canAttempt: boolean;
    attemptsRemaining?: number;
    blockedUntil?: Date;
    reason?: string;
  }>({ canAttempt: true });
  const [loginState, setLoginState] = useState<LoginState>({
    captchaVerified: false,
    captchaResult: null
  });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn } = useAuth();
  const { savedEmail, saveLoginData, clearLoginData } = useAuthStorage();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: savedEmail || '',
      rememberMe: !!savedEmail
    }
  });

  const watchedEmail = watch('email');

  // فحص حالة الأمان المتقدم عند تغيير البريد الإلكتروني
  useEffect(() => {
    const checkDeviceSecurity = async () => {
      // تعطيل فحص الأمان مؤقتاً لحل مشكلة تسجيل الدخول
      // TODO: إعادة تفعيل فحص الأمان بعد إصلاح مشاكل النظام
      /*
      if (watchedEmail && watchedEmail.includes('@')) {
        try {
          // فحص أمان الجهاز
          const securityResult = await deviceSecurityService.checkDeviceSecurity(watchedEmail);

          if (!securityResult.allowed) {
            setAttemptsInfo({
              canAttempt: false,
              reason: securityResult.reason,
              blockedUntil: securityResult.blockedUntil
            });
            setErrorMessage(securityResult.reason || 'تم منع الوصول لأسباب أمنية');
          } else {
            // عرض تحذير للمخاطر العالية
            if (securityResult.riskLevel === 'high' || securityResult.riskLevel === 'critical') {
              setAttemptsInfo({
                canAttempt: true,
                attemptsRemaining: 1 // محاولة واحدة فقط للمخاطر العالية
              });
              setErrorMessage('تم اكتشاف نشاط مشبوه. يرجى الحذر.');
            } else if (securityResult.riskLevel === 'medium') {
              setAttemptsInfo({
                canAttempt: true,
                attemptsRemaining: 3 // محاولات محدودة للمخاطر المتوسطة
              });
              setErrorMessage('');
            } else {
              setAttemptsInfo({
                canAttempt: true,
                attemptsRemaining: 5 // المحاولات العادية للمخاطر المنخفضة
              });
              setErrorMessage('');
            }
          }
        } catch (error) {
          console.error('Error checking device security:', error);
          setAttemptsInfo({ canAttempt: true });
          setErrorMessage('');
        }
      }
      */

      // السماح بتسجيل الدخول بدون فحص أمان مؤقتاً
      setAttemptsInfo({ canAttempt: true });
      setErrorMessage('');
    };

    // تعطيل timeout مؤقتاً
    // const timeoutId = setTimeout(checkDeviceSecurity, 500); // debounce
    // return () => clearTimeout(timeoutId);

    // تشغيل الدالة مرة واحدة فقط لتعيين الحالة الافتراضية
    checkDeviceSecurity();
  }, [watchedEmail]);

  // تحميل البريد المحفوظ عند تحميل الصفحة
  useEffect(() => {
    if (savedEmail) {
      setValue('email', savedEmail);
      setValue('rememberMe', true);
    }
  }, [savedEmail, setValue]);

  /**
   * معالج التحقق من Captcha
   */
  const handleCaptchaVerify = (result: CaptchaVerificationResult) => {
    setLoginState({
      captchaVerified: result.success,
      captchaResult: result
    });

    if (!result.success) {
      setErrorMessage(result.message || t('captcha.verificationFailed'));
    } else {
      setErrorMessage('');
    }
  };

  /**
   * معالج خطأ Captcha
   */
  const handleCaptchaError = (error: string) => {
    setLoginState({
      captchaVerified: false,
      captchaResult: null
    });
    setErrorMessage(error);
  };

  const onSubmit = async (data: LoginFormData) => {
    // مسح الرسائل السابقة
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      // التحقق من Captcha إذا كان مفعلاً
      if (CaptchaService.isEnabled() && !loginState.captchaVerified) {
        setErrorMessage(t('captcha.required'));
        setIsSubmitting(false);
        return;
      }

      // تسجيل الدخول باستخدام نظام المصادقة
      const result = await signIn(data.email, data.password, data.rememberMe);

      if (result.success) {
        // حفظ بيانات تسجيل الدخول إذا اختار المستخدم "تذكرني"
        if (data.rememberMe) {
          saveLoginData(data.email, true);
        } else {
          clearLoginData();
        }

        // فحص المصادقة الثنائية
        if (result.requiresTwoFactor) {
          // التوجه لصفحة التحقق من رمز المصادقة الثنائية
          const returnUrl = searchParams.get('returnUrl') || '/profile';
          navigate('/two-factor-verification', {
            state: {
              email: result.tempUserEmail || data.email,
              userId: result.tempUserId,
              redirectTo: returnUrl,
              codeType: 'login',
              developmentCode: result.developmentCode
            }
          });
          return;
        }

        setSuccessMessage(t('auth.login.messages.loginSuccess'));

        // التوجه للصفحة المطلوبة أو لوحة التحكم
        const returnUrl = searchParams.get('returnUrl') || '/dashboard';

        console.log('Login successful, redirecting to:', returnUrl);

        // تأخير أقصر لإظهار رسالة النجاح ثم التوجيه الفوري
        setTimeout(() => {
          console.log('Navigating to:', returnUrl);
          navigate(returnUrl, { replace: true });
        }, 500); // تقليل التأخير من 1000 إلى 500 مللي ثانية
      } else {
        setErrorMessage(result.error || t('auth.login.messages.loginError'));
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setErrorMessage(t('auth.login.messages.unexpectedError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // دالة إعادة تعيين كلمة المرور (غير مستخدمة حالياً)
  // const handleResetPassword = async (email: string) => {
  //   if (!email) {
  //     setErrorMessage(t('auth.login.validation.emailRequired'));
  //     return;
  //   }

  //   try {
  //     const result = await resetPassword(email);
  //     if (result.success) {
  //       setSuccessMessage(t('auth.login.messages.resetPasswordSent'));
  //     } else {
  //       setErrorMessage(result.error || t('auth.login.messages.resetPasswordError'));
  //     }
  //   } catch (error) {
  //     setErrorMessage(t('auth.login.messages.unexpectedError'));
  //   }
  // };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-emerald-50 flex items-center justify-center py-6 md:py-12" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-10 md:top-20 right-10 md:right-20 w-32 h-32 md:w-64 md:h-64 bg-primary-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 md:bottom-20 left-10 md:left-20 w-48 h-48 md:w-96 md:h-96 bg-emerald-500 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 md:w-80 md:h-80 bg-amber-500 rounded-full blur-3xl"></div>
      </div>

      {/* Floating hearts decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-6 h-6 md:w-8 md:h-8 text-rose-300 opacity-20 animate-float">
          <Heart className="w-full h-full" />
        </div>
        <div className="absolute top-32 right-16 w-4 h-4 md:w-6 md:h-6 text-emerald-300 opacity-30 animate-float" style={{animationDelay: '2s'}}>
          <Heart className="w-full h-full" />
        </div>
        <div className="absolute bottom-20 right-32 w-8 h-8 md:w-10 md:h-10 text-primary-300 opacity-25 animate-float" style={{animationDelay: '4s'}}>
          <Heart className="w-full h-full" />
        </div>
      </div>

      <div className="max-w-md w-full mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Login Card */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl md:rounded-3xl shadow-2xl border border-white/30 p-6 md:p-8">
          {/* Header */}
          <div className="text-center mb-6 md:mb-8">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-primary-500 to-emerald-500 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-lg">
              <Heart className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-800 mb-2 font-display">
              {t('auth.login.title')}
            </h1>
            <p className="text-slate-600 mb-4 md:mb-6 text-sm md:text-base">
              {t('auth.login.subtitle')}
            </p>
            <div className="flex justify-center items-center gap-3 md:gap-4 text-xs md:text-sm text-slate-600">
              <div className="flex items-center gap-1.5 md:gap-2">
                <Shield className="w-3 h-3 md:w-4 md:h-4 text-emerald-600" />
                <span>{t('auth.login.secure')}</span>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2">
                <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-primary-600" />
                <span>{t('auth.login.verified')}</span>
              </div>
            </div>
          </div>

          {/* رسائل النجاح والخطأ */}
          {successMessage && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <p className="text-emerald-800">{successMessage}</p>
            </div>
          )}

          {/* معلومات المحاولات المتبقية - مخفي مؤقتاً */}
          {false && attemptsInfo.canAttempt && typeof attemptsInfo.attemptsRemaining === 'number' && attemptsInfo.attemptsRemaining! <= 3 && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-amber-800 text-sm">
                {t('auth.login.attemptsRemaining', { count: attemptsInfo.attemptsRemaining || 0 })}
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-800">{errorMessage}</p>
            </div>
          )}

          {/* Login Form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
            data-form-type="user-login"
          >
            {/* Email */}
            <div>
              <label className="block text-slate-700 font-medium mb-2">
                {t('auth.login.email')}
              </label>
              <div className="relative">
                <Mail className={`absolute ${i18n.language === 'ar' ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5`} />
                <input
                  type="email"
                  {...register('email')}
                  className={`w-full px-4 py-3 ${i18n.language === 'ar' ? 'pr-12' : 'pl-12'} border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white/50`}
                  placeholder={t('auth.login.emailPlaceholder')}
                  autoComplete="email"
                  data-form-type="user-login"
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-slate-700 font-medium mb-2">
                {t('auth.login.password')}
              </label>
              <div className="relative">
                <Lock className={`absolute ${i18n.language === 'ar' ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5`} />
                <input
                  type={showPassword ? "text" : "password"}
                  {...register('password')}
                  className={`w-full px-4 py-3 ${i18n.language === 'ar' ? 'pr-12 pl-12' : 'pl-12 pr-12'} border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white/50`}
                  placeholder={t('auth.login.passwordPlaceholder')}
                  autoComplete="current-password"
                  data-form-type="user-login"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute ${i18n.language === 'ar' ? 'left-3' : 'right-3'} top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors`}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('rememberMe')}
                  className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                />
                <label className="text-slate-700 text-sm">
                  {t('auth.login.rememberMe')}
                </label>
              </div>
              <Link
                to="/forgot-password"
                className="text-primary-600 hover:text-primary-700 text-sm font-medium transition-colors"
              >
                نسيت كلمة المرور؟
              </Link>
            </div>

            {/* Captcha Component */}
            {CaptchaService.isEnabled() && (
              <div className="space-y-2">
                <CaptchaComponent
                  action="login"
                  onVerify={handleCaptchaVerify}
                  onError={handleCaptchaError}
                  disabled={isSubmitting || !attemptsInfo.canAttempt}
                  size="normal"
                  theme="auto"
                  showScore={false}
                  autoExecute={false}
                  userId={watchedEmail} // استخدام البريد الإلكتروني كمعرف مؤقت
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={
                isSubmitting ||
                !attemptsInfo.canAttempt ||
                (CaptchaService.isEnabled() && !loginState.captchaVerified)
              }
              className={`w-full py-3 px-6 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg transform ${
                !attemptsInfo.canAttempt || (CaptchaService.isEnabled() && !loginState.captchaVerified)
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-primary-600 to-emerald-600 text-white hover:from-primary-700 hover:to-emerald-700 hover:shadow-xl hover:-translate-y-1'
              } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {t('auth.login.loginButtonLoading')}
                </div>
              ) : !attemptsInfo.canAttempt ? (
                <div className="flex items-center justify-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span>{t('auth.login.loginBlocked')}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>{t('auth.login.loginButton')}</span>
                  <ArrowRight className={`w-5 h-5 ${i18n.language === 'ar' ? '' : 'rotate-180'}`} />
                </div>
              )}
            </button>

            {/* Register Link */}
            <div className="text-center pt-4">
              <p className="text-slate-600">
                {t('auth.login.noAccount')}{' '}
                <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium transition-colors">
                  {t('auth.login.createAccount')}
                </Link>
              </p>
            </div>
          </form>

          {/* Social Login Options - مخفي مؤقتاً */}
          {false && (
            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-slate-500">{t('auth.login.orDivider')}</span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="w-5 h-5 bg-blue-600 rounded"></div>
                  <span className="text-slate-700 font-medium">{t('auth.login.googleLogin')}</span>
                </button>

                <button className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="w-5 h-5 bg-blue-800 rounded"></div>
                  <span className="text-slate-700 font-medium">{t('auth.login.facebookLogin')}</span>
                </button>
              </div>
            </div>
          )}

          {/* Security Notice */}
          <div className="mt-8 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div>
                <h4 className="text-emerald-800 font-medium text-sm mb-1">
                  {t('auth.login.dataProtection.title')}
                </h4>
                <p className="text-emerald-700 text-xs leading-relaxed">
                  {t('auth.login.dataProtection.description')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link
            to="/"
            className="text-slate-600 hover:text-slate-800 font-medium transition-colors flex items-center justify-center gap-2"
          >
            <ArrowRight className={`w-4 h-4 ${i18n.language === 'ar' ? 'rotate-180' : ''}`} />
            {t('auth.login.backToHome')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
