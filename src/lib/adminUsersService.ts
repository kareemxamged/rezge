import { supabase } from './supabase';
import { createClient } from '@supabase/supabase-js';
import { getBanDurationText, getBanDurationInMs } from '../utils/banDurationUtils';

// إنشاء client منفصل للعمليات الإدارية مع service role key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sbtzngewizgeqzfbhfjy.supabase.co';
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// إنشاء admin client فقط إذا كان service key متوفر
export const adminSupabase = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'Authorization': `Bearer ${supabaseServiceKey}`
    }
  }
}) : null;

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  age?: number;
  gender?: string;
  city?: string;
  nationality?: string;
  country?: string;
  verified: boolean;
  status: string;
  account_status?: string;
  verification_status?: boolean;
  profile_image_url?: string;
  created_at: string;
  last_login?: string;
  // معلومات شخصية
  marital_status?: string;
  education_level?: string;
  profession?: string;
  height?: number;
  weight?: number;
  smoking?: string;
  children_count?: number;
  marriage_type?: string;
  residence_location?: string;
  // معلومات دينية
  religiosity_level?: string;
  prayer_commitment?: string;
  hijab?: string;
  beard?: string;
  // معلومات أخرى
  bio?: string;
  looking_for?: string;
  profile_visibility?: string;
  financial_status?: string;
  work_field?: string;
  job_title?: string;
  monthly_income?: string;
  health_status?: string;
  // حقول الحظر الجديدة
  block_reason?: string;
  blocked_at?: string;
  blocked_by?: string;
  block_evidence_files?: string[];
  // حقول نظام الحظر المؤقت
  ban_type?: 'permanent' | 'temporary';
  ban_expires_at?: string;
  ban_duration?: string;
  is_ban_active?: boolean;
}

export interface UserFilters {
  search?: string;
  gender?: 'all' | 'male' | 'female';
  verified?: boolean;
  status?: 'all' | 'active' | 'inactive' | 'suspended' | 'banned';
  nationality?: string;
  city?: string;
  age_min?: number;
  age_max?: number;
  date_range?: 'all' | 'today' | 'week' | 'month' | 'year';
  marital_status?: string;
  education_level?: string;
  hasReports?: boolean;
}

export interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserStats {
  totalUsers: number;
  verifiedUsers: number;
  pendingVerification: number;
  blockedUsers: number;
  activeUsers: number;
  maleUsers: number;
  femaleUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}

class AdminUsersService {
  // استخدام الدوال المساعدة من utils بدلاً من الدالة المحلية

  // دالة مساعدة لتنظيف البيانات المعطلة
  async cleanupIncompleteUser(email: string): Promise<void> {
    try {
      const adminClient = adminSupabase || supabase;

      // حذف من جدول users إذا وجد باستخدام admin client
      await adminClient
        .from('users')
        .delete()
        .eq('email', email);

      console.log(`🧹 Cleaned up incomplete user data for: ${email}`);
    } catch (error) {
      console.error('Error cleaning up user data:', error);
    }
  }

