import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { userService, messageService } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import CountryFlagImage from './CountryFlagImage';
import LikesService from '../lib/likesService';
import { getVisibleProfileImageUrl, handleImageError } from '../lib/profileImageUtils';
import VerificationBadge from './VerificationBadge';
// import { filterCompleteProfiles } from '../utils/profileCompletion'; // تم إزالة فلترة الحسابات المكتملة

// Local type definition to avoid import issues
interface UserType {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  age?: number;
  city?: string;
  education?: string;
  profession?: string;
  marital_status?: string;
  nationality?: string;
  bio?: string;
  verified?: boolean;
  status?: string;
  last_login?: string;
  profile_image_url?: string;
  profile_image_visible?: boolean;
  has_profile_image?: boolean;
  allow_messages?: boolean;
}
import {
  Search,
  Filter,
  MapPin,
  Calendar,
  Heart,
  User,
  GraduationCap,
  Briefcase,
  Eye,
  MessageSquare,
  Shield,
  ChevronDown,
  X
} from 'lucide-react';

// Search filters schema
const createSearchSchema = (t: any) => z.object({
  ageMin: z.number().min(18, t('search.validation.ageMinRequired')).optional(),
  ageMax: z.number().max(80, t('search.validation.ageMaxRequired')).optional(),
  city: z.string().optional(),
  maritalStatus: z.enum(['single', 'divorced', 'widowed', 'any']).optional(),
  education: z.enum(['any', 'primary', 'secondary', 'diploma', 'bachelor', 'master', 'phd']).optional(),
  profession: z.string().optional(),
  religiousCommitment: z.enum(['any', 'not_religious', 'somewhat_religious', 'religious']).optional(),
  gender: z.enum(['male', 'female']).optional(),
});

type SearchFormData = z.infer<ReturnType<typeof createSearchSchema>>;

// Mock search results (unused for now)
// const mockResults = [
//   {
//     id: 1,
//     name: 'فاطمة أحمد',
//     age: 26,
//     city: 'الرياض',
//     education: 'بكالوريوس طب',
//     profession: 'طبيبة',
//     maritalStatus: 'single',
//     religiousCommitment: 'high',
//     bio: 'طبيبة ملتزمة، أحب العمل الخيري والقراءة',
//     rating: 5,
//     verified: true,
//     lastSeen: 'منذ ساعة'
//   },
//   {
//     id: 2,
//     name: 'مريم سالم',
//     age: 24,
//     city: 'جدة',
//     education: 'بكالوريوس تربية',
//     profession: 'معلمة',
//     maritalStatus: 'single',
//     religiousCommitment: 'high',
//     bio: 'معلمة متحمسة، أحب التعليم والأطفال',
//     rating: 5,
//     verified: true,
//     lastSeen: 'منذ 3 ساعات'
//   },
//   {
//     id: 3,
//     name: 'نورا محمد',
//     age: 28,
//     city: 'الدمام',
//     education: 'ماجستير إدارة أعمال',
//     profession: 'مديرة مشاريع',
//     maritalStatus: 'divorced',
//     religiousCommitment: 'medium',
//     bio: 'مديرة مشاريع ناجحة، أبحث عن شريك حياة مناسب',
//     rating: 4,
//     verified: true,
//     lastSeen: 'منذ يوم'
//   }
// ];

const SearchPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { userProfile, isAuthenticated, isLoading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [searchResults, setSearchResults] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [isRefreshingProfile, setIsRefreshingProfile] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'age' | 'rating' | 'lastSeen'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const resultsPerPage = 12;
  const [sentLikes, setSentLikes] = useState<Set<string>>(new Set());
  const [likingUsers, setLikingUsers] = useState<Set<string>>(new Set());
  const [checkingLikes, setCheckingLikes] = useState<Set<string>>(new Set());

  const searchSchema = useMemo(() => createSearchSchema(t), [t]);

  const {
    register,
    handleSubmit,
    reset
  } = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema)
  });

  // دالة لاستنتاج الجنس من البيانات الموجودة
  const inferGenderFromProfile = (profile: any): 'male' | 'female' | null => {
    if (profile.gender) return profile.gender;

    // استنتاج من بيانات اللحية (للذكور)
    if (profile.beard && (profile.beard === 'yes' || profile.beard === 'no')) {
      return 'male';
    }
    // استنتاج من بيانات الحجاب (للإناث)
    if (profile.hijab && ['no_hijab', 'hijab', 'niqab'].includes(profile.hijab)) {
      return 'female';
    }

    return null;
  };

  // Load initial data
  useEffect(() => {
    // تحميل البيانات فقط إذا كان المستخدم مصادق وتم تحميل الملف الشخصي
    if (isAuthenticated && userProfile) {
      const inferredGender = inferGenderFromProfile(userProfile);

      if (inferredGender) {
        console.log('تحميل البيانات الأولية للبحث - المستخدم:', userProfile.id, 'الجنس:', inferredGender);
        loadUsers();
      } else {
        console.log('المستخدم مصادق والملف الشخصي محمل لكن لا يمكن تحديد الجنس');
      }
    } else if (isAuthenticated && !userProfile) {
      console.log('المستخدم مصادق لكن الملف الشخصي لم يتم تحميله بعد');
    }
  }, [isAuthenticated, userProfile]);

  const loadUsers = async () => {
    if (!userProfile) {
      console.log('لا يمكن تحميل المستخدمين - الملف الشخصي غير محمل');
      return;
    }

    const inferredGender = inferGenderFromProfile(userProfile);

    if (!inferredGender) {
      console.log('لا يمكن تحميل المستخدمين - لا يمكن تحديد الجنس من الملف الشخصي');
      console.log('userProfile:', userProfile);
      console.log('userProfile.gender:', userProfile?.gender);
      console.log('userProfile.beard:', userProfile?.beard);
      console.log('userProfile.hijab:', userProfile?.hijab);

      // محاولة إعادة تحميل الملف الشخصي
      try {
        await refreshProfile();
        console.log('تم إعادة تحميل الملف الشخصي');
      } catch (error) {
        console.error('خطأ في إعادة تحميل الملف الشخصي:', error);
      }
      return;
    }

    setIsLoading(true);
    try {
      console.log('تحميل المستخدمين للمستخدم:', userProfile.id, 'الجنس:', inferredGender);

      // استخدام الدالة الجديدة للبحث المفلتر حسب الجنس
      const { data, error } = await userService.searchUsersForMatching(
        userProfile.id,
        inferredGender,
        { limit: 20 }
      );

      if (error) {
        console.error('خطأ في البحث:', error);
        console.error('تفاصيل الخطأ:', error);
        throw error;
      }

      console.log('نتائج البحث الخام:', data);

      // فحص التكرارات في البيانات المحملة
      const uniqueData = data ? data.filter((user, index, self) =>
        index === self.findIndex(u => u.id === user.id)
      ) : [];

      console.log('فحص التكرارات في التحميل الأولي:', {
        originalCount: data?.length || 0,
        uniqueCount: uniqueData.length,
        duplicatesFound: (data?.length || 0) - uniqueData.length
      });

      const sortedData = sortResults(uniqueData, sortBy);
      setSearchResults(sortedData);
      console.log(`تم تحميل ${uniqueData.length} مستخدم فريد وترتيبهم حسب: ${sortBy}`);

      // التحقق من حالة الإعجابات للمستخدمين الجدد
      if (uniqueData.length > 0 && userProfile?.id) {
        checkLikesStatus(uniqueData.map(user => user.id));
      }

      // إضافة تسجيل مفصل للنتائج
      if (data && data.length > 0) {
        console.log('أول 3 نتائج:', data.slice(0, 3));
      }
    } catch (error) {
      console.error('Error loading users:', error);
      console.error('Stack trace:', error);
      // عرض رسالة خطأ للمستخدم
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: SearchFormData) => {
    if (!userProfile) {
      console.error('لا يمكن البحث - الملف الشخصي غير محمل');
      alert(t('search.messages.loginRequired'));
      return;
    }

    const inferredGender = inferGenderFromProfile(userProfile);

    if (!inferredGender) {
      console.error('لا يمكن البحث - لا يمكن تحديد الجنس من الملف الشخصي');
      alert(t('search.messages.completeProfileMessage'));
      return;
    }

    setIsLoading(true);
    try {
      // Update active filters for display
      const filters = [];
      if (data.ageMin || data.ageMax) {
        filters.push(`العمر: ${data.ageMin || 18}-${data.ageMax || 80}`);
      }
      if (data.city) filters.push(`المدينة: ${data.city}`);
      if (data.maritalStatus && data.maritalStatus !== 'any') {
        const statusMap = {
          single: 'أعزب/عزباء',
          divorced: 'مطلق/مطلقة',
          widowed: 'أرمل/أرملة'
        };
        filters.push(`الحالة: ${statusMap[data.maritalStatus]}`);
      }
      if (data.education && data.education !== 'any') {
        const educationMap = {
          primary: 'ابتدائي',
          secondary: 'ثانوي',
          diploma: 'دبلوم',
          bachelor: 'بكالوريوس',
          master: 'ماجستير',
          phd: 'دكتوراه'
        };
        filters.push(`التعليم: ${educationMap[data.education]}`);
      }
      if (data.profession) filters.push(`المهنة: ${data.profession}`);
      if (data.religiousCommitment && data.religiousCommitment !== 'any') {
        const commitmentMap = {
          not_religious: 'غير متدين',
          somewhat_religious: 'متدين نوعاً ما',
          religious: 'متدين'
        };
        filters.push(`الالتزام: ${commitmentMap[data.religiousCommitment]}`);
      }

      setActiveFilters(filters);

      console.log('البحث مع الفلاتر للمستخدم:', userProfile.id, 'الجنس:', userProfile.gender);
      console.log('فلاتر البحث:', {
        ageMin: data.ageMin,
        ageMax: data.ageMax,
        city: data.city,
        maritalStatus: data.maritalStatus,
        religiousCommitment: data.religiousCommitment
      });

      // البحث مع فلترة الجنس المقابل
      const { data: results, error } = await userService.searchUsersForMatching(
        userProfile.id,
        inferredGender,
        {
          ageMin: data.ageMin,
          ageMax: data.ageMax,
          city: data.city,
          maritalStatus: data.maritalStatus,
          religiousCommitment: data.religiousCommitment,
          limit: 50
        }
      );

      if (error) {
        console.error('خطأ في البحث مع الفلاتر:', error);
        throw error;
      }

      console.log('نتائج البحث مع الفلاتر:', results);

      // تم إزالة فلترة الحسابات المكتملة - عرض جميع الحسابات
      // const completeProfiles = filterCompleteProfiles(results || []);
      // console.log(`تم فلترة ${(results?.length || 0) - completeProfiles.length} حساب غير مكتمل من نتائج البحث`);

      // فحص التكرارات في البيانات الأصلية
      const uniqueResults = results ? results.filter((user, index, self) =>
        index === self.findIndex(u => u.id === user.id)
      ) : [];

      console.log('فحص التكرارات:', {
        originalCount: results?.length || 0,
        uniqueCount: uniqueResults.length,
        duplicatesFound: (results?.length || 0) - uniqueResults.length
      });

      const sortedResults = sortResults(uniqueResults, sortBy);
      setSearchResults(sortedResults);
      setCurrentPage(1); // إعادة تعيين الصفحة الحالية إلى الأولى عند البحث الجديد

      console.log(`تم العثور على ${uniqueResults.length} نتيجة فريدة وترتيبها حسب: ${sortBy}`);
    } catch (error) {
      console.error('Search error:', error);
      console.error('تفاصيل خطأ البحث:', error);
      alert(t('search.messages.searchError'));
    } finally {
      setIsLoading(false);
    }
  };

  // دالة لإعادة تحميل الملف الشخصي
  const handleRefreshProfile = async () => {
    setIsRefreshingProfile(true);
    try {
      await refreshProfile();
      console.log(t('search.messages.profileRefreshSuccess'));
    } catch (error) {
      console.error(t('search.messages.profileRefreshError'), error);
    } finally {
      setIsRefreshingProfile(false);
    }
  };

  // دالة ترتيب النتائج
  const sortResults = (results: UserType[], sortType: string) => {
    const sortedResults = [...results];

    switch (sortType) {
      case 'newest':
        return sortedResults.sort((a, b) =>
          new Date((b as any).created_at || 0).getTime() - new Date((a as any).created_at || 0).getTime()
        );
      case 'age':
        return sortedResults.sort((a, b) => (a.age || 0) - (b.age || 0));
      case 'rating':
        // يمكن إضافة نظام تقييم لاحقاً
        return sortedResults.sort((_a, _b) => Math.random() - 0.5);
      case 'lastSeen':
        return sortedResults.sort((a, b) =>
          new Date(b.last_login || 0).getTime() - new Date(a.last_login || 0).getTime()
        );
      default:
        return sortedResults;
    }
  };

  // دالة معالجة تغيير الترتيب
  const handleSortChange = (newSortBy: string) => {
    setSortBy(newSortBy as 'newest' | 'age' | 'rating' | 'lastSeen');
    const sortedResults = sortResults(searchResults, newSortBy);
    setSearchResults(sortedResults);
    console.log(`تم ترتيب النتائج حسب: ${newSortBy}`);
  };

  const clearFilters = () => {
    reset();
    setActiveFilters([]);
    loadUsers(); // Reload all users
  };

  // دالة التحقق من حالة الإعجابات للمستخدمين
  const checkLikesStatus = async (userIds: string[]) => {
    if (!userProfile?.id || userIds.length === 0) return;

    setCheckingLikes(new Set(userIds));

    try {
      const likeChecks = await Promise.all(
        userIds.map(async (userId) => {
          const { hasLiked } = await LikesService.checkLikeStatus(userProfile.id, userId);
          return { userId, hasLiked };
        })
      );

      // تحديث حالة الإعجابات المرسلة
      const newSentLikes = new Set(sentLikes);
      likeChecks.forEach(({ userId, hasLiked }) => {
        if (hasLiked) {
          newSentLikes.add(userId);
        } else {
          newSentLikes.delete(userId);
        }
      });

      setSentLikes(newSentLikes);
      console.log('تم فحص حالة الإعجابات:', likeChecks);
    } catch (error) {
      console.error('خطأ في فحص حالة الإعجابات:', error);
    } finally {
      setCheckingLikes(new Set());
    }
  };

  // دالة إنشاء محادثة جديدة
  const handleStartConversation = async (targetUserId: string) => {
    if (!userProfile?.id) {
      alert(t('search.messages.loginRequired'));
      return;
    }

    try {
      console.log('إنشاء محادثة جديدة مع المستخدم:', targetUserId);

      const { data, error } = await messageService.createConversation(
        userProfile.id,
        targetUserId
      );

      if (error) {
        console.error('خطأ في إنشاء المحادثة:', error);

        // Show appropriate error message
        const errorMessage = typeof error === 'string' ? error : error.message || 'Unknown error';
        if (errorMessage.includes('لا يسمح بالرسائل') || errorMessage.includes('does not allow messages')) {
          alert(t('messages.errors.messagesDisabledDesc'));
        } else if (errorMessage.includes('غير موجود') || errorMessage.includes('not found')) {
          alert(t('messages.errors.userNotFoundDesc'));
        } else {
          alert(t('search.messages.conversationError'));
        }
        return;
      }

      console.log('تم إنشاء المحادثة بنجاح:', data);

      // الانتقال إلى صفحة الرسائل
      navigate('/messages');
    } catch (error) {
      console.error('خطأ غير متوقع في إنشاء المحادثة:', error);
      alert(t('search.messages.unexpectedError'));
    }
  };

  // دوال التنقل بين الصفحات
  const totalPages = Math.ceil(searchResults.length / resultsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // يمكن إضافة منطق إعادة البحث هنا إذا لزم الأمر
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  };

  // دالة إرسال/إلغاء الإعجاب
  const handleSendLike = async (targetUserId: string) => {
    if (!userProfile?.id || likingUsers.has(targetUserId)) {
      return;
    }

    const isLiked = sentLikes.has(targetUserId);

    // إضافة المستخدم لقائمة المعالجة
    setLikingUsers(prev => new Set([...prev, targetUserId]));

    try {
      let result;
      if (isLiked) {
        // إلغاء الإعجاب
        result = await LikesService.removeLike(userProfile.id, targetUserId);

        if (result.success) {
          // إزالة من الإعجابات المرسلة
          setSentLikes(prev => {
            const newSet = new Set(prev);
            newSet.delete(targetUserId);
            return newSet;
          });
          console.log('تم إلغاء الإعجاب بنجاح!');
        } else {
          console.error('فشل في إلغاء الإعجاب:', result.error);
        }
      } else {
        // إرسال إعجاب جديد
        result = await LikesService.sendLike(userProfile.id, targetUserId, 'like');

        if (result.success) {
          // إضافة للإعجابات المرسلة
          setSentLikes(prev => new Set([...prev, targetUserId]));

          // إظهار رسالة نجاح
          if (result.isMatch) {
            alert('🎉 تهانينا! لديكم إعجاب متبادل!');
          } else {
            console.log('تم إرسال الإعجاب بنجاح!');
          }
        } else {
          console.error('فشل في إرسال الإعجاب:', result.error);
        }
      }
    } catch (error) {
      console.error('خطأ في إرسال/إلغاء الإعجاب:', error);
    } finally {
      // إزالة المستخدم من قائمة المعالجة
      setLikingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUserId);
        return newSet;
      });
    }
  };

  // حساب النتائج المعروضة في الصفحة الحالية
  const startIndex = (currentPage - 1) * resultsPerPage;
  const endIndex = startIndex + resultsPerPage;
  const currentPageResults = searchResults.slice(startIndex, endIndex);

  // تسجيل للتحقق من القيم
  console.log('Pagination Debug:', {
    searchResultsLength: searchResults.length,
    resultsPerPage,
    totalPages,
    currentPage,
    startIndex,
    endIndex,
    currentPageResultsLength: currentPageResults.length,
    currentPageUserIds: currentPageResults.map(user => ({ id: user.id, name: `${user.first_name} ${user.last_name}` }))
  });

  // فحص التكرارات في الصفحة الحالية
  const currentPageIds = currentPageResults.map(user => user.id);
  const uniqueCurrentPageIds = [...new Set(currentPageIds)];
  if (currentPageIds.length !== uniqueCurrentPageIds.length) {
    console.warn('⚠️ تم العثور على تكرارات في الصفحة الحالية!', {
      totalIds: currentPageIds.length,
      uniqueIds: uniqueCurrentPageIds.length,
      duplicates: currentPageIds.length - uniqueCurrentPageIds.length
    });
  }

  // فحص شامل للتكرارات في جميع النتائج
  const allResultIds = searchResults.map(user => user.id);
  const uniqueAllResultIds = [...new Set(allResultIds)];
  if (allResultIds.length !== uniqueAllResultIds.length) {
    console.warn('⚠️ تم العثور على تكرارات في جميع النتائج!', {
      totalResults: allResultIds.length,
      uniqueResults: uniqueAllResultIds.length,
      duplicates: allResultIds.length - uniqueAllResultIds.length
    });
  }

  const getMaritalStatusText = (status: string) => {
    const statusMap = {
      single: t('search.filters.maritalStatusOptions.single'),
      divorced: t('search.filters.maritalStatusOptions.divorced'),
      widowed: t('search.filters.maritalStatusOptions.widowed')
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  // Unused function - commented out
  // const getReligiousCommitmentText = (commitment: string) => {
  //   const commitmentMap = {
  //     high: 'ملتزم جداً',
  //     medium: 'ملتزم',
  //     practicing: 'ممارس'
  //   };
  //   return commitmentMap[commitment as keyof typeof commitmentMap] || commitment;
  // };

  // عرض شاشة تحميل أثناء فحص المصادقة أو تحميل الملف الشخصي
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-emerald-50 flex items-center justify-center" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">{t('search.messages.authenticationCheck')}</p>
        </div>
      </div>
    );
  }

  // عرض رسالة إذا لم يكن المستخدم مسجل دخول
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-emerald-50 flex items-center justify-center" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="text-center bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">{t('search.messages.loginRequired')}</h2>
          <p className="text-slate-600 mb-6">
            {t('search.messages.loginRequiredMessage')}
          </p>
          <a
            href="/login"
            className="bg-gradient-to-r from-primary-600 to-emerald-600 text-white py-3 px-6 rounded-xl font-medium hover:from-primary-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            {t('search.messages.loginButton')}
          </a>
        </div>
      </div>
    );
  }

  // عرض شاشة تحميل إذا كان المستخدم مصادق لكن الملف الشخصي لم يتم تحميله بعد
  if (isAuthenticated && !userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-emerald-50 flex items-center justify-center" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">{t('search.messages.loadingProfile')}</p>
        </div>
      </div>
    );
  }

  // عرض رسالة إذا تم تحميل الملف الشخصي لكن لا يمكن تحديد الجنس
  if (userProfile && !inferGenderFromProfile(userProfile)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-emerald-50 flex items-center justify-center" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="text-center bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 max-w-md">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">{t('search.messages.completeProfile')}</h2>
          <p className="text-slate-600 mb-6">
            {t('search.messages.completeProfileMessage')}
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-blue-800 text-sm">
              {t('search.messages.completeProfileTip')}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleRefreshProfile}
              disabled={isRefreshingProfile}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isRefreshingProfile ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {t('search.messages.refreshingProfile')}
                </div>
              ) : (
                t('search.messages.refreshProfile')
              )}
            </button>
            <a
              href="/profile"
              className="bg-gradient-to-r from-primary-600 to-emerald-600 text-white py-3 px-6 rounded-xl font-medium hover:from-primary-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              {t('search.messages.completeProfileButton')}
            </a>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200"
            >
              {t('search.messages.refreshPage')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-emerald-50 py-4 md:py-8" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-10 md:top-20 right-10 md:right-20 w-32 h-32 md:w-64 md:h-64 bg-primary-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 md:bottom-20 left-10 md:left-20 w-48 h-48 md:w-96 md:h-96 bg-emerald-500 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-800 mb-3 md:mb-4 font-display">
            {t('search.title')}
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-slate-600 px-4 mb-4">
            {t('search.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
          {/* Search Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl md:rounded-3xl shadow-xl border border-white/20 p-4 md:p-6 lg:sticky lg:top-8">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Filter className="w-4 h-4 md:w-5 md:h-5 text-primary-600" />
                  {t('search.filters.title')}
                </h2>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden p-2 text-slate-600 hover:text-slate-800"
                >
                  <ChevronDown className={`w-5 h-5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>
              </div>

              <div className={`space-y-6 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                <form onSubmit={handleSubmit(onSubmit)}>
                  {/* Age Range */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-3">
                      {t('search.filters.age')}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <input
                          type="number"
                          {...register('ageMin', { valueAsNumber: true })}
                          placeholder={t('search.filters.fromPlaceholder')}
                          min="18"
                          max="80"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          {...register('ageMax', { valueAsNumber: true })}
                          placeholder={t('search.filters.toPlaceholder')}
                          min="18"
                          max="80"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-2">
                      {t('search.filters.city')}
                    </label>
                    <input
                      type="text"
                      {...register('city')}
                      placeholder={t('search.filters.cityPlaceholder')}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    />
                  </div>

                  {/* Marital Status */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-2">
                      {t('search.filters.maritalStatus')}
                    </label>
                    <select
                      {...register('maritalStatus')}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    >
                      <option value="any">{t('search.filters.maritalStatusOptions.any')}</option>
                      <option value="single">{t('search.filters.maritalStatusOptions.single')}</option>
                      <option value="divorced">{t('search.filters.maritalStatusOptions.divorced')}</option>
                      <option value="widowed">{t('search.filters.maritalStatusOptions.widowed')}</option>
                    </select>
                  </div>

                  {/* Education */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-2">
                      {t('search.filters.education')}
                    </label>
                    <select
                      {...register('education')}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    >
                      <option value="any">{t('search.filters.educationOptions.any')}</option>
                      <option value="primary">{t('search.filters.educationOptions.primary')}</option>
                      <option value="secondary">{t('search.filters.educationOptions.secondary')}</option>
                      <option value="diploma">{t('search.filters.educationOptions.diploma')}</option>
                      <option value="bachelor">{t('search.filters.educationOptions.bachelor')}</option>
                      <option value="master">{t('search.filters.educationOptions.master')}</option>
                      <option value="phd">{t('search.filters.educationOptions.phd')}</option>
                    </select>
                  </div>

                  {/* Profession */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-2">
                      {t('search.filters.profession')}
                    </label>
                    <input
                      type="text"
                      {...register('profession')}
                      placeholder={t('search.filters.professionPlaceholder')}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    />
                  </div>

                  {/* Religious Commitment */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-2">
                      {t('search.filters.religiousCommitment')}
                    </label>
                    <select
                      {...register('religiousCommitment')}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    >
                      <option value="any">{t('search.filters.religiousCommitmentOptions.any')}</option>
                      <option value="not_religious">{t('search.filters.religiousCommitmentOptions.notReligious')}</option>
                      <option value="somewhat_religious">{t('search.filters.religiousCommitmentOptions.somewhatReligious')}</option>
                      <option value="religious">{t('search.filters.religiousCommitmentOptions.religious')}</option>
                    </select>
                  </div>

                  {/* Search Button */}
                  <div className="mt-6">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-primary-600 to-emerald-600 text-white py-3 px-4 rounded-xl font-medium hover:from-primary-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {t('search.buttons.searching')}
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        {t('search.buttons.search')}
                      </>
                    )}
                  </button>

                  {/* Clear Filters */}
                  {activeFilters.length > 0 && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="w-full text-slate-600 hover:text-slate-800 py-2 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      {t('search.buttons.clearFilters')}
                    </button>
                  )}
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Search Results */}
          <div className="lg:col-span-3">
            {/* Active Filters */}
            {activeFilters.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-slate-800 mb-3">{t('search.results.activeFilters')}</h3>
                <div className="flex flex-wrap gap-2">
                  {activeFilters.map((filter, index) => (
                    <span
                      key={index}
                      className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {filter}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">
                {t('search.results.count', { count: searchResults.length })}
              </h2>
              <div className="flex items-center gap-2 text-slate-600">
                <span className="text-sm">{t('search.results.sortBy')}</span>
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="newest">{t('search.results.sortOptions.newest')}</option>
                  <option value="age">{t('search.results.sortOptions.age')}</option>
                  <option value="rating">{t('search.results.sortOptions.rating')}</option>
                  <option value="lastSeen">{t('search.results.sortOptions.lastSeen')}</option>
                </select>
              </div>
            </div>

            {/* Results Info */}
            {searchResults.length > 0 && (
              <div className="text-center mb-6">
                <p className="text-slate-600">
                  {searchResults.length <= resultsPerPage ? (
                    // إذا كانت جميع النتائج تظهر في صفحة واحدة
                    <span>{t('search.results.showing')} {searchResults.length} {t('search.results.results')}</span>
                  ) : (
                    // إذا كانت النتائج موزعة على عدة صفحات
                    <>
                      {t('search.results.showing')} {startIndex + 1}-{Math.min(endIndex, searchResults.length)} {t('search.results.of')} {searchResults.length} {t('search.results.results')}
                      <span className="mx-2">•</span>
                      <span>{t('search.results.page')} {currentPage} {t('search.results.of')} {totalPages}</span>
                    </>
                  )}
                </p>
              </div>
            )}

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {currentPageResults.map((result) => (
                <div
                  key={result.id}
                  className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 p-6 transform hover:-translate-y-1"
                >
                  {/* Profile Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      {/* Avatar Placeholder with Flag */}
                      <div className="relative">
                        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-emerald-500 rounded-full flex items-center justify-center overflow-hidden relative z-10">
                          {getVisibleProfileImageUrl(result) ? (
                            <img
                              src={getVisibleProfileImageUrl(result)!}
                              alt={`${result.first_name} ${result.last_name}`}
                              className="w-full h-full object-cover"
                              onError={handleImageError}
                            />
                          ) : null}
                          <User className={`w-8 h-8 text-white user-icon-fallback ${getVisibleProfileImageUrl(result) ? 'hidden' : ''}`} />
                        </div>
                        {/* علم الدولة - خارج دائرة الصورة مع z-index أعلى */}
                        <div className="absolute -top-1 -right-1 z-20">
                          <CountryFlagImage
                            nationality={result.nationality}
                            size="sm"
                            showTooltip={true}
                            className="border-2 border-white rounded-full shadow-lg"
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-slate-800">
                            {result.first_name} {result.last_name}
                          </h3>
                          <VerificationBadge
                            isVerified={result.verified || false}
                            size="sm"
                            className="scale-75"
                          />
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{result.age} {t('search.results.yearsOld')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{result.city}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* تم إزالة النقطة الخضراء للحالة */}
                  </div>

                  {/* Profile Info */}
                  <div className="space-y-3 mb-4">
                    {result.education && (
                      <div className="flex items-center gap-2 text-sm">
                        <GraduationCap className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600">{result.education}</span>
                      </div>
                    )}
                    {result.profession && (
                      <div className="flex items-center gap-2 text-sm">
                        <Briefcase className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600">{result.profession}</span>
                      </div>
                    )}
                    {result.marital_status && (
                      <div className="flex items-center gap-2 text-sm">
                        <Heart className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600">{getMaritalStatusText(result.marital_status)}</span>
                      </div>
                    )}
                  </div>

                  {/* Bio */}
                  {result.bio && (
                    <p className="text-slate-700 text-sm leading-relaxed mb-4 line-clamp-2">
                      {result.bio}
                    </p>
                  )}

                  {/* Last Seen */}
                  {result.last_login && (
                    <div className="text-xs text-slate-500 mb-4">
                      {t('search.results.lastSeen')} {new Date(result.last_login).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        calendar: 'gregory'
                      })}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {/* زر الإعجاب */}
                    <button
                      onClick={() => handleSendLike(result.id)}
                      disabled={likingUsers.has(result.id) || checkingLikes.has(result.id)}
                      className={`px-3 py-2 rounded-xl transition-all duration-300 flex items-center justify-center ${
                        sentLikes.has(result.id)
                          ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 shadow-lg'
                          : likingUsers.has(result.id) || checkingLikes.has(result.id)
                          ? 'bg-pink-50 text-pink-400 cursor-not-allowed opacity-50'
                          : 'bg-white border-2 border-pink-500 text-pink-500 hover:bg-pink-50 hover:scale-105 shadow-sm hover:shadow-md'
                      }`}
                      title={
                        checkingLikes.has(result.id)
                          ? t('search.results.checking')
                          : likingUsers.has(result.id)
                          ? (sentLikes.has(result.id) ? t('search.results.removing') : t('search.results.sending'))
                          : sentLikes.has(result.id)
                          ? t('search.results.removeLike')
                          : t('search.results.sendLike')
                      }
                    >
                      {likingUsers.has(result.id) || checkingLikes.has(result.id) ? (
                        <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${
                          checkingLikes.has(result.id)
                            ? 'border-pink-400'
                            : sentLikes.has(result.id)
                            ? 'border-white'
                            : 'border-pink-400'
                        }`} />
                      ) : (
                        <Heart className={`w-4 h-4 ${sentLikes.has(result.id) ? 'fill-current' : ''}`} />
                      )}
                    </button>

                    {result.allow_messages && (
                      <button
                        onClick={() => handleStartConversation(result.id)}
                        className="flex-1 bg-gradient-to-r from-primary-600 to-emerald-600 text-white py-2 px-4 rounded-xl font-medium hover:from-primary-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        {t('search.results.sendMessage')}
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/profile/${result.id}`)}
                      className={`px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center ${!result.allow_messages ? 'flex-1' : ''}`}
                      title={t('search.results.viewProfile')}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* No Results */}
            {searchResults.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-12 h-12 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  {t('search.results.noResults')}
                </h3>
                <p className="text-slate-600 mb-4">
                  {t('search.results.noResultsMessage')}
                </p>
                <button
                  onClick={clearFilters}
                  className="bg-primary-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-700 transition-colors"
                >
                  {t('search.buttons.clearFiltersAndSearch')}
                </button>
              </div>
            )}

            {/* Pagination - يظهر فقط إذا كان هناك أكثر من صفحة واحدة */}
            {searchResults.length > resultsPerPage && totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('search.pagination.previous')}
                  </button>

                  {/* عرض أرقام الصفحات */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNumber}
                        onClick={() => handlePageChange(pageNumber)}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          currentPage === pageNumber
                            ? 'bg-primary-600 text-white'
                            : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}

                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('search.pagination.next')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
