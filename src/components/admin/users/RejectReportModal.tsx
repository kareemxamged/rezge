import React, { useState } from 'react';
import { X as XIcon, Upload, FileText } from 'lucide-react';

interface RejectReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReject: (data: {
    reason: string;
    evidenceFiles: File[];
  }) => void;
  reportId: string;
  reportedUser: string;
  loading?: boolean;
}

const RejectReportModal: React.FC<RejectReportModalProps> = ({
  isOpen,
  onClose,
  onReject,
  reportId,
  reportedUser,
  loading = false
}) => {
  const [reason, setReason] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const allowedFileTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'video/mp4',
    'video/quicktime',
    'audio/mpeg',
    'audio/wav'
  ];

  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const validFiles: File[] = [];
    const fileErrors: string[] = [];

    Array.from(files).forEach(file => {
      if (!allowedFileTypes.includes(file.type)) {
        fileErrors.push(`${file.name}: نوع الملف غير مدعوم`);
        return;
      }

      if (file.size > maxFileSize) {
        fileErrors.push(`${file.name}: حجم الملف كبير جداً (الحد الأقصى 10MB)`);
        return;
      }

      validFiles.push(file);
    });

    if (fileErrors.length > 0) {
      setErrors({ files: fileErrors.join(', ') });
    } else {
      setErrors({});
    }

    setEvidenceFiles(prev => [...prev, ...validFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const removeFile = (index: number) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!reason.trim()) {
      newErrors.reason = 'سبب الرفض مطلوب';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    onReject({
      reason: reason.trim(),
      evidenceFiles
    });
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-70 backdrop-blur-lg flex items-center justify-center z-[999999] p-4 overflow-y-auto"
      style={{ margin: 0, width: '100vw', height: '100vh' }}
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-8 max-h-[calc(100vh-4rem)] overflow-hidden flex flex-col">
        {/* رأس النافذة */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-red-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <XIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">رفض البلاغ</h2>
              <p className="text-sm text-gray-600">معرف البلاغ: {reportId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={loading}
          >
            <XIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* محتوى النافذة */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* معلومات البلاغ */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">معلومات البلاغ</h3>
            <p className="text-sm text-gray-600">
              <span className="font-medium">المبلغ عنه:</span> {reportedUser}
            </p>
          </div>

          {/* سبب الرفض */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              سبب رفض البلاغ <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="اذكر سبب رفض هذا البلاغ..."
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none ${
                errors.reason ? 'border-red-300' : 'border-gray-300'
              }`}
              rows={3}
              disabled={loading}
            />
            {errors.reason && (
              <p className="mt-1 text-sm text-red-600">{errors.reason}</p>
            )}
          </div>

          {/* رفع المستندات */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              مستندات الإثبات (اختياري)
            </label>
            
            {/* منطقة رفع الملفات */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragOver ? 'border-red-400 bg-red-50' : 'border-gray-300'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                اسحب الملفات هنا أو 
                <label className="text-red-600 hover:text-red-700 cursor-pointer underline mx-1">
                  تصفح
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4,.mov,.mp3,.wav"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                    disabled={loading}
                  />
                </label>
              </p>
              <p className="text-xs text-gray-500">
                الملفات المدعومة: PDF, Word, Excel, الصور, الفيديو, الصوت (حد أقصى 10MB)
              </p>
            </div>

            {errors.files && (
              <p className="mt-2 text-sm text-red-600">{errors.files}</p>
            )}

            {/* قائمة الملفات المرفوعة */}
            {evidenceFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium text-gray-700">الملفات المرفوعة:</h4>
                {evidenceFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1 hover:bg-gray-200 rounded"
                      disabled={loading}
                    >
                      <XIcon className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* أزرار التحكم */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !reason.trim()}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                جاري الرفض...
              </>
            ) : (
              <>
                <XIcon className="w-4 h-4" />
                رفض البلاغ
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectReportModal;