  // دالة لتنظيف جميع البيانات المعطلة
  async cleanupAllIncompleteUsers(): Promise<{ success: boolean; cleaned: number; error?: string }> {
    try {
      const client = adminSupabase || supabase;

      // البحث عن المستخدمين الذين ليس لديهم بيانات كاملة
      const { data: incompleteUsers, error: fetchError } = await client
        .from('users')
        .select('id, email, first_name, last_name')
        .or('first_name.is.null,last_name.is.null,phone.is.null');

      if (fetchError) {
        return { success: false, cleaned: 0, error: fetchError.message };
      }

      if (!incompleteUsers || incompleteUsers.length === 0) {
        return { success: true, cleaned: 0 };
      }

      // حذف المستخدمين غير المكتملين
      const { error: deleteError } = await client
        .from('users')
        .delete()
        .in('id', incompleteUsers.map(u => u.id));

      if (deleteError) {
        return { success: false, cleaned: 0, error: deleteError.message };
      }

      console.log(`🧹 Cleaned up ${incompleteUsers.length} incomplete users`);
      return { success: true, cleaned: incompleteUsers.length };
    } catch (error: any) {
      console.error('Error cleaning up incomplete users:', error);
      return { success: false, cleaned: 0, error: error.message };
    }
  }
  // إنشاء مستخدم جديد
  async createUser(userData: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // التحقق من توفر service key
      if (!adminSupabase) {
        console.warn('⚠️ Service role key not available, using regular client');
      } else {
        console.log('✅ Using admin client with service role key');
      }

      // استخدام admin client إذا كان متوفراً، وإلا استخدام العادي
      const client = adminSupabase || supabase;

      // التحقق من عدم وجود المستخدم مسبقاً باستخدام admin client
      console.log('🔍 Checking for existing user...');

      // استخدام admin client مع service role للتحقق
      const adminClient = adminSupabase || client;

      let existingUser = null;
      try {
        // استخدام admin client للتجاوز RLS
        const { data, error: checkError } = await adminClient
          .from('users')
          .select('id, email')
          .eq('email', userData.email)
          .maybeSingle(); // استخدام maybeSingle بدلاً من single

        if (checkError) {
          console.log('⚠️ Could not check existing user:', checkError.message);
          console.log('🔄 Proceeding with creation anyway...');
        } else {
          existingUser = data;
        }
      } catch (error) {
        console.log('⚠️ Could not check existing user, proceeding with creation...');
      }

      if (existingUser) {
        console.log('⚠️ User already exists:', existingUser.email);
        return {
          success: false,
          error: `المستخدم بالإيميل ${userData.email} موجود مسبقاً. يرجى استخدام إيميل مختلف.`
        };
      }

      console.log('✅ No existing user found, proceeding with creation...');

      // العودة للطريقة الأصلية: إنشاء حساب Auth أولاً (triggers محسنة الآن)
      let authUserId: string;
      let authCreated = false;

      if (adminSupabase) {
        try {
          console.log('🔐 Creating Auth user with improved triggers...');
          const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
            email: userData.email,
            password: userData.password,
            email_confirm: true,
            user_metadata: {
              first_name: userData.firstName,
              last_name: userData.lastName,
              admin_created: true
            }
          });

          if (authError) {
            console.error('❌ Admin auth error:', authError);
            throw new Error(`فشل في إنشاء حساب المصادقة: ${authError.message}`);
          }

          if (!authData.user) {
            throw new Error('لم يتم إرجاع بيانات المستخدم من نظام المصادقة');
          }

          authUserId = authData.user.id;
          authCreated = true;
          console.log('✅ Auth user created successfully:', authUserId);
          console.log('🔄 Checking if trigger created profile...');

          // انتظار قصير للتأكد من أن trigger انتهى من العمل
          await new Promise(resolve => setTimeout(resolve, 1000));

          // التحقق من وجود الملف الشخصي
          const { data: existingProfile } = await adminClient
            .from('users')
            .select('id')
            .eq('id', authUserId)
            .maybeSingle();

          if (!existingProfile) {
            console.log('⚠️ Trigger did not create profile, creating manually...');
            // إنشاء الملف الشخصي يدوياً إذا لم ينشئه trigger
            const { error: insertError } = await adminClient
              .from('users')
              .insert({
                id: authUserId,
                email: userData.email,
                first_name: userData.firstName,
                last_name: userData.lastName,
                status: 'active',
                verified: false,
                membership_number: Math.floor(Math.random() * 899999 + 100000).toString().padStart(6, '0'),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (insertError) {
              console.error('❌ Failed to create profile manually:', insertError);
              // حذف حساب Auth إذا فشل إنشاء الملف الشخصي
              await adminSupabase.auth.admin.deleteUser(authUserId);
              throw new Error(`فشل في إنشاء الملف الشخصي: ${insertError.message}`);
            }

            console.log('✅ Profile created manually');
          } else {
            console.log('✅ Trigger created profile successfully');
          }

        } catch (adminAuthError: any) {
          console.error('❌ Admin auth creation failed:', adminAuthError);
          return {
            success: false,
            error: `فشل في إنشاء حساب المصادقة: ${adminAuthError.message}`
          };
        }
      } else {
        return {
          success: false,
          error: 'Admin client غير متوفر. يرجى التحقق من إعدادات service role key.'
        };
      }

      // إعداد بيانات التحديث للملف الشخصي
      const updateData = {
        first_name: userData.firstName, // تأكد من الاسم الأول
        last_name: userData.lastName,   // تأكد من الاسم الأخير
        phone: userData.phone,
        age: userData.age,
        gender: userData.gender,
        city: userData.city,
        nationality: userData.nationality,
        profession: userData.profession,
        bio: userData.bio,
        // الحقول الاختيارية
        education: userData.education || null,
        religious_commitment: userData.religiousCommitment || null,
        height: userData.height || null,
        weight: userData.weight || null,
        education_level: userData.educationLevel || null,
        financial_status: userData.financialStatus || null,
        religiosity_level: userData.religiosityLevel || null,
        prayer_commitment: userData.prayerCommitment || null,
        smoking: userData.smoking || null,
        beard: userData.beard || null,
        hijab: userData.hijab || null,
        status: 'active',
        verified: false,
        updated_at: new Date().toISOString()
      };

      // تحديث الملف الشخصي بالبيانات الكاملة باستخدام admin client
      console.log('🔄 Updating user profile with complete data...');
      const { error: updateError } = await adminClient
        .from('users')
        .update(updateData)
        .eq('id', authUserId);

      if (updateError) {
        console.error('Database error updating user profile:', updateError);
        // حذف حساب Auth إذا فشل التحديث
        if (authCreated && adminSupabase) {
          try {
            await adminSupabase.auth.admin.deleteUser(authUserId);
          } catch (deleteError) {
            console.error('Error deleting auth user:', deleteError);
          }
        }
        throw new Error(`فشل في تحديث الملف الشخصي: ${updateError.message}`);
      }

      console.log('✅ User profile updated successfully');

      // التحقق من أن حساب Auth تم إنشاؤه بنجاح
      if (!authCreated) {
        throw new Error('فشل في إنشاء حساب المصادقة. العملية متوقفة.');
      }

      // جلب البيانات المحفوظة باستخدام admin client
      console.log('📥 Fetching created user data...');

      let userProfile;
      try {
        // استخدام admin client مع service role للجلب
        const { data, error: fetchError } = await adminClient
          .from('users')
          .select('*')
          .eq('id', authUserId)
          .single();

        if (fetchError) {
          console.error('❌ Could not fetch user via admin client:', fetchError);
          // إذا فشل جلب البيانات، ننشئ كائن مؤقت
          userProfile = {
            id: authUserId,
            email: userData.email,
            first_name: userData.firstName,
            last_name: userData.lastName,
            status: 'active',
            verified: false,
            created_at: new Date().toISOString()
          };
          console.log('⚠️ Using temporary profile data');
        } else {
          userProfile = data;
          console.log('✅ Successfully fetched user profile');
        }
      } catch (error) {
        console.error('❌ Fetch failed completely:', error);
        userProfile = {
          id: authUserId,
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          status: 'active',
          verified: false,
          created_at: new Date().toISOString()
        };
        console.log('⚠️ Using fallback profile data');
      }

      console.log('✅ User created successfully:', userProfile);

      // الحصول على معرف المشرف الحالي لتسجيل العملية
      const { data: { user: currentAdmin } } = await supabase.auth.getUser();

      // تسجيل العملية الإدارية
      try {
        // تسجيل العملية فقط إذا كان هناك مشرف مسجل دخول
        if (currentAdmin?.id) {
          await this.logAdminAction({
            targetUserId: userProfile.id,
            adminUserId: currentAdmin.id,
          actionType: 'user_created',
          actionTitle: 'إنشاء مستخدم جديد',
          actionDescription: `تم إنشاء مستخدم جديد من لوحة الإدارة`,
          reason: 'إنشاء حساب جديد من لوحة التحكم',
          details: {
            email: userData.email,
            name: `${userData.firstName} ${userData.lastName}`,
            has_auth_account: authCreated,
            auth_method: authCreated ? 'direct_database' : 'profile_only'
          }
        });
        } else {
          console.log('⚠️ No admin user logged in, skipping action logging');
        }
      } catch (logError) {
        console.error('Error logging admin action:', logError);
        // لا نوقف العملية بسبب خطأ في التسجيل
      }

      return {
        success: true,
        data: userProfile
      };
    } catch (error: any) {
      console.error('Error creating user:', error);
      return {
        success: false,
        error: error.message || 'حدث خطأ في إنشاء المستخدم'
      };
    }
  }

  // جلب جميع المستخدمين مع الفلاتر والتصفح
  async getUsers(
    page: number = 1,
    limit: number = 10,
    filters: UserFilters = {}
  ): Promise<{ success: boolean; data?: UsersResponse; error?: string }> {
    try {
      // استخدام admin client إذا كان متوفراً، وإلا استخدام العادي
      const client = adminSupabase || supabase;

      // أولاً، جلب قائمة معرفات حسابات الإدارة باستخدام دالة آمنة
      const { data: adminUserIds, error: adminError } = await client
        .rpc('get_admin_user_ids');

      if (adminError) {
        console.error('Error fetching admin user IDs:', adminError);
        // في حالة الخطأ، نكمل بدون استبعاد (أفضل من عدم عرض أي شيء)
      }

      const adminIds = adminUserIds?.map(admin => admin.user_id).filter(Boolean) || [];

      let query = client
        .from('users')
        .select('*', { count: 'exact' });

      // استبعاد حسابات الإدارة من القائمة إذا وجدت
      if (adminIds.length > 0) {
        query = query.not('id', 'in', `(${adminIds.join(',')})`);
      }

      // تطبيق الفلاتر
      if (filters.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
      }

      if (filters.gender && filters.gender !== 'all') {
        query = query.eq('gender', filters.gender);
      }

      if (filters.verified !== undefined) {
        query = query.eq('verified', filters.verified);
      }

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.nationality) {
        query = query.eq('nationality', filters.nationality);
      }

      if (filters.city) {
        query = query.eq('city', filters.city);
      }

      if (filters.marital_status) {
        query = query.eq('marital_status', filters.marital_status);
      }

      if (filters.education_level) {
        query = query.eq('education_level', filters.education_level);
      }

      // فلتر العمر
      if (filters.age_min) {
        query = query.gte('age', filters.age_min);
      }

      if (filters.age_max) {
        query = query.lte('age', filters.age_max);
      }

      // فلتر التاريخ
      if (filters.date_range && filters.date_range !== 'all') {
        const now = new Date();
        let startDate: Date;

        switch (filters.date_range) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          default:
            startDate = new Date(0);
        }

        query = query.gte('created_at', startDate.toISOString());
      }

      // ترتيب وتصفح
      const offset = (page - 1) * limit;
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching users:', error);
        return {
          success: false,
          error: error.message || 'حدث خطأ في جلب البيانات'
        };
      }

      const users: User[] = (data || []).map(user => ({
        id: user.id,
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone,
        age: user.age,
        gender: user.gender,
        city: user.city,
        nationality: user.nationality,
        verified: user.verified || false,
        status: user.status || 'active',
        profile_image_url: user.profile_image_url,
        created_at: user.created_at,
        last_login: user.last_login,
        marital_status: user.marital_status,
        education_level: user.education_level,
        profession: user.profession,
        height: user.height,
        weight: user.weight,
        smoking: user.smoking,
        children_count: user.children_count,
        marriage_type: user.marriage_type,
        residence_location: user.residence_location,
        religiosity_level: user.religiosity_level,
        prayer_commitment: user.prayer_commitment,
        hijab: user.hijab,
        beard: user.beard,
        bio: user.bio,
        looking_for: user.looking_for,
        profile_visibility: user.profile_visibility,
        financial_status: user.financial_status,
        work_field: user.work_field,
        job_title: user.job_title,
        monthly_income: user.monthly_income,
        health_status: user.health_status,
        // حقول الحظر
        block_reason: user.block_reason,
        blocked_at: user.blocked_at,
        blocked_by: user.blocked_by,
        block_evidence_files: user.block_evidence_files,
        ban_type: user.ban_type,
        ban_expires_at: user.ban_expires_at,
        ban_duration: user.ban_duration,
        is_ban_active: user.is_ban_active
      }));

      return {
        success: true,
        data: {
          users,
          total: count || 0,
          page,
          limit,
          totalPages: Math.ceil((count || 0) / limit)
        }
      };
    } catch (error: any) {
      console.error('Error fetching users:', error);
      return {
        success: false,
        error: error.message || 'حدث خطأ في الاتصال بالخادم'
      };
    }
  }

  // جلب إحصائيات المستخدمين
  async getUserStats(): Promise<UserStats> {
    try {
      // استخدام admin client إذا كان متوفراً، وإلا استخدام العادي
      const client = adminSupabase || supabase;

      // جلب قائمة معرفات حسابات الإدارة باستخدام دالة آمنة
      const { data: adminUserIds } = await client
        .rpc('get_admin_user_ids');

      const adminIds = adminUserIds?.map(admin => admin.user_id).filter(Boolean) || [];

      let query = client
        .from('users')
        .select('gender, verified, status, created_at');

      // استبعاد حسابات الإدارة إذا وجدت
      if (adminIds.length > 0) {
        query = query.not('id', 'in', `(${adminIds.join(',')})`);
      }

      const { data: allUsers, error } = await query;

      if (error) {
        throw error;
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const stats: UserStats = {
        totalUsers: allUsers?.length || 0,
        verifiedUsers: allUsers?.filter(u => u.verified).length || 0,
        pendingVerification: allUsers?.filter(u => !u.verified).length || 0,
        blockedUsers: allUsers?.filter(u => u.status === 'banned' || u.status === 'suspended').length || 0,
        activeUsers: allUsers?.filter(u => u.status === 'active').length || 0,
        maleUsers: allUsers?.filter(u => u.gender === 'male').length || 0,
        femaleUsers: allUsers?.filter(u => u.gender === 'female').length || 0,
        newUsersToday: allUsers?.filter(u => new Date(u.created_at) >= today).length || 0,
        newUsersThisWeek: allUsers?.filter(u => new Date(u.created_at) >= weekAgo).length || 0,
        newUsersThisMonth: allUsers?.filter(u => new Date(u.created_at) >= monthStart).length || 0
      };

      return stats;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw error;
    }
  }

  // جلب مستخدم واحد بالتفصيل
  async getUserById(userId: string): Promise<User | null> {
    try {
      // استخدام admin client إذا كان متوفراً، وإلا استخدام العادي
      const client = adminSupabase || supabase;

      const { data, error } = await client
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        email: data.email || '',
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        phone: data.phone,
        age: data.age,
        gender: data.gender,
        city: data.city,
        nationality: data.nationality,
        verified: data.verified || false,
        status: data.status || 'active',
        profile_image_url: data.profile_image_url,
        created_at: data.created_at,
        last_login: data.last_login,
        marital_status: data.marital_status,
        education_level: data.education_level,
        profession: data.profession,
        height: data.height,
        weight: data.weight,
        smoking: data.smoking,
        children_count: data.children_count,
        marriage_type: data.marriage_type,
        residence_location: data.residence_location,
        religiosity_level: data.religiosity_level,
        prayer_commitment: data.prayer_commitment,
        hijab: data.hijab,
        beard: data.beard,
        bio: data.bio,
        looking_for: data.looking_for,
        profile_visibility: data.profile_visibility,
        financial_status: data.financial_status,
        work_field: data.work_field,
        job_title: data.job_title,
        monthly_income: data.monthly_income,
        health_status: data.health_status,
        // حقول الحظر
        block_reason: data.block_reason,
        blocked_at: data.blocked_at,
        blocked_by: data.blocked_by,
        block_evidence_files: data.block_evidence_files,
        ban_type: data.ban_type,
        ban_expires_at: data.ban_expires_at,
        ban_duration: data.ban_duration,
        is_ban_active: data.is_ban_active
      };
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  // تحديث حالة المستخدم
  async updateUserStatus(userId: string, status: 'active' | 'suspended' | 'banned'): Promise<{ success: boolean; error?: string }> {
    try {
      // استخدام admin client إذا كان متوفراً، وإلا استخدام العادي
      const client = adminSupabase || supabase;

      const { error } = await client
        .from('users')
        .update({
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user status:', error);
        return {
          success: false,
          error: error.message || 'حدث خطأ في تحديث حالة المستخدم'
        };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error updating user status:', error);
      return {
        success: false,
        error: error.message || 'حدث خطأ غير متوقع'
      };
    }
  }

  // تحديث حالة التحقق
  async updateVerificationStatus(userId: string, verified: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      // استخدام admin client إذا كان متوفراً، وإلا استخدام العادي
      const client = adminSupabase || supabase;

      const { error } = await client
        .from('users')
        .update({
          verified: verified,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating verification status:', error);
        return {
          success: false,
          error: error.message || 'حدث خطأ في تحديث حالة التحقق'
        };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error updating verification status:', error);
      return {
        success: false,
        error: error.message || 'حدث خطأ غير متوقع'
      };
    }
  }

  // حظر المستخدم مع سبب وأدلة ونوع الحظر
  async blockUser(
    userId: string,
    reason: string,
    evidenceFiles: File[] = [],
    banType: 'permanent' | 'temporary' = 'permanent',
    duration?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // حساب تاريخ انتهاء الحظر للحظر المؤقت
      let banExpiresAt: string | null = null;
      let banDurationText = 'دائم';

      if (banType === 'temporary' && duration) {
        const now = new Date();

        // استخدام الدوال المساعدة للحصول على النص العربي والمدة بالميلي ثانية
        banDurationText = getBanDurationText(duration);
        const durationInMs = getBanDurationInMs(duration);

        const expirationDate = new Date(now.getTime() + durationInMs);
        banExpiresAt = expirationDate.toISOString();
      }

      // رفع الملفات إلى التخزين إذا كانت موجودة
      let uploadedFiles: string[] = [];

      if (evidenceFiles.length > 0) {
        for (const file of evidenceFiles) {
          const fileName = `block-evidence/${userId}/${Date.now()}-${file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('profile-images')
            .upload(fileName, file);

          if (uploadError) {
            console.error('Error uploading file:', uploadError);
            continue; // تجاهل الملف في حالة فشل الرفع
          }

          if (uploadData) {
            uploadedFiles.push(uploadData.path);
          }
        }
      }

      // تحديث حالة المستخدم
      // استخدام admin client إذا كان متوفراً، وإلا استخدام العادي
      const client = adminSupabase || supabase;

      const { error } = await client
        .from('users')
        .update({
          status: 'banned',
          block_reason: reason,
          blocked_at: new Date().toISOString(),
          blocked_by: (await supabase.auth.getUser()).data.user?.id,
          block_evidence_files: uploadedFiles,
          ban_type: banType,
          ban_expires_at: banExpiresAt,
          ban_duration: banDurationText,
          is_ban_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Error blocking user:', error);
        return {
          success: false,
          error: error.message || 'حدث خطأ في حظر المستخدم'
        };
      }

      // تسجيل الإجراء الإداري
      await this.logAdminAction({
        targetUserId: userId,
        adminUserId: '27630074-bb7d-4c84-9922-45b21e699a8c', // TODO: الحصول على معرف الأدمن الحالي
        actionType: banType === 'permanent' ? 'user_banned' : 'user_suspended',
        actionTitle: banType === 'permanent' ? 'حظر المستخدم بشكل دائم' : `حظر المستخدم مؤقتاً (${banDurationText})`,
        actionDescription: `تم حظر المستخدم بسبب: ${reason}`,
        reason: reason,
        details: {
          ban_type: banType,
          duration: duration,
          ban_expires_at: banExpiresAt,
          evidence_files_count: evidenceFiles.length,
          ban_duration_text: banDurationText
        }
      });

      return {
        success: true,
        data: {
          userId,
          newStatus: 'banned',
          isBlocked: true,
          reason,
          evidenceFiles: uploadedFiles,
          banType,
          banDurationText
        }
      };
    } catch (error: any) {
      console.error('Error blocking user:', error);
      return {
        success: false,
        error: error.message || 'حدث خطأ غير متوقع'
      };
    }
  }

  // إلغاء حظر المستخدم
  async unblockUser(userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // استخدام admin client إذا كان متوفراً، وإلا استخدام العادي
      const client = adminSupabase || supabase;

      const { error } = await client
        .from('users')
        .update({
          status: 'active',
          block_reason: null,
          blocked_at: null,
          blocked_by: null,
          block_evidence_files: [],
          ban_type: null,
          ban_expires_at: null,
          ban_duration: null,
          is_ban_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Error unblocking user:', error);
        return {
          success: false,
          error: error.message || 'حدث خطأ في إلغاء حظر المستخدم'
        };
      }

      // تسجيل الإجراء الإداري
      await this.logAdminAction({
        targetUserId: userId,
        adminUserId: '27630074-bb7d-4c84-9922-45b21e699a8c', // TODO: الحصول على معرف الأدمن الحالي
        actionType: 'user_unbanned',
        actionTitle: 'فك حظر المستخدم',
        actionDescription: 'تم فك حظر المستخدم وإعادة تفعيل الحساب',
        reason: 'فك الحظر من قبل المشرف',
        details: {
          previous_status: 'banned',
          new_status: 'active',
          unblocked_at: new Date().toISOString()
        }
      });

      return {
        success: true,
        data: {
          userId,
          newStatus: 'active',
          isBlocked: false
        }
      };
    } catch (error: any) {
      console.error('Error unblocking user:', error);
      return {
        success: false,
        error: error.message || 'حدث خطأ غير متوقع'
      };
    }
  }

  // تعديل معلومات التواصل للمستخدم
  async updateContactInfo(userId: string, contactInfo: { email: string; phone: string }, reason: string, documents: File[] = []): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // رفع المستندات إلى التخزين إذا كانت موجودة
      let uploadedFiles: string[] = [];

      if (documents.length > 0) {
        for (const file of documents) {
          const fileName = `contact-edit-docs/${userId}/${Date.now()}-${file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('profile-images')
            .upload(fileName, file);

          if (uploadError) {
            console.error('Error uploading document:', uploadError);
            continue; // تجاهل الملف في حالة فشل الرفع
          }

          if (uploadData) {
            uploadedFiles.push(uploadData.path);
          }
        }
      }

      // جلب البيانات الحالية للمقارنة باستخدام admin client
      const client = adminSupabase || supabase;

      const { data: currentUser, error: fetchError } = await client
        .from('users')
        .select('email, phone')
        .eq('id', userId)
        .single();

      if (fetchError) {
        console.error('Error fetching current user data:', fetchError);
        return {
          success: false,
          error: 'حدث خطأ في جلب البيانات الحالية'
        };
      }

      // الحصول على معرف المشرف الحالي
      const { data: { user: currentAdmin } } = await supabase.auth.getUser();

      // تحديث معلومات التواصل في جدول users باستخدام admin client
      const { error } = await client
        .from('users')
        .update({
          email: contactInfo.email,
          phone: contactInfo.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating contact info:', error);
        return {
          success: false,
          error: error.message || 'حدث خطأ في تحديث معلومات التواصل'
        };
      }

      // تحديث البريد الإلكتروني في Supabase Auth أيضاً إذا تم تغييره
      if (currentUser.email !== contactInfo.email) {
        console.log('🔄 Updating email in Supabase Auth...');

        // إنشاء طلب تغيير إيميل مبسط
        try {
          // استخدام admin client إذا كان متوفراً، وإلا استخدام العادي
          const client = adminSupabase || supabase;

          // إنشاء طلب تغيير إيميل في جدول email_change_requests
          const { error: requestError } = await client
            .from('email_change_requests')
            .insert({
              user_id: userId,
              current_email: currentUser.email,
              new_email: contactInfo.email,
              verification_token: crypto.randomUUID(),
              verified: true, // تأكيد مباشر لأنه من الإدارة
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // ينتهي خلال 24 ساعة
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (requestError) {
            console.error('❌ Error creating email change request:', requestError);
          } else {
            console.log('✅ Email change request created and auto-approved by admin');

            // محاولة تحديث Auth مباشرة باستخدام admin client إذا كان متوفراً
            if (adminSupabase) {
              try {
                // أولاً، التحقق من وجود المستخدم في Auth
                const { data: authUser, error: getUserError } = await adminSupabase.auth.admin.getUserById(userId);

                if (getUserError || !authUser.user) {
                  console.log('⚠️ User not found in Auth system:', getUserError?.message || 'User not found');
                  console.log('💡 This user was likely created before Auth integration. Email updated in users table only.');
                } else {
                  // المستخدم موجود في Auth، يمكن تحديث الإيميل
                  const { error: authError } = await adminSupabase.auth.admin.updateUserById(
                    userId,
                    {
                      email: contactInfo.email,
                      email_confirm: true
                    }
                  );

                  if (authError) {
                    console.log('⚠️ Auth update failed:', authError.message);
                    console.log('💡 Email updated in users table only. User should try logging in with the new email.');
                  } else {
                    console.log('✅ Email updated in both users table and Supabase Auth successfully');
                  }
                }
              } catch (authUpdateError: any) {
                console.log('⚠️ Auth update failed with admin client:', authUpdateError.message || authUpdateError);
                console.log('💡 Email updated in users table only. User should try logging in with the new email.');
              }
            } else {
              console.log('⚠️ Admin client not available. Email updated in users table only.');
              console.log('💡 User should try logging in with the new email address.');
            }
          }
        } catch (error) {
          console.error('❌ Error in email update process:', error);
        }
      }

      // تسجيل الإجراء الإداري
      await this.logAdminAction({
        targetUserId: userId,
        adminUserId: currentAdmin?.id || 'unknown',
        actionType: currentUser.email !== contactInfo.email ? 'email_updated' : 'profile_updated',
        actionTitle: 'تعديل معلومات التواصل',
        actionDescription: `تم تعديل معلومات التواصل للمستخدم بناءً على طلب رسمي`,
        reason: reason,
        details: {
          documents_count: uploadedFiles.length,
          updated_fields: ['email', 'phone']
        },
        oldValues: {
          email: currentUser.email,
          phone: currentUser.phone
        },
        newValues: {
          email: contactInfo.email,
          phone: contactInfo.phone
        }
      });

      return {
        success: true,
        data: {
          userId,
          contactInfo,
          reason,
          documents: uploadedFiles,
          emailChanged: currentUser.email !== contactInfo.email,
          message: currentUser.email !== contactInfo.email
            ? 'تم تحديث معلومات التواصل بنجاح. قد يحتاج المستخدم لتسجيل الدخول مرة أخرى بالإيميل الجديد.'
            : 'تم تحديث معلومات التواصل بنجاح.'
        }
      };
    } catch (error: any) {
      console.error('Error updating contact info:', error);
      return {
        success: false,
        error: error.message || 'حدث خطأ غير متوقع'
      };
    }
  }

  // حظر/إلغاء حظر المستخدم (للتوافق مع الكود القديم)
  async toggleUserBlock(userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // جلب الحالة الحالية
      // استخدام admin client إذا كان متوفراً، وإلا استخدام العادي
      const client = adminSupabase || supabase;

      const { data: currentUser, error: fetchError } = await client
        .from('users')
        .select('status')
        .eq('id', userId)
        .single();

      if (fetchError) {
        console.error('Error fetching user status:', fetchError);
        return {
          success: false,
          error: fetchError.message || 'حدث خطأ في جلب بيانات المستخدم'
        };
      }

      const isCurrentlyBlocked = currentUser.status === 'banned';

      if (isCurrentlyBlocked) {
        return await this.unblockUser(userId);
      } else {
        // للحظر بدون سبب (للتوافق مع الكود القديم)
        return await this.blockUser(userId, 'تم الحظر من قبل المشرف');
      }
    } catch (error: any) {
      console.error('Error toggling user block:', error);
      return {
        success: false,
        error: error.message || 'حدث خطأ غير متوقع'
      };
    }
  }

  // حذف المستخدم (حذف ناعم)
  async deleteUser(userId: string): Promise<void> {
    try {
      // استخدام admin client إذا كان متوفراً، وإلا استخدام العادي
      const client = adminSupabase || supabase;

      const { error } = await client
        .from('users')
        .update({
          status: 'banned',
          deleted_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // فك الحظر التلقائي للمستخدمين المحظورين مؤقتاً
  async autoUnbanExpiredUsers(): Promise<{ success: boolean; unbannedCount: number; error?: string }> {
    try {
      // استخدام admin client إذا كان متوفراً، وإلا استخدام العادي
      const client = adminSupabase || supabase;

      const { data, error } = await client
        .from('users')
        .update({
          status: 'active',
          is_ban_active: false,
          ban_expires_at: null,
          ban_type: null,
          ban_duration: null,
          block_reason: null,
          blocked_at: null,
          blocked_by: null,
          block_evidence_files: [],
          updated_at: new Date().toISOString()
        })
        .eq('is_ban_active', true)
        .eq('ban_type', 'temporary')
        .not('ban_expires_at', 'is', null)
        .lte('ban_expires_at', new Date().toISOString())
        .select('id');

      if (error) {
        console.error('Error auto-unbanning users:', error);
        return {
          success: false,
          unbannedCount: 0,
          error: error.message || 'حدث خطأ في فك الحظر التلقائي'
        };
      }

      const unbannedCount = data ? data.length : 0;
      console.log(`✅ تم فك حظر ${unbannedCount} مستخدم تلقائياً`);

      return {
        success: true,
        unbannedCount
      };
    } catch (error: any) {
      console.error('Error in auto-unban process:', error);
      return {
        success: false,
        unbannedCount: 0,
        error: error.message || 'حدث خطأ غير متوقع في فك الحظر التلقائي'
      };
    }
  }

  // تخصيص بلاغ للمراجعة
  async assignReportForReview(reportId: string, adminId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // استخدام admin client إذا كان متوفراً، وإلا استخدام العادي
      const client = adminSupabase || supabase;

      const { data, error } = await client
        .from('reports')
        .update({
          review_status: 'in_progress',
          reviewed_by: adminId,
          reviewed_at: new Date().toISOString(),
          status: 'reviewing',
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId)
        .eq('review_status', 'not_assigned') // التأكد من أن البلاغ غير مخصص
        .select()
        .single();

      if (error) {
        console.error('Error assigning report:', error);
        return {
          success: false,
          error: error.message || 'حدث خطأ في تخصيص البلاغ للمراجعة'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error: any) {
      console.error('Error in assignReportForReview:', error);
      return {
        success: false,
        error: error.message || 'حدث خطأ غير متوقع في تخصيص البلاغ'
      };
    }
  }

  // تحديث حالة البلاغ
  async updateReportStatus(reportId: string, status: string, adminId: string, notes?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      // إذا كان البلاغ يتم حله أو رفضه، نحدث review_status
      if (status === 'resolved' || status === 'rejected') {
        updateData.review_status = 'completed';
        updateData.review_notes = notes;
      }

      // استخدام admin client إذا كان متوفراً، وإلا استخدام العادي
      const client = adminSupabase || supabase;

      const { data, error } = await client
        .from('reports')
        .update(updateData)
        .eq('id', reportId)
        .eq('reviewed_by', adminId) // التأكد من أن المراجع هو نفسه
        .select()
        .single();

      if (error) {
        console.error('Error updating report status:', error);
        return {
          success: false,
          error: error.message || 'حدث خطأ في تحديث حالة البلاغ'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error: any) {
      console.error('Error in updateReportStatus:', error);
      return {
        success: false,
        error: error.message || 'حدث خطأ غير متوقع في تحديث البلاغ'
      };
    }
  }

  // تسجيل إجراء إداري
  async logAdminAction(actionData: {
    targetUserId: string;
    adminUserId: string;
    actionType: string;
    actionTitle: string;
    actionDescription?: string;
    reason?: string;
    details?: any;
    oldValues?: any;
    newValues?: any;
    relatedActionId?: string;
    adminIpAddress?: string;
    adminUserAgent?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // استخدام admin client إذا كان متوفراً، وإلا استخدام العادي
      const client = adminSupabase || supabase;

      const { data, error } = await client
        .from('admin_actions')
        .insert({
          target_user_id: actionData.targetUserId,
          admin_user_id: actionData.adminUserId,
          action_type: actionData.actionType,
          action_title: actionData.actionTitle,
          action_description: actionData.actionDescription,
          reason: actionData.reason,
          details: actionData.details,
          old_values: actionData.oldValues,
          new_values: actionData.newValues,
          related_action_id: actionData.relatedActionId,
          admin_ip_address: actionData.adminIpAddress,
          admin_user_agent: actionData.adminUserAgent,
          status: 'completed'
        })
        .select()
        .single();

      if (error) {
        console.error('Error logging admin action:', error);
        return {
          success: false,
          error: error.message || 'حدث خطأ في تسجيل الإجراء الإداري'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error: any) {
      console.error('Error in logAdminAction:', error);
      return {
        success: false,
        error: error.message || 'حدث خطأ غير متوقع في تسجيل الإجراء'
      };
    }
  }

  // جلب سجل الإجراءات الإدارية لمستخدم معين
  async getAdminActions(targetUserId: string, limit: number = 50): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      // استخدام admin client إذا كان متوفراً، وإلا استخدام العادي
      const client = adminSupabase || supabase;

      const { data, error } = await client
        .from('admin_actions')
        .select(`
          *,
          admin_user:users!admin_actions_admin_user_id_fkey(first_name, last_name, email)
        `)
        .eq('target_user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching admin actions:', error);
        return {
          success: false,
          error: error.message || 'حدث خطأ في جلب سجل الإجراءات'
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error: any) {
      console.error('Error in getAdminActions:', error);
      return {
        success: false,
        error: error.message || 'حدث خطأ غير متوقع في جلب سجل الإجراءات'
      };
    }
  }

  // جلب إحصائيات الإجراءات الإدارية
  async getAdminActionsStats(targetUserId?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      let query = supabase
        .from('admin_actions')
        .select('action_type, status, created_at');

      if (targetUserId) {
        query = query.eq('target_user_id', targetUserId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching admin actions stats:', error);
        return {
          success: false,
          error: error.message || 'حدث خطأ في جلب إحصائيات الإجراءات'
        };
      }

      // حساب الإحصائيات
      const stats = {
        total: data?.length || 0,
        byType: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
        recent: data?.filter(action => {
          const actionDate = new Date(action.created_at);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return actionDate >= weekAgo;
        }).length || 0
      };

      data?.forEach(action => {
        stats.byType[action.action_type] = (stats.byType[action.action_type] || 0) + 1;
        stats.byStatus[action.status] = (stats.byStatus[action.status] || 0) + 1;
      });

      return {
        success: true,
        data: stats
      };
    } catch (error: any) {
      console.error('Error in getAdminActionsStats:', error);
      return {
        success: false,
        error: error.message || 'حدث خطأ غير متوقع في جلب الإحصائيات'
      };
    }
  }

  // تصدير بيانات المستخدمين
  async exportUsers(filters: UserFilters = {}): Promise<User[]> {
    try {
      const result = await this.getUsers(1, 10000, filters); // جلب جميع المستخدمين

      if (!result || !result.data || !result.data.users || !Array.isArray(result.data.users)) {
        console.warn('No users data returned from getUsers');
        return [];
      }

      return result.data.users;
    } catch (error) {
      console.error('Error exporting users:', error);
      return []; // إرجاع مصفوفة فارغة بدلاً من throw
    }
  }

  // استيراد مستخدم واحد
  async importUser(userData: any): Promise<{ success: boolean; error?: string; isDuplicate?: boolean }> {
    try {
      // التحقق من وجود المستخدم مسبقاً
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', userData.email)
        .single();

      if (existingUser) {
        return { success: false, isDuplicate: true, error: 'المستخدم موجود مسبقاً' };
      }

      // إنشاء المستخدم في نظام المصادقة
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: this.generateRandomPassword(),
        options: {
          emailRedirectTo: undefined // تجنب إرسال إيميل التأكيد
        }
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: 'فشل في إنشاء المستخدم في نظام المصادقة' };
      }

      // إنشاء ملف المستخدم في جدول users
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          phone: userData.phone,
          gender: userData.gender,
          city: userData.city,
          nationality: userData.nationality,
          status: userData.status || 'active',
          verified: userData.verified || false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        // حذف المستخدم من نظام المصادقة إذا فشل إنشاء الملف الشخصي
        await supabase.auth.admin.deleteUser(authData.user.id);
        return { success: false, error: profileError.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error importing user:', error);
      return { success: false, error: error.message || 'حدث خطأ في استيراد المستخدم' };
    }
  }

  // توليد كلمة مرور عشوائية
  private generateRandomPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  // البحث في المستخدمين
  async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    try {
      const result = await this.getUsers(1, limit, { search: query });
      return result.data?.users || [];
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  // جلب قائمة الجنسيات
  async getNationalities(): Promise<string[]> {
    try {
      // جلب قائمة معرفات حسابات الإدارة
      const { data: adminUserIds } = await supabase
        .from('admin_users')
        .select('user_id');

      const adminIds = adminUserIds?.map(admin => admin.user_id).filter(Boolean) || [];

      let query = supabase
        .from('users')
        .select('nationality')
        .not('nationality', 'is', null);

      // استبعاد حسابات الإدارة إذا وجدت
      if (adminIds.length > 0) {
        query = query.not('id', 'in', `(${adminIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const nationalities = [...new Set(data?.map(item => item.nationality).filter(Boolean))];
      return nationalities.sort();
    } catch (error) {
      console.error('Error fetching nationalities:', error);
      throw error;
    }
  }

  // جلب قائمة المدن
  async getCities(): Promise<string[]> {
    try {
      // جلب قائمة معرفات حسابات الإدارة
      const { data: adminUserIds } = await supabase
        .from('admin_users')
        .select('user_id');

      const adminIds = adminUserIds?.map(admin => admin.user_id).filter(Boolean) || [];

      let query = supabase
        .from('users')
        .select('city')
        .not('city', 'is', null);

      // استبعاد حسابات الإدارة إذا وجدت
      if (adminIds.length > 0) {
        query = query.not('id', 'in', `(${adminIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const cities = [...new Set(data?.map(item => item.city).filter(Boolean))];
      return cities.sort();
    } catch (error) {
      console.error('Error fetching cities:', error);
      throw error;
    }
  }




}

export const adminUsersService = new AdminUsersService();
