/**
 * دوال مساعدة لتحويل مدة الحظر إلى نصوص عربية
 */

/**
 * تحويل مدة الحظر من القيمة الخام إلى النص العربي
 * @param duration - مدة الحظر بالقيمة الخام (مثل "2_hours", "1_day")
 * @returns النص العربي المقابل للمدة
 */
export function getBanDurationText(duration: string): string {
  switch (duration) {
    case '2_hours':
      return 'ساعتين';
    case '1_day':
      return 'يوم واحد';
    case '3_days':
      return 'ثلاثة أيام';
    case '1_week':
      return 'أسبوع واحد';
    case '1_month':
      return 'شهر واحد';
    case '3_months':
      return 'ثلاثة أشهر';
    case '6_months':
      return 'ستة أشهر';
    case '1_year':
      return 'سنة واحدة';
    default:
      return 'ساعتين';
  }
}

/**
 * تحويل مدة الحظر إلى ميلي ثانية
 * @param duration - مدة الحظر بالقيمة الخام
 * @returns عدد الميلي ثواني المقابل للمدة
 */
export function getBanDurationInMs(duration: string): number {
  switch (duration) {
    case '2_hours':
      return 2 * 60 * 60 * 1000;
    case '1_day':
      return 24 * 60 * 60 * 1000;
    case '3_days':
      return 3 * 24 * 60 * 60 * 1000;
    case '1_week':
      return 7 * 24 * 60 * 60 * 1000;
    case '1_month':
      return 30 * 24 * 60 * 60 * 1000;
    case '3_months':
      return 90 * 24 * 60 * 60 * 1000;
    case '6_months':
      return 180 * 24 * 60 * 60 * 1000;
    case '1_year':
      return 365 * 24 * 60 * 60 * 1000;
    default:
      return 2 * 60 * 60 * 1000; // افتراضي: ساعتين
  }
}

/**
 * قائمة خيارات مدة الحظر المؤقت
 */
export const banDurationOptions = [
  { value: '2_hours', label: 'ساعتين' },
  { value: '1_day', label: 'يوم واحد' },
  { value: '3_days', label: 'ثلاثة أيام' },
  { value: '1_week', label: 'أسبوع واحد' },
  { value: '1_month', label: 'شهر واحد' },
  { value: '3_months', label: 'ثلاثة أشهر' },
  { value: '6_months', label: 'ستة أشهر' },
  { value: '1_year', label: 'سنة واحدة' }
];

/**
 * تحويل نوع الحظر إلى نص عربي
 * @param banType - نوع الحظر ('permanent' أو 'temporary')
 * @param duration - مدة الحظر (اختياري للحظر المؤقت)
 * @returns النص العربي لنوع الحظر
 */
export function getBanTypeText(banType: 'permanent' | 'temporary', duration?: string): string {
  if (banType === 'permanent') {
    return 'دائم';
  } else if (banType === 'temporary' && duration) {
    return `مؤقت (${getBanDurationText(duration)})`;
  } else {
    return 'مؤقت';
  }
}
