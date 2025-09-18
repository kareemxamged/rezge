import { supabase } from './supabase';

// أنواع البيانات
export interface ProfileImage {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  is_primary: boolean;
  is_visible: boolean;
  uploaded_at: string;
  updated_at: string;
}

export interface UploadResult {
  success: boolean;
  image?: ProfileImage;
  error?: string;
  url?: string;
}

export interface DeleteResult {
  success: boolean;
  error?: string;
}

export interface VisibilityResult {
  success: boolean;
  error?: string;
}

// إعدادات الخدمة
const PROFILE_IMAGE_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  MAX_WIDTH: 1024,
  MAX_HEIGHT: 1024,
  QUALITY: 0.8,
  BUCKET_NAME: 'profile-images'
};

class ProfileImageService {
  
  /**
   * رفع صورة شخصية جديدة
   */
  async uploadProfileImage(
    userId: string, 
    file: File, 
    isPrimary: boolean = true
  ): Promise<UploadResult> {
    try {
      // التحقق من صحة الملف
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      // ضغط الصورة إذا لزم الأمر
      const processedFile = await this.processImage(file);
      
      // إنشاء مسار فريد للملف
      const fileName = this.generateFileName(userId, processedFile.name);
      const filePath = `${userId}/${fileName}`;

      // رفع الملف إلى Storage
      const { error: uploadError } = await supabase.storage
        .from(PROFILE_IMAGE_CONFIG.BUCKET_NAME)
        .upload(filePath, processedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('خطأ في رفع الصورة:', uploadError);
        return { success: false, error: 'فشل في رفع الصورة' };
      }

      // الحصول على signed URL للصورة (صالح لمدة سنة)
      console.log('إنشاء signed URL للمسار:', filePath);
      const { data: urlData, error: urlError } = await supabase.storage
        .from(PROFILE_IMAGE_CONFIG.BUCKET_NAME)
        .createSignedUrl(filePath, 31536000); // سنة واحدة

      if (urlError) {
        console.error('خطأ في إنشاء URL للصورة:', urlError);
        // حذف الملف من Storage في حالة فشل إنشاء URL
        await supabase.storage
          .from(PROFILE_IMAGE_CONFIG.BUCKET_NAME)
          .remove([filePath]);
        return { success: false, error: 'فشل في إنشاء رابط الصورة' };
      }

      console.log('تم إنشاء signed URL بنجاح:', urlData.signedUrl);

      // حفظ معلومات الصورة في قاعدة البيانات مع المسار الأصلي
      const imageData = {
        user_id: userId,
        file_name: fileName,
        file_path: filePath, // حفظ المسار الأصلي
        storage_path: filePath, // نفس المسار للتوافق
        file_size: processedFile.size,
        mime_type: processedFile.type,
        is_primary: isPrimary,
        is_visible: true
      };

      const { data: dbData, error: dbError } = await supabase
        .from('profile_images')
        .insert(imageData)
        .select()
        .single();

      if (dbError) {
        // حذف الملف من Storage في حالة فشل حفظ البيانات
        await supabase.storage
          .from(PROFILE_IMAGE_CONFIG.BUCKET_NAME)
          .remove([filePath]);

        console.error('خطأ في حفظ بيانات الصورة:', dbError);
        return { success: false, error: 'فشل في حفظ بيانات الصورة' };
      }

      // تحديث جدول users بالمسار الأصلي
      await this.updateUserProfileImage(userId, filePath, true);

      // إنشاء signed URL للإرجاع
      const imageWithUrl = await this.getImageWithSignedUrl(dbData);

      return {
        success: true,
        image: imageWithUrl,
        url: imageWithUrl.file_path
      };

    } catch (error) {
      console.error('خطأ عام في رفع الصورة:', error);
      return { success: false, error: 'حدث خطأ غير متوقع' };
    }
  }

