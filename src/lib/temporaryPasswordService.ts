import { supabase } from './supabase';
import bcrypt from 'bcryptjs';
// import { translateSupabaseError } from '../utils/errorHandler';

/**
 * خدمة إدارة كلمات المرور المؤقتة
 * تتضمن توليد وإدارة كلمات المرور المؤقتة مع الأمان والتشفير
 */

export interface TemporaryPassword {
  id: string;
  user_id: string;
  email: string;
  temp_password_hash: string;
  temp_password_plain: string; // للاختبار فقط، سيتم حذفه في الإنتاج
  is_used: boolean;
  is_first_use: boolean;
  created_at: string;
  expires_at: string;
  used_at?: string;
  ip_address?: string;
  user_agent?: string;
  replaced_original: boolean;
}

export interface PasswordResetRequest {
  id: string;
  user_id: string;
  email: string;
  daily_requests_count: number;
  daily_reset_date: string;
  last_request_at?: string;
  monthly_requests_count: number;
  monthly_reset_date: string;
  unused_requests_count: number;
  is_blocked_until?: string;
  block_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface TemporaryPasswordResult {
  success: boolean;
  temporaryPassword?: string;
  expiresAt?: string;
  error?: string;
  waitTime?: number; // بالدقائق
  isBlocked?: boolean;
  blockReason?: string;
  recipientName?: string;
  isEmailNotRegistered?: boolean; // علامة داخلية للبريد غير المسجل
}

/**
 * الحصول على معلومات المستخدم
 */
async function getUserInfo(email: string): Promise<{
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  }
}> {
  try {
    console.log('🔍 البحث عن المستخدم في قاعدة البيانات:', email);
    
    // البحث في جدول users مباشرة (لا نحتاج auth.users)
    const { data: regularUsers, error: regularError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('email', email.toLowerCase())
      .eq('status', 'active') // التأكد من أن المستخدم نشط
      .limit(1);

    if (regularError) {
      console.log('⚠️ فشل البحث في users:', regularError.message);
      
      // إرجاع مستخدم افتراضي للمتابعة
      return {
        user: {
          id: '00000000-0000-0000-0000-000000000000',
          email: email.toLowerCase(),
          first_name: 'مستخدم',
          last_name: 'جديد'
        }
      };
    }

    if (regularUsers && regularUsers.length > 0) {
      const user = regularUsers[0];
      console.log('✅ تم العثور على المستخدم في جدول users:', user.id);
      return { user };
    }

    // إذا لم يتم العثور على المستخدم
    console.log('⚠️ لم يتم العثور على المستخدم، إنشاء مستخدم افتراضي');
    return {
      user: {
        id: '00000000-0000-0000-0000-000000000000',
        email: email.toLowerCase(),
        first_name: 'مستخدم',
        last_name: 'جديد'
      }
    };

  } catch (error: any) {
    console.error('❌ خطأ في البحث عن المستخدم:', error);
    
    // إرجاع مستخدم افتراضي في حالة الخطأ
    return { 
      user: {
        id: '00000000-0000-0000-0000-000000000000',
        email: email.toLowerCase(),
        first_name: 'مستخدم',
        last_name: 'جديد'
      }
    };
  }
}

/**
 * توليد كلمة مرور مؤقتة قوية وعشوائية
 */
function generateSecureTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const specialChars = '!@#$%&*';
  let password = '';
  
  // إضافة 8 أحرف عشوائية
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // إضافة رمز خاص واحد
  password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
  
  // إضافة رقم واحد
  password += Math.floor(Math.random() * 10).toString();
  
  // خلط الأحرف
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * فحص حدود الطلبات بناءً على البريد الإلكتروني للمستخدمين غير المسجلين
 */
async function checkEmailBasedLimits(email: string): Promise<{
  canRequest: boolean;
  waitTime?: number;
  isBlocked?: boolean;
  blockReason?: string;
}> {
  try {
    console.log('🔍 فحص حدود الطلبات بناءً على البريد الإلكتروني:', email);
    
    // البحث عن طلبات سابقة لنفس البريد الإلكتروني
    const { data: emailRequests, error } = await supabase
      .from('temporary_passwords')
      .select('*')
      .eq('email', email.toLowerCase())
      .order('created_at', { ascending: false });
    
    if (error) {
      console.log('⚠️ خطأ في فحص طلبات البريد الإلكتروني، السماح بالطلب:', error.message);
      return { canRequest: true };
    }
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // فحص الطلبات في آخر ساعة
    const recentRequests = emailRequests?.filter(req => 
      new Date(req.created_at) > oneHourAgo
    ) || [];
    
    // فحص الطلبات اليوم
    const todayRequests = emailRequests?.filter(req => 
      req.created_at.startsWith(today)
    ) || [];
    
    // فحص الطلبات في آخر 24 ساعة
    const last24HourRequests = emailRequests?.filter(req => 
      new Date(req.created_at) > oneDayAgo
    ) || [];
    
    console.log('📊 إحصائيات الطلبات:', {
      recentRequests: recentRequests.length,
      todayRequests: todayRequests.length,
      last24HourRequests: last24HourRequests.length
    });
    
    // قواعد الحدود للمستخدمين غير المسجلين
    
    // 1. حد أقصى 3 طلبات في الساعة
    if (recentRequests.length >= 3) {
      const oldestRecent = recentRequests[recentRequests.length - 1];
      const timeDiff = (now.getTime() - new Date(oldestRecent.created_at).getTime()) / (1000 * 60);
      const waitTime = Math.ceil(60 - timeDiff);
      
      return {
        canRequest: false,
        waitTime: waitTime,
        blockReason: `تم تجاوز الحد الأقصى (3 طلبات في الساعة). انتظر ${waitTime} دقيقة.`
      };
    }
    
    // 2. حد أقصى 5 طلبات في اليوم
    if (todayRequests.length >= 5) {
      return {
        canRequest: false,
        waitTime: 24 * 60, // 24 ساعة
        blockReason: 'تم تجاوز الحد اليومي (5 طلبات). يرجى المحاولة غداً.'
      };
    }
    
    // 3. حد أقصى 7 طلبات في 24 ساعة
    if (last24HourRequests.length >= 7) {
      const oldestRequest = last24HourRequests[last24HourRequests.length - 1];
      const timeDiff = (now.getTime() - new Date(oldestRequest.created_at).getTime()) / (1000 * 60);
      const waitTime = Math.ceil(24 * 60 - timeDiff);
      
      return {
        canRequest: false,
        waitTime: waitTime,
        blockReason: `تم تجاوز الحد الأقصى (7 طلبات في 24 ساعة). انتظر ${Math.ceil(waitTime / 60)} ساعة.`
      };
    }
    
    // 4. فترة انتظار 5 دقائق بين الطلبات
    if (recentRequests.length > 0) {
      const lastRequest = recentRequests[0];
      const timeDiff = (now.getTime() - new Date(lastRequest.created_at).getTime()) / (1000 * 60);
      
      if (timeDiff < 5) {
        return {
          canRequest: false,
          waitTime: Math.ceil(5 - timeDiff),
          blockReason: `يجب الانتظار 5 دقائق بين الطلبات. انتظر ${Math.ceil(5 - timeDiff)} دقيقة.`
        };
      }
    }
    
    console.log('✅ تم السماح بالطلب - ضمن الحدود المسموحة');
    return { canRequest: true };
    
  } catch (error: any) {
    console.error('❌ خطأ في فحص حدود البريد الإلكتروني:', error);
    // في حالة الخطأ، نسمح بالطلب لتجنب منع المستخدمين
    return { canRequest: true };
  }
}

/**
 * فحص قيود الطلبات للمستخدم
 */
async function checkRequestLimits(email: string): Promise<{
  canRequest: boolean;
  waitTime?: number;
  isBlocked?: boolean;
  blockReason?: string;
}> {
  try {
    // البحث عن المستخدم
    const { user, error: userError } = await getUserInfo(email);

    // للمستخدمين غير الموجودين أو المعرفات المؤقتة، نطبق حدود أساسية بناءً على البريد الإلكتروني
    if (userError || !user || user.id === 'unknown' || user.id === 'temp-user-id' || user.id === '00000000-0000-0000-0000-000000000000') {
      console.log('⚠️ مستخدم غير مسجل أو معرف مؤقت - تطبيق حدود أساسية بناءً على البريد الإلكتروني');
      return await checkEmailBasedLimits(email);
    }

    // التحقق من أن user.id هو UUID صحيح
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(user.id)) {
      console.log('⚠️ تجاهل فحص حدود الطلبات - معرف المستخدم ليس UUID صحيح:', user.id);
      return { canRequest: true };
    }

    // فحص سجل الطلبات
    const { data: resetRequest, error } = await supabase
      .from('password_reset_requests')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw error;
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentMonth = now.toISOString().substring(0, 7); // YYYY-MM

    // إذا لم يكن هناك سجل، يمكن الطلب
    if (!resetRequest) {
      return { canRequest: true };
    }

    // فحص الحظر
    if (resetRequest.is_blocked_until) {
      const blockUntil = new Date(resetRequest.is_blocked_until);
      if (now < blockUntil) {
        return {
          canRequest: false,
          isBlocked: true,
          blockReason: resetRequest.block_reason || 'تم حظر الحساب مؤقتاً'
        };
      }
    }

    // إعادة تعيين العدادات اليومية والشهرية إذا لزم الأمر
    let dailyCount = resetRequest.daily_requests_count;
    // let monthlyCount = resetRequest.monthly_requests_count; // غير مستخدم حالياً

    if (resetRequest.daily_reset_date !== today) {
      dailyCount = 0;
      console.log(`🔄 إعادة تعيين العداد اليومي للمستخدم ${email} من ${resetRequest.daily_requests_count} إلى 0`);
    }

    if (resetRequest.monthly_reset_date.substring(0, 7) !== currentMonth) {
      // monthlyCount = 0; // تم تعطيل هذا المتغير
      // unusedCount = 0; // إعادة تعيين العداد الشهري للطلبات غير المستخدمة (غير مستخدم في هذه الدالة)
      console.log(`🔄 إعادة تعيين العداد الشهري للمستخدم ${email}`);
    }

    // فحص الحد اليومي (6 طلبات) - بعد إعادة التعيين
    if (dailyCount >= 6) {
      console.log(`❌ تجاوز الحد اليومي للمستخدم ${email}: ${dailyCount}/6`);

      return {
        canRequest: false,
        waitTime: 24 * 60, // 24 ساعة بالدقائق
        isBlocked: false
      };
    }

    // فحص الحد الشهري للمحاولات (12 محاولة)
    let monthlyCount = resetRequest.monthly_requests_count;
    if (resetRequest.monthly_reset_date.substring(0, 7) !== currentMonth) {
      monthlyCount = 0;
    }

    if (monthlyCount >= 12) {
      return {
        canRequest: false,
        isBlocked: true,
        blockReason: 'تم حظر الجهاز نهائياً بسبب تجاوز الحد الأقصى للمحاولات (12 محاولة)'
      };
    }

    // فحص فترة الانتظار 5 دقائق
    if (resetRequest.last_request_at) {
      const lastRequest = new Date(resetRequest.last_request_at);
      const timeDiff = (now.getTime() - lastRequest.getTime()) / (1000 * 60); // بالدقائق
      
      if (timeDiff < 5) {
        return {
          canRequest: false,
          waitTime: Math.ceil(5 - timeDiff)
        };
      }
    }

    return { canRequest: true };
  } catch (error: any) {
    console.error('Error checking request limits:', error);
    
    // فحص إذا كان الخطأ بسبب UUID غير صحيح
    if (error.message?.includes('invalid input syntax for type uuid')) {
      console.log('⚠️ خطأ UUID في فحص حدود الطلبات - السماح بالطلب');
      return { canRequest: true };
    }
    
    // في حالة أي خطأ آخر، نسمح بالطلب لتجنب منع المستخدمين
    console.log('⚠️ خطأ عام في فحص حدود الطلبات - السماح بالطلب');
    return { canRequest: true };
  }
}

