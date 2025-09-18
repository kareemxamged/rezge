// اختبار إرسال إيميل
const fetch = require('node-fetch');

async function testEmail() {
  try {
    const emailData = {
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<h1>Test</h1>',
      text: 'Test',
      from: 'manage@kareemamged.com',
      fromName: 'Test'
    };

    console.log('📧 إرسال بيانات الاختبار:', JSON.stringify(emailData, null, 2));

    const response = await fetch('http://localhost:3001/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData)
    });

    const result = await response.json();
    console.log('📬 النتيجة:', result);

  } catch (error) {
    console.error('❌ خطأ:', error);
  }
}

testEmail();
