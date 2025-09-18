/**
 * أدوات مزامنة البريد الإلكتروني بين Supabase Auth وقاعدة البيانات
 * تاريخ الإنشاء: 27-08-2025
 */

import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';

interface EmailSyncResult {
  success: boolean;
  message: string;
  details?: any;
  requiresReauth?: boolean;
}

interface EmailMismatch {
  userId: string;
  authEmail: string | null;
  dbEmail: string | null;
  mismatchType: 'auth_missing' | 'db_missing' | 'different_emails' | 'both_missing';
}

/**
 * فحص وجود Service Role Key
 */
export function hasServiceRoleKey(): boolean {
  return !!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
}

/**
 * إنشاء Admin Supabase Client
 */
export function createAdminClient() {
  const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('Service Role Key is required for admin operations');
  }

  return createClient(
    import.meta.env.VITE_SUPABASE_URL || 'https://sbtzngewizgeqzfbhfjy.supabase.co',
    serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

/**
 * فحص التطابق بين البريد في Auth وقاعدة البيانات
 */
export async function checkEmailSync(userId: string): Promise<EmailMismatch | null> {
  try {
    // جلب البريد من قاعدة البيانات
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    if (dbError) {
      console.error('Error fetching user from database:', dbError);
      return {
        userId,
        authEmail: null,
        dbEmail: null,
        mismatchType: 'db_missing'
      };
    }

    // جلب البريد من Auth
    let authEmail: string | null = null;
    try {
      if (hasServiceRoleKey()) {
        const adminSupabase = createAdminClient();
        const { data: authUser, error: authError } = await adminSupabase.auth.admin.getUserById(userId);
        
        if (!authError && authUser.user) {
          authEmail = authUser.user.email || null;
        }
      } else {
        // استخدام الجلسة الحالية إذا لم يكن Service Key متوفر
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.id === userId) {
          authEmail = user.email || null;
        }
      }
    } catch (authError) {
      console.error('Error fetching user from auth:', authError);
    }

    const dbEmail = dbUser.email;

    // تحديد نوع عدم التطابق
    if (!authEmail && !dbEmail) {
      return {
        userId,
        authEmail,
        dbEmail,
        mismatchType: 'both_missing'
      };
    } else if (!authEmail) {
      return {
        userId,
        authEmail,
        dbEmail,
        mismatchType: 'auth_missing'
      };
    } else if (!dbEmail) {
      return {
        userId,
        authEmail,
        dbEmail,
        mismatchType: 'db_missing'
      };
    } else if (authEmail !== dbEmail) {
      return {
        userId,
        authEmail,
        dbEmail,
        mismatchType: 'different_emails'
      };
    }

    // لا يوجد عدم تطابق
    return null;
  } catch (error) {
    console.error('Error checking email sync:', error);
    return {
      userId,
      authEmail: null,
      dbEmail: null,
      mismatchType: 'both_missing'
    };
  }
}

/**
 * مزامنة البريد الإلكتروني من قاعدة البيانات إلى Auth
 */
export async function syncEmailFromDbToAuth(userId: string, dbEmail: string): Promise<EmailSyncResult> {
  try {
    if (!hasServiceRoleKey()) {
      return {
        success: false,
        message: 'Service Role Key is required for email sync',
        details: 'Add VITE_SUPABASE_SERVICE_ROLE_KEY to your environment variables',
        requiresReauth: true
      };
    }

    const adminSupabase = createAdminClient();
    
    const { error } = await adminSupabase.auth.admin.updateUserById(userId, {
      email: dbEmail,
      email_confirm: true
    });

    if (error) {
      console.error('Failed to sync email to auth:', error);
      return {
        success: false,
        message: `Failed to sync email to auth: ${error.message}`,
        details: error,
        requiresReauth: true
      };
    }

    console.log('✅ Email synced from database to auth successfully');
    return {
      success: true,
      message: 'Email synced successfully',
      requiresReauth: false
    };
  } catch (error: any) {
    console.error('Error syncing email:', error);
    return {
      success: false,
      message: `Error syncing email: ${error.message}`,
      details: error,
      requiresReauth: true
    };
  }
}

/**
 * مزامنة البريد الإلكتروني من Auth إلى قاعدة البيانات
 */
