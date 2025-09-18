import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sbtzngewizgeqzfbhfjy.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNidHpuZ2V3aXpnZXF6ZmJoZmp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMzc5MTMsImV4cCI6MjA2NjcxMzkxM30.T8iv9C4OeKAb-e4Oz6uw3tFnMrgFK3SKN6fVCrBEUGo';

// Create Supabase client with enhanced JWT management
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // تحسين إعدادات تجديد الرمز مع معالجة أفضل للأخطاء
    flowType: 'pkce',
    // تقليل وقت انتهاء الصلاحية لتجديد أسرع
    refreshTokenRotationEnabled: true,
    // تخصيص storage مع معالجة محسنة للأخطاء
    storage: typeof window !== 'undefined' ? {
      getItem: (key: string) => {
        try {
          const item = window.localStorage.getItem(key);
          // التحقق من صحة البيانات المسترجعة
          if (item && key.includes('supabase.auth.token')) {
            try {
              const parsed = JSON.parse(item);
              // التحقق من انتهاء صلاحية الرمز
              if (parsed.expires_at && new Date(parsed.expires_at * 1000) < new Date()) {
                console.log('🔑 Token expired, removing from storage');
                window.localStorage.removeItem(key);
                return null;
              }
            } catch (parseError) {
              console.warn('⚠️ Invalid token format in storage, removing');
              window.localStorage.removeItem(key);
              return null;
            }
          }
          return item;
        } catch (error) {
          console.warn('⚠️ Error reading from localStorage:', error);
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          window.localStorage.setItem(key, value);
          // تسجيل تحديث الرمز للمراقبة
          if (key.includes('supabase.auth.token')) {
            console.log('🔑 Auth token updated in storage');
          }
        } catch (error) {
          console.warn('⚠️ Error writing to localStorage:', error);
          // محاولة تنظيف التخزين إذا كان ممتلئاً
          if (error.name === 'QuotaExceededError') {
            try {
              // إزالة البيانات القديمة غير المهمة
              Object.keys(localStorage).forEach(storageKey => {
                if (!storageKey.includes('supabase') && !storageKey.includes('admin')) {
                  localStorage.removeItem(storageKey);
                }
              });
              // محاولة الحفظ مرة أخرى
              window.localStorage.setItem(key, value);
            } catch (retryError) {
              console.error('❌ Failed to save to localStorage even after cleanup:', retryError);
            }
          }
        }
      },
      removeItem: (key: string) => {
        try {
          window.localStorage.removeItem(key);
          if (key.includes('supabase.auth.token')) {
            console.log('🔑 Auth token removed from storage');
          }
        } catch (error) {
          console.warn('⚠️ Error removing from localStorage:', error);
        }
      },
    } : undefined,
  },
  // إعدادات شبكة محسنة مع معالجة أخطاء JWT
  global: {
    headers: {
      'X-Client-Info': 'rezge-app',
      'X-Client-Version': '1.0.0',
    },
    // fetch مخصص مع معالجة أخطاء JWT
    fetch: async (url, options = {}) => {
      try {
        const response = await fetch(url, {
          ...options,
          signal: AbortSignal.timeout(20000), // زيادة timeout قليلاً
        });

        // معالجة خاصة لأخطاء JWT
        if (response.status === 401) {
          const responseText = await response.clone().text();
          if (responseText.includes('JWT expired') || responseText.includes('Invalid token')) {
            console.log('🔑 JWT expired detected, triggering refresh');
            // إشعار النظام بانتهاء صلاحية الرمز
            window.dispatchEvent(new CustomEvent('jwt-expired', {
              detail: { url, response: responseText }
            }));
          }
        }

        return response;
      } catch (error) {
        // معالجة أخطاء الشبكة
        if (error.name === 'AbortError') {
          console.warn('⏱️ Request timeout for:', url);
        } else if (error.message?.includes('Failed to fetch')) {
          console.warn('🌐 Network error for:', url);
        }
        throw error;
      }
    },
  },
  // إعدادات realtime محسنة
  realtime: {
    params: {
      eventsPerSecond: 5,
    },
  },
});

// Database types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  age?: number;
  gender?: 'male' | 'female';
  city?: string;
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed' | 'unmarried' | 'divorced_female' | 'widowed_female';
  education?: string;
  profession?: string;
  religious_commitment?: 'high' | 'medium' | 'practicing';
  bio?: string;
  looking_for?: string;
  profile_visibility?: 'public' | 'members' | 'verified' | 'private';
  show_phone?: boolean;
  show_email?: boolean;
  allow_messages?: boolean;
  family_can_view?: boolean;
  two_factor_enabled?: boolean;
  login_notifications?: boolean;
  message_notifications?: boolean;
  verified?: boolean;
  status?: 'active' | 'suspended' | 'inactive';
  last_login?: string;
  created_at?: string;
  updated_at?: string;

  // رقم العضوية
  membership_number?: string;

  // الحالة الاجتماعية المطورة
  marriage_type?: 'first_wife' | 'second_wife' | 'only_wife' | 'no_objection_polygamy';
  children_count?: number;

  // الجنسية والإقامة
  residence_location?: string;
  nationality?: string;

  // المواصفات الجسدية
  weight?: number;
  height?: number;
  skin_color?: 'very_fair' | 'fair' | 'medium' | 'olive' | 'dark';
  body_type?: 'slim' | 'average' | 'athletic' | 'heavy';

  // الالتزام الديني المطور
  religiosity_level?: 'not_religious' | 'slightly_religious' | 'religious' | 'very_religious' | 'prefer_not_say';
  prayer_commitment?: 'dont_pray' | 'pray_all' | 'pray_sometimes' | 'prefer_not_say';
  smoking?: 'yes' | 'no';
  beard?: 'yes' | 'no'; // للذكور فقط
  hijab?: 'no_hijab' | 'hijab' | 'niqab' | 'prefer_not_say'; // للإناث فقط

  // الدراسة والعمل المطور
  education_level?: 'primary' | 'secondary' | 'diploma' | 'bachelor' | 'master' | 'phd';
  financial_status?: 'poor' | 'below_average' | 'average' | 'above_average' | 'wealthy';
  work_field?: string;
  job_title?: string;

  // الدخل والصحة
  monthly_income?: 'less_3000' | '3000_5000' | '5000_8000' | '8000_12000' | '12000_20000' | 'more_20000' | 'prefer_not_say';
  health_status?: 'excellent' | 'very_good' | 'good' | 'fair' | 'poor' | 'prefer_not_say';

  // إعدادات الصورة الشخصية
  profile_image_visible?: boolean;
  has_profile_image?: boolean;
  profile_image_url?: string;
}

export interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  status?: 'active' | 'blocked' | 'archived';
  family_involved?: boolean;
  family_email?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type?: 'text' | 'image' | 'file';
  moderation_status?: 'pending' | 'approved' | 'rejected';
  moderation_reason?: string;
  flagged_words?: string[];
  severity?: 'low' | 'medium' | 'high';
  read_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Match {
  id: string;
  user1_id: string;
  user2_id: string;
  match_score: number;
  status: 'active' | 'inactive' | 'blocked';
  created_at?: string;
  updated_at?: string;
}

export interface Like {
  id: string;
  liker_id: string;
  liked_user_id: string;
  like_type: 'like' | 'super_like' | 'interest';
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  created_at: string;
  updated_at?: string;
  expires_at?: string;
}

export interface ContactRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  request_type: 'direct' | 'through_family' | 'formal';
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  family_email?: string;
  family_phone?: string;
  created_at: string;
  updated_at?: string;
  expires_at: string;
}

export interface Report {
  id: string;
  reported_user_id: string;
  reporter_id: string;
  reason: string;
  description?: string;
  severity?: 'low' | 'medium' | 'high';
  status?: 'pending' | 'approved' | 'rejected' | 'resolved';
  admin_notes?: string;
  created_at?: string;
  updated_at?: string;
}



export interface AdminLog {
  id: string;
  admin_id: string;
  action: string;
  target_type?: string;
  target_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

export interface SiteText {
  id: string;
  text_key: string;
  category: string;
  language: string;
  text_value: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface TextChangeLog {
  id: string;
  text_id: string;
  old_value?: string;
  new_value?: string;
  change_type: 'create' | 'update' | 'delete';
  changed_by?: string;
  changed_at?: string;
  change_reason?: string;
}

// Authentication functions
export const authService = {
  // Sign up new user
  async signUp(email: string, password: string, userData: Partial<User>) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Insert user profile data
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email,
            password_hash: 'handled_by_supabase_auth',
            ...userData
          });

        if (profileError) throw profileError;

