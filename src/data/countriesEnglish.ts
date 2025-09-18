// قائمة الدول العربية بالأسماء الإنجليزية
export interface CountryEnglish {
  code: string;
  nameAr: string;
  nameEn: string;
  phoneCode: string;
  flag: string;
  phoneFormat?: string;
}

export const countriesEnglish: CountryEnglish[] = [
  {
    code: 'SA',
    nameAr: 'المملكة العربية السعودية',
    nameEn: 'Saudi Arabia',
    phoneCode: '+966',
    flag: '🇸🇦',
    phoneFormat: '5XXXXXXXX'
  },
  {
    code: 'AE',
    nameAr: 'الإمارات العربية المتحدة',
    nameEn: 'United Arab Emirates',
    phoneCode: '+971',
    flag: '🇦🇪', // علم الإمارات الصحيح
    phoneFormat: '5XXXXXXXX'
  },
  {
    code: 'EG',
    nameAr: 'مصر',
    nameEn: 'Egypt',
    phoneCode: '+20',
    flag: '🇪🇬',
    phoneFormat: '1XXXXXXXXX'
  },
  {
    code: 'JO',
    nameAr: 'الأردن',
    nameEn: 'Jordan',
    phoneCode: '+962',
    flag: '🇯🇴',
    phoneFormat: '7XXXXXXXX'
  },
  {
    code: 'LB',
    nameAr: 'لبنان',
    nameEn: 'Lebanon',
    phoneCode: '+961',
    flag: '🇱🇧',
    phoneFormat: 'XXXXXXXX'
  },
  {
    code: 'SY',
    nameAr: 'سوريا',
    nameEn: 'Syria',
    phoneCode: '+963',
    flag: '🇸🇾',
    phoneFormat: 'XXXXXXXXX'
  },
  {
    code: 'IQ',
    nameAr: 'العراق',
    nameEn: 'Iraq',
    phoneCode: '+964',
    flag: '🇮🇶',
    phoneFormat: '7XXXXXXXXX'
  },
  {
    code: 'KW',
    nameAr: 'الكويت',
    nameEn: 'Kuwait',
    phoneCode: '+965',
    flag: '🇰🇼', // علم الكويت الصحيح
    phoneFormat: 'XXXXXXXX'
  },
  {
    code: 'QA',
    nameAr: 'قطر',
    nameEn: 'Qatar',
    phoneCode: '+974',
    flag: '🇶🇦',
    phoneFormat: 'XXXXXXXX'
  },
  {
    code: 'BH',
    nameAr: 'البحرين',
    nameEn: 'Bahrain',
    phoneCode: '+973',
    flag: '🇧🇭',
    phoneFormat: 'XXXXXXXX'
  },
  {
    code: 'OM',
    nameAr: 'عُمان',
    nameEn: 'Oman',
    phoneCode: '+968',
    flag: '🇴🇲',
    phoneFormat: 'XXXXXXXX'
  },
  {
    code: 'YE',
    nameAr: 'اليمن',
    nameEn: 'Yemen',
    phoneCode: '+967',
    flag: '🇾🇪',
    phoneFormat: 'XXXXXXXXX'
  },
  {
    code: 'PS',
    nameAr: 'فلسطين',
    nameEn: 'Palestine',
    phoneCode: '+970',
    flag: '🇵🇸',
    phoneFormat: '59XXXXXXX'
  },
  {
    code: 'MA',
    nameAr: 'المغرب',
    nameEn: 'Morocco',
    phoneCode: '+212',
    flag: '🇲🇦',
    phoneFormat: '6XXXXXXXX'
  },
  {
    code: 'DZ',
    nameAr: 'الجزائر',
    nameEn: 'Algeria',
    phoneCode: '+213',
    flag: '🇩🇿',
    phoneFormat: '5XXXXXXXX'
  },
  {
    code: 'TN',
    nameAr: 'تونس',
    nameEn: 'Tunisia',
    phoneCode: '+216',
    flag: '🇹🇳',
    phoneFormat: 'XXXXXXXX'
  },
  {
    code: 'LY',
    nameAr: 'ليبيا',
    nameEn: 'Libya',
    phoneCode: '+218',
    flag: '🇱🇾',
    phoneFormat: '9XXXXXXXX'
  },
  {
    code: 'SD',
    nameAr: 'السودان',
    nameEn: 'Sudan',
    phoneCode: '+249',
    flag: '🇸🇩',
    phoneFormat: '9XXXXXXXX'
  },
  {
    code: 'SO',
    nameAr: 'الصومال',
    nameEn: 'Somalia',
    phoneCode: '+252',
    flag: '🇸🇴',
    phoneFormat: 'XXXXXXXXX'
  },
  {
    code: 'DJ',
    nameAr: 'جيبوتي',
    nameEn: 'Djibouti',
    phoneCode: '+253',
    flag: '🇩🇯',
    phoneFormat: 'XXXXXXXX'
  },
  {
    code: 'KM',
    nameAr: 'جزر القمر',
    nameEn: 'Comoros',
    phoneCode: '+269',
    flag: '🇰🇲',
    phoneFormat: 'XXXXXXX'
  },
  {
    code: 'MR',
    nameAr: 'موريتانيا',
    nameEn: 'Mauritania',
    phoneCode: '+222',
    flag: '🇲🇷',
    phoneFormat: 'XXXXXXXX'
  }
];

// الحصول على اسم الدولة حسب اللغة
export const getCountryName = (country: CountryEnglish, language: string): string => {
  return language === 'ar' ? country.nameAr : country.nameEn;
};

// الحصول على قائمة الدول مع الأسماء حسب اللغة
export const getCountriesForLanguage = (language: string) => {
  return countriesEnglish.map(country => ({
    ...country,
    displayName: getCountryName(country, language)
  }));
};
