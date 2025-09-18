import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  User,
  Heart,
  MessageCircle,
  Share2,
  BookOpen,
  Eye,
  Facebook,
  Twitter,
  Copy,
  Hash
} from 'lucide-react';
import { articleService } from '../services/articleService';
import type { ArticleWithDetails, ArticleComment } from '../services/articleService';
import { useAuth } from '../contexts/AuthContext';
import ArticleContent from './ArticleContent';
import CommentSystem from './CommentSystem';

// Types - using types from articleService
type Article = ArticleWithDetails;
type Comment = ArticleComment;

const ArticleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const currentLanguage = i18n.language as 'ar' | 'en';
  const { isAuthenticated, user } = useAuth();

  // دالة ترجمة التصنيفات
  const translateCategoryName = (categoryName: string): string => {
    const categoryTranslations: { [key: string]: { ar: string; en: string } } = {
      'الإرشاد الإسلامي': { ar: 'الإرشاد الإسلامي', en: 'Islamic Guidance' },
      'Islamic Guidance': { ar: 'الإرشاد الإسلامي', en: 'Islamic Guidance' },
      'نصائح الزواج': { ar: 'نصائح الزواج', en: 'Marriage Tips' },
      'Marriage Tips': { ar: 'نصائح الزواج', en: 'Marriage Tips' },
      'التوجيه الأسري': { ar: 'التوجيه الأسري', en: 'Family Guidance' },
      'Family Guidance': { ar: 'التوجيه الأسري', en: 'Family Guidance' },
      'الأمان الرقمي': { ar: 'الأمان الرقمي', en: 'Digital Safety' },
      'Digital Safety': { ar: 'الأمان الرقمي', en: 'Digital Safety' }
    };

    return categoryTranslations[categoryName]?.[currentLanguage] || categoryName;
  };

  // State
  const [article, setArticle] = useState<Article | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState(false);

  // Mock article removed - using real data from database






  useEffect(() => {
    const loadArticle = async () => {
      if (!id) return;

      try {
        setLoading(true);

        // Load article
        const articleData = await articleService.getArticleById(id);
        if (articleData) {
          setArticle(articleData);
          setLikesCount(articleData.likes || 0);

          // Check if user liked this article
          if (isAuthenticated && user) {
            const userLiked = await articleService.checkUserLikedArticle(id, user.id);
            console.log('User liked status:', userLiked);
            setLiked(userLiked);
          }

          // Increment views
          await articleService.incrementViews(id);

          // Load related articles
          const relatedData = await articleService.getRelatedArticles(
            articleData.id,
            articleData.category_id,
            3,
            currentLanguage
          );
          setRelatedArticles(relatedData);

          // Load comments
          const commentsData = await articleService.getComments(articleData.id);
          setComments(commentsData);
        }
      } catch (error) {
        console.error('Error loading article:', error);
      } finally {
        setLoading(false);
      }
    };

    loadArticle();
  }, [id, isAuthenticated, user]);

  // Handle language change - try to find similar article in new language
  useEffect(() => {
    const handleLanguageChange = async () => {
      if (article && article.language !== currentLanguage) {
        try {
          // Try to find a similar article in the target language
          const similarArticle = await articleService.findSimilarArticleInLanguage(article.id, currentLanguage);

          if (similarArticle) {
            // Found similar article in new language, update without loading screen
            setArticle(similarArticle);
            setLikesCount(similarArticle.likes || 0);

            // Load related articles in new language
            const relatedData = await articleService.getRelatedArticles(
              similarArticle.id,
              similarArticle.category_id,
              3,
              currentLanguage
            );
            setRelatedArticles(relatedData);

            // Update URL to reflect the new article
            navigate(`/articles/${similarArticle.id}`, { replace: true });
          }
          // If no similar article found, keep showing current article
          // No navigation or loading screen needed
        } catch (error) {
          console.error('Error finding similar article in new language:', error);
          // Keep showing current article on error
        }
      }
    };

    if (article) {
      handleLanguageChange();
    }
  }, [currentLanguage, article?.id, navigate]);

  const formatDate = (dateString: string) => {
    if (!dateString) return t('common.unknown');

    try {
      // تنظيف التاريخ وتحويله
      let cleanDate = dateString;

      // إذا كان التاريخ يحتوي على معلومات الوقت، نأخذ الجزء الأول فقط
      if (cleanDate.includes('T')) {
        cleanDate = cleanDate.split('T')[0];
      }

      // إذا كان التاريخ يحتوي على +00 أو معلومات المنطقة الزمنية
      if (cleanDate.includes('+')) {
        cleanDate = cleanDate.split('+')[0];
      }

      const date = new Date(cleanDate);

      // التحقق من صحة التاريخ
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', dateString);
        return t('common.unknown');
      }

      // استخدام التقويم الميلادي دائماً
      return date.toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
        calendar: 'gregory', // التقويم الميلادي
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return t('common.unknown');
    }
  };

  const handleLike = async () => {
    // التحقق من تسجيل الدخول
    if (!isAuthenticated || !user || !article) {
      navigate('/login');
      return;
    }

    try {
      // تبديل حالة الإعجاب باستخدام خدمة المقالات
      const result = await articleService.toggleLike(article.id, user.id);
      console.log('Toggle like result:', result);

      // تحديث الحالة المحلية
      setLiked(result.liked);
      setLikesCount(result.totalLikes);

      // تحديث عدد الإعجابات في المقال
      setArticle(prev => prev ? {
        ...prev,
        likes: result.totalLikes
      } : null);

      console.log('Like toggled successfully:', { liked: result.liked, totalLikes: result.totalLikes });
    } catch (error) {
      console.error('Error toggling like:', error);
      // يمكن إضافة toast notification هنا
    }
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const title = article?.title || '';
    
    switch (platform) {
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`);
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        // إظهار رسالة نجاح
        break;
    }
    setShowShareMenu(false);
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-slate-600">
            {t('articles.loading')}
          </p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-600 mb-2">{t('articles.notFound.title')}</h2>
          <p className="text-slate-500 mb-6">{t('articles.notFound.description')}</p>
          <Link
            to="/articles"
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
          >
            {t('articles.notFound.backToArticles')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Navigation */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/articles')}
            className="flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors"
          >
            {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
            <span>{t('articles.backToArticles')}</span>
          </button>
        </div>
      </div>

      {/* Article Content */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

            {/* Article Header */}
            <header className="mb-8">
          {/* Category */}
          <div className="mb-4">
            <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r ${article.category.color} text-white`}>
              {translateCategoryName(article.category.name)}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-800 mb-6 leading-relaxed font-display" style={{ lineHeight: '1.6' }}>
            {article.title}
          </h1>

          {/* Meta Information */}
          <div className="flex flex-wrap items-center gap-6 text-slate-600 mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span>{formatDate(article.published_at)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span>{article.read_time} {t('articles.readTime')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              <span>{article.views.toLocaleString()} {t('articles.views')}</span>
            </div>
          </div>

          {/* Author */}
          <div className="flex items-center gap-4 p-6 bg-white rounded-2xl border border-slate-200">
            <div className="w-16 h-16 bg-gradient-to-r from-slate-200 to-slate-300 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-slate-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-800 text-lg">{article.author.name}</h3>
              <p className="text-slate-600 mb-2">{article.author.title}</p>
              {article.author.bio && (
                <p className="text-sm text-slate-500 leading-relaxed">{article.author.bio}</p>
              )}
            </div>
          </div>
        </header>

        {/* Article Image */}
        <div className="mb-8">
          <div className="h-64 md:h-96 bg-gradient-to-br from-primary-100 to-emerald-100 rounded-2xl flex items-center justify-center">
            <div className="text-center">
              <div className={`w-20 h-20 mx-auto rounded-xl bg-gradient-to-r ${article.category.color} flex items-center justify-center`}>
                <BookOpen className="w-10 h-10 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Article Content */}
        <div className="mb-8">
          <ArticleContent
            content={article.content}
            className="article-content-enhanced"
          />
        </div>

        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Hash className="w-5 h-5 text-primary-600" />
              {t('articles.tags')}
            </h3>
            <div className="flex flex-wrap gap-3">
              {article.tags.map((tag, index) => (
                <Link
                  key={index}
                  to={`/articles?tag=${encodeURIComponent(tag)}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 rounded-full text-sm font-medium hover:from-primary-100 hover:to-primary-200 hover:text-primary-700 transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
                >
                  <Hash className="w-4 h-4" />
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Article Actions */}
        <div className="flex items-center justify-between p-6 bg-white rounded-2xl border border-slate-200 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                liked
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-red-50 hover:text-red-600'
              }`}
              disabled={!isAuthenticated}
              title={!isAuthenticated ? t('articles.loginToLike') : ''}
            >
              <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
              <span>{likesCount}</span>
            </button>

            <div className="flex items-center gap-2 text-slate-600">
              <MessageCircle className="w-5 h-5" />
              <span>{comments.length} {t('articles.comments')}</span>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <Share2 className="w-5 h-5" />
              <span>{t('articles.share')}</span>
            </button>

            {showShareMenu && (
              <div className="absolute top-full mt-2 right-0 bg-white border border-slate-200 rounded-lg shadow-lg p-2 z-10">
                <button
                  onClick={() => handleShare('facebook')}
                  className="flex items-center gap-3 w-full px-4 py-2 text-left hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <Facebook className="w-5 h-5 text-blue-600" />
                  <span>Facebook</span>
                </button>
                <button
                  onClick={() => handleShare('twitter')}
                  className="flex items-center gap-3 w-full px-4 py-2 text-left hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <Twitter className="w-5 h-5 text-blue-400" />
                  <span>Twitter</span>
                </button>
                <button
                  onClick={() => handleShare('copy')}
                  className="flex items-center gap-3 w-full px-4 py-2 text-left hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <Copy className="w-5 h-5 text-slate-600" />
                  <span>{t('articles.copyLink')}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Comments Section */}
        <section className="mt-16 pt-12 border-t-2 border-slate-100">
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-emerald-500 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">
                  {t('articles.commentsSection')}
                </h2>
                <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-medium">
                  {comments.length}
                </span>
              </div>

              <p className="text-slate-600 text-sm">
                {t('articles.commentsDescription')}
              </p>
            </div>

            <CommentSystem
              articleId={article?.id || id || ''}
              className="comment-system-enhanced"
            />
          </section>
      </article>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-8 text-center">
            {t('articles.relatedArticles')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedArticles.slice(0, 3).map((relatedArticle) => (
              <Link
                key={relatedArticle.id}
                to={`/articles/${relatedArticle.id}`}
                className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-slate-100 group"
              >
                <div className="h-48 bg-gradient-to-br from-primary-100 to-emerald-100 flex items-center justify-center">
                  <div className="text-center">
                    <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-r ${relatedArticle.category.color} flex items-center justify-center`}>
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${relatedArticle.category.color} text-white mb-3`}>
                    {translateCategoryName(relatedArticle.category.name)}
                  </span>
                  <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-primary-600 transition-colors line-clamp-2">
                    {relatedArticle.title}
                  </h3>
                  <p className="text-slate-600 text-sm line-clamp-2 mb-4">
                    {relatedArticle.excerpt}
                  </p>
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>{formatDate(relatedArticle.published_at)}</span>
                    <span>{relatedArticle.read_time} {t('articles.readTime')}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ArticleDetailPage;