        // إرسال إشعار الترحيب للمستخدم الجديد
        try {
          const { notificationEmailService } = await import('./notificationEmailService');
          const userName = userData.first_name ? `${userData.first_name} ${userData.last_name || ''}`.trim() : 'المستخدم الجديد';

          await notificationEmailService.sendWelcomeEmail(email, userName);
          console.log('✅ تم إرسال إشعار الترحيب للمستخدم الجديد');
        } catch (emailError) {
          console.error('⚠️ فشل في إرسال إشعار الترحيب:', emailError);
          // لا نرمي خطأ لأن إنشاء الحساب نجح
        }
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Sign in user
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Update last login
      if (data.user) {
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', data.user.id);
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Sign out user
  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // Get user profile
  async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    return { data, error };
  }
};

// User service functions
export const userService = {
  // Get all users with filters
  async getUsers(filters: {
    ageMin?: number;
    ageMax?: number;
    city?: string;
    gender?: string;
    maritalStatus?: string;
    religiousCommitment?: string;
    limit?: number;
    offset?: number;
    excludeUserId?: string; // لاستبعاد المستخدم الحالي
    oppositeGenderOnly?: boolean; // لإظهار الجنس المقابل فقط
    currentUserId?: string; // لفلترة الخصوصية
  } = {}) {
    let query = supabase
      .from('users')
      .select('*')
      .eq('status', 'active')
      .eq('verified', true);

    // استبعاد المستخدم الحالي من النتائج
    if (filters.excludeUserId) {
      query = query.neq('id', filters.excludeUserId);
    }

    if (filters.ageMin) {
      query = query.gte('age', filters.ageMin);
    }
    if (filters.ageMax) {
      query = query.lte('age', filters.ageMax);
    }
    if (filters.city) {
      query = query.ilike('city', `%${filters.city}%`);
    }
    if (filters.gender) {
      query = query.eq('gender', filters.gender);
    }
    if (filters.maritalStatus && filters.maritalStatus !== 'any') {
      query = query.eq('marital_status', filters.maritalStatus);
    }
    if (filters.religiousCommitment && filters.religiousCommitment !== 'any') {
      query = query.eq('religious_commitment', filters.religiousCommitment);
    }

    // فلترة حسب إعدادات الخصوصية
    if (filters.currentUserId) {
      // جلب بيانات المستخدم الحالي لمعرفة حالة التحقق
      const { data: currentUser } = await supabase
        .from('users')
        .select('verified')
        .eq('id', filters.currentUserId)
        .single();

      if (currentUser) {
        if (currentUser.verified) {
          // المستخدم الحالي موثق - يمكنه رؤية: public, members, verified
          query = query.in('profile_visibility', ['public', 'members', 'verified']);
        } else {
          // المستخدم الحالي غير موثق - يمكنه رؤية: public, members فقط
          query = query.in('profile_visibility', ['public', 'members']);
        }
      } else {
        // إذا فشل جلب بيانات المستخدم، اعرض public فقط للأمان
        query = query.eq('profile_visibility', 'public');
      }
    } else {
      // إذا لم يتم تمرير معرف المستخدم، اعرض public فقط
      query = query.eq('profile_visibility', 'public');
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;
    return { data, error };
  },

  // البحث عن المستخدمين مع فلترة الجنس المقابل (للتعارف الشرعي)
  async searchUsersForMatching(currentUserId: string, currentUserGender: 'male' | 'female', filters: {
    ageMin?: number;
    ageMax?: number;
    city?: string;
    maritalStatus?: string;
    religiousCommitment?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    try {
      // جلب بيانات المستخدم الحالي لمعرفة حالة التحقق
      const { data: currentUser, error: currentUserError } = await supabase
        .from('users')
        .select('verified')
        .eq('id', currentUserId)
        .single();

      if (currentUserError || !currentUser) {
        console.error('❌ خطأ في جلب بيانات المستخدم الحالي:', currentUserError);
        return { data: [], error: currentUserError };
      }

      // تحديد الجنس المطلوب (عكس جنس المستخدم الحالي)
      const targetGender = currentUserGender === 'male' ? 'female' : 'male';

      console.log(`🔍 البحث للمستخدم ${currentUserId} (${currentUserGender}) - البحث عن ${targetGender}`);
      console.log('🔧 فلاتر البحث:', filters);
      console.log('✅ حالة التحقق للمستخدم الحالي:', currentUser.verified);

      let query = supabase
        .from('users')
        .select(`
          *,
          blocked_by:user_blocks!user_blocks_blocked_user_id_fkey(blocker_id),
          blocking:user_blocks!user_blocks_blocker_id_fkey(blocked_user_id)
        `)
        .eq('status', 'active')
        .eq('verified', true)
        .eq('gender', targetGender) // إظهار الجنس المقابل فقط
        .neq('id', currentUserId); // استبعاد المستخدم الحالي

      // فلترة حسب إعدادات الخصوصية
      if (currentUser.verified) {
        // المستخدم الحالي موثق - يمكنه رؤية: public, members, verified
        query = query.in('profile_visibility', ['public', 'members', 'verified']);
        console.log('🔒 فلتر الخصوصية: public, members, verified (مستخدم موثق)');
      } else {
        // المستخدم الحالي غير موثق - يمكنه رؤية: public, members فقط
        query = query.in('profile_visibility', ['public', 'members']);
        console.log('🔒 فلتر الخصوصية: public, members (مستخدم غير موثق)');
      }

      console.log(`📋 الشروط الأساسية: status=active, verified=true, gender=${targetGender}, id!=${currentUserId}`);

      if (filters.ageMin) {
        query = query.gte('age', filters.ageMin);
        console.log(`📅 فلتر العمر الأدنى: ${filters.ageMin}`);
      }
      if (filters.ageMax) {
        query = query.lte('age', filters.ageMax);
        console.log(`📅 فلتر العمر الأقصى: ${filters.ageMax}`);
      }
      if (filters.city) {
        query = query.ilike('city', `%${filters.city}%`);
        console.log(`🏙️ فلتر المدينة: ${filters.city}`);
      }
      if (filters.maritalStatus && filters.maritalStatus !== 'any') {
        query = query.eq('marital_status', filters.maritalStatus);
        console.log(`💍 فلتر الحالة الاجتماعية: ${filters.maritalStatus}`);
      }
      if (filters.religiousCommitment && filters.religiousCommitment !== 'any') {
        query = query.eq('religious_commitment', filters.religiousCommitment);
        console.log(`🕌 فلتر الالتزام الديني: ${filters.religiousCommitment}`);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
        console.log(`📊 حد النتائج: ${filters.limit}`);
      }
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
        console.log(`📄 الإزاحة: ${filters.offset}`);
      }

      console.log('🚀 تنفيذ الاستعلام...');
      const { data, error } = await query;

      if (error) {
        console.error('❌ خطأ في الاستعلام:', error);
        console.error('❌ تفاصيل الخطأ:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });

        // فحص خاص لأخطاء RLS
        if (error.message?.includes('RLS') || error.message?.includes('policy')) {
          console.error('🔒 خطأ في Row Level Security - تحقق من سياسات الأمان');
        }

        return { data: null, error };
      }

      if (data) {
        console.log(`✅ تم العثور على ${data.length} نتيجة قبل فلترة المحظورين`);

        // Filter out blocked users
        const filteredData = data.filter(user => {
          // Check if current user is blocked by this user
          const isBlockedByUser = user.blocking?.some((block: any) =>
            block.blocked_user_id === currentUserId
          );

          // Check if current user has blocked this user
          const hasBlockedUser = user.blocked_by?.some((block: any) =>
            block.blocker_id === currentUserId
          );

          // Exclude if either user has blocked the other
          return !isBlockedByUser && !hasBlockedUser;
        });

        console.log(`🔒 تم استبعاد ${data.length - filteredData.length} مستخدم محظور`);
        console.log(`✅ النتائج النهائية: ${filteredData.length} مستخدم`);

        if (filteredData.length > 0) {
          console.log('📋 أول نتيجة:', {
            id: filteredData[0].id,
            name: `${filteredData[0].first_name} ${filteredData[0].last_name}`,
            age: filteredData[0].age,
            city: filteredData[0].city,
            gender: filteredData[0].gender
          });
        }

        // Clean up the data by removing the block information before returning
        const cleanData = filteredData.map(user => {
          const { blocked_by, blocking, ...cleanUser } = user;
          return cleanUser;
        });

        return { data: cleanData, error };
      } else {
        console.log('⚠️ لا توجد بيانات في النتيجة');
        return { data: [], error };
      }
    } catch (error) {
      console.error('💥 خطأ غير متوقع في searchUsersForMatching:', error);
      return { data: null, error };
    }
  },

  // Update user profile
  async updateProfile(userId: string, updates: Partial<User>) {
    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    return { data, error };
  },

  // Get user statistics
  async getUserStats() {
    const { data: totalUsers } = await supabase
      .from('users')
      .select('id', { count: 'exact' });

    const { data: activeUsers } = await supabase
      .from('users')
      .select('id', { count: 'exact' })
      .eq('status', 'active');

    const { data: verifiedUsers } = await supabase
      .from('users')
      .select('id', { count: 'exact' })
      .eq('verified', true);

    return {
      total: totalUsers?.length || 0,
      active: activeUsers?.length || 0,
      verified: verifiedUsers?.length || 0
    };
  },

  // Get public user profile by ID (for viewing other users' profiles)
  // يتطلب تسجيل الدخول - لا يمكن للمستخدمين غير المسجلين عرض الملفات الشخصية
  async getPublicUserProfile(userId: string, currentUserId?: string) {
    try {
      console.log('getPublicUserProfile called - userId:', userId, 'currentUserId:', currentUserId);

      // التحقق من تسجيل الدخول
      if (!currentUserId) {
        console.log('No currentUserId provided, returning auth required error');
        return { data: null, error: { message: 'Authentication required' } };
      }

      // جلب معلومات المستخدم الحالي للتحقق من حالته والجنس
      console.log('Fetching current user data for:', currentUserId);
      const { data: currentUserData, error: currentUserError } = await supabase
        .from('users')
        .select('verified, status, gender')
        .eq('id', currentUserId)
        .single();

      console.log('Current user data:', currentUserData, 'error:', currentUserError);

      if (!currentUserData || currentUserData.status !== 'active') {
        console.log('Invalid current user status:', currentUserData?.status);
        return { data: null, error: { message: 'Invalid user status' } };
      }

      console.log('Fetching target user profile for:', userId);
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          age,
          gender,
          city,
          marital_status,
          education,
          profession,
          religious_commitment,
          bio,
          looking_for,
          verified,
          status,
          created_at,
          marriage_type,
          children_count,
          residence_location,
          nationality,
          weight,
          height,
          skin_color,
          body_type,
          religiosity_level,
          prayer_commitment,
          smoking,
          beard,
          hijab,
          education_level,
          financial_status,
          work_field,
          job_title,
          monthly_income,
          health_status,
          profile_image_url,
          profile_image_visible,
          has_profile_image,
          profile_visibility,
          allow_messages
        `)
        .eq('id', userId)
        .eq('status', 'active')
        .eq('verified', true)
        .single();

      console.log('Target user profile result - data:', !!data, 'error:', error, 'profile_visibility:', data?.profile_visibility, 'allow_messages:', data?.allow_messages, 'target_gender:', data?.gender);

      if (error || !data) {
        return { data: null, error: error || { message: 'Profile not found' } };
      }

      // التحقق من الجنس - منع الوصول للملفات الشخصية من نفس الجنس (للضوابط الشرعية)
      if (currentUserData.gender && data.gender && currentUserData.gender === data.gender) {
        console.log('Same gender access denied - currentUser:', currentUserData.gender, 'targetUser:', data.gender);
        return { data: null, error: { message: 'Same gender access not allowed' } };
      }

      // التحقق من إعدادات الخصوصية
      if (data) {
        console.log('Checking privacy settings - profile_visibility:', data.profile_visibility, 'currentUser verified:', currentUserData.verified);

        // التحقق من إعدادات رؤية الملف الشخصي
        if (data.profile_visibility === 'private') {
          console.log('Profile is private, denying access');
          return { data: null, error: { message: 'Profile is private' } };
        }

        if (data.profile_visibility === 'verified' && !currentUserData.verified) {
          console.log('Profile requires verification but current user is not verified');
          return { data: null, error: { message: 'Profile requires verification' } };
        }

        // ملاحظة: خيار 'members' يسمح لجميع الأعضاء المسجلين بالعرض
        // وقد تم بالفعل التحقق من تسجيل الدخول أعلاه
        console.log('Privacy check passed, allowing access');

        // إذا كانت الصورة الشخصية غير مرئية، لا نعرضها
        if (!data.profile_image_visible) {
          data.profile_image_url = null;
          data.has_profile_image = false;
        }
      }

      // تسجيل مشاهدة الملف الشخصي (بصمت - لا نوقف العملية إذا فشل)
      if (data && currentUserId !== userId) {
        try {
          await this.recordProfileView(currentUserId, userId);
          console.log('Profile view recorded successfully');
        } catch (viewError) {
          console.warn('Failed to record profile view:', viewError);
          // لا نوقف العملية إذا فشل تسجيل المشاهدة
        }
      }

      return { data, error };
    } catch (err) {
      console.error('Error fetching public user profile:', err);
      return { data: null, error: err };
    }
  },

  // تسجيل مشاهدة الملف الشخصي
  async recordProfileView(viewerId: string, viewedUserId: string) {
    try {
      // التحقق من عدم تسجيل نفس المشاهدة خلال آخر ساعة (لتجنب التكرار)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const { data: existingView } = await supabase
        .from('profile_views')
        .select('id')
        .eq('viewer_id', viewerId)
        .eq('viewed_user_id', viewedUserId)
        .gte('created_at', oneHourAgo)
        .maybeSingle();

      // إذا لم توجد مشاهدة حديثة، سجل مشاهدة جديدة
      if (!existingView) {
        const { error } = await supabase
          .from('profile_views')
          .insert({
            viewer_id: viewerId,
            viewed_user_id: viewedUserId,
            view_type: 'profile'
          });

        if (error) {
          console.error('Error recording profile view:', error);
          throw error;
        }

        console.log('Profile view recorded:', { viewerId, viewedUserId });
      } else {
        console.log('Profile view already recorded recently');
      }
    } catch (error) {
      console.error('Error in recordProfileView:', error);
      throw error;
    }
  },

  // اختبار إعدادات الخصوصية للمستخدم
  async checkUserPrivacySettings(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('profile_visibility, profile_image_visible, has_profile_image')
        .eq('id', userId)
        .single();

      if (error) {
        return { data: null, error };
      }

      return {
        data: {
          isProfileVisible: data.profile_visibility !== 'private',
          isImageVisible: data.profile_image_visible === true,
          hasImage: data.has_profile_image === true
        },
        error: null
      };
    } catch (err) {
      console.error('Error checking privacy settings:', err);
      return { data: null, error: err };
    }
  }
};

// Message service functions
export const messageService = {
  // Get conversations for a user
  async getConversations(userId: string) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          user1_id,
          user2_id,
          status,
          family_involved,
          family_email,
          moderation_status,
          last_message_content,
          last_message_sender_id,
          last_message_at,
          unread_count_user1,
          unread_count_user2,
          user1_typing,
          user2_typing,
          user1_last_typing_at,
          user2_last_typing_at,
          created_at,
          updated_at,
          user1:users!user1_id(id, first_name, last_name, verified),
          user2:users!user2_id(id, first_name, last_name, verified)
        `)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        return { data: [], error };
      }

      // Get last message and unread count for each conversation
      const conversationsWithLastMessage = await Promise.all(
        (data || []).map(async (conversation) => {
          // Get last message
          const { data: lastMessage, error: lastMessageError } = await supabase
            .from('messages')
            .select('content, created_at, sender_id, read_at')
            .eq('conversation_id', conversation.id)
            .eq('moderation_status', 'approved')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Log error if any (but don't fail the whole operation)
          if (lastMessageError && lastMessageError.code !== 'PGRST116') {
            console.warn('Warning getting last message for conversation:', conversation.id, lastMessageError);
          }

          // Get unread messages count for this conversation
          const { count: unreadCount, error: unreadError } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conversation.id)
            .neq('sender_id', userId) // Only messages NOT sent by current user
            .is('read_at', null) // Only unread messages
            .eq('moderation_status', 'approved'); // Only approved messages

          if (unreadError) {
            console.warn('Warning getting unread count for conversation:', conversation.id, unreadError);
          }

          // Determine if the last message is read
          // Only show read status for messages sent by the current user
          // A message is considered "read" if it has a read_at timestamp (recipient has read it)
          const isLastMessageRead = lastMessage && lastMessage.sender_id === userId ?
            (lastMessage.read_at !== null) :
            false;

          return {
            ...conversation,
            last_message: lastMessage?.content || null,
            last_message_at: lastMessage?.created_at || conversation.created_at,
            last_message_sender_id: lastMessage?.sender_id || null,
            last_message_read: isLastMessageRead,
            unread_count: unreadCount || 0
          };
        })
      );

      // Sort by last message time
      conversationsWithLastMessage.sort((a, b) =>
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );

      return { data: conversationsWithLastMessage, error: null };
    } catch (err) {
      console.error('Unexpected error in getConversations:', err);
      return { data: [], error: err };
    }
  },

  // Get messages for a conversation
  async getMessages(conversationId: string) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          moderation_status,
          delivery_status,
          read_at,
          created_at,
          sender:users(id, first_name, last_name)
        `)
        .eq('conversation_id', conversationId)
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return { data: [], error };
      }

      return { data: data || [], error: null };
    } catch (err) {
      console.error('Unexpected error in getMessages:', err);
      return { data: [], error: err };
    }
  },

  // تحديث حالة قراءة الرسائل
  async markMessagesAsRead(conversationId: string, userId: string) {
    try {
      console.log('🔄 markMessagesAsRead called:', { conversationId, userId });

      // First, let's see what messages we're trying to update
      const { data: messagesToUpdate, error: fetchError } = await supabase
        .from('messages')
        .select('id, sender_id, content, read_at, created_at')
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId) // فقط الرسائل التي لم يرسلها المستخدم الحالي
        .is('read_at', null); // فقط الرسائل غير المقروءة

      if (fetchError) {
        console.error('❌ Error fetching messages to mark as read:', fetchError);
        return { success: false, error: fetchError };
      }

      console.log('📋 Messages to mark as read:', messagesToUpdate);

      if (!messagesToUpdate || messagesToUpdate.length === 0) {
        console.log('ℹ️ No unread messages found to mark as read');
        return { success: true, message: 'No messages to update' };
      }

      // Log the exact update query for debugging
      console.log('🔄 Attempting to update messages with conditions:', {
        conversation_id: conversationId,
        'sender_id != ': userId,
        'read_at is': null
      });

      const { data: updateResult, error } = await supabase
        .from('messages')
        .update({
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId) // فقط الرسائل التي لم يرسلها المستخدم الحالي
        .is('read_at', null) // فقط الرسائل غير المقروءة
        .select('id, read_at, sender_id, conversation_id');

      if (error) {
        console.error('❌ Error marking messages as read:', error);
        console.error('❌ Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return { success: false, error };
      }

      console.log('✅ Messages marked as read successfully:', updateResult);
      console.log(`📊 Updated ${updateResult?.length || 0} message(s) for conversation:`, conversationId);

      // If no messages were updated but we found messages to update, there might be a permissions issue
      if (messagesToUpdate.length > 0 && (!updateResult || updateResult.length === 0)) {
        console.warn('⚠️ Found messages to update but none were actually updated. Possible permissions issue.');
        console.warn('⚠️ Messages that should have been updated:', messagesToUpdate.map(msg => ({
          id: msg.id,
          sender_id: msg.sender_id,
          read_at: msg.read_at
        })));
      }
      return { success: true, updatedMessages: updateResult };
    } catch (err) {
      console.error('💥 Unexpected error in markMessagesAsRead:', err);
      return { success: false, error: err };
    }
  },

  // Alternative method using RPC to bypass RLS issues
  async markMessagesAsReadRPC(conversationId: string, userId: string) {
    try {
      console.log('🔄 markMessagesAsReadRPC called:', { conversationId, userId });

      const { data, error } = await supabase.rpc('mark_messages_as_read', {
        p_conversation_id: conversationId,
        p_user_id: userId
      });

      if (error) {
        console.error('❌ RPC Error marking messages as read:', error);
        return { success: false, error };
      }

      console.log('✅ RPC Messages marked as read successfully:', data);
      return { success: true, updatedCount: data };
    } catch (err) {
      console.error('💥 Unexpected error in markMessagesAsReadRPC:', err);
      return { success: false, error: err };
    }
  },

  // Send a message
  async sendMessage(conversationId: string, senderId: string, content: string) {
    try {
      // First, check if the conversation is blocked
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('status, user1_id, user2_id')
        .eq('id', conversationId)
        .single();

      if (convError) {
        console.error('Error checking conversation status:', convError);
        return { data: null, error: convError };
      }

      // Determine if the sender is blocked by the other user
      const isBlocked = conversation.status === 'blocked';

      // Check who blocked whom by looking at user_blocks table
      let isRecipientBlocked = false;
      if (isBlocked) {
        const recipientId = conversation.user1_id === senderId ? conversation.user2_id : conversation.user1_id;
        const { data: blockData } = await supabase
          .from('user_blocks')
          .select('blocker_id')
          .eq('blocker_id', recipientId)
          .eq('blocked_user_id', senderId)
          .eq('status', 'active')
          .single();

        isRecipientBlocked = !!blockData;
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content: content.trim(),
          moderation_status: 'approved',
          delivery_status: isRecipientBlocked ? 'sent' : 'delivered'
        })
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          moderation_status,
          delivery_status,
          created_at,
          sender:users(id, first_name, last_name)
        `)
        .single();

      if (error) {
        console.error('Error inserting message:', error);
        return { data: null, error };
      }

      // Update conversation's last message (only if not blocked by recipient)
      if (!isRecipientBlocked) {
        await supabase
          .from('conversations')
          .update({
            last_message_at: new Date().toISOString(),
            last_message_content: content.trim(),
            last_message_sender_id: senderId,
            updated_at: new Date().toISOString()
          })
          .eq('id', conversationId);
      } else {
        // Just update timestamp if blocked
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId);
      }

      return {
        data: {
          ...data,
          isBlocked: isRecipientBlocked // Add flag to indicate if message was blocked
        },
        error: null
      };
    } catch (err) {
      console.error('Unexpected error in sendMessage:', err);
      return { data: null, error: err };
    }
  },

  // Create or get conversation
  async createConversation(user1Id: string, user2Id: string) {
    try {
      // First, check if the target user allows messages
      const { data: targetUser, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name, allow_messages')
        .eq('id', user2Id)
        .single();

      if (userError) {
        console.error('Error fetching target user:', userError);
        return { data: null, error: 'المستخدم المستهدف غير موجود' };
      }

      if (!targetUser.allow_messages) {
        console.log(`User ${user2Id} has disabled messages`);
        return {
          data: null,
          error: 'هذا المستخدم لا يسمح بالرسائل حالياً'
        };
      }

      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .or(`and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`)
        .single();

      if (existing) {
        return { data: existing, error: null };
      }

      // Create new conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user1_id: user1Id,
          user2_id: user2Id
        })
        .select()
        .single();

      return { data, error };
    } catch (err) {
      console.error('Unexpected error in createConversation:', err);
      return { data: null, error: 'حدث خطأ غير متوقع' };
    }
  },

  // Update conversation
  async updateConversation(conversationId: string, updates: Partial<Conversation>) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .update(updates)
        .eq('id', conversationId)
        .select()
        .single();

      if (error) {
        console.error('Error updating conversation:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Unexpected error in updateConversation:', err);
      return { data: null, error: err };
    }
  },

  // Delete Chat
  async deleteConversation(conversationId: string) {
    try {
      // First delete all messages in the conversation
      await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

      // Then delete the conversation
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) {
        console.error('Error deleting conversation:', error);
        return { error };
      }

      return { error: null };
    } catch (err) {
      console.error('Unexpected error in deleteConversation:', err);
      return { error: err };
    }
  }
};

