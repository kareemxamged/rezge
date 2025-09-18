import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  FileText,
  UserCheck,
  Users,
  AlertTriangle,
  Shield,
  Copyright,
  AlertCircle,
  XCircle,
  Edit,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  X
} from 'lucide-react';

const TermsOfServicePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const sections = [
    {
      id: 'acceptance',
      icon: FileText,
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'eligibility',
      icon: UserCheck,
      color: 'from-emerald-500 to-emerald-600'
    },
    {
      id: 'userConduct',
      icon: Users,
      color: 'from-purple-500 to-purple-600'
    },
    {
      id: 'prohibitedActivities',
      icon: AlertTriangle,
      color: 'from-red-500 to-red-600'
    },
    {
      id: 'accountSecurity',
      icon: Shield,
      color: 'from-indigo-500 to-indigo-600'
    },
    {
      id: 'intellectualProperty',
      icon: Copyright,
      color: 'from-amber-500 to-amber-600'
    },
    {
      id: 'limitation',
      icon: AlertCircle,
      color: 'from-orange-500 to-orange-600'
    },
    {
      id: 'termination',
      icon: XCircle,
      color: 'from-rose-500 to-rose-600'
    },
    {
      id: 'changes',
      icon: Edit,
      color: 'from-teal-500 to-teal-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-emerald-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-4xl mx-auto">
            <FileText className="w-16 h-16 mx-auto mb-6 text-blue-100" />
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {t('termsOfService.title')}
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              {t('termsOfService.subtitle')}
            </p>
            <div className="flex items-center justify-center gap-2 text-blue-100">
              <Calendar className="w-5 h-5" />
              <span>{t('termsOfService.lastUpdated')}: {t('termsOfService.lastUpdatedDate')}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Table of Contents */}
        <section className="mb-16">
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">{t('termsOfService.tableOfContents')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sections.map((section, index) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className={`flex items-center gap-3 p-4 rounded-xl hover:bg-slate-50 transition-colors group ${
                    isRTL ? 'text-right' : 'text-left'
                  }`}
                >
                  <div className={`w-8 h-8 bg-gradient-to-r ${section.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <section.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-slate-700 group-hover:text-primary-600 transition-colors">
                    {index + 1}. {t(`termsOfService.sections.${section.id}.title`)}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Terms Sections */}
        <div className="space-y-12">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 bg-gradient-to-r ${section.color} rounded-xl flex items-center justify-center`}>
                  <section.icon className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">
                  {t(`termsOfService.sections.${section.id}.title`)}
                </h2>
              </div>

              {/* Simple content sections */}
              {(section.id === 'acceptance' || section.id === 'intellectualProperty' || section.id === 'changes') && (
                <p className="text-slate-600 leading-relaxed text-lg">
                  {t(`termsOfService.sections.${section.id}.content`)}
                </p>
              )}

              {/* Sections with requirements/rules/activities lists */}
              {(section.id === 'eligibility' || section.id === 'userConduct' || section.id === 'prohibitedActivities' || section.id === 'accountSecurity' || section.id === 'limitation' || section.id === 'termination') && (
                <>
                  {section.id !== 'eligibility' && (
                    <p className="text-slate-600 leading-relaxed mb-6">
                      {t(`termsOfService.sections.${section.id}.intro`)}
                    </p>
                  )}
                  <div className="space-y-3">
                    {(t(`termsOfService.sections.${section.id}.${
                      section.id === 'eligibility' ? 'requirements' :
                      section.id === 'userConduct' ? 'rules' :
                      section.id === 'prohibitedActivities' ? 'activities' :
                      section.id === 'accountSecurity' ? 'responsibilities' :
                      section.id === 'limitation' ? 'disclaimers' : 'reasons'
                    }`, { returnObjects: true }) as string[]).map((item, index) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                        {section.id === 'prohibitedActivities' ? (
                          <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        )}
                        <span className="text-slate-700">{item}</span>
                      </div>
                    ))}
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
                {t('termsOfService.sections.contact.title')}
              </h2>
              <p className="text-blue-100">
                {t('termsOfService.sections.contact.intro')}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <Link to="mailto:info@rezge.com">
                <div className="text-center p-4 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-1">
                  <Mail className="w-8 h-8 mx-auto mb-3 text-blue-100" />
                  <p className="font-medium mb-1">{t('termsOfService.sections.contact.emailLabel')}</p>
                  <p className="text-blue-100">{t('termsOfService.sections.contact.email')}</p>
                </div>
              </Link>
              <Link to="tel:+966582352555">
                <div className="text-center p-4 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-1">
                  <Phone className="w-8 h-8 mx-auto mb-3 text-blue-100" />
                  <p className="font-medium mb-1">{t('termsOfService.sections.contact.phoneLabel')}</p>
                  <p className="text-blue-100" dir={t('termsOfService.sections.contact.phoneDir')}>{t('termsOfService.sections.contact.phone')}</p>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Important Notice */}
        <section className="mt-16">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8">
            <div className={`flex items-start gap-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              <AlertTriangle className="w-8 h-8 text-amber-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-bold text-amber-800 mb-2">
                  {t('termsOfService.importantNotice.title')}
                </h3>
                <p className="text-amber-700 leading-relaxed">
                  {t('termsOfService.importantNotice.content')}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
