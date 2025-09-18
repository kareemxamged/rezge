import React, { useState, useEffect } from 'react';
import { WifiOff, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { connectionManager, type ConnectionStatus } from '../utils/connectionManager';

interface ConnectionStatusProps {
  showDetails?: boolean;
  className?: string;
}

const ConnectionStatusComponent: React.FC<ConnectionStatusProps> = ({ 
  showDetails = false, 
  className = '' 
}) => {
  const [status, setStatus] = useState<ConnectionStatus>(connectionManager.getStatus());
  const [showSolutions, setShowSolutions] = useState(false);
  const [solutions, setSolutions] = useState<string[]>([]);

  useEffect(() => {
    // الاستماع لتغييرات حالة الاتصال
    connectionManager.addStatusListener(setStatus);

    // الاستماع لاقتراحات الحلول
    const handleSolutions = (event: any) => {
      const { solutions, autoRetryFailed } = event.detail;
      setSolutions(solutions);

      // إظهار الحلول فقط إذا فشلت إعادة المحاولة التلقائية
      if (autoRetryFailed) {
        setShowSolutions(true);

        // إخفاء الحلول بعد 15 ثانية
        setTimeout(() => setShowSolutions(false), 15000);
      }
    };

    window.addEventListener('connection-solutions', handleSolutions);

    return () => {
      connectionManager.removeStatusListener(setStatus);
      window.removeEventListener('connection-solutions', handleSolutions);
    };
  }, []);

  const handleRetry = async () => {
    try {
      const isConnected = await connectionManager.checkConnection();
      if (isConnected) {
        connectionManager.resetErrorCount();
        setShowSolutions(false);
      }
    } catch (error) {
      console.error('فشل في إعادة المحاولة:', error);
    }
  };

  const getStatusIcon = () => {
    if (!status.isOnline) {
      return <WifiOff className="w-4 h-4 text-red-500" />;
    }
    
    if (!status.isSupabaseReachable) {
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
    
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (!status.isOnline) {
      return 'غير متصل بالإنترنت';
    }

    if (!status.isSupabaseReachable) {
      if (status.isRecovering) {
        return 'جاري إعادة الاتصال...';
      }
      return 'مشكلة في الاتصال بالخادم';
    }

    return 'متصل';
  };

  const getStatusColor = () => {
    if (!status.isOnline) return 'bg-red-50 border-red-200 text-red-800';
    if (!status.isSupabaseReachable) return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    return 'bg-green-50 border-green-200 text-green-800';
  };

  // إخفاء المكون في الوضع الصامت أو إذا كان كل شيء يعمل بشكل طبيعي
  if (connectionManager.isSilentMode() ||
      (status.isOnline && status.isSupabaseReachable && !showDetails && !showSolutions)) {
    return null;
  }

  // إخفاء المكون أثناء إعادة المحاولة التلقائية إلا إذا فشلت جميع المحاولات
  if (status.isRecovering && !showSolutions && !showDetails) {
    // في الوضع الصامت، لا نعرض أي شيء
    if (connectionManager.isSilentMode()) {
      return null;
    }

    return (
      <div className={`${className} transition-all duration-300`}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-blue-50 border-blue-200 text-blue-800">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm font-medium">جاري إعادة الاتصال...</span>
        </div>
      </div>
    );
  }

  // في الوضع الصامت، لا نعرض أي شيء للمستخدم
  if (connectionManager.isSilentMode()) {
    return null;
  }

  return (
    <div className={`${className}`}>
      {/* شريط حالة الاتصال */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getStatusColor()}`}>
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusText()}</span>

        {status.errorCount > 0 && (
          <span className="text-xs bg-white bg-opacity-50 px-2 py-1 rounded">
            أخطاء: {status.errorCount}
          </span>
        )}

        {(!status.isOnline || !status.isSupabaseReachable) && (
          <button
            onClick={handleRetry}
            className="p-1 hover:bg-white hover:bg-opacity-30 rounded transition-colors"
            title="إعادة المحاولة"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* تفاصيل إضافية */}
      {showDetails && (
        <div className="mt-2 text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>الإنترنت:</span>
            <span className={status.isOnline ? 'text-green-600' : 'text-red-600'}>
              {status.isOnline ? 'متصل' : 'منقطع'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>الخادم:</span>
            <span className={status.isSupabaseReachable ? 'text-green-600' : 'text-red-600'}>
              {status.isSupabaseReachable ? 'متاح' : 'غير متاح'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>آخر فحص:</span>
            <span>{status.lastChecked.toLocaleTimeString('ar-SA')}</span>
          </div>
        </div>
      )}

      {/* اقتراحات الحلول */}
      {showSolutions && solutions.length > 0 && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              اقتراحات لحل المشكلة:
            </span>
          </div>
          <ul className="text-xs text-blue-700 space-y-1">
            {solutions.map((solution, index) => (
              <li key={index} className="flex items-start gap-1">
                <span className="text-blue-400">•</span>
                <span>{solution}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => setShowSolutions(false)}
            className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
          >
            إخفاء
          </button>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatusComponent;