// Report service functions
export const reportService = {
  // Create a new report
  async createReport(reportedUserId: string, reporterId: string, reason: string, description?: string, severity: 'low' | 'medium' | 'high' = 'medium') {
    try {
      console.log('🚩 Starting report creation:', { reportedUserId, reporterId, reason, severity });

      // Validate input parameters
      if (!reportedUserId || !reporterId || !reason) {
        console.error('❌ Invalid parameters: reportedUserId, reporterId, and reason are required');
        return { data: null, error: 'معاملات غير صحيحة: معرف المبلغ عنه والمبلغ والسبب مطلوبان' };
      }

      if (reportedUserId === reporterId) {
        console.error('❌ User cannot report themselves');
        return { data: null, error: 'لا يمكن للمستخدم الإبلاغ عن نفسه' };
      }

      // Validate reason length
      if (reason.trim().length < 10) {
        console.error('❌ Report reason too short');
        return { data: null, error: 'سبب الإبلاغ قصير جداً، يجب أن يكون على الأقل 10 أحرف' };
      }

      // Check if user has already reported this user recently (within 24 hours)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: existingReports, error: checkError } = await supabase
        .from('reports')
        .select('id, created_at')
        .eq('reporter_id', reporterId)
        .eq('reported_user_id', reportedUserId)
        .gte('created_at', twentyFourHoursAgo)
        .limit(1);

      if (checkError) {
        console.error('❌ Error checking existing reports:', checkError);
        return { data: null, error: 'خطأ في التحقق من التقارير الموجودة' };
      }

      if (existingReports && existingReports.length > 0) {
        console.log('⚠️ User has already reported this user recently');
        return { data: null, error: 'لقد قمت بالإبلاغ عن هذا المستخدم مؤخراً. يرجى الانتظار 24 ساعة قبل الإبلاغ مرة أخرى' };
      }

      // Create the report
      const reportData = {
        reported_user_id: reportedUserId,
        reporter_id: reporterId,
        reason: reason.trim(),
        description: description?.trim() || null,
        severity,
        status: 'pending'
      };

      const { data, error } = await supabase
        .from('reports')
        .insert(reportData)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating report:', error);
        return { data: null, error: 'فشل في إنشاء التقرير' };
      }

      console.log('✅ Report created successfully:', data);
      return { data, error: null };
    } catch (err) {
      console.error('💥 Unexpected error in createReport:', err);
      return { data: null, error: 'خطأ غير متوقع أثناء إنشاء التقرير' };
    }
  },

  // Get reports for admin
  async getReports(status?: string, limit: number = 50) {
    try {
      let query = supabase
        .from('reports')
        .select(`
          id,
          reason,
          description,
          severity,
          status,
          admin_notes,
          created_at,
          updated_at,
          reported_user:users!reports_reported_user_id_fkey(id, first_name, last_name, email),
          reporter:users!reports_reporter_id_fkey(id, first_name, last_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching reports:', error);
        return { data: [], error };
      }

      return { data: data || [], error: null };
    } catch (err) {
      console.error('Unexpected error in getReports:', err);
      return { data: [], error: err };
    }
  },

  // Update report status (for admin)
  async updateReportStatus(reportId: string, status: 'pending' | 'approved' | 'rejected' | 'resolved', adminNotes?: string) {
    try {
      const { data, error } = await supabase
        .from('reports')
        .update({
          status,
          admin_notes: adminNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId)
        .select()
        .single();

      if (error) {
        console.error('Error updating report status:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Unexpected error in updateReportStatus:', err);
      return { data: null, error: err };
    }
  },

  // Get user's reports (reports made by user)
  async getUserReports(userId: string) {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          id,
          reason,
          description,
          severity,
          status,
          created_at,
          reported_user:users!reports_reported_user_id_fkey(id, first_name, last_name)
        `)
        .eq('reporter_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user reports:', error);
        return { data: [], error };
      }

      return { data: data || [], error: null };
    } catch (err) {
      console.error('Unexpected error in getUserReports:', err);
      return { data: [], error: err };
    }
  }
};

