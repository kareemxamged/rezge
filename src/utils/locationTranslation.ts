import { countriesEnglish } from '../data/countriesEnglish';

// قائمة المدن السعودية الرئيسية مع ترجماتها
export interface CityTranslation {
  nameAr: string;
  nameEn: string;
}

export const saudiCities: CityTranslation[] = [
  { nameAr: 'الرياض', nameEn: 'Riyadh' },
  { nameAr: 'جدة', nameEn: 'Jeddah' },
  { nameAr: 'مكة المكرمة', nameEn: 'Mecca' },
  { nameAr: 'المدينة المنورة', nameEn: 'Medina' },
  { nameAr: 'الدمام', nameEn: 'Dammam' },
  { nameAr: 'الخبر', nameEn: 'Khobar' },
  { nameAr: 'الظهران', nameEn: 'Dhahran' },
  { nameAr: 'الطائف', nameEn: 'Taif' },
  { nameAr: 'بريدة', nameEn: 'Buraidah' },
  { nameAr: 'تبوك', nameEn: 'Tabuk' },
  { nameAr: 'خميس مشيط', nameEn: 'Khamis Mushait' },
  { nameAr: 'الهفوف', nameEn: 'Hofuf' },
  { nameAr: 'المبرز', nameEn: 'Mubarraz' },
  { nameAr: 'حائل', nameEn: 'Hail' },
  { nameAr: 'نجران', nameEn: 'Najran' },
  { nameAr: 'الجبيل', nameEn: 'Jubail' },
  { nameAr: 'ينبع', nameEn: 'Yanbu' },
  { nameAr: 'أبها', nameEn: 'Abha' },
  { nameAr: 'عرعر', nameEn: 'Arar' },
  { nameAr: 'سكاكا', nameEn: 'Sakaka' },
  { nameAr: 'جازان', nameEn: 'Jazan' },
  { nameAr: 'القطيف', nameEn: 'Qatif' },
  { nameAr: 'الباحة', nameEn: 'Baha' },
  { nameAr: 'القريات', nameEn: 'Qurayyat' },
  { nameAr: 'الرس', nameEn: 'Rass' }
];

// قائمة المدن المصرية الرئيسية
export const egyptianCities: CityTranslation[] = [
  { nameAr: 'القاهرة', nameEn: 'Cairo' },
  { nameAr: 'الإسكندرية', nameEn: 'Alexandria' },
  { nameAr: 'الجيزة', nameEn: 'Giza' },
  { nameAr: 'شبرا الخيمة', nameEn: 'Shubra El Kheima' },
  { nameAr: 'بورسعيد', nameEn: 'Port Said' },
  { nameAr: 'السويس', nameEn: 'Suez' },
  { nameAr: 'الأقصر', nameEn: 'Luxor' },
  { nameAr: 'المنصورة', nameEn: 'Mansoura' },
  { nameAr: 'طنطا', nameEn: 'Tanta' },
  { nameAr: 'أسيوط', nameEn: 'Asyut' },
  { nameAr: 'الإسماعيلية', nameEn: 'Ismailia' },
  { nameAr: 'الفيوم', nameEn: 'Faiyum' },
  { nameAr: 'الزقازيق', nameEn: 'Zagazig' },
  { nameAr: 'أسوان', nameEn: 'Aswan' },
  { nameAr: 'دمياط', nameEn: 'Damietta' },
  { nameAr: 'المنيا', nameEn: 'Minya' },
  { nameAr: 'بني سويف', nameEn: 'Beni Suef' },
  { nameAr: 'قنا', nameEn: 'Qena' },
  { nameAr: 'سوهاج', nameEn: 'Sohag' },
  { nameAr: 'الغردقة', nameEn: 'Hurghada' }
];

// قائمة المدن الإماراتية الرئيسية
export const uaeCities: CityTranslation[] = [
  { nameAr: 'دبي', nameEn: 'Dubai' },
  { nameAr: 'أبوظبي', nameEn: 'Abu Dhabi' },
  { nameAr: 'الشارقة', nameEn: 'Sharjah' },
  { nameAr: 'عجمان', nameEn: 'Ajman' },
  { nameAr: 'رأس الخيمة', nameEn: 'Ras Al Khaimah' },
  { nameAr: 'الفجيرة', nameEn: 'Fujairah' },
  { nameAr: 'أم القيوين', nameEn: 'Umm Al Quwain' },
  { nameAr: 'العين', nameEn: 'Al Ain' }
];