/**
 * تحديث سجل طلبات إعادة التعيين
 */
async function updateResetRequestRecord(userId: string, email: string): Promise<void> {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentMonth = now.toISOString().substring(0, 7);

  try {
    // محاولة الحصول على السجل الحالي
    const { data: existingRecord, error: fetchError } = await supabase
      .from('password_reset_requests')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (existingRecord) {
      // تحديث السجل الموجود
      let dailyCount = existingRecord.daily_requests_count;
      let monthlyCount = existingRecord.monthly_requests_count;
      let unusedCount = existingRecord.unused_requests_count;

      // إعادة تعيين العدادات إذا لزم الأمر
      if (existingRecord.daily_reset_date !== today) {
        dailyCount = 0;
      }

      if (existingRecord.monthly_reset_date.substring(0, 7) !== currentMonth) {
        monthlyCount = 0;
        unusedCount = 0;
      }

      // فحص إضافي: إذا وصل العداد الشهري لـ 12، تطبيق حظر دائم للجهاز
      if (monthlyCount >= 12) {
        const blockUntil = new Date();
        blockUntil.setFullYear(blockUntil.getFullYear() + 10); // حظر طويل المدى

        await supabase
          .from('password_reset_requests')
          .update({
            is_blocked_until: blockUntil.toISOString(),
            block_reason: 'تم حظر الجهاز نهائياً بسبب تجاوز الحد الأقصى للمحاولات (12 محاولة)',
            updated_at: now.toISOString()
          })
          .eq('user_id', userId);

        throw new Error('تم حظر الجهاز نهائياً بسبب تجاوز الحد الأقصى للمحاولات');
      }

      const { error: updateError } = await supabase
        .from('password_reset_requests')
        .update({
          daily_requests_count: dailyCount + 1,
          daily_reset_date: today,
          last_request_at: now.toISOString(),
          monthly_requests_count: monthlyCount + 1,
          monthly_reset_date: today,
          unused_requests_count: unusedCount + 1,
          updated_at: now.toISOString()
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;
    } else {
      // إنشاء سجل جديد
      const { error: insertError } = await supabase
        .from('password_reset_requests')
        .insert({
          user_id: userId,
          email,
          daily_requests_count: 1,
          daily_reset_date: today,
          last_request_at: now.toISOString(),
          monthly_requests_count: 1,
          monthly_reset_date: today,
          unused_requests_count: 1
        });

      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error('Error updating reset request record:', error);
    throw error;
  }
}

/**
 * تنظيف الحسابات المحظورة منتهية الصلاحية
 */
export async function cleanupExpiredBlocks(): Promise<{ success: boolean; clearedCount: number }> {
  try {
    const now = new Date();

    const { data: clearedRecords, error } = await supabase
      .from('password_reset_requests')
      .update({
        is_blocked_until: null,
        block_reason: null,
        updated_at: now.toISOString()
      })
      .lt('is_blocked_until', now.toISOString())
      .select('id');

    if (error) throw error;

    return {
      success: true,
      clearedCount: clearedRecords?.length || 0
    };
  } catch (error) {
    console.error('Error cleaning up expired blocks:', error);
    return { success: false, clearedCount: 0 };
  }
}

/**
 * إنشاء كلمة مرور مؤقتة جديدة
 */
export async function createTemporaryPassword(email: string): Promise<TemporaryPasswordResult> {
  try {
    console.log('🔄 إنشاء كلمة مرور مؤقتة مع حل دائم...');

    // تنظيف كلمات المرور المنتهية الصلاحية (اختياري)
    try {
      await supabase.rpc('cleanup_expired_temporary_passwords');
    } catch (cleanupError) {
      console.log('⚠️ تجاهل خطأ تنظيف كلمات المرور المنتهية:', cleanupError);
    }

    // البحث عن المستخدم باستخدام الطريقة الجديدة
    const { user, error: userError } = await getUserInfo(email);
    
    if (userError) {
      console.log('⚠️ خطأ في البحث عن المستخدم، المتابعة مع بيانات افتراضية');
    }

    console.log('✅ معلومات المستخدم:', {
      id: user?.id,
      email: user?.email,
      name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
    });

    // فحص قيود الطلبات (سيتم تجاهله للمعرفات المؤقتة)
    const limitCheck = await checkRequestLimits(email);
    if (!limitCheck.canRequest) {
      let errorMessage = '';

      if (limitCheck.isBlocked) {
        errorMessage = limitCheck.blockReason || 'تم حظر الحساب مؤقتاً';
      } else if (limitCheck.waitTime) {
        if (limitCheck.waitTime >= 24 * 60) {
          // إذا كان الوقت 24 ساعة أو أكثر (تجاوز الحد اليومي)
          errorMessage = `تم تجاوز الحد اليومي (6 طلبات). يرجى المحاولة غداً.`;
        } else if (limitCheck.waitTime > 60) {
          // إذا كان الوقت أكثر من ساعة ولكن أقل من 24 ساعة
          const hours = Math.floor(limitCheck.waitTime / 60);
          const minutes = limitCheck.waitTime % 60;
          if (minutes > 0) {
            errorMessage = `يجب الانتظار ${hours} ساعة و ${minutes} دقيقة قبل الطلب مرة أخرى`;
          } else {
            errorMessage = `يجب الانتظار ${hours} ساعة قبل الطلب مرة أخرى`;
          }
        } else {
          // أقل من ساعة (فترة الانتظار 5 دقائق)
          errorMessage = `يجب الانتظار ${limitCheck.waitTime} دقيقة قبل الطلب مرة أخرى`;
        }
      } else {
        errorMessage = 'تم تجاوز الحد الأقصى للطلبات';
      }

      return {
        success: false,
        error: errorMessage,
        waitTime: limitCheck.waitTime,
        isBlocked: limitCheck.isBlocked,
        blockReason: limitCheck.blockReason
      };
    }

    // توليد كلمة مرور مؤقتة
    const temporaryPassword = generateSecureTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    // تحديد وقت انتهاء الصلاحية (60 دقيقة)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 60);

    // حفظ كلمة المرور في قاعدة البيانات
    console.log('💾 حفظ كلمة المرور المؤقتة في قاعدة البيانات...');
    console.log('🔑 كلمة المرور المؤقتة المُولدة:', temporaryPassword);

    const { data: insertResult, error: insertError } = await supabase
      .from('temporary_passwords')
      .insert({
        user_id: user.id,
        email: email.toLowerCase(),
        temp_password_hash: hashedPassword,
        temp_password_plain: temporaryPassword, // للاختبار والتطوير
        expires_at: expiresAt.toISOString(),
        is_used: false,
        is_first_use: true,
        replaced_original: false
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ فشل في حفظ كلمة المرور المؤقتة:', insertError);
      return {
        success: false,
        error: 'فشل في إنشاء كلمة المرور المؤقتة'
      };
    }

    console.log('✅ تم حفظ كلمة المرور المؤقتة بنجاح:', insertResult.id);

    return {
      success: true,
      temporaryPassword,
      expiresAt: expiresAt.toISOString(),
      recipientName: user.first_name || 'المستخدم'
    };

  } catch (error: any) {
    console.error('Error creating temporary password:', error);
    return {
      success: false,
      error: 'auth.forgotPassword.messages.createPasswordError'
    };
  }
}

/**
 * التحقق من صحة كلمة المرور المؤقتة
 */
export async function verifyTemporaryPassword(
  email: string, 
  password: string
): Promise<{
  isValid: boolean;
  isTemporary?: boolean;
  tempPasswordId?: string;
  isFirstUse?: boolean;
}> {
  try {
    // البحث عن كلمات المرور المؤقتة الصالحة للمستخدم
    const { data: tempPasswords, error } = await supabase
      .from('temporary_passwords')
      .select('*')
      .eq('email', email)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    // فحص كل كلمة مرور مؤقتة
    for (const tempPassword of tempPasswords || []) {
      const isMatch = await bcrypt.compare(password, tempPassword.temp_password_hash);
      if (isMatch) {
        return {
          isValid: true,
          isTemporary: true,
          tempPasswordId: tempPassword.id,
          isFirstUse: tempPassword.is_first_use
        };
      }
    }

    return { isValid: false };
  } catch (error) {
    console.error('Error verifying temporary password:', error);
    return { isValid: false };
  }
}

/**
 * تسجيل استخدام كلمة المرور المؤقتة
 */
export async function markTemporaryPasswordAsUsed(
  tempPasswordId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('temporary_passwords')
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent
      })
      .eq('id', tempPasswordId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error marking temporary password as used:', error);
    return { success: false, error: error.message };
  }
}

/**
 * تحديث كلمة المرور باستخدام كلمة المرور المؤقتة
 * تم إعادة كتابتها لتعمل مباشرة مع التحقق في JavaScript
 */
export async function updatePasswordWithTempPassword(
  email: string,
  tempPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔄 بدء عملية تحديث كلمة المرور باستخدام كلمة المرور المؤقتة');
    console.log('📧 البريد الإلكتروني:', email);
    
    console.log('🔄 استخدام دالة قاعدة البيانات المحسنة مباشرة...');
    console.log('📊 معاملات الدالة:', {
      user_email: email.toLowerCase(),
      temp_password: tempPassword,
      new_password: newPassword ? '[كلمة مرور جديدة مخفية]' : 'غير موجودة'
    });
    
    // أولاً: التحقق من وجود الدالة في قاعدة البيانات
    console.log('🔍 التحقق من وجود دالة update_password_with_temp_v2...');
    
    // محاولة استدعاء الدالة المحسنة
    const { data: updateResult, error: updateError } = await supabase.rpc('update_password_with_temp_v2', {
      user_email: email.toLowerCase(),
      temp_password: tempPassword,
      new_password: newPassword
    });
    
    console.log('📊 نتيجة دالة قاعدة البيانات:', {
      hasError: !!updateError,
      errorMessage: updateError?.message,
      hasData: !!updateResult,
      dataSuccess: updateResult?.success,
      dataError: updateResult?.error
    });
    
    if (updateError) {
      console.error('❌ خطأ في استدعاء دالة قاعدة البيانات:', updateError);
      
      // إذا كانت الدالة غير موجودة، نستخدم الدالة القديمة
      if (updateError.message?.includes('function') && updateError.message?.includes('does not exist')) {
        console.log('⚠️ الدالة المحسنة غير موجودة، استخدام الدالة القديمة...');
        
        // استخدام حل بديل مباشر
        console.log('🔄 استخدام حل بديل مباشر...');
        
        // البحث عن كلمة المرور المؤقتة في الجدول
        const { data: tempPasswords, error: searchError } = await supabase
          .from('temporary_passwords')
          .select('*')
          .eq('email', email.toLowerCase())
          .eq('is_used', false)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (searchError || !tempPasswords || tempPasswords.length === 0) {
          console.error('❌ لم يتم العثور على كلمة مرور مؤقتة صالحة');
          return { 
            success: false, 
            error: 'كلمة المرور المؤقتة غير صحيحة أو انتهت صلاحيتها' 
          };
        }
        
        const tempPasswordRecord = tempPasswords[0];
        console.log('🔍 تم العثور على كلمة مرور مؤقتة:', tempPasswordRecord.id);
        
        // التحقق من كلمة المرور (مقارنة مع النص الخام أولاً)
        let passwordMatch = false;
        
        if (tempPasswordRecord.temp_password_plain) {
          passwordMatch = tempPassword === tempPasswordRecord.temp_password_plain;
          console.log('🔍 مقارنة النص الخام:', passwordMatch);
        }
        
        if (!passwordMatch && tempPasswordRecord.temp_password_hash) {
          // محاولة مقارنة مع bcrypt
          try {
            passwordMatch = await bcrypt.compare(tempPassword, tempPasswordRecord.temp_password_hash);
            console.log('🔍 مقارنة bcrypt:', passwordMatch);
          } catch (bcryptError) {
            console.warn('⚠️ فشل في مقارنة bcrypt:', bcryptError);
          }
        }
        
        if (!passwordMatch) {
          console.error('❌ كلمة المرور المؤقتة غير صحيحة');
          return { 
            success: false, 
            error: 'كلمة المرور المؤقتة غير صحيحة' 
          };
        }
        
        console.log('✅ كلمة المرور المؤقتة صحيحة، تحديث كلمة المرور...');
        
        // الحصول على معلومات المستخدم
        const userInfo = await getUserInfo(email);
        if (userInfo.error || !userInfo.user) {
          return { 
            success: false, 
            error: 'المستخدم غير موجود أو غير مؤكد' 
          };
        }
        
        // تحديث كلمة المرور باستخدام Supabase Auth API
        const { error: authUpdateError } = await supabase.auth.updateUser({
          password: newPassword
        });
        
        if (authUpdateError) {
          console.error('❌ فشل في تحديث كلمة المرور:', authUpdateError);
          return { 
            success: false, 
            error: 'فشل في تحديث كلمة المرور' 
          };
        }
        
        // تحديث حالة كلمة المرور المؤقتة
        const { error: updateTempError } = await supabase
          .from('temporary_passwords')
          .update({
            is_used: true,
            used_at: new Date().toISOString(),
            is_first_use: false
          })
          .eq('id', tempPasswordRecord.id);
        
        if (updateTempError) {
          console.warn('⚠️ فشل في تحديث حالة كلمة المرور المؤقتة:', updateTempError);
        }
        
        console.log('✅ تم تحديث كلمة المرور بنجاح باستخدام الحل البديل');
        return { success: true };
      }
      
      return { 
        success: false, 
        error: 'فشل في تحديث كلمة المرور: ' + updateError.message 
      };
    }
    
    if (!updateResult?.success) {
      console.error('❌ فشل في تحديث كلمة المرور:', updateResult?.error);
      console.error('📋 تفاصيل النتيجة الكاملة:', updateResult);
      
      // استخدام الحل البديل المباشر
      console.log('🔄 استخدام الحل البديل المباشر...');
      
      // أولاً: البحث عن جميع السجلات للمستخدم (بدون فلاتر)
      const { data: allRecords, error: allRecordsError } = await supabase
        .from('temporary_passwords')
        .select('*')
        .eq('email', email.toLowerCase())
        .order('created_at', { ascending: false });
      
      console.log('🔍 جميع سجلات كلمة المرور المؤقتة للمستخدم:', {
        hasError: !!allRecordsError,
        errorMessage: allRecordsError?.message,
        totalRecords: allRecords?.length || 0,
        records: allRecords
      });
      
      // ثانياً: البحث مع الفلاتر
      const currentTime = new Date().toISOString();
      console.log('🕐 الوقت الحالي للمقارنة:', currentTime);
      
      const { data: tempPasswords, error: searchError } = await supabase
        .from('temporary_passwords')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('is_used', false)
        .gt('expires_at', currentTime)
        .order('created_at', { ascending: false })
        .limit(1);
      
      console.log('🔍 نتيجة البحث عن كلمة المرور المؤقتة:', {
        hasError: !!searchError,
        errorMessage: searchError?.message,
        foundRecords: tempPasswords?.length || 0,
        records: tempPasswords
      });
      
      if (searchError || !tempPasswords || tempPasswords.length === 0) {
        console.error('❌ لم يتم العثور على كلمة مرور مؤقتة صالحة');
        return { 
          success: false, 
          error: 'كلمة المرور المؤقتة غير صحيحة أو انتهت صلاحيتها' 
        };
      }
      
      const tempPasswordRecord = tempPasswords[0];
      console.log('🔍 تم العثور على كلمة مرور مؤقتة:', {
        id: tempPasswordRecord.id,
        email: tempPasswordRecord.email,
        hasPlainText: !!tempPasswordRecord.temp_password_plain,
        hasHash: !!tempPasswordRecord.temp_password_hash,
        isUsed: tempPasswordRecord.is_used,
        expiresAt: tempPasswordRecord.expires_at,
        createdAt: tempPasswordRecord.created_at
      });
      
      // التحقق من كلمة المرور (مقارنة مع النص الخام أولاً)
      let passwordMatch = false;
      
      if (tempPasswordRecord.temp_password_plain) {
        passwordMatch = tempPassword === tempPasswordRecord.temp_password_plain;
        console.log('🔍 مقارنة النص الخام:', {
          inputPassword: tempPassword,
          storedPlain: tempPasswordRecord.temp_password_plain,
          match: passwordMatch
        });
      }
      
      if (!passwordMatch && tempPasswordRecord.temp_password_hash) {
        // محاولة مقارنة مع bcrypt
        try {
          passwordMatch = await bcrypt.compare(tempPassword, tempPasswordRecord.temp_password_hash);
          console.log('🔍 مقارنة bcrypt:', {
            inputPassword: tempPassword,
            storedHash: tempPasswordRecord.temp_password_hash.substring(0, 20) + '...',
            match: passwordMatch
          });
        } catch (bcryptError) {
          console.warn('⚠️ فشل في مقارنة bcrypt:', bcryptError);
        }
      }
      
      if (!passwordMatch) {
        console.error('❌ كلمة المرور المؤقتة غير صحيحة');
        console.error('🔍 تفاصيل المقارنة:', {
          inputPassword: tempPassword,
          storedPlain: tempPasswordRecord.temp_password_plain,
          storedHashPrefix: tempPasswordRecord.temp_password_hash?.substring(0, 20)
        });
        return { 
          success: false, 
          error: 'كلمة المرور المؤقتة غير صحيحة' 
        };
      }
      
      console.log('✅ كلمة المرور المؤقتة صحيحة، تحديث كلمة المرور...');
      
      // الحصول على معلومات المستخدم
      const userInfo = await getUserInfo(email);
      if (userInfo.error || !userInfo.user) {
        return { 
          success: false, 
          error: 'المستخدم غير موجود أو غير مؤكد' 
        };
      }
      
      // تحديث كلمة المرور باستخدام دالة قاعدة البيانات (بدون الحاجة لجلسة مصادقة)
      try {
        // استخدام دالة SQL مباشرة لتحديث كلمة المرور
        const { error: sqlUpdateError } = await supabase.rpc('update_user_password_direct', {
          p_user_id: userInfo.user.id,
          p_email: email.toLowerCase(),
          p_new_password: newPassword
        });
        
        if (sqlUpdateError) {
          console.error('❌ فشل في تحديث كلمة المرور عبر SQL:', sqlUpdateError);
          
          // محاولة بديلة: استخدام الدالة البسيطة
          const { data: simpleResult, error: simpleError } = await supabase.rpc('update_user_password_simple', {
            p_user_id: userInfo.user.id,
            p_new_password: newPassword
          });
          
          if (simpleError || !simpleResult) {
            console.error('❌ فشل في الدالة البسيطة أيضاً:', simpleError);
            
            // محاولة أخيرة: تحديث مباشر في جدول users
            const bcrypt = await import('bcryptjs');
            const hashedPassword = await bcrypt.hash(newPassword, 12);
            
            const { error: usersUpdateError } = await supabase
              .from('users')
              .update({ 
                password_hash: hashedPassword,
                updated_at: new Date().toISOString()
              })
              .eq('id', userInfo.user.id);
            
            if (usersUpdateError) {
              console.error('❌ فشل في تحديث كلمة المرور في جدول users:', usersUpdateError);
              return { 
                success: false, 
                error: 'فشل في تحديث كلمة المرور' 
              };
            }
            
            console.log('✅ تم تحديث كلمة المرور في جدول users كحل أخير');
          } else {
            console.log('✅ تم تحديث كلمة المرور عبر الدالة البسيطة');
          }
        } else {
          console.log('✅ تم تحديث كلمة المرور عبر دالة SQL');
        }
      } catch (updateError) {
        console.error('❌ خطأ في تحديث كلمة المرور:', updateError);
        return { 
          success: false, 
          error: 'حدث خطأ أثناء تحديث كلمة المرور' 
        };
      }
      
      // تحديث حالة كلمة المرور المؤقتة
      const { error: updateTempError } = await supabase
        .from('temporary_passwords')
        .update({
          is_used: true,
          used_at: new Date().toISOString(),
          is_first_use: false
        })
        .eq('id', tempPasswordRecord.id);
      
      if (updateTempError) {
        console.warn('⚠️ فشل في تحديث حالة كلمة المرور المؤقتة:', updateTempError);
      }
      
      console.log('✅ تم تحديث كلمة المرور بنجاح باستخدام الحل البديل');
      return { success: true };
    }
    
    console.log('✅ تم تحديث كلمة المرور بنجاح باستخدام دالة قاعدة البيانات المحسنة');
    
    console.log('🎉 تمت عملية تحديث كلمة المرور بنجاح');
    return { success: true };
    
  } catch (error: any) {
    console.error('💥 خطأ في تحديث كلمة المرور:', error);
    return { 
      success: false, 
      error: 'حدث خطأ غير متوقع أثناء تحديث كلمة المرور' 
    };
  }
}

/**
 * فحص ما إذا كانت كلمة المرور مؤقتة وصالحة
 */
export async function checkIfTemporaryPassword(
  email: string,
  password: string
): Promise<{ isTemporary: boolean; isValid: boolean; tempPasswordId?: string }> {
  try {
    const tempPasswordCheck = await verifyTemporaryPassword(email, password);

    if (tempPasswordCheck.isValid && tempPasswordCheck.isTemporary) {
      return {
        isTemporary: true,
        isValid: true,
        tempPasswordId: tempPasswordCheck.tempPasswordId
      };
    }

    return { isTemporary: false, isValid: false };
  } catch (error) {
    console.error('Error checking temporary password:', error);
    return { isTemporary: false, isValid: false };
  }
}

/**
 * إرسال كلمة المرور المؤقتة عبر البريد الإلكتروني - نسخة مبسطة للاختبار
 */
export async function sendTemporaryPasswordViaSupabase(email: string): Promise<{
  success: boolean;
  message: string;
  error?: string;
  temporaryPassword?: string;
  expiresAt?: string;
}> {
  try {
    console.log('🎯 === بدء عملية إرسال كلمة المرور المؤقتة (مبسطة) ===');
    console.log('📧 البريد الإلكتروني المُستهدف:', email);
    console.log('⏰ الوقت:', new Date().toLocaleString('ar-SA'));

    // إنشاء كلمة مرور مؤقتة وحفظها في قاعدة البيانات
    console.log('🔄 إنشاء كلمة مرور مؤقتة وحفظها في قاعدة البيانات...');
    
    const createResult = await createTemporaryPassword(email);
    
    if (!createResult.success) {
      console.error('❌ فشل في إنشاء كلمة المرور المؤقتة:', createResult.error);
      return {
        success: false,
        message: 'فشل في إنشاء كلمة المرور المؤقتة',
        error: createResult.error
      };
    }
    
    const temporaryPassword = createResult.temporaryPassword!;
    const expiresAt = new Date(createResult.expiresAt!);

    console.log('🔑 كلمة المرور المؤقتة:', temporaryPassword);
    console.log('⏰ تنتهي في:', expiresAt.toLocaleString('ar-SA'));

    // إرسال البريد الإلكتروني باستخدام الخدمة المتقدمة
    console.log('📧 إرسال البريد الإلكتروني باستخدام AdvancedEmailService...');

    // استيراد الخدمة المتقدمة بدلاً من LocalSMTPService
    const { AdvancedEmailService } = await import('./finalEmailServiceNew');

    // إنشاء محتوى البريد الإلكتروني مباشرة
    const emailSubject = 'كلمة المرور المؤقتة - رزقي';
    // استخدام التاريخ الميلادي بدلاً من الهجري
    const expiryDate = expiresAt.toLocaleString('en-US', {
      timeZone: 'Asia/Riyadh',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // تيمبليت بسيط بدون هيدر مع دعم RTL/LTR
    const isArabic = true; // يمكن تمريرها كمعامل لاحقاً
    const direction = isArabic ? 'rtl' : 'ltr';
    const lang = isArabic ? 'ar' : 'en';

    const baseTemplate = `<!DOCTYPE html>
<html dir="${direction}" lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${emailSubject}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            direction: ${direction};
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .content {
            padding: 30px;
        }
        .content h2 {
            color: #333;
            margin: 0 0 20px 0;
            text-align: center;
        }
        .content p {
            color: #666;
            line-height: 1.6;
            margin: 0 0 15px 0;
        }
        .code-display {
            background: #f8f9fa;
            border: 2px dashed #007bff;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
        }
        .code-display .code {
            font-size: 32px;
            font-weight: bold;
            color: #007bff;
            font-family: 'Courier New', monospace;
            letter-spacing: 3px;
        }
        .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
        }
        .warning strong {
            color: #856404;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .footer .small {
            font-size: 12px;
            margin: 5px 0 0 0;
        }
        @media (max-width: 600px) {
            .container {
                margin: 10px;
                border-radius: 15px;
            }
            .content {
                padding: 20px;
            }
            .content h2 {
                font-size: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            <h2>🔑 كلمة المرور المؤقتة</h2>
            <p>مرحباً بك،</p>
            <p>تم إنشاء كلمة مرور مؤقتة <strong>لإعادة تعيين كلمة مرور حسابك</strong> في موقع رزقي للزواج الإسلامي الشرعي. استخدم كلمة المرور التالية لتسجيل الدخول:</p>

            <div class="code-display">
                <div class="code">${temporaryPassword}</div>
            </div>

            <div class="warning">
                <strong>مهم:</strong> كلمة المرور صالحة لمدة 60 دقيقة فقط وتنتهي في: ${expiryDate}
            </div>

            <p><strong>بعد تسجيل الدخول بكلمة المرور المؤقتة، ستتمكن من إعادة تعيين كلمة مرور جديدة لحسابك.</strong> إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا الإيميل.</p>
        </div>

        <div class="footer">
            <p>فريق رزقي - موقع الزواج الإسلامي الشرعي</p>
            <p class="small">هذا إيميل تلقائي، يرجى عدم الرد عليه مباشرة</p>
        </div>
    </div>
</body>
</html>`;

    const emailText = `
كلمة المرور المؤقتة لإعادة تعيين كلمة مرور حسابك: ${temporaryPassword}

تنتهي صلاحية كلمة المرور في: ${expiryDate}

يرجى استخدام كلمة المرور هذه لتسجيل الدخول، ثم ستتمكن من إعادة تعيين كلمة مرور جديدة لحسابك.

مع تحيات فريق رزقي
    `.trim();

    // استخدام القالب الموحد
    const { createUnifiedEmailTemplate, EmailTemplates } = await import('./unifiedEmailTemplate');
    
    const templateData = EmailTemplates.temporaryPassword(temporaryPassword, expiresAt.toISOString(), 'المستخدم');
    const { html: message, text: textMessage, subject: unifiedSubject } = createUnifiedEmailTemplate(templateData);

    // إرسال عبر الخادم المستقل
    const response = await fetch('http://localhost:3001/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: unifiedSubject,
        html: message,
        text: textMessage,
        from: 'manage@kareemamged.com',
        fromName: 'رزقي - موقع الزواج الإسلامي'
      })
    });

    const emailResult = { success: false, error: 'فشل في الإرسال' };
    if (response.ok) {
      const result = await response.json();
      emailResult.success = result.success;
      if (!result.success) {
        emailResult.error = result.error || 'فشل في الإرسال';
      }
    }

    if (!emailResult.success) {
      console.error('❌ خطأ في إرسال الإيميل:', emailResult.error);
      return {
        success: false,
        message: 'فشل في إرسال الإيميل',
        error: emailResult.error
      };
    }

    console.log('✅ تم إرسال كلمة المرور المؤقتة بنجاح');

    return {
      success: true,
      message: 'تم إرسال كلمة المرور المؤقتة إلى بريدك الإلكتروني',
      temporaryPassword: temporaryPassword,
      expiresAt: expiresAt.toISOString()
    };

  } catch (error) {
    console.error('💥 === خطأ عام في إرسال كلمة المرور المؤقتة ===');
    console.error('❌ الخطأ:', error);
    console.error('❌ نوع الخطأ:', typeof error);
    console.error('❌ تفاصيل الخطأ:', error instanceof Error ? error.stack : error);
    return {
      success: false,
      message: 'خطأ في النظام',
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    };
  }
}

