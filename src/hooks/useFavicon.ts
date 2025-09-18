import { useEffect } from 'react';

export const useFavicon = (faviconPath: string) => {
  useEffect(() => {
    // إزالة جميع favicon links الموجودة
    const existingFavicons = document.querySelectorAll("link[rel*='icon']");
    existingFavicons.forEach(favicon => favicon.remove());

    // إنشاء favicon links جديدة حسب النوع
    const isAdminPath = faviconPath.includes('admin');

    if (isAdminPath) {
      // إضافة favicon للإدارة
      const sizes = ['16', '32', '96'];
      sizes.forEach(size => {
        const link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/png';
        link.sizes = `${size}x${size}`;
        link.href = `/admin-${size}.png`;
        document.head.appendChild(link);
      });
    } else {
      // إضافة favicon للموقع العام
      const sizes = ['16', '32', '96'];
      sizes.forEach(size => {
        const link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/png';
        link.sizes = `${size}x${size}`;
        link.href = `/main-${size}.png`;
        document.head.appendChild(link);
      });

      // إضافة favicon الرئيسي
      const mainLink = document.createElement('link');
      mainLink.rel = 'icon';
      mainLink.type = 'image/png';
      mainLink.href = '/main.png';
      document.head.appendChild(mainLink);
    }

    // تنظيف عند إلغاء التحميل
    return () => {
      // لا نحتاج لتنظيف خاص لأن المكون سيعيد إنشاء favicon عند التغيير
    };
  }, [faviconPath]);
};

// دالة مساعدة لتحديد favicon حسب المسار
export const getFaviconForPath = (pathname: string): string => {
  if (pathname.startsWith('/admin')) {
    return '/admin-32.png';
  }
  return '/main-32.png';
};
