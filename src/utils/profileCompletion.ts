/**
 * دوال فحص اكتمال الملف الشخصي
 * تحدد ما إذا كان الملف الشخصي مكتمل بما يكفي للظهور في نتائج البحث
 *
 * المعايير المطلوبة للملف المكتمل (5 حقول فقط):
 * 1. العمر (age)
 * 2. الحالة الاجتماعية (marital_status)
 * 3. الجنسية (nationality)
 * 4. نبذة عن نفسك (bio)
 * 5. المهنة (profession)
 */

export interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  age?: number;
  gender?: string;
  city?: string;
  nationality?: string;
  marital_status?: string;
  education?: string;
  education_level?: string;
  profession?: string;
  work_field?: string;
  religious_commitment?: string;
  religiosity_level?: string;
  prayer_commitment?: string;
  bio?: string;
  looking_for?: string;
  verified?: boolean;
  status?: string;
  [key: string]: any;
}

/**
 * فحص ما إذا كان الحقل موجود وليس فارغ
 */
const isFieldValid = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return !isNaN(value) && value > 0;
  return true;
};

/**
 * فحص البيانات المطلوبة الأساسية (5 حقول فقط)
 */
const hasRequiredFields = (profile: UserProfile): boolean => {
  const requiredFields = [
    'age',              // العمر
    'marital_status',   // الحالة الاجتماعية
    'nationality',      // الجنسية
    'bio',              // نبذة عن نفسك
    'profession'        // المهنة (مجال العمل)
  ];

  return requiredFields.every(field => isFieldValid(profile[field]));
};

/**
 * فحص ما إذا كان الملف الشخصي مكتمل
 * @param profile بيانات المستخدم
 * @returns true إذا كان الملف مكتمل، false إذا لم يكن
 */
export const isProfileComplete = (profile: UserProfile): boolean => {
  // التحقق من الحالة الأساسية للحساب
  if (!profile.verified || profile.status !== 'active') {
    return false;
  }

  // فحص الحقول المطلوبة الخمسة فقط
  return hasRequiredFields(profile);
};

/**
 * الحصول على تفاصيل ما ينقص في الملف الشخصي
 * @param profile بيانات المستخدم
 * @returns كائن يحتوي على تفاصيل النقص
 */
export const getProfileCompletionDetails = (profile: UserProfile) => {
  const details = {
    isComplete: false,
    missingFields: [] as string[],
    completionPercentage: 0
  };

  // فحص الحقول المطلوبة الخمسة
  const requiredFields = [
    { key: 'age', name: 'العمر' },
    { key: 'marital_status', name: 'الحالة الاجتماعية' },
    { key: 'nationality', name: 'الجنسية' },
    { key: 'bio', name: 'نبذة عن نفسك' },
    { key: 'profession', name: 'المهنة' }
  ];

  requiredFields.forEach(field => {
    if (!isFieldValid(profile[field.key])) {
      details.missingFields.push(field.name);
    }
  });

  // حساب نسبة الاكتمال
  const totalRequiredFields = 5; // الحقول المطلوبة الخمسة
  const missingFieldsCount = details.missingFields.length;

  details.completionPercentage = Math.round(((totalRequiredFields - missingFieldsCount) / totalRequiredFields) * 100);
  details.isComplete = missingFieldsCount === 0 && (profile.verified === true) && (profile.status === 'active');

  return details;
};

/**
 * فلترة قائمة المستخدمين لإظهار المكتملين فقط
 * @param users قائمة المستخدمين
 * @returns قائمة المستخدمين المكتملين فقط
 */
export const filterCompleteProfiles = (users: UserProfile[]): UserProfile[] => {
  return users.filter(user => isProfileComplete(user));
};

/**
 * إحصائيات اكتمال الملفات الشخصية
 * @param users قائمة المستخدمين
 * @returns إحصائيات مفصلة
 */
export const getProfileCompletionStats = (users: UserProfile[]) => {
  const total = users.length;
  const complete = users.filter(user => isProfileComplete(user)).length;
  const incomplete = total - complete;

  return {
    total,
    complete,
    incomplete,
    completionRate: total > 0 ? Math.round((complete / total) * 100) : 0,
    requiredFields: ['العمر', 'الحالة الاجتماعية', 'الجنسية', 'نبذة عن نفسك', 'المهنة']
  };
};
