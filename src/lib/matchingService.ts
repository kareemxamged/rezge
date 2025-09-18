import { supabase, type User } from './supabase';

// نوع بيانات المطابقة
export interface MatchResult {
  user: User;
  compatibilityScore: number;
  compatibilityFactors: {
    age: number;
    location: number;
    education: number;
    religiousCommitment: number;
    maritalStatus: number;
  };
  matchReason: string[];
}

// إعدادات المطابقة
export interface MatchingPreferences {
  ageRange: { min: number; max: number };
  maxDistance?: number; // بالكيلومتر
  educationImportance: 'low' | 'medium' | 'high';
  religiousImportance: 'low' | 'medium' | 'high';
  locationImportance: 'low' | 'medium' | 'high';
}

// خدمة المطابقة الذكية
export class MatchingService {
  
  // حساب نقاط التوافق بين مستخدمين
  static calculateCompatibility(user1: User, user2: User): MatchResult {
    const factors = {
      age: this.calculateAgeCompatibility(user1.age || 0, user2.age || 0),
      location: this.calculateLocationCompatibility(user1.city || '', user2.city || ''),
      education: this.calculateEducationCompatibility(user1.education || '', user2.education || ''),
      religiousCommitment: this.calculateReligiousCompatibility(
        user1.religious_commitment || 'medium', 
        user2.religious_commitment || 'medium'
      ),
      maritalStatus: this.calculateMaritalStatusCompatibility(
        user1.marital_status || 'single', 
        user2.marital_status || 'single'
      )
    };

    // حساب النقاط الإجمالية مع الأوزان المحسنة
    const weights = {
      age: 0.20,                    // العمر مهم لكن ليس الأهم
      location: 0.15,               // الموقع مهم للقاء
      education: 0.25,              // التعليم مهم للتفاهم
      religiousCommitment: 0.30,    // الالتزام الديني الأهم في المجتمع المسلم
      maritalStatus: 0.10           // الحالة الاجتماعية
    };

    const totalScore = Object.entries(factors).reduce((sum, [key, value]) => {
      return sum + (value * weights[key as keyof typeof weights]);
    }, 0);

    // تحديد أسباب التوافق
    const matchReasons = this.generateMatchReasons(factors);

    return {
      user: user2,
      compatibilityScore: Math.round(totalScore * 100),
      compatibilityFactors: factors,
      matchReason: matchReasons
    };
  }

  // حساب توافق العمر (محسن)
  private static calculateAgeCompatibility(age1: number, age2: number): number {
    if (!age1 || !age2) return 0.3;

    const ageDiff = Math.abs(age1 - age2);

    // حساب أكثر واقعية للتوافق العمري
    if (ageDiff <= 1) return 0.95;     // فرق سنة واحدة - توافق ممتاز
    if (ageDiff <= 3) return 0.90;     // فرق 2-3 سنوات - توافق ممتاز
    if (ageDiff <= 5) return 0.80;     // فرق 4-5 سنوات - توافق جيد جداً
    if (ageDiff <= 7) return 0.70;     // فرق 6-7 سنوات - توافق جيد
    if (ageDiff <= 10) return 0.55;    // فرق 8-10 سنوات - توافق متوسط
    if (ageDiff <= 15) return 0.35;    // فرق 11-15 سنة - توافق ضعيف
    return 0.15;                       // فرق أكبر من 15 سنة - توافق ضعيف جداً
  }

  // حساب توافق الموقع
  private static calculateLocationCompatibility(city1: string, city2: string): number {
    if (!city1 || !city2) return 0.5;
    
    // نفس المدينة
    if (city1.toLowerCase() === city2.toLowerCase()) return 1.0;
    
    // مدن متقاربة (يمكن تطوير هذا لاحقاً بقاعدة بيانات المدن)
    const sameRegionCities = this.getSameRegionCities();
    const city1Region = this.getCityRegion(city1, sameRegionCities);
    const city2Region = this.getCityRegion(city2, sameRegionCities);
    
    if (city1Region && city1Region === city2Region) return 0.7;
    
    return 0.3; // مدن مختلفة
  }

