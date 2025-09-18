import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Shield,
  Database,
  Eye,
  Share2,
  Lock,
  UserCheck,
  Cookie,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle
} from 'lucide-react';

const PrivacyPolicyPage: React.FC = () => {
  const { t, i18n } = useTranslation();

  const sections = [
    {
      id: 'introduction',
      icon: Shield,
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'dataCollection',
      icon: Database,
      color: 'from-emerald-500 to-emerald-600'
    },
    {
      id: 'dataUsage',
      icon: Eye,
      color: 'from-purple-500 to-purple-600'
    },
    {
      id: 'dataSharing',
      icon: Share2,
      color: 'from-amber-500 to-amber-600'
    },
    {
      id: 'dataSecurity',
      icon: Lock,
      color: 'from-red-500 to-red-600'
    },
    {
      id: 'userRights',
      icon: UserCheck,
      color: 'from-indigo-500 to-indigo-600'
    },
    {
      id: 'cookies',
      icon: Cookie,
      color: 'from-rose-500 to-rose-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-emerald-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-4xl mx-auto">
            <Shield className="w-16 h-16 mx-auto mb-6 text-blue-100" />
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {t('privacyPolicy.title')}
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              {t('privacyPolicy.subtitle')}
            </p>
            <div className="flex items-center justify-center gap-2 text-blue-100">
              <Calendar className="w-5 h-5" />
              <span>{t('privacyPolicy.lastUpdated')}: {t('privacyPolicy.lastUpdatedDate')}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Table of Contents */}
        <section className="mb-16">
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">{t('privacyPolicy.tableOfContents')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sections.map((section, index) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className={`flex items-center gap-3 p-4 rounded-xl hover:bg-slate-50 transition-colors group ${
                    i18n.language === 'ar' ? 'text-right' : 'text-left'
                  }`}
                >
                  <div className={`w-8 h-8 bg-gradient-to-r ${section.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <section.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-slate-700 group-hover:text-primary-600 transition-colors">
                    {index + 1}. {t(`privacyPolicy.sections.${section.id}.title`)}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Policy Sections */}
        <div className="space-y-12">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 bg-gradient-to-r ${section.color} rounded-xl flex items-center justify-center`}>
                  <section.icon className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">
                  {t(`privacyPolicy.sections.${section.id}.title`)}
                </h2>
              </div>

              {/* Introduction section */}
              {section.id === 'introduction' && (
                <p className="text-slate-600 leading-relaxed text-lg">
                  {t(`privacyPolicy.sections.${section.id}.content`)}
                </p>
              )}

              {/* Sections with intro and list */}
              {(section.id === 'dataCollection' || section.id === 'dataUsage' || section.id === 'dataSharing' || section.id === 'dataSecurity') && (
                <>
                  <p className="text-slate-600 leading-relaxed mb-6">
                    {t(`privacyPolicy.sections.${section.id}.intro`)}
                  </p>
                  <div className="space-y-3">
                    {(t(`privacyPolicy.sections.${section.id}.${
                      section.id === 'dataCollection' ? 'types' :
                      section.id === 'dataUsage' ? 'purposes' :
                      section.id === 'dataSharing' ? 'cases' : 'measures'
                    }`, { returnObjects: true }) as string[]).map((item, index) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                        <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* User Rights section */}
              {section.id === 'userRights' && (
                <>
                  <p className="text-slate-600 leading-relaxed mb-6">
                    {t(`privacyPolicy.sections.${section.id}.intro`)}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(t(`privacyPolicy.sections.${section.id}.rights`, { returnObjects: true }) as string[]).map((right, index) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                        <UserCheck className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700">{right}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Cookies section */}
              {section.id === 'cookies' && (
                <>
                  <p className="text-slate-600 leading-relaxed mb-6">
                    {t(`privacyPolicy.sections.${section.id}.intro`)}
                  </p>
                  <div className="space-y-3 mb-6">
                    {(t(`privacyPolicy.sections.${section.id}.types`, { returnObjects: true }) as string[]).map((type, index) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                        <Cookie className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700">{type}</span>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <p className="text-blue-800 font-medium">
                      {t(`privacyPolicy.sections.${section.id}.control`)}
                    </p>
                  </div>
                </>
              )}
            </section>
          ))}
        </div>

        {/* Contact Section */}
        <section className="mt-16">
          <div className="bg-gradient-to-r from-primary-600 to-emerald-600 rounded-2xl p-8 text-white">
            <div className="text-center mb-8">
              <Mail className="w-12 h-12 mx-auto mb-4 text-blue-100" />
              <h2 className="text-2xl font-bold mb-4">
                {t('privacyPolicy.sections.contact.title')}
              </h2>
              <p className="text-blue-100">
                {t('privacyPolicy.sections.contact.intro')}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link to="mailto:info@rezge.com">
                <div className="text-center p-4 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-1">
                  <Mail className="w-8 h-8 mx-auto mb-3 text-blue-100" />
                  <p className="font-medium mb-1">{t('privacyPolicy.sections.contact.emailLabel')}</p>
                  <p className="text-blue-100">{t('privacyPolicy.sections.contact.email')}</p>
                </div>
              </Link>
              <Link to="tel:+966582352555">
                <div className="text-center p-4 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-1">
                  <Phone className="w-8 h-8 mx-auto mb-3 text-blue-100" />
                  <p className="font-medium mb-1">{t('privacyPolicy.sections.contact.phoneLabel')}</p>
                  <p className="text-blue-100" dir={t('privacyPolicy.sections.contact.phoneDir')}>{t('privacyPolicy.sections.contact.phone')}</p>
                </div>
              </Link>
              <div className="text-center p-4 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-1">
                <MapPin className="w-8 h-8 mx-auto mb-3 text-blue-100" />
                <p className="font-medium mb-1">{t('privacyPolicy.sections.contact.addressLabel')}</p>
                <p className="text-blue-100">{t('privacyPolicy.sections.contact.address')}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
