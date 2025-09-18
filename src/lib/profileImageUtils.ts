/**
 * دوال مساعدة للتعامل مع الصور الشخصية
 */

/**
 * الحصول على URL كامل للصورة الشخصية
 * @param profileImageUrl - مسار الصورة من قاعدة البيانات
 * @returns URL كامل للصورة أو null إذا لم تكن متوفرة
 */
export const getFullProfileImageUrl = (profileImageUrl?: string | null): string | null => {
  if (!profileImageUrl) {
    return null;
  }

  // إذا كان المسار يبدأ بـ http أو /images/ فهو مسار كامل
  if (profileImageUrl.startsWith('http') || profileImageUrl.startsWith('/images/')) {
    return profileImageUrl;
  }

  // وإلا أضف مسار Supabase Storage
  return `https://sbtzngewizgeqzfbhfjy.supabase.co/storage/v1/object/public/profile-images/${profileImageUrl}`;
};

/**
 * التحقق من إمكانية عرض الصورة الشخصية
 * @param user - بيانات المستخدم
 * @returns true إذا كان يمكن عرض الصورة
 */
export const canShowProfileImage = (user: {
  profile_image_url?: string | null;
  profile_image_visible?: boolean;
  has_profile_image?: boolean;
}): boolean => {
  return !!(
    user.profile_image_url && 
    user.profile_image_visible !== false
  );
};

/**
 * الحصول على URL الصورة الشخصية مع التحقق من الرؤية
 * @param user - بيانات المستخدم
 * @returns URL الصورة أو null
 */
export const getVisibleProfileImageUrl = (user: {
  profile_image_url?: string | null;
  profile_image_visible?: boolean;
  has_profile_image?: boolean;
}): string | null => {
  if (!canShowProfileImage(user)) {
    return null;
  }

  return getFullProfileImageUrl(user.profile_image_url);
};

/**
 * معالج خطأ تحميل الصورة - يخفي الصورة ويظهر الأيقونة الافتراضية
 * @param event - حدث خطأ تحميل الصورة
 */
export const handleImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
  const target = event.currentTarget;
  target.style.display = 'none';
  
  // البحث عن العنصر الاحتياطي وإظهاره
  const parent = target.parentElement;
  if (parent) {
    const fallback = parent.querySelector('.user-icon-fallback, .fallback-icon');
    if (fallback) {
      (fallback as HTMLElement).style.display = 'block';
    }
  }
};
