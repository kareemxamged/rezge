import { supabase } from '../lib/supabase';

// Types
export interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author_id: string;
  category_id: string;
  tags: string[];
  published_at: string;
  updated_at?: string;
  read_time: number;
  views: number;
  likes: number;
  comments_count: number;
  featured: boolean;
  image_url?: string;
  status: 'draft' | 'published' | 'archived';
  language: 'ar' | 'en';
  created_at: string;
}

export interface ArticleCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  article_count: number;
  language: 'ar' | 'en';
  created_at: string;
}

export interface ArticleComment {
  id: string;
  article_id: string;
  user_id: string;
  content: string;
  likes: number;
  parent_id?: string;
  created_at: string;
  updated_at?: string;
  is_approved?: boolean;
  is_deleted?: boolean;
  user?: {
    id: string;
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
  };
  replies?: ArticleComment[];
}

export interface ArticleWithDetails extends Article {
  author: {
    name: string;
    title?: string;
    bio?: string;
    avatar?: string;
  };
  category: {
    id: string;
    name: string;
    color: string;
  };
}

class ArticleService {
  // Get all articles with pagination and filters
  async getArticles(options: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    tag?: string;
    sortBy?: 'latest' | 'popular' | 'trending';
    status?: 'published' | 'draft' | 'archived';
    language?: 'ar' | 'en';
  } = {}) {
    const {
      page = 1,
      limit = 12,
      category,
      search,
      tag,
      sortBy = 'latest',
      status = 'published',
      language = 'ar'
    } = options;

    let query = supabase
      .from('articles')
      .select(`
        *,
        author:users!articles_author_id_fkey(first_name, last_name, bio, profile_image_url),
        category:article_categories!articles_category_id_fkey(name, color)
      `)
      .eq('status', status)
      .eq('language', language);

    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('category_id', category);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%,tags.cs.{${search}}`);
    }

    if (tag) {
      query = query.contains('tags', [tag]);
    }

    // Apply sorting
    switch (sortBy) {
      case 'popular':
        query = query.order('views', { ascending: false });
        break;
      case 'trending':
        query = query.order('likes', { ascending: false });
        break;
      case 'latest':
      default:
        query = query.order('published_at', { ascending: false });
        break;
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching articles:', error);
      throw error;
    }

    // Transform the data to match our interface
    const transformedData = data?.map(article => ({
      ...article,
      language: 'ar' as const, // Default to Arabic for now
      author: article.author ? {
        ...article.author,
        name: `${article.author.first_name || ''} ${article.author.last_name || ''}`.trim() || 'مؤلف غير معروف',
        avatar: article.author.profile_image_url
      } : {
        id: 'unknown',
        name: 'مؤلف غير معروف',
        avatar: null,
        first_name: '',
        last_name: '',
        profile_image_url: null
      }
    })) || [];

    return {
      articles: transformedData as ArticleWithDetails[],
      totalCount: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      currentPage: page
    };
  }

  // Get single article by ID
  async getArticleById(id: string): Promise<ArticleWithDetails | null> {
    const { data, error } = await supabase
      .from('articles')
      .select(`
        *,
        author:users!articles_author_id_fkey(first_name, last_name, bio, profile_image_url),
        category:article_categories!articles_category_id_fkey(name, color)
      `)
      .eq('id', id)
      .eq('status', 'published')
      .single();

    if (error) {
      console.error('Error fetching article:', error);
      return null;
    }

    // Get real likes count from article_likes table
    const { count: realLikesCount, error: countError } = await supabase
      .from('article_likes')
      .select('*', { count: 'exact', head: true })
      .eq('article_id', id);

    if (countError) {
      console.error('Error counting likes:', countError);
    }

    // Update article likes count if it's different
    const actualLikes = realLikesCount || 0;
    if (data.likes !== actualLikes) {
      const { error: updateError } = await supabase
        .from('articles')
        .update({ likes: actualLikes })
        .eq('id', id);

      if (updateError) {
        console.error('Error updating article likes count:', updateError);
      }
    }

    // Transform the data
    const transformedData = {
      ...data,
      likes: actualLikes, // Use the real count
      language: data.language || 'ar' as const, // Use actual language from database
      author: data.author ? {
        ...data.author,
        name: `${data.author.first_name || ''} ${data.author.last_name || ''}`.trim() || 'مؤلف غير معروف',
        avatar: data.author.profile_image_url
      } : {
        id: 'unknown',
        name: 'مؤلف غير معروف',
        avatar: null,
        first_name: '',
        last_name: '',
        profile_image_url: null
      }
    };

    // Increment view count
    await this.incrementViews(id);

    return transformedData as ArticleWithDetails;
  }

  // Get article categories with article count
  async getCategories(language: 'ar' | 'en' = 'ar'): Promise<ArticleCategory[]> {
    try {
      const { data, error } = await supabase
        .from('article_categories')
        .select('*')
        .eq('language', language)
        .order('name');

      if (error) {
        console.error('Error fetching categories:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getCategories:', error);
      return [];
    }
  }



  // Get related articles
  async getRelatedArticles(articleId: string, categoryId: string, limit: number = 3, language: 'ar' | 'en' = 'ar'): Promise<ArticleWithDetails[]> {
    const { data, error } = await supabase
      .from('articles')
      .select(`
        *,
        author:users!articles_author_id_fkey(first_name, last_name, bio, profile_image_url),
        category:article_categories!articles_category_id_fkey(name, color)
      `)
      .eq('category_id', categoryId)
      .eq('status', 'published')
      .eq('language', language)
      .neq('id', articleId)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching related articles:', error);
      return [];
    }

    // Transform the data
    const transformedData = data?.map(article => ({
      ...article,
      language: article.language || language, // Use actual language from database
      author: article.author ? {
        ...article.author,
        name: `${article.author.first_name || ''} ${article.author.last_name || ''}`.trim() || 'مؤلف غير معروف',
        avatar: article.author.profile_image_url
      } : {
        id: 'unknown',
        name: 'مؤلف غير معروف',
        avatar: null,
        first_name: '',
        last_name: '',
        profile_image_url: null
      }
    })) || [];

    return transformedData as ArticleWithDetails[];
  }

  // Increment article views
  async incrementViews(articleId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_article_views', {
      article_id: articleId
    });

    if (error) {
      console.error('Error incrementing views:', error);
    }
  }

  // Check if user liked an article
  async checkUserLikedArticle(articleId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('article_likes')
        .select('id')
        .eq('article_id', articleId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking user liked article:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking user like:', error);
      return false;
    }
  }

  // Like/Unlike article
  async toggleLike(articleId: string, userId: string): Promise<{ liked: boolean; totalLikes: number }> {
    try {
      // Check if user already liked this article
      const { data: existingLike, error: checkError } = await supabase
        .from('article_likes')
        .select('id')
        .eq('article_id', articleId)
        .eq('user_id', userId)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      let liked: boolean;

      if (existingLike) {
        // Unlike: Remove the like
        const { error: deleteError } = await supabase
          .from('article_likes')
          .delete()
          .eq('id', existingLike.id);

        if (deleteError) {
          throw deleteError;
        }
        liked = false;
      } else {
        // Like: Add the like
        const { error: insertError } = await supabase
          .from('article_likes')
          .insert({
            article_id: articleId,
            user_id: userId
          });

        if (insertError) {
          throw insertError;
        }
        liked = true;
      }

      // Get updated likes count from article_likes table (real count)
      const { count: likesCount, error: countError } = await supabase
        .from('article_likes')
        .select('*', { count: 'exact', head: true })
        .eq('article_id', articleId);

      if (countError) {
        throw countError;
      }

      const totalLikes = likesCount || 0;

      // Update the likes count in articles table to keep it in sync
      const { error: updateError } = await supabase
        .from('articles')
        .update({ likes: totalLikes })
        .eq('id', articleId);

      if (updateError) {
        console.error('Error updating article likes count:', updateError);
        // Don't throw error here, just log it as the main operation succeeded
      }

      return {
        liked,
        totalLikes
      };
    } catch (error) {
      console.error('Error toggling like:', error);

      // Return current state on error - get real count from article_likes
      const { count: likesCount } = await supabase
        .from('article_likes')
        .select('*', { count: 'exact', head: true })
        .eq('article_id', articleId);

      const isLiked = await this.checkUserLikedArticle(articleId, userId);

      return {
        liked: isLiked,
        totalLikes: likesCount || 0
      };
    }
  }

  // Get article comments with replies
  async getComments(articleId: string): Promise<ArticleComment[]> {
    try {
      const { data, error } = await supabase
        .from('article_comments')
        .select(`
          *,
          user:users!article_comments_user_id_fkey(
            id,
            first_name,
            last_name,
            profile_image_url,
            verified
          )
        `)
        .eq('article_id', articleId)
        .eq('is_approved', true)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching comments:', error);
        return [];
      }

      // Organize comments with replies
      const comments: ArticleComment[] = [];
      const commentMap = new Map<string, ArticleComment>();

      // First pass: create all comments
      data?.forEach(comment => {
        const formattedComment: ArticleComment = {
          id: comment.id,
          article_id: comment.article_id,
          user_id: comment.user_id,
          parent_id: comment.parent_id,
          content: comment.content,
          likes: comment.likes || 0,
          is_approved: comment.is_approved,
          created_at: comment.created_at,
          updated_at: comment.updated_at,
          user: comment.user,
          replies: []
        };
        commentMap.set(comment.id, formattedComment);
      });

      // Second pass: organize hierarchy
      commentMap.forEach(comment => {
        if (comment.parent_id) {
          const parent = commentMap.get(comment.parent_id);
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push(comment);
          }
        } else {
          comments.push(comment);
        }
      });

      return comments;
    } catch (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
  }

  // Add comment
  async addComment(articleId: string, userId: string, content: string, parentId?: string): Promise<ArticleComment | null> {
    try {
      const { data, error } = await supabase
        .from('article_comments')
        .insert({
          article_id: articleId,
          user_id: userId,
          content: content.trim(),
          parent_id: parentId || null
        })
        .select(`
          *,
          user:users!article_comments_user_id_fkey(
            id,
            first_name,
            last_name,
            profile_image_url,
            verified
          )
        `)
        .single();

      if (error) {
        console.error('Error adding comment:', error);
        return null;
      }

      return {
        id: data.id,
        article_id: data.article_id,
        user_id: data.user_id,
        parent_id: data.parent_id,
        content: data.content,
        likes: data.likes || 0,
        is_approved: data.is_approved,
        created_at: data.created_at,
        updated_at: data.updated_at,
        user: data.user,
        replies: []
      };
    } catch (error) {
      console.error('Error adding comment:', error);
      return null;
    }
  }

  // Check if user liked a comment
  async checkUserLikedComment(commentId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking user comment like:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking user comment like:', error);
      return false;
    }
  }

  // Toggle comment like
  async toggleCommentLike(commentId: string, userId: string): Promise<{ liked: boolean; totalLikes: number }> {
    try {
      // Check if user already liked this comment
      const { data: existingLike, error: checkError } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', userId)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      let liked: boolean;

      if (existingLike) {
        // Unlike: Remove the like
        const { error: deleteError } = await supabase
          .from('comment_likes')
          .delete()
          .eq('id', existingLike.id);

        if (deleteError) {
          throw deleteError;
        }
        liked = false;
      } else {
        // Like: Add the like
        const { error: insertError } = await supabase
          .from('comment_likes')
          .insert({
            comment_id: commentId,
            user_id: userId
          });

        if (insertError) {
          throw insertError;
        }
        liked = true;
      }

      // Get updated likes count
      const { data: comment, error: commentError } = await supabase
        .from('article_comments')
        .select('likes')
        .eq('id', commentId)
        .single();

      if (commentError) {
        throw commentError;
      }

      return {
        liked,
        totalLikes: comment?.likes || 0
      };
    } catch (error) {
      console.error('Error toggling comment like:', error);

      // Return current state on error
      const { data: comment } = await supabase
        .from('article_comments')
        .select('likes')
        .eq('id', commentId)
        .single();

      const isLiked = await this.checkUserLikedComment(commentId, userId);

      return {
        liked: isLiked,
        totalLikes: comment?.likes || 0
      };
    }
  }

  // Get comment replies
  async getCommentReplies(commentId: string): Promise<ArticleComment[]> {
    try {
      const { data, error } = await supabase
        .from('article_comments')
        .select(`
          *,
          user:users!article_comments_user_id_fkey(
            id,
            first_name,
            last_name,
            profile_image_url,
            verified
          )
        `)
        .eq('parent_id', commentId)
        .eq('is_approved', true)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching comment replies:', error);
        return [];
      }

      return data?.map(reply => ({
        id: reply.id,
        article_id: reply.article_id,
        user_id: reply.user_id,
        parent_id: reply.parent_id,
        content: reply.content,
        likes: reply.likes || 0,
        is_approved: reply.is_approved,
        created_at: reply.created_at,
        updated_at: reply.updated_at,
        user: reply.user,
        replies: []
      })) || [];
    } catch (error) {
      console.error('Error fetching comment replies:', error);
      return [];
    }
  }

  // Delete comment
  async deleteComment(commentId: string, userId: string): Promise<boolean> {
    try {
      // Soft delete: mark as deleted instead of actually deleting
      const { error } = await supabase
        .from('article_comments')
        .update({
          is_deleted: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .eq('user_id', userId); // Only allow users to delete their own comments

      if (error) {
        console.error('Error deleting comment:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting comment:', error);
      return false;
    }
  }

  // Search articles
  async searchArticles(query: string, language: 'ar' | 'en' = 'ar', limit: number = 10): Promise<ArticleWithDetails[]> {
    const { data, error } = await supabase
      .from('articles')
      .select(`
        *,
        author:users!articles_author_id_fkey(first_name, last_name, bio, profile_image_url),
        category:article_categories!articles_category_id_fkey(name, color)
      `)
      .eq('status', 'published')
      .eq('language', language)
      .or(`title.ilike.%${query}%,excerpt.ilike.%${query}%,content.ilike.%${query}%`)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error searching articles:', error);
      return [];
    }

    // Transform the data
    const transformedData = data?.map(article => ({
      ...article,
      language: 'ar' as const, // Default to Arabic for now
      author: article.author ? {
        ...article.author,
        name: `${article.author.first_name || ''} ${article.author.last_name || ''}`.trim() || 'مؤلف غير معروف',
        avatar: article.author.profile_image_url
      } : {
        id: 'unknown',
        name: 'مؤلف غير معروف',
        avatar: null,
        first_name: '',
        last_name: '',
        profile_image_url: null
      }
    })) || [];

    return transformedData as ArticleWithDetails[];
  }

  // Get featured articles
  async getFeaturedArticles(limit: number = 3): Promise<ArticleWithDetails[]> {
    const { data, error } = await supabase
      .from('articles')
      .select(`
        *,
        author:users!articles_author_id_fkey(first_name, last_name, bio, profile_image_url),
        category:article_categories!articles_category_id_fkey(name, color)
      `)
      .eq('status', 'published')
      .eq('featured', true)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching featured articles:', error);
      return [];
    }

    // Transform the data
    const transformedData = data?.map(article => ({
      ...article,
      language: 'ar' as const, // Default to Arabic for now
      author: article.author ? {
        ...article.author,
        name: `${article.author.first_name || ''} ${article.author.last_name || ''}`.trim() || 'مؤلف غير معروف',
        avatar: article.author.profile_image_url
      } : {
        id: 'unknown',
        name: 'مؤلف غير معروف',
        avatar: null,
        first_name: '',
        last_name: '',
        profile_image_url: null
      }
    })) || [];

    return transformedData as ArticleWithDetails[];
  }

  // Get all available tags for a specific language
  async getAllTags(language: 'ar' | 'en' = 'ar'): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('tags')
        .eq('status', 'published')
        .eq('language', language);

      if (error) {
        console.error('Error fetching tags:', error);
        throw error;
      }

      // Extract all unique tags
      const allTags = new Set<string>();
      data?.forEach(article => {
        if (article.tags && Array.isArray(article.tags)) {
          article.tags.forEach(tag => allTags.add(tag));
        }
      });

      return Array.from(allTags).sort();
    } catch (error) {
      console.error('Error in getAllTags:', error);
      return [];
    }
  }

  // Get popular tags with article count
  async getPopularTags(language: 'ar' | 'en' = 'ar', limit: number = 20): Promise<Array<{tag: string, count: number}>> {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('tags')
        .eq('status', 'published')
        .eq('language', language);

      if (error) {
        console.error('Error fetching popular tags:', error);
        throw error;
      }

      // Count tag occurrences
      const tagCounts = new Map<string, number>();
      data?.forEach(article => {
        if (article.tags && Array.isArray(article.tags)) {
          article.tags.forEach(tag => {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
          });
        }
      });

      // Convert to array and sort by count
      return Array.from(tagCounts.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (error) {
      console.error('Error in getPopularTags:', error);
      return [];
    }
  }

  // Search articles by tag
  async getArticlesByTag(tag: string, language: 'ar' | 'en' = 'ar', limit: number = 12): Promise<ArticleWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select(`
          *,
          author:users!articles_author_id_fkey(first_name, last_name, bio, profile_image_url),
          category:article_categories!articles_category_id_fkey(name, color)
        `)
        .eq('status', 'published')
        .eq('language', language)
        .contains('tags', [tag])
        .order('published_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching articles by tag:', error);
        throw error;
      }

      // Transform the data
      const transformedData = data?.map(article => ({
        ...article,
        author: article.author ? {
          ...article.author,
          name: `${article.author.first_name || ''} ${article.author.last_name || ''}`.trim() || 'مؤلف غير معروف',
          avatar: article.author.profile_image_url
        } : {
          id: 'unknown',
          name: 'مؤلف غير معروف',
          avatar: null,
          first_name: '',
          last_name: '',
          profile_image_url: null
        }
      })) || [];

      return transformedData as ArticleWithDetails[];
    } catch (error) {
      console.error('Error in getArticlesByTag:', error);
      return [];
    }
  }

  // Find similar article in different language
  async findSimilarArticleInLanguage(currentArticleId: string, targetLanguage: 'ar' | 'en'): Promise<ArticleWithDetails | null> {
    try {
      // First get the current article to understand its category and tags
      const currentArticle = await this.getArticleById(currentArticleId);
      if (!currentArticle) return null;

      // Search for articles in target language with same category or similar tags
      const { data, error } = await supabase
        .from('articles')
        .select(`
          *,
          author:users!articles_author_id_fkey(first_name, last_name, bio, profile_image_url),
          category:article_categories!articles_category_id_fkey(name, color)
        `)
        .eq('status', 'published')
        .eq('language', targetLanguage)
        .eq('category_id', currentArticle.category_id)
        .order('published_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error finding similar article:', error);
        return null;
      }

      if (data && data.length > 0) {
        const article = data[0];
        return {
          ...article,
          author: article.author ? {
            ...article.author,
            name: `${article.author.first_name || ''} ${article.author.last_name || ''}`.trim() || 'مؤلف غير معروف',
            avatar: article.author.profile_image_url
          } : {
            id: 'unknown',
            name: 'مؤلف غير معروف',
            avatar: null,
            first_name: '',
            last_name: '',
            profile_image_url: null
          }
        } as ArticleWithDetails;
      }

      return null;
    } catch (error) {
      console.error('Error in findSimilarArticleInLanguage:', error);
      return null;
    }
  }

  // Fix likes count for all articles (sync with actual likes from article_likes table)
  async fixAllArticlesLikesCount(): Promise<void> {
    try {
      // Get all articles
      const { data: articles, error: articlesError } = await supabase
        .from('articles')
        .select('id');

      if (articlesError) {
        throw articlesError;
      }

      if (!articles) return;

      // Update likes count for each article
      for (const article of articles) {
        const { count: likesCount, error: countError } = await supabase
          .from('article_likes')
          .select('*', { count: 'exact', head: true })
          .eq('article_id', article.id);

        if (countError) {
          console.error(`Error counting likes for article ${article.id}:`, countError);
          continue;
        }

        const { error: updateError } = await supabase
          .from('articles')
          .update({ likes: likesCount || 0 })
          .eq('id', article.id);

        if (updateError) {
          console.error(`Error updating likes count for article ${article.id}:`, updateError);
        }
      }

      console.log('Successfully fixed likes count for all articles');
    } catch (error) {
      console.error('Error fixing articles likes count:', error);
    }
  }
}

export const articleService = new ArticleService();