  // حساب توافق التعليم (محسن)
  private static calculateEducationCompatibility(edu1: string, edu2: string): number {
    if (!edu1 || !edu2) return 0.4;

    // البحث عن أفضل تطابق للنص
    const findEducationLevel = (education: string): number => {
      const lowerEdu = education.toLowerCase();

      if (lowerEdu.includes('دكتوراه') || lowerEdu.includes('phd')) return 5;
      if (lowerEdu.includes('ماجستير') || lowerEdu.includes('master')) return 4;
      if (lowerEdu.includes('بكالوريوس') || lowerEdu.includes('bachelor') || lowerEdu.includes('هندسة') || lowerEdu.includes('طب')) return 3;
      if (lowerEdu.includes('دبلوم') || lowerEdu.includes('diploma')) return 2;
      if (lowerEdu.includes('ثانوية') || lowerEdu.includes('ثانوي') || lowerEdu.includes('high school')) return 1;

      return 3; // افتراضي: بكالوريوس
    };

    const level1 = findEducationLevel(edu1);
    const level2 = findEducationLevel(edu2);

    const diff = Math.abs(level1 - level2);

    // حساب أكثر دقة للتوافق التعليمي
    if (diff === 0) return 0.90;       // نفس المستوى - توافق ممتاز
    if (diff === 1) return 0.75;       // فرق مستوى واحد - توافق جيد
    if (diff === 2) return 0.55;       // فرق مستويين - توافق متوسط
    if (diff === 3) return 0.35;       // فرق ثلاث مستويات - توافق ضعيف
    return 0.20;                       // فرق كبير - توافق ضعيف جداً
  }

  // حساب توافق الالتزام الديني (محسن)
  private static calculateReligiousCompatibility(
    commitment1: 'high' | 'medium' | 'practicing' | 'very_religious' | 'religious' | 'moderate',
    commitment2: 'high' | 'medium' | 'practicing' | 'very_religious' | 'religious' | 'moderate'
  ): number {
    // تحديث مستويات الالتزام الديني لتشمل القيم الجديدة
    const commitmentLevels = {
      'moderate': 1,
      'medium': 2,
      'practicing': 3,
      'religious': 4,
      'high': 5,
      'very_religious': 6
    };

    const level1 = commitmentLevels[commitment1] || commitmentLevels['medium'];
    const level2 = commitmentLevels[commitment2] || commitmentLevels['medium'];

    const diff = Math.abs(level1 - level2);

    // حساب أكثر دقة للتوافق الديني
    if (diff === 0) return 0.95;       // نفس المستوى - توافق ممتاز
    if (diff === 1) return 0.85;       // فرق مستوى واحد - توافق جيد جداً
    if (diff === 2) return 0.65;       // فرق مستويين - توافق متوسط
    if (diff === 3) return 0.40;       // فرق ثلاث مستويات - توافق ضعيف
    return 0.20;                       // فرق كبير - توافق ضعيف جداً
  }

  // حساب توافق الحالة الاجتماعية
  private static calculateMaritalStatusCompatibility(
    status1: string,
    status2: string
  ): number {
    // تحويل القيم إلى الأنواع المقبولة
    const normalizeStatus = (status: string): 'single' | 'divorced' | 'widowed' => {
      if (status === 'married' || status === 'unmarried') return 'single';
      if (status === 'divorced_female') return 'divorced';
      if (status === 'widowed_female') return 'widowed';
      if (['single', 'divorced', 'widowed'].includes(status)) return status as 'single' | 'divorced' | 'widowed';
      return 'single'; // default
    };

    const normalizedStatus1 = normalizeStatus(status1);
    const normalizedStatus2 = normalizeStatus(status2);
    // نفس الحالة
    if (normalizedStatus1 === normalizedStatus2) return 1.0;

    // حالات متوافقة
    if ((normalizedStatus1 === 'divorced' && normalizedStatus2 === 'widowed') ||
        (normalizedStatus1 === 'widowed' && normalizedStatus2 === 'divorced')) {
      return 0.8;
    }

    // أعزب مع مطلق/أرمل
    if ((normalizedStatus1 === 'single' && (normalizedStatus2 === 'divorced' || normalizedStatus2 === 'widowed')) ||
        (normalizedStatus2 === 'single' && (normalizedStatus1 === 'divorced' || normalizedStatus1 === 'widowed'))) {
      return 0.6;
    }
    
    return 0.5;
  }

