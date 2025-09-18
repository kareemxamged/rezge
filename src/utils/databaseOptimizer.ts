import { supabase } from '../lib/supabase';

/**
 * مُحسن قاعدة البيانات - أدوات لتحسين الأداء وسرعة الاستعلامات
 */

export interface DatabaseHealthCheck {
  connectionStatus: 'healthy' | 'slow' | 'error';
  responseTime: number;
  error?: string;
}

export interface ProfileDataIntegrity {
  totalUsers: number;
  usersWithMissingData: number;
  usersWithoutMembership: number;
  missingFields: string[];
}

export const databaseOptimizer = {
  /**
   * فحص صحة الاتصال بقاعدة البيانات
   */
  async checkDatabaseHealth(): Promise<DatabaseHealthCheck> {
    const startTime = Date.now();
    
    try {
      console.log('🔍 Checking database health...');
      
      // استعلام بسيط لفحص الاتصال
      const { error } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      const responseTime = Date.now() - startTime;
      
      if (error) {
        console.error('❌ Database health check failed:', error);
        return {
          connectionStatus: 'error',
          responseTime,
          error: error.message
        };
      }

      const status = responseTime < 1000 ? 'healthy' : 'slow';
      console.log(`✅ Database health: ${status} (${responseTime}ms)`);
      
      return {
        connectionStatus: status,
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error('❌ Database health check error:', error);
      
      return {
        connectionStatus: 'error',
        responseTime,
        error: (error as Error).message
      };
    }
  },

  /**
   * فحص تكامل بيانات الملفات الشخصية
   */
  async checkProfileDataIntegrity(): Promise<ProfileDataIntegrity> {
    try {
      console.log('🔍 Checking profile data integrity...');
      
      // عدد المستخدمين الإجمالي
      const { count: totalUsers, error: countError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        throw new Error(`Error counting users: ${countError.message}`);
      }

      // المستخدمون بدون رقم عضوية
      const { count: usersWithoutMembership, error: membershipError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .is('membership_number', null);

      if (membershipError) {
        throw new Error(`Error counting users without membership: ${membershipError.message}`);
      }

      // المستخدمون بدون بيانات أساسية
      const { count: usersWithMissingData, error: missingDataError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .or('first_name.is.null,last_name.is.null,gender.is.null,age.is.null');

      if (missingDataError) {
        throw new Error(`Error counting users with missing data: ${missingDataError.message}`);
      }

      // فحص الحقول المفقودة الشائعة
      const missingFields: string[] = [];
      
      const fieldsToCheck = [
        { field: 'first_name', name: 'الاسم الأول' },
        { field: 'last_name', name: 'الاسم الأخير' },
        { field: 'gender', name: 'الجنس' },
        { field: 'age', name: 'العمر' },
        { field: 'city', name: 'المدينة' },
        { field: 'phone', name: 'رقم الهاتف' }
      ];

      for (const { field, name } of fieldsToCheck) {
        const { count, error } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .or(`${field}.is.null,${field}.eq.`);

        if (!error && count && count > 0) {
          missingFields.push(`${name} (${count} مستخدم)`);
        }
      }

      const result = {
        totalUsers: totalUsers || 0,
        usersWithMissingData: usersWithMissingData || 0,
        usersWithoutMembership: usersWithoutMembership || 0,
        missingFields
      };

      console.log('📊 Profile data integrity check:', result);
      return result;
    } catch (error) {
      console.error('❌ Error checking profile data integrity:', error);
      throw error;
    }
  },

  /**
   * تحسين استعلامات الملف الشخصي
   */
  async optimizeProfileQuery(userId: string): Promise<any> {
    try {
      console.log(`🚀 Optimizing profile query for user: ${userId}`);
      
      // استعلام محسن مع حقول محددة فقط
      const { data: profile, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          membership_number,
          age,
          gender,
          city,
          phone,
          marital_status,
          education,
          profession,
          religious_commitment,
          bio,
          looking_for,
          nationality,
          height,
          weight,
          education_level,
          financial_status,
          religiosity_level,
          prayer_commitment,
          smoking,
          beard,
          hijab,
          created_at,
          updated_at,
          verified,
          status
        `)
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Optimized profile query failed:', error);
        throw error;
      }

      console.log('✅ Optimized profile query successful');
      return profile;
    } catch (error) {
      console.error('❌ Error in optimizeProfileQuery:', error);
      throw error;
    }
  },

  /**
   * إصلاح البيانات المفقودة
   */
  async fixMissingData(): Promise<{ success: boolean; fixed: number; error?: string }> {
    try {
      console.log('🔧 Starting to fix missing data...');
      
      // البحث عن المستخدمين بدون أسماء
      const { data: usersWithoutNames, error: fetchError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .or('first_name.is.null,first_name.eq.,last_name.is.null,last_name.eq.');

      if (fetchError) {
        throw new Error(`Error fetching users: ${fetchError.message}`);
      }

      if (!usersWithoutNames || usersWithoutNames.length === 0) {
        console.log('✅ No users found with missing names');
        return { success: true, fixed: 0 };
      }

      let fixedCount = 0;

      for (const user of usersWithoutNames) {
        try {
          const updates: any = {};
          
          if (!user.first_name || user.first_name.trim() === '') {
            updates.first_name = 'المستخدم';
          }
          
          if (!user.last_name || user.last_name.trim() === '') {
            updates.last_name = '';
          }

          if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase
              .from('users')
              .update(updates)
              .eq('id', user.id);

            if (updateError) {
              console.error(`❌ Error updating user ${user.email}:`, updateError);
            } else {
              console.log(`✅ Fixed missing data for user: ${user.email}`);
              fixedCount++;
            }
          }
        } catch (userError) {
          console.error(`❌ Error processing user ${user.email}:`, userError);
        }
      }

      console.log(`🎉 Successfully fixed ${fixedCount} users`);
      return { success: true, fixed: fixedCount };
    } catch (error) {
      console.error('❌ Error in fixMissingData:', error);
      return { success: false, fixed: 0, error: (error as Error).message };
    }
  },

  /**
   * تشغيل فحص شامل وإصلاح تلقائي
   */
  async runComprehensiveCheck(): Promise<{
    health: DatabaseHealthCheck;
    integrity: ProfileDataIntegrity;
    fixes: { success: boolean; fixed: number; error?: string };
  }> {
    console.log('🔍 Running comprehensive database check...');
    
    const health = await this.checkDatabaseHealth();
    const integrity = await this.checkProfileDataIntegrity();
    const fixes = await this.fixMissingData();

    console.log('📊 Comprehensive check completed:', {
      health: health.connectionStatus,
      responseTime: health.responseTime,
      totalUsers: integrity.totalUsers,
      missingData: integrity.usersWithMissingData,
      missingMembership: integrity.usersWithoutMembership,
      fixedUsers: fixes.fixed
    });

    return { health, integrity, fixes };
  }
};

export default databaseOptimizer;
