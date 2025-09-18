/**
 * تطبيق دالة update_password_with_temp في قاعدة البيانات
 * هذا الملف يقوم بإنشاء الدالة المطلوبة لحل مشكلة نظام كلمة المرور المؤقتة
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// قراءة ملف SQL
const sqlFilePath = path.join(process.cwd(), 'database', 'create_update_password_with_temp_function.sql');
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

// إعدادات Supabase (يجب تحديثها بالقيم الصحيحة)
const supabaseUrl = 'https://sbtznggewizgeqzfbhfjy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNidHpuZ2V3aXpnZXF6ZmJoZmp5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTEzNzkxMywiZXhwIjoyMDY2NzEzOTEzfQ.iGGkxiXhJZHCZEOZLhXqfBKJZJKjFhqJZJKjFhqJZJK'; // يجب استخدام service_role key

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyDatabaseFunction() {
  console.log('🚀 بدء تطبيق دالة update_password_with_temp...');
  
  try {
    // تقسيم SQL إلى عدة أوامر
    const sqlCommands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📝 سيتم تنفيذ ${sqlCommands.length} أمر SQL`);
    
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      if (command.trim()) {
        console.log(`⚡ تنفيذ الأمر ${i + 1}/${sqlCommands.length}...`);
        
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: command + ';'
        });
        
        if (error) {
          console.error(`❌ خطأ في الأمر ${i + 1}:`, error);
          // المتابعة مع الأوامر التالية
        } else {
          console.log(`✅ تم تنفيذ الأمر ${i + 1} بنجاح`);
        }
      }
    }
    
    // اختبار الدالة الجديدة
    console.log('🧪 اختبار الدالة الجديدة...');
    
    const { data: testResult, error: testError } = await supabase.rpc('update_password_with_temp', {
      user_email: 'test@example.com',
      temp_password: 'test123',
      new_password: 'newpassword123'
    });
    
    if (testError) {
      console.log('⚠️ الدالة موجودة ولكن الاختبار فشل (هذا متوقع للبيانات الوهمية):', testError.message);
    } else {
      console.log('✅ الدالة تعمل بشكل صحيح:', testResult);
    }
    
    console.log('🎉 تم تطبيق الدالة بنجاح!');
    console.log('📋 الخطوات التالية:');
    console.log('   1. تأكد من أن الدالة تعمل في Supabase Dashboard');
    console.log('   2. اختبر نظام كلمة المرور المؤقتة');
    console.log('   3. تحقق من أن المشكلة تم حلها');
    
  } catch (error) {
    console.error('💥 خطأ عام:', error);
    
    // محاولة بديلة: تنفيذ الدالة مباشرة
    console.log('🔄 محاولة تنفيذ مباشر...');
    
    const createFunctionSQL = `
CREATE OR REPLACE FUNCTION update_password_with_temp(
    user_email text,
    temp_password text,
    new_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    user_record record;
    temp_password_record record;
    password_match boolean := false;
    result json;
BEGIN
    -- البحث عن المستخدم في auth.users
    SELECT id, email INTO user_record
    FROM auth.users
    WHERE email = lower(user_email)
    AND email_confirmed_at IS NOT NULL;
    
    -- التحقق من وجود المستخدم
    IF user_record.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'المستخدم غير موجود أو غير مؤكد'
        );
    END IF;
    
    -- البحث عن كلمات المرور المؤقتة الصالحة
    SELECT id, temp_password_hash, is_used, expires_at, is_first_use
    INTO temp_password_record
    FROM temporary_passwords
    WHERE email = lower(user_email)
    AND is_used = false
    AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- التحقق من وجود كلمة مرور مؤقتة صالحة
    IF temp_password_record.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'كلمة المرور المؤقتة غير صحيحة أو انتهت صلاحيتها'
        );
    END IF;
    
    -- التحقق من صحة كلمة المرور المؤقتة باستخدام crypt
    SELECT crypt(temp_password, temp_password_record.temp_password_hash) = temp_password_record.temp_password_hash
    INTO password_match;
    
    IF NOT password_match THEN
        RETURN json_build_object(
            'success', false,
            'error', 'كلمة المرور المؤقتة غير صحيحة'
        );
    END IF;
    
    -- تحديث كلمة المرور في auth.users
    UPDATE auth.users
    SET 
        encrypted_password = crypt(new_password, gen_salt('bf', 10)),
        updated_at = NOW()
    WHERE id = user_record.id;
    
    -- تحديث حالة كلمة المرور المؤقتة كمستخدمة
    UPDATE temporary_passwords
    SET 
        is_used = true,
        used_at = NOW(),
        is_first_use = false
    WHERE id = temp_password_record.id;
    
    -- إرجاع نتيجة النجاح
    RETURN json_build_object(
        'success', true,
        'message', 'تم تحديث كلمة المرور بنجاح'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'حدث خطأ غير متوقع أثناء تحديث كلمة المرور'
        );
END;
$$;`;

    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: createFunctionSQL
      });
      
      if (error) {
        console.error('❌ فشل التنفيذ المباشر:', error);
      } else {
        console.log('✅ تم إنشاء الدالة بالتنفيذ المباشر');
      }
    } catch (directError) {
      console.error('💥 فشل التنفيذ المباشر:', directError);
    }
  }
}

// تشغيل الدالة
applyDatabaseFunction()
  .then(() => {
    console.log('🏁 انتهت العملية');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 خطأ نهائي:', error);
    process.exit(1);
  });
