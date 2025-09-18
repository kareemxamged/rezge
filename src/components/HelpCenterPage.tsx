import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  User,
  Heart,

  Shield,
  Book,
  Users,
  HelpCircle,
  Phone,
  Mail,
  MessageSquare,
  ChevronRight,
  Star,
  Clock,
  CheckCircle
} from 'lucide-react';

const HelpCenterPage: React.FC = () => {
  const { t, i18n } = useTranslation();

  const categories = [
    {
      id: 'gettingStarted',
      icon: BookOpen,
      color: 'from-blue-500 to-blue-600',
      articles: 2,
      categoryName: i18n.language === 'ar' ? 'البدء' : 'Getting Started'
    },
    {
      id: 'profile',
      icon: User,
      color: 'from-emerald-500 to-emerald-600',
      articles: 2,
      categoryName: i18n.language === 'ar' ? 'الملف الشخصي' : 'Profile Management'
    },
    {
      id: 'safety',
      icon: Shield,
      color: 'from-amber-500 to-amber-600',
      articles: i18n.language === 'ar' ? 4 : 3,
      categoryName: i18n.language === 'ar' ? 'الأمان الرقمي' : 'Digital Safety'
    },
    {
      id: 'islamic',
      icon: Book,
      color: 'from-indigo-500 to-indigo-600',
      articles: i18n.language === 'ar' ? 3 : 5,
      categoryName: i18n.language === 'ar' ? 'الإرشاد الإسلامي' : 'Islamic Guidance'
    },
    {
      id: 'family',
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      articles: 6,
      categoryName: i18n.language === 'ar' ? 'التوجيه الأسري' : 'Family Guidance'
    },
    {
      id: 'marriage',
      icon: Heart,
      color: 'from-rose-500 to-rose-600',
      articles: i18n.language === 'ar' ? 8 : 3,
      categoryName: i18n.language === 'ar' ? 'نصائح الزواج' : 'Marriage Tips'
    }
  ];

  const quickActions = [
    {
      key: 'contact',
      icon: Phone,
      color: 'from-blue-500 to-blue-600',
      href: '/contact'
    },
    {
      key: 'faq',
      icon: HelpCircle,
      color: 'from-emerald-500 to-emerald-600',
      href: '/faq'
    },
    {
      key: 'guidelines',
      icon: Book,
      color: 'from-purple-500 to-purple-600',
      href: '/islamic-guidelines'
    },
    {
      key: 'report',
      icon: Shield,
      color: 'from-red-500 to-red-600',
      href: '/contact'
    }
  ];

  const supportOptions = [
    {
      key: 'chat',
      icon: MessageSquare,
      color: 'from-blue-500 to-blue-600',
      redirect: 'https://wa.me/+966582352555'
    },
    {
      key: 'email',
      icon: Mail,
      color: 'from-emerald-500 to-emerald-600',
      redirect: 'mailto:info@rezge.com'
    },
    {
      key: 'phone',
      icon: Phone,
      color: 'from-purple-500 to-purple-600',
      redirect: 'tel:+966582352555'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-emerald-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {t('helpCenter.title')}
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              {t('helpCenter.subtitle')}
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Categories Grid */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-slate-800 mb-8 text-center">
            {t('helpCenter.categoriesTitle')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/articles?category=${encodeURIComponent(category.categoryName)}`}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer group block"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 bg-gradient-to-r ${category.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <category.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-800 mb-2">
                      {t(`helpCenter.categories.${category.id}.title`)}
                    </h3>
                    <p className="text-slate-600 mb-3">
                      {t(`helpCenter.categories.${category.id}.description`)}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">
                        {category.articles} {t('helpCenter.articlesCount')}
                      </span>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-primary-600 transition-colors" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Popular Topics */}
        <section className="mb-16">
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              <Star className="w-6 h-6 text-amber-500" />
              {t('helpCenter.popularTopics.title')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Array.isArray(t('helpCenter.popularTopics.topics', { returnObjects: true }))
                ? t('helpCenter.popularTopics.topics', { returnObjects: true }) as string[]
                : []
              ).map((topic: string, index: number) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-4 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-slate-700 group-hover:text-primary-600 transition-colors">
                    {topic}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">
            {t('helpCenter.quickActions.title')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <a
                key={action.key}
                href={action.href}
                className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-center group"
              >
                <div className={`w-16 h-16 bg-gradient-to-r ${action.color} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <action.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 group-hover:text-primary-600 transition-colors">
                  {t(`helpCenter.quickActions.${action.key}`)}
                </h3>
              </a>
            ))}
          </div>
        </section>

        {/* Support Section */}
        <section className="bg-gradient-to-r from-primary-600 to-emerald-600 rounded-2xl p-8 text-white text-center">
          <Clock className="w-16 h-16 mx-auto mb-6 text-blue-100" />
          <h2 className="text-2xl font-bold mb-4">
            {t('helpCenter.support.title')}
          </h2>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            {t('helpCenter.support.description')}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {supportOptions.map((option) => (
              <Link 
                key={option.key}
                to={option.redirect}
                className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-1"
              >
                <option.icon className="w-8 h-8 mx-auto mb-3 text-white" />
                <span className="text-lg font-medium">
                  {t(`helpCenter.support.${option.key}`)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default HelpCenterPage;
