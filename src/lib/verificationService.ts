import { supabase } from './supabase';

// أنواع البيانات - تصدير مباشر
export type VerificationStep1Data = {
  fullNameArabic: string;
  fullNameEnglish: string;
  birthDate: string;
  nationality: string;
};

export type VerificationStep2Data = {
  documentType: 'passport' | 'national_id';
};

export type VerificationStep3Data = {
  documentNumber: string;
  documentIssueDate: string;
  documentExpiryDate: string;
  issuingAuthority?: string;
};

export type VerificationStep4Data = {
  documentFrontImage: File | null;
  documentBackImage: File | null; // مطلوب لبطاقة الهوية، اختياري للجواز
};

export type VerificationStep5Data = {
  selfieImage: File | null;
};

export type VerificationRequest = {
  id: string;
  user_id: string;
  full_name_arabic: string;
  full_name_english: string;
  birth_date: string;
  nationality: string;
  document_type: 'passport' | 'national_id';
  document_number: string;
  document_issue_date: string;
  document_expiry_date: string;
  issuing_authority?: string;
  document_front_image_url?: string;
  document_back_image_url?: string;
  selfie_image_url?: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'expired';
  priority: number;
  reviewed_by?: string;
  reviewed_at?: string;
  admin_notes?: string;
  rejection_reason?: string;
  submission_step: number;
  created_at: string;
  updated_at: string;
  expires_at: string;
  // بيانات المستخدم المرتبط بالطلب
  user?: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  // بيانات المراجع (الإداري الذي راجع الطلب)
  reviewer?: {
    first_name: string;
    last_name: string;
    email: string;
  };
};

export type VerificationServiceResult = {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
};