export async function syncEmailFromAuthToDb(userId: string, authEmail: string): Promise<EmailSyncResult> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ 
        email: authEmail,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Failed to sync email to database:', error);
      return {
        success: false,
        message: `Failed to sync email to database: ${error.message}`,
        details: error
      };
    }

    console.log('✅ Email synced from auth to database successfully');
    return {
      success: true,
      message: 'Email synced successfully'
    };
  } catch (error: any) {
    console.error('Error syncing email:', error);
    return {
      success: false,
      message: `Error syncing email: ${error.message}`,
      details: error
    };
  }
}

/**
 * مزامنة تلقائية للبريد الإلكتروني
 * تحدد تلقائياً أي بريد هو الأحدث وتزامن الآخر
 */
export async function autoSyncEmail(userId: string): Promise<EmailSyncResult> {
  try {
    const mismatch = await checkEmailSync(userId);
    
    if (!mismatch) {
      return {
        success: true,
        message: 'Emails are already in sync'
      };
    }

    console.log('📧 Email mismatch detected:', mismatch);

    switch (mismatch.mismatchType) {
      case 'auth_missing':
        if (mismatch.dbEmail) {
          return await syncEmailFromDbToAuth(userId, mismatch.dbEmail);
        }
        break;
        
      case 'db_missing':
        if (mismatch.authEmail) {
          return await syncEmailFromAuthToDb(userId, mismatch.authEmail);
        }
        break;
        
      case 'different_emails':
        // في هذه الحالة، نفضل البريد من قاعدة البيانات لأنه الأحدث
        // (تم تحديثه عبر نظام تحديث البريد)
        if (mismatch.dbEmail) {
          console.log('🔄 Database email is newer, syncing to auth...');
          return await syncEmailFromDbToAuth(userId, mismatch.dbEmail);
        } else if (mismatch.authEmail) {
          console.log('🔄 Auth email is the only available, syncing to database...');
          return await syncEmailFromAuthToDb(userId, mismatch.authEmail);
        }
        break;
        
      case 'both_missing':
        return {
          success: false,
          message: 'Both auth and database emails are missing',
          requiresReauth: true
        };
    }

    return {
      success: false,
      message: 'Unable to determine sync direction',
      details: mismatch
    };
  } catch (error: any) {
    console.error('Error in auto sync:', error);
    return {
      success: false,
      message: `Auto sync failed: ${error.message}`,
      details: error
    };
  }
}

/**
 * فحص وإصلاح مشاكل البريد الإلكتروني للمستخدم الحالي
 */
export async function fixCurrentUserEmailIssues(): Promise<EmailSyncResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        success: false,
        message: 'No authenticated user found',
        requiresReauth: true
      };
    }

    return await autoSyncEmail(user.id);
  } catch (error: any) {
    console.error('Error fixing current user email issues:', error);
    return {
      success: false,
      message: `Failed to fix email issues: ${error.message}`,
      details: error
    };
  }
}

/**
 * التحقق من إمكانية تسجيل الدخول بالبريد المحدث
 */
export async function canLoginWithUpdatedEmail(email: string, password: string): Promise<{
  canLogin: boolean;
  updatedEmail?: string;
  error?: string;
}> {
  try {
    // التحقق من وجود Service Role Key
    if (!hasServiceRoleKey()) {
      return {
        canLogin: false,
        error: 'Service Role Key is required for email lookup during login'
      };
    }

    // استخدام Admin Client للبحث
    const adminSupabase = createAdminClient();

    // البحث عن المستخدم في قاعدة البيانات
    const { data: dbUser, error: dbError } = await adminSupabase
      .from('users')
      .select('email, id')
      .eq('email', email)
      .single();

    if (dbError || !dbUser) {
      return {
        canLogin: false,
        error: 'User not found in database'
      };
    }

    // محاولة تسجيل الدخول بالبريد من قاعدة البيانات
    const { data, error } = await supabase.auth.signInWithPassword({
      email: dbUser.email,
      password
    });

    if (error) {
      return {
        canLogin: false,
        error: error.message
      };
    }

    // تسجيل خروج فوري لتجنب تأثير الاختبار
    await supabase.auth.signOut();

    return {
      canLogin: true,
      updatedEmail: dbUser.email
    };
  } catch (error: any) {
    return {
      canLogin: false,
      error: error.message
    };
  }
}
