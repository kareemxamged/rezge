import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import {
  Search,
  Calendar,
  User,
  Clock,
  Heart,
  MessageCircle,
  BookOpen,
  ChevronRight,
  Grid,
  List,
  Star,
  Hash,
  X
} from 'lucide-react';
import { articleService } from '../services/articleService';
import type { ArticleWithDetails, ArticleCategory } from '../services/articleService';

// Types - using types from articleService
type Article = ArticleWithDetails;
type Category = ArticleCategory & {
  icon: React.ComponentType<any>;
};

const ArticlesPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const isRTL = i18n.language === 'ar';
  const currentLanguage = i18n.language as 'ar' | 'en';

  // State
  const [allArticles, setAllArticles] = useState<Article[]>([]); // جميع المقالات
  const [articles, setArticles] = useState<Article[]>([]); // المقالات المفلترة
  const [categories, setCategories] = useState<Category[]>([]);
  const [popularTags, setPopularTags] = useState<Array<{tag: string, count: number}>>([]);
  const [totalArticlesCount, setTotalArticlesCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'trending'>('latest');
  // const [currentPage] = useState(1); // Removed unused variable
  const [redirectMessage, setRedirectMessage] = useState<string>('');

  // Load data from database
  const loadCategories = async () => {
    try {
      const categoriesData = await articleService.getCategories(currentLanguage);
      const categoriesWithIcons: Category[] = categoriesData.map(cat => ({
        ...cat,
        icon: getIconForCategory(cat.name)
      } as unknown as Category));
      setCategories(categoriesWithIcons);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadPopularTags = async () => {
    try {
      const tags = await articleService.getPopularTags(currentLanguage, 15);
      setPopularTags(tags);
    } catch (error) {
      console.error('Error loading popular tags:', error);
    }
  };

  const loadAllArticles = async () => {
    try {
      setLoading(true);
      const result = await articleService.getArticles({
        page: 1,
        limit: 1000, // تحميل جميع المقالات
        language: currentLanguage
      });

      setAllArticles(result.articles);
      setTotalArticlesCount(result.totalCount || result.articles.length);
      // تطبيق الفلترة الأولية
      setArticles(result.articles);
    } catch (error) {
      console.error('Error loading articles:', error);
    } finally {
      setLoading(false);
    }
  };

  // حساب عدد المقالات لكل تصنيف
  const getCategoryArticleCount = (categoryId: string): number => {
    return allArticles.filter(article => article.category_id === categoryId).length;
  };

  // فلترة المقالات محلياً
  const filterArticles = () => {
    let filtered = [...allArticles];

    // فلترة حسب التصنيف
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(article => article.category_id === selectedCategory);
    }

    // فلترة حسب الهاشتاغ
    if (selectedTag) {
      filtered = filtered.filter(article =>
        article.tags && article.tags.includes(selectedTag)
      );
    }

    // فلترة حسب البحث
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(query) ||
        article.excerpt.toLowerCase().includes(query) ||
        (article.tags && article.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }

    // ترتيب المقالات
    switch (sortBy) {
      case 'popular':
        filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'trending':
        filtered.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        break;
      case 'latest':
      default:
        filtered.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
        break;
    }

    setArticles(filtered);
  };

  // Helper function to get icon for category
  const getIconForCategory = (categoryName: string) => {
    switch (categoryName) {
      case 'البدء':
      case 'Getting Started':
        return BookOpen;
      case 'الملف الشخصي':
      case 'Profile Management':
        return User;
      case 'الإرشاد الإسلامي':
      case 'Islamic Guidance':
        return BookOpen;
      case 'نصائح الزواج':
      case 'Marriage Tips':
        return Heart;
      case 'التوجيه الأسري':
      case 'Family Guidance':
        return User;
      case 'الأمان الرقمي':
      case 'Digital Safety':
        return Star;
      case 'Relationship Psychology':
        return MessageCircle;
      case 'Health & Wellness':
        return Heart;
      case 'Success Stories':
        return Star;
      case 'Cultural Traditions':
        return BookOpen;
      default:
        return BookOpen;
    }
  };



  useEffect(() => {
    loadCategories();
    loadPopularTags();
    loadAllArticles();
    // Reset selected category and tag when language changes
    setSelectedCategory('all');
    setSelectedTag('');
  }, [currentLanguage]);

  // فلترة المقالات عند تغيير الفلاتر
  useEffect(() => {
    if (allArticles.length > 0) {
      filterArticles();
    }
  }, [allArticles, selectedCategory, selectedTag, searchQuery, sortBy]);

  // Check for redirect message and URL parameters
  useEffect(() => {
    if (location.state?.message) {
      setRedirectMessage(location.state.message);
      // Clear the message after 5 seconds
      const timer = setTimeout(() => {
        setRedirectMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }

    // Check for category parameter in URL
    const urlParams = new URLSearchParams(location.search);
    const categoryParam = urlParams.get('category');
    if (categoryParam && categories.length > 0) {
      // Find category by name
      const category = categories.find(cat => cat.name === decodeURIComponent(categoryParam));
      if (category) {
        setSelectedCategory(category.id);
      }
    }
  }, [location.state, location.search, categories]);

  // Articles are already filtered and sorted by the server

  const handleTagClick = (tag: string) => {
    setSelectedTag(tag);
    setSelectedCategory('all'); // Reset category when selecting tag
    setSearchQuery(''); // Reset search when selecting tag
  };

  const clearFilters = () => {
    setSelectedCategory('all');
    setSelectedTag('');
    setSearchQuery('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    // استخدام التقويم الميلادي دائماً
    return date.toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
      calendar: 'gregory', // التقويم الميلادي
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-slate-600">{t('articles.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Redirect Message */}
      {redirectMessage && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-blue-700">{redirectMessage}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setRedirectMessage('')}
                className="text-blue-400 hover:text-blue-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-emerald-600 text-white py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 font-display">
              {t('articles.page.title')}
            </h1>
            <p className="text-xl md:text-2xl text-primary-100 mb-8 max-w-3xl mx-auto leading-relaxed">
              {t('articles.page.subtitle')}
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative">
              <div className="relative">
                <Search className={`absolute top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 ${isRTL ? 'right-4' : 'left-4'}`} />
                <input
                  type="text"
                  placeholder={t('articles.search.placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-4 rounded-2xl border-0 text-slate-800 placeholder-slate-500 focus:ring-2 focus:ring-white/20 focus:outline-none text-lg`}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4 font-display">
              {t('articles.categories.title')}
            </h2>
            <p className="text-xl text-slate-600">
              {t('articles.categories.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* All Articles Category */}
            <button
              onClick={() => setSelectedCategory('all')}
              className={`p-6 rounded-2xl border-2 transition-all duration-300 text-center group ${
                selectedCategory === 'all'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'
              }`}
            >
              <div className={`w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center ${
                selectedCategory === 'all' ? 'bg-primary-500' : 'bg-slate-100 group-hover:bg-primary-100'
              }`}>
                <Grid className={`w-6 h-6 ${selectedCategory === 'all' ? 'text-white' : 'text-slate-600 group-hover:text-primary-600'}`} />
              </div>
              <h3 className={`font-bold text-lg mb-2 ${selectedCategory === 'all' ? 'text-primary-700' : 'text-slate-800'}`}>
                {t('articles.categories.all')}
              </h3>
              <p className="text-sm text-slate-600 mb-3">
                {t('articles.categories.allDescription')}
              </p>
              <span className={`text-sm font-medium ${selectedCategory === 'all' ? 'text-primary-600' : 'text-slate-500'}`}>
                {totalArticlesCount} {t('articles.categories.articlesCount')}
              </span>
            </button>

            {/* Category Cards */}
            {categories.map((category) => {
              const IconComponent = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`p-6 rounded-2xl border-2 transition-all duration-300 text-center group ${
                    selectedCategory === category.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-r ${category.color} flex items-center justify-center`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <h3 className={`font-bold text-lg mb-2 ${selectedCategory === category.id ? 'text-primary-700' : 'text-slate-800'}`}>
                    {category.name}
                  </h3>
                  <p className="text-sm text-slate-600 mb-3">
                    {category.description}
                  </p>
                  <span className={`text-sm font-medium ${selectedCategory === category.id ? 'text-primary-600' : 'text-slate-500'}`}>
                    {getCategoryArticleCount(category.id)} {t('articles.categories.articlesCount')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Popular Tags Section */}
      {popularTags.length > 0 && (
        <section className="py-8 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3 font-display">
                {t('articles.hashtags.title')}
              </h2>
              <p className="text-lg text-slate-600">
                {t('articles.hashtags.subtitle')}
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              {popularTags.map((tagData) => (
                <button
                  key={tagData.tag}
                  onClick={() => handleTagClick(tagData.tag)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    selectedTag === tagData.tag
                      ? 'bg-primary-500 text-white shadow-lg scale-105'
                      : 'bg-slate-100 text-slate-700 hover:bg-primary-100 hover:text-primary-700 hover:scale-105'
                  }`}
                >
                  <Hash className="w-4 h-4" />
                  <span>{tagData.tag}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    selectedTag === tagData.tag
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {tagData.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Clear filters button */}
            {(selectedTag || selectedCategory !== 'all' || searchQuery) && (
              <div className="text-center mt-6">
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-primary-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                  {t('articles.filters.clear')}
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Filters and Controls */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Results Count */}
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-slate-800">
                {t('articles.results.showing')} {articles.length} {t('articles.results.articles')}
                {selectedCategory !== 'all' && (
                  <span className="text-primary-600">
                    {' '}{t('articles.results.in')} {categories.find(c => c.id === selectedCategory)?.name}
                  </span>
                )}
                {selectedTag && (
                  <span className="text-emerald-600">
                    {' '}{t('articles.results.withTag')} #{selectedTag}
                  </span>
                )}
              </h3>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'latest' | 'popular' | 'trending')}
                  className="appearance-none bg-white border border-slate-300 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-slate-700 hover:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="latest">{t('articles.sort.latest')}</option>
                  <option value="popular">{t('articles.sort.popular')}</option>
                  <option value="trending">{t('articles.sort.trending')}</option>
                </select>
                <ChevronRight className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-white border border-slate-300 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid' ? 'bg-primary-500 text-white' : 'text-slate-600 hover:text-primary-600'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list' ? 'bg-primary-500 text-white' : 'text-slate-600 hover:text-primary-600'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Articles Grid/List */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {articles.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-600 mb-2">
                {t('articles.noResults.title')}
              </h3>
              <p className="text-slate-500 mb-6">
                {t('articles.noResults.description')}
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
              >
                {t('articles.noResults.clearFilters')}
              </button>
            </div>
          ) : (
            <div className={viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'
              : 'space-y-6'
            }>
              {articles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  viewMode={viewMode}
                  formatDate={formatDate}
                  selectedTag={selectedTag}
                  onTagClick={handleTagClick}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

// Article Card Component
interface ArticleCardProps {
  article: Article;
  viewMode: 'grid' | 'list';
  formatDate: (date: string) => string;
  selectedTag: string;
  onTagClick: (tag: string) => void;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article, viewMode, formatDate, selectedTag, onTagClick }) => {
  const { t } = useTranslation();

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-slate-100">
        <div className="flex flex-col md:flex-row">
          {/* Image */}
          <div className="md:w-1/3 lg:w-1/4">
            <div className="h-48 md:h-full bg-gradient-to-br from-primary-100 to-emerald-100 flex items-center justify-center relative">
              {article.featured && (
                <div className="absolute top-4 left-4 bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  <Star className="w-4 h-4 inline mr-1" />
                  {t('articles.featured')}
                </div>
              )}
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-r from-primary-500 to-emerald-500 flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6">
            <div className="flex flex-col h-full">
              {/* Category and Date */}
              <div className="flex items-center gap-4 mb-3">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-primary-500 to-emerald-500 text-white">
                  {article.category.name}
                </span>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(article.published_at)}</span>
                </div>
              </div>

              {/* Title */}
              <Link
                to={`/articles/${article.id}`}
                className="block group"
              >
                <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-primary-600 transition-colors line-clamp-2">
                  {article.title}
                </h3>
              </Link>

              {/* Excerpt */}
              <p className="text-slate-600 leading-relaxed mb-4 flex-1 line-clamp-3">
                {article.excerpt}
              </p>

              {/* Author and Stats */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-slate-200 to-slate-300 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{article.author.name}</p>
                    <p className="text-xs text-slate-500">{article.author.title}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{article.read_time} {t('articles.readTime')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    <span>{article.likes}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" />
                    <span>{article.comments_count}</span>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {article.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {article.tags.slice(0, 3).map((tag, index) => (
                    <button
                      key={index}
                      onClick={() => onTagClick(tag)}
                      className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                        selectedTag === tag
                          ? 'bg-primary-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-primary-100 hover:text-primary-700'
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                  {article.tags.length > 3 && (
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">
                      +{article.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid View
  return (
    <article className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-slate-100 group">
      {/* Image */}
      <div className="h-48 bg-gradient-to-br from-primary-100 to-emerald-100 flex items-center justify-center relative">
        {article.featured && (
          <div className="absolute top-4 left-4 bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            <Star className="w-4 h-4 inline mr-1" />
            {t('articles.featured')}
          </div>
        )}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-r from-primary-500 to-emerald-500 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Category and Date */}
        <div className="flex items-center justify-between mb-3">
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-primary-500 to-emerald-500 text-white">
            {article.category.name}
          </span>
          <div className="flex items-center gap-1 text-sm text-slate-500">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(article.published_at)}</span>
          </div>
        </div>

        {/* Title */}
        <Link
          to={`/articles/${article.id}`}
          className="block"
        >
          <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-primary-600 transition-colors line-clamp-2">
            {article.title}
          </h3>
        </Link>

        {/* Excerpt */}
        <p className="text-slate-600 leading-relaxed mb-4 line-clamp-3">
          {article.excerpt}
        </p>

        {/* Author */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-slate-200 to-slate-300 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="font-medium text-slate-800 text-sm">{article.author.name}</p>
            <p className="text-xs text-slate-500">{article.author.title}</p>
          </div>
        </div>

        {/* Stats and Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{article.read_time} {t('articles.readTime')}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              <span>{article.likes}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              <span>{article.comments_count}</span>
            </div>
          </div>

          <Link
            to={`/articles/${article.id}`}
            className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1 transition-colors"
          >
            {t('articles.readMore')}
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {article.tags.slice(0, 3).map((tag, index) => (
              <button
                key={index}
                onClick={() => onTagClick(tag)}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  selectedTag === tag
                    ? 'bg-primary-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-primary-100 hover:text-primary-700'
                }`}
              >
                #{tag}
              </button>
            ))}
            {article.tags.length > 3 && (
              <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">
                +{article.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

export default ArticlesPage;
