import { supabase } from '../lib/supabase';

/**
 * أدوات إصلاح مشاكل المصادقة
 */

export interface AuthFixResult {
  success: boolean;
  message: string;
  details?: any;
}

/**
 * إعادة تعيين كلمة مرور مستخدم في Supabase Auth
 */
export async function resetUserPassword(_email: string, newPassword: string): Promise<AuthFixResult> {
  try {
    // محاولة تسجيل الدخول كمدير لإعادة تعيين كلمة المرور
    const { data, error } = await supabase.auth.admin.updateUserById(
      'user-id', // سيتم تحديثه
      { password: newPassword }
    );

    if (error) {
      return {
        success: false,
        message: `فشل في إعادة تعيين كلمة المرور: ${error.message}`,
        details: error
      };
    }

    return {
      success: true,
      message: 'تم إعادة تعيين كلمة المرور بنجاح',
      details: data
    };
  } catch (error: any) {
    return {
      success: false,
      message: `خطأ غير متوقع: ${error.message}`,
      details: error
    };
  }
}

/**
 * إنشاء مستخدم جديد مباشرة في Supabase Auth
 */
export async function createUserDirectly(email: string, password: string, userData: any): Promise<AuthFixResult> {
  try {
    // إنشاء المستخدم في Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined, // لا نريد إرسال إيميل تأكيد
        data: userData
      }
    });

    if (authError) {
      return {
        success: false,
        message: `فشل في إنشاء المستخدم: ${authError.message}`,
        details: authError
      };
    }

    if (!authData.user) {
      return {
        success: false,
        message: 'لم يتم إرجاع بيانات المستخدم',
        details: authData
      };
    }

    // إنشاء الملف الشخصي في جدول users
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        password_hash: 'handled_by_supabase_auth',
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        phone: userData.phone || '',
        age: userData.age || null,
        gender: userData.gender || null,
        city: userData.city || '',
        marital_status: userData.marital_status || null,
        verified: false,
        status: 'active',
        profile_visibility: 'public',
        show_phone: false,
        show_email: false,
        allow_messages: true,
        family_can_view: false,
        two_factor_enabled: false,
        login_notifications: true,
        message_notifications: true
      });

    if (profileError) {
      return {
        success: false,
        message: `فشل في إنشاء الملف الشخصي: ${profileError.message}`,
        details: profileError
      };
    }

    return {
      success: true,
      message: 'تم إنشاء المستخدم بنجاح',
      details: authData
    };
  } catch (error: any) {
    return {
      success: false,
      message: `خطأ غير متوقع: ${error.message}`,
      details: error
    };
  }
}

/**
 * اختبار تسجيل الدخول
 */
export async function testLogin(email: string, password: string): Promise<AuthFixResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return {
        success: false,
        message: `فشل تسجيل الدخول: ${error.message}`,
        details: error
      };
    }

    if (!data.user) {
      return {
        success: false,
        message: 'لم يتم إرجاع بيانات المستخدم',
        details: data
      };
    }

    // اختبار تحميل الملف الشخصي
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      return {
        success: false,
        message: `نجح تسجيل الدخول لكن فشل تحميل الملف الشخصي: ${profileError.message}`,
        details: { auth: data, profileError }
      };
    }

    return {
      success: true,
      message: 'تم تسجيل الدخول وتحميل الملف الشخصي بنجاح',
      details: { auth: data, profile }
    };
  } catch (error: any) {
    return {
      success: false,
      message: `خطأ غير متوقع: ${error.message}`,
      details: error
    };
  }
}

/**
 * فحص حالة المستخدم
 */
export async function checkUserStatus(email: string): Promise<AuthFixResult> {
  try {
    // فحص في auth.users
    const { data: authUsers, error: authError } = await supabase
      .from('auth.users')
      .select('id, email, email_confirmed_at, created_at, last_sign_in_at')
      .eq('email', email);

    // فحص في جدول users
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, email, verified, status, created_at')
      .eq('email', email);

    return {
      success: true,
      message: 'تم فحص حالة المستخدم',
      details: {
        authUsers: authUsers || [],
        userProfile: userProfile || [],
        authError,
        profileError
      }
    };
  } catch (error: any) {
    return {
      success: false,
      message: `خطأ في فحص حالة المستخدم: ${error.message}`,
      details: error
    };
  }
}

/**
 * إصلاح شامل لمستخدم
 */
export async function fixUserCompletely(email: string, password: string, userData: any): Promise<AuthFixResult> {
  try {
    // 1. فحص حالة المستخدم الحالية
    const statusCheck = await checkUserStatus(email);
    console.log('حالة المستخدم:', statusCheck);

    // 2. محاولة تسجيل الدخول أولاً
    const loginTest = await testLogin(email, password);
    if (loginTest.success) {
      return {
        success: true,
        message: 'المستخدم يعمل بشكل صحيح بالفعل',
        details: loginTest.details
      };
    }

    // 3. إذا فشل تسجيل الدخول، ننشئ مستخدم جديد
    const createResult = await createUserDirectly(email, password, userData);
    
    return createResult;
  } catch (error: any) {
    return {
      success: false,
      message: `خطأ في الإصلاح الشامل: ${error.message}`,
      details: error
    };
  }
}
