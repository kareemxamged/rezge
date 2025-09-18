import React, { useState } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,

  GraduationCap,
  Briefcase,

  Church,
  UserPlus,
  Eye,
  EyeOff,
  Save,

  Loader2
} from 'lucide-react';
import { adminUsersService } from '../../../lib/adminUsersService';
import { getCountriesForLanguage } from '../../../data/countriesEnglish';
import { useToast } from '../../ToastContainer';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserAdded: () => void;
}

interface NewUserData {
  // الحقول الإجبارية - مطابقة تماماً لصفحة التسجيل
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  age: number;
  gender: 'male' | 'female';
  city: string;
  nationality: string;
  profession: string;
  bio: string;
  // حقول اختيارية - مطابقة تماماً لصفحة التسجيل
  education?: string;
  religiousCommitment?: 'committed' | 'conservative' | 'prefer_not_say';
  height?: number;
  weight?: number;
  educationLevel?: 'primary' | 'secondary' | 'diploma' | 'bachelor' | 'master' | 'phd';
  financialStatus?: 'poor' | 'below_average' | 'average' | 'above_average' | 'wealthy';
  religiosityLevel?: 'not_religious' | 'slightly_religious' | 'religious' | 'very_religious' | 'prefer_not_say';
  prayerCommitment?: 'dont_pray' | 'pray_all' | 'pray_sometimes' | 'prefer_not_say';
  smoking?: 'yes' | 'no';
  beard?: 'yes' | 'no';
  hijab?: 'no_hijab' | 'hijab' | 'niqab' | 'prefer_not_say';
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed' | 'prefer_not_say';
}

