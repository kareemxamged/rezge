import { supabase } from '../lib/supabase';

/**
 * إصلاح البيانات الفارغة في ملفات المستخدمين
 * هذه الدالة تبحث عن المستخدمين الذين لديهم first_name فارغ وتحدثه بقيم افتراضية
 */
export const fixEmptyProfileData = async () => {
  try {
    console.log('Starting to fix empty profile data...');

    // البحث عن المستخدمين الذين لديهم first_name فارغ أو null
    const { data: usersWithEmptyData, error: fetchError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .or('first_name.is.null,first_name.eq.,last_name.is.null,last_name.eq.');

    if (fetchError) {
      console.error('Error fetching users with empty data:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (!usersWithEmptyData || usersWithEmptyData.length === 0) {
      console.log('No users with empty data found');
      return { success: true, message: 'No users need fixing' };
    }

    console.log(`Found ${usersWithEmptyData.length} users with empty data:`, usersWithEmptyData);

    // تحديث كل مستخدم
    const updatePromises = usersWithEmptyData.map(async (user) => {
      const updates: any = {
        updated_at: new Date().toISOString()
      };

      // إصلاح first_name إذا كان فارغاً
      if (!user.first_name || user.first_name.trim() === '') {
        updates.first_name = 'المستخدم';
      }

      // إصلاح last_name إذا كان فارغاً
      if (!user.last_name || user.last_name.trim() === '') {
        updates.last_name = '';
      }

      console.log(`Updating user ${user.id} with:`, updates);

      const { error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (updateError) {
        console.error(`Error updating user ${user.id}:`, updateError);
        return { id: user.id, success: false, error: updateError.message };
      }

      return { id: user.id, success: true };
    });

    const results = await Promise.all(updatePromises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`Profile data fix completed: ${successful} successful, ${failed} failed`);

    return {
      success: true,
      message: `Fixed ${successful} users, ${failed} failed`,
      results
    };

  } catch (error) {
    console.error('Error in fixEmptyProfileData:', error);
    return { success: false, error: (error as Error).message };
  }
};

/**
 * إنشاء ملفات شخصية مفقودة للمستخدمين في auth.users الذين ليس لديهم ملفات في جدول users
 */
export const createMissingProfiles = async () => {
  try {
    console.log('Starting to create missing profiles...');

    // البحث عن المستخدمين في auth.users الذين ليس لديهم ملفات في users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching auth users:', authError);
      return { success: false, error: authError.message };
    }

    if (!authUsers.users || authUsers.users.length === 0) {
      console.log('No auth users found');
      return { success: true, message: 'No auth users found' };
    }

    // فحص كل مستخدم auth للتأكد من وجود ملف شخصي
    const missingProfiles = [];
    
    for (const authUser of authUsers.users) {
      const { error: profileError } = await supabase
        .from('users')
        .select('id')
        .eq('id', authUser.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        // المستخدم غير موجود في جدول users
        missingProfiles.push(authUser);
      }
    }

    if (missingProfiles.length === 0) {
      console.log('All auth users have profiles');
      return { success: true, message: 'All users have profiles' };
    }

    console.log(`Found ${missingProfiles.length} users without profiles`);

    // إنشاء ملفات شخصية للمستخدمين المفقودين
    const createPromises = missingProfiles.map(async (authUser) => {
      const profileData = {
        id: authUser.id,
        email: authUser.email || '',
        password_hash: 'handled_by_supabase_auth',
        first_name: authUser.user_metadata?.first_name || 'المستخدم',
        last_name: authUser.user_metadata?.last_name || '',
        phone: authUser.phone || '',
        verified: false,
        status: 'active',
        profile_visibility: 'public',
        show_phone: false,
        show_email: false,
        allow_messages: true,
        family_can_view: false,
        two_factor_enabled: false,
        login_notifications: true,
        message_notifications: true,
        created_at: authUser.created_at,
        updated_at: new Date().toISOString()
      };

      console.log(`Creating profile for user ${authUser.id}`);

      const { error: createError } = await supabase
        .from('users')
        .insert(profileData);

      if (createError) {
        console.error(`Error creating profile for user ${authUser.id}:`, createError);
        return { id: authUser.id, success: false, error: createError.message };
      }

      return { id: authUser.id, success: true };
    });

    const results = await Promise.all(createPromises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`Missing profiles creation completed: ${successful} successful, ${failed} failed`);

    return {
      success: true,
      message: `Created ${successful} profiles, ${failed} failed`,
      results
    };

  } catch (error) {
    console.error('Error in createMissingProfiles:', error);
    return { success: false, error: (error as Error).message };
  }
};

/**
 * تشغيل جميع إصلاحات البيانات
 */
export const runAllProfileFixes = async () => {
  console.log('Running all profile fixes...');
  
  const results = {
    missingProfiles: await createMissingProfiles(),
    emptyData: await fixEmptyProfileData()
  };

  console.log('All profile fixes completed:', results);
  return results;
};
