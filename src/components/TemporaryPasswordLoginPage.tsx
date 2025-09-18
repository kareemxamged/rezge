import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, CheckCircle, AlertCircle, Shield, ArrowRight } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { updatePasswordWithTempPassword } from '../lib/temporaryPasswordService';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

// نوع بيانات النموذج
type TemporaryPasswordFormData = {
  email: string;
  temporaryPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const TemporaryPasswordLoginPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn } = useAuth();

  // Schema validation with translations
  const tempPasswordSchema = z.object({
    email: z.string().email(t('auth.temporaryPassword.validation.emailInvalid')),
    temporaryPassword: z.string().min(1, t('auth.temporaryPassword.validation.temporaryPasswordRequired')),
    newPassword: z.string()
      .min(8, t('auth.temporaryPassword.validation.newPasswordMinLength'))
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, t('auth.temporaryPassword.validation.newPasswordPattern')),
    confirmPassword: z.string()
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: t('auth.temporaryPassword.validation.passwordsNotMatch'),
    path: ["confirmPassword"],
  });

  // حالات المكون
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // استخراج كلمة المرور المؤقتة من URL (للتطوير)
  const tempPasswordFromUrl = searchParams.get('temp_password');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<TemporaryPasswordFormData>({
    resolver: zodResolver(tempPasswordSchema),
    defaultValues: {
      email: searchParams.get('email') || ''
    }
  });

  const watchedEmail = watch('email');
  const watchedTempPassword = watch('temporaryPassword');
  const watchedNewPassword = watch('newPassword');

  // دالة تحديث كلمة المرور
  const onSubmit = async (data: TemporaryPasswordFormData) => {
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // تحديث كلمة المرور باستخدام كلمة المرور المؤقتة
      const updateResult = await updatePasswordWithTempPassword(
        data.email,
        data.temporaryPassword,
        data.newPassword
      );

      if (!updateResult.success) {
        setErrorMessage(updateResult.error || t('auth.temporaryPassword.messages.updateError'));
        return;
      }

      setSuccessMessage(t('auth.temporaryPassword.messages.success'));

      // تسجيل الدخول بكلمة المرور الجديدة
      setTimeout(async () => {
        try {
          const loginResult = await signIn(data.email, data.newPassword);

          if (loginResult.success) {
            const returnUrl = searchParams.get('returnUrl') || '/profile';
            navigate(returnUrl);
          } else {
            setErrorMessage(t('auth.temporaryPassword.messages.loginError'));
            setTimeout(() => {
              navigate('/login');
            }, 3000);
          }
        } catch (loginError) {
          console.error('Login error after password update:', loginError);
          setErrorMessage(t('auth.temporaryPassword.messages.loginErrorRedirect'));
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        }
      }, 2000);

    } catch (error) {
      console.error('Error in temporary password login:', error);
      setErrorMessage(t('auth.temporaryPassword.messages.unexpectedError'));
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('auth.temporaryPassword.title')}</h1>
          <p className="text-gray-600">
            {t('auth.temporaryPassword.description')}
          </p>
        </div>

        {/* النموذج */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" autoComplete="off" noValidate>
            {/* حقل البريد الإلكتروني */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.temporaryPassword.email')}
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
                  placeholder={t('auth.temporaryPassword.emailPlaceholder')}
                  disabled={isSubmitting}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
              {errors.email && (
                <p className={`mt-2 text-sm text-red-600 flex items-center ${isRTL ? 'justify-end' : 'justify-start'}`}>
                  {errors.email.message}
                  <AlertCircle className={`w-4 h-4 ${isRTL ? 'mr-2' : 'ml-2'}`} />
                </p>
              )}
            </div>

            {/* حقل كلمة المرور المؤقتة */}
            <div>
              <label htmlFor="temporaryPassword" className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.temporaryPassword.temporaryPassword')}
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('temporaryPassword')}
                  type={showTempPassword ? 'text' : 'password'}
                  id="temporaryPassword"
                  className={`block w-full ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                    errors.temporaryPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder={t('auth.temporaryPassword.temporaryPasswordPlaceholder')}
                  disabled={isSubmitting}
                  autoComplete="current-password"
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
                  onClick={() => setShowTempPassword(!showTempPassword)}
                >
                  {showTempPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.temporaryPassword && (
                <p className={`mt-2 text-sm text-red-600 flex items-center ${isRTL ? 'justify-end' : 'justify-start'}`}>
                  {errors.temporaryPassword.message}
                  <AlertCircle className={`w-4 h-4 ${isRTL ? 'mr-2' : 'ml-2'}`} />
                </p>
              )}


            </div>

            {/* حقل كلمة المرور الجديدة */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.temporaryPassword.newPassword')}
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('newPassword')}
                  type={showNewPassword ? 'text' : 'password'}
                  id="newPassword"
                  className={`block w-full ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                    errors.newPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder={t('auth.temporaryPassword.newPasswordPlaceholder')}
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
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
                <button
                  type="button"
                  className={`absolute inset-y-0 ${isRTL ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center`}
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.newPassword && (
                <p className={`mt-2 text-sm text-red-600 flex items-center ${isRTL ? 'justify-end' : 'justify-start'}`}>
                  {errors.newPassword.message}
                  <AlertCircle className={`w-4 h-4 ${isRTL ? 'mr-2' : 'ml-2'}`} />
                </p>
              )}
            </div>

            {/* حقل تأكيد كلمة المرور */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.temporaryPassword.confirmPassword')}
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
                  placeholder={t('auth.temporaryPassword.confirmPasswordPlaceholder')}
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
                  dir={isRTL ? 'rtl' : 'ltr'}
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
                <p className={`mt-2 text-sm text-red-600 flex items-center ${isRTL ? 'justify-end' : 'justify-start'}`}>
                  {errors.confirmPassword.message}
                  <AlertCircle className={`w-4 h-4 ${isRTL ? 'mr-2' : 'ml-2'}`} />
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
              disabled={isSubmitting || !watchedEmail || !watchedTempPassword || !watchedNewPassword}
              className={`w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-lg text-white font-medium transition-all duration-200 ${
                isSubmitting || !watchedEmail || !watchedTempPassword || !watchedNewPassword
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 focus:ring-4 focus:ring-purple-200'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className={`animate-spin rounded-full h-5 w-5 border-b-2 border-white ${isRTL ? 'mr-2' : 'ml-2'}`}></div>
                  {t('auth.temporaryPassword.updatingButton')}
                </>
              ) : (
                <>
                  {t('auth.temporaryPassword.updateButton')}
                  <ArrowRight className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                </>
              )}
            </button>
          </form>

          {/* روابط إضافية */}
          <div className="mt-6 text-center space-y-2">
            <Link
              to="/forgot-password"
              className="block text-purple-600 hover:text-purple-700 font-medium transition-colors"
            >
              {t('auth.forgotPassword.sendButton')}
            </Link>
            <Link
              to="/login"
              className="block text-gray-600 hover:text-gray-700 transition-colors"
            >
              {t('auth.temporaryPassword.backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemporaryPasswordLoginPage;
