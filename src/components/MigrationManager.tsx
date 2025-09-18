import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  BarChart3,
  FileText,
  Globe,

} from 'lucide-react';
import { 
  migrateTranslationsToDatabase, 
  verifyMigration, 
  getMigrationStats,

} from '../utils/migrateTexts';

const MigrationManager: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<{
    type: 'success' | 'error' | 'info' | null;
    message: string;
  }>({ type: null, message: '' });
  
  const [stats, setStats] = useState({
    totalTexts: 0,
    arabicTexts: 0,
    englishTexts: 0,
    categories: [] as string[]
  });

  const [migrationResult, setMigrationResult] = useState<any>(null);

  // Load current stats on component mount
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const currentStats = await getMigrationStats();
      setStats(currentStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleMigration = async () => {
    setIsLoading(true);
    setMigrationStatus({ type: 'info', message: 'جاري نقل النصوص إلى قاعدة البيانات...' });

    try {
      const result = await migrateTranslationsToDatabase();
      setMigrationResult(result);
      
      if (result.success) {
        setMigrationStatus({
          type: 'success',
          message: 'تم نقل النصوص بنجاح!'
        });
      } else {
        setMigrationStatus({
          type: 'error',
          message: `فشل في نقل بعض النصوص. الأخطاء: ${result.stats.errors}`
        });
      }

      // Refresh stats
      await loadStats();
    } catch (error) {
      setMigrationStatus({
        type: 'error',
        message: `خطأ في عملية النقل: ${error}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async () => {
    setIsLoading(true);
    setMigrationStatus({ type: 'info', message: 'جاري التحقق من النقل...' });

    try {
      const result = await verifyMigration();
      
      if (result.success) {
        setMigrationStatus({
          type: 'success',
          message: 'تم التحقق بنجاح! جميع النصوص موجودة في قاعدة البيانات.'
        });
      } else {
        setMigrationStatus({
          type: 'error',
          message: `فشل التحقق! ${result.missing.length} نص مفقود.`
        });
      }
    } catch (error) {
      setMigrationStatus({
        type: 'error',
        message: `خطأ في التحقق: ${error}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Unused function - commented out
  // const handleClearTexts = async () => {
  //   if (!confirm('هل أنت متأكد من حذف جميع النصوص؟ هذا الإجراء لا يمكن التراجع عنه!')) {
  //     return;
  //   }
  //   // ... rest of function
  // };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
          <Database className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">إدارة نقل النصوص</h2>
          <p className="text-slate-600">نقل النصوص من الملفات إلى قاعدة البيانات</p>
        </div>
      </div>

      {/* Status Message */}
      {migrationStatus.type && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          migrationStatus.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200'
            : migrationStatus.type === 'error'
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          {migrationStatus.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : migrationStatus.type === 'error' ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          )}
          <span>{migrationStatus.message}</span>
        </div>
      )}

      {/* Current Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">إجمالي النصوص</p>
              <p className="text-2xl font-bold">{stats.totalTexts}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">النصوص العربية</p>
              <p className="text-2xl font-bold">{stats.arabicTexts}</p>
            </div>
            <Globe className="w-8 h-8 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">النصوص الإنجليزية</p>
              <p className="text-2xl font-bold">{stats.englishTexts}</p>
            </div>
            <Globe className="w-8 h-8 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">الفئات</p>
              <p className="text-2xl font-bold">{stats.categories.length}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Migration Result Details */}
      {migrationResult && (
        <div className="mb-6 p-4 bg-slate-50 rounded-lg">
          <h3 className="font-semibold text-slate-800 mb-2">تفاصيل عملية النقل:</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-slate-600">النصوص العربية:</span>
              <span className="font-semibold text-green-600 mr-2">{migrationResult.stats.arabic}</span>
            </div>
            <div>
              <span className="text-slate-600">النصوص الإنجليزية:</span>
              <span className="font-semibold text-blue-600 mr-2">{migrationResult.stats.english}</span>
            </div>
            <div>
              <span className="text-slate-600">إجمالي النجح:</span>
              <span className="font-semibold text-green-600 mr-2">{migrationResult.stats.total}</span>
            </div>
            <div>
              <span className="text-slate-600">الأخطاء:</span>
              <span className="font-semibold text-red-600 mr-2">{migrationResult.stats.errors}</span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={handleMigration}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <Upload className="w-5 h-5" />
          )}
          نقل النصوص
        </button>

        <button
          onClick={handleVerification}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <CheckCircle className="w-5 h-5" />
          )}
          التحقق من النقل
        </button>

        <button
          onClick={loadStats}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <BarChart3 className="w-5 h-5" />
          )}
          تحديث الإحصائيات
        </button>
      </div>

      {/* Categories List */}
      {stats.categories.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold text-slate-800 mb-3">الفئات المتاحة:</h3>
          <div className="flex flex-wrap gap-2">
            {stats.categories.map((category, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
              >
                {category}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Warning */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div className="text-yellow-800">
            <p className="font-semibold mb-1">تنبيه مهم:</p>
            <p className="text-sm">
              عملية النقل ستقوم بنسخ جميع النصوص من ملفات JSON إلى قاعدة البيانات. 
              إذا كانت النصوص موجودة مسبقاً، سيتم تحديثها. 
              تأكد من أن لديك نسخة احتياطية قبل المتابعة.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MigrationManager;
