// ملف اختبار لمكون CountryFlag
import React from 'react';
import SimpleCountryFlag from './src/components/SimpleCountryFlag';
import { countriesEnglish } from './src/data/countriesEnglish';

const TestFlagComponent = () => {
  const testNationalities = [
    'المملكة العربية السعودية',
    'الإمارات العربية المتحدة', 
    'مصر',
    'الأردن',
    'الكويت',
    'قطر'
  ];

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>اختبار مكون أعلام الدول</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' }}>
        {testNationalities.map((nationality, index) => (
          <div key={index} style={{ 
            border: '1px solid #ddd', 
            borderRadius: '10px', 
            padding: '20px', 
            textAlign: 'center',
            position: 'relative'
          }}>
            <h3>{nationality}</h3>
            
            {/* محاكاة الصورة الشخصية */}
            <div style={{
              position: 'relative',
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #4299e1 0%, #10b981 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '20px auto',
              fontSize: '2rem',
              color: 'white'
            }}>
              👤
              {/* مكون العلم */}
              <SimpleCountryFlag
                nationality={nationality}
                size="md"
                position="top-right"
                showTooltip={true}
              />

              {/* اختبار مباشر للعلم */}
              <div style={{
                position: 'absolute',
                bottom: '-10px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'white',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '0.8rem',
                border: '1px solid #ddd'
              }}>
                {countriesEnglish.find(c => c.nameAr === nationality)?.flag || '❓'}
              </div>
            </div>
            
            <p style={{ fontSize: '0.9em', color: '#666' }}>
              العلم يجب أن يظهر أعلى يمين الصورة
            </p>
          </div>
        ))}
      </div>

      <div style={{ 
        marginTop: '40px', 
        padding: '20px', 
        background: '#f8f9fa', 
        borderRadius: '10px',
        border: '1px solid #dee2e6'
      }}>
        <h2>ملاحظات:</h2>
        <ul>
          <li>✅ العلم يجب أن يظهر كـ emoji (🇸🇦، 🇦🇪، 🇪🇬، إلخ)</li>
          <li>✅ العلم في دائرة بيضاء أعلى يمين الصورة</li>
          <li>✅ عند hover على العلم، يظهر tooltip باسم الدولة</li>
          <li>✅ العلم يتحرك قليلاً عند hover</li>
          <li>⚠️ إذا لم يظهر العلم، تحقق من دعم المتصفح لـ emoji</li>
        </ul>
      </div>

      <div style={{ 
        marginTop: '20px', 
        padding: '20px', 
        background: '#e8f5e8', 
        borderRadius: '10px',
        border: '1px solid #c3e6c3'
      }}>
        <h3>كيفية الاختبار في التطبيق:</h3>
        <ol>
          <li>افتح صفحة البروفايل العامة لمستخدم له جنسية</li>
          <li>ابحث عن الصورة الشخصية (الدائرة الملونة مع أيقونة المستخدم)</li>
          <li>يجب أن ترى علم الدولة في دائرة بيضاء أعلى يمين الصورة</li>
          <li>مرر الماوس على العلم لرؤية اسم الدولة</li>
        </ol>
      </div>
    </div>
  );
};

export default TestFlagComponent;
