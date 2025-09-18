import React from 'react';
import { useTranslation } from 'react-i18next';

interface ArticleContentProps {
  content: string;
  className?: string;
}

const ArticleContent: React.FC<ArticleContentProps> = ({ content, className = '' }) => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  // دالة نسخ رابط العنوان
  const copyHeadingLink = (headingId: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${headingId}`;
    navigator.clipboard.writeText(url).then(() => {
      // يمكن إضافة toast notification هنا
      console.log('تم نسخ الرابط:', url);
    });
  };

  // تحويل المحتوى من Markdown إلى HTML مع تحسينات
  const processContent = (rawContent: string): string => {
    let processedContent = rawContent;

    // إصلاح المحتوى غير المضبوط - تحويل \n النصية إلى أسطر جديدة فعلية
    processedContent = processedContent
      .replace(/\\n/g, '\n')  // تحويل \n النصية إلى أسطر جديدة فعلية
      .replace(/\n{3,}/g, '\n\n')  // تقليل الأسطر الفارغة المتعددة إلى سطرين فقط
      .trim(); // إزالة المسافات الزائدة من البداية والنهاية

    // تحويل العناوين مع إضافة IDs للتنقل
    processedContent = processedContent
      .replace(/^# (.*$)/gm, (_, title) => {
        const id = title.toLowerCase().replace(/[^\w\s\u0600-\u06FF]/g, '').replace(/\s+/g, '-');
        return `<h1 id="${id}" class="article-h1">${title}</h1>`;
      })
      .replace(/^## (.*$)/gm, (_, title) => {
        const id = title.toLowerCase().replace(/[^\w\s\u0600-\u06FF]/g, '').replace(/\s+/g, '-');
        return `<h2 id="${id}" class="article-h2">${title}</h2>`;
      })
      .replace(/^### (.*$)/gm, (_, title) => {
        const id = title.toLowerCase().replace(/[^\w\s\u0600-\u06FF]/g, '').replace(/\s+/g, '-');
        return `<h3 id="${id}" class="article-h3">${title}</h3>`;
      })
      .replace(/^#### (.*$)/gm, (_, title) => {
        const id = title.toLowerCase().replace(/[^\w\s\u0600-\u06FF]/g, '').replace(/\s+/g, '-');
        return `<h4 id="${id}" class="article-h4">${title}</h4>`;
      });

    // تحويل القوائم مع دعم أنماط مختلفة
    processedContent = processedContent
      // قوائم مع نص عريض ونقطتين
      .replace(/^[\-\*] \*\*(.*?)\*\*: (.*$)/gm, '<li class="article-list-item"><strong class="article-strong">$1</strong>: $2</li>')
      // قوائم مرقمة
      .replace(/^\d+\. (.*$)/gm, '<li class="article-list-item article-numbered">$1</li>')
      // قوائم عادية مع - أو *
      .replace(/^[\-\*] (.*$)/gm, '<li class="article-list-item">$1</li>');

    // تحويل النص المائل والعريض
    processedContent = processedContent
      .replace(/\*\*(.*?)\*\*/g, '<strong class="article-strong">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="article-em">$1</em>');

    // تحويل الاقتباسات والنصوص الدينية
    processedContent = processedContent
      // الأحاديث النبوية
      .replace(/"([^"]*صلى الله عليه وسلم[^"]*)"/g, '<blockquote class="article-hadith">"$1"</blockquote>')
      // الآيات القرآنية
      .replace(/"([^"]*وَ[^"]*|[^"]*إِنَّ[^"]*|[^"]*قُلْ[^"]*|[^"]*يَا[^"]*)"/g, '<blockquote class="article-quran">"$1"</blockquote>')
      // الاقتباسات العادية
      .replace(/^> (.*$)/gm, '<blockquote class="article-blockquote">$1</blockquote>');

    // تحويل الروابط
    processedContent = processedContent
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="article-link" target="_blank" rel="noopener noreferrer">$1</a>');

    // تحويل الكود المضمن
    processedContent = processedContent
      .replace(/`([^`]+)`/g, '<code class="article-code">$1</code>');

    // تجميع عناصر القوائم في ul tags
    processedContent = processedContent
      .replace(/(<li class="article-list-item"[^>]*>.*?<\/li>)(\n<li class="article-list-item"[^>]*>.*?<\/li>)*/gs, (match) => {
        return `<ul class="article-list">${match}</ul>`;
      });

    // تحويل الفقرات
    processedContent = processedContent
      .split('\n\n')
      .map(paragraph => {
        paragraph = paragraph.trim();
        if (!paragraph) return '';

        // تجاهل العناصر التي تم تحويلها بالفعل
        if (paragraph.startsWith('<h') ||
            paragraph.startsWith('<li') ||
            paragraph.startsWith('<blockquote') ||
            paragraph.startsWith('<ul') ||
            paragraph.startsWith('<ol') ||
            paragraph.startsWith('<div')) {
          return paragraph;
        }

        // إضافة فقرة فقط إذا لم تكن فارغة أو تحتوي على مسافات فقط
        if (paragraph.replace(/\s/g, '').length > 0) {
          return `<p class="article-paragraph">${paragraph}</p>`;
        }

        return '';
      })
      .filter(p => p.length > 0)  // إزالة الفقرات الفارغة
      .join('\n');

    // تجميع عناصر القائمة
    processedContent = processedContent
      .replace(/(<li class="article-list-item">.*?<\/li>\s*)+/gs, (match) => {
        return `<ul class="article-list">${match}</ul>`;
      });

    return processedContent;
  };

  const processedContent = processContent(content);

  // إضافة event listeners للعناوين بعد التحميل
  React.useEffect(() => {
    const headings = document.querySelectorAll('h1[id], h2[id], h3[id], h4[id]');

    const handleHeadingClick = (event: Event) => {
      const target = event.target as HTMLElement;
      if (target.tagName.match(/^H[1-4]$/)) {
        const id = target.getAttribute('id');
        if (id) {
          copyHeadingLink(id);
        }
      }
    };

    headings.forEach(heading => {
      heading.addEventListener('click', handleHeadingClick);
      (heading as HTMLElement).style.cursor = 'pointer';
    });

    return () => {
      headings.forEach(heading => {
        heading.removeEventListener('click', handleHeadingClick);
      });
    };
  }, [processedContent]);

  return (
    <div className={`article-content-wrapper ${className}`}>
      <style>{`
        .article-content-wrapper {
          font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.9;
          color: #2d3748;
          max-width: 100%;
          overflow-wrap: break-word;
          word-wrap: break-word;
          background: linear-gradient(135deg, #fafafa 0%, #ffffff 100%);
          padding: 2rem;
          border-radius: 24px;
          box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.08);
          position: relative;
        }

        .article-content-wrapper::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 6px;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%);
          border-radius: 24px 24px 0 0;
        }

        .article-content-wrapper :global(.article-h1) {
          font-size: 3rem;
          font-weight: 900;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 4rem 0 3rem 0;
          line-height: 1.1;
          scroll-margin-top: 100px;
          position: relative;
          text-align: center;
          padding: 2rem 0;
        }

        .article-content-wrapper :global(.article-h1)::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 120px;
          height: 4px;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          border-radius: 2px;
        }

        .article-content-wrapper :global(.article-h1)::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 80px;
          height: 2px;
          background: linear-gradient(90deg, #764ba2 0%, #667eea 100%);
          border-radius: 1px;
        }

        .article-content-wrapper :global(.article-h1):hover::after {
          content: '🔗';
          position: absolute;
          right: -2rem;
          opacity: 0.5;
          font-size: 1.5rem;
          cursor: pointer;
        }

        .article-content-wrapper :global(.article-h2) {
          font-size: 2.25rem;
          font-weight: 800;
          color: #1a202c;
          margin: 4rem 0 2rem 0;
          line-height: 1.2;
          position: relative;
          scroll-margin-top: 100px;
          padding: 2rem 0 1rem 4rem;
          transition: all 0.4s ease;
        }

        .article-content-wrapper :global(.article-h2)::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          border-radius: 50%;
          box-shadow: 0 8px 32px rgba(79, 172, 254, 0.3);
        }

        .article-content-wrapper :global(.article-h2)::after {
          content: '';
          position: absolute;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
        }



        .article-content-wrapper :global(.article-h2):hover::after {
          content: '🔗';
          position: absolute;
          right: -2rem;
          opacity: 0.5;
          font-size: 1.25rem;
          cursor: pointer;
        }

        .article-content-wrapper :global(.article-h3) {
          font-size: 1.75rem;
          font-weight: 700;
          color: #2d3748;
          margin: 3rem 0 1.5rem 0;
          line-height: 1.3;
          scroll-margin-top: 100px;
          position: relative;
          padding: 1rem 0 0.5rem 3rem;
          transition: all 0.3s ease;
        }

        .article-content-wrapper :global(.article-h3)::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 0;
          height: 0;
          border-left: 20px solid #f093fb;
          border-top: 12px solid transparent;
          border-bottom: 12px solid transparent;
          filter: drop-shadow(2px 2px 4px rgba(240, 147, 251, 0.3));
        }

        .article-content-wrapper :global(.article-h3)::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: 0;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, #f093fb 0%, transparent 100%);
          border-radius: 1px;
        }

        .article-content-wrapper :global(.article-h3):hover::after {
          content: '🔗';
          position: absolute;
          right: -1.5rem;
          opacity: 0.5;
          font-size: 1rem;
          cursor: pointer;
        }

        .article-content-wrapper :global(.article-h4) {
          font-size: 1.25rem;
          font-weight: 600;
          color: #4b5563;
          margin: 1.25rem 0 0.5rem 0;
          line-height: 1.4;
          scroll-margin-top: 100px;
          position: relative;
        }

        .article-content-wrapper :global(.article-h4):hover::after {
          content: '🔗';
          position: absolute;
          right: -1.5rem;
          opacity: 0.5;
          font-size: 0.875rem;
          cursor: pointer;
        }

        .article-content-wrapper :global(.article-paragraph) {
          margin: 2rem 0;
          line-height: 1.8;
          font-size: 1.15rem;
          text-align: justify;
          color: #374151;
          font-weight: 400;
          letter-spacing: 0.01em;
          padding: 0;
          text-indent: 0;
          background: transparent;
          border-radius: 0;
          border: none;
          box-shadow: none;
          transition: all 0.3s ease;
        }

        .article-content-wrapper :global(.article-paragraph):first-of-type {
          margin-top: 0;
        }

        .article-content-wrapper :global(.article-paragraph):last-of-type {
          margin-bottom: 0;
        }

        .article-content-wrapper :global(.article-paragraph):hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
          background: rgba(255, 255, 255, 0.9);
        }

        .article-content-wrapper :global(.article-paragraph):first-of-type {
          font-size: 1.4rem;
          font-weight: 500;
          color: #1a202c;
          margin-top: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 3rem 3rem 3rem 5rem;
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(102, 126, 234, 0.3);
          text-indent: 0;
          position: relative;
          overflow: hidden;
        }

        .article-content-wrapper :global(.article-paragraph):first-of-type::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
          animation: shimmer 3s ease-in-out infinite;
        }

        @keyframes shimmer {
          0%, 100% { transform: translateX(-100%) translateY(-100%) rotate(0deg); }
          50% { transform: translateX(0%) translateY(0%) rotate(180deg); }
        }

        .article-content-wrapper :global(.article-paragraph):first-of-type::first-letter {
          font-size: 5rem;
          font-weight: 900;
          float: right;
          line-height: 0.8;
          margin: 0.2rem 0 0.5rem 1.5rem;
          color: #ffffff;
          font-family: 'Georgia', serif;
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          padding: 1rem 1.25rem;
          border-radius: 20px;
          box-shadow: 0 15px 35px rgba(245, 87, 108, 0.4);
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          position: relative;
          z-index: 2;
        }

        .article-content-wrapper :global(.article-list) {
          margin: 2rem 0;
          padding: 0;
          list-style: none;
          counter-reset: list-counter;
        }

        .article-content-wrapper :global(.article-list-item) {
          margin: 1.5rem 0;
          padding: 1.8rem 2rem 1.8rem 4rem;
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border-radius: 16px;
          position: relative;
          line-height: 1.7;
          font-size: 1.1rem;
          color: #2d3748;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid rgba(102, 126, 234, 0.08);
          overflow: hidden;
        }

        .article-content-wrapper :global(.article-list-item.article-numbered) {
          counter-increment: list-counter;
        }

        .article-content-wrapper :global(.article-list-item.article-numbered)::after {
          content: counter(list-counter);
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-weight: bold;
          font-size: 0.9rem;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .article-content-wrapper :global(.article-list-item)::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 6px;
          background: linear-gradient(180deg, #4facfe 0%, #00f2fe 100%);
        }

        .article-content-wrapper :global(.article-list-item)::after {
          content: '●';
          color: #4facfe;
          font-weight: bold;
          position: absolute;
          left: 1.5rem;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1rem;
          width: 12px;
          height: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: translateY(-50%) scale(1); }
          50% { opacity: 0.7; transform: translateY(-50%) scale(1.2); }
        }

        .article-content-wrapper :global(.article-strong) {
          font-weight: 600;
          color: #1f2937;
          background: linear-gradient(120deg, #dbeafe 0%, #bfdbfe 100%);
          padding: 0.1rem 0.3rem;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .article-content-wrapper :global(.article-strong):hover {
          background: linear-gradient(120deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          transform: translateY(-1px);
        }

        .article-content-wrapper :global(.article-em) {
          font-style: italic;
          color: #059669;
          font-weight: 500;
        }

        .article-content-wrapper :global(.article-link) {
          color: #059669;
          text-decoration: none;
          font-weight: 500;
          border-bottom: 1px solid transparent;
          transition: all 0.2s ease;
        }

        .article-content-wrapper :global(.article-link):hover {
          color: #047857;
          border-bottom-color: #059669;
          background: linear-gradient(120deg, #ecfdf5 0%, #d1fae5 100%);
          padding: 0.125rem 0.25rem;
          border-radius: 4px;
        }

        /* تأثيرات التفاعل والحركة المحسنة */
        .article-content-wrapper :global(.article-list-item):hover {
          transform: translateX(-8px);
          box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.15), 0 4px 10px -3px rgba(0, 0, 0, 0.1);
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border-right-color: #0ea5e9;
        }

        .article-content-wrapper :global(.article-h2):hover {
          transform: translateX(-3px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
        }

        .article-content-wrapper :global(.article-h3):hover {
          transform: translateX(-2px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
        }

        .article-content-wrapper :global(.article-blockquote):hover {
          transform: translateX(-5px);
          box-shadow: 0 12px 35px -5px rgba(0, 0, 0, 0.2), 0 6px 15px -3px rgba(0, 0, 0, 0.15);
        }

        .article-content-wrapper :global(.article-code) {
          background: #f1f5f9;
          color: #475569;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.9em;
          border: 1px solid #e2e8f0;
        }

        .article-content-wrapper :global(.article-blockquote) {
          margin: 2.5rem 0;
          padding: 1.5rem 2rem;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border-radius: 12px;
          font-size: 1.1rem;
          font-style: italic;
          color: #475569;
          position: relative;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          font-weight: 500;
          line-height: 1.7;
          transition: all 0.3s ease;
          border-left: 4px solid #3b82f6;
          overflow: hidden;
        }

        .article-content-wrapper :global(.article-hadith) {
          margin: 2.5rem 0;
          padding: 2rem 2.5rem;
          background: linear-gradient(135deg, #fef7ed 0%, #fed7aa 100%);
          border-radius: 16px;
          font-size: 1.2rem;
          font-style: normal;
          color: #9a3412;
          position: relative;
          box-shadow: 0 6px 20px rgba(154, 52, 18, 0.1);
          font-weight: 500;
          line-height: 1.8;
          transition: all 0.3s ease;
          border-right: 6px solid #ea580c;
          text-align: center;
          font-family: 'Amiri', 'Times New Roman', serif;
        }

        .article-content-wrapper :global(.article-hadith)::before {
          content: '🕌';
          position: absolute;
          top: -10px;
          right: 20px;
          font-size: 2rem;
          opacity: 0.3;
        }

        .article-content-wrapper :global(.article-quran) {
          margin: 2.5rem 0;
          padding: 2rem 2.5rem;
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border-radius: 16px;
          font-size: 1.3rem;
          font-style: normal;
          color: #166534;
          position: relative;
          box-shadow: 0 6px 20px rgba(22, 101, 52, 0.1);
          font-weight: 600;
          line-height: 1.9;
          transition: all 0.3s ease;
          border-right: 6px solid #16a34a;
          text-align: center;
          font-family: 'Amiri', 'Times New Roman', serif;
        }

        .article-content-wrapper :global(.article-quran)::before {
          content: '📖';
          position: absolute;
          top: -10px;
          right: 20px;
          font-size: 2rem;
          opacity: 0.3;
        }

        .article-content-wrapper :global(.article-blockquote)::before {
          content: '"';
          position: absolute;
          top: -10px;
          left: 20px;
          font-size: 8rem;
          color: rgba(79, 172, 254, 0.3);
          font-family: Georgia, serif;
          line-height: 1;
        }

        .article-content-wrapper :global(.article-blockquote)::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 100px;
          height: 100%;
          background: linear-gradient(90deg, transparent 0%, rgba(79, 172, 254, 0.1) 100%);
        }

        /* تأثيرات التفاعل المحسنة */
        .article-content-wrapper :global(.article-list-item):hover {
          transform: translateX(-8px) translateY(-4px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
          background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
        }

        .article-content-wrapper :global(.article-h2):hover {
          transform: translateX(-5px);
          color: #4facfe;
        }

        .article-content-wrapper :global(.article-h3):hover {
          transform: translateX(-3px);
          color: #f093fb;
        }

        .article-content-wrapper :global(.article-blockquote):hover {
          transform: translateY(-8px);
          box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.35);
        }



        /* تحسينات للغة العربية */
        .article-content-wrapper[dir="rtl"] :global(.article-h2) {
          padding: 2rem 4rem 1rem 0;
        }

        .article-content-wrapper[dir="rtl"] :global(.article-h2)::before {
          left: auto;
          right: 0;
        }

        .article-content-wrapper[dir="rtl"] :global(.article-h2)::after {
          left: auto;
          right: 15px;
        }

        .article-content-wrapper[dir="rtl"] :global(.article-h3) {
          padding: 1rem 3rem 0.5rem 0;
        }

        .article-content-wrapper[dir="rtl"] :global(.article-h3)::before {
          left: auto;
          right: 0;
          border-left: none;
          border-right: 20px solid #f093fb;
        }

        .article-content-wrapper[dir="rtl"] :global(.article-list-item) {
          padding: 2rem 4rem 2rem 2rem;
        }

        .article-content-wrapper[dir="rtl"] :global(.article-list-item)::before {
          left: auto;
          right: 0;
        }

        .article-content-wrapper[dir="rtl"] :global(.article-list-item)::after {
          left: auto;
          right: 1.5rem;
        }

        .article-content-wrapper[dir="rtl"] :global(.article-paragraph):first-of-type::first-letter {
          float: left;
          margin: 0.2rem 1.5rem 0.5rem 0;
        }

        /* تحسينات الاستجابة للأجهزة المحمولة */
        @media (max-width: 768px) {
          .article-content-wrapper {
            padding: 1rem;
            border-radius: 16px;
          }

          .article-content-wrapper :global(.article-h1) {
            font-size: 2.25rem;
            margin: 2rem 0 1.5rem 0;
            padding: 1.5rem 0;
          }

          .article-content-wrapper :global(.article-h2) {
            font-size: 1.75rem;
            margin: 2.5rem 0 1.5rem 0;
            padding: 1.5rem 0 1rem 3rem;
          }

          .article-content-wrapper :global(.article-h2)::before {
            width: 40px;
            height: 40px;
          }

          .article-content-wrapper :global(.article-h2)::after {
            width: 16px;
            height: 16px;
            left: 12px;
          }

          .article-content-wrapper :global(.article-h3) {
            font-size: 1.5rem;
            margin: 2rem 0 1rem 0;
            padding: 0.75rem 0 0.5rem 2.5rem;
          }

          .article-content-wrapper :global(.article-h3)::before {
            border-left: 16px solid #f093fb;
            border-top: 10px solid transparent;
            border-bottom: 10px solid transparent;
          }

          .article-content-wrapper :global(.article-paragraph) {
            font-size: 1.1rem;
            margin: 2rem 0;
            padding: 1.25rem 1.5rem;
            border-radius: 12px;
          }

          .article-content-wrapper :global(.article-paragraph):first-of-type {
            font-size: 1.2rem;
            padding: 2rem 2rem 2rem 3.5rem;
            border-radius: 16px;
          }

          .article-content-wrapper :global(.article-paragraph):first-of-type::first-letter {
            font-size: 3.5rem;
            margin: 0.1rem 0 0.3rem 1rem;
            padding: 0.75rem 1rem;
            border-radius: 16px;
          }

          .article-content-wrapper :global(.article-list-item) {
            padding: 1.5rem 1.5rem 1.5rem 3rem;
            font-size: 1.05rem;
            margin: 1.5rem 0;
            border-radius: 12px;
          }

          .article-content-wrapper :global(.article-list-item)::after {
            left: 1.25rem;
          }

          .article-content-wrapper :global(.article-blockquote) {
            padding: 2rem 2.5rem;
            font-size: 1.2rem;
            margin: 3rem 0;
            border-radius: 16px;
          }

          .article-content-wrapper :global(.article-blockquote)::before {
            font-size: 6rem;
            top: -5px;
            left: 15px;
          }
        }

        /* تأثيرات تفاعلية */
        .article-content-wrapper :global(.article-list-item):hover {
          background: #f1f5f9;
          transform: translateX(-2px);
          transition: all 0.2s ease;
        }

        .article-content-wrapper[dir="rtl"] :global(.article-list-item):hover {
          transform: translateX(2px);
        }

        .article-content-wrapper :global(.article-strong):hover {
          background: linear-gradient(120deg, #fde68a 0%, #f59e0b 100%);
          color: white;
          transition: all 0.2s ease;
        }
      `}</style>
      
      <div 
        className="prose prose-lg max-w-none"
        dir={isRTL ? 'rtl' : 'ltr'}
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />
    </div>
  );
};

export default ArticleContent;