  /**
   * حذف الصورة الشخصية
   */
  async deleteProfileImage(userId: string, imageId?: string): Promise<DeleteResult> {
    try {
      let imagesToDelete;

      if (imageId) {
        // حذف صورة محددة
        const { data, error } = await supabase
          .from('profile_images')
          .select('*')
          .eq('id', imageId)
          .eq('user_id', userId)
          .single();

        if (error || !data) {
          return { success: false, error: 'الصورة غير موجودة' };
        }
        imagesToDelete = [data];
      } else {
        // حذف جميع الصور
        const { data, error } = await supabase
          .from('profile_images')
          .select('*')
          .eq('user_id', userId);

        if (error) {
          return { success: false, error: 'فشل في الحصول على الصور' };
        }
        imagesToDelete = data || [];
      }

      // حذف الملفات من Storage
      const filePaths = imagesToDelete.map(img => img.storage_path || img.file_path);
      if (filePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from(PROFILE_IMAGE_CONFIG.BUCKET_NAME)
          .remove(filePaths);

        if (storageError) {
          console.error('خطأ في حذف الملفات من Storage:', storageError);
        }
      }

      // حذف البيانات من قاعدة البيانات
      const deleteQuery = supabase
        .from('profile_images')
        .delete()
        .eq('user_id', userId);

      if (imageId) {
        deleteQuery.eq('id', imageId);
      }

      const { error: dbError } = await deleteQuery;

      if (dbError) {
        console.error('خطأ في حذف بيانات الصورة:', dbError);
        return { success: false, error: 'فشل في حذف بيانات الصورة' };
      }

      // تحديث جدول users
      await this.updateUserProfileImage(userId, null, false);

      return { success: true };

    } catch (error) {
      console.error('خطأ عام في حذف الصورة:', error);
      return { success: false, error: 'حدث خطأ غير متوقع' };
    }
  }

  /**
   * تغيير إعدادات الخصوصية للصورة
   */
  async updateImageVisibility(userId: string, isVisible: boolean): Promise<VisibilityResult> {
    try {
      // تحديث جدول profile_images
      const { error: imageError } = await supabase
        .from('profile_images')
        .update({ is_visible: isVisible, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (imageError) {
        console.error('خطأ في تحديث إعدادات الصورة:', imageError);
        return { success: false, error: 'فشل في تحديث إعدادات الصورة' };
      }

      // تحديث جدول users
      const { error: userError } = await supabase
        .from('users')
        .update({ profile_image_visible: isVisible, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (userError) {
        console.error('خطأ في تحديث إعدادات المستخدم:', userError);
        return { success: false, error: 'فشل في تحديث إعدادات المستخدم' };
      }

      return { success: true };

    } catch (error) {
      console.error('خطأ عام في تحديث إعدادات الخصوصية:', error);
      return { success: false, error: 'حدث خطأ غير متوقع' };
    }
  }

  /**
   * الحصول على الصورة الأساسية للمستخدم
   */
  async getUserPrimaryImage(userId: string): Promise<ProfileImage | null> {
    try {
      console.log('getUserPrimaryImage called for userId:', userId);

      const { data, error } = await supabase
        .from('profile_images')
        .select('*')
        .eq('user_id', userId)
        .eq('is_primary', true)
        .maybeSingle();

      console.log('Profile image query result - data:', !!data, 'error:', error);

      if (error) {
        console.error('خطأ في الحصول على الصورة الأساسية:', error);
        return null;
      }

      if (data) {
        console.log('Profile image found, getting signed URL...');
        // الحصول على signed URL للصورة
        const imageWithUrl = await this.getImageWithSignedUrl(data);
        console.log('Image with signed URL:', !!imageWithUrl, imageWithUrl?.file_path);
        return imageWithUrl;
      }

      console.log('No profile image found for user:', userId);
      return null;
    } catch (error) {
      console.error('خطأ عام في الحصول على الصورة الأساسية:', error);
      return null;
    }
  }

  /**
   * الحصول على signed URL للصورة
   */
  private async getImageWithSignedUrl(image: ProfileImage): Promise<ProfileImage> {
    try {
      console.log('getImageWithSignedUrl called with image:', image.file_path, 'storage_path:', (image as any).storage_path);

      // إذا كان file_path يحتوي على signed URL صالح، استخدمه مباشرة
      if (image.file_path && image.file_path.startsWith('http')) {
        console.log('Image already has HTTP URL, checking validity...');
        // تحقق من صلاحية الـ token (إذا كان يحتوي على exp)
        try {
          const url = new URL(image.file_path);
          const token = url.searchParams.get('token');
          if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp && payload.exp > now) {
              console.log('Existing signed URL is still valid');
              return image; // الـ token ما زال صالحاً
            } else {
              console.log('Existing signed URL has expired');
            }
          }
        } catch (e) {
          console.log('Failed to check token validity, creating new one');
          // إذا فشل في فحص الـ token، أنشئ واحد جديد
        }
      }

      // استخدم storage_path إذا كان متاحاً، وإلا استخدم file_path
      const storagePath = (image as any).storage_path || image.file_path;

      console.log('إنشاء signed URL جديد للمسار:', storagePath);
      const { data: urlData, error: urlError } = await supabase.storage
        .from(PROFILE_IMAGE_CONFIG.BUCKET_NAME)
        .createSignedUrl(storagePath, 3600); // صالح لمدة ساعة

      console.log('Signed URL creation result - data:', !!urlData, 'error:', urlError);

      if (urlError || !urlData) {
        console.error('خطأ في إنشاء signed URL:', urlError);
        return image;
      }

      console.log('تم إنشاء signed URL جديد بنجاح:', urlData.signedUrl);
      // إرجاع الصورة مع URL محدث
      return {
        ...image,
        file_path: urlData.signedUrl
      };
    } catch (error) {
      console.error('خطأ في الحصول على signed URL:', error);
      return image;
    }
  }

  /**
   * الحصول على جميع صور المستخدم
   */
  async getUserImages(userId: string): Promise<ProfileImage[]> {
    try {
      const { data, error } = await supabase
        .from('profile_images')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('خطأ في الحصول على صور المستخدم:', error);
        return [];
      }

      if (data && data.length > 0) {
        // الحصول على signed URLs لجميع الصور
        const imagesWithUrls = await Promise.all(
          data.map(image => this.getImageWithSignedUrl(image))
        );
        return imagesWithUrls;
      }

      return [];
    } catch (error) {
      console.error('خطأ عام في الحصول على الصور:', error);
      return [];
    }
  }

  /**
   * التحقق من صحة الملف
   */
  private validateFile(file: File): { isValid: boolean; error?: string } {
    // التحقق من نوع الملف
    if (!PROFILE_IMAGE_CONFIG.ALLOWED_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: 'نوع الملف غير مدعوم. يُسمح فقط بـ JPEG, PNG, WebP'
      };
    }

    // التحقق من حجم الملف
    if (file.size > PROFILE_IMAGE_CONFIG.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `حجم الملف كبير جداً. الحد الأقصى ${PROFILE_IMAGE_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`
      };
    }

