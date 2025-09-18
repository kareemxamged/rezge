import React, { useState, useEffect } from 'react';
// import { useTranslation } from 'react-i18next';
import { 
  Globe,
  Database,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

// Simple interface definition to avoid import issues
interface SimpleText {
  id: string;
  text_key: string;
  category: string;
  language: string;
  text_value: string;
  description?: string;
}

const SimpleTextManagement: React.FC = () => {
  // const { t } = useTranslation(); // Unused for now
  const [texts, setTexts] = useState<SimpleText[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadTexts();
  }, []);

  const loadTexts = async () => {
    setLoading(true);
    try {
      // Simulate loading - replace with actual API call later
      setTimeout(() => {
        setTexts([
          {
            id: '1',
            text_key: 'common.welcome',
            category: 'common',
            language: 'ar',
            text_value: 'مرحباً',
            description: 'كلمة ترحيب عامة'
          },
          {
            id: '2',
            text_key: 'common.login',
            category: 'common',
            language: 'ar',
            text_value: 'تسجيل الدخول',
            description: 'نص زر تسجيل الدخول'
          }
        ]);
        setLoading(false);
      }, 1000);
    } catch (error) {
      setMessage({ type: 'error', text: 'خطأ في تحميل النصوص' });
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
          <Globe className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">إدارة نصوص الموقع</h2>
          <p className="text-slate-600">تحرير وإدارة جميع نصوص الموقع</p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Status */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-blue-800">حالة النظام:</span>
        </div>
        <p className="text-blue-700 mt-1">
          نظام إدارة النصوص قيد التطوير. سيتم تفعيله قريباً.
        </p>
      </div>

      {/* Texts List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-slate-600 mt-2">جاري التحميل...</p>
          </div>
        ) : texts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-600">لا توجد نصوص</p>
          </div>
        ) : (
          texts.map((text) => (
            <div key={text.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-blue-600">{text.text_key}</span>
                    <span className="px-2 py-1 bg-slate-200 text-slate-700 text-xs rounded">{text.category}</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">{text.language}</span>
                  </div>
                  <p className="text-slate-800 mb-2">{text.text_value}</p>
                  {text.description && (
                    <p className="text-sm text-slate-600">{text.description}</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div className="text-yellow-800">
            <p className="font-semibold mb-1">قيد التطوير:</p>
            <p className="text-sm">
              نظام إدارة النصوص الديناميكي قيد التطوير. 
              حالياً يتم عرض بيانات تجريبية فقط.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleTextManagement;
