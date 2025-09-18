import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Search,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  MessageCircle,
  User,
  Heart,
  Shield,
  Book,
  CreditCard,
  Phone
} from 'lucide-react';

interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const FAQPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const isRTL = i18n.language === 'ar';

  const categories = [
    { id: 'all', icon: HelpCircle, label: t('faq.categories.all') },
    { id: 'general', icon: HelpCircle, label: t('faq.categories.general') },
    { id: 'account', icon: User, label: t('faq.categories.account') },
    { id: 'profile', icon: User, label: t('faq.categories.profile') },
    { id: 'matching', icon: Heart, label: t('faq.categories.matching') },
    { id: 'communication', icon: MessageCircle, label: t('faq.categories.communication') },
    { id: 'safety', icon: Shield, label: t('faq.categories.safety') },
    { id: 'islamic', icon: Book, label: t('faq.categories.islamic') },
    { id: 'billing', icon: CreditCard, label: t('faq.categories.billing') }
  ];

  const faqs: FAQ[] = t('faq.questions', { returnObjects: true }) as FAQ[];

  const filteredFAQs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      // Support Arabic search with normalized text
      faq.question.replace(/[أإآ]/g, 'ا').toLowerCase().includes(searchQuery.replace(/[أإآ]/g, 'ا').toLowerCase()) ||
      faq.answer.replace(/[أإآ]/g, 'ا').toLowerCase().includes(searchQuery.replace(/[أإآ]/g, 'ا').toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-emerald-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto">
            <HelpCircle className="w-16 h-16 mx-auto mb-6 text-blue-100" />
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {t('faq.title')}
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              {t('faq.subtitle')}
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <Search className={`absolute top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 ${
                isRTL ? 'left-4' : 'right-4'
              }`} />
              <input
                type="text"
                placeholder={t('faq.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full px-6 py-4 rounded-2xl text-slate-800 text-lg focus:outline-none focus:ring-4 focus:ring-white/30 shadow-lg ${
                  isRTL ? 'pl-12 text-right' : 'pr-12 text-left'
                }`}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* FAQ Content */}
          <div className={`lg:col-span-3 ${
            isRTL ? 'order-2 lg:order-1' : 'order-2 lg:order-2'
          }`}>
            {filteredFAQs.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 shadow-lg text-center">
                <HelpCircle className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-xl font-bold text-slate-600 mb-2">
                  {t('faq.noResults.title')}
                </h3>
                <p className="text-slate-500">
                  {t('faq.noResults.description')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredFAQs.map((faq) => (
                  <div
                    key={faq.id}
                    className="bg-white rounded-2xl shadow-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleExpanded(faq.id)}
                      className={`w-full px-6 py-6 hover:bg-slate-50 transition-colors duration-200 ${
                        isRTL ? 'text-right' : 'text-left'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        {isRTL ? (
                          <>
                            <h3 className="text-lg font-bold text-slate-800 flex-1 text-right">
                              {faq.question}
                            </h3>
                            {expandedItems.includes(faq.id) ? (
                              <ChevronUp className="w-5 h-5 text-slate-500 flex-shrink-0 ml-4" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-slate-500 flex-shrink-0 ml-4" />
                            )}
                          </>
                        ) : (
                          <>
                            {expandedItems.includes(faq.id) ? (
                              <ChevronUp className="w-5 h-5 text-slate-500 flex-shrink-0 mr-4" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-slate-500 flex-shrink-0 mr-4" />
                            )}
                            <h3 className="text-lg font-bold text-slate-800 flex-1 text-left">
                              {faq.question}
                            </h3>
                          </>
                        )}
                      </div>
                    </button>

                    {expandedItems.includes(faq.id) && (
                      <div className="px-6 pb-6 border-t border-slate-100">
                        <div className="pt-4">
                          <p className={`text-slate-600 leading-relaxed ${
                            isRTL ? 'text-right' : 'text-left'
                          }`}>
                            {faq.answer}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Still Need Help Section */}
            <div className="mt-12 bg-gradient-to-r from-primary-600 to-emerald-600 rounded-2xl p-8 text-white text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-blue-100" />
              <h3 className="text-2xl font-bold mb-4">
                {t('faq.stillNeedHelp.title')}
              </h3>
              <p className="text-blue-100 mb-6">
                {t('faq.stillNeedHelp.description')}
              </p>
              <a
                href="/contact"
                className="inline-flex items-center gap-3 bg-white text-primary-600 px-8 py-4 rounded-xl font-medium hover:bg-blue-50 transition-all duration-200 transform hover:-translate-y-1 hover:shadow-lg"
              >
                <Phone className="w-5 h-5" />
                {t('faq.stillNeedHelp.contactButton')}
              </a>
            </div>
          </div>

          {/* Categories Sidebar */}
          <div className={`lg:col-span-1 ${
            isRTL ? 'order-1 lg:order-2' : 'order-1 lg:order-1'
          }`}>
            <div className="bg-white rounded-2xl p-6 shadow-lg sticky top-8">
              <h3 className={`text-xl font-bold text-slate-800 mb-6 ${
                isRTL ? 'text-right' : 'text-left'
              }`}>{t('faq.categoriesTitle')}</h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      isRTL ? 'text-right' : 'text-left'
                    } ${
                      selectedCategory === category.id
                        ? 'bg-primary-100 text-primary-700 border border-primary-200'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {isRTL ? (
                      <>
                        <span className="font-medium flex-1 text-right">{category.label}</span>
                        <category.icon className="w-5 h-5 flex-shrink-0" />
                      </>
                    ) : (
                      <>
                        <category.icon className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium flex-1 text-left">{category.label}</span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQPage;
