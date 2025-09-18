import React, { useState, useEffect } from 'react';
import { AlertTriangle, Mail, RefreshCw, X, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { checkEmailSync, autoSyncEmail, hasServiceRoleKey } from '../utils/emailSyncUtils';

interface EmailSyncWarningProps {
  onClose?: () => void;
  autoCheck?: boolean;
}

const EmailSyncWarning: React.FC<EmailSyncWarningProps> = ({ onClose, autoCheck = true }) => {
  const { user, userProfile } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [emailMismatch, setEmailMismatch] = useState<{
    authEmail: string | null;
    dbEmail: string | null;
    mismatchType: string;
  } | null>(null);

  // فحص تلقائي عند تحميل المكون
  useEffect(() => {
    if (autoCheck && user && userProfile) {
      checkForEmailMismatch();
    }
  }, [user, userProfile, autoCheck]);

  const checkForEmailMismatch = async () => {
    if (!user || !userProfile) return;

    setIsChecking(true);
    try {
      const mismatch = await checkEmailSync(user.id);
      if (mismatch) {
        setEmailMismatch({
          authEmail: mismatch.authEmail,
          dbEmail: mismatch.dbEmail,
          mismatchType: mismatch.mismatchType
        });
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    } catch (error) {
      console.error('Error checking email sync:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSync = async () => {
    if (!user) return;

    setIsSyncing(true);
    setSyncResult(null);

    try {
      const result = await autoSyncEmail(user.id);
      
      if (result.success) {
        setSyncResult('تم تحديث البريد الإلكتروني بنجاح!');
        setShowWarning(false);
        
        // إعادة فحص بعد المزامنة
        setTimeout(() => {
          checkForEmailMismatch();
        }, 1000);
      } else {
        setSyncResult(result.message);
        
        if (result.requiresReauth) {
          setSyncResult(result.message + '\n\nيرجى تسجيل الخروج وتسجيل الدخول مرة أخرى بالبريد الإلكتروني المحدث.');
        }
      }
    } catch (error: any) {
      setSyncResult('حدث خطأ أثناء المزامنة: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClose = () => {
    setShowWarning(false);
    setSyncResult(null);
    if (onClose) {
      onClose();
    }
  };

  if (!showWarning && !syncResult) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 left-4 z-50 max-w-md mx-auto">
      <div className="bg-white border border-orange-200 rounded-lg shadow-lg p-4">
        {/* رأس التحذير */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-orange-500 ml-2" />
            <h3 className="text-sm font-medium text-gray-900">
              مشكلة في مزامنة البريد الإلكتروني
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* محتوى التحذير */}
        {showWarning && emailMismatch && (
          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-3">
              <p className="mb-2">
                تم اكتشاف عدم تطابق في البريد الإلكتروني بين نظام المصادقة وقاعدة البيانات:
              </p>
              
              <div className="bg-gray-50 rounded p-3 space-y-2">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 text-blue-500 ml-2" />
                  <span className="text-xs text-gray-500">نظام المصادقة:</span>
                  <span className="text-sm font-mono mr-2">
                    {emailMismatch.authEmail || 'غير محدد'}
                  </span>
                </div>
                
                <div className="flex items-center">
                  <Mail className="h-4 w-4 text-green-500 ml-2" />
                  <span className="text-xs text-gray-500">قاعدة البيانات:</span>
                  <span className="text-sm font-mono mr-2">
                    {emailMismatch.dbEmail || 'غير محدد'}
                  </span>
                </div>
              </div>

              {!hasServiceRoleKey() && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-xs text-yellow-800">
                    <strong>ملاحظة:</strong> لحل هذه المشكلة تلقائياً، يحتاج المطور لإضافة Service Role Key في إعدادات البيئة.
                  </p>
                </div>
              )}
            </div>

            {/* أزرار الإجراءات */}
            <div className="flex gap-2">
              {hasServiceRoleKey() && (
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSyncing ? (
                    <RefreshCw className="h-4 w-4 ml-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 ml-1" />
                  )}
                  {isSyncing ? 'جاري المزامنة...' : 'مزامنة تلقائية'}
                </button>
              )}
              
              <button
                onClick={checkForEmailMismatch}
                disabled={isChecking}
                className="flex items-center px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isChecking ? (
                  <RefreshCw className="h-4 w-4 ml-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 ml-1" />
                )}
                {isChecking ? 'جاري الفحص...' : 'إعادة فحص'}
              </button>
            </div>
          </div>
        )}

        {/* نتيجة المزامنة */}
        {syncResult && (
          <div className={`p-3 rounded text-sm ${
            syncResult.includes('بنجاح') 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="flex items-start">
              {syncResult.includes('بنجاح') ? (
                <CheckCircle className="h-4 w-4 ml-2 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 ml-2 mt-0.5 flex-shrink-0" />
              )}
              <div className="whitespace-pre-line">{syncResult}</div>
            </div>
          </div>
        )}

        {/* معلومات إضافية */}
        {showWarning && !hasServiceRoleKey() && (
          <div className="mt-3 text-xs text-gray-500">
            <p>
              <strong>للمطورين:</strong> لتمكين المزامنة التلقائية، أضف 
              <code className="bg-gray-100 px-1 rounded mx-1">VITE_SUPABASE_SERVICE_ROLE_KEY</code>
              في ملف البيئة.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailSyncWarning;