const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose, onUserAdded }) => {
  const { showSuccess, showError } = useToast();

  const [formData, setFormData] = useState<NewUserData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    age: 18,
    gender: 'male',
    city: '',
    nationality: 'المملكة العربية السعودية',
    profession: '',
    bio: '',
    // حقول اختيارية - مطابقة تماماً لصفحة التسجيل
    education: '',
    religiousCommitment: 'committed',
    height: undefined,
    weight: undefined,
    educationLevel: undefined,
    financialStatus: undefined,
    religiosityLevel: undefined,
    prayerCommitment: undefined,
    smoking: undefined,
    beard: undefined,
    hijab: undefined
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: keyof NewUserData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // التحقق من صحة البيانات المطلوبة (مطابق لصفحة التسجيل)
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
        throw new Error('يرجى ملء جميع الحقول الأساسية المطلوبة');
      }

      if (!formData.phone || !formData.nationality || !formData.profession || !formData.bio) {
        throw new Error('يرجى ملء جميع الحقول المطلوبة: رقم الهاتف، الجنسية، المهنة، والنبذة الشخصية');
      }

      if (formData.password.length < 6) {
        throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      }

      if (formData.bio.length < 10) {
        throw new Error('النبذة الشخصية يجب أن تكون 10 أحرف على الأقل');
      }

      if (formData.age < 18 || formData.age > 80) {
        throw new Error('العمر يجب أن يكون بين 18 و 80 سنة');
      }

      // إنشاء المستخدم
      const response = await adminUsersService.createUser(formData);

      if (response.success) {
        showSuccess(
          'تم إنشاء المستخدم بنجاح',
          `تم إنشاء حساب ${formData.firstName} ${formData.lastName} بنجاح مع حساب مصادقة كامل في Supabase Auth. يمكنه الآن تسجيل الدخول للموقع باستخدام الإيميل وكلمة المرور المحددة.`
        );
        onUserAdded();
        resetForm();
      } else {
        const errorMessage = response.error || 'حدث خطأ في إنشاء المستخدم';
        showError('فشل في إنشاء المستخدم', errorMessage);
        setError(errorMessage);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'حدث خطأ غير متوقع';
      showError('خطأ في البيانات', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
      age: 18,
      gender: 'male',
      city: '',
      nationality: 'المملكة العربية السعودية',
      profession: '',
      bio: '',
      // حقول اختيارية - مطابقة تماماً لصفحة التسجيل
      education: '',
      religiousCommitment: 'committed',
      height: undefined,
      weight: undefined,
      educationLevel: undefined,
      financialStatus: undefined,
      religiosityLevel: undefined,
      prayerCommitment: undefined,
      smoking: undefined,
      beard: undefined,
      hijab: undefined
    });
    setError(null);
    setShowPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 modal-backdrop backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={handleBackdropClick}
    >
      <div className="modal-container rounded-lg max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col"
           onClick={(e) => e.stopPropagation()}>
        {/* رأس النافذة */}
        <div className="modal-header flex items-center justify-between p-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold modal-text-primary">إضافة مستخدم جديد</h2>
              <p className="text-sm modal-text-secondary">إنشاء حساب مستخدم جديد في النظام</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="modal-text-tertiary hover:modal-text-primary transition-colors"
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
            {/* المعلومات الأساسية */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">المعلومات الأساسية</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الاسم الأول *
                  </label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="أدخل الاسم الأول"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الاسم الأخير *
                  </label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="أدخل الاسم الأخير"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    البريد الإلكتروني *
                  </label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="example@domain.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    كلمة المرور *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="w-full pr-10 pl-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="أدخل كلمة المرور"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رقم الهاتف *
                  </label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+966xxxxxxxxx"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    العمر *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="number"
                      value={formData.age}
                      onChange={(e) => handleInputChange('age', parseInt(e.target.value))}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="18"
                      max="100"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* المعلومات الشخصية */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">المعلومات الشخصية</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الجنس *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الحالة الاجتماعية *
                  </label>
                  <select
                    value={formData.marital_status}
                    onChange={(e) => handleInputChange('marital_status', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="single">أعزب</option>
                    <option value="divorced">مطلق</option>
                    <option value="widowed">أرمل</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المدينة *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="أدخل المدينة"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الجنسية *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <select
                      value={formData.nationality}
                      onChange={(e) => handleInputChange('nationality', e.target.value)}
                      className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">اختر الجنسية</option>
                      {getCountriesForLanguage('ar').map((country) => (
                        <option key={country.code} value={country.displayName}>
                          {country.flag} {country.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* المعلومات المهنية والشخصية */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">المعلومات المهنية</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المهنة *
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={formData.profession}
                      onChange={(e) => handleInputChange('profession', e.target.value)}
                      className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="أدخل المهنة"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المستوى التعليمي
                  </label>
                  <div className="relative">
                    <GraduationCap className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <select
                      value={formData.educationLevel || ''}
                      onChange={(e) => handleInputChange('educationLevel', e.target.value || undefined)}
                      className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">اختر المستوى التعليمي</option>
                      <option value="primary">ابتدائي</option>
                      <option value="secondary">ثانوي</option>
                      <option value="diploma">دبلوم</option>
                      <option value="bachelor">بكالوريوس</option>
                      <option value="master">ماجستير</option>
                      <option value="phd">دكتوراه</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* نبذة شخصية */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">نبذة شخصية</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نبذة عن نفسك *
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="اكتب نبذة مختصرة عن نفسك (10 أحرف على الأقل)"
                  rows={4}
                  minLength={10}
                  maxLength={500}
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  {formData.bio.length}/500 حرف
                </p>
              </div>
            </div>

            {/* المعلومات الدينية */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">المعلومات الدينية</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    مستوى الالتزام الديني
                  </label>
                  <div className="relative">
                    <Church className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <select
                      value={formData.religiousCommitment || ''}
                      onChange={(e) => handleInputChange('religiousCommitment', e.target.value || undefined)}
                      className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">اختر مستوى الالتزام</option>
                      <option value="committed">ملتزم</option>
                      <option value="conservative">محافظ</option>
                      <option value="prefer_not_say">أفضل عدم الذكر</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    مستوى التدين
                  </label>
                  <select
                    value={formData.religiosityLevel || ''}
                    onChange={(e) => handleInputChange('religiosityLevel', e.target.value || undefined)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">اختر مستوى التدين</option>
                    <option value="not_religious">غير متدين</option>
                    <option value="slightly_religious">متدين إلى حد ما</option>
                    <option value="religious">متدين</option>
                    <option value="very_religious">متدين جداً</option>
                    <option value="prefer_not_say">أفضل عدم الإجابة</option>
                  </select>
                </div>
              </div>
            </div>

            {/* المعلومات الجسدية */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">المعلومات الجسدية (اختيارية)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الطول (سم)
                  </label>
                  <input
                    type="number"
                    value={formData.height || ''}
                    onChange={(e) => handleInputChange('height', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="مثال: 170"
                    min="120"
                    max="250"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الوزن (كغ)
                  </label>
                  <input
                    type="number"
                    value={formData.weight || ''}
                    onChange={(e) => handleInputChange('weight', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="مثال: 70"
                    min="30"
                    max="300"
                  />
                </div>
              </div>
            </div>

            {/* المعلومات الاجتماعية */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">المعلومات الاجتماعية (اختيارية)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الحالة المالية
                  </label>
                  <select
                    value={formData.financialStatus || ''}
                    onChange={(e) => handleInputChange('financialStatus', e.target.value || undefined)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">اختر الحالة المالية</option>
                    <option value="poor">ضعيفة</option>
                    <option value="below_average">أقل من المتوسط</option>
                    <option value="average">متوسطة</option>
                    <option value="above_average">أعلى من المتوسط</option>
                    <option value="wealthy">ميسورة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    التدخين
                  </label>
                  <select
                    value={formData.smoking || ''}
                    onChange={(e) => handleInputChange('smoking', e.target.value || undefined)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">اختر حالة التدخين</option>
                    <option value="yes">نعم</option>
                    <option value="no">لا</option>
                  </select>
                </div>
              </div>
            </div>

            {/* حقول خاصة بالجنس */}
            {formData.gender === 'male' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">معلومات إضافية للرجال</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      اللحية
                    </label>
                    <select
                      value={formData.beard || ''}
                      onChange={(e) => handleInputChange('beard', e.target.value || undefined)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">اختر حالة اللحية</option>
                      <option value="yes">نعم</option>
                      <option value="no">لا</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {formData.gender === 'female' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">معلومات إضافية للنساء</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الحجاب
                    </label>
                    <select
                      value={formData.hijab || ''}
                      onChange={(e) => handleInputChange('hijab', e.target.value || undefined)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">اختر حالة الحجاب</option>
                      <option value="no_hijab">بدون حجاب</option>
                      <option value="hijab">حجاب</option>
                      <option value="niqab">نقاب</option>
                      <option value="prefer_not_say">أفضل عدم الذكر</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
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
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الإنشاء...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                إنشاء المستخدم
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddUserModal;
