import { supabase } from './supabase';

// أنواع البيانات للإعجابات وطلبات التواصل
export interface Like {
  id: string;
  liker_id: string;
  liked_user_id: string;
  like_type: 'like' | 'super_like' | 'interest';
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  created_at: string;
  updated_at?: string;
  expires_at?: string;
  liker?: any; // بيانات المرسل
  liked_user?: any; // بيانات المستقبل
}

// تم إزالة الواجهات غير المطلوبة لتبسيط الخدمة

// خدمة الإعجابات وطلبات التواصل المحسنة
export class LikesService {

  /**
   * إرسال إعجاب مع حساب التوافق والتحقق من القيود
   */
  static async sendLike(
    likerId: string,
    likedUserId: string,
    likeType: 'like' | 'super_like' | 'interest' = 'like',
    message?: string
  ): Promise<{ success: boolean; error?: any; data?: Like; isMatch?: boolean }> {
    try {
      // التحقق من تسجيل الدخول
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== likerId) {
        return { success: false, error: 'يجب تسجيل الدخول أولاً' };
      }
      // التحقق من عدم وجود إعجاب سابق
      const { data: existingLike, error: checkError } = await supabase
        .from('likes')
        .select('*')
        .eq('liker_id', likerId)
        .eq('liked_user_id', likedUserId)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing like:', checkError);
        return { success: false, error: checkError };
      }

      if (existingLike) {
        return { success: false, error: 'لقد أرسلت إعجاباً لهذا المستخدم من قبل' };
      }

      // إنشاء إعجاب جديد
      const newLike = {
        liker_id: likerId,
        liked_user_id: likedUserId,
        like_type: likeType,
        message: message,
        status: 'pending' as const,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // ينتهي خلال أسبوع
      };

      const { data, error } = await supabase
        .from('likes')
        .insert(newLike)
        .select()
        .single();

      if (error) {
        return { success: false, error };
      }

      // التحقق من وجود إعجاب متبادل
      const { data: mutualLike, error: mutualError } = await supabase
        .from('likes')
        .select('*')
        .eq('liker_id', likedUserId)
        .eq('liked_user_id', likerId)
        .eq('status', 'pending')
        .maybeSingle();

      if (mutualError) {
        console.error('Error checking mutual like:', mutualError);
        // لا نوقف العملية، فقط نسجل الخطأ
      }

      let isMatch = false;
      if (mutualLike && !mutualError) {
        // إعجاب متبادل - إنشاء مطابقة
        await this.createMutualMatch(likerId, likedUserId);

        // تحديث حالة الإعجابات إلى مقبولة
        const { error: updateError } = await supabase
          .from('likes')
          .update({ status: 'accepted' })
          .in('id', [data.id, mutualLike.id]);

        if (updateError) {
          console.error('Error updating likes status:', updateError);
        } else {
          isMatch = true;
        }
      }

      return { success: true, data, isMatch };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * التحقق من حالة الإعجاب بين مستخدمين
   */
  static async checkLikeStatus(
    likerId: string,
    likedUserId: string
  ): Promise<{ hasLiked: boolean; likeData?: Like; error?: any }> {
    try {
      const { data: like, error } = await supabase
        .from('likes')
        .select('*')
        .eq('liker_id', likerId)
        .eq('liked_user_id', likedUserId)
        .maybeSingle();

      if (error) {
        console.error('Error checking like status:', error);
        return { hasLiked: false, error };
      }

      return { hasLiked: !!like, likeData: like || undefined };
    } catch (error) {
      console.error('Unexpected error checking like status:', error);
      return { hasLiked: false, error };
    }
  }

