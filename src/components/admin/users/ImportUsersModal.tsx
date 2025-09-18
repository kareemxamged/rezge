import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  Download,
  Users,
  Loader2,
  Info
} from 'lucide-react';
import { adminUsersService } from '../../../lib/adminUsersService';

interface ImportUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
  duplicates: number;
}

const ImportUsersModal: React.FC<ImportUsersModalProps> = ({
  isOpen,
  onClose,
  onImportComplete
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      alert('يرجى اختيار ملف CSV فقط');
      return;
    }
    setFile(selectedFile);
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const users = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length >= headers.length) {
        const user: any = {};
        headers.forEach((header, index) => {
          const value = values[index] || '';
          switch (header) {
            case 'الاسم الأول':
              user.first_name = value;
              break;
            case 'الاسم الأخير':
              user.last_name = value;
              break;
            case 'البريد الإلكتروني':
              user.email = value;
              break;
            case 'الهاتف':
              user.phone = value || null;
              break;
            case 'الجنس':
              user.gender = value === 'ذكر' ? 'male' : value === 'أنثى' ? 'female' : null;
              break;
            case 'البلد':
              user.nationality = value || null;
              break;
            case 'المدينة':
              user.city = value || null;
              break;
            case 'حالة الحساب':
              user.status = value === 'نشط' ? 'active' : value === 'محظور' ? 'banned' : 'active';
              break;
            case 'حالة التحقق':
              user.verified = value === 'محقق' || value === 'verified';
              break;
          }
        });
        
        if (user.email && user.first_name && user.last_name) {
          users.push(user);
        }
      }
    }

    return users;
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    try {
      const csvText = await file.text();
      const users = parseCSV(csvText);

      if (users.length === 0) {
        alert('لم يتم العثور على بيانات صالحة في الملف');
        setImporting(false);
        return;
      }

      // تنفيذ عملية الاستيراد الفعلية
      const importResult: ImportResult = {
        success: 0,
        failed: 0,
        errors: [],
        duplicates: 0
      };

      for (const user of users) {
        try {
          const response = await adminUsersService.importUser(user);

          if (response.success) {
            importResult.success++;
          } else if (response.isDuplicate) {
            importResult.duplicates++;
          } else {
            importResult.failed++;
            importResult.errors.push(`فشل في استيراد ${user.email}: ${response.error}`);
          }
        } catch (error) {
          importResult.failed++;
          importResult.errors.push(`فشل في استيراد ${user.email}: ${error}`);
        }
      }

      setResult(importResult);
      
      if (importResult.success > 0) {
        onImportComplete();
      }
    } catch (error) {
      console.error('Error importing users:', error);
      alert('حدث خطأ في قراءة الملف');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      'الاسم الأول,الاسم الأخير,البريد الإلكتروني,الهاتف,الجنس,البلد,المدينة,حالة الحساب,حالة التحقق',
      'أحمد,محمد,ahmed@example.com,+966501234567,ذكر,السعودية,الرياض,نشط,محقق',
      'فاطمة,علي,fatima@example.com,+966507654321,أنثى,السعودية,جدة,نشط,محقق'
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'users_import_template.csv';
    link.click();
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-8 max-h-[calc(100vh-4rem)] overflow-hidden flex flex-col">
        {/* رأس النافذة */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">استيراد المستخدمين</h2>
              <p className="text-sm text-gray-600">رفع ملف CSV لاستيراد المستخدمين</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={importing}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* محتوى النافذة */}
        <div className="p-6 flex-1 overflow-y-auto">
          {!result ? (
            <>
              {/* معلومات مهمة */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">متطلبات الملف:</h4>
                    <ul className="text-blue-700 text-sm space-y-1">
                      <li>• يجب أن يكون الملف بصيغة CSV</li>
                      <li>• يجب أن يحتوي على الأعمدة المطلوبة</li>
                      <li>• البريد الإلكتروني والاسم الأول والأخير مطلوبة</li>
                      <li>• سيتم تجاهل المستخدمين المكررين</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* تنزيل القالب */}
              <div className="mb-6">
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  تحميل قالب CSV
                </button>
              </div>

              {/* منطقة رفع الملف */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragOver
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                {file ? (
                  <div className="space-y-4">
                    <FileText className="w-12 h-12 text-green-600 mx-auto" />
                    <div>
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-600">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      إزالة الملف
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-lg font-medium text-gray-900 mb-2">
                        اسحب وأفلت ملف CSV هنا
                      </p>
                      <p className="text-gray-600 mb-4">أو</p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        اختر ملف
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile) handleFileSelect(selectedFile);
                }}
                className="hidden"
              />
            </>
          ) : (
            /* نتائج الاستيراد */
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  تم الانتهاء من الاستيراد
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-800">{result.success}</p>
                  <p className="text-green-700 text-sm">تم استيرادهم بنجاح</p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                  <Users className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-yellow-800">{result.duplicates}</p>
                  <p className="text-yellow-700 text-sm">مستخدمين مكررين</p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-800">{result.failed}</p>
                  <p className="text-red-700 text-sm">فشل في الاستيراد</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-2">الأخطاء:</h4>
                  <ul className="text-red-700 text-sm space-y-1 max-h-32 overflow-y-auto">
                    {result.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* أزرار التحكم */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
            disabled={importing}
          >
            {result ? 'إغلاق' : 'إلغاء'}
          </button>
          
          {!result && file && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الاستيراد...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  بدء الاستيراد
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportUsersModal;