// Block service functions
export const blockService = {
  // Block a user completely (global block)
  async blockUserGlobally(blockerId: string, blockedUserId: string, conversationId?: string) {
    try {
      console.log('🚫 Starting global user block:', { blockerId, blockedUserId, conversationId });

      // Validate input parameters
      if (!blockerId || !blockedUserId) {
        console.error('❌ Invalid parameters: blockerId and blockedUserId are required');
        return { success: false, error: 'معاملات غير صحيحة: معرف الحاظر والمحظور مطلوبان' };
      }

      if (blockerId === blockedUserId) {
        console.error('❌ User cannot block themselves');
        return { success: false, error: 'لا يمكن للمستخدم حظر نفسه' };
      }

      // Use safe block function to handle RLS and check existing blocks
      const { data: blockResult, error: blockError } = await supabase
        .rpc('safe_block_user', {
          p_blocker_user_id: blockerId,
          p_blocked_user_id: blockedUserId,
          p_conversation_id: conversationId || null,
          p_block_type: 'global'
        })
        .single();

      if (blockError) {
        console.error('❌ Error in safe_block_user:', blockError);
        return { success: false, error: 'خطأ في حظر المستخدم' };
      }

      if (!blockResult.success) {
        console.log('⚠️ Block operation result:', blockResult.message);
        if (blockResult.was_already_blocked) {
          console.log('✅ User was already blocked, treating as success');
          return { success: true, data: { id: blockResult.block_id }, message: 'المستخدم محظور بالفعل' };
        } else {
          return { success: false, error: blockResult.message };
        }
      }

      console.log('✅ Block operation completed:', {
        blockId: blockResult.block_id,
        message: blockResult.message,
        wasAlreadyBlocked: blockResult.was_already_blocked
      });

      // Update conversation status if conversation ID is provided
      if (conversationId) {
        const { error: conversationError } = await supabase
          .from('conversations')
          .update({
            status: 'blocked',
            updated_at: new Date().toISOString()
          })
          .eq('id', conversationId);

        if (conversationError) {
          console.error('⚠️ Error updating conversation status:', conversationError);
          // Don't return error here - the global block is more important
        } else {
          console.log('✅ Conversation status updated to blocked');
        }
      }

      console.log('🎉 User blocked globally successfully');
      return { success: true, error: null, data: { id: blockResult.block_id } };
    } catch (err) {
      console.error('💥 Unexpected error in blockUserGlobally:', err);
      return { success: false, error: 'خطأ غير متوقع أثناء حظر المستخدم' };
    }
  },

  // Clean up inconsistent block records (utility function)
  async cleanupBlockRecords(blockerId: string, blockedUserId: string) {
    try {
      console.log('🧹 Cleaning up block records for:', { blockerId, blockedUserId });

      // Get all block records for this pair
      const { data: allBlocks, error: fetchError } = await supabase
        .from('user_blocks')
        .select('*')
        .eq('blocker_id', blockerId)
        .eq('blocked_user_id', blockedUserId);

      if (fetchError) {
        console.error('❌ Error fetching block records:', fetchError);
        return { success: false, error: 'خطأ في جلب سجلات الحظر' };
      }

      if (!allBlocks || allBlocks.length === 0) {
        console.log('✅ No block records found to clean up');
        return { success: true, message: 'لا توجد سجلات حظر للتنظيف' };
      }

      console.log(`📊 Found ${allBlocks.length} block record(s):`, allBlocks);

      // If there are multiple records, keep only the most recent one and deactivate others
      if (allBlocks.length > 1) {
        const sortedBlocks = allBlocks.sort((a, b) =>
          new Date(b.updated_at || b.blocked_at).getTime() -
          new Date(a.updated_at || a.blocked_at).getTime()
        );

        const mostRecent = sortedBlocks[0];
        const toDeactivate = sortedBlocks.slice(1);

        // Deactivate older records
        for (const block of toDeactivate) {
          await supabase
            .from('user_blocks')
            .update({ status: 'inactive', updated_at: new Date().toISOString() })
            .eq('id', block.id);
        }

        console.log(`✅ Deactivated ${toDeactivate.length} older block record(s)`);
        console.log('✅ Kept most recent record:', mostRecent);
      }

      return { success: true, message: 'تم تنظيف سجلات الحظر بنجاح' };
    } catch (err) {
      console.error('💥 Unexpected error in cleanupBlockRecords:', err);
      return { success: false, error: 'خطأ غير متوقع أثناء تنظيف سجلات الحظر' };
    }
  },

  // Block a user in a conversation (legacy method - now calls global block)
  async blockUserInConversation(conversationId: string, blockerId: string, blockedUserId: string) {
    return this.blockUserGlobally(blockerId, blockedUserId, conversationId);
  },

  // Check if user is blocked globally
  async isUserBlockedGlobally(blockerId: string, blockedUserId: string) {
    try {
      const { data, error } = await supabase
        .rpc('check_active_block', {
          p_blocker_user_id: blockerId,
          p_blocked_user_id: blockedUserId
        })
        .single();

      if (error) {
        console.error('Error checking global block status:', error);
        return { isBlocked: false, error };
      }

      return { isBlocked: data?.block_exists || false, error: null };
    } catch (err) {
      console.error('Unexpected error in isUserBlockedGlobally:', err);
      return { isBlocked: false, error: err };
    }
  },

  // Check if user is blocked by another user (for message delivery status)
  async isUserBlockedByRecipient(senderId: string, recipientId: string) {
    try {
      const { data, error } = await supabase
        .from('user_blocks')
        .select('id')
        .eq('blocker_id', recipientId)
        .eq('blocked_user_id', senderId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking if user is blocked:', error);
        return { isBlocked: false, error };
      }

      return { isBlocked: !!data, error: null };
    } catch (err) {
      console.error('Unexpected error checking block status:', err);
      return { isBlocked: false, error: err };
    }
  },

  // Check if user is blocked in conversation (checks both conversation status and global blocks)
  async isUserBlockedInConversation(conversationId: string, userId: string) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('status, user1_id, user2_id')
        .eq('id', conversationId)
        .single();

      if (error) {
        console.error('Error checking conversation status:', error);
        return { isBlocked: false, error };
      }

      // If conversation is blocked, check if this user is involved
      if (data?.status === 'blocked') {
        const isInvolved = data.user1_id === userId || data.user2_id === userId;
        return { isBlocked: isInvolved, error: null };
      }

      return { isBlocked: false, error: null };
    } catch (err) {
      console.error('Unexpected error in isUserBlockedInConversation:', err);
      return { isBlocked: false, error: err };
    }
  },

  // Unblock user globally
  async unblockUserGlobally(blockerId: string, blockedUserId: string, conversationId?: string) {
    try {
      console.log('🔓 Starting global user unblock:', { blockerId, blockedUserId, conversationId });

      // Validate input parameters
      if (!blockerId || !blockedUserId) {
        console.error('❌ Invalid parameters: blockerId and blockedUserId are required');
        return { success: false, error: 'معاملات غير صحيحة: معرف الحاظر والمحظور مطلوبان' };
      }

      // Use safe unblock function to handle RLS
      const { data: unblockResult, error: unblockError } = await supabase
        .rpc('safe_unblock_user', {
          p_blocker_user_id: blockerId,
          p_blocked_user_id: blockedUserId
        })
        .single();

      if (unblockError) {
        console.error('❌ Error in safe_unblock_user:', unblockError);
        return { success: false, error: 'خطأ في إلغاء حظر المستخدم' };
      }

      if (!unblockResult.success) {
        console.log('⚠️ Unblock operation result:', unblockResult.message);
        return { success: false, error: unblockResult.message };
      }

      console.log('✅ Unblock operation completed:', {
        message: unblockResult.message,
        wasBlocked: unblockResult.was_blocked
      });

      if (globalUnblockError) {
        console.error('❌ Error removing global block record:', globalUnblockError);
        return { success: false, error: 'فشل في إلغاء الحظر الشامل' };
      }

      console.log('✅ Global block record deactivated:', unblockResult);

      // Update conversation status if conversation ID is provided
      if (conversationId) {
        const { error: conversationError } = await supabase
          .from('conversations')
          .update({
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', conversationId);

        if (conversationError) {
          console.error('⚠️ Error unblocking conversation:', conversationError);
          // Don't return error here - the global unblock is more important
        } else {
          console.log('✅ Conversation status updated to active');
        }
      }

      console.log('🎉 User unblocked globally successfully');
      return { success: true, error: null, data: unblockResult };
    } catch (err) {
      console.error('💥 Unexpected error in unblockUserGlobally:', err);
      return { success: false, error: 'خطأ غير متوقع أثناء إلغاء حظر المستخدم' };
    }
  },

  // Unblock user in conversation (legacy method - now calls global unblock)
  async unblockUserInConversation(conversationId: string) {
    try {
      // Get conversation details to find the users involved
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('user1_id, user2_id')
        .eq('id', conversationId)
        .single();

      if (convError || !conversation) {
        console.error('Error getting conversation details:', convError);
        return { success: false, error: convError };
      }

      // For now, we'll just unblock the conversation without knowing who initiated the block
      // In a real scenario, we'd need to track who blocked whom
      const { error } = await supabase
        .from('conversations')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (error) {
        console.error('Error unblocking conversation:', error);
        return { success: false, error };
      }

      return { success: true, error: null };
    } catch (err) {
      console.error('Unexpected error in unblockUserInConversation:', err);
      return { success: false, error: err };
    }
  },

  // Get all users blocked by a specific user
  async getBlockedUsers(blockerId: string) {
    try {
      const { data, error } = await supabase
        .from('user_blocks')
        .select(`
          *,
          blocked_user:users!user_blocks_blocked_user_id_fkey(
            id, first_name, last_name, email, profile_picture
          )
        `)
        .eq('blocker_id', blockerId)
        .eq('status', 'active')
        .order('blocked_at', { ascending: false });

      if (error) {
        console.error('Error getting blocked users:', error);
        return { data: [], error };
      }

      return { data: data || [], error: null };
    } catch (err) {
      console.error('Unexpected error in getBlockedUsers:', err);
      return { data: [], error: err };
    }
  }
};

// Enhanced delete service functions
export const deleteService = {

  // Delete Chat completely (for both users)
  async deleteConversationCompletely(conversationId: string) {
    try {
      // First delete all messages in the conversation
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

      if (messagesError) {
        console.error('Error deleting messages:', messagesError);
        return { success: false, error: messagesError, type: 'complete' };
      }

      // Then delete the conversation
      const { error: conversationError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (conversationError) {
        console.error('Error deleting conversation:', conversationError);
        return { success: false, error: conversationError, type: 'complete' };
      }

      console.log('Conversation deleted completely:', conversationId);
      return { success: true, error: null, type: 'complete' };
    } catch (err) {
      console.error('Unexpected error in deleteConversationCompletely:', err);
      return { success: false, error: err, type: 'complete' };
    }
  },

  // Check if user can Delete Chat (admin or participant)
  async canUserDeleteConversation(conversationId: string, userId: string) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('user1_id, user2_id')
        .eq('id', conversationId)
        .single();

      if (error) {
        console.error('Error checking conversation ownership:', error);
        return { canDelete: false, error };
      }

      const canDelete = data?.user1_id === userId || data?.user2_id === userId;
      return { canDelete, error: null };
    } catch (err) {
      console.error('Unexpected error in canUserDeleteConversation:', err);
      return { canDelete: false, error: err };
    }
  }
};

