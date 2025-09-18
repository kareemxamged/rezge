/**
 * أدوات حماية الموقع من تداخل إضافات المتصفح
 * يحمي من أخطاء content scripts ومدراء كلمات المرور
 */

/**
 * حماية النماذج من تداخل إضافات مدراء كلمات المرور
 */
export const protectFormsFromExtensions = () => {
  // انتظار تحميل DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyFormProtection);
  } else {
    applyFormProtection();
  }
};

/**
 * تطبيق الحماية على النماذج
 */
const applyFormProtection = () => {
  try {
    // حماية جميع النماذج
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      // منع إضافات مدراء كلمات المرور من التعرف على النموذج
      form.setAttribute('data-form-type', 'other');
      form.setAttribute('autocomplete', 'off');
      
      // حماية حقول كلمات المرور
      const passwordInputs = form.querySelectorAll('input[type="password"]');
      passwordInputs.forEach(input => {
        // خصائص منع مدراء كلمات المرور
        input.setAttribute('data-lpignore', 'true');        // LastPass
        input.setAttribute('data-1p-ignore', 'true');       // 1Password
        input.setAttribute('data-bwignore', 'true');        // Bitwarden
        input.setAttribute('data-dashlane-ignore', 'true'); // Dashlane
        input.setAttribute('data-lastpass-ignore', 'true'); // LastPass إضافي
        input.setAttribute('data-bitwarden-ignore', 'true'); // Bitwarden إضافي
        
        // خصائص HTML إضافية
        input.setAttribute('autocomplete', 'new-password');
        input.setAttribute('autocorrect', 'off');
        input.setAttribute('autocapitalize', 'off');
        input.setAttribute('spellcheck', 'false');
      });
      
      // حماية حقول البريد الإلكتروني
      const emailInputs = form.querySelectorAll('input[type="email"]');
      emailInputs.forEach(input => {
        input.setAttribute('data-lpignore', 'true');
        input.setAttribute('data-1p-ignore', 'true');
        input.setAttribute('data-bwignore', 'true');
        input.setAttribute('autocomplete', 'off');
      });
    });
    
    console.log('✅ تم تطبيق حماية النماذج من إضافات المتصفح');
  } catch (error) {
    console.warn('⚠️ خطأ في تطبيق حماية النماذج:', error);
  }
};

/**
 * مراقب للعناصر الجديدة المضافة ديناميكياً
 */
export const setupDynamicFormProtection = () => {
  try {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // إذا كان العنصر المضاف نموذج أو يحتوي على نماذج
              if (element.tagName === 'FORM' || element.querySelector('form')) {
                setTimeout(() => applyFormProtection(), 100);
              }
            }
          });
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    console.log('✅ تم تفعيل مراقب الحماية الديناميكي');
  } catch (error) {
    console.warn('⚠️ خطأ في تفعيل مراقب الحماية:', error);
  }
};

/**
 * حماية عامة من أخطاء الإضافات
 */