  /**
   * إلغاء الإعجاب
   */
  static async removeLike(
    likerId: string,
    likedUserId: string
  ): Promise<{ success: boolean; error?: any }> {
    try {
      // التحقق من تسجيل الدخول
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== likerId) {
        return { success: false, error: 'يجب تسجيل الدخول أولاً' };
      }

      // البحث عن الإعجاب
      const { data: existingLike, error: findError } = await supabase
        .from('likes')
        .select('*')
        .eq('liker_id', likerId)
        .eq('liked_user_id', likedUserId)
        .maybeSingle();

      if (findError) {
        console.error('Error finding like to remove:', findError);
        return { success: false, error: findError };
      }

      if (!existingLike) {
        return { success: false, error: 'لا يوجد إعجاب لإلغاؤه' };
      }

      // إذا كان الإعجاب مقبولاً (مطابقة)، نحتاج لحذف المطابقة أيضاً
      if (existingLike.status === 'accepted') {
        // حذف المطابقة
        const { error: matchDeleteError } = await supabase
          .from('matches')
          .delete()
          .or(`and(user1_id.eq.${likerId},user2_id.eq.${likedUserId}),and(user1_id.eq.${likedUserId},user2_id.eq.${likerId})`);

        if (matchDeleteError) {
          console.error('Error deleting match:', matchDeleteError);
          // نستمر في حذف الإعجاب حتى لو فشل حذف المطابقة
        }

        // تحديث حالة الإعجاب المتبادل إلى pending إذا كان موجوداً
        const { error: updateMutualError } = await supabase
          .from('likes')
          .update({ status: 'pending' })
          .eq('liker_id', likedUserId)
          .eq('liked_user_id', likerId)
          .eq('status', 'accepted');

        if (updateMutualError) {
          console.error('Error updating mutual like status:', updateMutualError);
        }
      }

      // حذف الإعجاب
      const { error: deleteError } = await supabase
        .from('likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) {
        console.error('Error deleting like:', deleteError);
        return { success: false, error: deleteError };
      }

      console.log('Like removed successfully');
      return { success: true };
    } catch (error) {
      console.error('Unexpected error removing like:', error);
      return { success: false, error };
    }
  }

  // الرد على إعجاب
  static async respondToLike(
    likeId: string,
    response: 'accepted' | 'rejected'
  ): Promise<{ success: boolean; error?: any }> {
    try {
      const { data: like, error: fetchError } = await supabase
        .from('likes')
        .select('*')
        .eq('id', likeId)
        .maybeSingle();

      if (fetchError || !like) {
        return { success: false, error: 'الإعجاب غير موجود' };
      }

      // تحديث حالة الإعجاب
      const { error: updateError } = await supabase
        .from('likes')
        .update({ 
          status: response,
          updated_at: new Date().toISOString()
        })
        .eq('id', likeId);

      if (updateError) {
        return { success: false, error: updateError };
      }

      // إذا تم القبول، إنشاء مطابقة
      if (response === 'accepted') {
        await this.createMutualMatch(like.liker_id, like.liked_user_id);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  // إنشاء مطابقة متبادلة
  private static async createMutualMatch(user1Id: string, user2Id: string) {
    try {
      // التحقق من عدم وجود مطابقة سابقة باستخدام استعلام منفصل لكل احتمال
      const { data: existingMatch1 } = await supabase
        .from('matches')
        .select('*')
        .eq('user1_id', user1Id)
        .eq('user2_id', user2Id)
        .maybeSingle();

      const { data: existingMatch2 } = await supabase
        .from('matches')
        .select('*')
        .eq('user1_id', user2Id)
        .eq('user2_id', user1Id)
        .maybeSingle();

      // إذا لم توجد مطابقة سابقة، أنشئ واحدة جديدة
      if (!existingMatch1 && !existingMatch2) {
        const { error: insertError } = await supabase
          .from('matches')
          .insert({
            user1_id: user1Id,
            user2_id: user2Id,
            match_score: 85, // نقاط افتراضية للمطابقة المتبادلة
            status: 'active'
          });

        if (insertError) {
          console.error('Error inserting match:', insertError);
        }
      }
    } catch (error) {
      console.error('Error creating mutual match:', error);
    }
  }

  // الحصول على الإعجابات المستلمة
  static async getReceivedLikes(userId: string): Promise<{ data: any[]; error: any }> {
    try {
      // جلب الإعجابات مع بيانات المرسلين في استعلام واحد
      const { data: likes, error } = await supabase
        .from('likes')
        .select(`
          *,
          liker:users!likes_liker_id_fkey(
            id, first_name, last_name, age, city, education,
            profession, religious_commitment, verified
          )
        `)
        .eq('liked_user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching received likes:', error);
        // في حالة فشل الاستعلام المدمج، نجرب الطريقة البديلة
        return await this.getReceivedLikesAlternative(userId);
      }

      // معالجة البيانات وإضافة قيم افتراضية للمستخدمين المفقودين
      const processedLikes = (likes || []).map(like => ({
        ...like,
        liker: like.liker || {
          id: like.liker_id,
          first_name: 'مستخدم',
          last_name: 'غير متاح',
          age: null,
          city: 'غير محدد',
          education: 'غير محدد',
          profession: 'غير محدد',
          religious_commitment: 'غير محدد',
          verified: false
        }
      }));

      return { data: processedLikes, error: null };
    } catch (error) {
      console.error('Error in getReceivedLikes:', error);
      return await this.getReceivedLikesAlternative(userId);
    }
  }

  // طريقة بديلة لجلب الإعجابات المستلمة
  private static async getReceivedLikesAlternative(userId: string): Promise<{ data: any[]; error: any }> {
    try {
      const { data: likes, error } = await supabase
        .from('likes')
        .select('*')
        .eq('liked_user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return { data: [], error };
      }

      // إضافة بيانات افتراضية لجميع الإعجابات
      const likesWithDefaultUsers = (likes || []).map(like => ({
        ...like,
        liker: {
          id: like.liker_id,
          first_name: 'مستخدم',
          last_name: 'غير متاح',
          age: null,
          city: 'غير محدد',
          education: 'غير محدد',
          profession: 'غير محدد',
          religious_commitment: 'غير محدد',
          verified: false
        }
      }));

      return { data: likesWithDefaultUsers, error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  // تم إزالة دالة الإعجابات المرسلة لتبسيط الخدمة

  // تم إزالة دوال طلبات التواصل لتبسيط الخدمة

  // تم إزالة دوال الرد على طلبات التواصل لتبسيط الخدمة

  // تم إزالة دوال طلبات التواصل والمحادثات لتبسيط الخدمة

  // تم إزالة دوال حذف الإعجابات وطلبات التواصل لتبسيط الخدمة

  // تم إزالة دوال الإحصائيات والمشاهدات والاقتراحات الذكية لتبسيط الخدمة
}

export default LikesService;
