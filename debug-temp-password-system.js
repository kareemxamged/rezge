/**
 * سكريپت شامل لتشخيص وإصلاح نظام كلمة المرور المؤقتة
 */

import { createClient } from '@supabase/supabase-js';

// إعدادات Supabase
const supabaseUrl = 'https://sbtznggewizgeqzfbhfjy.supabase.co';
const supabaseServiceKey = 'sbp_017dfdf398fe3ff584eb443aa3aefd7f3d9883b3';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function debugTempPasswordSystem() {
  console.log('🔍 === تشخيص نظام كلمة المرور المؤقتة ===');
  
  try {
    // 1. فحص الاتصال بقاعدة البيانات
    console.log('\n📡 1. فحص الاتصال بقاعدة البيانات...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('temporary_passwords')
      .select('count', { count: 'exact' });
    
    if (connectionError) {
      console.error('❌ فشل الاتصال بقاعدة البيانات:', connectionError);
      return;
    }
    
    console.log('✅ الاتصال بقاعدة البيانات ناجح');
    
    // 2. فحص جدول temporary_passwords
    console.log('\n📊 2. فحص جدول temporary_passwords...');
    const { data: allRecords, error: fetchError } = await supabase
      .from('temporary_passwords')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (fetchError) {
      console.error('❌ خطأ في جلب البيانات:', fetchError);
      return;
    }
    
    console.log(`📋 عدد السجلات الموجودة: ${allRecords?.length || 0}`);
    
    if (allRecords && allRecords.length > 0) {
      console.log('📝 السجلات الموجودة:');
      allRecords.forEach((record, index) => {
        console.log(`  ${index + 1}. ID: ${record.id}`);
        console.log(`     Email: ${record.email}`);
        console.log(`     Plain: ${record.temp_password_plain || 'غير موجود'}`);
        console.log(`     Hash: ${record.temp_password_hash ? record.temp_password_hash.substring(0, 20) + '...' : 'غير موجود'}`);
        console.log(`     Used: ${record.is_used}`);
        console.log(`     Expires: ${record.expires_at}`);
        console.log(`     Created: ${record.created_at}`);
        console.log('');
      });
    }
    
    // 3. حذف جميع السجلات القديمة
    console.log('\n🗑️ 3. حذف جميع السجلات القديمة...');
    const { error: deleteError } = await supabase
      .from('temporary_passwords')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (deleteError) {
      console.error('❌ خطأ في حذف السجلات:', deleteError);
    } else {
      console.log('✅ تم حذف جميع السجلات القديمة');
    }
    
    // 4. فحص دالة update_password_with_temp_v2
    console.log('\n🔧 4. فحص دالة update_password_with_temp_v2...');
    try {
      const { data: functionTest, error: functionError } = await supabase.rpc('update_password_with_temp_v2', {
        user_email: 'test@example.com',
        temp_password: 'test123',
        new_password: 'newpass123'
      });
      
      if (functionError) {
        if (functionError.message?.includes('function') && functionError.message?.includes('does not exist')) {
          console.log('⚠️ دالة update_password_with_temp_v2 غير موجودة');
          console.log('💡 يجب تطبيق ملف create_update_password_with_temp_v2_function.sql');
        } else {
          console.log('✅ دالة update_password_with_temp_v2 موجودة');
          console.log('📊 نتيجة الاختبار:', functionTest);
        }
      } else {
        console.log('✅ دالة update_password_with_temp_v2 تعمل');
        console.log('📊 نتيجة الاختبار:', functionTest);
      }
    } catch (funcError) {
      console.error('❌ خطأ في اختبار الدالة:', funcError);
    }
    
    // 5. اختبار إنشاء كلمة مرور مؤقتة
    console.log('\n🧪 5. اختبار إنشاء كلمة مرور مؤقتة...');
    const testEmail = 'test@example.com';
    const testPassword = 'TestPass123!';
    const testHash = '$2b$12$test.hash.example'; // hash وهمي
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 60);
    
    const { data: insertResult, error: insertError } = await supabase
      .from('temporary_passwords')
      .insert({
        user_id: 'test-user-id',
        email: testEmail,
        temp_password_hash: testHash,
        temp_password_plain: testPassword,
        expires_at: expiresAt.toISOString(),
        is_used: false,
        is_first_use: true,
        replaced_original: false
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ فشل في إنشاء كلمة مرور مؤقتة تجريبية:', insertError);
      console.log('💡 قد تكون هناك مشكلة في صلاحيات الجدول أو بنية الجدول');
    } else {
      console.log('✅ تم إنشاء كلمة مرور مؤقتة تجريبية بنجاح');
      console.log('📊 البيانات المُدخلة:', insertResult);
      
      // 6. اختبار البحث عن كلمة المرور
      console.log('\n🔍 6. اختبار البحث عن كلمة المرور...');
      const { data: searchResult, error: searchError } = await supabase
        .from('temporary_passwords')
        .select('*')
        .eq('email', testEmail)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString());
      
      if (searchError) {
        console.error('❌ فشل في البحث:', searchError);
      } else {
        console.log('✅ البحث ناجح');
        console.log('📊 النتائج:', searchResult);
      }
      
      // 7. حذف البيانات التجريبية
      console.log('\n🧹 7. تنظيف البيانات التجريبية...');
      const { error: cleanupError } = await supabase
        .from('temporary_passwords')
        .delete()
        .eq('id', insertResult.id);
      
      if (cleanupError) {
        console.error('❌ فشل في حذف البيانات التجريبية:', cleanupError);
      } else {
        console.log('✅ تم تنظيف البيانات التجريبية');
      }
    }
    
    // 8. فحص صلاحيات الجدول
    console.log('\n🔐 8. فحص صلاحيات الجدول...');
    try {
      // محاولة عمليات مختلفة لفحص الصلاحيات
      const operations = [
        { name: 'SELECT', operation: () => supabase.from('temporary_passwords').select('count', { count: 'exact' }) },
        { name: 'INSERT', operation: () => supabase.from('temporary_passwords').insert({ email: 'permission-test@example.com', temp_password_hash: 'test' }) },
      ];
      
      for (const op of operations) {
        try {
          const { error } = await op.operation();
          if (error) {
            if (error.message?.includes('permission') || error.message?.includes('policy')) {
              console.log(`❌ ${op.name}: مشكلة في الصلاحيات - ${error.message}`);
            } else {
              console.log(`⚠️ ${op.name}: خطأ آخر - ${error.message}`);
            }
          } else {
            console.log(`✅ ${op.name}: الصلاحيات صحيحة`);
          }
        } catch (opError) {
          console.log(`❌ ${op.name}: خطأ في العملية - ${opError.message}`);
        }
      }
      
      // حذف بيانات اختبار الصلاحيات
      await supabase.from('temporary_passwords').delete().eq('email', 'permission-test@example.com');
      
    } catch (permError) {
      console.error('❌ خطأ في فحص الصلاحيات:', permError);
    }
    
    console.log('\n🎯 === ملخص التشخيص ===');
    console.log('1. تحقق من أن دالة update_password_with_temp_v2 موجودة');
    console.log('2. تحقق من صلاحيات الجدول temporary_passwords');
    console.log('3. تحقق من أن الكود محدث في المتصفح (Ctrl+F5)');
    console.log('4. تحقق من console.log في المتصفح لرؤية رسائل الحفظ');
    
  } catch (error) {
    console.error('💥 خطأ عام في التشخيص:', error);
  }
}

// تشغيل التشخيص
debugTempPasswordSystem()
  .then(() => {
    console.log('\n🏁 انتهى التشخيص');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 خطأ نهائي:', error);
    process.exit(1);
  });
