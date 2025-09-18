import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Eye, EyeOff, Lock, User, AlertTriangle, CheckCircle, ArrowLeft, Sparkles } from 'lucide-react';
import { separateAdminAuth } from '../../lib/separateAdminAuth';

import '../../styles/modern-admin-login.css';

const AdminLoginPage: React.FC = () => {
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
        setSuccess('تم تسجيل الدخول بنجاح! جاري التوجيه...');

        console.log('✅ Login successful, navigating to admin dashboard...');

        // تأخير قصير لإظهار رسالة النجاح ثم التوجيه
        setTimeout(() => {
          console.log('🔄 Navigating to /admin...');
          navigate('/admin', { replace: true });
        }, 1500);
      } else {
        setError(result.error || 'فشل في تسجيل الدخول');
        
        // إذا كان الحساب مقفل، أظهر معلومات إضافية
        if (result.locked_until) {
          const lockTime = new Date(result.locked_until);
          const now = new Date();
          const minutesLeft = Math.ceil((lockTime.getTime() - now.getTime()) / (1000 * 60));
          setError(`الحساب مقفل لمدة ${minutesLeft} دقيقة بسبب المحاولات الفاشلة المتكررة`);
        }
      }
    } catch (error: any) {
      console.error('❌ Admin login error:', error);
      setError('حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modern-admin-login-page">
      {/* الخلفية المتدرجة مع الأشكال */}
      <div className="login-background">
        <div className="gradient-overlay"></div>
        <div className="floating-elements">
          <div className="element element-1"></div>
          <div className="element element-2"></div>
          <div className="element element-3"></div>
          <div className="element element-4"></div>
          <div className="element element-5"></div>
        </div>
      </div>

      {/* الحاوية الرئيسية */}
      <div className="login-container">
        {/* بطاقة تسجيل الدخول */}
        <div className="login-card">
          {/* رأس البطاقة */}
          <div className="card-header">
            <div className="logo-container">
              <div className="logo-icon">
                <Shield className="w-8 h-8" />
              </div>
              <div className="sparkle-effect">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="login-title">
              <h1 className="title-main">رزقي</h1>
              <h2 className="title-sub">لوحة التحكم</h2>
              <p className="login-subtitle">مرحباً بك في منطقة الإدارة</p>
            </div>
          </div>

          {/* نموذج تسجيل الدخول */}
          <div className="card-body">
            <form
              onSubmit={handleSubmit}
              className="login-form"
              autoComplete="off"
              noValidate
              data-form-type="admin-login"
              data-lpignore="true"
              data-1p-ignore="true"
              data-bwignore="true"
              data-dashlane-ignore="true"
              data-lastpass-ignore="true"
              data-bitwarden-ignore="true"
              data-form-context="admin-management-system"
            >
              {/* رسائل الحالة */}
              {error && (
                <div className="status-message error">
                  <div className="message-icon">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <span className="message-text">{error}</span>
                </div>
              )}

              {success && (
                <div className="status-message success">
                  <div className="message-icon">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <span className="message-text">{success}</span>
                </div>
              )}

              {/* حقل اسم المستخدم */}
              <div className="input-group">
                <label htmlFor="username" className="input-label">
                  اسم المستخدم
                </label>
                <div className="input-container">
                  <div className="input-icon">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    id="admin-username-field"
                    name="admin-username"
                    type="text"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    className="modern-input"
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
              <div className="input-group">
                <label htmlFor="password" className="input-label">
                  كلمة المرور
                </label>
                <div className="input-container">
                  <div className="input-icon">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    id="admin-password-field"
                    name="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="modern-input"
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
                    className="password-toggle-btn"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* زر تسجيل الدخول */}
              <button
                type="submit"
                className="login-button"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="loading-spinner"></div>
                    <span>جاري تسجيل الدخول...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    <span>تسجيل الدخول</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* تذييل البطاقة */}
          <div className="card-footer">
            <div className="footer-content-centered">
              <Link to="/" className="back-link">
                <ArrowLeft className="w-4 h-4" />
                <span>العودة للموقع الرئيسي</span>
              </Link>
            </div>
          </div>
        </div>

        {/* معلومات النظام */}
        <div className="system-info">
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">النظام</span>
              <span className="info-value">رزقي - الإدارة</span>
            </div>
            <div className="info-item">
              <span className="info-label">الإصدار</span>
              <span className="info-value">3.0</span>
            </div>
            <div className="info-item">
              <span className="info-label">التاريخ</span>
              <span className="info-value">{new Date().toLocaleDateString('ar-EG')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
