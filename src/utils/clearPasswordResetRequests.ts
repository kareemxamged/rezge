/**
 * أداة حذف طلبات إعادة تعيين كلمة المرور
 * تستخدم صلاحيات قاعدة البيانات المباشرة
 */

import { supabase } from '../lib/supabase';

export interface ClearPasswordResetResult {
  success: boolean;
  message: string;
  deletedCount?: number;
  userInfo?: {
    id: string;
    email: string;
    name: string;
  };
  error?: string;
}

/**
 * حذف طلبات إعادة تعيين كلمة المرور لإيميل محدد
 */
export async function clearPasswordResetRequests(email: string): Promise<ClearPasswordResetResult> {
  try {
    console.log(`🔍 البحث عن المستخدم: ${email}`);
    
    // البحث عن المستخدم في جدول users
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('email', email.toLowerCase())
      .single();
    
    if (userError) {
      if (userError.code === 'PGRST116') {
        return {
          success: false,
          message: 'المستخدم غير موجود في قاعدة البيانات',
          error: 'USER_NOT_FOUND'
        };
      }
      throw userError;
    }
    
    console.log(`✅ تم العثور على المستخدم: ${user.first_name} ${user.last_name}`);
    console.log(`📧 الإيميل: ${user.email}`);
    console.log(`🆔 معرف المستخدم: ${user.id}`);
    
    // فحص الطلبات الموجودة
    const { data: existingRequests, error: fetchError } = await supabase
      .from('password_reset_requests')
      .select('*')
      .eq('user_id', user.id);
    
    if (fetchError) {
      console.log('❌ خطأ في فحص الطلبات:', fetchError.message);
      return {
        success: false,
        message: 'خطأ في فحص الطلبات الموجودة',
        error: fetchError.message
      };
    }
    
    if (!existingRequests || existingRequests.length === 0) {
      console.log('✅ لا توجد طلبات إعادة تعيين كلمة المرور لهذا المستخدم');
      return {
        success: true,
        message: 'لا توجد طلبات للحذف',
        deletedCount: 0,
        userInfo: {
          id: user.id,
          email: user.email,
          name: `${user.first_name} ${user.last_name}`
        }
      };
    }
    
    console.log(`📊 تم العثور على ${existingRequests.length} طلب:`);
    existingRequests.forEach((request, index) => {
      console.log(`   ${index + 1}. طلبات يومية: ${request.daily_requests_count}`);
      console.log(`      طلبات شهرية: ${request.monthly_requests_count}`);
      console.log(`      طلبات غير مستخدمة: ${request.unused_requests_count}`);
      console.log(`      آخر طلب: ${request.last_request_at || 'غير محدد'}`);
      console.log(`      محظور حتى: ${request.is_blocked_until || 'غير محظور'}`);
      console.log(`      سبب الحظر: ${request.block_reason || 'لا يوجد'}`);
    });
    
    // حذف الطلبات
    console.log('🗑️ حذف طلبات إعادة تعيين كلمة المرور...');
    const { data: deletedRequests, error: deleteError } = await supabase
      .from('password_reset_requests')
      .delete()
      .eq('user_id', user.id)
      .select();
    
    if (deleteError) {
      console.log('❌ خطأ في الحذف:', deleteError.message);
      return {
        success: false,
        message: 'فشل في حذف الطلبات',
        error: deleteError.message
      };
    }
    
    console.log(`✅ تم حذف ${deletedRequests?.length || 0} طلب بنجاح`);
    console.log('🎉 تم تنظيف جميع طلبات إعادة تعيين كلمة المرور للمستخدم');
    console.log('💡 يمكن للمستخدم الآن طلب كلمة مرور مؤقتة جديدة بدون قيود');
    
    return {
      success: true,
      message: `تم حذف ${deletedRequests?.length || 0} طلب بنجاح`,
      deletedCount: deletedRequests?.length || 0,
      userInfo: {
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`
      }
    };
    
  } catch (error: any) {
    console.log('❌ خطأ غير متوقع:', error.message);
    return {
      success: false,
      message: 'حدث خطأ غير متوقع',
      error: error.message
    };
  }
}

/**
 * تنظيف شامل لجميع البيانات المتعلقة بكلمة المرور
 */
export async function clearAllPasswordResetData(email: string): Promise<ClearPasswordResetResult> {
  try {
    console.log(`🧹 تنظيف شامل لبيانات إعادة تعيين كلمة المرور لـ: ${email}`);
    
    // حذف من جدول password_reset_requests
    const resetResult = await clearPasswordResetRequests(email);
    
    if (!resetResult.success) {
      return resetResult;
    }
    
    // حذف من جدول login_attempts (محاولات password_reset)
    console.log('🔍 البحث عن محاولات تسجيل الدخول المتعلقة بإعادة تعيين كلمة المرور...');
    const { data: loginAttempts, error: loginError } = await supabase
      .from('login_attempts')
      .delete()
      .eq('email', email.toLowerCase())
      .eq('attempt_type', 'password_reset')
      .select();
    
    if (loginError) {
      console.log('⚠️ تحذير: خطأ في حذف محاولات تسجيل الدخول:', loginError.message);
    } else {
      console.log(`✅ تم حذف ${loginAttempts?.length || 0} محاولة تسجيل دخول`);
    }
    
    // حذف من جدول login_blocks
    console.log('🔍 البحث عن حالات الحظر المتعلقة بالإيميل...');
    const { data: loginBlocks, error: blockError } = await supabase
      .from('login_blocks')
      .delete()
      .eq('email', email.toLowerCase())
      .select();
    
    if (blockError) {
      console.log('⚠️ تحذير: خطأ في حذف حالات الحظر:', blockError.message);
    } else {
      console.log(`✅ تم حذف ${loginBlocks?.length || 0} حالة حظر`);
    }
    
    console.log('🎉 تم التنظيف الشامل بنجاح!');
    console.log('💡 المستخدم يمكنه الآن طلب كلمة مرور مؤقتة بدون أي قيود');
    
    return {
      success: true,
      message: `تنظيف شامل: حذف ${resetResult.deletedCount || 0} طلب إعادة تعيين + ${loginAttempts?.length || 0} محاولة دخول + ${loginBlocks?.length || 0} حالة حظر`,
      deletedCount: (resetResult.deletedCount || 0) + (loginAttempts?.length || 0) + (loginBlocks?.length || 0),
      userInfo: resetResult.userInfo
    };
    
  } catch (error: any) {
    console.log('❌ خطأ في التنظيف الشامل:', error.message);
    return {
      success: false,
      message: 'فشل التنظيف الشامل',
      error: error.message
    };
  }
}

/**
 * فحص طلبات إعادة تعيين كلمة المرور لإيميل محدد
 */
export async function checkPasswordResetRequests(email: string): Promise<any> {
  try {
    console.log(`🔍 فحص طلبات إعادة تعيين كلمة المرور لـ: ${email}`);
    
    // البحث عن المستخدم
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('email', email.toLowerCase())
      .single();
    
    if (userError) {
      if (userError.code === 'PGRST116') {
        console.log('❌ المستخدم غير موجود في قاعدة البيانات');
        return { success: false, error: 'المستخدم غير موجود' };
      }
      throw userError;
    }
    
    console.log(`✅ المستخدم: ${user.first_name} ${user.last_name} (${user.email})`);
    
    // فحص الطلبات
    const { data: requests, error: fetchError } = await supabase
      .from('password_reset_requests')
      .select('*')
      .eq('user_id', user.id);
    
    if (fetchError) {
      console.log('❌ خطأ في فحص الطلبات:', fetchError.message);
      return { success: false, error: fetchError.message };
    }
    
    if (!requests || requests.length === 0) {
      console.log('✅ لا توجد طلبات إعادة تعيين كلمة المرور');
      return { success: true, requests: [] };
    }
    
    console.log(`📊 تفاصيل الطلبات (${requests.length} طلب):`);
    requests.forEach((request, index) => {
      console.log(`\n📋 الطلب ${index + 1}:`);
      console.log(`   🆔 المعرف: ${request.id}`);
      console.log(`   📅 تاريخ الإنشاء: ${request.created_at}`);
      console.log(`   📅 تاريخ التحديث: ${request.updated_at}`);
      console.log(`   📊 طلبات يومية: ${request.daily_requests_count}`);
      console.log(`   📊 طلبات شهرية: ${request.monthly_requests_count}`);
      console.log(`   📊 طلبات غير مستخدمة: ${request.unused_requests_count}`);
      console.log(`   📅 تاريخ إعادة تعيين يومي: ${request.daily_reset_date}`);
      console.log(`   📅 تاريخ إعادة تعيين شهري: ${request.monthly_reset_date}`);
      console.log(`   ⏰ آخر طلب: ${request.last_request_at || 'غير محدد'}`);
      console.log(`   🚫 محظور حتى: ${request.is_blocked_until || 'غير محظور'}`);
      console.log(`   📝 سبب الحظر: ${request.block_reason || 'لا يوجد'}`);
      
      // تحليل الحالة
      const now = new Date();
      const isBlocked = request.is_blocked_until && new Date(request.is_blocked_until) > now;
      const dailyLimitReached = request.daily_requests_count >= 3;
      const monthlyLimitReached = request.monthly_requests_count >= 12;
      
      console.log(`   📊 الحالة:`);
      console.log(`      - محظور: ${isBlocked ? '🔴 نعم' : '🟢 لا'}`);
      console.log(`      - وصل للحد اليومي (3): ${dailyLimitReached ? '🔴 نعم' : '🟢 لا'}`);
      console.log(`      - وصل للحد الشهري (12): ${monthlyLimitReached ? '🔴 نعم' : '🟢 لا'}`);
    });
    
    return { success: true, requests: requests, user: user };
    
  } catch (error: any) {
    console.log('❌ خطأ غير متوقع:', error.message);
    return { success: false, error: error.message };
  }
}

// إضافة الدوال إلى النافذة العامة للاستخدام في الكونسول
if (typeof window !== 'undefined') {
  (window as any).clearPasswordResetRequests = clearPasswordResetRequests;
  (window as any).clearAllPasswordResetData = clearAllPasswordResetData;
  (window as any).checkPasswordResetRequests = checkPasswordResetRequests;
}
