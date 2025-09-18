import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Heart, Shield, Users, MessageSquare, User, Play, Star, CheckCircle, Calendar, Clock, BookOpen, Crown, Gift, CreditCard, Zap } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { articleService } from '../services/articleService';
import type { ArticleWithDetails } from '../services/articleService';
import { SubscriptionService } from '../lib/subscriptionService';
import type { SubscriptionPlan } from '../lib/subscriptionService';

const HomePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [featuredArticles, setFeaturedArticles] = useState<ArticleWithDetails[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [canStartTrial, setCanStartTrial] = useState(false);

  // Load featured articles
  useEffect(() => {
    const loadFeaturedArticles = async () => {
      try {
        setLoadingArticles(true);
        const articles = await articleService.getFeaturedArticles(3);
        console.log('Loaded featured articles:', articles); // للتشخيص
        setFeaturedArticles(articles);
      } catch (error) {
        console.error('Error loading featured articles:', error);
        setFeaturedArticles([]); // تأكد من إعادة تعيين المصفوفة في حالة الخطأ
      } finally {
        setLoadingArticles(false);
      }
    };

    loadFeaturedArticles();
  }, []);

  // Load subscription plans
  useEffect(() => {
    const loadSubscriptionPlans = async () => {
      try {
        setLoadingPlans(true);
        const plans = await SubscriptionService.getAvailablePlans();
        setSubscriptionPlans(plans);
      } catch (error) {
        console.error('Error loading subscription plans:', error);
        setSubscriptionPlans([]);
      } finally {
        setLoadingPlans(false);
      }
    };

    loadSubscriptionPlans();
  }, []);

  // Check if user can start trial
  useEffect(() => {
    const checkTrialEligibility = async () => {
      try {
        // For now, assume user can start trial if not logged in or no previous trial
        // This should be replaced with actual user check when auth is available
        setCanStartTrial(true);
      } catch (error) {
        console.error('Error checking trial eligibility:', error);
        setCanStartTrial(false);
      }
    };

    checkTrialEligibility();
  }, []);

  // Helper functions for plans
  const getPlanIcon = (planName: string) => {
    if (planName.includes('VIP') || planName.includes('vip')) return Crown;
    if (planName.includes('مميزة') || planName.includes('Premium')) return Star;
    if (planName.includes('أساسية') || planName.includes('Basic')) return Zap;
    if (planName.includes('تجريبية') || planName.includes('Trial')) return Gift;
    return CheckCircle;
  };

  const formatFeatureName = (feature: string): string => {
    const featureDefinition = SubscriptionService.getFeatureDefinition(feature);
    if (featureDefinition) {
      return i18n.language === 'ar' ? featureDefinition.name_ar : featureDefinition.name_en;
    }
    return feature;
  };

  const getPlanColor = (planName: string) => {
    if (planName.includes('VIP') || planName.includes('vip')) return 'from-purple-500 to-pink-500';
    if (planName.includes('مميزة') || planName.includes('Premium')) return 'from-blue-500 to-indigo-500';
    if (planName.includes('أساسية') || planName.includes('Basic')) return 'from-green-500 to-emerald-500';
    if (planName.includes('تجريبية') || planName.includes('Trial')) return 'from-orange-500 to-amber-500';
    return 'from-primary-600 to-emerald-600';
  };

  const isPopularPlan = (planName: string) => {
    return planName.includes('مميزة') || planName.includes('Premium');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    // استخدام التقويم الميلادي دائماً
    return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
      calendar: 'gregory', // التقويم الميلادي
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-white" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-50 via-white to-emerald-50 py-8 md:py-12 lg:py-16 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute top-10 md:top-20 right-10 md:right-20 w-32 h-32 md:w-64 md:h-64 bg-primary-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 md:bottom-20 left-10 md:left-20 w-48 h-48 md:w-96 md:h-96 bg-emerald-500 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Text Content */}
            <div className={`text-center ${i18n.language === 'ar' ? 'lg:text-right' : 'lg:text-left'} order-2 lg:order-1`}>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-slate-800 mb-6 md:mb-8 font-display">
                <span className="block mb-2 leading-tight">{t('home.hero.title')}</span>
                <span className="block gradient-text-fix leading-tight">
                  {t('home.hero.subtitle')}
                </span>
              </h1>
              <p className="text-lg sm:text-xl lg:text-2xl text-slate-600 mb-6 md:mb-8 leading-relaxed px-4 lg:px-0">
                {t('home.hero.description')}
              </p>

              {/* Stats */}
              <div className={`flex flex-wrap justify-center ${i18n.language === 'ar' ? 'lg:justify-start' : 'lg:justify-start'} gap-4 sm:gap-6 lg:gap-8 mb-6 md:mb-8`}>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-primary-600">30</div>
                  <div className="text-sm sm:text-base text-slate-600">{t('home.hero.stats.members')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-emerald-600">5</div>
                  <div className="text-sm sm:text-base text-slate-600">{t('home.hero.stats.matches')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-amber-600">6</div>
                  <div className="text-sm sm:text-base text-slate-600">{t('home.hero.stats.users')}</div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="mb-8 md:mb-10 px-4 lg:px-0">
                <div className={`flex justify-center ${i18n.language === 'ar' ? 'lg:justify-start' : 'lg:justify-start'} items-center gap-3 sm:gap-4 lg:gap-6 flex-wrap`}>
                  <button 
                    className="bg-gradient-to-r from-primary-600 to-emerald-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg hover:from-primary-700 hover:to-emerald-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                    onClick={() => navigate('/search')}
                  >
                    {t('home.hero.cta.register')}
                  </button>
                  <button className="flex items-center justify-center gap-2 sm:gap-3 bg-white text-slate-700 px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg border-2 border-slate-200 hover:border-primary-300 transition-all duration-300 shadow-lg hover:shadow-xl">
                    <Play className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="hidden sm:inline">{t('home.hero.cta.watch')}</span>
                    <span className="sm:hidden">{t('home.hero.cta.watch')}</span>
                  </button>
                </div>
              </div>

              {/* Trust Indicators */}
              <div className={`text-center ${i18n.language === 'ar' ? 'lg:text-right' : 'lg:text-left'}`}>
                <div className={`flex justify-center ${i18n.language === 'ar' ? 'lg:justify-start' : 'lg:justify-start'} items-center gap-2 sm:gap-3 lg:gap-4 flex-wrap`}>
                  <div className="flex items-center gap-2 bg-slate-50 px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <Shield className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="font-medium text-slate-700 text-xs sm:text-sm whitespace-nowrap">{t('home.trustIndicators.verified')}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <CheckCircle className="w-4 h-4 text-primary-600 flex-shrink-0" />
                    <span className="font-medium text-slate-700 text-xs sm:text-sm whitespace-nowrap">{t('home.trustIndicators.sharia')}</span>
                  </div>
                  <div className="hidden flex items-center gap-2 bg-slate-50 px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <Heart className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span className="font-medium text-slate-700 text-xs sm:text-sm">{t('home.trustIndicators.success')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Website Preview - Hidden on mobile and tablet */}
            <div className="relative order-1 lg:order-2 hidden xl:block">
              <div className="relative z-10 transform -translate-y-24">
                {/* Browser mockup */}
                <div className="bg-slate-800 rounded-2xl p-3 shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-500">
                  <div className="flex items-center gap-1 lg:gap-2 mb-2 lg:mb-3">
                    <div className="w-2 h-2 lg:w-3 lg:h-3 bg-red-500 rounded-full"></div>
                    <div className="w-2 h-2 lg:w-3 lg:h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-2 h-2 lg:w-3 lg:h-3 bg-green-500 rounded-full"></div>
                    <div className="flex-1 bg-slate-700 rounded px-2 lg:px-3 py-1 text-slate-300 text-xs lg:text-sm text-center">
                      rezge.com
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 lg:p-6 h-64 lg:h-96 overflow-hidden">
                    {/* Website preview content */}
                    <div className="space-y-2 lg:space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 lg:gap-3">
                          <div className="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-primary-500 to-emerald-500 rounded-lg"></div>
                          <div className="h-3 lg:h-4 bg-slate-800 rounded w-12 lg:w-16"></div>
                        </div>
                        <div className="flex gap-1 lg:gap-2">
                          <div className="h-4 lg:h-6 bg-primary-100 rounded w-12 lg:w-16"></div>
                          <div className="h-4 lg:h-6 bg-primary-600 rounded w-16 lg:w-20"></div>
                        </div>
                      </div>
                      <div className="h-20 lg:h-32 bg-gradient-to-br from-primary-50 to-emerald-50 rounded-xl flex items-center justify-center">
                        <div className="text-center">
                          <div className="h-4 lg:h-6 bg-slate-800 rounded w-32 lg:w-48 mx-auto mb-1 lg:mb-2"></div>
                          <div className="h-3 lg:h-4 bg-slate-600 rounded w-20 lg:w-32 mx-auto"></div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 lg:gap-3">
                        <div className="h-12 lg:h-20 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg"></div>
                        <div className="h-12 lg:h-20 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-lg"></div>
                        <div className="h-12 lg:h-20 bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg"></div>
                      </div>
                      <div className="space-y-1 lg:space-y-2">
                        <div className="h-2 lg:h-3 bg-slate-200 rounded w-full"></div>
                        <div className="h-2 lg:h-3 bg-slate-200 rounded w-3/4"></div>
                        <div className="h-2 lg:h-3 bg-slate-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating elements - Hidden on mobile and tablet */}
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg animate-float hidden xl:flex">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg animate-float hidden xl:flex" style={{animationDelay: '1s'}}>
                  <Shield className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 md:py-16 lg:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-800 mb-4 lg:mb-6 font-display">
              {t('home.featuresSection.title')}
            </h2>
            <p className="text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto px-4">
              {t('home.featuresSection.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl lg:rounded-3xl p-6 lg:p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100">
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl lg:rounded-2xl flex items-center justify-center mb-4 lg:mb-6">
                <User className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-slate-800 mb-3 lg:mb-4">
                {t('home.featuresSection.features.detailedProfile.title')}
              </h3>
              <p className="text-slate-600 leading-relaxed text-sm lg:text-base">
                {t('home.featuresSection.features.detailedProfile.description')}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl lg:rounded-3xl p-6 lg:p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100">
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl lg:rounded-2xl flex items-center justify-center mb-4 lg:mb-6">
                <Shield className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-slate-800 mb-3 lg:mb-4">
                {t('home.featuresSection.features.privacyProtection.title')}
              </h3>
              <p className="text-slate-600 leading-relaxed text-sm lg:text-base">
                {t('home.featuresSection.features.privacyProtection.description')}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl lg:rounded-3xl p-6 lg:p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 md:col-span-2 lg:col-span-1">
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl lg:rounded-2xl flex items-center justify-center mb-4 lg:mb-6">
                <MessageSquare className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-slate-800 mb-3 lg:mb-4">
                {t('home.featuresSection.features.respectfulCommunication.title')}
              </h3>
              <p className="text-slate-600 leading-relaxed text-sm lg:text-base">
                {t('home.featuresSection.features.respectfulCommunication.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 md:py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-800 mb-4 lg:mb-6 font-display">
              {t('home.howItWorksSection.title')}
            </h2>
            <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto">
              {t('home.howItWorksSection.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {/* Step 1 */}
            <div className="text-center group">
              <div className="relative mb-4 lg:mb-6">
                <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <span className="text-xl lg:text-2xl font-bold text-white">{i18n.language === 'ar' ? '١' : '1'}</span>
                </div>
                <div className="absolute -top-1 lg:-top-2 -right-1 lg:-right-2 w-5 h-5 lg:w-6 lg:h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
                </div>
              </div>
              <h3 className="text-lg lg:text-xl font-bold text-slate-800 mb-2 lg:mb-3">
                {t('home.howItWorksSection.steps.register.title')}
              </h3>
              <p className="text-slate-600 text-sm lg:text-base px-2">
                {t('home.howItWorksSection.steps.register.description')}
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center group">
              <div className="relative mb-4 lg:mb-6">
                <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <span className="text-xl lg:text-2xl font-bold text-white">{i18n.language === 'ar' ? '٢' : '2'}</span>
                </div>
                <div className="absolute -top-1 lg:-top-2 -right-1 lg:-right-2 w-5 h-5 lg:w-6 lg:h-6 bg-primary-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
                </div>
              </div>
              <h3 className="text-lg lg:text-xl font-bold text-slate-800 mb-2 lg:mb-3">
                {t('home.howItWorksSection.steps.search.title')}
              </h3>
              <p className="text-slate-600 text-sm lg:text-base px-2">
                {t('home.howItWorksSection.steps.search.description')}
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center group">
              <div className="relative mb-4 lg:mb-6">
                <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <span className="text-xl lg:text-2xl font-bold text-white">{i18n.language === 'ar' ? '٣' : '3'}</span>
                </div>
                <div className="absolute -top-1 lg:-top-2 -right-1 lg:-right-2 w-5 h-5 lg:w-6 lg:h-6 bg-rose-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
                </div>
              </div>
              <h3 className="text-lg lg:text-xl font-bold text-slate-800 mb-2 lg:mb-3">
                {t('home.howItWorksSection.steps.communicate.title')}
              </h3>
              <p className="text-slate-600 text-sm lg:text-base px-2">
                {t('home.howItWorksSection.steps.communicate.description')}
              </p>
            </div>

            {/* Step 4 */}
            <div className="text-center group">
              <div className="relative mb-4 lg:mb-6">
                <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-rose-500 to-rose-600 rounded-full flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <span className="text-xl lg:text-2xl font-bold text-white">{i18n.language === 'ar' ? '٤' : '4'}</span>
                </div>
                <div className="absolute -top-1 lg:-top-2 -right-1 lg:-right-2 w-5 h-5 lg:w-6 lg:h-6 bg-amber-500 rounded-full flex items-center justify-center">
                  <Heart className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
                </div>
              </div>
              <h3 className="text-lg lg:text-xl font-bold text-slate-800 mb-2 lg:mb-3">
                {t('home.howItWorksSection.steps.marriage.title')}
              </h3>
              <p className="text-slate-600 text-sm lg:text-base px-2">
                {t('home.howItWorksSection.steps.marriage.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      

      {/* Success Stories - مخفي مؤقتاً */}
      <section className="py-12 md:py-16 lg:py-20 bg-gradient-to-br from-emerald-50 via-primary-50 to-amber-50 relative overflow-hidden hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 md:top-20 right-10 md:right-20 w-48 h-48 md:w-96 md:h-96 bg-emerald-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 md:bottom-20 left-10 md:left-20 w-40 h-40 md:w-80 md:h-80 bg-primary-500 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 md:w-64 md:h-64 bg-amber-500 rounded-full blur-3xl"></div>
        </div>

        {/* Floating hearts decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-6 h-6 lg:w-8 lg:h-8 text-rose-300 opacity-20 animate-float">
            <Heart className="w-full h-full" />
          </div>
          <div className="absolute top-32 right-16 w-4 h-4 lg:w-6 lg:h-6 text-emerald-300 opacity-30 animate-float" style={{animationDelay: '2s'}}>
            <Heart className="w-full h-full" />
          </div>
          <div className="absolute bottom-20 right-32 w-8 h-8 lg:w-10 lg:h-10 text-primary-300 opacity-25 animate-float" style={{animationDelay: '4s'}}>
            <Heart className="w-full h-full" />
          </div>
          <div className="absolute bottom-40 left-20 w-5 h-5 lg:w-7 lg:h-7 text-amber-300 opacity-20 animate-float" style={{animationDelay: '1s'}}>
            <Heart className="w-full h-full" />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-800 mb-4 lg:mb-6 font-display">
              {t('home.successStoriesSection.title')}
            </h2>
            <p className="text-lg lg:text-xl text-slate-600 px-4">
              {t('home.successStoriesSection.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-12 lg:mb-16">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl lg:rounded-3xl p-6 lg:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-white/20 hover:bg-white/90 transform hover:-translate-y-2">
              <div className="flex items-center gap-3 lg:gap-4 mb-4 lg:mb-6">
                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm lg:text-lg">أ.م</span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-base lg:text-lg">{t('home.successStoriesSection.stories.story1.author')}</h4>
                  <p className="text-slate-600 text-sm lg:text-base">{t('home.successStoriesSection.stories.story1.status')}</p>
                  <div className="flex gap-1 mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 lg:w-4 lg:h-4 fill-amber-400 text-amber-400 drop-shadow-sm" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-slate-700 leading-relaxed mb-3 lg:mb-4 font-medium text-sm lg:text-base">
                "{t('home.successStoriesSection.stories.story1.text')}"
              </p>
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-2 rounded-full">
                <Heart className="w-3 h-3 lg:w-4 lg:h-4" />
                <span className="text-xs lg:text-sm font-medium">{t('home.successStoriesSection.stories.story1.status')}</span>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl lg:rounded-3xl p-6 lg:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-white/20 hover:bg-white/90 transform hover:-translate-y-2">
              <div className="flex items-center gap-3 lg:gap-4 mb-4 lg:mb-6">
                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm lg:text-lg">ف.ع</span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-base lg:text-lg">{t('home.successStoriesSection.stories.story2.author')}</h4>
                  <p className="text-slate-600 text-sm lg:text-base">{t('home.successStoriesSection.stories.story2.status')}</p>
                  <div className="flex gap-1 mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 lg:w-4 lg:h-4 fill-amber-400 text-amber-400 drop-shadow-sm" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-slate-700 leading-relaxed mb-3 lg:mb-4 font-medium text-sm lg:text-base">
                "{t('home.successStoriesSection.stories.story2.text')}"
              </p>
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-2 rounded-full">
                <Heart className="w-3 h-3 lg:w-4 lg:h-4" />
                <span className="text-xs lg:text-sm font-medium">{t('home.successStoriesSection.stories.story2.status')}</span>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl lg:rounded-3xl p-6 lg:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-white/20 hover:bg-white/90 transform hover:-translate-y-2">
              <div className="flex items-center gap-3 lg:gap-4 mb-4 lg:mb-6">
                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm lg:text-lg">ع.ح</span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-base lg:text-lg">{t('home.successStoriesSection.stories.story3.author')}</h4>
                  <p className="text-slate-600 text-sm lg:text-base">{t('home.successStoriesSection.stories.story3.status')}</p>
                  <div className="flex gap-1 mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 lg:w-4 lg:h-4 fill-amber-400 text-amber-400 drop-shadow-sm" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-slate-700 leading-relaxed mb-3 lg:mb-4 font-medium text-sm lg:text-base">
                "{t('home.successStoriesSection.stories.story3.text')}"
              </p>
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-2 rounded-full">
                <Heart className="w-3 h-3 lg:w-4 lg:h-4" />
                <span className="text-xs lg:text-sm font-medium">{t('home.successStoriesSection.stories.story3.status')}</span>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl lg:rounded-3xl p-6 lg:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-white/20 hover:bg-white/90 transform hover:-translate-y-2">
              <div className="flex items-center gap-3 lg:gap-4 mb-4 lg:mb-6">
                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-rose-500 to-rose-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm lg:text-lg">س.ل</span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-base lg:text-lg">{t('home.successStoriesSection.stories.story4.author')}</h4>
                  <p className="text-slate-600 text-sm lg:text-base">{t('home.successStoriesSection.stories.story4.status')}</p>
                  <div className="flex gap-1 mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 lg:w-4 lg:h-4 fill-amber-400 text-amber-400 drop-shadow-sm" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-slate-700 leading-relaxed mb-3 lg:mb-4 font-medium text-sm lg:text-base">
                "{t('home.successStoriesSection.stories.story4.text')}"
              </p>
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-2 rounded-full">
                <Heart className="w-3 h-3 lg:w-4 lg:h-4" />
                <span className="text-xs lg:text-sm font-medium">{t('home.successStoriesSection.stories.story4.status')}</span>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl lg:rounded-3xl p-6 lg:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-white/20 hover:bg-white/90 transform hover:-translate-y-2">
              <div className="flex items-center gap-3 lg:gap-4 mb-4 lg:mb-6">
                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm lg:text-lg">م.ي</span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-base lg:text-lg">{t('home.successStoriesSection.stories.story5.author')}</h4>
                  <p className="text-slate-600 text-sm lg:text-base">{t('home.successStoriesSection.stories.story5.status')}</p>
                  <div className="flex gap-1 mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 lg:w-4 lg:h-4 fill-amber-400 text-amber-400 drop-shadow-sm" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-slate-700 leading-relaxed mb-3 lg:mb-4 font-medium text-sm lg:text-base">
                "{t('home.successStoriesSection.stories.story5.text')}"
              </p>
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-2 rounded-full">
                <Heart className="w-3 h-3 lg:w-4 lg:h-4" />
                <span className="text-xs lg:text-sm font-medium">{t('home.successStoriesSection.stories.story5.status')}</span>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl lg:rounded-3xl p-6 lg:p-8 shadow-xl border border-white/30">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8 text-center">
              <div className="group">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary-600 mb-1 lg:mb-2 group-hover:scale-110 transition-transform duration-300">{i18n.language === 'ar' ? '٢٥٠٠+' : '2500+'}</div>
                <div className="text-slate-700 font-medium text-sm lg:text-base">{t('home.successStoriesSection.stats.marriages')}</div>
              </div>
              <div className="group">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-emerald-600 mb-1 lg:mb-2 group-hover:scale-110 transition-transform duration-300">{i18n.language === 'ar' ? '٩٨٪' : '98%'}</div>
                <div className="text-slate-700 font-medium text-sm lg:text-base">{t('home.successStoriesSection.stats.satisfaction')}</div>
              </div>
              <div className="group">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-amber-600 mb-1 lg:mb-2 group-hover:scale-110 transition-transform duration-300">{i18n.language === 'ar' ? '٣٠ألف' : '30K'}</div>
                <div className="text-slate-700 font-medium text-sm lg:text-base">{t('home.successStoriesSection.stats.members')}</div>
              </div>
              <div className="group">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-rose-600 mb-1 lg:mb-2 group-hover:scale-110 transition-transform duration-300">{i18n.language === 'ar' ? '٥ سنوات' : '5 Years'}</div>
                <div className="text-slate-700 font-medium text-sm lg:text-base">{t('home.successStoriesSection.stats.experience')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Privacy Section */}
      <section className="py-12 md:py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-800 mb-4 lg:mb-6 font-display">
              {t('home.securitySection.title')}
            </h2>
            <p className="text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto px-4">
              {t('home.securitySection.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            <div className="text-center group">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl lg:rounded-2xl flex items-center justify-center mx-auto mb-4 lg:mb-6 group-hover:scale-110 transition-transform duration-300">
                <Shield className="w-8 h-8 lg:w-10 lg:h-10 text-white" />
              </div>
              <h3 className="text-lg lg:text-xl font-bold text-slate-800 mb-2 lg:mb-3">
                {t('home.securitySection.features.advancedEncryption.title')}
              </h3>
              <p className="text-slate-600 text-sm lg:text-base px-2">
                {t('home.securitySection.features.advancedEncryption.description')}
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl lg:rounded-2xl flex items-center justify-center mx-auto mb-4 lg:mb-6 group-hover:scale-110 transition-transform duration-300">
                <User className="w-8 h-8 lg:w-10 lg:h-10 text-white" />
              </div>
              <h3 className="text-lg lg:text-xl font-bold text-slate-800 mb-2 lg:mb-3">
                {t('home.securitySection.features.identityVerification.title')}
              </h3>
              <p className="text-slate-600 text-sm lg:text-base px-2">
                {t('home.securitySection.features.identityVerification.description')}
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl lg:rounded-2xl flex items-center justify-center mx-auto mb-4 lg:mb-6 group-hover:scale-110 transition-transform duration-300">
                <MessageSquare className="w-8 h-8 lg:w-10 lg:h-10 text-white" />
              </div>
              <h3 className="text-lg lg:text-xl font-bold text-slate-800 mb-2 lg:mb-3">
                {t('home.securitySection.features.contentModeration.title')}
              </h3>
              <p className="text-slate-600 text-sm lg:text-base px-2">
                {t('home.securitySection.features.contentModeration.description')}
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl lg:rounded-2xl flex items-center justify-center mx-auto mb-4 lg:mb-6 group-hover:scale-110 transition-transform duration-300">
                <CheckCircle className="w-8 h-8 lg:w-10 lg:h-10 text-white" />
              </div>
              <h3 className="text-lg lg:text-xl font-bold text-slate-800 mb-2 lg:mb-3">
                {t('home.securitySection.features.completePrivacy.title')}
              </h3>
              <p className="text-slate-600 text-sm lg:text-base px-2">
                {t('home.securitySection.features.completePrivacy.description')}
              </p>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="mt-12 lg:mt-16 text-center">
            <div className="flex justify-center items-center gap-4 lg:gap-8 flex-wrap">
              <div className="flex items-center gap-2 lg:gap-3 bg-slate-50 px-4 lg:px-6 py-2 lg:py-3 rounded-lg lg:rounded-xl">
                <Shield className="w-5 h-5 lg:w-6 lg:h-6 text-emerald-600" />
                <span className="font-medium text-slate-700 text-sm lg:text-base">{t('home.securitySection.trustBadges.shariaCompliant')}</span>
              </div>
              <div className="flex items-center gap-2 lg:gap-3 bg-slate-50 px-4 lg:px-6 py-2 lg:py-3 rounded-lg lg:rounded-xl">
                <CheckCircle className="w-5 h-5 lg:w-6 lg:h-6 text-primary-600" />
                <span className="font-medium text-slate-700 text-sm lg:text-base">{t('home.securitySection.trustBadges.iso27001')}</span>
              </div>
              <div className="flex items-center gap-2 lg:gap-3 bg-slate-50 px-4 lg:px-6 py-2 lg:py-3 rounded-lg lg:rounded-xl">
                <Heart className="w-5 h-5 lg:w-6 lg:h-6 text-amber-600" />
                <span className="font-medium text-slate-700 text-sm lg:text-base">{t('home.securitySection.trustBadges.gdprCompliant')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6 font-display">
              {t('home.faqSection.title')}
            </h2>
            <p className="text-xl text-slate-600">
              {t('home.faqSection.subtitle')}
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <h3 className="text-xl font-bold text-slate-800 mb-3">
                {t('home.faqSection.questions.q1.question')}
              </h3>
              <p className="text-slate-600 leading-relaxed">
                {t('home.faqSection.questions.q1.answer')}
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <h3 className="text-xl font-bold text-slate-800 mb-3">
                {t('home.faqSection.questions.q2.question')}
              </h3>
              <p className="text-slate-600 leading-relaxed">
                {t('home.faqSection.questions.q2.answer')}
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <h3 className="text-xl font-bold text-slate-800 mb-3">
                {t('home.faqSection.questions.q3.question')}
              </h3>
              <p className="text-slate-600 leading-relaxed">
                {t('home.faqSection.questions.q3.answer')}
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <h3 className="text-xl font-bold text-slate-800 mb-3">
                {t('home.faqSection.questions.q4.question')}
              </h3>
              <p className="text-slate-600 leading-relaxed">
                {t('home.faqSection.questions.q4.answer')}
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <h3 className="text-xl font-bold text-slate-800 mb-3">
                {t('home.faqSection.questions.q5.question')}
              </h3>
              <p className="text-slate-600 leading-relaxed">
                {t('home.faqSection.questions.q5.answer')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Blog Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6 font-display">
              {t('home.blogSection.title')}
            </h2>
            <p className="text-xl text-slate-600">
              {t('home.blogSection.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {loadingArticles ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="bg-white rounded-3xl overflow-hidden shadow-lg animate-pulse">
                  <div className="h-48 bg-slate-200"></div>
                  <div className="p-6">
                    <div className="h-4 bg-slate-200 rounded mb-3"></div>
                    <div className="h-6 bg-slate-200 rounded mb-3"></div>
                    <div className="h-16 bg-slate-200 rounded mb-4"></div>
                    <div className="h-4 bg-slate-200 rounded w-24"></div>
                  </div>
                </div>
              ))
            ) : featuredArticles.length > 0 ? (
              // Real articles from database
              featuredArticles.map((article, index) => {
                const icons = [Heart, Users, Shield];
                const colors = [
                  'from-primary-100 to-emerald-100',
                  'from-emerald-100 to-amber-100',
                  'from-amber-100 to-rose-100'
                ];
                const iconColors = ['text-primary-600', 'text-emerald-600', 'text-amber-600'];

                const Icon = icons[index] || BookOpen;
                const bgColor = colors[index] || 'from-slate-100 to-slate-200';
                const iconColor = iconColors[index] || 'text-slate-600';

                return (
                  <Link key={article.id} to={`/articles/${article.id}`} className="block">
                    <article className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer">
                      <div className={`h-48 bg-gradient-to-br ${bgColor} flex items-center justify-center`}>
                        <div className="text-center">
                          <Icon className={`w-16 h-16 ${iconColor} mx-auto`} />
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(article.published_at)}</span>
                          <span>•</span>
                          <User className="w-4 h-4" />
                          <span>{article.author.name}</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-primary-600 transition-colors line-clamp-2">
                          {article.title}
                        </h3>
                        <p className="text-slate-600 leading-relaxed mb-4 line-clamp-3">
                          {article.excerpt}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-primary-600 font-medium group-hover:text-primary-700 transition-colors">
                            {t('articles.readMore')} →
                          </span>
                          <div className="flex items-center gap-3 text-sm text-slate-500">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{article.read_time} {t('articles.readTime')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  </Link>
                );
              })
            ) : (
              // Fallback static articles if no featured articles found
              [1, 2, 3].map((num) => (
                <Link key={num} to={`/articles/${num}`} className="block">
                  <article className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer">
                    <div className="h-48 bg-gradient-to-br from-primary-100 to-emerald-100 flex items-center justify-center">
                      <div className="text-center">
                        <BookOpen className="w-16 h-16 text-primary-600 mx-auto" />
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                        <span>{t(`home.blogSection.articles.article${num}.date`)}</span>
                        <span>•</span>
                        <span>{t(`home.blogSection.articles.article${num}.author`)}</span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-primary-600 transition-colors">
                        {t(`home.blogSection.articles.article${num}.title`)}
                      </h3>
                      <p className="text-slate-600 leading-relaxed mb-4">
                        {t(`home.blogSection.articles.article${num}.excerpt`)}
                      </p>
                      <span className="text-primary-600 font-medium group-hover:text-primary-700 transition-colors">
                        {t(`home.blogSection.articles.article${num}.readMore`)}
                      </span>
                    </div>
                  </article>
                </Link>
              ))
            )}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/articles"
              className="inline-block bg-gradient-to-r from-primary-600 to-emerald-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:from-primary-700 hover:to-emerald-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
            >
              {t('home.blogSection.viewAllButton')}
            </Link>
          </div>
        </div>
      </section>

      {/* Subscription Plans Section */}
      <section className="py-20 bg-gradient-to-br from-primary-600 to-emerald-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-32 h-32 bg-white rounded-full"></div>
          <div className="absolute bottom-10 left-10 w-48 h-48 bg-white rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white rounded-full"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center text-white mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 font-display">
              {t('home.pricingSection.title')}
            </h2>
            <p className="text-xl opacity-90">
              {t('home.pricingSection.subtitle')}
            </p>
          </div>

          {/* Pricing Cards */}
          {loadingPlans ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {subscriptionPlans.map((plan) => {
                const Icon = getPlanIcon(plan.name);
                const isPopular = isPopularPlan(plan.name);

                return (
                  <div
                    key={plan.id}
                    className="bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 relative flex flex-col h-full"
                  >
                    {/* Popular Badge */}
                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-amber-400 to-amber-500 text-white px-6 py-2 rounded-full text-sm font-bold">
                        {t('subscription.popular', 'الأكثر شعبية')}
                      </div>
                    )}

                    <div className="text-center flex flex-col h-full">
                      {/* Plan Icon */}
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${getPlanColor(plan.name)} mb-4`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>

                      {/* Plan Name */}
                      <h3 className="text-2xl font-bold text-slate-800 mb-2">
                        {i18n.language === 'ar' ? plan.name : plan.name_en}
                      </h3>

                      {/* Plan Price */}
                      <div className="text-4xl font-bold text-primary-600 mb-6">
                        {plan.price} {plan.currency}
                        <span className="text-lg text-slate-600 font-normal">
                          /{plan.billing_period === 'monthly' ? t('subscription.period.monthly', 'شهر') : t('subscription.period.yearly', 'سنة')}
                        </span>
                      </div>

                      {/* Plan Features */}
                      <ul className="space-y-3 text-slate-600 mb-8 flex-grow">
                        {SubscriptionService.extractActiveFeatures(plan.features || {}).slice(0, 5).map((featureKey, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                            <span>{formatFeatureName(featureKey)}</span>
                          </li>
                        ))}
                        {SubscriptionService.extractActiveFeatures(plan.features || {}).length === 0 && (
                          <li className="flex items-center gap-2 text-slate-400">
                            <CheckCircle className="w-5 h-5" />
                            <span>لا توجد مميزات محددة</span>
                          </li>
                        )}
                      </ul>

                      {/* Action Button */}
                      <Link
                        to="/subscription"
                        className={`block w-full py-3 rounded-xl font-bold transition-all duration-300 text-center mt-auto ${
                          isPopular
                            ? 'bg-gradient-to-r from-primary-600 to-emerald-600 text-white hover:from-primary-700 hover:to-emerald-700 shadow-lg'
                            : plan.name.includes('VIP') || plan.name.includes('vip')
                            ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 shadow-lg'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {plan.trial_enabled && plan.trial_days > 0 ? (
                          <span className="flex items-center justify-center gap-2">
                            <Gift className="w-4 h-4" />
                            {i18n.language === 'ar'
                              ? `فترة تجريبية ${plan.trial_days} أيام مجاناً`
                              : `${plan.trial_days} Days Free Trial`
                            }
                          </span>
                        ) : (
                          t('subscription.choose', 'اختر هذه الباقة')
                        )}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}


        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-br from-slate-800 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary-500 to-emerald-500"></div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 font-display">
            {t('home.ctaSection.title')}
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            {t('home.ctaSection.subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button 
              className="bg-gradient-to-r from-primary-600 to-emerald-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:from-primary-700 hover:to-emerald-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
              onClick={() => navigate('/register')}
            >
              {t('home.ctaSection.buttons.register')}
            </button>
            <button 
              className="bg-white text-slate-800 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-slate-100 transition-all duration-300 shadow-xl"
              onClick={() => navigate('/features')}>
              {t('home.ctaSection.buttons.learn')}
            </button>
          </div>

          <div className="flex justify-center items-center gap-6 text-slate-400 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>{t('home.ctaSection.features.0')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>{t('home.ctaSection.features.1')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              <span>{t('home.ctaSection.features.2')}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
