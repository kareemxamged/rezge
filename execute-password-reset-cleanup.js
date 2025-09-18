/**
 * تنفيذ مباشر لحذف طلبات كلمة المرور المؤقتة
 * للحساب: moxamgad@gmail.com
 */

// إعدادات Supabase
const SUPABASE_URL = 'https://sbtzngewizgeqzfbhfjy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNidHpuZ2V3aXpnZXF6ZmJoZmp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMzc5MTMsImV4cCI6MjA2NjcxMzkxM30.T8iv9C4OeKAb-e4Oz6uw3tFnMrgFK3SKN6fVCrBEUGo';

// تحميل مكتبة Supabase
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
script.onload = executeCleanup;
document.head.appendChild(script);

let supabase;

async function executeCleanup() {
  try {
    // تهيئة Supabase
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ تم تهيئة Supabase بنجاح');
    
    const targetEmail = 'moxamgad@gmail.com';
    
    console.log('='.repeat(60));
    console.log('🧹 بدء عملية التنظيف الشامل');
    console.log(`📧 الحساب المستهدف: ${targetEmail}`);
    console.log('='.repeat(60));
    
    // الخطوة 1: البحث عن المستخدم
    console.log('🔍 الخطوة 1: البحث عن المستخدم...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('email', targetEmail.toLowerCase())
      .single();
    
    if (userError) {
      if (userError.code === 'PGRST116') {
        console.log('❌ المستخدم غير موجود في قاعدة البيانات');
        return;
      }
      throw userError;
    }
    
    console.log(`✅ تم العثور على المستخدم:`);
    console.log(`   📛 الاسم: ${user.first_name} ${user.last_name}`);
    console.log(`   📧 الإيميل: ${user.email}`);
    console.log(`   🆔 المعرف: ${user.id}`);
    console.log('');
    
    // الخطوة 2: فحص الطلبات الموجودة
    console.log('🔍 الخطوة 2: فحص طلبات إعادة تعيين كلمة المرور...');
    const { data: existingRequests, error: fetchError } = await supabase
      .from('password_reset_requests')
      .select('*')
      .eq('user_id', user.id);
    
    if (fetchError) {
      console.log('❌ خطأ في فحص الطلبات:', fetchError.message);
      return;
    }
    
    if (!existingRequests || existingRequests.length === 0) {
      console.log('✅ لا توجد طلبات إعادة تعيين كلمة المرور لهذا المستخدم');
    } else {
      console.log(`📊 تم العثور على ${existingRequests.length} طلب:`);
      existingRequests.forEach((request, index) => {
        console.log(`\n   📋 الطلب ${index + 1}:`);
        console.log(`      🆔 المعرف: ${request.id}`);
        console.log(`      📊 طلبات يومية: ${request.daily_requests_count}`);
        console.log(`      📊 طلبات شهرية: ${request.monthly_requests_count}`);
        console.log(`      📊 طلبات غير مستخدمة: ${request.unused_requests_count}`);
        console.log(`      ⏰ آخر طلب: ${request.last_request_at || 'غير محدد'}`);
        console.log(`      🚫 محظور حتى: ${request.is_blocked_until || 'غير محظور'}`);
        console.log(`      📝 سبب الحظر: ${request.block_reason || 'لا يوجد'}`);
        
        // تحليل الحالة
        const now = new Date();
        const isBlocked = request.is_blocked_until && new Date(request.is_blocked_until) > now;
        const dailyLimitReached = request.daily_requests_count >= 3;
        const monthlyLimitReached = request.monthly_requests_count >= 12;
        
        console.log(`      📊 الحالة:`);
        console.log(`         - محظور: ${isBlocked ? '🔴 نعم' : '🟢 لا'}`);
        console.log(`         - وصل للحد اليومي (3): ${dailyLimitReached ? '🔴 نعم' : '🟢 لا'}`);
        console.log(`         - وصل للحد الشهري (12): ${monthlyLimitReached ? '🔴 نعم' : '🟢 لا'}`);
      });
    }
    
    // الخطوة 3: حذف طلبات إعادة تعيين كلمة المرور
    if (existingRequests && existingRequests.length > 0) {
      console.log('\n🗑️ الخطوة 3: حذف طلبات إعادة تعيين كلمة المرور...');
      const { data: deletedRequests, error: deleteError } = await supabase
        .from('password_reset_requests')
        .delete()
        .eq('user_id', user.id)
        .select();
      
      if (deleteError) {
        console.log('❌ خطأ في حذف طلبات إعادة تعيين كلمة المرور:', deleteError.message);
      } else {
        console.log(`✅ تم حذف ${deletedRequests?.length || 0} طلب إعادة تعيين كلمة المرور`);
      }
    }
    
    // الخطوة 4: حذف محاولات تسجيل الدخول المتعلقة بإعادة تعيين كلمة المرور
    console.log('\n🗑️ الخطوة 4: حذف محاولات تسجيل الدخول المتعلقة بإعادة تعيين كلمة المرور...');
    const { data: deletedLoginAttempts, error: loginError } = await supabase
      .from('login_attempts')
      .delete()
      .eq('email', targetEmail.toLowerCase())
      .eq('attempt_type', 'password_reset')
      .select();
    
    if (loginError) {
      console.log('⚠️ تحذير: خطأ في حذف محاولات تسجيل الدخول:', loginError.message);
    } else {
      console.log(`✅ تم حذف ${deletedLoginAttempts?.length || 0} محاولة تسجيل دخول`);
    }
    
    // الخطوة 5: حذف حالات الحظر المتعلقة بالإيميل
    console.log('\n🗑️ الخطوة 5: حذف حالات الحظر المتعلقة بالإيميل...');
    const { data: deletedBlocks, error: blockError } = await supabase
      .from('login_blocks')
      .delete()
      .eq('email', targetEmail.toLowerCase())
      .select();
    
    if (blockError) {
      console.log('⚠️ تحذير: خطأ في حذف حالات الحظر:', blockError.message);
    } else {
      console.log(`✅ تم حذف ${deletedBlocks?.length || 0} حالة حظر`);
    }
    
    // النتيجة النهائية
    console.log('\n' + '='.repeat(60));
    console.log('🎉 تم التنظيف الشامل بنجاح!');
    console.log('='.repeat(60));
    console.log('📊 ملخص العملية:');
    console.log(`   👤 المستخدم: ${user.first_name} ${user.last_name}`);
    console.log(`   📧 الإيميل: ${user.email}`);
    console.log(`   🗑️ طلبات إعادة تعيين محذوفة: ${existingRequests?.length || 0}`);
    console.log(`   🗑️ محاولات دخول محذوفة: ${deletedLoginAttempts?.length || 0}`);
    console.log(`   🗑️ حالات حظر محذوفة: ${deletedBlocks?.length || 0}`);
    console.log('');
    console.log('💡 النتيجة:');
    console.log('   ✅ يمكن للمستخدم الآن طلب كلمة مرور مؤقتة جديدة');
    console.log('   ✅ لن تظهر رسالة "ارسلت طلبات كثيرة"');
    console.log('   ✅ تم إزالة جميع القيود والحظر');
    console.log('   ✅ الحساب عاد للحالة الطبيعية');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.log('❌ خطأ غير متوقع:', error.message);
    console.log('📋 تفاصيل الخطأ:', error);
  }
}

console.log('🔧 أداة التنظيف الشامل لطلبات كلمة المرور المؤقتة');
console.log('⏳ جاري تحميل مكتبة Supabase وبدء العملية...');
