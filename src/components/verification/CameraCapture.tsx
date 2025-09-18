import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, RotateCcw, Check, X, AlertCircle, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
  isOpen: boolean;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  onCancel,
  isOpen
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // بدء تشغيل الكاميرا
  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // إيقاف الكاميرا السابقة إن وجدت
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      setError('لا يمكن الوصول إلى الكاميرا. يرجى التأكد من منح الإذن للموقع لاستخدام الكاميرا.');
    } finally {
      setIsLoading(false);
    }
  }, [facingMode]);

  // إيقاف الكاميرا
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // التقاط الصورة
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // تعيين أبعاد الكانفاس
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // رسم الفيديو على الكانفاس
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // تحويل إلى صورة
    canvas.toBlob((blob) => {
      if (blob) {
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage(imageUrl);
        stopCamera();
      }
    }, 'image/jpeg', 0.9);
  }, [stopCamera]);

  // إعادة التقاط الصورة
  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  // تأكيد الصورة
  const confirmPhoto = useCallback(() => {
    if (!canvasRef.current) return;

    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
        onCapture(file);
      }
    }, 'image/jpeg', 0.9);
  }, [onCapture]);

  // تبديل الكاميرا (أمامية/خلفية)
  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  // بدء الكاميرا عند فتح المكون
  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [isOpen, capturedImage, startCamera, stopCamera]);

  // تحديث الكاميرا عند تغيير الوضع
  useEffect(() => {
    if (isStreaming) {
      startCamera();
    }
  }, [facingMode, isStreaming, startCamera]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        // إغلاق النافذة عند النقر على الخلفية
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* الهيدر */}
        <div className="bg-green-600 text-white p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">التقاط صورة السيلفي</h3>
          <button
            onClick={onCancel}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* المحتوى */}
        <div className="p-4 flex-1 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* منطقة الكاميرا */}
          <div className="relative bg-gray-100 rounded-lg overflow-hidden mb-4 w-full" style={{ aspectRatio: '4/3', maxHeight: '300px' }}>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                <div className="text-center">
                  <Loader className="w-8 h-8 text-gray-600 animate-spin mx-auto mb-2" />
                  <p className="text-gray-600 text-sm">جاري تشغيل الكاميرا...</p>
                </div>
              </div>
            )}

            {capturedImage ? (
              <img
                src={capturedImage}
                alt="Captured selfie"
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
            )}

            {/* أزرار التحكم */}
            {isStreaming && !capturedImage && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <button
                  onClick={capturePhoto}
                  className="bg-white rounded-full p-3 shadow-lg hover:bg-gray-50 transition-colors"
                >
                  <Camera className="w-8 h-8 text-green-600" />
                </button>
              </div>
            )}

            {/* زر تبديل الكاميرا */}
            {isStreaming && !capturedImage && (
              <button
                onClick={switchCamera}
                className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70 transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* الإرشادات */}
          {!capturedImage && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <h4 className="font-medium text-blue-800 mb-2">إرشادات التصوير:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• انظر مباشرة إلى الكاميرا</li>
                <li>• تأكد من وضوح وجهك بالكامل</li>
                <li>• استخدم إضاءة جيدة</li>
                <li>• تجنب النظارات الشمسية</li>
                <li>• تأكد من أن الصورة تشبه صورة المستند</li>
              </ul>
            </div>
          )}

          {/* أزرار التحكم */}
          <div className="flex gap-3">
            {capturedImage ? (
              <>
                <button
                  onClick={retakePhoto}
                  className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  إعادة التقاط
                </button>
                <button
                  onClick={confirmPhoto}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  تأكيد الصورة
                </button>
              </>
            ) : (
              <button
                onClick={onCancel}
                className="w-full bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
              >
                إلغاء
              </button>
            )}
          </div>
        </div>
      </div>

      {/* الكانفاس المخفي لمعالجة الصورة */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraCapture;