// قائمة المدن الأردنية الرئيسية
export const jordanianCities: CityTranslation[] = [
  { nameAr: 'عمان', nameEn: 'Amman' },
  { nameAr: 'إربد', nameEn: 'Irbid' },
  { nameAr: 'الزرقاء', nameEn: 'Zarqa' },
  { nameAr: 'الرصيفة', nameEn: 'Russeifa' },
  { nameAr: 'وادي السير', nameEn: 'Wadi Al-Seer' },
  { nameAr: 'العقبة', nameEn: 'Aqaba' },
  { nameAr: 'السلط', nameEn: 'Salt' },
  { nameAr: 'مادبا', nameEn: 'Madaba' },
  { nameAr: 'الكرك', nameEn: 'Karak' },
  { nameAr: 'معان', nameEn: 'Maan' }
];

// دمج جميع المدن
export const allCities: CityTranslation[] = [
  ...saudiCities,
  ...egyptianCities,
  ...uaeCities,
  ...jordanianCities
];

/**
 * ترجمة اسم الدولة من العربية للإنجليزية
 * @param arabicName الاسم العربي للدولة
 * @param language اللغة المطلوبة ('ar' أو 'en')
 * @returns الاسم المترجم أو الاسم الأصلي إذا لم توجد ترجمة
 */
export const translateCountryName = (arabicName: string, language: string): string => {
  if (language === 'ar' || !arabicName) {
    return arabicName;
  }

  // البحث عن الدولة في قائمة الدول
  const country = countriesEnglish.find(c => c.nameAr === arabicName);
  
  if (country) {
    return country.nameEn;
  }

  // إذا لم توجد ترجمة، إرجاع الاسم الأصلي
  return arabicName;
};

/**
 * ترجمة اسم المدينة من العربية للإنجليزية
 * @param arabicName الاسم العربي للمدينة
 * @param language اللغة المطلوبة ('ar' أو 'en')
 * @returns الاسم المترجم أو الاسم الأصلي إذا لم توجد ترجمة
 */
export const translateCityName = (arabicName: string, language: string): string => {
  if (language === 'ar' || !arabicName) {
    return arabicName;
  }

  // البحث عن المدينة في قائمة المدن
  const city = allCities.find(c => c.nameAr === arabicName);
  
  if (city) {
    return city.nameEn;
  }

  // إذا لم توجد ترجمة، إرجاع الاسم الأصلي
  return arabicName;
};

/**
 * ترجمة مكان الإقامة (قد يكون دولة أو مدينة)
 * @param location مكان الإقامة
 * @param language اللغة المطلوبة
 * @returns المكان المترجم
 */
export const translateLocation = (location: string, language: string): string => {
  if (language === 'ar' || !location) {
    return location;
  }

  // محاولة ترجمة كدولة أولاً
  const countryTranslation = translateCountryName(location, language);
  if (countryTranslation !== location) {
    return countryTranslation;
  }

  // إذا لم تكن دولة، محاولة ترجمة كمدينة
  const cityTranslation = translateCityName(location, language);
  return cityTranslation;
};

/**
 * الحصول على قائمة الدول مع الترجمات
 * @param language اللغة المطلوبة
 * @returns قائمة الدول مع الأسماء المترجمة
 */
export const getCountriesWithTranslations = (language: string) => {
  return countriesEnglish.map(country => ({
    ...country,
    displayName: language === 'ar' ? country.nameAr : country.nameEn
  }));
};

/**
 * الحصول على قائمة المدن مع الترجمات
 * @param language اللغة المطلوبة
 * @returns قائمة المدن مع الأسماء المترجمة
 */
export const getCitiesWithTranslations = (language: string) => {
  return allCities.map(city => ({
    ...city,
    displayName: language === 'ar' ? city.nameAr : city.nameEn
  }));
};
