import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Eye, 
  Target, 
  Heart, 
  Users, 
  Award, 
  Shield,
  BookOpen,
  Globe,
  Star,
  CheckCircle,
  Lightbulb,
  Handshake
} from 'lucide-react';

const AboutPage: React.FC = () => {
  const { t, i18n } = useTranslation();



  const teamMembers = [
    {
      roleKey: 'development',
      icon: Users,
      color: 'from-blue-500 to-blue-600'
    },
    {
      roleKey: 'sharia',
      icon: BookOpen,
      color: 'from-emerald-500 to-emerald-600'
    },
    {
      roleKey: 'design',
      icon: Star,
      color: 'from-purple-500 to-purple-600'
    },
    {
      roleKey: 'security',
      icon: Shield,
      color: 'from-red-500 to-red-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Hero Section */}
      <section className="relative py-12 md:py-16 lg:py-20 bg-gradient-to-br from-primary-600 via-blue-600 to-emerald-600 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0">
          <div className="absolute top-5 md:top-10 right-5 md:right-10 w-16 h-16 md:w-32 md:h-32 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-5 md:bottom-10 left-5 md:left-10 w-20 h-20 md:w-40 md:h-40 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 md:w-60 md:h-60 bg-white/5 rounded-full blur-2xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 md:mb-6 font-display">
              {t('about.title')}
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 max-w-4xl mx-auto leading-relaxed px-4">
              {t('about.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="py-12 md:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 lg:gap-12">
            {/* Vision */}
            <div className="bg-white rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6">
                <Eye className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4 md:mb-6 font-display">
                {t('about.vision.title')}
              </h2>
              <p className="text-slate-600 leading-relaxed text-base md:text-lg">
                {t('about.vision.description')}
              </p>
            </div>

            {/* Mission */}
            <div className="bg-white rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6">
                <Target className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4 md:mb-6 font-display">
                {t('about.mission.title')}
              </h2>
              <p className="text-slate-600 leading-relaxed text-base md:text-lg">
                {t('about.mission.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 bg-gradient-to-r from-slate-100 to-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6 font-display">
              {t('about.story.title')}
            </h2>
          </div>

          <div className="bg-white rounded-3xl p-12 shadow-xl">
            <div className="flex items-center justify-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-rose-500 to-rose-600 rounded-3xl flex items-center justify-center">
                <Heart className="w-10 h-10 text-white" />
              </div>
            </div>
            <p className="text-xl text-slate-700 leading-relaxed text-center max-w-4xl mx-auto">
              {t('about.story.description')}
            </p>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6 font-display">
              {t('about.values.title')}
            </h2>
            <p className="text-xl text-slate-600">
              {t('about.values.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(t('about.values.items', { returnObjects: true }) as string[]).map((value: string, index: number) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-slate-100"
              >
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-slate-700 leading-relaxed">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Team */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-emerald-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 font-display">
              {t('about.team.title')}
            </h2>
            <p className="text-xl text-white/90 max-w-3xl mx-auto">
              {t('about.team.description')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 text-center hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${member.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <member.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{t(`about.team.members.${member.roleKey}.role`)}</h3>
                <p className="text-white/90 text-sm leading-relaxed">{t(`about.team.members.${member.roleKey}.description`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Commitment */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl p-12 shadow-xl">
            <div className="text-center mb-12">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Handshake className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6 font-display">
                {t('about.commitment.title')}
              </h2>
            </div>
            
            <p className="text-xl text-slate-700 leading-relaxed text-center max-w-4xl mx-auto">
              {t('about.commitment.description')}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{t('about.commitment.features.quality.title')}</h3>
                <p className="text-slate-600">{t('about.commitment.features.quality.description')}</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Lightbulb className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{t('about.commitment.features.innovation.title')}</h3>
                <p className="text-slate-600">{t('about.commitment.features.innovation.description')}</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{t('about.commitment.features.global.title')}</h3>
                <p className="text-slate-600">{t('about.commitment.features.global.description')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
