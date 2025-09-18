/**
 * أداة حذف طلبات إعادة تعيين كلمة المرور
 * تستخدم لحذف طلبات كلمة المرور المؤقتة من قاعدة البيانات
 */

// إعدادات Supabase
const SUPABASE_URL = 'https://sbtzngewizgeqzfbhfjy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNidHpuZ2V3aXpnZXF6ZmJoZmp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMzc5MTMsImV4cCI6MjA2NjcxMzkxM30.T8iv9C4OeKAb-e4Oz6uw3tFnMrgFK3SKN6fVCrBEUGo';

// تحميل مكتبة Supabase
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
script.onload = initializeSupabase;
document.head.appendChild(script);

let supabase;

function initializeSupabase() {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('✅ تم تهيئة Supabase بنجاح');
  
  // إضافة الدوال إلى النافذة العامة
  window.clearPasswordResetRequests = clearPasswordResetRequests;
  window.checkPasswordResetRequests = checkPasswordResetRequests;
  window.clearAllPasswordResetData = clearAllPasswordResetData;
  
  console.log('🔧 الدوال المتاحة:');
  console.log('- clearPasswordResetRequests("email@example.com") - حذف طلبات إيميل محدد');
  console.log('- checkPasswordResetRequests("email@example.com") - فحص طلبات إيميل محدد');
  console.log('- clearAllPasswordResetData("email@example.com") - حذف جميع البيانات المتعلقة بالإيميل');
  console.log('');
  console.log('🎯 مثال للاستخدام:');
  console.log('clearPasswordResetRequests("moxamgad@gmail.com")');
}

/**
 * حذف طلبات إعادة تعيين كلمة المرور لإيميل محدد
 */
async function clearPasswordResetRequests(email) {
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
        console.log('❌ المستخدم غير موجود في قاعدة البيانات');
        return { success: false, error: 'المستخدم غير موجود' };
      }
      throw userError;
    }
    
    console.log(`✅ تم العثور على المستخدم: ${user.first_name} ${user.last_name}`);
    console.log(`📧 الإيميل: ${user.email}`);
    console.log(`🆔 معرف المستخدم: ${user.id}`);
    console.log('');
    
    // فحص الطلبات الموجودة
    const { data: existingRequests, error: fetchError } = await supabase
      .from('password_reset_requests')
      .select('*')
      .eq('user_id', user.id);
    
    if (fetchError) {
      console.log('❌ خطأ في فحص الطلبات:', fetchError.message);
      return { success: false, error: fetchError.message };
    }
    
    if (!existingRequests || existingRequests.length === 0) {
      console.log('✅ لا توجد طلبات إعادة تعيين كلمة المرور لهذا المستخدم');
      return { success: true, message: 'لا توجد طلبات للحذف' };
    }
    
    console.log(`📊 تم العثور على ${existingRequests.length} طلب:`);
    existingRequests.forEach((request, index) => {
      console.log(`   ${index + 1}. طلبات يومية: ${request.daily_requests_count}`);
      console.log(`      طلبات شهرية: ${request.monthly_requests_count}`);
      console.log(`      طلبات غير مستخدمة: ${request.unused_requests_count}`);
      console.log(`      آخر طلب: ${request.last_request_at || 'غير محدد'}`);
      console.log(`      محظور حتى: ${request.is_blocked_until || 'غير محظور'}`);
      console.log(`      سبب الحظر: ${request.block_reason || 'لا يوجد'}`);
      console.log('');
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
      return { success: false, error: deleteError.message };
    }
    
    console.log(`✅ تم حذف ${deletedRequests?.length || 0} طلب بنجاح`);
    console.log('🎉 تم تنظيف جميع طلبات إعادة تعيين كلمة المرور للمستخدم');
    console.log('');
    console.log('💡 يمكن للمستخدم الآن طلب كلمة مرور مؤقتة جديدة بدون قيود');
    
    return { 
      success: true, 
      deletedCount: deletedRequests?.length || 0,
      user: user
    };
    
  } catch (error) {
    console.log('❌ خطأ غير متوقع:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * فحص طلبات إعادة تعيين كلمة المرور لإيميل محدد
 */
async function checkPasswordResetRequests(email) {
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
    
  } catch (error) {
    console.log('❌ خطأ غير متوقع:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * حذف جميع البيانات المتعلقة بطلبات كلمة المرور لإيميل محدد
 */
async function clearAllPasswordResetData(email) {
  try {
    console.log(`🧹 تنظيف شامل لبيانات إعادة تعيين كلمة المرور لـ: ${email}`);
    
    // حذف من جدول password_reset_requests
    const resetResult = await clearPasswordResetRequests(email);
    
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
    
    console.log('');
    console.log('🎉 تم التنظيف الشامل بنجاح!');
    console.log('💡 المستخدم يمكنه الآن طلب كلمة مرور مؤقتة بدون أي قيود');
    
    return {
      success: true,
      resetRequestsDeleted: resetResult.deletedCount || 0,
      loginAttemptsDeleted: loginAttempts?.length || 0,
      loginBlocksDeleted: loginBlocks?.length || 0
    };
    
  } catch (error) {
    console.log('❌ خطأ في التنظيف الشامل:', error.message);
    return { success: false, error: error.message };
  }
}

console.log('🔧 أداة حذف طلبات إعادة تعيين كلمة المرور جاهزة!');
console.log('⏳ انتظار تحميل مكتبة Supabase...');
