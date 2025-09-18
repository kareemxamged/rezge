import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  Upload,
  FileImage,
  FileVideo,
  Trash2,

  Loader2,
  Ban,
  Shield
} from 'lucide-react';
import { type User } from '../../../lib/adminUsersService';
import { banDurationOptions } from '../../../utils/banDurationUtils';

interface BlockUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmBlock: (userId: string, reason: string, evidenceFiles: File[], banType: 'permanent' | 'temporary', duration?: string) => Promise<void>;
  onConfirmUnblock: (userId: string) => Promise<void>;
}

interface FilePreview {
  file: File;
  url: string;
  type: 'image' | 'video';
}

const BlockUserModal: React.FC<BlockUserModalProps> = ({
  user,
  isOpen,
  onClose,
  onConfirmBlock,
  onConfirmUnblock
}) => {
  const [blockReason, setBlockReason] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<FilePreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banType, setBanType] = useState<'permanent' | 'temporary'>('permanent');
  const [banDuration, setBanDuration] = useState('2_hours');

  const isBlocked = user?.status === 'banned';

  // خيارات مدة الحظر المؤقت مستوردة من utils

  const resetForm = () => {
    setBlockReason('');
    setEvidenceFiles([]);
    setError(null);
    setLoading(false);
    setBanType('permanent');
    setBanDuration('2_hours');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    files.forEach(file => {
      // التحقق من نوع الملف
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        setError('يُسمح فقط بملفات الصور والفيديو');
        return;
      }

      // التحقق من حجم الملف (10MB كحد أقصى)
      if (file.size > 10 * 1024 * 1024) {
        setError('حجم الملف يجب أن يكون أقل من 10 ميجابايت');
        return;
      }

      const url = URL.createObjectURL(file);
      const type = file.type.startsWith('image/') ? 'image' : 'video';
      
      setEvidenceFiles(prev => [...prev, { file, url, type }]);
    });

    // إعادة تعيين قيمة input
    event.target.value = '';
  };

  const removeFile = (index: number) => {
    setEvidenceFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].url);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (isBlocked) {
      // إلغاء الحظر
      setLoading(true);
      try {
        await onConfirmUnblock(user.id);
        handleClose();
      } catch (error) {
        setError('حدث خطأ في إلغاء الحظر');
      } finally {
        setLoading(false);
      }
    } else {
      // حظر المستخدم
      if (!blockReason.trim()) {
        setError('يجب كتابة سبب الحظر');
        return;
      }

      setLoading(true);
      try {
        const files = evidenceFiles.map(item => item.file);
        const durationToSend = banType === 'temporary' ? banDuration : undefined;

        await onConfirmBlock(user.id, blockReason.trim(), files, banType, durationToSend);
        handleClose();
      } catch (error) {
        setError('حدث خطأ في حظر المستخدم');
      } finally {
        setLoading(false);
      }
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
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isBlocked 
                ? 'bg-gradient-to-br from-green-500 to-green-600' 
                : 'bg-gradient-to-br from-red-500 to-red-600'
            }`}>
              {isBlocked ? <Shield className="w-5 h-5 text-white" /> : <Ban className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {isBlocked ? 'إلغاء حظر المستخدم' : 'حظر المستخدم'}
              </h2>
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

          {isBlocked ? (
            /* رسالة إلغاء الحظر */
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                إلغاء حظر المستخدم
              </h3>
              <p className="text-gray-600 mb-4">
                هل أنت متأكد من إلغاء حظر هذا المستخدم؟ سيتمكن من الوصول للموقع مرة أخرى.
              </p>
              {user.block_reason && (
                <div className="bg-gray-50 p-4 rounded-lg text-right">
                  <p className="text-sm font-medium text-gray-700 mb-2">سبب الحظر السابق:</p>
                  <p className="text-gray-600">{user.block_reason}</p>
                  {user.blocked_at && (
                    <p className="text-xs text-gray-500 mt-2">
                      تم الحظر في: {new Date(user.blocked_at).toLocaleDateString('en-GB')}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* نموذج حظر المستخدم */
            <div className="space-y-6">
              <div className={`border rounded-lg p-4 ${
                banType === 'permanent'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-orange-50 border-orange-200'
              }`}>
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`w-5 h-5 ${
                    banType === 'permanent' ? 'text-red-600' : 'text-orange-600'
                  }`} />
                  <div>
                    <h3 className={`font-medium ${
                      banType === 'permanent' ? 'text-red-800' : 'text-orange-800'
                    }`}>
                      تحذير: {banType === 'permanent' ? 'حظر دائم' : 'حظر مؤقت'}
                    </h3>
                    <p className={`text-sm mt-1 ${
                      banType === 'permanent' ? 'text-red-700' : 'text-orange-700'
                    }`}>
                      {banType === 'permanent'
                        ? 'سيتم منع هذا المستخدم من الوصول للموقع نهائياً. تأكد من صحة قرارك.'
                        : 'سيتم منع هذا المستخدم من الوصول للموقع لفترة محددة ثم سيتم فك الحظر تلقائياً.'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* سبب الحظر */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  سبب الحظر *
                </label>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  rows={4}
                  placeholder="اكتب سبب حظر هذا المستخدم بالتفصيل..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  يجب كتابة سبب واضح ومفصل لحظر المستخدم
                </p>
              </div>

              {/* نوع الحظر */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  نوع الحظر *
                </label>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="banType"
                      value="permanent"
                      checked={banType === 'permanent'}
                      onChange={(e) => setBanType(e.target.value as 'permanent' | 'temporary')}
                      className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                    />
                    <span className="mr-3 text-sm text-gray-700">حظر دائم</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="banType"
                      value="temporary"
                      checked={banType === 'temporary'}
                      onChange={(e) => setBanType(e.target.value as 'permanent' | 'temporary')}
                      className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                    />
                    <span className="mr-3 text-sm text-gray-700">حظر مؤقت</span>
                  </label>
                </div>
              </div>

              {/* مدة الحظر المؤقت */}
              {banType === 'temporary' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    مدة الحظر *
                  </label>
                  <select
                    value={banDuration}
                    onChange={(e) => setBanDuration(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    {banDurationOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    سيتم فك الحظر تلقائياً بعد انتهاء المدة المحددة
                  </p>
                </div>
              )}

              {/* إرفاق الملفات */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  إرفاق أدلة (اختياري)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="evidence-upload"
                  />
                  <label htmlFor="evidence-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      اضغط لإرفاق صور أو فيديوهات كدليل
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      الحد الأقصى: 10 ميجابايت لكل ملف
                    </p>
                  </label>
                </div>

                {/* معاينة الملفات المرفقة */}
                {evidenceFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-gray-700">الملفات المرفقة:</p>
                    <div className="grid grid-cols-2 gap-3">
                      {evidenceFiles.map((item, index) => (
                        <div key={index} className="relative group">
                          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                            <div className="flex items-center gap-2">
                              {item.type === 'image' ? (
                                <FileImage className="w-4 h-4 text-blue-500" />
                              ) : (
                                <FileVideo className="w-4 h-4 text-purple-500" />
                              )}
                              <span className="text-sm text-gray-700 truncate flex-1">
                                {item.file.name}
                              </span>
                              <button
                                onClick={() => removeFile(index)}
                                className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            {item.type === 'image' && (
                              <img
                                src={item.url}
                                alt="معاينة"
                                className="w-full h-20 object-cover rounded mt-2"
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
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
            disabled={loading || (!isBlocked && !blockReason.trim())}
            className={`px-6 py-2 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              isBlocked 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري المعالجة...
              </>
            ) : (
              <>
                {isBlocked ? (
                  <>
                    <Shield className="w-4 h-4" />
                    إلغاء الحظر
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4" />
                    تأكيد الحظر
                  </>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlockUserModal;
