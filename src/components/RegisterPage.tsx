import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, MapPin, Calendar, Heart, Shield, CheckCircle, AlertCircle, Loader2, Send, GraduationCap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { emailVerificationService } from '../lib/emailVerification';
import { ClientEmailService } from '../lib/clientEmailService';
import PhoneInput from './PhoneInput';
import { supabase } from '../lib/supabase';
import { protectFormsFromExtensions } from '../utils/extensionProtection';
import { getCountriesForLanguage } from '../data/countriesEnglish';
import CaptchaComponent from './CaptchaComponent';
import CaptchaService, { type CaptchaVerificationResult } from '../lib/captchaService';
import { useToast } from './ToastContainer';


type RegisterFormData = {
  firstName: string;
  lastName: string;
  email: string;
  age: number;
  gender: 'male' | 'female';
  city: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  // حقول إجبارية للملف المكتمل
  nationality: string;
  profession: string; // سيتم استخدامها كمجال العمل
  bio: string; // نبذة عن نفسك
  // حقول إضافية اختيارية
  religiousCommitment?: 'committed' | 'conservative' | 'prefer_not_say';
  height?: number;
  weight?: number;
  educationLevel?: 'primary' | 'secondary' | 'diploma' | 'bachelor' | 'master' | 'phd';
  financialStatus?: 'poor' | 'below_average' | 'average' | 'above_average' | 'wealthy';
  religiosityLevel?: 'not_religious' | 'slightly_religious' | 'religious' | 'very_religious' | 'prefer_not_say';
  prayerCommitment?: 'dont_pray' | 'pray_all' | 'pray_sometimes' | 'prefer_not_say';
  smoking?: 'yes' | 'no';
  beard?: 'yes' | 'no'; // للذكور فقط
  hijab?: 'no_hijab' | 'hijab' | 'niqab' | 'prefer_not_say'; // للإناث فقط
};

const RegisterPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  // Schema validation for registration
  const registerSchema = z.object({
    firstName: z.string().min(2, t('auth.register.validation.firstNameMin')),
    lastName: z.string().min(2, t('auth.register.validation.lastNameMin')),
    email: z.string().email(t('auth.register.validation.emailInvalid')),
    age: z.number().min(18, t('auth.register.validation.ageMin')).max(80, t('auth.register.validation.ageMax')),
    gender: z.enum(['male', 'female'], { required_error: t('auth.register.validation.genderRequired') }),
    city: z.string().min(2, t('auth.register.validation.cityMin')),
    acceptTerms: z.boolean().refine(val => val === true, t('auth.register.validation.acceptTermsRequired')),
    acceptPrivacy: z.boolean().refine(val => val === true, t('auth.register.validation.acceptPrivacyRequired')),
    // حقول إجبارية للملف المكتمل
    nationality: z.string().min(2, t('auth.register.validation.nationalityRequired', 'الجنسية مطلوبة')),
    profession: z.string().min(2, t('auth.register.validation.professionRequired', 'المهنة مطلوبة')),
    bio: z.string().min(10, t('auth.register.validation.bioRequired', 'نبذة عن نفسك مطلوبة (10 أحرف على الأقل)')).max(500, t('auth.register.validation.bioMax', 'النبذة يجب ألا تزيد عن 500 حرف')),
    // حقول اختيارية
    religiousCommitment: z.enum(['committed', 'conservative', 'prefer_not_say']).optional(),
    height: z.number().min(120).max(250).optional(),
    weight: z.number().min(30).max(300).optional(),
    educationLevel: z.enum(['primary', 'secondary', 'diploma', 'bachelor', 'master', 'phd']).optional(),
    financialStatus: z.enum(['poor', 'below_average', 'average', 'above_average', 'wealthy']).optional(),
    religiosityLevel: z.enum(['not_religious', 'slightly_religious', 'religious', 'very_religious', 'prefer_not_say']).optional(),
    prayerCommitment: z.enum(['dont_pray', 'pray_all', 'pray_sometimes', 'prefer_not_say']).optional(),
    smoking: z.enum(['yes', 'no']).optional(),
    beard: z.enum(['yes', 'no']).optional(),
    hijab: z.enum(['no_hijab', 'hijab', 'niqab', 'prefer_not_say']).optional()
  });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waitTime, setWaitTime] = useState<number | null>(null);
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | ''>('');

  // حالات فحص التكرار
  const [emailCheckStatus, setEmailCheckStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [phoneCheckStatus, setPhoneCheckStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [emailCheckMessage, setEmailCheckMessage] = useState('');
  const [phoneCheckMessage, setPhoneCheckMessage] = useState('');

  // حالة Captcha
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaResult, setCaptchaResult] = useState<CaptchaVerificationResult | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema)
  });

  // دالة فحص تكرار البريد الإلكتروني
  const checkEmailAvailability = async (email: string) => {
    if (!email || !email.includes('@')) {
      setEmailCheckStatus('idle');
      setEmailCheckMessage('');
      return;
    }

    setEmailCheckStatus('checking');
    setEmailCheckMessage('جاري التحقق...');

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .limit(1);

      if (error) {
        console.error('Error checking email:', error);
        setEmailCheckStatus('idle');
        setEmailCheckMessage('');
        return;
      }

      if (data && data.length > 0) {
        setEmailCheckStatus('taken');
        setEmailCheckMessage('البريد الإلكتروني مسجل بالفعل');
      } else {
        setEmailCheckStatus('available');
        setEmailCheckMessage('البريد الإلكتروني متاح ✓');
      }
    } catch (error) {
      console.error('Error checking email availability:', error);
      setEmailCheckStatus('idle');
      setEmailCheckMessage('');
    }
  };

  // دالة فحص تكرار رقم الهاتف
  const checkPhoneAvailability = async (phone: string) => {
    if (!phone || phone.length < 10) {
      setPhoneCheckStatus('idle');
      setPhoneCheckMessage('');
      return;
    }

    setPhoneCheckStatus('checking');
    setPhoneCheckMessage('جاري التحقق...');

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('phone', phone)
        .limit(1);

      if (error) {
        console.error('Error checking phone:', error);
        setPhoneCheckStatus('idle');
        setPhoneCheckMessage('');
        return;
      }

      if (data && data.length > 0) {
        setPhoneCheckStatus('taken');
        setPhoneCheckMessage('رقم الهاتف مسجل بالفعل');
      } else {
        setPhoneCheckStatus('available');
        setPhoneCheckMessage(''); // لا نعرض رسالة النجاح
      }
    } catch (error) {
      console.error('Error checking phone availability:', error);
      setPhoneCheckStatus('idle');
      setPhoneCheckMessage('');
    }
  };

  // فحص البريد الإلكتروني عند الكتابة
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;

    // إعادة تعيين حالة الفحص عند تغيير النص
    setEmailCheckStatus('idle');
    setEmailCheckMessage('');

    // فحص البريد بعد توقف الكتابة
    if (email && email.includes('@')) {
      setTimeout(() => {
        checkEmailAvailability(email);
      }, 1000);
    }
  };

  // فحص رقم الهاتف عند تغييره
  useEffect(() => {
    if (phoneNumber) {
      const timeoutId = setTimeout(() => {
        checkPhoneAvailability(phoneNumber);
      }, 1000);

      return () => clearTimeout(timeoutId);
    } else {
      setPhoneCheckStatus('idle');
      setPhoneCheckMessage('');
    }
  }, [phoneNumber]);

  // حماية النماذج من إضافات المتصفح
  useEffect(() => {
    protectFormsFromExtensions();
  }, []);

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

  const onSubmit = async (data: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Form submitted with data:', data);
      console.log('Phone number:', phoneNumber);
      console.log('Is phone valid:', isPhoneValid);
    }

    // مسح الرسائل السابقة
    setSuccessMessage('');
    setErrorMessage('');
    setWaitTime(null);

    // التحقق من Captcha إذا كان مفعلاً
    if (CaptchaService.isEnabled() && !captchaVerified) {
      setErrorMessage(t('captcha.required'));
      return;
    }

    // فحص إذا كانت البيانات مكررة قبل الإرسال
    if (emailCheckStatus === 'taken') {
      setErrorMessage('البريد الإلكتروني مسجل بالفعل. يرجى استخدام بريد إلكتروني آخر.');
      return;
    }

    if (phoneCheckStatus === 'taken') {
      setErrorMessage('رقم الهاتف مسجل بالفعل. يرجى استخدام رقم هاتف آخر.');
      return;
    }

    // التحقق من صحة رقم الهاتف
    if (!phoneNumber || phoneNumber.trim() === '') {
      setErrorMessage(t('auth.register.validation.phoneRequired'));
      return;
    }

    if (!isPhoneValid) {
      setErrorMessage(t('auth.register.validation.phoneInvalid'));
      return;
    }

    setIsLoading(true);

    try {
      // ملاحظة: لا يمكن الحصول على IP الحقيقي من المتصفح لأسباب أمنية
      // في بيئة الإنتاج، يجب الحصول على IP من الخادم

      // إعداد بيانات المستخدم مع الحقول الإضافية
      const userData = {
        first_name: data.firstName,
        last_name: data.lastName,
        phone: phoneNumber, // استخدام رقم الهاتف مع رمز الدولة
        age: data.age,
        gender: data.gender,
        city: data.city,
        // الحقول الإجبارية للملف المكتمل
        nationality: data.nationality,
        profession: data.profession,
        bio: data.bio,
        // إضافة الحقول الاختيارية إذا كانت موجودة
        ...(data.religiousCommitment && { religious_commitment: data.religiousCommitment }),
        ...(data.height && { height: data.height }),
        ...(data.weight && { weight: data.weight }),
        ...(data.educationLevel && { education_level: data.educationLevel }),
        ...(data.financialStatus && { financial_status: data.financialStatus }),
        ...(data.religiosityLevel && { religiosity_level: data.religiosityLevel }),
        ...(data.prayerCommitment && { prayer_commitment: data.prayerCommitment }),
        ...(data.smoking && { smoking: data.smoking }),
        ...(data.beard && { beard: data.beard }),
        ...(data.hijab && { hijab: data.hijab })
      };

      // إنشاء طلب تحقق البريد الإلكتروني
      const result = await emailVerificationService.createVerification(
        data.email,
        userData
      );

      if (result.success && result.token) {
        // إرسال إيميل تعيين كلمة المرور مباشرة
        const verificationUrl = `${window.location.origin}/set-password?token=${result.token}`;

        const emailResult = await ClientEmailService.sendPasswordSetupEmail({
          to: data.email,
          verificationUrl: verificationUrl,
          firstName: userData.first_name,
          language: i18n.language as 'ar' | 'en'
        });

        if (emailResult.success) {
          showSuccess(
            '✅ تم إنشاء الحساب بنجاح!',
            'تم إرسال رابط تعيين كلمة المرور إلى بريدك الإلكتروني. يرجى فتح الإيميل واتباع التعليمات لإكمال إنشاء حسابك.',
            8000
          );
          setIsSubmitting(false);

          // توجيه المستخدم لصفحة تسجيل الدخول بعد 5 ثوان
          setTimeout(() => {
            navigate('/login', {
              state: {
                message: 'تم إرسال رابط تعيين كلمة المرور. يرجى فتح الإيميل وإكمال إعداد حسابك قبل تسجيل الدخول.',
                email: data.email
              }
            });
          }, 5000);
          return;
        } else {
          showError(
            '❌ فشل في إرسال الإيميل',
            'فشل في إرسال إيميل تعيين كلمة المرور: ' + (emailResult.error || 'خطأ غير معروف')
          );
        }
      } else {
        let errorMsg = result.error || t('auth.register.messages.verificationError');

        // إضافة معلومات إضافية عن القيود
        if (result.limits) {
          if (result.limits.dailyAttempts >= 12) {
            errorMsg += `\n\n⚠️ ${t('auth.register.messages.dailyLimitReached')} (${result.limits.dailyAttempts}/12 ${t('auth.register.messages.attempts')})`;
          } else if (result.limits.consecutiveAttempts >= 4) {
            errorMsg += `\n\n⚠️ ${t('auth.register.messages.consecutiveLimitReached')} (${result.limits.consecutiveAttempts}/4)`;
          }

          if (result.limits.nextAllowedTime) {
            const nextTime = new Date(result.limits.nextAllowedTime);
            errorMsg += `\n⏰ ${t('auth.register.messages.nextAttemptTime')} ${nextTime.toLocaleString(i18n.language === 'ar' ? 'ar-SA' : 'en-US')}`;
          }
        }

        showError(
          '❌ خطأ في إنشاء الحساب',
          errorMsg
        );
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      showError(
        '❌ خطأ غير متوقع',
        t('auth.register.messages.generalError') + ': ' + error.message
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-emerald-50 py-6 md:py-12" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-10 md:top-20 right-10 md:right-20 w-32 h-32 md:w-64 md:h-64 bg-primary-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 md:bottom-20 left-10 md:left-20 w-48 h-48 md:w-96 md:h-96 bg-emerald-500 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-800 mb-3 md:mb-4 font-display">
            {t('auth.register.title')}
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-slate-600 mb-4 md:mb-6 px-4">
            {t('auth.register.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-6 text-slate-600 text-sm md:text-base">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
              <span>{t('auth.register.features.secure')}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-primary-600" />
              <span>{t('auth.register.features.verified')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 md:w-5 md:h-5 text-rose-600" />
              <span>{t('auth.register.features.free')}</span>
            </div>
          </div>
        </div>

        {/* رسائل النجاح والخطأ */}
        {successMessage && (
          <div className="mb-4 md:mb-6 p-3 md:p-4 bg-emerald-50 border border-emerald-200 rounded-lg md:rounded-xl flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-emerald-800 text-sm md:text-base leading-relaxed">{successMessage}</p>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 md:mb-6 p-3 md:p-4 bg-red-50 border border-red-200 rounded-lg md:rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-red-800 text-sm md:text-base">
              <p>{errorMessage}</p>
              {waitTime && (
                <p className="text-xs md:text-sm mt-1 opacity-80">
                  {t('auth.register.messages.waitTime')} {waitTime} {t('auth.register.messages.minutes')}
                </p>
              )}
            </div>
          </div>
        )}



        {/* Registration Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl md:rounded-3xl shadow-xl border border-white/20 p-4 md:p-6 lg:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
            {/* Personal Information */}
            <div className="mb-6 md:mb-8">
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-4 md:mb-6 flex items-center gap-2 md:gap-3">
                <User className="w-5 h-5 md:w-6 md:h-6 text-primary-600" />
                {t('auth.register.personalInfo')}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* First Name */}
                <div>
                  <label className="block text-slate-700 font-medium mb-1.5 md:mb-2 text-sm md:text-base">
                    {t('auth.register.firstName')} *
                  </label>
                  <input
                    type="text"
                    {...register('firstName')}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-slate-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-sm md:text-base"
                    placeholder={t('auth.register.firstNamePlaceholder')}
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-xs md:text-sm mt-1">{errors.firstName.message}</p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-slate-700 font-medium mb-1.5 md:mb-2 text-sm md:text-base">
                    {t('auth.register.lastName')} *
                  </label>
                  <input
                    type="text"
                    {...register('lastName')}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-slate-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-sm md:text-base"
                    placeholder={t('auth.register.lastNamePlaceholder')}
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-xs md:text-sm mt-1">{errors.lastName.message}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-slate-700 font-medium mb-2">
                    {t('auth.register.email')} *
                  </label>
                  <div className="relative">
                    <Mail className={`absolute ${i18n.language === 'ar' ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5`} />
                    <input
                      type="email"
                      {...register('email')}
                      onChange={handleEmailChange}
                      className={`w-full px-4 py-3 ${i18n.language === 'ar' ? 'pr-12' : 'pl-12'} border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200`}
                      placeholder={t('auth.register.emailPlaceholder')}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                  )}
                  {/* رسالة فحص تكرار البريد الإلكتروني */}
                  {emailCheckMessage && (
                    <div className={`text-sm mt-1 flex items-center gap-1 ${
                      emailCheckStatus === 'checking' ? 'text-blue-600' :
                      emailCheckStatus === 'available' ? 'text-green-600' :
                      emailCheckStatus === 'taken' ? 'text-red-600' : ''
                    }`}>
                      {emailCheckStatus === 'checking' && (
                        <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      )}
                      {emailCheckMessage}
                    </div>
                  )}


                </div>

                {/* Phone */}
                <div>
                  <label className="block text-slate-700 font-medium mb-2">
                    {t('auth.register.phone')} *
                  </label>
                  <PhoneInput
                    value={phoneNumber}
                    onChange={(fullPhone, isValid) => {
                      setPhoneNumber(fullPhone);
                      setIsPhoneValid(isValid);
                    }}
                    placeholder={t('auth.register.phonePlaceholder')}
                    error={!isPhoneValid && phoneNumber ? t('auth.register.validation.phoneInvalid') : undefined}
                    availabilityStatus={phoneCheckStatus}
                  />
                  {/* رسالة فحص تكرار رقم الهاتف - رسائل الخطأ فقط */}
                  {phoneCheckStatus === 'taken' && phoneCheckMessage && (
                    <div className="text-sm mt-1 flex items-center gap-1 text-red-600">
                      {phoneCheckMessage}
                    </div>
                  )}
                </div>

                {/* Age */}
                <div>
                  <label className="block text-slate-700 font-medium mb-2">
                    {t('auth.register.age')} *
                  </label>
                  <div className="relative">
                    <Calendar className={`absolute ${i18n.language === 'ar' ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5`} />
                    <input
                      type="number"
                      {...register('age', { valueAsNumber: true })}
                      className={`w-full px-4 py-3 ${i18n.language === 'ar' ? 'pr-12' : 'pl-12'} border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200`}
                      placeholder={t('auth.register.agePlaceholder')}
                      min="18"
                      max="80"
                    />
                  </div>
                  {errors.age && (
                    <p className="text-red-500 text-sm mt-1">{errors.age.message}</p>
                  )}
                </div>

                {/* City */}
                <div>
                  <label className="block text-slate-700 font-medium mb-2">
                    {t('auth.register.city')} *
                  </label>
                  <div className="relative">
                    <MapPin className={`absolute ${i18n.language === 'ar' ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5`} />
                    <input
                      type="text"
                      {...register('city')}
                      className={`w-full px-4 py-3 ${i18n.language === 'ar' ? 'pr-12' : 'pl-12'} border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200`}
                      placeholder={t('auth.register.cityPlaceholder')}
                    />
                  </div>
                  {errors.city && (
                    <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
                  )}
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-slate-700 font-medium mb-2">
                    {t('auth.register.gender')} *
                  </label>
                  <select
                    {...register('gender')}
                    onChange={(e) => {
                      setSelectedGender(e.target.value as 'male' | 'female' | '');
                    }}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="">{t('auth.register.genderOptions.placeholder')}</option>
                    <option value="male">{t('auth.register.genderOptions.male')}</option>
                    <option value="female">{t('auth.register.genderOptions.female')}</option>
                  </select>
                  {errors.gender && (
                    <p className="text-red-500 text-sm mt-1">{errors.gender.message}</p>
                  )}
                </div>


              </div>
            </div>

            {/* Required Information for Complete Profile */}
            <div className="mb-6 md:mb-8">
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-4 md:mb-6 flex items-center gap-2 md:gap-3">
                <GraduationCap className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />
                {t('auth.register.requiredInfoTitle', 'معلومات إضافية مطلوبة')}
              </h2>
              <p className="text-slate-600 mb-4 text-sm md:text-base">
                {t('auth.register.requiredInfoSubtitle', 'هذه المعلومات مطلوبة لإكمال ملفك الشخصي وضمان ظهوره في نتائج البحث')}
              </p>

              {/* Bio - نبذة عن نفسك */}
              <div className="mb-6">
                <label className="block text-slate-700 font-medium mb-2">
                  {t('auth.register.bio', 'نبذة عن نفسك')} *
                </label>
                <textarea
                  {...register('bio')}
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 resize-vertical"
                  placeholder={t('auth.register.bioPlaceholder', 'اكتب نبذة مختصرة عن نفسك وشخصيتك...')}
                  maxLength={500}
                />
                {errors.bio && (
                  <p className="text-red-500 text-sm mt-1">{errors.bio.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* Nationality */}
                <div>
                  <label className="block text-slate-700 font-medium mb-2">
                    {t('auth.register.nationality')} *
                  </label>
                  <select
                    {...register('nationality')}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="">{t('auth.register.nationalityPlaceholder')}</option>
                    {getCountriesForLanguage(i18n.language).map((country) => (
                      <option key={`nationality-${country.code}`} value={country.displayName}>
                        {i18n.language === 'ar' ? `${country.flag} ${country.displayName}` : country.displayName}
                      </option>
                    ))}
                  </select>
                  {errors.nationality && (
                    <p className="text-red-500 text-sm mt-1">{errors.nationality.message}</p>
                  )}
                </div>

                {/* Profession */}
                <div>
                  <label className="block text-slate-700 font-medium mb-2">
                    {t('auth.register.profession')} *
                  </label>
                  <input
                    type="text"
                    {...register('profession')}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                    placeholder={t('auth.register.professionPlaceholder')}
                  />
                  {errors.profession && (
                    <p className="text-red-500 text-sm mt-1">{errors.profession.message}</p>
                  )}
                </div>

                {/* المستوى التعليمي */}
                <div>
                  <label className="block text-slate-700 font-medium mb-2">
                    {t('auth.register.educationLevel')}
                  </label>
                  <select
                    {...register('educationLevel')}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="">{t('auth.register.educationLevelPlaceholder')}</option>
                    <option value="primary">{t('auth.register.educationLevelPrimary')}</option>
                    <option value="secondary">{t('auth.register.educationLevelSecondary')}</option>
                    <option value="diploma">{t('auth.register.educationLevelDiploma')}</option>
                    <option value="bachelor">{t('auth.register.educationLevelBachelor')}</option>
                    <option value="master">{t('auth.register.educationLevelMaster')}</option>
                    <option value="phd">{t('auth.register.educationLevelDoctorate')}</option>
                  </select>
                  {errors.educationLevel && (
                    <p className="text-red-500 text-sm mt-1">{errors.educationLevel.message}</p>
                  )}
                </div>

                {/* Religious Commitment */}
                <div>
                  <label className="block text-slate-700 font-medium mb-2">
                    {t('auth.register.religiousCommitment')}
                  </label>
                  <select
                    {...register('religiousCommitment')}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="">{t('auth.register.religiousCommitmentPlaceholder')}</option>
                    <option value="committed">{t('auth.register.religiousCommitmentCommitted')}</option>
                    <option value="conservative">{t('auth.register.religiousCommitmentConservative')}</option>
                    <option value="prefer_not_say">{t('auth.register.religiousCommitmentPreferNotSay')}</option>
                  </select>
                  {errors.religiousCommitment && (
                    <p className="text-red-500 text-sm mt-1">{errors.religiousCommitment.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Optional Additional Information */}
            <div className="mb-6 md:mb-8">
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-4 md:mb-6 flex items-center gap-2 md:gap-3">
                <GraduationCap className="w-5 h-5 md:w-6 md:h-6 text-slate-400" />
                {t('auth.register.optionalInfoTitle', 'معلومات إضافية اختيارية')}
              </h2>
              <p className="text-slate-600 mb-4 text-sm md:text-base">
                {t('auth.register.optionalInfoSubtitle', 'يمكنك ملء هذه المعلومات لاحقاً من صفحة الملف الشخصي')}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

                {/* Height */}
                <div>
                  <label className="block text-slate-700 font-medium mb-2">
                    {t('auth.register.height')}
                  </label>
                  <input
                    type="number"
                    {...register('height', { valueAsNumber: true })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                    placeholder={t('auth.register.heightPlaceholder')}
                    min="120"
                    max="250"
                  />
                  {errors.height && (
                    <p className="text-red-500 text-sm mt-1">{errors.height.message}</p>
                  )}
                </div>

                {/* Weight */}
                <div>
                  <label className="block text-slate-700 font-medium mb-2">
                    {t('auth.register.weight')}
                  </label>
                  <input
                    type="number"
                    {...register('weight', { valueAsNumber: true })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                    placeholder={t('auth.register.weightPlaceholder')}
                    min="30"
                    max="300"
                  />
                  {errors.weight && (
                    <p className="text-red-500 text-sm mt-1">{errors.weight.message}</p>
                  )}
                </div>

              </div>
            </div>

            {/* Personal & Religious Information */}
            <div className="mb-6 md:mb-8">
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-4 md:mb-6 flex items-center gap-2 md:gap-3">
                <Heart className="w-5 h-5 md:w-6 md:h-6 text-rose-600" />
                {t('auth.register.personalReligiousInfoTitle')}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* Religiosity Level */}
                <div>
                  <label className="block text-slate-700 font-medium mb-2">
                    {t('auth.register.religiosityLevel')}
                  </label>
                  <select
                    {...register('religiosityLevel')}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="">{t('auth.register.religiosityLevelPlaceholder')}</option>
                    <option value="not_religious">{t('auth.register.religiosityLevelNotReligious')}</option>
                    <option value="slightly_religious">{t('auth.register.religiosityLevelSlightlyReligious', 'متدين قليلاً')}</option>
                    <option value="religious">{t('auth.register.religiosityLevelReligious')}</option>
                    <option value="very_religious">{t('auth.register.religiosityLevelVeryReligious', 'متدين جداً')}</option>
                    <option value="prefer_not_say">{t('auth.register.religiosityLevelPreferNotSay', 'أفضل عدم الإجابة')}</option>
                  </select>
                  {errors.religiosityLevel && (
                    <p className="text-red-500 text-sm mt-1">{errors.religiosityLevel.message}</p>
                  )}
                </div>

                {/* Prayer Commitment */}
                <div>
                  <label className="block text-slate-700 font-medium mb-2">
                    {t('auth.register.prayerCommitment')}
                  </label>
                  <select
                    {...register('prayerCommitment')}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="">{t('auth.register.prayerCommitmentPlaceholder')}</option>
                    <option value="dont_pray">{t('auth.register.prayerCommitmentDontPray')}</option>
                    <option value="pray_all">{t('auth.register.prayerCommitmentPrayAll')}</option>
                    <option value="pray_sometimes">{t('auth.register.prayerCommitmentPraySometimes')}</option>
                    <option value="prefer_not_say">{t('auth.register.prayerCommitmentPreferNotSay')}</option>
                  </select>
                  {errors.prayerCommitment && (
                    <p className="text-red-500 text-sm mt-1">{errors.prayerCommitment.message}</p>
                  )}
                </div>

                {/* Smoking */}
                <div>
                  <label className="block text-slate-700 font-medium mb-2">
                    {t('auth.register.smoking')}
                  </label>
                  <select
                    {...register('smoking')}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="">{i18n.language === 'ar' ? 'اختر حالة التدخين' : 'Select smoking status'}</option>
                    <option value="yes">{t('auth.register.smokingYes')}</option>
                    <option value="no">{t('auth.register.smokingNo')}</option>
                  </select>
                  {errors.smoking && (
                    <p className="text-red-500 text-sm mt-1">{errors.smoking.message}</p>
                  )}
                </div>

                {/* Financial Status */}
                <div>
                  <label className="block text-slate-700 font-medium mb-2">
                    {t('auth.register.financialStatus')}
                  </label>
                  <select
                    {...register('financialStatus')}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="">{t('auth.register.financialStatusPlaceholder')}</option>
                    <option value="poor">{t('auth.register.financialStatusPoor')}</option>
                    <option value="below_average">{t('auth.register.financialStatusBelowAverage')}</option>
                    <option value="average">{t('auth.register.financialStatusAverage')}</option>
                    <option value="above_average">{t('auth.register.financialStatusAboveAverage')}</option>
                    <option value="wealthy">{t('auth.register.financialStatusWealthy')}</option>
                  </select>
                  {errors.financialStatus && (
                    <p className="text-red-500 text-sm mt-1">{errors.financialStatus.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Gender-specific fields */}
            {selectedGender && (
              <div className="mb-6 md:mb-8">
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-4 md:mb-6 flex items-center gap-2 md:gap-3">
                  <User className="w-5 h-5 md:w-6 md:h-6 text-primary-600" />
                  {t('auth.register.genderSpecificInfoTitle')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {/* Beard - For males only */}
                  {selectedGender === 'male' && (
                    <div>
                      <label className="block text-slate-700 font-medium mb-2">
                        {t('auth.register.beard')}
                      </label>
                      <select
                        {...register('beard')}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      >
                        <option value="">{t('auth.register.beardPlaceholder')}</option>
                        <option value="yes">{t('auth.register.beardYes')}</option>
                        <option value="no">{t('auth.register.beardNo')}</option>
                      </select>
                      {errors.beard && (
                        <p className="text-red-500 text-sm mt-1">{errors.beard.message}</p>
                      )}
                    </div>
                  )}

                  {/* Hijab - For females only */}
                  {selectedGender === 'female' && (
                    <div>
                      <label className="block text-slate-700 font-medium mb-2">
                        {t('auth.register.hijab')}
                      </label>
                      <select
                        {...register('hijab')}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      >
                        <option value="">{t('auth.register.hijabPlaceholder')}</option>
                        <option value="no_hijab">{t('auth.register.hijabNoHijab')}</option>
                        <option value="hijab">{t('auth.register.hijabHijab')}</option>
                        <option value="niqab">{t('auth.register.hijabNiqab')}</option>
                        <option value="prefer_not_say">{t('auth.register.hijabPreferNotSay')}</option>
                      </select>
                      {errors.hijab && (
                        <p className="text-red-500 text-sm mt-1">{errors.hijab.message}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Terms and Conditions */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  {...register('acceptTerms')}
                  className="mt-1 w-5 h-5 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                />
                <label className="text-slate-700">
                  {t('auth.register.terms.acceptTerms')}{' '}
                  <Link to="/terms" className="text-primary-600 hover:text-primary-700 font-medium">
                    {t('auth.register.terms.termsLink')}
                  </Link>
                  {' '}{t('auth.register.terms.termsText')}
                </label>
              </div>
              {errors.acceptTerms && (
                <p className="text-red-500 text-sm">{errors.acceptTerms.message}</p>
              )}

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  {...register('acceptPrivacy')}
                  className="mt-1 w-5 h-5 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                />
                <label className="text-slate-700">
                  {t('auth.register.terms.acceptPrivacy')}{' '}
                  <Link to="/privacy" className="text-primary-600 hover:text-primary-700 font-medium">
                    {t('auth.register.terms.privacyLink')}
                  </Link>
                  {' '}{t('auth.register.terms.privacyText')}
                </label>
              </div>
              {errors.acceptPrivacy && (
                <p className="text-red-500 text-sm">{errors.acceptPrivacy.message}</p>
              )}
            </div>

            {/* Captcha Component */}
            {CaptchaService.isEnabled() && (
              <div className="space-y-2">
                <CaptchaComponent
                  action="register"
                  onVerify={handleCaptchaVerify}
                  onError={handleCaptchaError}
                  disabled={isLoading}
                  size="normal"
                  theme="auto"
                  showScore={false}
                  autoExecute={false}
                  userId={watch('email')} // استخدام البريد الإلكتروني كمعرف مؤقت
                />
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={isLoading || (CaptchaService.isEnabled() && !captchaVerified)}
                className="w-full bg-gradient-to-r from-primary-600 to-emerald-600 text-white py-4 px-8 rounded-xl font-bold text-lg hover:from-primary-700 hover:to-emerald-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('auth.register.submitButtonLoading')}
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Send className="w-5 h-5" />
                    {t('auth.register.submitButton')}
                  </div>
                )}
              </button>
            </div>

            {/* Login Link */}
            <div className="text-center pt-4">
              <p className="text-slate-600">
                {t('auth.register.alreadyHaveAccount')}{' '}
                <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                  {t('auth.register.loginLink')}
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