  // توليد أسباب التوافق
  private static generateMatchReasons(
    factors: MatchResult['compatibilityFactors']
  ): string[] {
    const reasons: string[] = [];

    // أسباب التوافق العمري
    if (factors.age >= 0.90) {
      reasons.push('🎯 عمر متطابق تماماً');
    } else if (factors.age >= 0.75) {
      reasons.push('📅 عمر متقارب ومناسب');
    } else if (factors.age >= 0.55) {
      reasons.push('⏰ فارق عمري مقبول');
    }

    // أسباب التوافق الجغرافي
    if (factors.location >= 0.9) {
      reasons.push('🏠 نفس المدينة - سهولة اللقاء');
    } else if (factors.location >= 0.6) {
      reasons.push('📍 مدن متقاربة');
    }

    // أسباب التوافق التعليمي
    if (factors.education >= 0.85) {
      reasons.push('🎓 مستوى تعليمي متطابق');
    } else if (factors.education >= 0.65) {
      reasons.push('📚 خلفية تعليمية متوافقة');
    } else if (factors.education >= 0.45) {
      reasons.push('🧠 مستوى ثقافي مناسب');
    }

    // أسباب التوافق الديني
    if (factors.religiousCommitment >= 0.90) {
      reasons.push('🕌 التزام ديني متطابق');
    } else if (factors.religiousCommitment >= 0.75) {
      reasons.push('☪️ مستوى التزام ديني متوافق');
    } else if (factors.religiousCommitment >= 0.55) {
      reasons.push('🤲 قيم دينية متشابهة');
    }

    // أسباب التوافق الاجتماعي
    if (factors.maritalStatus >= 0.8) {
      reasons.push('💍 حالة اجتماعية متوافقة');
    }

    // إضافة أسباب عامة إذا لم توجد أسباب محددة
    if (reasons.length === 0) {
      reasons.push('✨ شخصية مثيرة للاهتمام');
      reasons.push('🌟 إمكانية توافق جيدة');
    } else if (reasons.length === 1) {
      reasons.push('💫 فرصة للتعارف والتفاهم');
    }

    return reasons.slice(0, 3); // الحد الأقصى 3 أسباب
  }

  // الحصول على مدن نفس المنطقة
  private static getSameRegionCities(): Record<string, string[]> {
    return {
      'الرياض': ['الرياض', 'الخرج', 'الدرعية', 'الزلفي'],
      'مكة': ['مكة المكرمة', 'جدة', 'الطائف', 'رابغ'],
      'المدينة': ['المدينة المنورة', 'ينبع', 'العلا'],
      'الشرقية': ['الدمام', 'الخبر', 'الظهران', 'الأحساء', 'الجبيل'],
      'عسير': ['أبها', 'خميس مشيط', 'بيشة', 'النماص'],
      'تبوك': ['تبوك', 'الوجه', 'ضباء', 'تيماء'],
      'حائل': ['حائل', 'بقعاء'],
      'الحدود الشمالية': ['عرعر', 'رفحاء', 'طريف'],
      'جازان': ['جازان', 'صبيا', 'أبو عريش'],
      'نجران': ['نجران', 'شرورة'],
      'الباحة': ['الباحة', 'بلجرشي'],
      'الجوف': ['سكاكا', 'دومة الجندل', 'القريات']
    };
  }

  // تحديد منطقة المدينة
  private static getCityRegion(city: string, regions: Record<string, string[]>): string | null {
    for (const [region, cities] of Object.entries(regions)) {
      if (cities.some(c => c.toLowerCase().includes(city.toLowerCase()) || 
                          city.toLowerCase().includes(c.toLowerCase()))) {
        return region;
      }
    }
    return null;
  }

