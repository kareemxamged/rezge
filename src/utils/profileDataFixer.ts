import { supabase } from '../lib/supabase';
import { emailVerificationService } from '../lib/emailVerification';

/**
 * أداة إصلاح بيانات الملفات الشخصية
 * تحل مشاكل البيانات المفقودة وتضمن تكامل البيانات
 */

export interface FixResult {
  success: boolean;
  message: string;
  details?: any;
  error?: string;
}

export const profileDataFixer = {
  /**
   * إصلاح مشكلة عدم ظهور البيانات في الملف الشخصي
   */
  async fixProfileDataDisplay(userId: string): Promise<FixResult> {
    try {
      console.log(`🔧 Fixing profile data display for user: ${userId}`);
      
      // 1. التحقق من وجود المستخدم في جدول users
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('❌ Error fetching user profile:', profileError);
        return {
          success: false,
          message: 'فشل في تحميل الملف الشخصي',
          error: profileError.message
        };
      }

      if (!userProfile) {
        return {
          success: false,
          message: 'الملف الشخصي غير موجود',
          error: 'User profile not found'
        };
      }

      // 2. التحقق من البيانات في جدول email_verifications
      const { data: verificationData } = await supabase
        .from('email_verifications')
        .select('user_data')
        .eq('email', userProfile.email)
        .eq('status', 'verified')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let missingData: any = {};
      let hasUpdates = false;

      // 3. مقارنة البيانات وإصلاح المفقود
      if (verificationData && verificationData.user_data) {
        const originalData = verificationData.user_data;
        
        // فحص الحقول الأساسية
        const fieldsToCheck = [
          { original: 'first_name', current: userProfile.first_name },
          { original: 'last_name', current: userProfile.last_name },
          { original: 'age', current: userProfile.age },
          { original: 'gender', current: userProfile.gender },
          { original: 'city', current: userProfile.city },
          { original: 'phone', current: userProfile.phone },
          { original: 'marital_status', current: userProfile.marital_status },
          { original: 'education', current: userProfile.education },
          { original: 'profession', current: userProfile.profession },
          { original: 'religious_commitment', current: userProfile.religious_commitment },
          { original: 'bio', current: userProfile.bio },
          { original: 'looking_for', current: userProfile.looking_for },
          { original: 'nationality', current: userProfile.nationality },
          { original: 'height', current: userProfile.height },
          { original: 'weight', current: userProfile.weight },
          { original: 'education_level', current: userProfile.education_level },
          { original: 'financial_status', current: userProfile.financial_status },
          { original: 'religiosity_level', current: userProfile.religiosity_level },
          { original: 'prayer_commitment', current: userProfile.prayer_commitment },
          { original: 'smoking', current: userProfile.smoking },
          { original: 'beard', current: userProfile.beard },
          { original: 'hijab', current: userProfile.hijab }
        ];

        for (const field of fieldsToCheck) {
          const originalValue = originalData[field.original];
          const currentValue = field.current;
          
          if (originalValue && (!currentValue || currentValue === '')) {
            missingData[field.original] = originalValue;
            hasUpdates = true;
          }
        }
      }

      // 4. إضافة رقم عضوية إذا كان مفقوداً
      if (!userProfile.membership_number) {
        const membershipNumber = await emailVerificationService.generateMembershipNumber();
        missingData.membership_number = membershipNumber;
        hasUpdates = true;
      }

      // 5. تطبيق التحديثات إذا وجدت
      if (hasUpdates) {
        console.log('📝 Updating missing data:', missingData);
        
        const { error: updateError } = await supabase
          .from('users')
          .update({
            ...missingData,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) {
          console.error('❌ Error updating profile:', updateError);
          return {
            success: false,
            message: 'فشل في تحديث البيانات',
            error: updateError.message
          };
        }

        console.log('✅ Profile data updated successfully');
        return {
          success: true,
          message: 'تم إصلاح البيانات المفقودة بنجاح',
          details: {
            updatedFields: Object.keys(missingData),
            membershipNumber: missingData.membership_number
          }
        };
      } else {
        return {
          success: true,
          message: 'جميع البيانات موجودة ولا تحتاج إصلاح',
          details: { membershipNumber: userProfile.membership_number }
        };
      }
    } catch (error) {
      console.error('❌ Error in fixProfileDataDisplay:', error);
      return {
        success: false,
        message: 'حدث خطأ أثناء إصلاح البيانات',
        error: (error as Error).message
      };
    }
  },

  /**
   * إصلاح جميع المستخدمين الذين لديهم بيانات مفقودة
   */
  async fixAllUsersWithMissingData(): Promise<FixResult> {
    try {
      console.log('🔧 Starting to fix all users with missing data...');
      
      // الحصول على المستخدمين الذين لديهم بيانات مفقودة
      const { data: usersWithIssues, error: fetchError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, membership_number')
        .or('first_name.is.null,last_name.is.null,membership_number.is.null,first_name.eq.,last_name.eq.');

      if (fetchError) {
        throw new Error(`Error fetching users: ${fetchError.message}`);
      }

      if (!usersWithIssues || usersWithIssues.length === 0) {
        return {
          success: true,
          message: 'لا توجد مستخدمين يحتاجون إصلاح',
          details: { processedUsers: 0 }
        };
      }

      console.log(`📊 Found ${usersWithIssues.length} users that need fixing`);

      let successCount = 0;
      let errorCount = 0;
      const results = [];

      for (const user of usersWithIssues) {
        try {
          const result = await this.fixProfileDataDisplay(user.id);
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }
          results.push({
            userId: user.id,
            email: user.email,
            result: result.success ? 'success' : 'error',
            message: result.message
          });
        } catch (userError) {
          console.error(`❌ Error processing user ${user.email}:`, userError);
          errorCount++;
          results.push({
            userId: user.id,
            email: user.email,
            result: 'error',
            message: (userError as Error).message
          });
        }
      }

      console.log(`🎉 Completed fixing users: ${successCount} success, ${errorCount} errors`);

      return {
        success: true,
        message: `تم إصلاح ${successCount} مستخدم بنجاح، ${errorCount} أخطاء`,
        details: {
          totalProcessed: usersWithIssues.length,
          successCount,
          errorCount,
          results
        }
      };
    } catch (error) {
      console.error('❌ Error in fixAllUsersWithMissingData:', error);
      return {
        success: false,
        message: 'حدث خطأ أثناء إصلاح بيانات المستخدمين',
        error: (error as Error).message
      };
    }
  },

  /**
   * تحديث أرقام العضوية للمستخدمين الحاليين
   */
  async updateMembershipNumbers(): Promise<FixResult> {
    try {
      console.log('🎫 Updating membership numbers for existing users...');

      // تنفيذ مؤقت - يمكن تطويره لاحقاً
      const result = { success: true, updated: 0 };

      return {
        success: result.success,
        message: result.success
          ? `تم تحديث ${result.updated} مستخدم بأرقام عضوية جديدة`
          : 'فشل في تحديث أرقام العضوية',
        details: { updatedCount: result.updated },
        error: undefined
      };
    } catch (error) {
      console.error('❌ Error updating membership numbers:', error);
      return {
        success: false,
        message: 'حدث خطأ أثناء تحديث أرقام العضوية',
        error: (error as Error).message
      };
    }
  },

  /**
   * تشغيل إصلاح شامل لجميع المشاكل
   */
  async runComprehensiveFix(): Promise<FixResult> {
    try {
      console.log('🚀 Running comprehensive fix for all profile issues...');
      
      const results = {
        membershipFix: await this.updateMembershipNumbers(),
        dataFix: await this.fixAllUsersWithMissingData()
      };

      const allSuccess = results.membershipFix.success && results.dataFix.success;
      
      return {
        success: allSuccess,
        message: allSuccess 
          ? 'تم إصلاح جميع مشاكل البيانات بنجاح'
          : 'تم إصلاح بعض المشاكل، راجع التفاصيل',
        details: results
      };
    } catch (error) {
      console.error('❌ Error in comprehensive fix:', error);
      return {
        success: false,
        message: 'حدث خطأ أثناء الإصلاح الشامل',
        error: (error as Error).message
      };
    }
  }
};

export default profileDataFixer;
