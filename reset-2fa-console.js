/**
 * سكريبت لحذف محاولات المصادقة الثنائية من كونسول المتصفح
 * 
 * كيفية الاستخدام:
 * 1. افتح المتصفح وانتقل لموقع رزقي
 * 2. افتح Developer Tools (F12)
 * 3. انتقل لتبويب Console
 * 4. انسخ والصق هذا الكود واضغط Enter
 */

// دالة لحذف محاولات المصادقة الثنائية لمستخدم معين
async function resetTwoFactorAttempts(email = 'talae@gmail.com') {
    try {
        console.log('🔍 البحث عن المستخدم:', email);
        
        // الحصول على معرف المستخدم
        const { data: userProfile, error: userError } = await window.supabase
            .from('profiles')
            .select('id, email, first_name, last_name')
            .eq('email', email)
            .single();
        
        if (userError) {
            console.error('❌ خطأ في البحث عن المستخدم:', userError);
            return false;
        }
        
        if (!userProfile) {
            console.error('❌ لم يتم العثور على المستخدم:', email);
            return false;
        }
        
        console.log('✅ تم العثور على المستخدم:', {
            id: userProfile.id,
            email: userProfile.email,
            name: `${userProfile.first_name} ${userProfile.last_name}`
        });
        
        // حذف جميع رموز المصادقة الثنائية
        console.log('🗑️ حذف رموز المصادقة الثنائية...');
        const { data: deletedCodes, error: deleteError } = await window.supabase
            .from('two_factor_codes')
            .delete()
            .eq('user_id', userProfile.id)
            .select();
        
        if (deleteError) {
            console.error('❌ خطأ في حذف الرموز:', deleteError);
            return false;
        }
        
        console.log('✅ تم حذف', deletedCodes?.length || 0, 'رمز مصادقة ثنائية');
        
        // محاولة حذف سجلات الحد الزمني إذا كانت موجودة
        try {
            console.log('🗑️ حذف سجلات الحد الزمني...');
            const { data: deletedLimits, error: limitError } = await window.supabase
                .from('two_factor_rate_limits')
                .delete()
                .eq('user_id', userProfile.id)
                .select();
            
            if (limitError && limitError.code !== 'PGRST116') { // PGRST116 = table not found
                console.warn('⚠️ تحذير في حذف سجلات الحد الزمني:', limitError);
            } else {
                console.log('✅ تم حذف', deletedLimits?.length || 0, 'سجل حد زمني');
            }
        } catch (limitException) {
            console.warn('⚠️ جدول الحد الزمني غير موجود (طبيعي)');
        }
        
        console.log('🎉 تم إعادة تعيين حساب', email, 'بنجاح!');
        console.log('💡 يمكنك الآن اختبار المصادقة الثنائية بدون قيود');
        
        return true;
        
    } catch (error) {
        console.error('❌ خطأ عام:', error);
        return false;
    }
}

// دالة للتحقق من حالة المحاولات الحالية
async function checkTwoFactorStatus(email = 'talae@gmail.com') {
    try {
        console.log('📊 فحص حالة المصادقة الثنائية لـ:', email);
        
        // الحصول على معرف المستخدم
        const { data: userProfile, error: userError } = await window.supabase
            .from('profiles')
            .select('id, email')
            .eq('email', email)
            .single();
        
        if (userError || !userProfile) {
            console.error('❌ لم يتم العثور على المستخدم');
            return;
        }
        
        // فحص الرموز الحالية
        const { data: codes, error: codesError } = await window.supabase
            .from('two_factor_codes')
            .select('*')
            .eq('user_id', userProfile.id)
            .order('created_at', { ascending: false });
        
        if (codesError) {
            console.error('❌ خطأ في فحص الرموز:', codesError);
            return;
        }
        
        console.log('📈 إحصائيات المصادقة الثنائية:');
        console.log('- إجمالي الرموز:', codes?.length || 0);
        
        if (codes && codes.length > 0) {
            const today = new Date().toISOString().split('T')[0];
            const todayCodes = codes.filter(code => 
                code.created_at.startsWith(today)
            );
            
            console.log('- رموز اليوم:', todayCodes.length);
            console.log('- آخر رمز:', codes[0].created_at);
            console.log('- حالة آخر رمز:', codes[0].is_used ? 'مستخدم' : 'غير مستخدم');
        }
        
    } catch (error) {
        console.error('❌ خطأ في فحص الحالة:', error);
    }
}

// تشغيل تلقائي للدالة
console.log('🔧 أدوات إعادة تعيين المصادقة الثنائية جاهزة!');
console.log('📝 الأوامر المتاحة:');
console.log('- resetTwoFactorAttempts("email@example.com") - حذف محاولات مستخدم');
console.log('- checkTwoFactorStatus("email@example.com") - فحص حالة المحاولات');
console.log('');
console.log('🚀 تشغيل تلقائي لحذف محاولات talae@gmail.com...');

// تشغيل تلقائي
resetTwoFactorAttempts('talae@gmail.com');
