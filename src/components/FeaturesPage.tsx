import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  User, 
  Heart, 
  MessageCircle, 
  Shield, 
  Users, 
  CheckCircle, 
  Book, 
  Globe, 
  Smartphone,
  Star,
  Lock,
  Eye
} from 'lucide-react';

const FeaturesPage: React.FC = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: User,
      title: t('features.detailedProfile.title'),
      description: t('features.detailedProfile.description'),
      color: 'from-primary-500 to-primary-600',
      benefits: [
        t('features.detailedProfile.benefits.comprehensive'),
        t('features.detailedProfile.benefits.preferences'),
        t('features.detailedProfile.benefits.religious'),
        t('features.detailedProfile.benefits.updates')
      ]
    },
    {
      icon: Heart,
      title: t('features.smartMatching.title'),
      description: t('features.smartMatching.description'),
      color: 'from-rose-500 to-rose-600',
      benefits: [
        t('features.smartMatching.benefits.algorithm'),
        t('features.smartMatching.benefits.compatibility'),
        t('features.smartMatching.benefits.suggestions'),
        t('features.smartMatching.benefits.updates')
      ]
    },
    {
      icon: MessageCircle,
      title: t('features.secureMessaging.title'),
      description: t('features.secureMessaging.description'),
      color: 'from-emerald-500 to-emerald-600',
      benefits: [
        t('features.secureMessaging.benefits.monitoring'),
        t('features.secureMessaging.benefits.family'),
        t('features.secureMessaging.benefits.encryption'),
        t('features.secureMessaging.benefits.history')
      ]
    },
    {
      icon: Shield,
      title: t('features.privacyProtection.title'),
      description: t('features.privacyProtection.description'),
      color: 'from-blue-500 to-blue-600',
      benefits: [
        t('features.privacyProtection.benefits.encryption'),
        t('features.privacyProtection.benefits.settings'),
        t('features.privacyProtection.benefits.access'),
        t('features.privacyProtection.benefits.backup')
      ]
    },
    {
      icon: Users,
      title: t('features.familyInvolvement.title'),
      description: t('features.familyInvolvement.description'),
      color: 'from-purple-500 to-purple-600',
      benefits: [
        t('features.familyInvolvement.benefits.invitation'),
        t('features.familyInvolvement.benefits.monitoring'),
        t('features.familyInvolvement.benefits.approval'),
        t('features.familyInvolvement.benefits.reports')
      ]
    },
    {
      icon: CheckCircle,
      title: t('features.verifiedProfiles.title'),
      description: t('features.verifiedProfiles.description'),
      color: 'from-green-500 to-green-600',
      benefits: [
        t('features.verifiedProfiles.benefits.identity'),
        t('features.verifiedProfiles.benefits.verification'),
        t('features.verifiedProfiles.benefits.badges'),
        t('features.verifiedProfiles.benefits.fake')
      ]
    },
    {
      icon: Book,
      title: t('features.islamicGuidelines.title'),
      description: t('features.islamicGuidelines.description'),
      color: 'from-amber-500 to-amber-600',
      benefits: [
        t('features.islamicGuidelines.benefits.photos'),
        t('features.islamicGuidelines.benefits.communication'),
        t('features.islamicGuidelines.benefits.review'),
        t('features.islamicGuidelines.benefits.guidance')
      ]
    },
    {
      icon: Globe,
      title: t('features.multiLanguage.title'),
      description: t('features.multiLanguage.description'),
      color: 'from-indigo-500 to-indigo-600',
      benefits: [
        t('features.multiLanguage.benefits.interface'),
        t('features.multiLanguage.benefits.rtl'),
        t('features.multiLanguage.benefits.translation'),
        t('features.multiLanguage.benefits.switching')
      ]
    },
    {
      icon: Smartphone,
      title: t('features.mobileOptimized.title'),
      description: t('features.mobileOptimized.description'),
      color: 'from-teal-500 to-teal-600',
      benefits: [
        t('features.mobileOptimized.benefits.responsive'),
        t('features.mobileOptimized.benefits.app'),
        t('features.mobileOptimized.benefits.speed'),
        t('features.mobileOptimized.benefits.experience')
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" dir={t('common.dir')}>
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-primary-600 via-blue-600 to-emerald-600 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0">
          <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-10 left-10 w-40 h-40 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-white/5 rounded-full blur-2xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 font-display">
              {t('features.title')}
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-4xl mx-auto leading-relaxed">
              {t('features.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-slate-100"
              >
                {/* Icon */}
                <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-slate-800 mb-4 group-hover:text-primary-600 transition-colors duration-300">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-slate-600 leading-relaxed mb-6">
                  {feature.description}
                </p>

                {/* Benefits */}
                <div className="space-y-3">
                  {feature.benefits.map((benefit, benefitIndex) => (
                    <div key={benefitIndex} className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                      <span className="text-slate-700 text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-emerald-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 font-display">
              {t('features.statistics.title')}
            </h2>
            <p className="text-xl text-white/90">
              {t('features.statistics.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">{t('features.statistics.members.number')}</div>
              <div className="text-white/90 font-medium">{t('features.statistics.members.label')}</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">{t('features.statistics.marriages.number')}</div>
              <div className="text-white/90 font-medium">{t('features.statistics.marriages.label')}</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">{t('features.statistics.satisfaction.number')}</div>
              <div className="text-white/90 font-medium">{t('features.statistics.satisfaction.label')}</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">{t('features.statistics.support.number')}</div>
              <div className="text-white/90 font-medium">{t('features.statistics.support.label')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6 font-display">
              {t('features.security.title')}
            </h2>
            <p className="text-xl text-slate-600">
              {t('features.security.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-3xl p-8 shadow-lg text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-4">{t('features.security.encryption.title')}</h3>
              <p className="text-slate-600">
                {t('features.security.encryption.description')}
              </p>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-lg text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Eye className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-4">{t('features.security.monitoring.title')}</h3>
              <p className="text-slate-600">
                {t('features.security.monitoring.description')}
              </p>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-lg text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Star className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-4">{t('features.security.quality.title')}</h3>
              <p className="text-slate-600">
                {t('features.security.quality.description')}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FeaturesPage;
