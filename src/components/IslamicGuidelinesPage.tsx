import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Book,
  Heart,
  Users,
  Shield,
  MessageCircle,
  CheckCircle,
  Star,
  Lightbulb,
  Quote
} from 'lucide-react';

const IslamicGuidelinesPage: React.FC = () => {
  const { t, i18n } = useTranslation();

  const sections = [
    {
      id: 'courtship',
      icon: Heart,
      color: 'from-rose-500 to-rose-600'
    },
    {
      id: 'family',
      icon: Users,
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'privacy',
      icon: Shield,
      color: 'from-emerald-500 to-emerald-600'
    },
    {
      id: 'communication',
      icon: MessageCircle,
      color: 'from-purple-500 to-purple-600'
    },
    {
      id: 'verification',
      icon: CheckCircle,
      color: 'from-amber-500 to-amber-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-emerald-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-4xl mx-auto">
            <Book className="w-16 h-16 mx-auto mb-6 text-blue-100" />
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {t('islamicGuidelines.title')}
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              {t('islamicGuidelines.subtitle')}
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Introduction */}
        <section className="mb-16">
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <Lightbulb className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">
                {t('islamicGuidelines.sections.introduction.title')}
              </h2>
            </div>
            <p className="text-slate-600 leading-relaxed text-lg">
              {t('islamicGuidelines.sections.introduction.content')}
            </p>
          </div>
        </section>

        {/* Guidelines Sections */}
        <div className="space-y-12">
          {sections.map((section) => (
            <section key={section.id} className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 bg-gradient-to-r ${section.color} rounded-xl flex items-center justify-center`}>
                  <section.icon className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">
                  {t(`islamicGuidelines.sections.${section.id}.title`)}
                </h2>
              </div>

              {/* Content for family section */}
              {section.id === 'family' && (
                <>
                  <p className="text-slate-600 leading-relaxed mb-6">
                    {t(`islamicGuidelines.sections.${section.id}.content`)}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(t(`islamicGuidelines.sections.${section.id}.points`, { returnObjects: true }) as string[]).map((point, index) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                        <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700">{point}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Content for verification section */}
              {section.id === 'verification' && (
                <>
                  <p className="text-slate-600 leading-relaxed mb-6">
                    {t(`islamicGuidelines.sections.${section.id}.importance`)}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(t(`islamicGuidelines.sections.${section.id}.steps`, { returnObjects: true }) as string[]).map((step, index) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                        <div className="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {index + 1}
                        </div>
                        <span className="text-slate-700">{step}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Content for other sections with guidelines/rules */}
              {(section.id === 'courtship' || section.id === 'privacy' || section.id === 'communication') && (
                <div className="grid grid-cols-1 gap-4">
                  {(t(`islamicGuidelines.sections.${section.id}.${section.id === 'communication' ? 'rules' : 'guidelines'}`, { returnObjects: true }) as string[]).map((item, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        {/* Important Reminders */}
        <section className="mt-16">
          <div className="bg-gradient-to-r from-primary-600 to-emerald-600 rounded-2xl p-8 text-white">
            <div className="text-center mb-8">
              <Star className="w-12 h-12 mx-auto mb-4 text-blue-100" />
              <h2 className="text-2xl font-bold mb-4">
                {t('islamicGuidelines.reminders.title')}
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(t('islamicGuidelines.reminders.points', { returnObjects: true }) as string[]).map((reminder, index) => (
                <div key={index} className="flex items-start gap-3 p-4 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20">
                  <Quote className="w-5 h-5 text-blue-100 flex-shrink-0 mt-0.5" />
                  <span className="text-blue-50">{reminder}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="mt-16 text-center">
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h3 className="text-2xl font-bold text-slate-800 mb-4">
              {t('islamicGuidelines.callToAction.title')}
            </h3>
            <p className="text-slate-600 mb-6">
              {t('islamicGuidelines.callToAction.description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/faq"
                className="bg-primary-600 text-white px-8 py-4 rounded-xl font-medium hover:bg-primary-700 transition-all duration-200 transform hover:-translate-y-1 hover:shadow-lg"
              >
                {t('islamicGuidelines.callToAction.faqButton')}
              </a>
              <a
                href="/contact"
                className="border border-primary-600 text-primary-600 px-8 py-4 rounded-xl font-medium hover:bg-primary-50 transition-all duration-200 transform hover:-translate-y-1 hover:shadow-lg"
              >
                {t('islamicGuidelines.callToAction.contactButton')}
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default IslamicGuidelinesPage;