// Admin service functions
export const adminService = {
  // Get pending messages for moderation
  async getPendingMessages() {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users(id, first_name, last_name),
        conversation:conversations(
          user1:users!user1_id(id, first_name, last_name),
          user2:users!user2_id(id, first_name, last_name)
        )
      `)
      .eq('moderation_status', 'pending')
      .order('created_at', { ascending: false });

    return { data, error };
  },

  // Moderate message
  async moderateMessage(messageId: string, status: 'approved' | 'rejected', reason?: string) {
    const { data, error } = await supabase
      .from('messages')
      .update({
        moderation_status: status,
        moderation_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .select()
      .single();

    return { data, error };
  },

  // Get reports
  async getReports() {
    const { data, error } = await supabase
      .from('reports')
      .select(`
        *,
        reported_user:users!reports_reported_user_id_fkey(id, first_name, last_name),
        reporter:users!reports_reporter_id_fkey(id, first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    return { data, error };
  },

  // Update report status
  async updateReportStatus(reportId: string, status: string, adminNotes?: string) {
    const { data, error } = await supabase
      .from('reports')
      .update({
        status,
        admin_notes: adminNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', reportId)
      .select()
      .single();

    return { data, error };
  }
};

// Site Text Management functions
export const textService = {
  // Get all texts for a specific language
  async getTexts(language: string = 'ar') {
    const { data, error } = await supabase
      .from('site_texts')
      .select('*')
      .eq('language', language)
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('text_key', { ascending: true });

    return { data, error };
  },

  // Get texts by category
  async getTextsByCategory(category: string, language: string = 'ar') {
    const { data, error } = await supabase
      .from('site_texts')
      .select('*')
      .eq('category', category)
      .eq('language', language)
      .eq('is_active', true)
      .order('text_key', { ascending: true });

    return { data, error };
  },

  // Get a specific text by key and language
  async getText(textKey: string, language: string = 'ar') {
    const { data, error } = await supabase
      .from('site_texts')
      .select('*')
      .eq('text_key', textKey)
      .eq('language', language)
      .eq('is_active', true)
      .single();

    return { data, error };
  },

  // Get all texts formatted for i18next
  async getTextsForI18n(language: string = 'ar') {
    const { data, error } = await supabase
      .from('site_texts')
      .select('text_key, text_value')
      .eq('language', language)
      .eq('is_active', true);

    if (error) return { data: null, error };

    // Convert to nested object structure for i18next
    const texts: any = {};
    data?.forEach((item) => {
      const keys = item.text_key.split('.');
      let current = texts;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = item.text_value;
    });

    return { data: texts, error: null };
  },

  // Create or update a text
  async upsertText(textData: Partial<SiteText>) {
    const { data, error } = await supabase
      .from('site_texts')
      .upsert(textData, {
        onConflict: 'text_key,language'
      })
      .select()
      .single();

    return { data, error };
  },

  // Update a text
  async updateText(id: string, updates: Partial<SiteText>) {
    const { data, error } = await supabase
      .from('site_texts')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  // Delete a text (soft delete by setting is_active to false)
  async deleteText(id: string) {
    const { data, error } = await supabase
      .from('site_texts')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  // Search texts
  async searchTexts(query: string, language?: string, category?: string) {
    let queryBuilder = supabase
      .from('site_texts')
      .select('*')
      .eq('is_active', true);

    if (language) {
      queryBuilder = queryBuilder.eq('language', language);
    }

    if (category) {
      queryBuilder = queryBuilder.eq('category', category);
    }

    queryBuilder = queryBuilder.or(`text_key.ilike.%${query}%,text_value.ilike.%${query}%,description.ilike.%${query}%`);

    const { data, error } = await queryBuilder
      .order('category', { ascending: true })
      .order('text_key', { ascending: true });

    return { data, error };
  },

  // Get all categories
  async getCategories() {
    const { data, error } = await supabase
      .from('site_texts')
      .select('category')
      .eq('is_active', true)
      .order('category', { ascending: true });

    if (error) return { data: null, error };

    const categories = [...new Set(data?.map(item => item.category))];
    return { data: categories, error: null };
  },

  // Get text change logs
  async getTextChangeLogs(textId?: string, limit: number = 50) {
    let queryBuilder = supabase
      .from('text_change_logs')
      .select(`
        *,
        site_texts(text_key, category, language)
      `)
      .order('changed_at', { ascending: false })
      .limit(limit);

    if (textId) {
      queryBuilder = queryBuilder.eq('text_id', textId);
    }

    const { data, error } = await queryBuilder;
    return { data, error };
  }
};

// تم نقل مراقب حالة المصادقة إلى AuthContext لتجنب التكرار والتداخل

// تم نقل دالة isSessionValid إلى JWTManager لتجنب التكرار

// نظام تجديد JWT محسن مع معالجة شاملة للأخطاء
class JWTManager {
  private refreshPromise: Promise<boolean> | null = null;
  private lastRefreshTime: number = 0;
  private refreshCooldown: number = 30000; // 30 ثانية
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // 1 ثانية

  // تجديد الجلسة مع منع التجديد المتعدد المتزامن
  async refreshSession(forceRefresh: boolean = false): Promise<boolean> {
    try {
      const now = Date.now();

      // منع التجديد المتكرر خلال فترة قصيرة
      if (!forceRefresh && (now - this.lastRefreshTime) < this.refreshCooldown) {
        console.log('⏭️ Refresh cooldown active, skipping');
        return true;
      }

      // إذا كان هناك تجديد جاري، انتظر نتيجته
      if (this.refreshPromise) {
        console.log('⏳ Refresh already in progress, waiting...');
        return await this.refreshPromise;
      }

      // بدء عملية التجديد
      this.refreshPromise = this.performRefresh();
      const result = await this.refreshPromise;
      this.refreshPromise = null;

      if (result) {
        this.lastRefreshTime = now;
      }

      return result;
    } catch (error) {
      this.refreshPromise = null;
      console.error('❌ Error in refreshSession:', error);
      return false;
    }
  }

  // تنفيذ التجديد الفعلي مع إعادة المحاولة
  private async performRefresh(): Promise<boolean> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempting session refresh (${attempt}/${this.maxRetries})`);

        const { data, error } = await supabase.auth.refreshSession();

        if (error) {
          console.error(`❌ Refresh attempt ${attempt} failed:`, error);

          // إذا كان الخطأ متعلق بانتهاء صلاحية refresh token، لا نعيد المحاولة
          if (error.message?.includes('refresh_token_not_found') ||
              error.message?.includes('invalid_grant')) {
            console.log('🔑 Refresh token invalid, signing out');
            await this.handleInvalidRefreshToken();
            return false;
          }

          // إعادة المحاولة للأخطاء الأخرى
          if (attempt < this.maxRetries) {
            await this.delay(this.retryDelay * attempt);
            continue;
          }

          return false;
        }

        if (data.session) {
          console.log('✅ Session refreshed successfully');
          return true;
        } else {
          console.warn('⚠️ No session returned from refresh');
          return false;
        }
      } catch (error) {
        console.error(`❌ Refresh attempt ${attempt} error:`, error);
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }

    console.error('❌ All refresh attempts failed');
    return false;
  }

  // معالجة refresh token غير صالح
  private async handleInvalidRefreshToken(): Promise<void> {
    try {
      // تسجيل خروج صامت
      await supabase.auth.signOut({ scope: 'local' });

      // تنظيف البيانات المحلية
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();

      // إشعار التطبيق بانتهاء الجلسة
      window.dispatchEvent(new CustomEvent('session-expired', {
        detail: { reason: 'invalid_refresh_token' }
      }));
    } catch (error) {
      console.error('❌ Error handling invalid refresh token:', error);
    }
  }

  // تأخير للإعادة المحاولة
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // فحص صحة الجلسة الحالية
  async isSessionValid(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        return false;
      }

      // فحص انتهاء الصلاحية
      const expiresAt = session.expires_at;
      if (!expiresAt) {
        return false;
      }

      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt - now;

      // إذا كان الرمز سينتهي خلال 5 دقائق، اعتبره غير صالح
      return timeUntilExpiry > 300;
    } catch (error) {
      console.error('❌ Error checking session validity:', error);
      return false;
    }
  }

  // تجديد استباقي للجلسة
  async proactiveRefresh(): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.expires_at) {
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = session.expires_at - now;

      // إذا كان الرمز سينتهي خلال 10 دقائق، جدده
      if (timeUntilExpiry <= 600 && timeUntilExpiry > 0) {
        console.log(`🔄 Proactive refresh: ${timeUntilExpiry}s until expiry`);
        await this.refreshSession(true);
      }
    } catch (error) {
      console.error('❌ Error in proactive refresh:', error);
    }
  }
}

// إنشاء مثيل مدير JWT
const jwtManager = new JWTManager();

// نظام إصلاح مشاكل النشر
class ProductionFixManager {
  private isProduction = import.meta.env.PROD;
  private hasRunInitialFix = false;

  // تشغيل إصلاحات النشر عند التحميل
  async runProductionFixes(): Promise<void> {
    if (!this.isProduction || this.hasRunInitialFix) {
      return;
    }

    console.log('🔧 Running production fixes...');
    this.hasRunInitialFix = true;

    try {
      // إصلاح 1: مسح البيانات التالفة من localStorage
      await this.clearCorruptedStorage();

      // إصلاح 2: إعادة تهيئة اتصال Supabase
      await this.reinitializeSupabaseConnection();

      // إصلاح 3: فحص وإصلاح JWT
      await this.fixJWTIssues();

      console.log('✅ Production fixes completed');
    } catch (error) {
      console.error('❌ Error in production fixes:', error);
    }
  }

  // مسح البيانات التالفة
  private async clearCorruptedStorage(): Promise<void> {
    try {
      const keysToCheck = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('admin'))) {
          keysToCheck.push(key);
        }
      }

      let clearedCount = 0;
      keysToCheck.forEach(key => {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            // تجاهل مفاتيح المشرفين التي لا تحتاج لتحليل JSON
            if (key === 'admin_session_token' || key === 'device_id') {
              // هذه المفاتيح تحتوي على نصوص عادية وليس JSON
              // فقط تحقق من أنها ليست فارغة
              if (value.trim().length > 0) {
                return; // المفتاح صالح، لا تحذفه
              }
            }

            // اختبار صحة JSON للمفاتيح الأخرى
            if (key !== 'admin_session_token' && key !== 'device_id') {
              JSON.parse(value);
            }

            // فحص إضافي للرموز المنتهية الصلاحية
            if (key.includes('supabase.auth.token')) {
              const parsed = JSON.parse(value);
              if (parsed.expires_at && new Date(parsed.expires_at * 1000) < new Date()) {
                localStorage.removeItem(key);
                clearedCount++;
                console.log('🗑️ Removed expired token from storage');
              }
            }
          }
        } catch (parseError) {
          // لا تحذف مفاتيح المشرفين حتى لو فشل تحليل JSON
          if (key === 'admin_session_token' || key === 'device_id') {
            console.log(`ℹ️ Skipping admin key (not JSON): ${key}`);
            return;
          }

          localStorage.removeItem(key);
          clearedCount++;
          console.log(`🗑️ Removed corrupted key: ${key}`);
        }
      });

      if (clearedCount > 0) {
        console.log(`🧹 Cleared ${clearedCount} corrupted/expired items from storage`);
      }
    } catch (error) {
      console.error('❌ Error clearing corrupted storage:', error);
    }
  }

  // إعادة تهيئة اتصال Supabase
  private async reinitializeSupabaseConnection(): Promise<void> {
    try {
      // فحص الاتصال الأساسي
      const { error } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      if (error) {
        console.warn('⚠️ Supabase connection issue detected:', error.message);

        // إذا كان الخطأ متعلق بـ JWT، نظف البيانات
        if (error.message?.includes('JWT') || error.code === 'PGRST301') {
          localStorage.removeItem('supabase.auth.token');
          console.log('🔑 Cleared invalid JWT from production storage');
        }
      } else {
        console.log('✅ Supabase connection verified');
      }
    } catch (error) {
      console.error('❌ Error reinitializing Supabase connection:', error);
    }
  }

  // إصلاح مشاكل JWT
  private async fixJWTIssues(): Promise<void> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.warn('⚠️ JWT session error in production:', error.message);

        // مسح البيانات التالفة
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.clear();

        console.log('🔑 Cleared JWT data due to session error');
        return;
      }

      if (session) {
        // فحص انتهاء الصلاحية
        const expiresAt = session.expires_at;
        if (expiresAt) {
          const now = Math.floor(Date.now() / 1000);
          const timeUntilExpiry = expiresAt - now;

          if (timeUntilExpiry < 300) { // أقل من 5 دقائق
            console.log('🔄 JWT expires soon, refreshing in production...');

            const { error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
              console.error('❌ Failed to refresh JWT in production:', refreshError);
              localStorage.removeItem('supabase.auth.token');
            } else {
              console.log('✅ JWT refreshed successfully in production');
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error fixing JWT issues:', error);
    }
  }

  // فحص دوري لمشاكل النشر
  startPeriodicChecks(): void {
    if (!this.isProduction) return;

    // فحص كل 10 دقائق
    setInterval(async () => {
      try {
        await this.fixJWTIssues();
      } catch (error) {
        console.error('❌ Error in periodic production check:', error);
      }
    }, 10 * 60 * 1000);
  }
}

// إنشاء مدير إصلاحات النشر
const productionFixManager = new ProductionFixManager();

// تشغيل الإصلاحات عند التحميل
if (import.meta.env.PROD) {
  productionFixManager.runProductionFixes();
  productionFixManager.startPeriodicChecks();
}

// إضافة أدوات التشخيص للـ console (للمطورين)
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.rezgeDiagnostics = {
    // فحص سريع للمشاكل
    quickCheck: async () => {
      console.log('🔍 Running Rezge Quick Diagnostics...');

      try {
        // فحص الجلسة
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('🔑 Session Status:', {
          hasSession: !!session,
          error: error?.message,
          expiresAt: session?.expires_at ? new Date(session.expires_at * 1000) : null,
          userId: session?.user?.id
        });

        // فحص الاتصال
        const startTime = Date.now();
        const { error: connectionError } = await supabase
          .from('users')
          .select('count')
          .limit(1);
        const responseTime = Date.now() - startTime;

        console.log('🌐 Connection Status:', {
          connected: !connectionError,
          responseTime: `${responseTime}ms`,
          error: connectionError?.message
        });

        // فحص التخزين المحلي
        const storageInfo = {
          supabaseToken: !!localStorage.getItem('supabase.auth.token'),
          adminToken: !!localStorage.getItem('admin_session_token'),
          adminAccount: !!localStorage.getItem('admin_account'),
          totalItems: localStorage.length
        };
        console.log('💾 Storage Status:', storageInfo);

        // فحص البيئة
        console.log('🏗️ Environment:', {
          mode: import.meta.env.MODE,
          prod: import.meta.env.PROD,
          dev: import.meta.env.DEV,
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL?.substring(0, 30) + '...'
        });

      } catch (error) {
        console.error('❌ Diagnostics Error:', error);
      }
    },

    // إصلاح سريع للمشاكل الشائعة
    quickFix: async () => {
      console.log('🔧 Running Rezge Quick Fix...');

      try {
        // مسح البيانات التالفة
        let clearedCount = 0;
        const keysToCheck = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('admin'))) {
            keysToCheck.push(key);
          }
        }

        keysToCheck.forEach(key => {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              // تجاهل مفاتيح المشرفين التي لا تحتاج لتحليل JSON
              if (key === 'admin_session_token' || key === 'device_id') {
                return; // لا تحذف هذه المفاتيح
              }
              JSON.parse(value);
            }
          } catch {
            // لا تحذف مفاتيح المشرفين حتى لو فشل تحليل JSON
            if (key === 'admin_session_token' || key === 'device_id') {
              return;
            }
            localStorage.removeItem(key);
            clearedCount++;
          }
        });

        console.log(`🧹 Cleared ${clearedCount} corrupted items`);

        // محاولة تجديد الجلسة
        const { data, error } = await supabase.auth.refreshSession();
        if (!error && data.session) {
          console.log('✅ Session refreshed successfully');
        } else if (error) {
          console.log('⚠️ Session refresh failed:', error.message);
        }

        console.log('✅ Quick fix completed');
      } catch (error) {
        console.error('❌ Quick fix error:', error);
      }
    },

    // إعادة تعيين كاملة
    fullReset: () => {
      console.log('🔄 Performing full reset...');

      // مسح جميع البيانات
      localStorage.clear();
      sessionStorage.clear();

      // إعادة تحميل الصفحة
      window.location.reload();
    },

    // عرض معلومات مفصلة
    detailedInfo: async () => {
      const { runQuickDiagnostics } = await import('../utils/productionDiagnostics');
      await runQuickDiagnostics();
    }
  };

  console.log(`
🎯 Rezge Diagnostics Tools Available:
- rezgeDiagnostics.quickCheck() - فحص سريع للمشاكل
- rezgeDiagnostics.quickFix() - إصلاح سريع
- rezgeDiagnostics.fullReset() - إعادة تعيين كاملة
- rezgeDiagnostics.detailedInfo() - معلومات مفصلة
  `);
}

// دالة مبسطة للاستخدام الخارجي
export const refreshSessionIfNeeded = async (): Promise<boolean> => {
  const isValid = await jwtManager.isSessionValid();

  if (isValid) {
    console.log('✅ Session is still valid, no refresh needed');
    return true;
  }

  console.log('🔄 Session needs refresh, refreshing...');
  return await jwtManager.refreshSession();
};

// دالة للتجديد الاستباقي
export const proactiveSessionRefresh = async (): Promise<void> => {
  await jwtManager.proactiveRefresh();
};

// دالة للتحقق من صحة الجلسة
export const isSessionValid = async (): Promise<boolean> => {
  return await jwtManager.isSessionValid();
};

// دالة إعادة المحاولة المحسنة للطلبات الفاشلة
export const retrySupabaseRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries = 5, // زيادة عدد المحاولات
  baseDelay = 300 // تقليل التأخير الأولي
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error: any) {
      const isLastAttempt = i === maxRetries - 1;
      const isNetworkError = error.message?.includes('Failed to fetch') ||
                            error.message?.includes('ERR_CONNECTION_CLOSED') ||
                            error.message?.includes('NetworkError') ||
                            error.message?.includes('TypeError') ||
                            error.name === 'AbortError';

      if (isLastAttempt) {
        // تسجيل صامت للفشل النهائي
        console.log(`⚠️ فشل في جميع المحاولات (${maxRetries}):`, error.message);
        throw error;
      }

      if (isNetworkError) {
        // تأخير أقل وأذكى
        const delay = Math.min(baseDelay * Math.pow(1.5, i), 3000); // حد أقصى 3 ثواني
        console.log(`🔄 إعادة محاولة ${i + 1}/${maxRetries} خلال ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // إذا لم يكن خطأ شبكة، ارمي الخطأ فوراً
      throw error;
    }
  }

  throw new Error('فشل في جميع المحاولات');
};

// معالج أخطاء Supabase محسن مع نظام JWT المتقدم
export const handleSupabaseError = async (error: any, context?: string): Promise<void> => {
  const errorMessage = error?.message || 'خطأ غير معروف';
  const errorContext = context ? `[${context}]` : '';

  // استيراد معالج JWT (تجنب circular imports)
  const { handleJWTError } = await import('../utils/jwtErrorHandler');

  // معالجة أخطاء JWT باستخدام النظام المحسن
  if (errorMessage.includes('JWT expired') ||
      errorMessage.includes('Invalid token') ||
      errorMessage.includes('refresh_token_not_found') ||
      error?.code === 'PGRST301') {

    console.log(`🔑 ${errorContext} JWT error detected, using advanced handler`);

    try {
      const result = await handleJWTError(error, context || 'unknown', 'regular');

      if (result.shouldNotifyUser) {
        // إشعار التطبيق بالنتيجة
        window.dispatchEvent(new CustomEvent('jwt-error-handled', {
          detail: {
            result,
            context,
            originalError: error
          }
        }));
      }

      console.log(`🔑 JWT error handled: ${result.action} - ${result.message}`);
      return;
    } catch (handlerError) {
      console.error(`❌ Error in JWT handler:`, handlerError);
      // fallback إلى المعالجة التقليدية
    }
  }

  // معالجة أخطاء الشبكة
  if (errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('ERR_CONNECTION_CLOSED') ||
      errorMessage.includes('NetworkError') ||
      error?.name === 'AbortError') {

    console.log(`🌐 ${errorContext} مشكلة اتصال مؤقتة: ${errorMessage}`);

    // إشعار مدير الاتصال
    window.dispatchEvent(new CustomEvent('supabase-connection-error', {
      detail: { error, context }
    }));
    return;
  }

  // معالجة أخطاء الصلاحيات
  if (errorMessage.includes('RLS') ||
      errorMessage.includes('policy') ||
      errorMessage.includes('permission denied')) {
    console.warn(`🔒 ${errorContext} Permission error: ${errorMessage}`);
    return;
  }

  // معالجة أخطاء قاعدة البيانات الشائعة
  if (error?.code) {
    switch (error.code) {
      case 'PGRST116':
        console.log(`📭 ${errorContext} No data found (empty result)`);
        break;
      case '23505':
        console.warn(`🔄 ${errorContext} Duplicate key violation`);
        break;
      case '23503':
        console.warn(`🔗 ${errorContext} Foreign key constraint violation`);
        break;
      case '42P01':
        console.error(`🗄️ ${errorContext} Table does not exist`);
        break;
      default:
        console.warn(`❓ ${errorContext} Database error [${error.code}]: ${errorMessage}`);
    }
    return;
  }

  // تسجيل الأخطاء الأخرى بصمت
  console.log(`⚠️ ${errorContext} Supabase error:`, {
    message: errorMessage,
    details: error?.details,
    hint: error?.hint
  });
};

export default supabase;
