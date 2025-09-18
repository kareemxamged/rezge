import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowRight, AlertCircle, CheckCircle, Clock, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sendTemporaryPasswordViaSupabase } from '../lib/temporaryPasswordService';
import { translateSupabaseError } from '../utils/errorHandler';
import CaptchaComponent from './CaptchaComponent';
import CaptchaService, { type CaptchaVerificationResult } from '../lib/captchaService';

// نوع بيانات النموذج
type ForgotPasswordFormData = {
  email: string;
};

const ForgotPasswordPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Schema validation with translations - recreate when language changes
  const forgotPasswordSchema = useMemo(() => z.object({
    email: z.string().email(t('auth.forgotPassword.validation.emailInvalid'))
  }), [t]);

  // حالات المكون
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [waitTime, setWaitTime] = useState<number | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [currentTempPassword, setCurrentTempPassword] = useState<string | null>(null); // لحفظ كلمة المرور للرابط

  // حالة Captcha
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaResult, setCaptchaResult] = useState<CaptchaVerificationResult | null>(null);


  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema)
  });

  const watchedEmail = watch('email');

  /**
   * معالج التحقق من Captcha
   */
  const handleCaptchaVerify = (result: CaptchaVerificationResult) => {
    setCaptchaVerified(result.success);
    setCaptchaResult(result);

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
    setCaptchaVerified(false);
    setCaptchaResult(null);
    setErrorMessage(error);
  };

  // دالة إرسال طلب كلمة المرور المؤقتة
  const onSubmit = async (data: ForgotPasswordFormData) => {
    console.log('🚀 === بدء عملية إرسال نموذج نسيت الباسوورد ===');
    console.log('📧 البريد الإلكتروني من النموذج:', data.email);

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    // التحقق من Captcha إذا كان مفعلاً
    if (CaptchaService.isEnabled() && !captchaVerified) {
      console.log('❌ فشل التحقق من Captcha');
      setErrorMessage(t('captcha.required'));
      setIsSubmitting(false);
      return;
    }

    console.log('✅ تم تجاوز فحص Captcha');
    setWaitTime(null);
    setIsBlocked(false);
    setCurrentTempPassword(null);

    try {
      console.log('🔄 استدعاء دالة إرسال كلمة المرور المؤقتة...');
      // إرسال كلمة المرور المؤقتة باستخدام Supabase Custom SMTP
      const result = await sendTemporaryPasswordViaSupabase(data.email);
      console.log('📨 نتيجة إرسال كلمة المرور المؤقتة:', result);

      if (result.success) {
        // حفظ كلمة المرور المؤقتة للاستخدام في الرابط (إذا كانت متوفرة)
        if (result.temporaryPassword) {
          setCurrentTempPassword(result.temporaryPassword);
        }

        setSuccessMessage('success'); // استخدام flag بدلاً من النص

        // توجيه المستخدم لصفحة استخدام كلمة المرور المؤقتة
        setTimeout(() => {
          navigate(`/temporary-password-login?email=${encodeURIComponent(data.email)}`);
        }, 3000);
      } else {
        // معالجة الأخطاء المختلفة
        if (result.isBlocked) {
          setIsBlocked(true);
          setErrorMessage(result.blockReason || t('auth.forgotPassword.messages.blockedMessage'));
        } else if (result.waitTime) {
          setWaitTime(result.waitTime);
          setErrorMessage(t('auth.forgotPassword.messages.rateLimitError'));
        } else {
          // التحقق من نوع الخطأ وترجمته
          const errorKey = result.error;
          if (errorKey && errorKey.startsWith('auth.forgotPassword.messages.')) {
            setErrorMessage(t(errorKey));
          } else {
            setErrorMessage(result.error || t('auth.forgotPassword.messages.unexpectedError'));
          }
        }
      }
    } catch (error: any) {
      console.error('Error in forgot password:', error);

      // ترجمة أخطاء Supabase
      const currentLang = i18n.language === 'ar' ? 'ar' : 'en';
      let translatedError = translateSupabaseError(error, currentLang);

      // إذا لم تتم الترجمة، استخدم رسالة افتراضية
      if (!translatedError || translatedError === error?.message) {
        translatedError = t('auth.forgotPassword.messages.unexpectedError');
      }

      setErrorMessage(translatedError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isRTL = i18n.language === 'ar';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-md w-full">
        {/* العنوان الرئيسي */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
            <Shield className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('auth.forgotPassword.title')}</h1>
          <p className="text-gray-600">
            {t('auth.forgotPassword.description')}
          </p>
        </div>

        {/* النموذج */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* حقل البريد الإلكتروني */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.forgotPassword.email')}
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('email')}
                  type="email"
                  id="email"
                  className={`block w-full ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'} py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                    errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder={t('auth.forgotPassword.emailPlaceholder')}
                  disabled={isSubmitting}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
              {errors.email && (
                <p className={`mt-2 text-sm text-red-600 flex items-center ${isRTL ? 'flex-row-reverse justify-end' : 'justify-start'}`}>
                  {isRTL ? (
                    <>
                      {errors.email.message}
                      <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                      {errors.email.message}
                    </>
                  )}
                </p>
              )}
            </div>

            {/* رسائل النجاح والخطأ */}
            {successMessage && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className={`flex items-start ${isRTL ? 'text-right' : 'text-left'}`}>
                  <div className="flex-1">
                    <p className={`text-green-800 font-medium flex items-center ${isRTL ? 'flex-row-reverse justify-end' : 'justify-start'}`}>
                      <CheckCircle className={`w-5 h-5 text-green-500 ${isRTL ? 'mr-2' : 'mr-2'} flex-shrink-0`} />
                      {t('auth.forgotPassword.messages.success')}
                    </p>
                    <p className="text-green-700 text-sm mt-1">{successMessage ? t('auth.forgotPassword.messages.successDescription') : ''}</p>
                    <div className="mt-3">
                      <Link
                        to={`/temporary-password-login?email=${encodeURIComponent(watchedEmail || '')}${currentTempPassword ? `&temp_password=${encodeURIComponent(currentTempPassword)}` : ''}`}
                        className={`inline-flex items-center text-green-700 hover:text-green-800 font-medium text-sm ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        {t('auth.forgotPassword.messages.useNowLink')}
                        <ArrowRight className={`w-4 h-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className={`border rounded-lg p-4 ${
                isBlocked ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className={`flex items-start ${isRTL ? 'text-right' : 'text-left'}`}>
                  <div className="flex-1">
                    <p className={`font-medium flex items-center ${isRTL ? 'flex-row-reverse justify-end' : 'justify-start'} ${
                      isBlocked ? 'text-red-800' : 'text-yellow-800'
                    }`}>
                      {isBlocked ? (
                        <AlertCircle className={`w-5 h-5 text-red-500 ${isRTL ? 'mr-2' : 'mr-2'} flex-shrink-0`} />
                      ) : waitTime ? (
                        <Clock className={`w-5 h-5 text-yellow-500 ${isRTL ? 'mr-2' : 'mr-2'} flex-shrink-0`} />
                      ) : (
                        <AlertCircle className={`w-5 h-5 text-yellow-500 ${isRTL ? 'mr-2' : 'mr-2'} flex-shrink-0`} />
                      )}
                      {isBlocked ? t('common.error') : waitTime ? t('auth.forgotPassword.messages.warning') : t('common.error')}
                    </p>
                    <p className={`text-sm mt-1 ${
                      isBlocked ? 'text-red-700' : 'text-yellow-700'
                    }`}>
                      {errorMessage}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Captcha Component */}
            {CaptchaService.isEnabled() && (
              <div className="space-y-2">
                <CaptchaComponent
                  action="forgot_password"
                  onVerify={handleCaptchaVerify}
                  onError={handleCaptchaError}
                  disabled={isSubmitting || !watchedEmail || !!waitTime}
                  size="normal"
                  theme="auto"
                  showScore={false}
                  autoExecute={false}
                  userId={watchedEmail} // استخدام البريد الإلكتروني كمعرف مؤقت
                />
              </div>
            )}

            {/* زر الإرسال */}
            <button
              type="submit"
              disabled={
                isSubmitting ||
                !watchedEmail ||
                !!waitTime ||
                (CaptchaService.isEnabled() && !captchaVerified)
              }
              className={`w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-lg text-white font-medium transition-all duration-200 ${
                isSubmitting || !watchedEmail || !!waitTime || (CaptchaService.isEnabled() && !captchaVerified)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 focus:ring-4 focus:ring-purple-200'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className={`animate-spin rounded-full h-5 w-5 border-b-2 border-white ${isRTL ? 'mr-2' : 'ml-2'}`}></div>
                  {t('auth.forgotPassword.sendingButton')}
                </>
              ) : (
                <>
                  {t('auth.forgotPassword.sendButton')}
                  <ArrowRight className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                </>
              )}
            </button>
          </form>

          {/* رابط العودة */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-purple-600 hover:text-purple-700 font-medium transition-colors"
            >
              {t('auth.forgotPassword.backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