export const setupExtensionErrorProtection = () => {
  // قائمة بأسماء ملفات الإضافات الشائعة
  const extensionFiles = [
    'content_script',
    'contentscript',
    'background',
    'inject',
    'extension',
    'chrome-extension',
    'moz-extension',
    'lastpass',
    '1password',
    'bitwarden',
    'dashlane'
  ];

  // قائمة برسائل أخطاء الإضافات الشائعة
  const extensionErrorMessages = [
    'FrameDoesNotExistError',
    'Frame does not exist',
    'runtime.lastError',
    'Could not establish connection',
    'Receiving end does not exist',
    'message port closed',
    'back/forward cache',
    'Extension context invalidated',
    'message channel is closed'
  ];
  
  // معالج الأخطاء العام
  const errorHandler = (event: ErrorEvent) => {
    const errorMessage = event.message || '';
    const filename = event.filename || '';

    // فحص اسم الملف
    const isExtensionFile = extensionFiles.some(file =>
      filename.toLowerCase().includes(file)
    );

    // فحص رسالة الخطأ
    const isExtensionMessage = extensionErrorMessages.some(msg =>
      errorMessage.toLowerCase().includes(msg.toLowerCase())
    );

    if (isExtensionFile || isExtensionMessage) {
      console.warn('🔧 تم تجاهل خطأ من إضافة متصفح:', {
        message: errorMessage,
        filename: filename,
        lineno: event.lineno,
        type: isExtensionFile ? 'extension-file' : 'extension-message'
      });
      event.preventDefault();
      return true;
    }
    return false;
  };
  
  // معالج Promise rejections
  const rejectionHandler = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    let reasonText = '';

    if (reason) {
      if (typeof reason === 'string') {
        reasonText = reason;
      } else if (reason.message) {
        reasonText = reason.message;
      } else if (reason.stack) {
        reasonText = reason.stack;
      } else {
        reasonText = String(reason);
      }
    }

    // فحص اسم الملف في stack trace
    const isExtensionFile = extensionFiles.some(file =>
      reasonText.toLowerCase().includes(file)
    );

    // فحص رسالة الخطأ
    const isExtensionMessage = extensionErrorMessages.some(msg =>
      reasonText.toLowerCase().includes(msg.toLowerCase())
    );

    if (isExtensionFile || isExtensionMessage) {
      console.warn('🔧 تم تجاهل Promise rejection من إضافة متصفح:', {
        reason: reason,
        type: isExtensionFile ? 'extension-file' : 'extension-message'
      });
      event.preventDefault();
      return true;
    }
    return false;
  };
  
  // معالج خاص لأخطاء runtime.lastError
  const setupRuntimeErrorSuppression = () => {
    // تجاهل أخطاء runtime.lastError في وحدة التحكم
    const originalConsoleError = console.error;
    console.error = function(...args) {
      const message = args.join(' ');

      // فحص رسائل runtime.lastError
      const isRuntimeError = extensionErrorMessages.some(msg =>
        message.toLowerCase().includes(msg.toLowerCase())
      );

      if (isRuntimeError) {
        console.warn('🔧 تم تجاهل runtime.lastError من إضافة متصفح:', message);
        return;
      }

      // استدعاء console.error الأصلي للأخطاء الأخرى
      originalConsoleError.apply(console, args);
    };
  };

  // تسجيل معالجات الأخطاء
  window.addEventListener('error', errorHandler, true);
  window.addEventListener('unhandledrejection', rejectionHandler);
  setupRuntimeErrorSuppression();

  console.log('✅ تم تفعيل حماية الأخطاء من إضافات المتصفح');
};

/**
 * تفعيل جميع أنواع الحماية
 */
export const initializeExtensionProtection = () => {
  try {
    setupExtensionErrorProtection();
    protectFormsFromExtensions();
    setupDynamicFormProtection();
    
    console.log('🛡️ تم تفعيل جميع أنواع الحماية من إضافات المتصفح');
  } catch (error) {
    console.error('❌ خطأ في تفعيل حماية الإضافات:', error);
  }
};

/**
 * فحص وجود إضافات مشتبه بها
 */
export const detectSuspiciousExtensions = () => {
  const suspiciousSelectors = [
    '[data-lastpass-icon-root]',
    '[data-1p-root]',
    '[data-bw-root]',
    '.lastpass-icon',
    '.onepassword-icon',
    '.bitwarden-icon'
  ];
  
  const detectedExtensions: string[] = [];
  
  suspiciousSelectors.forEach(selector => {
    if (document.querySelector(selector)) {
      detectedExtensions.push(selector);
    }
  });
  
  if (detectedExtensions.length > 0) {
    console.info('🔍 تم اكتشاف إضافات مدراء كلمات المرور:', detectedExtensions);
  }
  
  return detectedExtensions;
};
