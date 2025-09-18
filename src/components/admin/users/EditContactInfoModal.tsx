import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Phone,
  Upload,
  FileText,
  FileImage,
  FileVideo,
  Trash2,
  Save,
  Loader2,
  Edit,
  AlertTriangle
} from 'lucide-react';
import { type User } from '../../../lib/adminUsersService';
import { useToast } from '../../ToastContainer';

interface EditContactInfoModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: string, contactInfo: ContactInfo, reason: string, documents: File[]) => Promise<void>;
}

interface ContactInfo {
  email: string;
  phone: string;
}

interface FilePreview {
  file: File;
  url: string;
  type: 'image' | 'video' | 'document';
}

const EditContactInfoModal: React.FC<EditContactInfoModalProps> = ({
  user,
  isOpen,
  onClose,
  onSave
}) => {
  const { showSuccess, showError } = useToast();

  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    email: '',
    phone: ''
  });
  const [reason, setReason] = useState('');
  const [documents, setDocuments] = useState<FilePreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // تحديث البيانات عند تغيير المستخدم
  useEffect(() => {
    if (user) {
      setContactInfo({
        email: user.email || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  const resetForm = () => {
    setContactInfo({
      email: user?.email || '',
      phone: user?.phone || ''
    });
    setReason('');
    setDocuments([]);
    setError(null);
    setLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    files.forEach(file => {
      // التحقق من نوع الملف
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isDocument = file.type === 'application/pdf' || 
                        file.type === 'application/msword' || 
                        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                        file.type === 'text/plain';

      if (!isImage && !isVideo && !isDocument) {
        setError('يُسمح فقط بملفات الصور والفيديو والمستندات (PDF, Word, TXT)');
        return;
      }

      // التحقق من حجم الملف (10MB كحد أقصى)
      if (file.size > 10 * 1024 * 1024) {
        setError('حجم الملف يجب أن يكون أقل من 10 ميجابايت');
        return;
      }

      const url = URL.createObjectURL(file);
      let type: 'image' | 'video' | 'document' = 'document';
      
      if (isImage) type = 'image';
      else if (isVideo) type = 'video';
      
      setDocuments(prev => [...prev, { file, url, type }]);
    });

    // إعادة تعيين قيمة input
    event.target.value = '';
  };

  const removeFile = (index: number) => {
    setDocuments(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].url);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      showError('خطأ في البيانات', 'يجب كتابة سبب التعديل');
      setError('يجب كتابة سبب التعديل');
      return;
    }

    if (!user) return;

    setLoading(true);
    try {
      const files = documents.map(item => item.file);
      await onSave(user.id, contactInfo, reason.trim(), files);

      showSuccess(
        'تم تحديث معلومات التواصل',
        `تم تحديث معلومات التواصل للمستخدم ${user.first_name} ${user.last_name} بنجاح.`
      );

      handleClose();
    } catch (error: any) {
      const errorMessage = error.message || 'حدث خطأ في حفظ التعديلات';
      showError('فشل في حفظ التعديلات', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image': return <FileImage className="w-4 h-4 text-blue-500" />;
      case 'video': return <FileVideo className="w-4 h-4 text-purple-500" />;
      default: return <FileText className="w-4 h-4 text-green-500" />;
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div
      className="fixed inset-0 modal-backdrop backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={handleBackdropClick}
    >
      <div className="modal-container rounded-lg max-w-2xl w-full max-h-[95vh] overflow-hidden flex flex-col"
           onClick={(e) => e.stopPropagation()}>
        {/* رأس النافذة */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Edit className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">تعديل معلومات التواصل</h2>
              <p className="text-sm text-gray-600">
                {user.first_name} {user.last_name} ({user.email})
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* محتوى النافذة */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* تحذير */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <div>
                  <h3 className="font-medium text-yellow-800">تنبيه مهم</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    يُسمح فقط بتعديل معلومات التواصل (البريد الإلكتروني ورقم الهاتف). 
                    يجب كتابة سبب واضح للتعديل.
                  </p>
                </div>
              </div>
            </div>

            {/* معلومات التواصل */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">معلومات التواصل</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    البريد الإلكتروني *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="email"
                      value={contactInfo.email}
                      onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="example@domain.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رقم الهاتف
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="tel"
                      value={contactInfo.phone}
                      onChange={(e) => setContactInfo(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+966xxxxxxxxx"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* سبب التعديل */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                سبب التعديل *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                placeholder="اكتب سبب تعديل معلومات التواصل..."
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                يجب كتابة سبب واضح ومفصل للتعديل
              </p>
            </div>

            {/* إرفاق المستندات */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                إرفاق مستندات (اختياري)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="documents-upload"
                />
                <label htmlFor="documents-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    اضغط لإرفاق مستندات، صور أو فيديوهات
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    المسموح: PDF, Word, TXT, صور، فيديوهات (حد أقصى: 10 ميجابايت)
                  </p>
                </label>
              </div>

              {/* معاينة الملفات المرفقة */}
              {documents.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">الملفات المرفقة:</p>
                  <div className="space-y-2">
                    {documents.map((item, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group">
                        {getFileIcon(item.type)}
                        <span className="text-sm text-gray-700 flex-1 truncate">
                          {item.file.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {(item.file.size / 1024 / 1024).toFixed(1)} MB
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* أزرار التحكم */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 flex-shrink-0 bg-gray-50">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            disabled={loading}
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !reason.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                حفظ التعديلات
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditContactInfoModal;
