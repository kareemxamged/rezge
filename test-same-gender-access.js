// اختبار سريع للوصول للملفات الشخصية من نفس الجنس
// يمكن تشغيله في الكونسول

// مستخدم ذكر يحاول الوصول لملف ذكر آخر
const testSameGenderAccess = async () => {
  console.log('🧪 اختبار الوصول للملفات الشخصية من نفس الجنس');
  
  // معرفات المستخدمين الذكور
  const maleUser1 = 'f7d18de3-9102-4c40-a01a-a34f863ce319'; // Ashraf Hamdy
  const maleUser2 = '27630074-bb7d-4c84-9922-45b21e699a8c'; // asdjds djjjjjjjj
  
  console.log(`👤 المستخدم الحالي: ${maleUser1}`);
  console.log(`🎯 الملف المطلوب: ${maleUser2}`);
  
  try {
    // استدعاء getPublicUserProfile
    const result = await userService.getPublicUserProfile(maleUser2, maleUser1);
    
    console.log('📊 نتيجة الاختبار:');
    console.log('- البيانات:', !!result.data);
    console.log('- الخطأ:', result.error);
    
    if (result.data) {
      console.log('✅ نجح الوصول للملف الشخصي');
      console.log('- الاسم:', result.data.first_name, result.data.last_name);
      console.log('- الجنس:', result.data.gender);
    } else {
      console.log('❌ فشل الوصول للملف الشخصي');
      console.log('- سبب الفشل:', result.error?.message || 'غير معروف');
    }
    
  } catch (error) {
    console.error('💥 خطأ في الاختبار:', error);
  }
};

// تشغيل الاختبار
// testSameGenderAccess();

console.log('📝 لتشغيل الاختبار، اكتب: testSameGenderAccess()');
