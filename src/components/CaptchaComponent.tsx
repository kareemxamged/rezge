import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import CaptchaService, { type CaptchaAction, type CaptchaVerificationResult, type CaptchaChallenge } from '../lib/captchaService';

/**
 * خصائص مكون CAPTCHA المخصص
 */
interface CaptchaComponentProps {
  action: CaptchaAction;
  onVerify: (result: CaptchaVerificationResult) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
  size?: 'small' | 'normal' | 'large';
  theme?: 'light' | 'dark' | 'auto';
  showScore?: boolean;
  autoExecute?: boolean;
  userId?: string; // معرف المستخدم لنظام الثقة
  sessionId?: string; // معرف الجلسة لنظام الثقة
}

/**
 * مكون CAPTCHA مخصص بسيط - نظام رياضي
 */
const CaptchaComponent: React.FC<CaptchaComponentProps> = ({
  action,
  onVerify,
  onError,
  disabled = false,
  className = '',
  size = 'normal',
  theme = 'auto',
  showScore = false,
  autoExecute = false,
  userId,
  sessionId
}) => {
  const { t, i18n } = useTranslation();
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [needsCaptcha, setNeedsCaptcha] = useState(true);
  const [trustInfo, setTrustInfo] = useState<any>(null);

  // فحص الحاجة لـ CAPTCHA عند تحميل المكون
  useEffect(() => {
    if (CaptchaService.isEnabled() && !disabled) {
      const needsVerification = CaptchaService.needsCaptcha(userId, sessionId);
      setNeedsCaptcha(needsVerification);

      if (needsVerification) {
        generateNewChallenge();
      } else {
        // المستخدم موثوق، تخطي CAPTCHA
        setIsVerified(true);
        const trustInfo = CaptchaService.getUserTrustInfo(userId, sessionId);
        setTrustInfo(trustInfo);

        // إشعار المكون الأب بالتحقق التلقائي
        onVerify({
          success: true,
          score: 1.0,
          action,
          message: 'تم التحقق تلقائياً - مستخدم موثوق',
          timestamp: new Date().toISOString()
        });
      }
    }
  }, [disabled, userId, sessionId]);

  /**
   * إنشاء تحدي CAPTCHA جديد
   */
  const generateNewChallenge = () => {
    setError(null);
    setIsVerified(false);
    setUserAnswer('');
    const newChallenge = CaptchaService.generateChallenge();
    setChallenge(newChallenge);
  };

  /**
   * التحقق من إجابة المستخدم
   */
  const handleVerify = () => {
    if (!challenge || !userAnswer.trim() || disabled || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = CaptchaService.verifyChallenge(challenge.id, userAnswer, action, userId, sessionId);

      if (result.success) {
        setIsVerified(true);
        // تحديث معلومات الثقة
        const updatedTrustInfo = CaptchaService.getUserTrustInfo(userId, sessionId);
        setTrustInfo(updatedTrustInfo);
        onVerify(result);
      } else {
        setError(result.message || 'فشل التحقق');
        if (onError) {
          onError(result.message || 'فشل التحقق');
        }
        // إنشاء تحدي جديد بعد الفشل
        setTimeout(generateNewChallenge, 1000);
      }
    } catch (err) {
      const errorMessage = 'حدث خطأ أثناء التحقق';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * معالج تغيير الإجابة
   */
  const handleAnswerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserAnswer(e.target.value);
    setError(null);
  };

  /**
   * معالج الضغط على Enter
   */
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleVerify();
    }
  };

  // إذا كان CAPTCHA غير مفعل، لا نعرض شيئاً
  if (!CaptchaService.isEnabled()) {
    return null;
  }

  // إذا كان المستخدم موثوق ولا يحتاج CAPTCHA
  if (!needsCaptcha && isVerified) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-green-800">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">
            {t('captcha.trustedUser', 'مستخدم موثوق - تم التحقق تلقائياً')}
          </span>
        </div>
        {trustInfo && showScore && (
          <div className="mt-2 text-sm text-green-700">
            <span>نقاط الثقة: {Math.round(trustInfo.trustScore * 100)}%</span>
            <span className="mx-2">•</span>
            <span>المحاولات الناجحة: {trustInfo.successfulAttempts}</span>
          </div>
        )}
      </div>
    );
  }

  // تحديد أحجام المكون
  const sizeClasses = {
    small: 'text-sm',
    normal: 'text-base',
    large: 'text-lg'
  };

  return (
    <div className={`captcha-component ${className}`}>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
        {/* رأس المكون */}
        <div className="flex items-center gap-2 text-gray-700">
          <Shield className="w-5 h-5 text-blue-600" />
          <span className={`font-medium ${sizeClasses[size]}`}>
            {t('captcha.title', 'التحقق الأمني')}
          </span>
        </div>

        {/* التحدي الرياضي */}
        {challenge && !isVerified && (
          <div className="space-y-3">
            <div className="bg-white border border-gray-300 rounded-md p-3">
              <div className="text-center">
                <span className={`font-mono font-bold text-gray-800 ${sizeClasses[size]}`}>
                  {challenge.question}
                </span>
              </div>
            </div>

            {/* حقل الإجابة */}
            <div className="flex gap-2">
              <input
                type="number"
                value={userAnswer}
                onChange={handleAnswerChange}
                onKeyPress={handleKeyPress}
                placeholder={t('captcha.answerPlaceholder', 'أدخل الإجابة')}
                disabled={disabled || isLoading}
                className={`flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  disabled || isLoading ? 'bg-gray-100 cursor-not-allowed' : ''
                } ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}
                dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
              />

              {/* زر التحقق */}
              <button
                onClick={handleVerify}
                disabled={disabled || isLoading || !userAnswer.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  t('captcha.verify', 'تحقق')
                )}
              </button>

              {/* زر إعادة التحديث */}
              <button
                onClick={generateNewChallenge}
                disabled={disabled || isLoading}
                className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                title={t('captcha.refresh', 'تحديث')}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* رسالة النجاح */}
        {isVerified && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 border border-green-200 rounded-md p-2">
            <CheckCircle className="w-5 h-5" />
            <span className={`font-medium ${sizeClasses[size]}`}>
              {t('captcha.success', 'تم التحقق بنجاح')}
            </span>
          </div>
        )}

        {/* رسالة الخطأ */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
            <AlertCircle className="w-5 h-5" />
            <span className={`${sizeClasses[size]}`}>
              {error}
            </span>
          </div>
        )}

        {/* معلومات إضافية */}
        <div className="text-xs text-gray-500 text-center">
          {t('captcha.description', 'حل المسألة الرياضية للمتابعة')}
        </div>
      </div>
    </div>
  );
};

export default CaptchaComponent;
