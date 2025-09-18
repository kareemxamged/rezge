import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, Info, Shield } from 'lucide-react';
import { emailVerificationService } from '../lib/emailVerification';

interface VerificationStatusProps {
  email: string;
  onStatsUpdate?: (stats: any) => void;
}

interface VerificationStats {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  todayAttempts: number;
  lastAttempt?: Date;
  canSendNext?: Date;
}

const VerificationStatus: React.FC<VerificationStatusProps> = ({ 
  email, 
  onStatsUpdate 
}) => {
  const [stats, setStats] = useState<VerificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeUntilNext, setTimeUntilNext] = useState<string>('');

  // تحميل الإحصائيات
  const loadStats = async () => {
    try {
      setLoading(true);
      const verificationStats = await emailVerificationService.getVerificationStats(email);
      setStats(verificationStats);
      
      if (onStatsUpdate) {
        onStatsUpdate(verificationStats);
      }
    } catch (error) {
      console.error('Error loading verification stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // حساب الوقت المتبقي
  const updateTimeUntilNext = () => {
    if (!stats?.canSendNext) {
      setTimeUntilNext('');
      return;
    }

    const now = new Date();
    const nextTime = new Date(stats.canSendNext);
    
    if (now >= nextTime) {
      setTimeUntilNext('');
      return;
    }

    const diff = nextTime.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 0) {
      setTimeUntilNext(`${hours} ساعة و ${minutes} دقيقة`);
    } else if (minutes > 0) {
      setTimeUntilNext(`${minutes} دقيقة و ${seconds} ثانية`);
    } else {
      setTimeUntilNext(`${seconds} ثانية`);
    }
  };

  useEffect(() => {
    if (email) {
      loadStats();
    }
  }, [email]);

  useEffect(() => {
    updateTimeUntilNext();
    const interval = setInterval(updateTimeUntilNext, 1000);
    return () => clearInterval(interval);
  }, [stats]);

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-blue-800">جاري تحميل الإحصائيات...</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const canSendNow = !stats.canSendNext || new Date() >= stats.canSendNext;
  const isNearDailyLimit = stats.todayAttempts >= 10; // تحذير عند الوصول لـ 10 من أصل 12
  const hasReachedDailyLimit = stats.todayAttempts >= 12;

  return (
    <div className="space-y-4">
      {/* حالة الإرسال */}
      <div className={`border rounded-lg p-4 ${
        canSendNow 
          ? hasReachedDailyLimit 
            ? 'bg-red-50 border-red-200' 
            : 'bg-green-50 border-green-200'
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center gap-3">
          {canSendNow ? (
            hasReachedDailyLimit ? (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )
          ) : (
            <Clock className="w-5 h-5 text-yellow-600" />
          )}
          
          <div className="flex-1">
            <div className={`font-medium ${
              canSendNow 
                ? hasReachedDailyLimit 
                  ? 'text-red-800' 
                  : 'text-green-800'
                : 'text-yellow-800'
            }`}>
              {canSendNow 
                ? hasReachedDailyLimit 
                  ? 'تم الوصول للحد الأقصى اليومي' 
                  : 'يمكنك طلب رابط تحقق جديد'
                : 'يجب الانتظار قبل طلب رابط جديد'
              }
            </div>
            
            {!canSendNow && timeUntilNext && (
              <div className="text-sm text-yellow-700 mt-1">
                الوقت المتبقي: {timeUntilNext}
              </div>
            )}
            
            {hasReachedDailyLimit && (
              <div className="text-sm text-red-700 mt-1">
                يمكنك المحاولة مرة أخرى غداً
              </div>
            )}
          </div>
        </div>
      </div>

      {/* الإحصائيات */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-gray-800">إحصائيات المحاولات</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">محاولات اليوم:</span>
            <div className={`font-medium ${
              isNearDailyLimit ? 'text-orange-600' : 'text-gray-900'
            }`}>
              {stats.todayAttempts}/12
              {isNearDailyLimit && !hasReachedDailyLimit && (
                <span className="text-orange-600 mr-1">⚠️</span>
              )}
            </div>
          </div>
          
          <div>
            <span className="text-gray-600">إجمالي المحاولات:</span>
            <div className="font-medium text-gray-900">{stats.totalAttempts}</div>
          </div>
          
          <div>
            <span className="text-gray-600">المحاولات الناجحة:</span>
            <div className="font-medium text-green-600">{stats.successfulAttempts}</div>
          </div>
          
          <div>
            <span className="text-gray-600">المحاولات الفاشلة:</span>
            <div className="font-medium text-red-600">{stats.failedAttempts}</div>
          </div>
        </div>
        
        {stats.lastAttempt && (
          <div className="mt-3 pt-3 border-t border-gray-300">
            <span className="text-gray-600 text-sm">آخر محاولة:</span>
            <div className="font-medium text-gray-900 text-sm">
              {stats.lastAttempt.toLocaleString('ar-SA')}
            </div>
          </div>
        )}
      </div>

      {/* تحذيرات وملاحظات */}
      {isNearDailyLimit && !hasReachedDailyLimit && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <div className="text-orange-800">
              <div className="font-medium">تحذير: اقتراب من الحد الأقصى</div>
              <div className="text-sm mt-1">
                لديك {12 - stats.todayAttempts} محاولات متبقية لليوم. 
                تأكد من صحة البريد الإلكتروني قبل المحاولة.
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <div className="text-blue-800">
            <div className="font-medium">القيود الأمنية</div>
            <div className="text-sm mt-1">
              • حد أقصى 4 محاولات متتالية قبل الانتظار ساعتين<br/>
              • حد أقصى 12 محاولة يومياً<br/>
              • حد أدنى 5 دقائق بين كل محاولة
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationStatus;
