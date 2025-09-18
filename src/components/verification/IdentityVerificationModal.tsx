import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  User,
  Calendar,
  Globe,
  ChevronRight,
  ChevronLeft,
  Shield,
  FileText,
  Camera,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../ToastContainer';
import { verificationService } from '../../lib/verificationService';
import type { VerificationStep1Data, VerificationStep2Data, VerificationStep3Data, VerificationStep4Data, VerificationStep5Data } from '../../lib/verificationService';
import { getCountriesForLanguage } from '../../data/countriesEnglish';
import CameraCapture from './CameraCapture';

interface IdentityVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

const IdentityVerificationModal: React.FC<IdentityVerificationModalProps> = ({
  isOpen,
  onClose,
  userId
}) => {
  const { t, i18n } = useTranslation();
  const { showSuccess, showError } = useToast();
  const isRTL = i18n.language === 'ar';

  // حالة المراحل
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationRequestId, setVerificationRequestId] = useState<string | null>(null);

  // بيانات المرحلة الأولى
  const [step1Data, setStep1Data] = useState<VerificationStep1Data>({
    fullNameArabic: '',
    fullNameEnglish: '',
    birthDate: '',
    nationality: i18n.language === 'ar' ? 'المملكة العربية السعودية' : 'Saudi Arabia'
  });

  // بيانات المرحلة الثانية
  const [step2Data, setStep2Data] = useState<VerificationStep2Data>({
    documentType: 'national_id'
  });

  // بيانات المرحلة الثالثة
  const [step3Data, setStep3Data] = useState<VerificationStep3Data>({
    documentNumber: '',
    documentIssueDate: '',
    documentExpiryDate: '',
    issuingAuthority: ''
  });

  // بيانات المرحلة الرابعة
  const [step4Data, setStep4Data] = useState<VerificationStep4Data>({
    documentFrontImage: null as File | null,
    documentBackImage: null as File | null
  });

  // بيانات المرحلة الخامسة
  const [step5Data, setStep5Data] = useState<VerificationStep5Data>({
    selfieImage: null as File | null
  });

  // حالة مكون التصوير
  const [showCameraCapture, setShowCameraCapture] = useState(false);

  // قائمة الدول
  const countries = getCountriesForLanguage(i18n.language);

  // تحقق من وجود طلب نشط عند فتح النافذة
  useEffect(() => {
    if (isOpen && userId) {
      checkExistingRequest();
    }
  }, [isOpen, userId]);

  const checkExistingRequest = async () => {
    try {
      const result = await verificationService.getCurrentRequest(userId);
      if (result.success && result.data) {
        // يوجد طلب نشط - لا يمكن إنشاء طلب جديد
        showError('تنبيه', 'يوجد طلب توثيق نشط بالفعل. يرجى انتظار مراجعة الطلب الحالي.');
        onClose();
        return;
      }
      // إذا لم يكن هناك طلب نشط، نبدأ من المرحلة الأولى
      setCurrentStep(1);
    } catch (error) {
      console.error('Error checking existing request:', error);
      // في حالة الخطأ، نبدأ من المرحلة الأولى
      setCurrentStep(1);
    }
  };

  // معالج إرسال المرحلة الأولى
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();

    // التحقق من صحة البيانات
    if (!step1Data.fullNameArabic.trim()) {
      showError('خطأ', 'يرجى إدخال الاسم الكامل بالعربي');
      return;
    }

    if (!step1Data.fullNameEnglish.trim()) {
      showError('خطأ', 'يرجى إدخال الاسم الكامل بالإنجليزي');
      return;
    }

    if (!step1Data.birthDate) {
      showError('خطأ', 'يرجى تحديد تاريخ الميلاد');
      return;
    }

    // التحقق من العمر (يجب أن يكون 18 سنة على الأقل)
    const birthDate = new Date(step1Data.birthDate);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (age < 18 || (age === 18 && monthDiff < 0)) {
      showError('خطأ', 'يجب أن يكون عمرك 18 سنة على الأقل');
      return;
    }

    // لا ننشئ طلب في قاعدة البيانات بعد! فقط ننتقل للمرحلة التالية
    // البيانات محفوظة في الـ state محلياً
    showSuccess('تم التحقق', 'تم التحقق من البيانات بنجاح');
    setCurrentStep(2);
  };

  // معالج إرسال المرحلة الثانية (حفظ محلي فقط)
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();

    // لا نرسل أي شيء لقاعدة البيانات، فقط ننتقل للمرحلة التالية
    showSuccess('تم التحقق', 'تم اختيار نوع المستند بنجاح');
    setCurrentStep(3);
  };

  // معالج إرسال المرحلة الثالثة (حفظ محلي فقط)
  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();

    // التحقق من صحة البيانات
    if (!step3Data.documentNumber.trim()) {
      showError('خطأ', 'يرجى إدخال رقم المستند');
      return;
    }

    if (!step3Data.documentIssueDate) {
      showError('خطأ', 'يرجى تحديد تاريخ الإصدار');
      return;
    }

    if (!step3Data.documentExpiryDate) {
      showError('خطأ', 'يرجى تحديد تاريخ الانتهاء');
      return;
    }

    // التحقق من أن تاريخ الانتهاء بعد تاريخ الإصدار
    const issueDate = new Date(step3Data.documentIssueDate);
    const expiryDate = new Date(step3Data.documentExpiryDate);

    if (expiryDate <= issueDate) {
      showError('خطأ', 'تاريخ الانتهاء يجب أن يكون بعد تاريخ الإصدار');
      return;
    }

    // التحقق من أن المستند لم ينته
    const today = new Date();
    if (expiryDate <= today) {
      showError('خطأ', 'المستند منتهي الصلاحية. يرجى استخدام مستند ساري المفعول');
      return;
    }

    // لا نرسل أي شيء لقاعدة البيانات، فقط ننتقل للمرحلة التالية
    showSuccess('تم التحقق', 'تم حفظ تفاصيل المستند بنجاح');
    setCurrentStep(4);
  };

  // معالج إرسال المرحلة الرابعة (حفظ محلي فقط)
  const handleStep4Submit = async (e: React.FormEvent) => {
    e.preventDefault();

    // التحقق من وجود الصورة الأمامية
    if (!step4Data.documentFrontImage) {
      showError('خطأ', 'يرجى رفع صورة الوجه الأمامي للمستند');
      return;
    }

    // التحقق من وجود الصورة الخلفية لبطاقة الهوية
    if (step2Data.documentType === 'national_id' && !step4Data.documentBackImage) {
      showError('خطأ', 'يرجى رفع صورة الوجه الخلفي لبطاقة الهوية');
      return;
    }

    // لا نرسل أي شيء لقاعدة البيانات، فقط ننتقل للمرحلة التالية
    showSuccess('تم التحقق', 'تم حفظ صور المستند بنجاح');
    setCurrentStep(5);
  };

  // معالج إرسال المرحلة الخامسة (إرسال الطلب الكامل)
  const handleStep5Submit = async (e: React.FormEvent) => {
    e.preventDefault();

    // التحقق من وجود صورة السيلفي
    if (!step5Data.selfieImage) {
      showError('خطأ', 'يرجى التقاط صورة السيلفي');
      return;
    }

    setIsLoading(true);

    try {
      // إرسال الطلب الكامل مع جميع البيانات
      const result = await verificationService.submitCompleteVerificationRequest(userId, {
        step1Data,
        step2Data,
        step3Data,
        step4Data,
        step5Data
      });

      if (result.success) {
        showSuccess('تم الإرسال', result.message || 'تم إرسال طلب التوثيق بنجاح!');
        // إغلاق النافذة بعد الإرسال الناجح
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        showError('خطأ', result.error || 'حدث خطأ في إرسال الطلب');
      }
    } catch (error: any) {
      showError('خطأ', error.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  };

  // معالج التقاط الصورة من الكاميرا
  const handleCameraCapture = (file: File) => {
    setStep5Data(prev => ({ ...prev, selfieImage: file }));
    setShowCameraCapture(false);
    showSuccess('تم التقاط الصورة', 'تم التقاط صورة السيلفي بنجاح');
  };

  // معالج إلغاء التصوير
  const handleCameraCancel = () => {
    setShowCameraCapture(false);
  };

  // معالج إغلاق النافذة
  const handleClose = () => {
    if (isLoading) return;
    onClose();
  };

  // معالج الرجوع للمرحلة السابقة
  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // مراحل التوثيق
  const steps = [
    { number: 1, title: 'المعلومات الشخصية', icon: User, completed: currentStep > 1 },
    { number: 2, title: 'نوع المستند', icon: FileText, completed: currentStep > 2 },
    { number: 3, title: 'تفاصيل المستند', icon: Shield, completed: currentStep > 3 },
    { number: 4, title: 'صور المستند', icon: Camera, completed: currentStep > 4 },
    { number: 5, title: 'صورة السيلفي', icon: CheckCircle, completed: currentStep > 5 }
  ];

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* خلفية مظلمة */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={isLoading ? undefined : handleClose}
      />

      {/* النافذة المنبثقة */}
      <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
        <div
          className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col"
          style={{
            width: '95vw',
            maxWidth: '900px',
            maxHeight: '95vh',
            minHeight: '400px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* رأس النافذة */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">توثيق الهوية الشخصية</h2>
                <p className="text-sm text-gray-600">المرحلة {currentStep} من 5</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* مؤشر التقدم */}
          <div className="px-6 py-4 bg-gray-50">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    step.completed 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : currentStep === step.number
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-white border-gray-300 text-gray-500'
                  }`}>
                    {step.completed ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <step.icon className="w-4 h-4" />
                    )}
                  </div>
                  <div className="mr-2 hidden sm:block">
                    <p className={`text-xs font-medium ${
                      step.completed || currentStep === step.number 
                        ? 'text-gray-900' 
                        : 'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-8 h-0.5 mx-2 ${
                      step.completed ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* محتوى النافذة */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    المعلومات الشخصية
                  </h3>
                  <p className="text-gray-600">
                    يرجى إدخال معلوماتك الشخصية كما هي مكتوبة في وثيقة الهوية
                  </p>
                </div>

                <form onSubmit={handleStep1Submit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* الاسم الكامل بالعربي */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الاسم الكامل بالعربي *
                      </label>
                      <div className="relative">
                        <User className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={step1Data.fullNameArabic}
                          onChange={(e) => setStep1Data(prev => ({ ...prev, fullNameArabic: e.target.value }))}
                          className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="مثال: أحمد محمد علي السعيد"
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    {/* الاسم الكامل بالإنجليزي */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الاسم الكامل بالإنجليزي *
                      </label>
                      <div className="relative">
                        <User className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={step1Data.fullNameEnglish}
                          onChange={(e) => setStep1Data(prev => ({ ...prev, fullNameEnglish: e.target.value }))}
                          className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Example: Ahmed Mohammed Ali Alsaeed"
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    {/* تاريخ الميلاد */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        تاريخ الميلاد *
                      </label>
                      <div className="relative">
                        <Calendar className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                        <input
                          type="date"
                          value={step1Data.birthDate}
                          onChange={(e) => setStep1Data(prev => ({ ...prev, birthDate: e.target.value }))}
                          className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          disabled={isLoading}
                          max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                        />
                      </div>
                    </div>

                    {/* الجنسية */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الجنسية *
                      </label>
                      <div className="relative">
                        <Globe className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                        <select
                          value={step1Data.nationality}
                          onChange={(e) => setStep1Data(prev => ({ ...prev, nationality: e.target.value }))}
                          className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                          required
                          disabled={isLoading}
                        >
                          {countries.map((country) => (
                            <option key={country.code} value={country.displayName}>
                              {country.displayName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* تنبيه مهم */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-amber-800 mb-1">تنبيه مهم</h4>
                        <p className="text-sm text-amber-700">
                          يرجى التأكد من أن جميع المعلومات مطابقة تماماً لما هو مكتوب في وثيقة الهوية الخاصة بك. 
                          أي اختلاف قد يؤدي إلى رفض طلب التوثيق.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* أزرار التحكم */}
                  <div className="flex justify-between pt-6">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isLoading}
                      className="px-6 py-3 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isLoading ? 'جاري الحفظ...' : 'التالي'}
                      {!isLoading && <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    نوع مستند التوثيق
                  </h3>
                  <p className="text-gray-600">
                    اختر نوع المستند الذي ستستخدمه لتوثيق هويتك
                  </p>
                </div>

                <form onSubmit={handleStep2Submit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* بطاقة الهوية الوطنية */}
                    <div
                      className={`relative p-6 border-2 rounded-xl cursor-pointer transition-all ${
                        step2Data.documentType === 'national_id'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setStep2Data({ documentType: 'national_id' })}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <Shield className="w-6 h-6 text-green-600" />
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 ${
                          step2Data.documentType === 'national_id'
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {step2Data.documentType === 'national_id' && (
                            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                            </div>
                          )}
                        </div>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">بطاقة الهوية الوطنية</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        بطاقة الهوية الوطنية الصادرة من الأحوال المدنية
                      </p>
                      <div className="text-xs text-gray-500">
                        <div className="flex items-center gap-1 mb-1">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span>سهولة في الاستخدام</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span>معترف بها محلياً</span>
                        </div>
                      </div>
                    </div>

                    {/* جواز السفر */}
                    <div
                      className={`relative p-6 border-2 rounded-xl cursor-pointer transition-all ${
                        step2Data.documentType === 'passport'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setStep2Data({ documentType: 'passport' })}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Globe className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 ${
                          step2Data.documentType === 'passport'
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {step2Data.documentType === 'passport' && (
                            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                            </div>
                          )}
                        </div>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">جواز السفر</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        جواز السفر الصادر من الجوازات
                      </p>
                      <div className="text-xs text-gray-500">
                        <div className="flex items-center gap-1 mb-1">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span>معترف بها دولياً</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span>مستوى أمان عالي</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* معلومات إضافية */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-800 mb-1">معلومات مهمة</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                          <li>• تأكد من أن المستند ساري المفعول</li>
                          <li>• يجب أن تكون الصور واضحة وغير مشوشة</li>
                          <li>• تأكد من ظهور جميع البيانات بوضوح</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* أزرار التحكم */}
                  <div className="flex justify-between pt-6">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      disabled={isLoading}
                      className="px-6 py-3 text-gray-600 hover:text-gray-800 disabled:opacity-50 flex items-center gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      السابق
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isLoading ? 'جاري الحفظ...' : 'التالي'}
                      {!isLoading && <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    تفاصيل المستند
                  </h3>
                  <p className="text-gray-600">
                    أدخل تفاصيل {step2Data.documentType === 'passport' ? 'جواز السفر' : 'بطاقة الهوية'} كما هي مكتوبة في المستند
                  </p>
                </div>

                <form onSubmit={handleStep3Submit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* رقم المستند */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        رقم {step2Data.documentType === 'passport' ? 'جواز السفر' : 'بطاقة الهوية'} *
                      </label>
                      <div className="relative">
                        <FileText className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={step3Data.documentNumber}
                          onChange={(e) => setStep3Data(prev => ({ ...prev, documentNumber: e.target.value }))}
                          className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={step2Data.documentType === 'passport' ? 'مثال: A12345678' : 'مثال: 1234567890'}
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    {/* تاريخ الإصدار */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        تاريخ الإصدار *
                      </label>
                      <div className="relative">
                        <Calendar className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                        <input
                          type="date"
                          value={step3Data.documentIssueDate}
                          onChange={(e) => setStep3Data(prev => ({ ...prev, documentIssueDate: e.target.value }))}
                          className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          disabled={isLoading}
                          max={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    </div>

                    {/* تاريخ الانتهاء */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        تاريخ الانتهاء *
                      </label>
                      <div className="relative">
                        <Calendar className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                        <input
                          type="date"
                          value={step3Data.documentExpiryDate}
                          onChange={(e) => setStep3Data(prev => ({ ...prev, documentExpiryDate: e.target.value }))}
                          className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          disabled={isLoading}
                          min={step3Data.documentIssueDate || new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    </div>

                    {/* جهة الإصدار */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        جهة الإصدار (اختياري)
                      </label>
                      <div className="relative">
                        <Globe className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={step3Data.issuingAuthority}
                          onChange={(e) => setStep3Data(prev => ({ ...prev, issuingAuthority: e.target.value }))}
                          className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={step2Data.documentType === 'passport' ? 'مثال: المديرية العامة للجوازات' : 'مثال: الأحوال المدنية'}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  </div>

                  {/* تنبيه مهم */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-amber-800 mb-1">تأكد من صحة البيانات</h4>
                        <ul className="text-sm text-amber-700 space-y-1">
                          <li>• تأكد من أن رقم المستند مطابق تماماً لما هو مكتوب</li>
                          <li>• تأكد من أن المستند ساري المفعول</li>
                          <li>• في المرحلة التالية ستحتاج لرفع صور واضحة للمستند</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* أزرار التحكم */}
                  <div className="flex justify-between pt-6">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      disabled={isLoading}
                      className="px-6 py-3 text-gray-600 hover:text-gray-800 disabled:opacity-50 flex items-center gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      السابق
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isLoading ? 'جاري الحفظ...' : 'التالي'}
                      {!isLoading && <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Camera className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    رفع صور المستند
                  </h3>
                  <p className="text-gray-600">
                    يرجى رفع صور واضحة لـ{step2Data.documentType === 'passport' ? 'جواز السفر' : 'بطاقة الهوية'}
                    {step2Data.documentType === 'national_id' && (
                      <span className="block text-sm text-amber-600 mt-1">
                        * مطلوب رفع صورتين: الوجه الأمامي والخلفي لبطاقة الهوية
                      </span>
                    )}
                  </p>
                </div>

                <form onSubmit={handleStep4Submit} className="space-y-6">
                  {/* رفع الصورة الأمامية */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      صورة الوجه الأمامي *
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      {step4Data.documentFrontImage ? (
                        <div className="space-y-3">
                          <img
                            src={URL.createObjectURL(step4Data.documentFrontImage)}
                            alt="الوجه الأمامي للمستند"
                            className="max-w-full max-h-48 mx-auto rounded-lg shadow-md"
                          />
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="text-sm text-green-600 font-medium">
                              {step4Data.documentFrontImage.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setStep4Data(prev => ({ ...prev, documentFrontImage: null }))}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            إزالة الصورة
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <Camera className="w-12 h-12 text-gray-400 mx-auto" />
                          <div>
                            <p className="text-gray-600 mb-2">اضغط لرفع صورة الوجه الأمامي</p>
                            <p className="text-xs text-gray-500">PNG, JPG, WEBP حتى 10MB</p>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setStep4Data(prev => ({ ...prev, documentFrontImage: file }));
                              }
                            }}
                            className="hidden"
                            id="front-image-upload"
                            disabled={isLoading}
                          />
                          <label
                            htmlFor="front-image-upload"
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                          >
                            <Camera className="w-4 h-4 mr-2" />
                            اختيار صورة
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* رفع الصورة الخلفية (إجباري لبطاقة الهوية، اختياري للجواز) */}
                  {step2Data.documentType === 'national_id' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        صورة الوجه الخلفي *
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                        {step4Data.documentBackImage ? (
                          <div className="space-y-3">
                            <img
                              src={URL.createObjectURL(step4Data.documentBackImage)}
                              alt="الوجه الخلفي للمستند"
                              className="max-w-full max-h-48 mx-auto rounded-lg shadow-md"
                            />
                            <div className="flex items-center justify-center gap-2">
                              <CheckCircle className="w-5 h-5 text-green-500" />
                              <span className="text-sm text-green-600 font-medium">
                                {step4Data.documentBackImage.name}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setStep4Data(prev => ({ ...prev, documentBackImage: null }))}
                              className="text-sm text-red-600 hover:text-red-700"
                            >
                              إزالة الصورة
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <Camera className="w-12 h-12 text-gray-400 mx-auto" />
                            <div>
                              <p className="text-gray-600 mb-2">اضغط لرفع صورة الوجه الخلفي</p>
                              <p className="text-xs text-gray-500">PNG, JPG, WEBP حتى 10MB</p>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setStep4Data(prev => ({ ...prev, documentBackImage: file }));
                                }
                              }}
                              className="hidden"
                              id="back-image-upload"
                              disabled={isLoading}
                            />
                            <label
                              htmlFor="back-image-upload"
                              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 cursor-pointer transition-colors"
                            >
                              <Camera className="w-4 h-4 mr-2" />
                              اختيار صورة
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* نصائح مهمة */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-800 mb-1">نصائح للحصول على أفضل النتائج</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                          <li>• تأكد من وضوح جميع النصوص والتفاصيل</li>
                          <li>• تجنب الانعكاسات والظلال</li>
                          <li>• استخدم إضاءة جيدة ومتوازنة</li>
                          <li>• تأكد من أن المستند مسطح وغير مطوي</li>
                          {step2Data.documentType === 'national_id' && (
                            <li className="text-amber-700 font-medium">• مطلوب رفع الوجهين الأمامي والخلفي لبطاقة الهوية</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* أزرار التحكم */}
                  <div className="flex justify-between pt-6">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      disabled={isLoading}
                      className="px-6 py-3 text-gray-600 hover:text-gray-800 disabled:opacity-50 flex items-center gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      السابق
                    </button>
                    <button
                      type="submit"
                      disabled={
                        isLoading ||
                        !step4Data.documentFrontImage ||
                        (step2Data.documentType === 'national_id' && !step4Data.documentBackImage)
                      }
                      className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isLoading ? 'جاري الرفع...' : 'التالي'}
                      {!isLoading && <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    تصوير السيلفي
                  </h3>
                  <p className="text-gray-600">
                    التقط صورة سيلفي واضحة لتأكيد هويتك
                  </p>
                </div>

                <form onSubmit={handleStep5Submit} className="space-y-6">
                  {/* رفع صورة السيلفي */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      صورة السيلفي *
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      {step5Data.selfieImage ? (
                        <div className="space-y-3">
                          <img
                            src={URL.createObjectURL(step5Data.selfieImage)}
                            alt="صورة السيلفي"
                            className="max-w-full max-h-64 mx-auto rounded-lg shadow-md"
                          />
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="text-sm text-green-600 font-medium">
                              {step5Data.selfieImage.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setStep5Data(prev => ({ ...prev, selfieImage: null }))}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            إزالة الصورة
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <User className="w-16 h-16 text-gray-400 mx-auto" />
                          <div>
                            <p className="text-gray-600 mb-2">ارفع صورة سيلفي واضحة</p>
                            <p className="text-xs text-gray-500">PNG, JPG, WEBP حتى 10MB - مؤقتاً للتجربة</p>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setStep5Data(prev => ({ ...prev, selfieImage: file }));
                              }
                            }}
                            className="hidden"
                            id="selfie-upload"
                            disabled={isLoading}
                          />
                          <label
                            htmlFor="selfie-upload"
                            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer transition-colors"
                          >
                            <Camera className="w-4 h-4 mr-2" />
                            اختيار صورة
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* إرشادات مهمة */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-green-800 mb-1">إرشادات تصوير السيلفي</h4>
                        <ul className="text-sm text-green-700 space-y-1">
                          <li>• انظر مباشرة إلى الكاميرا</li>
                          <li>• تأكد من وضوح وجهك بالكامل</li>
                          <li>• استخدم إضاءة جيدة</li>
                          <li>• تجنب النظارات الشمسية أو القبعات</li>
                          <li>• تأكد من أن الصورة تشبه صورة المستند</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* تنبيه نهائي */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-amber-800 mb-1">تنبيه مهم</h4>
                        <p className="text-sm text-amber-700">
                          بعد الضغط على "إرسال الطلب" سيتم إرسال طلب التوثيق للمراجعة الإدارية.
                          ستتلقى إشعاراً عند اتخاذ قرار بشأن طلبك خلال 1-3 أيام عمل.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* أزرار التحكم */}
                  <div className="flex justify-between pt-6">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      disabled={isLoading}
                      className="px-6 py-3 text-gray-600 hover:text-gray-800 disabled:opacity-50 flex items-center gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      السابق
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || !step5Data.selfieImage}
                      className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isLoading ? 'جاري الإرسال...' : 'إرسال الطلب'}
                      {!isLoading && <CheckCircle className="w-4 h-4" />}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* رسالة للمراحل غير المكتملة */}
            {currentStep > 5 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  المرحلة {currentStep} قيد التطوير
                </h3>
                <p className="text-gray-600 mb-6">
                  هذه المرحلة ستكون متاحة قريباً
                </p>
                <button
                  onClick={handlePrevStep}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 mx-auto"
                >
                  <ChevronLeft className="w-4 h-4" />
                  العودة للمرحلة السابقة
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* مكون التصوير المباشر - معطل مؤقتاً للتجربة */}
      {/* <CameraCapture
        isOpen={showCameraCapture}
        onCapture={handleCameraCapture}
        onCancel={handleCameraCancel}
      /> */}
    </div>,
    document.body
  );
};

export default IdentityVerificationModal;
