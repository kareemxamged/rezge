import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle, Loader2, Shield, Heart } from 'lucide-react';
import { emailVerificationService } from '../lib/emailVerification';
import type { EmailVerification } from '../lib/emailVerification';

// Schema للتحقق من كلمة المرور
const passwordSchema = z.object({
  password: z.string()
    .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'كلمة المرور يجب أن تحتوي على حرف كبير وصغير ورقم'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "كلمات المرور غير متطابقة",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

const SetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [verification, setVerification] = useState<EmailVerification | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema)
  });

  const password = watch('password');

  // التحقق من صحة الرمز عند تحميل الصفحة
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('رابط التحقق غير صحيح');
        setIsVerifying(false);
        return;
      }

      try {
        const result = await emailVerificationService.verifyToken(token);
        if (result.success && result.verification) {
          setVerification(result.verification);
        } else {
          setError(result.error || 'رابط التحقق غير صحيح');
        }
      } catch (error) {
        setError('حدث خطأ في التحقق من الرابط');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  // تقييم قوة كلمة المرور
  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, text: '', color: '' };
    
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

    const levels = [
      { score: 0, text: '', color: '' },
      { score: 1, text: 'ضعيف جداً', color: 'text-red-600' },
      { score: 2, text: 'ضعيف', color: 'text-red-500' },
      { score: 3, text: 'متوسط', color: 'text-amber-500' },
      { score: 4, text: 'قوي', color: 'text-emerald-500' },
      { score: 5, text: 'قوي جداً', color: 'text-emerald-600' }
    ];

    return levels[score] || levels[0];
  };

  const passwordStrength = getPasswordStrength(password || '');

  const onSubmit = async (data: PasswordFormData) => {
    if (!verification || !token) {
      setError('حدث خطأ في التحقق');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await emailVerificationService.confirmVerification(token, data.password);
      
      if (result.success) {
        setSuccess('تم إنشاء حسابك بنجاح! سيتم توجيهك لتسجيل الدخول...');
        
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: 'تم إنشاء حسابك بنجاح! يمكنك الآن تسجيل الدخول',
              email: verification.email 
            }
          });
        }, 2000);
      } else {
        setError(result.error || 'حدث خطأ في إنشاء الحساب');
      }
    } catch (error) {
      setError('حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  };

  // شاشة التحميل أثناء التحقق من الرمز
  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-emerald-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">جاري التحقق من الرابط</h2>
          <p className="text-slate-600">يرجى الانتظار...</p>
        </div>
      </div>
    );
  }

  // شاشة الخطأ إذا كان الرمز غير صحيح
  if (error && !verification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
        <div className="max-w-md mx-auto text-center p-8 bg-white rounded-2xl shadow-lg border border-red-200">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">رابط غير صحيح</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/register')}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            العودة للتسجيل
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-emerald-50 flex items-center justify-center py-12" dir="rtl">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-20 right-20 w-64 h-64 bg-primary-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-emerald-500 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-md w-full mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/30 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Lock className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2 font-display">
              تعيين كلمة المرور
            </h1>
            <p className="text-slate-600 mb-4">
              مرحباً {verification?.user_data?.first_name}! قم بتعيين كلمة مرور قوية لحسابك
            </p>
            <div className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3">
              البريد الإلكتروني: {verification?.email}
            </div>
          </div>

          {/* رسائل النجاح والخطأ */}
          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <p className="text-emerald-800">{success}</p>
            </div>
          )}
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Password Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" autoComplete="off" noValidate>
            {/* Password */}
            <div>
              <label className="block text-slate-700 font-medium mb-2">
                كلمة المرور *
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className="w-full px-4 py-3 pr-12 pl-12 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white/50"
                  placeholder="كلمة المرور"
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
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
              )}
              
              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-600">قوة كلمة المرور:</span>
                    <span className={passwordStrength.color}>{passwordStrength.text}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        passwordStrength.score <= 2 ? 'bg-red-500' :
                        passwordStrength.score <= 3 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-slate-700 font-medium mb-2">
                تأكيد كلمة المرور *
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...register('confirmPassword')}
                  className="w-full px-4 py-3 pr-12 pl-12 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white/50"
                  placeholder="تأكيد كلمة المرور"
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
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary-600 to-emerald-600 text-white py-3 px-6 rounded-xl font-bold text-lg hover:from-primary-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري إنشاء الحساب...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>إنشاء الحساب</span>
                  <Heart className="w-5 h-5" />
                </div>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-2 text-slate-600 text-sm">
              <Shield className="w-4 h-4" />
              <span>كلمة المرور محمية بتشفير عالي الأمان</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetPasswordPage;