    return { isValid: true };
  }

  /**
   * معالجة وضغط الصورة
   */
  private async processImage(file: File): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // حساب الأبعاد الجديدة مع الحفاظ على النسبة
        let { width, height } = this.calculateDimensions(
          img.width, 
          img.height, 
          PROFILE_IMAGE_CONFIG.MAX_WIDTH, 
          PROFILE_IMAGE_CONFIG.MAX_HEIGHT
        );

        canvas.width = width;
        canvas.height = height;

        // رسم الصورة المضغوطة
        ctx?.drawImage(img, 0, 0, width, height);

        // تحويل إلى Blob
        canvas.toBlob((blob) => {
          if (blob) {
            const processedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(processedFile);
          } else {
            resolve(file); // في حالة فشل المعالجة، إرجاع الملف الأصلي
          }
        }, file.type, PROFILE_IMAGE_CONFIG.QUALITY);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * حساب الأبعاد الجديدة مع الحفاظ على النسبة
   */
  private calculateDimensions(
    originalWidth: number, 
    originalHeight: number, 
    maxWidth: number, 
    maxHeight: number
  ): { width: number; height: number } {
    let width = originalWidth;
    let height = originalHeight;

    if (width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }

    if (height > maxHeight) {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }

    return { width: Math.round(width), height: Math.round(height) };
  }

  /**
   * إنشاء اسم ملف فريد
   */
  private generateFileName(userId: string, originalName: string): string {
    const timestamp = Date.now();
    const extension = originalName.split('.').pop();
    return `profile_${userId}_${timestamp}.${extension}`;
  }

  /**
   * تحديث معلومات الصورة في جدول users
   */
  private async updateUserProfileImage(
    userId: string, 
    imageUrl: string | null, 
    hasImage: boolean
  ): Promise<void> {
    try {
      await supabase
        .from('users')
        .update({
          profile_image_url: imageUrl,
          has_profile_image: hasImage,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
    } catch (error) {
      console.error('خطأ في تحديث معلومات المستخدم:', error);
    }
  }
  /**
   * إنشاء signed URL لمسار صورة (دالة عامة)
   */
  async createSignedUrlForPath(imagePath: string): Promise<string | null> {
    try {
      if (!imagePath) return null;

      // إذا كان المسار يحتوي على signed URL صالح، استخدمه مباشرة
      if (imagePath.startsWith('http')) {
        return imagePath;
      }

      const { data: urlData, error: urlError } = await supabase.storage
        .from(PROFILE_IMAGE_CONFIG.BUCKET_NAME)
        .createSignedUrl(imagePath, 3600); // صالح لمدة ساعة

      if (urlError || !urlData) {
        console.error('خطأ في إنشاء signed URL للمسار:', imagePath, urlError);
        return null;
      }

      return urlData.signedUrl;
    } catch (error) {
      console.error('خطأ عام في إنشاء signed URL:', error);
      return null;
    }
  }
}

// تصدير instance واحد من الخدمة
export const profileImageService = new ProfileImageService();
export default profileImageService;


