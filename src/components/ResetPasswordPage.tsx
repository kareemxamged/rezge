import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';

// نوع بيانات النموذج
type ResetPasswordFormData = {
  password: string;
  confirmPassword: string;
};

const ResetPasswordPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Schema validation with translations
  const resetPasswordSchema = z.object({
    password: z.string()
      .min(8, t('auth.resetPassword.validation.passwordMinLength'))
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, t('auth.resetPassword.validation.passwordComplexity')),
    confirmPassword: z.string()
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('auth.resetPassword.validation.passwordsNotMatch'),
    path: ["confirmPassword"],
  });

  // حالات المكون
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema)
  });

  const watchedPassword = watch('password');

  // فحص صحة جلسة إعادة تعيين كلمة المرور
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setErrorMessage(t('auth.resetPassword.messages.invalidSession'));
          return;
        }

        if (session) {
          setIsValidSession(true);
        } else {
          setErrorMessage(t('auth.resetPassword.messages.invalidSession'));
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setErrorMessage(t('auth.resetPassword.messages.unexpectedError'));
      }
    };

    checkSession();
  }, []);

  // دالة إعادة تعيين كلمة المرور
  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password
      });

      if (error) {
        console.error('Error updating password:', error);
        setErrorMessage(t('auth.resetPassword.messages.updateError'));
        return;
      }

      setSuccessMessage(t('auth.resetPassword.messages.success') + ' ' + t('auth.resetPassword.messages.successDescription'));

      // توجيه المستخدم لصفحة تسجيل الدخول بعد 3 ثوان
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (error) {
      console.error('Error in password reset:', error);
      setErrorMessage(t('auth.resetPassword.messages.unexpectedError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isRTL = i18n.language === 'ar';

  if (!isValidSession && !errorMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('auth.resetPassword.messages.checkingSession')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-md w-full">
        {/* العنوان الرئيسي */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
            <Shield className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('auth.resetPassword.title')}</h1>
          <p className="text-gray-600">
            {t('auth.resetPassword.description')}
          </p>
        </div>

        {/* النموذج */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {isValidSession ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" autoComplete="off" noValidate>
              {/* حقل كلمة المرور الجديدة */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('auth.resetPassword.password')}
                </label>
                <div className="relative">
                  <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    className={`block w-full ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                      errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder={t('auth.resetPassword.passwordPlaceholder')}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    disabled={isSubmitting}
                    autoComplete="new-password"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    data-dashlane-ignore="true"
                    data-lastpass-ignore="true"
                    data-bitwarden-ignore="true"
                  />
                  <button
                    type="button"
                    className={`absolute inset-y-0 ${isRTL ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center`}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-2 text-sm text-red-600 flex items-center justify-end">
                    {errors.password.message}
                    <AlertCircle className="w-4 h-4 mr-2" />
                  </p>
                )}
              </div>

              {/* حقل تأكيد كلمة المرور */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('auth.resetPassword.confirmPassword')}
                </label>
                <div className="relative">
                  <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('confirmPassword')}
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    className={`block w-full ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                      errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder={t('auth.resetPassword.confirmPasswordPlaceholder')}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    disabled={isSubmitting}
                    autoComplete="new-password"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    data-dashlane-ignore="true"
                    data-lastpass-ignore="true"
                    data-bitwarden-ignore="true"
                  />
                  <button
                    type="button"
                    className={`absolute inset-y-0 ${isRTL ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center`}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-600 flex items-center justify-end">
                    {errors.confirmPassword.message}
                    <AlertCircle className="w-4 h-4 mr-2" />
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
                        {t('common.success')}
                      </p>
                      <p className="text-green-700 text-sm mt-1">{successMessage}</p>
                    </div>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className={`flex items-start ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="flex-1">
                      <p className={`text-red-800 font-medium flex items-center ${isRTL ? 'flex-row-reverse justify-end' : 'justify-start'}`}>
                        <AlertCircle className={`w-5 h-5 text-red-500 ${isRTL ? 'mr-2' : 'mr-2'} flex-shrink-0`} />
                        {t('common.error')}
                      </p>
                      <p className="text-red-700 text-sm mt-1">{errorMessage}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* زر التحديث */}
              <button
                type="submit"
                disabled={isSubmitting || !watchedPassword}
                className={`w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-lg text-white font-medium transition-all duration-200 ${
                  isSubmitting || !watchedPassword
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 focus:ring-4 focus:ring-purple-200'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className={`animate-spin rounded-full h-5 w-5 border-b-2 border-white ${isRTL ? 'mr-2' : 'ml-2'}`}></div>
                    {t('auth.resetPassword.updatingButton')}
                  </>
                ) : (
                  t('auth.resetPassword.updateButton')
                )}
              </button>
            </form>
          ) : (
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('auth.resetPassword.messages.invalidLink')}</h3>
              <p className="text-gray-600 mb-4">{errorMessage}</p>
              <Link
                to="/forgot-password"
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                {t('auth.resetPassword.messages.requestNewLink')}
              </Link>
            </div>
          )}

          {/* رابط العودة */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-purple-600 hover:text-purple-700 font-medium transition-colors"
            >
              {t('auth.resetPassword.backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
