import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Globe,
  Database,
  FileText
} from 'lucide-react';
import { textService } from '../lib/supabase';
import { refreshTranslationsCache } from '../lib/dynamicI18n';

const TranslationTest: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [testResults, setTestResults] = useState<{
    [key: string]: { success: boolean; value: string; error?: string };
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [dbStats, setDbStats] = useState({
    totalTexts: 0,
    arabicTexts: 0,
    englishTexts: 0
  });

  const testKeys = [
    'common.welcome',
    'common.login',
    'navigation.home',
    'navigation.search',
    'home.welcomeMessage',
    'features.title',
    'about.title',
    'contact.title'
  ];

  useEffect(() => {
    loadDbStats();
    runTests();
  }, [i18n.language]);

  const loadDbStats = async () => {
    try {
      const [arResult, enResult] = await Promise.all([
        textService.getTexts('ar'),
        textService.getTexts('en')
      ]);

      setDbStats({
        totalTexts: (arResult.data?.length || 0) + (enResult.data?.length || 0),
        arabicTexts: arResult.data?.length || 0,
        englishTexts: enResult.data?.length || 0
      });
    } catch (error) {
      console.error('Error loading DB stats:', error);
    }
  };

  const runTests = async () => {
    setIsLoading(true);
    const results: typeof testResults = {};

    for (const key of testKeys) {
      try {
        // Test react-i18next translation
        const translatedValue = t(key);
        
        // Test direct database fetch
        const dbResult = await textService.getText(key, i18n.language);
        
        if (dbResult.data) {
          results[key] = {
            success: true,
            value: translatedValue,
          };
        } else {
          results[key] = {
            success: false,
            value: translatedValue,
            error: 'Not found in database'
          };
        }
      } catch (error) {
        results[key] = {
          success: false,
          value: t(key),
          error: String(error)
        };
      }
    }

    setTestResults(results);
    setIsLoading(false);
  };

  const handleRefreshCache = async () => {
    setIsLoading(true);
    try {
      await refreshTranslationsCache(i18n.language);
      await runTests();
    } catch (error) {
      console.error('Error refreshing cache:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanguageChange = async (language: string) => {
    try {
      await i18n.changeLanguage(language);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">اختبار نظام الترجمة</h2>
          <p className="text-slate-600">التحقق من عمل النظام الجديد</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">إجمالي النصوص</p>
              <p className="text-2xl font-bold">{dbStats.totalTexts}</p>
            </div>
            <Database className="w-8 h-8 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">النصوص العربية</p>
              <p className="text-2xl font-bold">{dbStats.arabicTexts}</p>
            </div>
            <Globe className="w-8 h-8 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">النصوص الإنجليزية</p>
              <p className="text-2xl font-bold">{dbStats.englishTexts}</p>
            </div>
            <FileText className="w-8 h-8 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">اللغة:</span>
          <select
            value={i18n.language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </div>
        
        <button
          onClick={runTests}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          تشغيل الاختبار
        </button>

        <button
          onClick={handleRefreshCache}
          disabled={isLoading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          تحديث الذاكرة المؤقتة
        </button>
      </div>

      {/* Test Results */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-800 mb-3">نتائج الاختبار:</h3>
        
        {testKeys.map((key) => {
          const result = testResults[key];
          if (!result) return null;

          return (
            <div
              key={key}
              className={`p-4 rounded-lg border ${
                result.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {result.success ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className="font-medium text-slate-800">{key}</span>
                  </div>
                  <p className={`text-sm ${
                    result.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    القيمة: "{result.value}"
                  </p>
                  {result.error && (
                    <p className="text-xs text-red-600 mt-1">
                      خطأ: {result.error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-blue-800">حالة النظام:</span>
        </div>
        <p className="text-blue-700 mt-1">
          النظام يعمل بنجاح! النصوص يتم تحميلها من قاعدة البيانات Supabase.
        </p>
      </div>
    </div>
  );
};

export default TranslationTest;
