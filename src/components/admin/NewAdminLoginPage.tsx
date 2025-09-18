import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User, Lock, AlertTriangle, CheckCircle } from 'lucide-react';
import { separateAdminAuth } from '../../lib/separateAdminAuth';

const NewAdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // التحقق من وجود جلسة نشطة
  useEffect(() => {
    const checkExistingSession = async () => {
      const isValid = await separateAdminAuth.validateSession();
      if (isValid) {
        navigate('/admin', { replace: true });
      }
    };

    checkExistingSession();
  }, [navigate]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(''); // مسح الخطأ عند الكتابة
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // التحقق من صحة البيانات
      if (!formData.username.trim() || !formData.password.trim()) {
        setError('يرجى ملء جميع الحقول المطلوبة');
        return;
      }

      if (formData.username.length < 3) {
        setError('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
        return;
      }

      if (formData.password.length < 6) {
        setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        return;
      }

      console.log('🔐 Attempting admin login...');

      const result = await separateAdminAuth.login(
        formData.username.trim(),
        formData.password
      );

      if (result.success) {
        if (result.requiresTwoFactor) {
          // التوجيه لصفحة التحقق الإضافي
          setSuccess('تم التحقق من البيانات! جاري التوجيه للتحقق الإضافي...');
          console.log('✅ Admin credentials verified, redirecting to 2FA');

          setTimeout(() => {
            navigate('/admin/two-factor', {
              state: {
                adminId: result.account?.id,
                email: result.account?.email,
                username: result.account?.username
              },
              replace: true
            });
          }, 1000);
        } else {
          // تسجيل دخول مباشر (في حالة عدم تفعيل التحقق الإضافي)
          setSuccess('تم تسجيل الدخول بنجاح! جاري التوجيه...');
          console.log('✅ Admin login successful');

          setTimeout(() => {
            navigate('/admin', { replace: true });
          }, 1000);
        }
      } else {
        console.error('❌ Admin login failed:', result.error);
        setError(result.error || 'فشل في تسجيل الدخول');
      }
    } catch (error: any) {
      console.error('❌ Admin login error:', error);
      setError('حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
      {/* الخلفية الهندسية */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-black">
          {/* الخطوط الهندسية */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 800" fill="none">
            {/* الخطوط في الزوايا */}
            <g stroke="rgba(255,255,255,0.1)" strokeWidth="1">
              {/* الزاوية العلوية اليسرى */}
              <path d="M0 0 L200 0 L200 200 L0 200 Z" fill="none" />
              <path d="M50 50 L150 50 L150 150 L50 150 Z" fill="none" />
              <path d="M100 100 L100 100" fill="none" />
              
              {/* الزاوية العلوية اليمنى */}
              <path d="M1000 0 L1200 0 L1200 200 L1000 200 Z" fill="none" />
              <path d="M1050 50 L1150 50 L1150 150 L1050 150 Z" fill="none" />
              
              {/* الزاوية السفلية اليسرى */}
              <path d="M0 600 L200 600 L200 800 L0 800 Z" fill="none" />
              <path d="M50 650 L150 650 L150 750 L50 750 Z" fill="none" />
              
              {/* الزاوية السفلية اليمنى */}
              <path d="M1000 600 L1200 600 L1200 800 L1000 800 Z" fill="none" />
              <path d="M1050 650 L1150 650 L1150 750 L1050 750 Z" fill="none" />
              
              {/* خطوط قطرية */}
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
          <span className="text-lg font-bold">رزقي</span>
        </div>
      </div>

      {/* نموذج تسجيل الدخول */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* العنوان */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">تسجيل دخول المشرف</h1>
            <p className="text-gray-600">يرجى إدخال بياناتك</p>
          </div>

          {/* النموذج */}
          <form 
            onSubmit={handleSubmit} 
            className="space-y-6"
            autoComplete="off"
            noValidate
            data-form-type="admin-login"
            data-form-context="admin-management-system"
            data-lpignore="true"
            data-1p-ignore="true"
            data-bwignore="true"
            data-dashlane-ignore="true"
            data-lastpass-ignore="true"
            data-bitwarden-ignore="true"
          >
            {/* رسائل الحالة */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-green-700 text-sm">{success}</span>
              </div>
            )}

            {/* حقل اسم المستخدم */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                اسم المستخدم
              </label>
              <div className="relative">
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <User className="w-5 h-5" />
                </div>
                <input
                  id="admin-username-field"
                  name="admin-username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gray-50 text-gray-900 placeholder-gray-500"
                  placeholder="أدخل اسم المستخدم"
                  required
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  disabled={isLoading}
                  data-form-type="admin-login"
                  data-form-context="admin-management-system"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  data-dashlane-ignore="true"
                  data-lastpass-ignore="true"
                  data-bitwarden-ignore="true"
                  data-password-manager="ignore"
                  data-autofill="off"
                />
              </div>
            </div>

            {/* حقل كلمة المرور */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                كلمة المرور
              </label>
              <div className="relative">
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="admin-password-field"
                  name="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full px-4 py-3 pr-12 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gray-50 text-gray-900 placeholder-gray-500"
                  placeholder="أدخل كلمة المرور"
                  required
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  disabled={isLoading}
                  data-form-type="admin-login"
                  data-form-context="admin-management-system"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  data-dashlane-ignore="true"
                  data-lastpass-ignore="true"
                  data-bitwarden-ignore="true"
                  data-password-manager="ignore"
                  data-autofill="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* خيارات إضافية */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                />
                <span className="mr-2 text-sm text-gray-600">تذكرني</span>
              </label>
              <a href="#" className="text-sm text-purple-600 hover:text-purple-500">
                نسيت كلمة المرور؟
              </a>
            </div>

            {/* زر تسجيل الدخول */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>جاري تسجيل الدخول...</span>
                </div>
              ) : (
                'تسجيل الدخول'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewAdminLoginPage;
