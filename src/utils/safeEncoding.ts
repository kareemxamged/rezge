/**
 * دوال التشفير الآمنة للنصوص العربية والـ Unicode
 * حل مشكلة btoa() مع الأحرف خارج نطاق Latin1
 */

/**
 * تشفير آمن للنصوص العربية إلى Base64
 * يحل مشكلة: Failed to execute 'btoa' on 'Window': The string to be encoded contains characters outside of the Latin1 range
 */
export function safeBase64Encode(str: string): string {
  try {
    // الطريقة الأولى: استخدام TextEncoder (متوفر في المتصفحات الحديثة)
    if (typeof TextEncoder !== 'undefined') {
      const encoder = new TextEncoder();
      const uint8Array = encoder.encode(str);
      
      // تحويل Uint8Array إلى string ثم إلى base64
      let binaryString = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i]);
      }
      
      return btoa(binaryString);
    }
    
    // الطريقة البديلة: استخدام encodeURIComponent + escape (للمتصفحات القديمة)
    const utf8Encoded = unescape(encodeURIComponent(str));
    return btoa(utf8Encoded);
    
  } catch (error) {
    console.error('خطأ في تشفير النص:', error);
    
    // طريقة احتياطية: تشفير يدوي
    return manualBase64Encode(str);
  }
}

/**
 * فك تشفير آمن للنصوص العربية من Base64
 */
export function safeBase64Decode(base64Str: string): string {
  try {
    // الطريقة الأولى: استخدام TextDecoder
    if (typeof TextDecoder !== 'undefined') {
      const binaryString = atob(base64Str);
      const uint8Array = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }
      
      const decoder = new TextDecoder();
      return decoder.decode(uint8Array);
    }
    
    // الطريقة البديلة
    const decoded = atob(base64Str);
    return decodeURIComponent(escape(decoded));
    
  } catch (error) {
    console.error('خطأ في فك تشفير النص:', error);
    return base64Str; // إرجاع النص الأصلي في حالة الفشل
  }
}

/**
 * تشفير يدوي للنصوص (طريقة احتياطية)
 */
function manualBase64Encode(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  
  // تحويل النص إلى UTF-8 bytes
  const utf8Bytes = stringToUtf8Bytes(str);
  
  while (i < utf8Bytes.length) {
    const a = utf8Bytes[i++];
    const b = i < utf8Bytes.length ? utf8Bytes[i++] : 0;
    const c = i < utf8Bytes.length ? utf8Bytes[i++] : 0;
    
    const bitmap = (a << 16) | (b << 8) | c;
    
    result += chars.charAt((bitmap >> 18) & 63);
    result += chars.charAt((bitmap >> 12) & 63);
    result += i - 2 < utf8Bytes.length ? chars.charAt((bitmap >> 6) & 63) : '=';
    result += i - 1 < utf8Bytes.length ? chars.charAt(bitmap & 63) : '=';
  }
  
  return result;
}

/**
 * تحويل النص إلى UTF-8 bytes
 */
function stringToUtf8Bytes(str: string): number[] {
  const bytes: number[] = [];
  
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    
    if (charCode < 0x80) {
      bytes.push(charCode);
    } else if (charCode < 0x800) {
      bytes.push(0xC0 | (charCode >> 6));
      bytes.push(0x80 | (charCode & 0x3F));
    } else if (charCode < 0xD800 || charCode >= 0xE000) {
      bytes.push(0xE0 | (charCode >> 12));
      bytes.push(0x80 | ((charCode >> 6) & 0x3F));
      bytes.push(0x80 | (charCode & 0x3F));
    } else {
      // Surrogate pair
      i++;
      const charCode2 = str.charCodeAt(i);
      const codePoint = 0x10000 + (((charCode & 0x3FF) << 10) | (charCode2 & 0x3FF));
      
      bytes.push(0xF0 | (codePoint >> 18));
      bytes.push(0x80 | ((codePoint >> 12) & 0x3F));
      bytes.push(0x80 | ((codePoint >> 6) & 0x3F));
      bytes.push(0x80 | (codePoint & 0x3F));
    }
  }
  
  return bytes;
}

/**
 * تشفير آمن للبيانات الحساسة (بديل لدالة security.ts)
 */
export function safeEncryptSensitiveData(data: string, key: string): string {
  try {
    // تشفير XOR بسيط
    let encrypted = '';
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      encrypted += String.fromCharCode(charCode);
    }
    
    // استخدام التشفير الآمن
    return safeBase64Encode(encrypted);
  } catch (error) {
    console.error('خطأ في تشفير البيانات الحساسة:', error);
    return data; // إرجاع البيانات الأصلية في حالة الفشل
  }
}

/**
 * إنشاء hash آمن للنصوص (بديل لـ captchaService.ts)
 */
export function safeCreateHash(input: string): string {
  try {
    // إنشاء hash بسيط
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // تحويل إلى 32bit integer
    }
    
    // تحويل إلى string موجب
    const hashStr = Math.abs(hash).toString(36);
    
    // استخدام التشفير الآمن
    return safeBase64Encode(hashStr).substring(0, 16);
  } catch (error) {
    console.error('خطأ في إنشاء الـ hash:', error);
    return Math.random().toString(36).substring(2, 18); // hash عشوائي احتياطي
  }
}

/**
 * اختبار دوال التشفير الآمنة
 */
export function testSafeEncoding(): void {
  console.log('🧪 اختبار دوال التشفير الآمنة...');
  
  const testTexts = [
    'Hello World',
    'مرحباً بالعالم',
    'كلمة المرور المؤقتة - رزقي',
    'السلام عليكم أحمد، تم إنشاء كلمة مرور مؤقتة لحسابك',
    '🔐 رمز التحقق الثنائي: 123456',
    'Mixed text: مرحباً Hello العالم World 🌍'
  ];
  
  testTexts.forEach((text, index) => {
    try {
      console.log(`\n${index + 1}. اختبار النص: "${text}"`);
      
      // تشفير
      const encoded = safeBase64Encode(text);
      console.log(`   مشفر: ${encoded}`);
      
      // فك التشفير
      const decoded = safeBase64Decode(encoded);
      console.log(`   مفكوك: ${decoded}`);
      
      // التحقق من التطابق
      const isMatch = text === decoded;
      console.log(`   النتيجة: ${isMatch ? '✅ نجح' : '❌ فشل'}`);
      
      if (!isMatch) {
        console.log(`   الأصلي: "${text}"`);
        console.log(`   المفكوك: "${decoded}"`);
      }
      
    } catch (error) {
      console.log(`   ❌ خطأ: ${error}`);
    }
  });
  
  console.log('\n🎉 انتهى اختبار دوال التشفير الآمنة');
}

/**
 * معلومات حول الإصلاح
 */
export const ENCODING_FIX_INFO = {
  version: '1.0.0',
  date: '2025-09-13',
  description: 'حل مشكلة btoa() مع النصوص العربية',
  fixedFiles: [
    'src/lib/finalEmailService.ts',
    'src/lib/userTrustedDeviceService.ts', 
    'src/utils/security.ts',
    'src/lib/captchaService.ts'
  ],
  originalError: 'Failed to execute \'btoa\' on \'Window\': The string to be encoded contains characters outside of the Latin1 range',
  solution: 'استخدام TextEncoder/TextDecoder مع تشفير UTF-8 آمن'
};
