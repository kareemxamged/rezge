import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  Key,
  AlertTriangle,
  CheckCircle,
  Phone,
  Mail,
  Users,
  User,
  Settings,
  Save,
  RefreshCw,
  Clock

} from 'lucide-react';
import { validatePasswordStrength } from '../utils/security';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { AdvancedEmailService } from '../lib/finalEmailServiceNew';
import { useNavigate, useLocation } from 'react-router-dom';
import PhoneInput from './PhoneInput';
import ContactUpdateRateLimitService from '../lib/contactUpdateRateLimit';
import { profileImageService } from '../lib/profileImageService';
import EmailSyncWarning from './EmailSyncWarning';
import { notificationEmailService } from '../lib/notificationEmailService';
import type {
  RateLimitCheckResult
} from '../lib/contactUpdateRateLimit';

// Schema for security settings (بدون حقول كلمة المرور)
const createSecuritySchema = (t: any) => z.object({
  email: z.string().email(t('securitySettings.messages.emailInvalid')),
  twoFactorEnabled: z.boolean(),
  showPhone: z.boolean(),
  showEmail: z.boolean(),
  allowMessages: z.boolean(),
  familyCanView: z.boolean(),
  profileVisibility: z.enum(['public', 'members', 'verified', 'private']),
  profileImageVisible: z.boolean(),
  loginNotifications: z.boolean(),
  messageNotifications: z.boolean()
});

// Schema منفصل لتغيير كلمة المرور (لم نعد نحتاجه لأننا نستخدم HTML validation)
// const passwordChangeSchema = z.object({
//   currentPassword: z.string().min(1, 'يجب إدخال كلمة المرور الحالية'),
//   newPassword: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
//   confirmPassword: z.string().min(1, 'يجب تأكيد كلمة المرور الجديدة')
// }).refine((data) => data.newPassword === data.confirmPassword, {
//   message: "كلمة المرور الجديدة وتأكيدها غير متطابقتين",
//   path: ["confirmPassword"]
// });

type SecurityFormData = z.infer<ReturnType<typeof createSecuritySchema>>;
// type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>; // لم نعد نحتاجه

const SecuritySettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile, updateProfile, enableTwoFactor, disableTwoFactor, refreshProfile, isLoading: authLoading, isAuthenticated } = useAuth();

  // حالات نموذج الإعدادات العامة
  const [isLoading, setIsLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [, setIsPhoneValid] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // حالات نموذج معلومات التواصل المنفصل
  const [isContactLoading, setIsContactLoading] = useState(false);
  const [contactSuccessMessage, setContactSuccessMessage] = useState('');
  const [contactErrorMessage, setContactErrorMessage] = useState('');

  // حالات تحديث البريد الإلكتروني
  const [pendingEmailChange, setPendingEmailChange] = useState<string | null>(null);
  const [emailChangeToken, setEmailChangeToken] = useState<string | null>(null);

  // حالات إدارة حدود الطلبات
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitCheckResult | null>(null);
  const [isCheckingRateLimit, setIsCheckingRateLimit] = useState(false);



  // تتبع الحقول المحدثة مؤخراً لمنع إعادة تعيينها
  const [recentlyUpdatedFields, setRecentlyUpdatedFields] = useState<Set<string>>(new Set());



  // حالات نموذج تغيير كلمة المرور المنفصل
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState('');
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('');
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [currentPasswordValue, setCurrentPasswordValue] = useState('');
  const [confirmPasswordValue, setConfirmPasswordValue] = useState('');

  // حساب قوة كلمة المرور باستخدام useMemo لتجنب إعادة الحساب المستمرة
  const passwordStrength = useMemo(() => {
    if (!newPasswordValue) return { score: 0, feedback: [] as string[] };
    return validatePasswordStrength(newPasswordValue);
  }, [newPasswordValue]);

  // دالة للحصول على نص قوة كلمة المرور
  const getPasswordStrengthText = (score: number) => {
    switch (score) {
      case 0:
      case 1:
        return t('securitySettings.passwordChange.strengthWeak');
      case 2:
        return t('securitySettings.passwordChange.strengthFair');
      case 3:
        return t('securitySettings.passwordChange.strengthGood');
      case 4:
        return t('securitySettings.passwordChange.strengthStrong');
      case 5:
        return t('securitySettings.passwordChange.strengthVeryStrong');
      default:
        return t('securitySettings.passwordChange.strengthWeak');
    }
  };



  // دالة للحصول على لون قوة كلمة المرور
  const getPasswordStrengthColor = (score: number) => {
    switch (score) {
      case 0:
      case 1:
        return 'bg-red-500';
      case 2:
        return 'bg-amber-500';
      case 3:
        return 'bg-yellow-500';
      case 4:
        return 'bg-emerald-500';
      case 5:
        return 'bg-green-600';
      default:
        return 'bg-red-500';
    }
  };



  // نموذج الإعدادات العامة
  const securitySchema = useMemo(() => createSecuritySchema(t), [t]);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<SecurityFormData>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      email: '',
      twoFactorEnabled: false,
      showPhone: false,
      showEmail: true,
      allowMessages: true,
      familyCanView: true,
      profileVisibility: 'verified',
      profileImageVisible: true,
      loginNotifications: true,
      messageNotifications: true
    }
  });

  // لم نعد نحتاج react-hook-form لنموذج كلمة المرور لأننا نستخدم HTML form validation

  // مراقبة رسائل النجاح من صفحة التحقق وإعادة تحميل البيانات
  useEffect(() => {
    const stateMessage = location.state?.message;
    if (stateMessage) {
      console.log('📧 Received success message from verification page:', stateMessage);
      // عرض الرسالة في أعلى الصفحة فقط
      setSuccessMessage(stateMessage);

      // إعادة تحميل بيانات المستخدم لضمان ظهور التحديثات
      console.log('🔄 Refreshing profile after receiving verification message...');
      refreshProfile().then(() => {
        console.log('✅ Profile refreshed after email verification');
        // إعادة تحميل البيانات في النموذج أيضاً
        if (userProfile) {
          setValue('email', userProfile.email || '');
          setPhoneNumber(userProfile.phone || '');
        }
      }).catch((error) => {
        console.error('❌ Error refreshing profile:', error);
      });

      // إخفاء الرسالة بعد 5 ثوان
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);

      // مسح الرسالة من state لتجنب إظهارها مرة أخرى
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, refreshProfile, navigate, location.pathname]);

  // مراقبة تغييرات userProfile وتحديث النموذج (فقط للحقول الأساسية)
  useEffect(() => {
    if (userProfile) {
      console.log('🔄 UserProfile changed, updating basic form fields:', {
        email: userProfile.email,
        phone: userProfile.phone
      });
      setValue('email', userProfile.email || '');
      setPhoneNumber(userProfile.phone || '');
    }
  }, [userProfile?.email, userProfile?.phone, setValue]);

  // تحميل بيانات المستخدم عند تحميل الصفحة
  useEffect(() => {
    if (userProfile) {
      console.log('🔄 SecuritySettingsPage: Loading user profile data:', {
        phone: userProfile.phone,
        email: userProfile.email,
        id: userProfile.id,
        allow_messages: userProfile.allow_messages
      });
      console.log('🔍 recentlyUpdatedFields:', Array.from(recentlyUpdatedFields));

      // تحديث الحقول فقط إذا لم يتم تحديثها مؤخراً
      if (!recentlyUpdatedFields.has('email')) {
        setValue('email', userProfile.email || '');
      }
      if (!recentlyUpdatedFields.has('twoFactorEnabled')) {
        setValue('twoFactorEnabled', userProfile.two_factor_enabled ?? false);
      }
      if (!recentlyUpdatedFields.has('showPhone')) {
        setValue('showPhone', userProfile.show_phone ?? false);
      }
      if (!recentlyUpdatedFields.has('showEmail')) {
        setValue('showEmail', userProfile.show_email ?? false);
      }
      if (!recentlyUpdatedFields.has('allowMessages')) {
        console.log('🔄 تحديث allowMessages في النموذج:', userProfile.allow_messages);
        // استخدام القيمة الفعلية من قاعدة البيانات (افتراضي true فقط إذا كانت undefined/null)
        setValue('allowMessages', userProfile.allow_messages ?? true);
      } else {
        console.log('⏭️ تم تخطي تحديث allowMessages (محدث مؤخراً)');
      }
      if (!recentlyUpdatedFields.has('familyCanView')) {
        setValue('familyCanView', userProfile.family_can_view ?? false);
      }
      if (!recentlyUpdatedFields.has('profileVisibility')) {
        setValue('profileVisibility', userProfile.profile_visibility ?? 'verified');
      }
      if (!recentlyUpdatedFields.has('profileImageVisible')) {
        setValue('profileImageVisible', userProfile.profile_image_visible !== false);
      }
      if (!recentlyUpdatedFields.has('loginNotifications')) {
        setValue('loginNotifications', userProfile.login_notifications ?? true);
      }
      if (!recentlyUpdatedFields.has('messageNotifications')) {
        setValue('messageNotifications', userProfile.message_notifications ?? true);
      }

      const phoneValue = userProfile.phone || '';
      console.log('SecuritySettingsPage: Setting phone number to:', phoneValue);
      setPhoneNumber(phoneValue);
      setIsPhoneValid(!!phoneValue);
    }
  }, [userProfile, setValue, recentlyUpdatedFields]);

  // دالة تنظيف الطلبات المنتهية الصلاحية
  const cleanupExpiredRequests = async () => {
    if (!user) return;

    try {
      console.log('🧹 Cleaning up expired email change requests...');
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('email_change_requests')
        .delete()
        .eq('user_id', user.id)
        .eq('verified', false)
        .lt('expires_at', now);

      if (error) {
        console.error('Error cleaning up expired requests:', error);
      } else {
        console.log('✅ Expired requests cleaned up');
      }
    } catch (error) {
      console.error('Error in cleanup process:', error);
    }
  };

  // التحقق من طلبات تحديث البريد الإلكتروني المعلقة
  useEffect(() => {
    const checkPendingEmailChange = async () => {
      if (!user) return;

      try {
        // تنظيف الطلبات المنتهية الصلاحية أولاً
        await cleanupExpiredRequests();

        // ثم البحث عن الطلبات النشطة
        const { data, error } = await supabase
          .from('email_change_requests')
          .select('new_email, verification_token, expires_at')
          .eq('user_id', user.id)
          .eq('verified', false)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error checking pending email change:', error);
          return;
        }

        if (data && data.length > 0) {
          const request = data[0];
          console.log('📧 Found pending email change request:', request);
          setPendingEmailChange(request.new_email);
          setEmailChangeToken(request.verification_token);
        } else {
          console.log('✅ No pending email change requests found');
          setPendingEmailChange(null);
          setEmailChangeToken(null);
        }
      } catch (error) {
        console.error('Error checking pending email change:', error);
      }
    };

    checkPendingEmailChange();
    checkRateLimit();
  }, [user]);

  // دالة فحص حدود الطلبات
  const checkRateLimit = async () => {
    if (!user) return;

    try {
      setIsCheckingRateLimit(true);
      console.log('🔍 Checking contact update rate limit...');

      const result = await ContactUpdateRateLimitService.checkRateLimit(user.id);
      setRateLimitInfo(result);

      console.log('✅ Rate limit check completed:', result);
    } catch (error) {
      console.error('❌ Error checking rate limit:', error);
      setRateLimitInfo(null);
    } finally {
      setIsCheckingRateLimit(false);
    }
  };

  // دالة لإعادة فحص الطلبات المعلقة (للاستخدام بعد محاولة إنشاء طلب جديد)
  const recheckPendingRequests = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('email_change_requests')
        .select('new_email, verification_token, expires_at')
        .eq('user_id', user.id)
        .eq('verified', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error rechecking pending requests:', error);
        return;
      }

      if (data && data.length > 0) {
        const request = data[0];
        console.log('🔄 Rechecked - Found pending request:', request);
        setPendingEmailChange(request.new_email);
        setEmailChangeToken(request.verification_token);
      } else {
        console.log('🔄 Rechecked - No pending requests');
        setPendingEmailChange(null);
        setEmailChangeToken(null);
      }
    } catch (error) {
      console.error('Error rechecking pending requests:', error);
    }
  };

  // مراقبة قوة كلمة المرور تتم الآن في onChange handler



  // تم نقل منع الاقتراحات إلى SecurePasswordInput component















  // دالة إنشاء طلب تحديث البريد الإلكتروني ورقم الهاتف
  const createEmailChangeRequest = async (newEmail: string, newPhone?: string | undefined, currentEmail?: string, currentPhone?: string) => {
    try {
      if (!user) {
        throw new Error(t('securitySettings.messages.authRequired'));
      }

      // تحديد نوع التغييرات المطلوبة
      const emailChanged = newEmail && newEmail !== (currentEmail || userProfile?.email);
      const phoneChanged = newPhone !== (currentPhone || userProfile?.phone);

      console.log('📧 Creating change request with details:', {
        emailChanged,
        phoneChanged,
        newEmail: emailChanged ? newEmail : 'لم يتغير',
        newPhone: phoneChanged ? newPhone : 'لم يتغير',
        currentEmail: currentEmail || userProfile?.email,
        currentPhone: currentPhone || userProfile?.phone
      });

      // التحقق من وجود طلب موجود بالفعل
      console.log('🔍 Checking for existing email change requests...');
      const { data: existingRequests, error: checkError } = await supabase
        .from('email_change_requests')
        .select('id, new_email, new_phone, expires_at, created_at, verification_token')
        .eq('user_id', user.id)
        .eq('verified', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (checkError) {
        console.error('Error checking existing requests:', checkError);
        throw new Error(t('securitySettings.messages.emailCheckError'));
      }

      if (existingRequests && existingRequests.length > 0) {
        const existingRequest = existingRequests[0];
        console.log('❌ Found existing request:', existingRequest);

        // تحديث حالة الواجهة لإظهار التنبيه
        setPendingEmailChange(existingRequest.new_email);
        setEmailChangeToken(existingRequest.verification_token);

        throw new Error(t('securitySettings.messages.emailChangeRequestExists'));
      }

      console.log('✅ No existing requests found, creating new one...');

      // إنشاء token فريد
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 4); // ينتهي خلال 4 ساعات

      // حفظ طلب التحديث في قاعدة البيانات
      const { error } = await supabase
        .from('email_change_requests')
        .insert({
          user_id: user.id,
          current_email: currentEmail || user.email,
          new_email: newEmail,
          current_phone: currentPhone || userProfile?.phone,
          new_phone: newPhone,
          verification_token: token,
          expires_at: expiresAt.toISOString()
        });

      if (error) {
        console.error('Error inserting email change request:', error);
        throw new Error(t('securitySettings.messages.emailChangeRequestCreateError') + error.message);
      }

      // إرسال بريد التأكيد الفعلي مع معلومات التغيير
      const confirmationUrl = `${window.location.origin}/verify-email-change?token=${token}`;

      // إرسال إيميل تأكيد حقيقي
      console.log('📧 إرسال إيميل تأكيد تغيير البيانات عبر AdvancedEmailService (موجه للخدمة الحقيقية)...');
      const emailResult = await AdvancedEmailService.sendEmailChangeConfirmation(
        currentEmail || user.email,
        confirmationUrl,
        {
          newEmail: emailChanged ? newEmail : null,
          currentEmail: currentEmail || user.email,
          newPhone: phoneChanged ? newPhone : null,
          currentPhone: currentPhone || userProfile?.phone,
          emailChanged,
          phoneChanged
        },
        i18n.language as 'ar' | 'en'
      );

      if (!emailResult.success) {
        throw new Error(t('securitySettings.messages.emailSendError') + ': ' + (emailResult.error || 'Unknown error'));
      }

      setPendingEmailChange(newEmail);
      setEmailChangeToken(token);

      console.log('✅ Contact change request created successfully');
      return true;
    } catch (error) {
      console.error('Error creating contact change request:', error);
      throw error;
    }
  };

  // دالة إلغاء طلب تحديث البريد الإلكتروني
  const cancelEmailChangeRequest = async () => {
    try {
      if (!user || !emailChangeToken) return;

      const { error } = await supabase
        .from('email_change_requests')
        .delete()
        .eq('user_id', user.id)
        .eq('verification_token', emailChangeToken);

      if (error) {
        console.error('Error canceling email change request:', error);
        setContactErrorMessage(t('securitySettings.messages.emailChangeRequestCancelError'));
        return;
      }

      setPendingEmailChange(null);
      setEmailChangeToken(null);
      setContactSuccessMessage(t('securitySettings.messages.emailChangeRequestCancelSuccess'));

      setTimeout(() => {
        setContactSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error canceling email change request:', error);
      setContactErrorMessage(t('securitySettings.messages.emailChangeRequestCancelUnexpectedError'));
    }
  };

  // دالة فحص تكرار البيانات
  const checkDataDuplication = async (email: string, phone: string) => {
    try {
      const errors: string[] = [];

      // فحص البريد الإلكتروني
      if (email && email !== userProfile?.email) {
        console.log('🔍 Checking email duplication for:', email);
        const { data: emailExists, error: emailError } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .neq('id', user!.id)
          .limit(1);

        if (emailError) {
          console.error('Error checking email duplication:', emailError);
          throw new Error(t('securitySettings.messages.emailCheckError'));
        }

        if (emailExists && emailExists.length > 0) {
          errors.push(t('securitySettings.messages.emailDuplicate'));
        } else {
          console.log('✅ Email is available');
        }
      }

      // فحص رقم الهاتف
      if (phone && phone !== userProfile?.phone) {
        console.log('🔍 Checking phone duplication for:', phone);
        const { data: phoneExists, error: phoneError } = await supabase
          .from('users')
          .select('id')
          .eq('phone', phone)
          .neq('id', user!.id)
          .limit(1);

        if (phoneError) {
          console.error('Error checking phone duplication:', phoneError);
          throw new Error(t('securitySettings.messages.phoneCheckError'));
        }

        if (phoneExists && phoneExists.length > 0) {
          errors.push(t('securitySettings.messages.phoneDuplicate'));
        } else {
          console.log('✅ Phone is available');
        }
      }

      // إذا كان هناك أخطاء، اجمعها في رسالة واحدة
      if (errors.length > 0) {
        const errorMessage = errors.join('\n\n');
        throw new Error(errorMessage);
      }

      return true;
    } catch (error) {
      throw error;
    }
  };

  // معالجة إرسال نموذج معلومات التواصل
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsContactLoading(true);
    setContactErrorMessage('');
    setContactSuccessMessage('');

    try {
      if (!user) {
        setContactErrorMessage(t('securitySettings.messages.authRequired'));
        return;
      }

      // الحصول على البيانات من النموذج
      const formData = new FormData(e.target as HTMLFormElement);
      const newEmail = formData.get('email') as string;
      const currentEmail = userProfile?.email || user.email; // استخدام البريد من قاعدة البيانات أولاً

      console.log('Updating contact info for user:', user.id);
      console.log('Phone:', phoneNumber);
      console.log('Email change:', currentEmail, '->', newEmail);

      // التحقق من التغييرات
      const emailChanged = newEmail && newEmail !== currentEmail;
      const phoneChanged = phoneNumber !== userProfile?.phone;

      if (emailChanged || phoneChanged) {
        // فحص حدود الطلبات أولاً
        console.log('🔍 Checking rate limits before processing request...');
        const rateLimitResult = await ContactUpdateRateLimitService.checkRateLimit(user.id);

        if (!rateLimitResult.allowed) {
          const message = ContactUpdateRateLimitService.getStatusMessage(rateLimitResult);
          throw new Error(message);
        }

        // فحص تكرار البيانات قبل المتابعة
        console.log('🔍 Checking data duplication before proceeding...', {
          emailToCheck: emailChanged ? newEmail : '',
          phoneToCheck: phoneChanged ? phoneNumber : ''
        });

        await checkDataDuplication(
          emailChanged ? newEmail : '',
          phoneChanged ? phoneNumber : ''
        );

        console.log('✅ No data duplication found, proceeding with update...');

        // إنشاء طلب تحديث يتضمن البريد الإلكتروني الجديد و/أو رقم الهاتف الجديد
        const emailToUpdate = emailChanged ? newEmail : currentEmail;
        const phoneToUpdate = phoneChanged ? phoneNumber : userProfile?.phone;

        console.log('📧 Creating change request:', {
          emailChanged,
          phoneChanged,
          emailToUpdate,
          phoneToUpdate
        });

        await createEmailChangeRequest(
          emailToUpdate || currentEmail || '',
          phoneToUpdate || undefined,
          currentEmail,
          userProfile?.phone
        );

        // تسجيل الطلب الناجح في نظام حدود الطلبات
        console.log('📝 Recording successful contact update request...');
        const recordResult = await ContactUpdateRateLimitService.recordSuccessfulRequest(user.id);
        console.log('✅ Successful request recorded:', recordResult);

        // تحديث معلومات حدود الطلبات
        await checkRateLimit();

        // رسالة موحدة لجميع أنواع التحديثات
        setContactSuccessMessage(t('securitySettings.messages.verificationLinkSent'));
      } else {
        // لا توجد تغييرات
        setContactSuccessMessage(t('securitySettings.messages.noChangesDetected'));
      }

      // إخفاء رسالة النجاح بعد 5 ثوان
      setTimeout(() => {
        setContactSuccessMessage('');
      }, 5000);
    } catch (error) {
      console.error('Contact update error:', error);

      // إعادة فحص الطلبات المعلقة لتحديث الواجهة
      await recheckPendingRequests();

      // عرض رسالة الخطأ المحددة إذا كانت متاحة
      if (error instanceof Error) {
        setContactErrorMessage(error.message);
      } else {
        setContactErrorMessage(t('securitySettings.messages.contactUpdateError'));
      }
    } finally {
      setIsContactLoading(false);
    }
  };

  // معالج تغيير حالة المصادقة الثنائية
  const handleTwoFactorToggle = async (enabled: boolean) => {
    console.log('handleTwoFactorToggle called:', { enabled, authLoading, isAuthenticated, hasUser: !!user, hasUserProfile: !!userProfile });

    // التحقق من حالة المصادقة أولاً
    if (authLoading) {
      setErrorMessage(t('securitySettings.messages.waitForDataLoad'));
      setValue('twoFactorEnabled', !enabled); // إعادة تعيين المفتاح
      return;
    }

    if (!isAuthenticated || !user) {
      setErrorMessage(t('securitySettings.messages.authRequired'));
      setValue('twoFactorEnabled', !enabled); // إعادة تعيين المفتاح
      return;
    }

    if (!userProfile) {
      setErrorMessage(t('securitySettings.messages.profileNotLoaded'));
      setValue('twoFactorEnabled', !enabled); // إعادة تعيين المفتاح
      return;
    }

    setIsLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      if (enabled) {
        console.log('Attempting to enable 2FA...');
        // تفعيل المصادقة الثنائية
        const result = await enableTwoFactor();
        console.log('Enable 2FA result:', result);

        if (result.success) {
          // التوجه لصفحة التحقق
          navigate('/two-factor-verification', {
            state: {
              email: userProfile.email,
              codeType: 'enable_2fa',
              developmentCode: result.developmentCode
            }
          });
        } else {
          setErrorMessage(result.error || t('securitySettings.messages.twoFactorEnableError'));
          setValue('twoFactorEnabled', false); // إعادة تعيين المفتاح
        }
      } else {
        console.log('Attempting to disable 2FA...');
        // إلغاء تفعيل المصادقة الثنائية
        const result = await disableTwoFactor();
        console.log('Disable 2FA result:', result);

        if (result.success) {
          // التوجه لصفحة التحقق
          navigate('/two-factor-verification', {
            state: {
              email: userProfile.email,
              codeType: 'disable_2fa',
              developmentCode: result.developmentCode
            }
          });
        } else {
          setErrorMessage(result.error || t('securitySettings.messages.twoFactorDisableError'));
          setValue('twoFactorEnabled', true); // إعادة تعيين المفتاح
        }
      }
    } catch (error) {
      console.error('Two factor toggle error:', error);
      setErrorMessage(t('securitySettings.messages.unexpectedError'));
      setValue('twoFactorEnabled', !enabled); // إعادة تعيين المفتاح
    } finally {
      setIsLoading(false);
    }
  };

  // دالة تحديث الإعدادات العامة (بدون كلمة المرور)
  const onSubmit = async (data: SecurityFormData) => {
    setIsLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      if (!user || !userProfile) {
        setErrorMessage(t('securitySettings.messages.authRequired'));
        return;
      }

      // تحديث البيانات
      const updates = {
        email: data.email,
        phone: phoneNumber,
        two_factor_enabled: data.twoFactorEnabled,
        show_phone: data.showPhone,
        show_email: data.showEmail,
        allow_messages: data.allowMessages,
        family_can_view: data.familyCanView,
        profile_visibility: data.profileVisibility,
        profile_image_visible: data.profileImageVisible,
        login_notifications: data.loginNotifications,
        message_notifications: data.messageNotifications
      };

      const result = await updateProfile(updates);

      if (result.success) {
        // تحديث إعدادات الصورة الشخصية في خدمة الصور أيضاً
        try {
          await profileImageService.updateImageVisibility(userProfile.id, data.profileImageVisible);
        } catch (imageError) {
          console.error('خطأ في تحديث إعدادات الصورة:', imageError);
          // لا نوقف العملية، فقط نسجل الخطأ
        }

        // التحقق من وجود رسالة خاصة (مثل تأكيد البريد الإلكتروني)
        if (result.error && result.error.includes('تأكيد')) {
          // هذه رسالة إعلامية وليس خطأ
          setSuccessMessage(result.error);
        } else {
          setSuccessMessage(t('securitySettings.messages.settingsUpdateSuccess'));
        }

        // إعادة تحميل بيانات المستخدم لضمان التحديث في الواجهة
        await refreshProfile();

        // إرسال حدث لتحديث الهيدر والمكونات الأخرى
        window.dispatchEvent(new CustomEvent('profileSettingsUpdated'));
      } else {
        setErrorMessage(result.error || t('securitySettings.messages.settingsUpdateError'));
      }
    } catch (error) {
      console.error('Security update error:', error);
      setErrorMessage(t('securitySettings.messages.settingsUpdateError'));
    } finally {
      setIsLoading(false);
    }
  };

  // دالة تغيير كلمة المرور المنفصلة
  const handlePasswordFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // منع السلوك الافتراضي

    // استخدام state بدلاً من FormData
    const currentPassword = currentPasswordValue;
    const newPassword = newPasswordValue;
    const confirmPassword = confirmPasswordValue;

    // التحقق من الحقول المطلوبة
    if (!currentPassword) {
      setPasswordErrorMessage(t('securitySettings.messages.passwordRequired'));
      return;
    }

    if (!newPassword) {
      setPasswordErrorMessage(t('securitySettings.messages.newPasswordRequired'));
      return;
    }

    if (newPassword.length < 8) {
      setPasswordErrorMessage(t('securitySettings.messages.passwordMinLength'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMessage(t('securitySettings.messages.passwordMismatch'));
      return;
    }



    setIsPasswordLoading(true);
    setPasswordSuccessMessage('');
    setPasswordErrorMessage('');

    try {
      if (!user || !userProfile) {
        setPasswordErrorMessage(t('securitySettings.messages.authRequired'));
        return;
      }

      // التحقق من كلمة المرور الحالية
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userProfile.email,
        password: currentPassword
      });

      if (signInError) {
        setPasswordErrorMessage(t('securitySettings.messages.invalidCurrentPassword'));
        return;
      }

      // تحديث كلمة المرور
      const { error: passwordError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (passwordError) {
        setPasswordErrorMessage(t('securitySettings.messages.passwordUpdateFailed') + passwordError.message);
        return;
      }

      setPasswordSuccessMessage(t('securitySettings.messages.passwordUpdateSuccess'));

      // إرسال إشعار تغيير كلمة المرور
      try {
        await notificationEmailService.sendPasswordChangeNotification(
          userProfile.email,
          userProfile.first_name || 'المستخدم'
        );
        console.log('✅ تم إرسال إشعار تغيير كلمة المرور');
      } catch (emailError) {
        console.error('⚠️ فشل في إرسال إشعار تغيير كلمة المرور:', emailError);
        // لا نعرض خطأ للمستخدم لأن كلمة المرور تم تغييرها بنجاح
      }

      // مسح النموذج
      setCurrentPasswordValue('');
      setNewPasswordValue('');
      setConfirmPasswordValue('');

      // إخفاء رسالة النجاح بعد 5 ثوان
      setTimeout(() => {
        setPasswordSuccessMessage('');
      }, 5000);

    } catch (error) {
      console.error('Password update error:', error);
      setPasswordErrorMessage(t('securitySettings.messages.passwordUpdateError'));
    } finally {
      setIsPasswordLoading(false);
    }
  };

  // عرض شاشة التحميل إذا كانت البيانات لا تزال تحمل
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-emerald-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-slate-600">جاري تحميل إعدادات الأمان...</p>
        </div>
      </div>
    );
  }

  // التحقق من المصادقة
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-emerald-50 flex items-center justify-center" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <p className="text-slate-600 mb-4">{t('securitySettings.messages.loginRequired')}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            {t('securitySettings.messages.loginButton')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-emerald-50 py-8" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      {/* تحذير مزامنة البريد الإلكتروني */}
      <EmailSyncWarning />

      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-20 right-20 w-64 h-64 bg-primary-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-emerald-500 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative overflow-visible">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4 font-display">
            {t('securitySettings.title')}
          </h1>
          <p className="text-xl text-slate-600">
            {t('securitySettings.subtitle')}
          </p>
        </div>

        {/* رسائل النجاح والخطأ */}
        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-emerald-800 text-sm leading-relaxed">{successMessage}</p>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 text-sm leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {/* قسم معلومات التواصل المنفصل */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 mb-8 overflow-visible relative z-10">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
            <Phone className="w-6 h-6 text-primary-600" />
            {t('securitySettings.contactInfo.title')}
          </h2>
          <p className="text-slate-600 mb-6 text-sm">
            {t('securitySettings.contactInfo.description')}
          </p>

          {/* معلومات حدود الطلبات - تظهر فقط عند وجود قيود */}
          {rateLimitInfo && !rateLimitInfo.allowed && (
            <div className={`p-4 rounded-lg border mb-6 ${
              ContactUpdateRateLimitService.isDailyLimitReached(rateLimitInfo)
                ? 'bg-red-50 border-red-200'
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-start gap-3">
                {ContactUpdateRateLimitService.isDailyLimitReached(rateLimitInfo) ? (
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <Clock className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    ContactUpdateRateLimitService.isDailyLimitReached(rateLimitInfo)
                      ? 'text-red-800'
                      : 'text-yellow-800'
                  }`}>
                    {ContactUpdateRateLimitService.getStatusMessage(rateLimitInfo)}
                  </p>








                </div>
              </div>
            </div>
          )}

          {/* مؤشر تحميل فحص الحدود */}
          {isCheckingRateLimit && (
            <div className="flex items-center gap-2 text-slate-600 mb-6">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
              <span className="text-sm">{t('securitySettings.contactInfo.checkingLimits')}</span>
            </div>
          )}

          <form onSubmit={handleContactSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Email */}
              <div>
                <label className="block text-slate-700 font-medium mb-2">
                  {t('securitySettings.contactInfo.email')} *
                </label>
                <div className="relative">
                  <Mail className={`absolute ${i18n.language === 'ar' ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5`} />
                  <input
                    type="email"
                    {...register('email')}
                    className={`w-full px-4 py-3 ${i18n.language === 'ar' ? 'pr-12' : 'pl-12'} border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200`}
                    placeholder={t('securitySettings.contactInfo.emailPlaceholder')}
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-slate-700 font-medium mb-2">
                  {t('securitySettings.contactInfo.phone')}
                </label>
                <PhoneInput
                  value={phoneNumber}
                  onChange={(fullPhone, isValid) => {
                    console.log('SecuritySettingsPage: PhoneInput onChange:', { fullPhone, isValid });
                    setPhoneNumber(fullPhone);
                    setIsPhoneValid(isValid);
                  }}
                  placeholder={t('securitySettings.contactInfo.phonePlaceholder')}
                />
              </div>
            </div>

            {/* رسائل النجاح والخطأ */}
            {contactSuccessMessage && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-emerald-800 font-medium">{contactSuccessMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {contactErrorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-red-800 font-medium whitespace-pre-line">
                      {contactErrorMessage}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* رسالة تنبيهية لطلب تحديث البريد الإلكتروني المعلق */}
            {pendingEmailChange && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-amber-800 font-medium text-sm">
                      {t('securitySettings.contactInfo.pendingChangeTitle')}
                    </p>
                    <p className="text-amber-700 text-sm mt-1">
                      {t('securitySettings.contactInfo.pendingChangeDescription')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={cancelEmailChangeRequest}
                    className="px-3 py-1 bg-amber-200 hover:bg-amber-300 text-amber-800 rounded text-xs font-medium transition-colors"
                  >
                    {t('securitySettings.contactInfo.cancelRequest')}
                  </button>
                </div>
              </div>
            )}



            {/* زر حفظ معلومات التواصل */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={
                  isContactLoading ||
                  (rateLimitInfo && rateLimitInfo.allowed === false)
                }
                className="px-8 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isContactLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {t('securitySettings.contactInfo.saving')}
                  </>
                ) : rateLimitInfo && !rateLimitInfo.allowed ? (
                  <>
                    <Clock className="w-4 h-4" />
                    {t('securitySettings.contactInfo.notAvailable')}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {t('securitySettings.contactInfo.saveButton')}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* قسم تغيير كلمة المرور المنفصل */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 mb-8 relative z-0">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
            <Lock className="w-6 h-6 text-primary-600" />
            {t('securitySettings.passwordChange.title')}
          </h2>
          <p className="text-slate-600 mb-6 text-sm">
            {t('securitySettings.passwordChange.description')}
          </p>

              <form
                onSubmit={handlePasswordFormSubmit}
                className="space-y-6"
                autoComplete="off"
                noValidate
              >
                {/* Current Password */}
                <div>
                  <label className="block text-slate-700 font-medium mb-2">
                    {t('securitySettings.passwordChange.currentPassword')}
                  </label>
                  <div className="relative">
                    <Lock className={`absolute ${i18n.language === 'ar' ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5`} />
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPasswordValue}
                      onChange={(e) => setCurrentPasswordValue(e.target.value)}
                      placeholder={t('securitySettings.passwordChange.currentPasswordPlaceholder')}
                      className={`w-full px-4 py-3 ${i18n.language === 'ar' ? 'pr-12 pl-12' : 'pl-12 pr-12'} border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200`}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className={`absolute ${i18n.language === 'ar' ? 'left-3' : 'right-3'} top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600`}
                    >
                      {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                </div>

                {/* New Password */}
                <div>
                  <label className="block text-slate-700 font-medium mb-2">
                    {t('securitySettings.passwordChange.newPassword')}
                  </label>
                  <div className="relative">
                    <Key className={`absolute ${i18n.language === 'ar' ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5`} />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPasswordValue}
                      onChange={(e) => setNewPasswordValue(e.target.value)}
                      placeholder={t('securitySettings.passwordChange.newPasswordPlaceholder')}
                      className={`w-full px-4 py-3 ${i18n.language === 'ar' ? 'pr-12 pl-12' : 'pl-12 pr-12'} border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200`}
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className={`absolute ${i18n.language === 'ar' ? 'left-3' : 'right-3'} top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600`}
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>


                  {/* Password Strength Indicator */}
                  {newPasswordValue && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-slate-600">{t('securitySettings.passwordChange.strengthLabel')}</span>
                        <span className={`text-sm font-medium ${
                          passwordStrength.score <= 2 ? 'text-red-600' :
                          passwordStrength.score <= 3 ? 'text-amber-600' : 'text-emerald-600'
                        }`}>
                          {getPasswordStrengthText(passwordStrength.score)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength.score)}`}
                          style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                        ></div>
                      </div>
                      {passwordStrength.feedback.length > 0 && (
                        <ul className="mt-2 text-xs text-slate-600 space-y-1">
                          {passwordStrength.feedback.map((feedback, index) => (
                            <li key={index} className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-500" />
                              {feedback}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-slate-700 font-medium mb-2">
                    {t('securitySettings.passwordChange.confirmPassword')}
                  </label>
                  <div className="relative">
                    <Key className={`absolute ${i18n.language === 'ar' ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5`} />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPasswordValue}
                      onChange={(e) => setConfirmPasswordValue(e.target.value)}
                      placeholder={t('securitySettings.passwordChange.confirmPasswordPlaceholder')}
                      className={`w-full px-4 py-3 ${i18n.language === 'ar' ? 'pr-12 pl-12' : 'pl-12 pr-12'} border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200`}
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className={`absolute ${i18n.language === 'ar' ? 'left-3' : 'right-3'} top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600`}
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                </div>

                {/* رسائل النجاح والخطأ */}
                {passwordSuccessMessage && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      <p className="text-emerald-800 font-medium">{passwordSuccessMessage}</p>
                    </div>
                  </div>
                )}

                {passwordErrorMessage && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <p className="text-red-800 font-medium">{passwordErrorMessage}</p>
                    </div>
                  </div>
                )}



                {/* زر تحديث كلمة المرور */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isPasswordLoading}
                    className="bg-primary-600 hover:bg-primary-700 disabled:bg-slate-400 text-white px-8 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2"
                  >
                    {isPasswordLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        {t('securitySettings.passwordChange.updating')}
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5" />
                        {t('securitySettings.passwordChange.updateButton')}
                      </>
                    )}
                  </button>
                </div>
              </form>
        </div>

        {/* قسم الإعدادات العامة */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 mb-8 relative z-0">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary-600" />
            {t('securitySettings.securityPrivacy.title')}
          </h2>

          <form
            method="post"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(onSubmit)(e);
            }}
            className="space-y-8"
          >

              {/* Two-Factor Authentication */}
              <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6 text-emerald-600" />
                    <div>
                      <h3 className="font-medium text-emerald-800">{t('securitySettings.securityPrivacy.twoFactor.title')}</h3>
                      <p className="text-sm text-emerald-700">{t('securitySettings.securityPrivacy.twoFactor.description')}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('twoFactorEnabled')}
                      onChange={(e) => handleTwoFactorToggle(e.target.checked)}
                      disabled={isLoading}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"></div>
                  </label>
                </div>
              </div>



            {/* Privacy Settings */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                <Eye className="w-6 h-6 text-primary-600" />
                {t('securitySettings.privacySettings.title')}
              </h2>

              <div className="space-y-4">
                {/* Contact Information Visibility */}
                <div className="p-4 bg-slate-50 rounded-xl">
                  <h3 className="font-medium text-slate-800 mb-3">{t('securitySettings.privacySettings.contactVisibility.title')}</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-600" />
                        <span className="text-slate-700">{t('securitySettings.privacySettings.contactVisibility.phone')}</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          {...register('showPhone')}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-600" />
                        <span className="text-slate-700">{t('securitySettings.privacySettings.contactVisibility.email')}</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          {...register('showEmail')}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Profile Visibility */}
                <div className="p-4 bg-slate-50 rounded-xl">
                  <h3 className="font-medium text-slate-800 mb-3">{t('securitySettings.privacySettings.profileVisibility.title')}</h3>
                  <select
                    {...register('profileVisibility')}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="verified">{t('securitySettings.privacySettings.profileVisibility.verified')}</option>
                    <option value="members">{t('securitySettings.privacySettings.profileVisibility.members')}</option>
                    <option value="private">{t('securitySettings.privacySettings.profileVisibility.private')}</option>
                  </select>
                </div>

                {/* Profile Image Privacy Settings */}
                <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{t('securitySettings.privacySettings.profileImageVisibility.title')}</h3>
                      <p className="text-sm text-slate-600">{t('securitySettings.privacySettings.profileImageVisibility.subtitle')}</p>
                    </div>
                  </div>

                  {/* Main Toggle */}
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-blue-100 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <div>
                        <span className="font-medium text-slate-800">{t('securitySettings.privacySettings.profileImageVisibility.showImage')}</span>
                        <p className="text-sm text-slate-600">{t('securitySettings.privacySettings.profileImageVisibility.showImageDesc')}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('profileImageVisible')}
                        className="sr-only peer"
                      />
                      <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Additional Options */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                      <span>{t('securitySettings.privacySettings.profileImageVisibility.whoCanSee')}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3 bg-white rounded-lg border border-slate-200 text-center">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <Users className="w-4 h-4 text-green-600" />
                        </div>
                        <p className="text-xs font-medium text-slate-700">{t('securitySettings.privacySettings.profileImageVisibility.verifiedMembers')}</p>
                      </div>

                      <div className="p-3 bg-white rounded-lg border border-slate-200 text-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <Shield className="w-4 h-4 text-blue-600" />
                        </div>
                        <p className="text-xs font-medium text-slate-700">{t('securitySettings.privacySettings.profileImageVisibility.respectsPrivacy')}</p>
                      </div>

                      <div className="p-3 bg-white rounded-lg border border-slate-200 text-center">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <Eye className="w-4 h-4 text-purple-600" />
                        </div>
                        <p className="text-xs font-medium text-slate-700">{t('securitySettings.privacySettings.profileImageVisibility.controlledAccess')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Important Note */}
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-800">{t('securitySettings.privacySettings.profileImageVisibility.importantNote')}</p>
                        <p className="text-amber-700 mt-1">{t('securitySettings.privacySettings.profileImageVisibility.noteDescription')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Communication Settings */}
                <div className="p-4 bg-slate-50 rounded-xl">
                  <h3 className="font-medium text-slate-800 mb-3">{t('securitySettings.privacySettings.communication.title')}</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700">{t('securitySettings.privacySettings.communication.allowMessages')}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          {...register('allowMessages', {
                            onChange: async (e) => {
                              // تحديث فوري للإعداد
                              const newValue = e.target.checked;
                              console.log('🔄 تغيير إعداد السماح بالرسائل:', newValue);
                              console.log('🔍 القيمة الحالية في userProfile:', userProfile?.allow_messages);

                              // إضافة الحقل للقائمة المحدثة مؤخراً
                              setRecentlyUpdatedFields(prev => new Set(prev).add('allowMessages'));

                              try {
                                const updates = {
                                  allow_messages: newValue
                                };

                                console.log('📤 إرسال تحديث إلى قاعدة البيانات:', updates);
                                const result = await updateProfile(updates);

                                if (result.success) {
                                  console.log('✅ تم تحديث إعداد السماح بالرسائل بنجاح');
                                  console.log('🔍 القيمة الجديدة في userProfile:', userProfile?.allow_messages);

                                  // التحقق من أن القيمة تم تحديثها فعلاً
                                  if (userProfile?.allow_messages !== newValue) {
                                    console.warn('⚠️ القيمة في userProfile لا تطابق القيمة المطلوبة!');
                                    console.log('المطلوب:', newValue, 'الموجود:', userProfile?.allow_messages);
                                  }

                                  // إزالة الحقل من القائمة بعد 3 ثوان
                                  setTimeout(() => {
                                    setRecentlyUpdatedFields(prev => {
                                      const newSet = new Set(prev);
                                      newSet.delete('allowMessages');
                                      return newSet;
                                    });
                                    console.log('🧹 تم إزالة allowMessages من قائمة الحقول المحدثة مؤخراً');
                                  }, 3000);
                                } else {
                                  console.error('❌ فشل في تحديث إعداد السماح بالرسائل:', result.error);
                                  // إعادة القيمة السابقة في حالة الفشل
                                  setValue('allowMessages', !newValue);
                                  // إزالة الحقل من القائمة المحدثة
                                  setRecentlyUpdatedFields(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete('allowMessages');
                                    return newSet;
                                  });
                                }
                              } catch (error) {
                                console.error('❌ خطأ في تحديث إعداد السماح بالرسائل:', error);
                                // إعادة القيمة السابقة في حالة الفشل
                                setValue('allowMessages', !newValue);
                                // إزالة الحقل من القائمة المحدثة
                                setRecentlyUpdatedFields(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete('allowMessages');
                                  return newSet;
                                });
                              }
                            }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-600" />
                        <span className="text-slate-700">{t('securitySettings.privacySettings.communication.familyCanView')}</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          {...register('familyCanView')}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notification Settings */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                <Settings className="w-6 h-6 text-primary-600" />
                {t('securitySettings.notifications.title')}
              </h2>

              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">{t('securitySettings.notifications.loginNotifications')}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('loginNotifications')}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">{t('securitySettings.notifications.messageNotifications')}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('messageNotifications')}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-end pt-6">
              <button
                type="button"
                onClick={() => reset()}
                className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                {t('securitySettings.buttons.reset')}
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-3 bg-gradient-to-r from-primary-600 to-emerald-600 text-white rounded-xl font-medium hover:from-primary-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {t('securitySettings.buttons.saving')}
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    {t('securitySettings.buttons.saveSettings')}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Security Tips */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 relative z-0">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
            <Shield className="w-6 h-6 text-emerald-600" />
            {t('securitySettings.securityTips.title')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 mt-1" />
              <div>
                <h3 className="font-medium text-slate-800 mb-1">{t('securitySettings.securityTips.strongPassword.title')}</h3>
                <p className="text-slate-600 text-sm">{t('securitySettings.securityTips.strongPassword.description')}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 mt-1" />
              <div>
                <h3 className="font-medium text-slate-800 mb-1">{t('securitySettings.securityTips.enableTwoFactor.title')}</h3>
                <p className="text-slate-600 text-sm">{t('securitySettings.securityTips.enableTwoFactor.description')}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 mt-1" />
              <div>
                <h3 className="font-medium text-slate-800 mb-1">{t('securitySettings.securityTips.protectInfo.title')}</h3>
                <p className="text-slate-600 text-sm">{t('securitySettings.securityTips.protectInfo.description')}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 mt-1" />
              <div>
                <h3 className="font-medium text-slate-800 mb-1">{t('securitySettings.securityTips.reportSuspicious.title')}</h3>
                <p className="text-slate-600 text-sm">{t('securitySettings.securityTips.reportSuspicious.description')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettingsPage;