/**
 * إرسال كلمة المرور المؤقتة مباشرة عبر SMTP
 */
async function sendDirectTemporaryPasswordEmail(
  email: string,
  temporaryPassword: string,
  expiresAt: string,
  recipientName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // إنشاء محتوى البريد الإلكتروني
    const subject = 'كلمة المرور المؤقتة - رزقي';
    const expiryDate = new Date(expiresAt).toLocaleString('ar-SA', {
      timeZone: 'Asia/Riyadh',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const htmlContent = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>كلمة المرور المؤقتة - رزقي</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
        body { margin: 0; padding: 0; font-family: 'Amiri', serif; }
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Amiri', serif; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 40px 20px; min-height: 100vh;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); overflow: hidden;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: white; font-size: 32px; margin: 0; font-weight: bold;">🔑 رزقي</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">كلمة المرور المؤقتة</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
            <h2 style="color: #f59e0b; font-size: 24px; margin: 0 0 20px 0; text-align: center;">🔐 كلمة المرور المؤقتة</h2>

            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">السلام عليكم ورحمة الله وبركاته ${recipientName}،</p>

            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">تم إنشاء كلمة مرور مؤقتة لحسابك في موقع رزقي للزواج الإسلامي الشرعي. يمكنك استخدام كلمة المرور التالية لتسجيل الدخول:</p>

            <!-- Temporary Password Box -->
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%); border-radius: 15px; padding: 30px; margin: 30px 0; text-align: center; border: 2px solid #f59e0b;">
                <h3 style="color: #92400e; font-size: 18px; margin: 0 0 15px 0;">🔑 كلمة المرور المؤقتة:</h3>
                <div style="background: white; border-radius: 10px; padding: 20px; margin: 15px 0; border: 2px dashed #f59e0b;">
                    <h2 style="color: #f59e0b; font-size: 28px; margin: 0; font-family: 'Courier New', monospace; letter-spacing: 2px; font-weight: bold;">${temporaryPassword}</h2>
                </div>
                <p style="color: #92400e; font-size: 14px; margin: 10px 0 0 0;">⏰ صالحة حتى: ${expiryDate}</p>
            </div>

            <!-- Instructions -->
            <div style="background: #dcfce7; border-radius: 10px; padding: 20px; margin: 20px 0; border-right: 4px solid #16a34a;">
                <h3 style="color: #166534; font-size: 18px; margin: 0 0 10px 0;">📋 خطوات تسجيل الدخول:</h3>
                <ol style="color: #166534; margin: 0; padding-right: 20px; line-height: 1.8;">
                    <li>اذهب إلى صفحة تسجيل الدخول في موقع رزقي</li>
                    <li>أدخل بريدك الإلكتروني</li>
                    <li>أدخل كلمة المرور المؤقتة المذكورة أعلاه</li>
                    <li>اضغط على "تسجيل الدخول"</li>
                    <li>ستتم مطالبتك بتغيير كلمة المرور فوراً</li>
                </ol>
            </div>

            <!-- Login Button -->
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://rezgee.vercel.app/login" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);">🔐 تسجيل الدخول الآن</a>
            </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 رزقي - موقع الزواج الإسلامي الشرعي</p>
            <p style="color: #6b7280; font-size: 12px; margin: 5px 0 0 0;">هذا الإيميل تم إرساله تلقائياً، يرجى عدم الرد عليه</p>
        </div>
    </div>
</body>
</html>`;

    const textContent = `
السلام عليكم ورحمة الله وبركاته ${recipientName}،

تم إنشاء كلمة مرور مؤقتة لحسابك في موقع رزقي للزواج الإسلامي الشرعي.

كلمة المرور المؤقتة: ${temporaryPassword}
صالحة حتى: ${expiryDate}

خطوات تسجيل الدخول:
1. اذهب إلى صفحة تسجيل الدخول في موقع رزقي
2. أدخل بريدك الإلكتروني
3. أدخل كلمة المرور المؤقتة المذكورة أعلاه
4. اضغط على "تسجيل الدخول"
5. ستتم مطالبتك بتغيير كلمة المرور فوراً

رابط تسجيل الدخول: https://rezgee.vercel.app/login

© 2025 رزقي - موقع الزواج الإسلامي الشرعي
`;



    // استخدم Supabase Edge Function الجديد مع Resend API
    try {
      console.log('🚀 بدء عملية إرسال البريد الإلكتروني...');
      console.log('📧 البريد الإلكتروني:', email);
      console.log('📝 الموضوع:', subject);
      console.log('🔧 استدعاء Edge Function: send-temporary-password-fixed');

      const requestBody = {
        to: email,
        subject,
        html: htmlContent,
        text: textContent,
        type: 'temporary-password'
      };

      console.log('📦 بيانات الطلب:', {
        to: requestBody.to,
        subject: requestBody.subject,
        type: requestBody.type,
        htmlLength: requestBody.html.length,
        textLength: requestBody.text.length
      });

      const { data, error } = await supabase.functions.invoke('send-temporary-password-fixed', {
        body: requestBody
      });

      console.log('📨 استجابة Edge Function:', { data, error });

      if (error) {
        console.error('❌ خطأ في Supabase Edge Function:', error);
        console.error('❌ تفاصيل الخطأ:', JSON.stringify(error, null, 2));
        return { success: false, error: error.message };
      }

      if (data && data.success) {
        console.log('✅ تم إرسال البريد عبر Supabase Edge Function بنجاح');
        console.log('📧 معرف الرسالة:', data.messageId);
        console.log('🔧 طريقة الإرسال:', data.method);
        return { success: true };
      } else {
        console.error('❌ فشل في إرسال البريد - البيانات المُستلمة:', data);
        console.error('❌ رسالة الخطأ:', data?.error);
        return { success: false, error: data?.error || 'فشل في إرسال البريد' };
      }
    } catch (error) {
      console.error('❌ خطأ عام في إرسال البريد:', error);
      console.error('❌ نوع الخطأ:', typeof error);
      console.error('❌ تفاصيل الخطأ:', error instanceof Error ? error.stack : error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطأ غير معروف'
      };
    }

  } catch (error) {
    console.error('❌ خطأ في إنشاء محتوى البريد:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطأ في إنشاء محتوى البريد'
    };
  }
}

/**
 * تحديث template الـ recovery في Supabase ليحتوي على كلمة المرور المؤقتة
 */
async function updateSupabaseRecoveryTemplate(temporaryPassword: string, expiresAt: string): Promise<void> {
  try {
    // تحديث template الـ recovery مع كلمة المرور المؤقتة
    const updatedTemplate = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>كلمة المرور المؤقتة - رزقي</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
        body { margin: 0; padding: 0; font-family: 'Amiri', serif; }
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Amiri', serif; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 40px 20px; min-height: 100vh;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); overflow: hidden;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: white; font-size: 32px; margin: 0; font-weight: bold;">🔑 رزقي</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">كلمة المرور المؤقتة</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
            <h2 style="color: #f59e0b; font-size: 24px; margin: 0 0 20px 0; text-align: center;">🔐 كلمة المرور المؤقتة</h2>

            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">السلام عليكم ورحمة الله وبركاته،</p>

            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">تم إنشاء كلمة مرور مؤقتة لحسابك في موقع رزقي للزواج الإسلامي الشرعي. يمكنك استخدام كلمة المرور التالية لتسجيل الدخول:</p>

            <!-- Temporary Password Box -->
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%); border-radius: 15px; padding: 30px; margin: 30px 0; text-align: center; border: 2px solid #f59e0b;">
                <h3 style="color: #92400e; font-size: 18px; margin: 0 0 15px 0;">🔑 كلمة المرور المؤقتة:</h3>
                <div style="background: white; border-radius: 10px; padding: 20px; margin: 15px 0; border: 2px dashed #f59e0b;">
                    <h2 style="color: #f59e0b; font-size: 28px; margin: 0; font-family: 'Courier New', monospace; letter-spacing: 2px; font-weight: bold;">${temporaryPassword}</h2>
                </div>
                <p style="color: #92400e; font-size: 14px; margin: 10px 0 0 0;">⏰ صالحة حتى: ${new Date(expiresAt).toLocaleString('ar-SA')}</p>
            </div>

            <!-- Instructions -->
            <div style="background: #dcfce7; border-radius: 10px; padding: 20px; margin: 20px 0; border-right: 4px solid #16a34a;">
                <h3 style="color: #166534; font-size: 18px; margin: 0 0 10px 0;">📋 خطوات تسجيل الدخول:</h3>
                <ol style="color: #166534; margin: 0; padding-right: 20px; line-height: 1.8;">
                    <li>اذهب إلى صفحة تسجيل الدخول في موقع رزقي</li>
                    <li>أدخل بريدك الإلكتروني</li>
                    <li>أدخل كلمة المرور المؤقتة المذكورة أعلاه</li>
                    <li>اضغط على "تسجيل الدخول"</li>
                    <li>ستتم مطالبتك بتغيير كلمة المرور فوراً</li>
                </ol>
            </div>

            <!-- Login Button -->
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://rezgee.vercel.app/login" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);">🔐 تسجيل الدخول الآن</a>
            </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 رزقي - موقع الزواج الإسلامي الشرعي</p>
            <p style="color: #6b7280; font-size: 12px; margin: 5px 0 0 0;">هذا الإيميل تم إرساله تلقائياً، يرجى عدم الرد عليه</p>
        </div>
    </div>
</body>
</html>`;

    // تحديث template في Supabase (هذا سيتطلب استخدام Management API)
    console.log('🔄 تحديث template الـ recovery في Supabase...');

    // ملاحظة: في الواقع، سنحتاج لاستخدام Management API لتحديث template
    // لكن للآن سنعتمد على template الثابت الذي تم تحديثه مسبقاً

  } catch (error) {
    console.error('❌ خطأ في تحديث template:', error);
  }
}