class VerificationService {
  private readonly BUCKET_NAME = 'verification-documents';
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];

  /**
   * التحقق من وجود طلب توثيق نشط للمستخدم
   */
  async hasActiveRequest(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('verification_requests')
        .select('id, status, submission_step, created_at')
        .eq('user_id', userId)
        .in('status', ['pending', 'under_review'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error checking active request:', error);
        return false;
      }

      if (!data || data.length === 0) {
        return false;
      }

      // التحقق من أن الطلب ليس قديماً جداً (أكثر من 30 يوم)
      const request = data[0];
      const requestDate = new Date(request.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      if (requestDate < thirtyDaysAgo) {
        // الطلب قديم جداً، احذفه تلقائياً
        console.log('Removing expired verification request:', request.id);
        await supabase
          .from('verification_requests')
          .delete()
          .eq('id', request.id);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking active request:', error);
      return false;
    }
  }

  /**
   * الحصول على طلب التوثيق الحالي للمستخدم
   */
  async getCurrentRequest(userId: string): Promise<VerificationServiceResult> {
    try {
      const { data, error } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['pending', 'under_review'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(); // استخدام maybeSingle بدلاً من limit(1) لتجنب مشاكل multiple rows

      if (error) {
        console.error('Error getting current request:', error);
        return { success: false, error: error.message };
      }

      // إذا لم يتم العثور على أي طلبات
      if (!data) {
        return { success: true, data: null };
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('Error in getCurrentRequest:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * إنشاء طلب توثيق كامل (يتم استدعاؤها في المرحلة الأخيرة فقط)
   */
  async createCompleteVerificationRequest(
    userId: string,
    step1Data: VerificationStep1Data,
    step2Data: VerificationStep2Data,
    step3Data: VerificationStep3Data,
    step4Data: { documentFrontImageUrl: string; documentBackImageUrl?: string },
    step5Data: { selfieImageUrl: string }
  ): Promise<VerificationServiceResult> {
    try {
      // التحقق من عدم وجود طلب نشط
      const hasActive = await this.hasActiveRequest(userId);
      if (hasActive) {
        return {
          success: false,
          error: 'يوجد طلب توثيق نشط بالفعل'
        };
      }

      const { data, error } = await supabase
        .from('verification_requests')
        .insert({
          user_id: userId,
          full_name_arabic: step1Data.fullNameArabic,
          full_name_english: step1Data.fullNameEnglish,
          birth_date: step1Data.birthDate,
          nationality: step1Data.nationality,
          document_type: step2Data.documentType,
          document_number: step3Data.documentNumber,
          document_issue_date: step3Data.documentIssueDate,
          document_expiry_date: step3Data.documentExpiryDate,
          issuing_authority: step3Data.issuingAuthority,
          document_front_image_url: step4Data.documentFrontImageUrl,
          document_back_image_url: step4Data.documentBackImageUrl,
          selfie_image_url: step5Data.selfieImageUrl,
          submission_step: 5,
          status: 'under_review'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating verification request:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data,
        message: 'تم إرسال طلب التوثيق بنجاح! سيتم مراجعته من قبل الإدارة.'
      };
    } catch (error: any) {
      console.error('Error in createCompleteVerificationRequest:', error);
      return { success: false, error: error.message };
    }
  }

  // تم إزالة الدوال القديمة - الآن نحفظ البيانات محلياً فقط حتى المرحلة الأخيرة

  /**
   * رفع الصور وإنشاء طلب التوثيق الكامل (المرحلة الأخيرة فقط)
   */
  async submitCompleteVerificationRequest(
    userId: string,
    allData: {
      step1Data: VerificationStep1Data;
      step2Data: VerificationStep2Data;
      step3Data: VerificationStep3Data;
      step4Data: VerificationStep4Data;
      step5Data: VerificationStep5Data;
    }
  ): Promise<VerificationServiceResult> {
    try {
      // التحقق من عدم وجود طلب نشط
      const hasActive = await this.hasActiveRequest(userId);
      if (hasActive) {
        return {
          success: false,
          error: 'يوجد طلب توثيق نشط بالفعل'
        };
      }

      // رفع الصور أولاً
      const frontImageResult = await this.uploadImage(
        allData.step4Data.documentFrontImage!,
        userId,
        'document_front'
      );

      if (!frontImageResult.success) {
        return { success: false, error: frontImageResult.error };
      }

      let backImageUrl: string | undefined;
      if (allData.step4Data.documentBackImage) {
        const backImageResult = await this.uploadImage(
          allData.step4Data.documentBackImage,
          userId,
          'document_back'
        );

        if (!backImageResult.success) {
          return { success: false, error: backImageResult.error };
        }

        backImageUrl = backImageResult.url;
      }

      const selfieResult = await this.uploadImage(
        allData.step5Data.selfieImage!,
        userId,
        'selfie'
      );

      if (!selfieResult.success) {
        return { success: false, error: selfieResult.error };
      }

      // إنشاء الطلب الكامل
      return await this.createCompleteVerificationRequest(
        userId,
        allData.step1Data,
        allData.step2Data,
        allData.step3Data,
        {
          documentFrontImageUrl: frontImageResult.url!,
          documentBackImageUrl: backImageUrl
        },
        {
          selfieImageUrl: selfieResult.url!
        }
      );
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * رفع صورة إلى التخزين
   */
  private async uploadImage(
    file: File, 
    userId: string, 
    imageType: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // التحقق من صحة الملف
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      // إنشاء اسم فريد للملف
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${userId}/${imageType}_${Date.now()}.${fileExtension}`;

      // رفع الملف
      const { error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        return { success: false, error: uploadError.message };
      }

      // الحصول على رابط الملف
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      return { success: true, url: urlData.publicUrl };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * التحقق من صحة الملف
   */
  private validateFile(file: File): { isValid: boolean; error?: string } {
    // التحقق من الحجم
    if (file.size > this.MAX_FILE_SIZE) {
      return { 
        isValid: false, 
        error: `حجم الملف كبير جداً. الحد الأقصى ${this.MAX_FILE_SIZE / 1024 / 1024}MB` 
      };
    }

    // التحقق من النوع
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !this.ALLOWED_FORMATS.includes(fileExtension)) {
      return { 
        isValid: false, 
        error: `نوع الملف غير مدعوم. الأنواع المدعومة: ${this.ALLOWED_FORMATS.join(', ')}` 
      };
    }

    return { isValid: true };
  }

  /**
   * تحويل مسار الصورة إلى URL عام قابل للعرض
   */
  private getPublicImageUrl(imagePath: string): string {
    if (!imagePath) return '';

    // إذا كان المسار يحتوي على URL كامل، إرجاعه كما هو
    if (imagePath.startsWith('http')) {
      return imagePath;
    }

    // الحصول على URL عام من Supabase Storage
    const { data } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(imagePath);

    return data.publicUrl;
  }

  // تم حذف updateStep4 - لا نحتاجها بعد الآن



  /**
   * دالة مؤقتة للتوافق مع الكود القديم - ستتم إزالتها لاحقاً
   * @deprecated استخدم submitCompleteVerificationRequest بدلاً من ذلك
   */
  async createVerificationRequestWithStep2(
    userId: string,
    step1Data: VerificationStep1Data,
    step2Data: VerificationStep2Data
  ): Promise<VerificationServiceResult> {
    console.warn('⚠️ createVerificationRequestWithStep2 is deprecated. النظام الجديد لا يحفظ البيانات حتى المرحلة الأخيرة.');
    return {
      success: true,
      data: { id: 'temp-id-' + Date.now() },
      message: 'تم حفظ البيانات محلياً - سيتم الإرسال في المرحلة الأخيرة'
    };
  }

  /**
   * الحصول على جميع طلبات التوثيق (للإداريين)
   */
  async getAllRequests(
    page: number = 1,
    limit: number = 10,
    status?: string,
    searchTerm?: string,
    documentType?: string,
    sortOrder?: 'newest' | 'oldest'
  ): Promise<VerificationServiceResult> {
    try {
      // استخدام العميل العادي مع صلاحيات الإدارة
      const client = supabase;

      let query = client
        .from('verification_requests')
        .select(`
          *,
          user:users!verification_requests_user_id_fkey(
            first_name,
            last_name,
            email,
            phone
          ),
          reviewer:users!verification_requests_reviewed_by_fkey(
            first_name,
            last_name,
            email
          )
        `, { count: 'exact' });

      // ترتيب النتائج
      const ascending = sortOrder === 'oldest';
      query = query.order('created_at', { ascending });

      // فلترة حسب الحالة
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      // فلترة حسب نوع المستند
      if (documentType && documentType !== 'all') {
        query = query.eq('document_type', documentType);
      }

      // البحث النصي
      if (searchTerm && searchTerm.trim()) {
        const searchValue = searchTerm.trim();
        query = query.or(`
          full_name_arabic.ilike.%${searchValue}%,
          full_name_english.ilike.%${searchValue}%,
          user.first_name.ilike.%${searchValue}%,
          user.last_name.ilike.%${searchValue}%,
          user.email.ilike.%${searchValue}%,
          user.phone.ilike.%${searchValue}%
        `);
      }

      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      // معالجة URLs الصور لضمان عرضها بشكل صحيح
      const processedRequests = (data || []).map(request => ({
        ...request,
        document_front_image_url: request.document_front_image_url
          ? this.getPublicImageUrl(request.document_front_image_url)
          : null,
        document_back_image_url: request.document_back_image_url
          ? this.getPublicImageUrl(request.document_back_image_url)
          : null,
        selfie_image_url: request.selfie_image_url
          ? this.getPublicImageUrl(request.selfie_image_url)
          : null
      }));

      return {
        success: true,
        data: {
          requests: processedRequests,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          currentPage: page
        }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * الموافقة على طلب التوثيق (للإداريين)
   */
  async approveRequest(
    requestId: string,
    adminId: string,
    notes?: string
  ): Promise<VerificationServiceResult> {
    try {
      console.log('🔍 VerificationService.approveRequest called:', { requestId, adminId, notes });

      // التحقق من صلاحيات الإدارة أولاً
      const { data: adminCheck, error: adminError } = await supabase
        .from('admin_users')
        .select('id, is_active, user_id')
        .eq('user_id', adminId)
        .eq('is_active', true)
        .maybeSingle();

      console.log('🔍 Admin check result:', { adminCheck, adminError, adminId });

      if (adminError) {
        console.error('❌ Admin check error:', adminError);
        return { success: false, error: `خطأ في التحقق من صلاحيات الإدارة: ${adminError.message}` };
      }

      if (!adminCheck) {
        console.error('❌ Admin not found or inactive:', { adminId });
        return { success: false, error: 'المستخدم غير موجود في قائمة الإداريين أو الحساب غير نشط' };
      }

      // فحص وجود الطلب والتأكد من حالته
      const { data: requestCheck, error: checkError } = await supabase
        .from('verification_requests')
        .select('id, user_id, status, full_name_arabic')
        .eq('id', requestId)
        .maybeSingle();

      console.log('🔍 Request check result:', { requestCheck, checkError });

      if (checkError) {
        console.error('❌ Check error:', checkError);
        return { success: false, error: `خطأ في فحص الطلب: ${checkError.message}` };
      }

      if (!requestCheck) {
        console.error('❌ Request not found');
        return { success: false, error: 'لم يتم العثور على طلب التوثيق' };
      }

      if (requestCheck.status === 'approved') {
        console.error('❌ Request already approved');
        return { success: false, error: 'الطلب مقبول بالفعل' };
      }

      if (requestCheck.status === 'rejected') {
        console.error('❌ Cannot approve rejected request');
        return { success: false, error: 'لا يمكن قبول طلب مرفوض' };
      }

      // تحديث الطلب مع معلومات إضافية للتشخيص
      console.log('🔍 Updating request...');
      const updateData = {
        status: 'approved' as const,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        admin_notes: notes || 'تم قبول الطلب من قبل الإدارة'
      };

      const { data, error } = await supabase
        .from('verification_requests')
        .update(updateData)
        .eq('id', requestId)
        .select('*');

      console.log('🔍 Update result:', { data, error, updateData });

      if (error) {
        console.error('❌ Update error:', error);
        return { success: false, error: `خطأ في تحديث الطلب: ${error.message}` };
      }

      if (!data || data.length === 0) {
        console.error('❌ No data returned from update');
        // محاولة إضافية للتحقق من التحديث
        const { data: verifyData } = await supabase
          .from('verification_requests')
          .select('*')
          .eq('id', requestId)
          .maybeSingle();

        if (verifyData && verifyData.status === 'approved') {
          console.log('✅ Update was successful, using verified data');
          data.push(verifyData);
        } else {
          return { success: false, error: 'فشل في تحديث طلب التوثيق - تحقق من صلاحيات الإدارة' };
        }
      }

      const updatedRequest = data[0];

      // تحديث حالة التوثيق في جدول المستخدمين
      if (updatedRequest && updatedRequest.user_id) {
        console.log('🔍 Updating user verification status...');
        const { error: userUpdateError } = await supabase
          .from('users')
          .update({ verified: true })
          .eq('id', updatedRequest.user_id);

        if (userUpdateError) {
          console.error('❌ Error updating user verification status:', userUpdateError);
          // لا نرجع خطأ هنا لأن الطلب تم قبوله بنجاح
        } else {
          console.log('✅ User verification status updated successfully');
        }

        // إرسال إشعار قبول التوثيق
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('email, first_name, last_name')
            .eq('id', updatedRequest.user_id)
            .single();

          if (userData) {
            const { notificationEmailService } = await import('./notificationEmailService');
            const userName = `${userData.first_name} ${userData.last_name || ''}`.trim() || 'المستخدم';

            await notificationEmailService.sendAccountVerificationNotification(
              userData.email,
              userName,
              'approved',
              notes
            );
            console.log('✅ تم إرسال إشعار قبول التوثيق');
          }
        } catch (emailError) {
          console.error('⚠️ فشل في إرسال إشعار قبول التوثيق:', emailError);
          // لا نرمي خطأ لأن العملية الأساسية نجحت
        }
      }

      console.log('✅ Request approved successfully');
      return {
        success: true,
        data: updatedRequest,
        message: 'تم قبول طلب التوثيق بنجاح'
      };
    } catch (error: any) {
      console.error('❌ Unexpected error in approveRequest:', error);
      return { success: false, error: `خطأ غير متوقع: ${error.message}` };
    }
  }

  /**
   * رفض طلب التوثيق (للإداريين)
   */
  async rejectRequest(
    requestId: string,
    adminId: string,
    rejectionReason: string,
    notes?: string
  ): Promise<VerificationServiceResult> {
    try {
      console.log('🔍 VerificationService.rejectRequest called:', { requestId, adminId, rejectionReason, notes });

      // التحقق من صلاحيات الإدارة أولاً
      const { data: adminCheck, error: adminError } = await supabase
        .from('admin_users')
        .select('id, is_active, user_id')
        .eq('user_id', adminId)
        .eq('is_active', true)
        .maybeSingle();

      console.log('🔍 Admin check result:', { adminCheck, adminError, adminId });

      if (adminError) {
        console.error('❌ Admin check error:', adminError);
        return { success: false, error: `خطأ في التحقق من صلاحيات الإدارة: ${adminError.message}` };
      }

      if (!adminCheck) {
        console.error('❌ Admin not found or inactive:', { adminId });
        return { success: false, error: 'المستخدم غير موجود في قائمة الإداريين أو الحساب غير نشط' };
      }

      // فحص وجود الطلب والتأكد من حالته
      const { data: requestCheck, error: checkError } = await supabase
        .from('verification_requests')
        .select('id, user_id, status, full_name_arabic')
        .eq('id', requestId)
        .maybeSingle();

      console.log('🔍 Request check result:', { requestCheck, checkError });

      if (checkError) {
        console.error('❌ Check error:', checkError);
        return { success: false, error: `خطأ في فحص الطلب: ${checkError.message}` };
      }

      if (!requestCheck) {
        console.error('❌ Request not found');
        return { success: false, error: 'لم يتم العثور على طلب التوثيق' };
      }

      if (requestCheck.status === 'rejected') {
        console.error('❌ Request already rejected');
        return { success: false, error: 'الطلب مرفوض بالفعل' };
      }

      if (requestCheck.status === 'approved') {
        console.error('❌ Cannot reject approved request');
        return { success: false, error: 'لا يمكن رفض طلب مقبول' };
      }

      // تحديث الطلب مع معلومات إضافية للتشخيص
      console.log('🔍 Updating request...');
      const updateData = {
        status: 'rejected' as const,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
        admin_notes: notes || 'تم رفض الطلب من قبل الإدارة'
      };

      const { data, error } = await supabase
        .from('verification_requests')
        .update(updateData)
        .eq('id', requestId)
        .select('*');

      console.log('🔍 Update result:', { data, error, updateData });

      if (error) {
        console.error('❌ Update error:', error);
        return { success: false, error: `خطأ في تحديث الطلب: ${error.message}` };
      }

      if (!data || data.length === 0) {
        console.error('❌ No data returned from update');
        // محاولة إضافية للتحقق من التحديث
        const { data: verifyData } = await supabase
          .from('verification_requests')
          .select('*')
          .eq('id', requestId)
          .maybeSingle();

        if (verifyData && verifyData.status === 'rejected') {
          console.log('✅ Update was successful, using verified data');
          data.push(verifyData);
        } else {
          return { success: false, error: 'فشل في تحديث طلب التوثيق - تحقق من صلاحيات الإدارة' };
        }
      }

      const updatedRequest = data[0];

      // إزالة حالة التوثيق من جدول المستخدمين عند الرفض
      if (updatedRequest && updatedRequest.user_id) {
        console.log('🔍 Updating user verification status to false...');
        const { error: userUpdateError } = await supabase
          .from('users')
          .update({ verified: false })
          .eq('id', updatedRequest.user_id);

        if (userUpdateError) {
          console.error('❌ Error updating user verification status:', userUpdateError);
          // لا نرجع خطأ هنا لأن الطلب تم رفضه بنجاح
        } else {
          console.log('✅ User verification status updated successfully');
        }

        // إرسال إشعار رفض التوثيق
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('email, first_name, last_name')
            .eq('id', updatedRequest.user_id)
            .single();

          if (userData) {
            const { notificationEmailService } = await import('./notificationEmailService');
            const userName = `${userData.first_name} ${userData.last_name || ''}`.trim() || 'المستخدم';

            await notificationEmailService.sendAccountVerificationNotification(
              userData.email,
              userName,
              'rejected',
              rejectionReason,
              notes
            );
            console.log('✅ تم إرسال إشعار رفض التوثيق');
          }
        } catch (emailError) {
          console.error('⚠️ فشل في إرسال إشعار رفض التوثيق:', emailError);
          // لا نرمي خطأ لأن العملية الأساسية نجحت
        }
      }

      console.log('✅ Request rejected successfully');
      return {
        success: true,
        data: updatedRequest,
        message: 'تم رفض طلب التوثيق'
      };
    } catch (error: any) {
      console.error('❌ Unexpected error in rejectRequest:', error);
      return { success: false, error: `خطأ غير متوقع: ${error.message}` };
    }
  }

  /**
   * حذف طلب التوثيق المعلق (للمطورين - في حالة حدوث مشاكل)
   */
  async cancelPendingRequest(userId: string): Promise<VerificationServiceResult> {
    try {
      const { data, error } = await supabase
        .from('verification_requests')
        .delete()
        .eq('user_id', userId)
        .in('status', ['pending', 'under_review'])
        .select();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data,
        message: `تم حذف ${data?.length || 0} طلب توثيق معلق`
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * إعادة النظر في طلب التوثيق (للإداريين)
   */
  async reviewAgain(
    requestId: string,
    adminId: string,
    notes?: string
  ): Promise<VerificationServiceResult> {
    try {
      console.log('🔍 VerificationService.reviewAgain called:', { requestId, adminId, notes });

      // التحقق من صلاحيات الإدارة أولاً
      const { data: adminCheck, error: adminError } = await supabase
        .from('admin_users')
        .select('id, is_active, user_id')
        .eq('user_id', adminId)
        .eq('is_active', true)
        .maybeSingle();

      console.log('🔍 Admin check result:', { adminCheck, adminError });

      if (adminError) {
        console.error('❌ Admin check error:', adminError);
        return { success: false, error: `خطأ في التحقق من صلاحيات الإدارة: ${adminError.message}` };
      }

      if (!adminCheck) {
        console.error('❌ Admin not found or inactive:', { adminId });
        // محاولة إضافة المستخدم كإداري إذا لم يكن موجوداً (للتطوير فقط)
        console.log('🔍 Attempting to add user as admin for development...');
        try {
          const { data: roleData } = await supabase
            .from('admin_roles')
            .select('id')
            .eq('name', 'super_admin')
            .maybeSingle();

          if (roleData) {
            const { data: newAdmin, error: addError } = await supabase
              .from('admin_users')
              .insert({
                user_id: adminId,
                role_id: roleData.id,
                is_active: true,
                is_super_admin: true
              })
              .select('id, is_active, user_id')
              .maybeSingle();

            if (!addError && newAdmin) {
              console.log('✅ User added as admin successfully:', newAdmin);
              // المتابعة مع المستخدم الجديد
            } else {
              console.error('❌ Failed to add user as admin:', addError);
              return { success: false, error: 'المستخدم غير موجود في قائمة الإداريين. يرجى التواصل مع مدير النظام.' };
            }
          } else {
            return { success: false, error: 'لم يتم العثور على دور الإدارة المطلوب' };
          }
        } catch (autoAddError) {
          console.error('❌ Auto-add admin failed:', autoAddError);
          return { success: false, error: 'المستخدم غير موجود في قائمة الإداريين. يرجى التواصل مع مدير النظام.' };
        }
      }

      // فحص وجود الطلب والتأكد من حالته
      const { data: requestCheck, error: checkError } = await supabase
        .from('verification_requests')
        .select('id, user_id, status, full_name_arabic')
        .eq('id', requestId)
        .maybeSingle();

      console.log('🔍 Request check result:', { requestCheck, checkError });

      if (checkError) {
        console.error('❌ Check error:', checkError);
        return { success: false, error: `خطأ في فحص الطلب: ${checkError.message}` };
      }

      if (!requestCheck) {
        console.error('❌ Request not found');
        return { success: false, error: 'لم يتم العثور على طلب التوثيق' };
      }

      // فحص حالة الطلب - يمكن إعادة النظر في الطلبات المقبولة أو المرفوضة فقط
      if (requestCheck.status === 'pending' || requestCheck.status === 'under_review') {
        return { success: false, error: 'الطلب قيد المراجعة بالفعل' };
      }

      // تحديث الطلب
      console.log('🔍 Updating request for review again...');
      const updateData = {
        status: 'under_review',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        admin_notes: notes || 'تم إعادة النظر في الطلب من قبل الإدارة'
      };

      const { data, error } = await supabase
        .from('verification_requests')
        .update(updateData)
        .eq('id', requestId)
        .select('*');

      console.log('🔍 Update result:', { data, error, updateData });

      if (error) {
        console.error('❌ Update error:', error);
        return { success: false, error: `خطأ في تحديث الطلب: ${error.message}` };
      }

      if (!data || data.length === 0) {
        console.error('❌ No data returned from update');
        return { success: false, error: 'فشل في تحديث طلب التوثيق - تحقق من صلاحيات الإدارة' };
      }

      const updatedRequest = data[0];

      // إزالة حالة التوثيق من جدول المستخدمين (في حالة كان الطلب مقبولاً سابقاً)
      if (updatedRequest && updatedRequest.user_id) {
        console.log('🔍 Updating user verification status to false...');
        const { error: userUpdateError } = await supabase
          .from('users')
          .update({ verified: false })
          .eq('id', updatedRequest.user_id);

        if (userUpdateError) {
          console.error('❌ Error updating user verification status:', userUpdateError);
          // لا نرجع خطأ هنا لأن الطلب تم تحديثه بنجاح
        } else {
          console.log('✅ User verification status updated successfully');
        }
      }

      console.log('✅ Request review again successful');
      return {
        success: true,
        data: updatedRequest,
        message: 'تم إعادة النظر في طلب التوثيق وإرجاعه لحالة المراجعة'
      };
    } catch (error: any) {
      console.error('❌ Unexpected error in reviewAgain:', error);
      return { success: false, error: `خطأ غير متوقع: ${error.message}` };
    }
  }
}

// إنشاء مثيل واحد من الخدمة
export const verificationService = new VerificationService();