  // البحث عن مطابقات للمستخدم
  static async findMatches(
    userId: string, 
    limit: number = 10,
    preferences?: MatchingPreferences
  ): Promise<{ data: MatchResult[]; error: any }> {
    try {
      // الحصول على بيانات المستخدم الحالي
      const { data: currentUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError || !currentUser) {
        return { data: [], error: userError };
      }

      // تحديد الجنس المطلوب (عكس جنس المستخدم الحالي)
      const targetGender = currentUser.gender === 'male' ? 'female' : 'male';

      // البحث عن المستخدمين المحتملين مع فلترة الخصوصية والحظر
      let query = supabase
        .from('users')
        .select(`
          *,
          blocked_by:user_blocks!user_blocks_blocked_user_id_fkey(blocker_id),
          blocking:user_blocks!user_blocks_blocker_id_fkey(blocked_user_id)
        `)
        .eq('gender', targetGender)
        .eq('status', 'active')
        .neq('id', userId);

      // فلترة حسب إعدادات الخصوصية
      if (currentUser.verified) {
        // المستخدم الحالي موثق - يمكنه رؤية: public, members, verified
        query = query.in('profile_visibility', ['public', 'members', 'verified']);
      } else {
        // المستخدم الحالي غير موثق - يمكنه رؤية: public, members فقط
        query = query.in('profile_visibility', ['public', 'members']);
      }

      // التأكد من أن المستخدمين المعروضين موثقين (للجودة)
      query = query.eq('verified', true);

      // تطبيق فلاتر العمر إذا كانت متوفرة
      if (preferences?.ageRange) {
        query = query
          .gte('age', preferences.ageRange.min)
          .lte('age', preferences.ageRange.max);
      }

      const { data: potentialMatches, error: matchError } = await query.limit(100); // جلب عدد أكبر للفلترة

      if (matchError) {
        return { data: [], error: matchError };
      }

      // فلترة المستخدمين المحظورين
      const filteredMatches = potentialMatches?.filter(user => {
        // التحقق من أن المستخدم الحالي لم يحظر هذا المستخدم
        const hasBlockedUser = user.blocked_by?.some((block: any) =>
          block.blocker_id === userId
        );

        // التحقق من أن هذا المستخدم لم يحظر المستخدم الحالي
        const isBlockedByUser = user.blocking?.some((block: any) =>
          block.blocked_user_id === userId
        );

        // استبعاد المستخدم إذا كان محظوراً في أي من الاتجاهين
        return !hasBlockedUser && !isBlockedByUser;
      }) || [];

      console.log(`🔍 MatchingService: تم العثور على ${potentialMatches?.length || 0} مستخدم محتمل`);
      console.log(`🔒 MatchingService: تم استبعاد ${(potentialMatches?.length || 0) - filteredMatches.length} مستخدم محظور`);
      console.log(`✅ MatchingService: النتائج النهائية: ${filteredMatches.length} مستخدم`);

      // تنظيف البيانات وإزالة معلومات الحظر
      const cleanMatches = filteredMatches.map(user => {
        const { blocked_by, blocking, ...cleanUser } = user;
        return cleanUser;
      });

      // حساب التوافق لكل مستخدم
      const matches = cleanMatches
        .map(user => this.calculateCompatibility(currentUser, user))
        .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
        .slice(0, limit);

      return { data: matches, error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  // حفظ مطابقة في قاعدة البيانات
  static async saveMatch(
    userId: string,
    matchedUserId: string,
    compatibilityScore: number,
    matchType: 'suggested' | 'mutual_like' | 'conversation_started' = 'suggested'
  ): Promise<{ success: boolean; error?: any; data?: any }> {
    try {
      // التحقق من صحة البيانات
      if (!userId || !matchedUserId || compatibilityScore < 0 || compatibilityScore > 100) {
        return {
          success: false,
          error: 'Invalid input parameters'
        };
      }

      // التحقق من عدم وجود مطابقة سابقة
      const { data: existingMatch } = await supabase
        .from('matches')
        .select('id')
        .or(`and(user1_id.eq.${userId},user2_id.eq.${matchedUserId}),and(user1_id.eq.${matchedUserId},user2_id.eq.${userId})`)
        .maybeSingle();

      if (existingMatch) {
        return {
          success: false,
          error: 'Match already exists'
        };
      }

      // إدراج المطابقة الجديدة
      const { data, error } = await supabase
        .from('matches')
        .insert({
          user1_id: userId,
          user2_id: matchedUserId,
          match_score: Math.round(compatibilityScore),
          status: 'active',
          match_type: matchType
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving match:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Unexpected error saving match:', error);
      return { success: false, error };
    }
  }

  // الحصول على المطابقات المحفوظة
  static async getSavedMatches(userId: string): Promise<{ data: any[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          matched_user:users!matches_user2_id_fkey(*)
        `)
        .eq('user1_id', userId)
        .eq('status', 'active')
        .order('match_score', { ascending: false });

      return { data: data || [], error };
    } catch (error) {
      return { data: [], error };
    }
  }
}

export default MatchingService;
