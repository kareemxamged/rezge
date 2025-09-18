/**
 * سكريپت لحذف جميع كلمات المرور المؤقتة من قاعدة البيانات
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

async function clearTemporaryPasswords() {
  console.log('🗑️ بدء عملية حذف جميع كلمات المرور المؤقتة...');
  
  try {
    // أولاً: عرض عدد السجلات الموجودة
    const { data: allRecords, error: countError } = await supabase
      .from('temporary_passwords')
      .select('*');
    
    if (countError) {
      console.error('❌ خطأ في جلب السجلات:', countError);
      return;
    }
    
    console.log(`📊 تم العثور على ${allRecords?.length || 0} سجل كلمة مرور مؤقتة`);
    
    if (allRecords && allRecords.length > 0) {
      console.log('📋 السجلات الموجودة:');
      allRecords.forEach((record, index) => {
        console.log(`  ${index + 1}. ID: ${record.id}, Email: ${record.email}, Created: ${record.created_at}, Used: ${record.is_used}`);
      });
    }
    
    // ثانياً: حذف جميع السجلات
    const { data: deleteResult, error: deleteError } = await supabase
      .from('temporary_passwords')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // حذف جميع السجلات
    
    if (deleteError) {
      console.error('❌ خطأ في حذف السجلات:', deleteError);
      return;
    }
    
    console.log('✅ تم حذف جميع كلمات المرور المؤقتة بنجاح');
    console.log('📊 عدد السجلات المحذوفة:', allRecords?.length || 0);
    
    // ثالثاً: التحقق من أن الجدول فارغ
    const { data: remainingRecords, error: checkError } = await supabase
      .from('temporary_passwords')
      .select('*');
    
    if (checkError) {
      console.error('❌ خطأ في التحقق من السجلات المتبقية:', checkError);
      return;
    }
    
    console.log(`🔍 السجلات المتبقية: ${remainingRecords?.length || 0}`);
    
    if (remainingRecords && remainingRecords.length === 0) {
      console.log('🎉 تم تنظيف الجدول بنجاح - لا توجد سجلات متبقية');
    } else {
      console.log('⚠️ ما زالت هناك سجلات متبقية:', remainingRecords);
    }
    
  } catch (error) {
    console.error('💥 خطأ عام:', error);
  }
}

// تشغيل السكريپت
clearTemporaryPasswords()
  .then(() => {
    console.log('🏁 انتهت عملية التنظيف');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 خطأ نهائي:', error);
    process.exit(1);
  });
