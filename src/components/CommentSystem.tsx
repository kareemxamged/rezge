import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  User,
  Heart,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Reply,
  MoreHorizontal,
  Copy,
  Trash2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './ToastContainer';
import { articleService } from '../services/articleService';
import DeleteConfirmModal from './DeleteConfirmModal';
import VerificationBadge from './VerificationBadge';

interface CommentAuthor {
  id: string;
  name: string;
  avatar?: string;
  verified?: boolean;
}

interface Comment {
  id: string;
  content: string;
  author: CommentAuthor;
  created_at: string;
  likes: number;
  isLiked?: boolean;
  parent_id?: string;
  parentAuthor?: string;
  replies?: Comment[];
  repliesCount?: number;
}

interface CommentSystemProps {
  articleId: string;
  className?: string;
}

interface CommentItemProps {
  comment: Comment;
  level: number;
  onReply: (commentId: string, parentAuthor?: string) => void;
  onLike: (commentId: string) => void;
  onLoadReplies: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onCopy: (content: string) => void;
  isAuthenticated: boolean;
  replyingTo?: string;
  onCancelReply: () => void;
  onSubmitReply: (content: string, parentId: string) => void;
  currentUserId?: string;
  expandReplies?: boolean;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  level,
  onReply,
  onLike,
  onLoadReplies,
  onDelete,
  onCopy,
  isAuthenticated,
  replyingTo,
  onCancelReply,
  onSubmitReply,
  currentUserId,
  expandReplies = false
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [showReplies, setShowReplies] = useState(expandReplies || (comment.replies && comment.replies.length > 0));
  const [showAllReplies, setShowAllReplies] = useState(false);

  // إظهار الردود تلقائياً عند وجود ردود جديدة أو عند التوسيع
  React.useEffect(() => {
    if (expandReplies) {
      setShowReplies(true);
    }
  }, [expandReplies]);

  // إظهار الردود تلقائياً إذا كان هناك ردود وكان المستوى الأول (فقط عند التحميل الأول)
  const [hasAutoExpanded, setHasAutoExpanded] = React.useState(false);

  React.useEffect(() => {
    if (level === 0 && comment.replies && comment.replies.length > 0 && !hasAutoExpanded) {
      setShowReplies(true);
      setHasAutoExpanded(true);
    }
  }, [comment.replies, level, hasAutoExpanded]);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  const maxLevel = 3; // أقصى مستوى للردود
  const maxVisibleReplies = 2; // عدد الردود المرئية افتراضياً

  // إغلاق قائمة الخيارات عند النقر خارجها
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showOptionsMenu && !target.closest('.options-menu-container')) {
        setShowOptionsMenu(false);
      }
    };

    if (showOptionsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOptionsMenu]);

  const formatDate = (dateString: string) => {
    if (!dateString) return t('common.unknown');

    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

      if (diffInMinutes < 1) return t('comments.justNow');
      if (diffInMinutes < 60) return t('comments.minutesAgo', { count: diffInMinutes });
      if (diffInMinutes < 1440) return t('comments.hoursAgo', { count: Math.floor(diffInMinutes / 60) });
      if (diffInMinutes < 10080) return t('comments.daysAgo', { count: Math.floor(diffInMinutes / 1440) });

      // استخدام التقويم الميلادي دائماً
      return date.toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
        calendar: 'gregory', // التقويم الميلادي
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return t('common.unknown');
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    setSubmittingReply(true);
    try {
      await onSubmitReply(replyContent.trim(), comment.id);
      setReplyContent('');
      onCancelReply();
    } catch (error) {
      console.error('Error submitting reply:', error);
    } finally {
      setSubmittingReply(false);
    }
  };

  const toggleReplies = () => {
    setShowReplies(!showReplies);
  };

  const visibleReplies = showAllReplies 
    ? comment.replies || []
    : (comment.replies || []).slice(0, maxVisibleReplies);

  const hasMoreReplies = (comment.replies || []).length > maxVisibleReplies;

  return (
    <div className={`comment-item relative ${level > 0 ? 'reply-item' : ''} ${level === 0 ? 'border-b border-slate-100 pb-6 last:border-b-0' : ''}`}>
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-gradient-to-r from-primary-400 to-emerald-400 rounded-full flex items-center justify-center shadow-sm">
            <User className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Comment Content */}
        <div className="flex-1 min-w-0">
          {/* Reply indicator for nested comments - only show for replies to replies */}
          {level > 0 && comment.parent_id && comment.parentAuthor && (
            <div className="reply-indicator flex items-center gap-2 mb-2 p-2 bg-gradient-to-r from-primary-50 to-emerald-50 rounded-lg border-r-2 border-primary-200">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center shadow-sm">
                  <Reply className="w-3 h-3 text-primary-600" />
                </div>
                <span className="text-slate-500">{t('comments.replyingTo')}</span>
                <span className="font-medium text-slate-700 bg-white px-2 py-1 rounded-md border shadow-sm">
                  {comment.parentAuthor}
                </span>
              </div>
            </div>
          )}

          {/* Author and Date */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-slate-800 text-base">{comment.author.name}</h4>
              {comment.author.verified && (
                <VerificationBadge
                  isVerified={true}
                  size="sm"
                  className="scale-75"
                />
              )}
            </div>
            <span className="text-sm text-slate-500 comment-meta">
              {formatDate(comment.created_at)}
            </span>
          </div>

          {/* Comment Text */}
          <div className="mb-5">
            <p className="text-slate-700 comment-content text-base leading-relaxed">{comment.content}</p>
          </div>

          {/* Actions */}
          <div className="comment-actions flex items-center gap-2 mb-4">
            <button
              onClick={() => onLike(comment.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                comment.isLiked
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-slate-50 text-slate-600 hover:bg-red-50 hover:text-red-600'
              }`}
              disabled={!isAuthenticated}
              title={!isAuthenticated ? t('articles.loginToLikeComment') : ''}
            >
              <Heart className={`w-4 h-4 transition-all duration-200 ${comment.isLiked ? 'fill-current' : ''}`} />
              <span>{comment.likes}</span>
            </button>

            {level < maxLevel && isAuthenticated && (
              <button
                onClick={() => onReply(comment.id, comment.author.name)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-slate-50 text-slate-600 hover:bg-primary-50 hover:text-primary-600 transition-all duration-200"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{t('comments.reply')}</span>
              </button>
            )}

            <div className="relative options-menu-container">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowOptionsMenu(!showOptionsMenu);
                }}
                className="flex items-center justify-center w-10 h-10 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {showOptionsMenu && (
                <div className={`absolute top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-[9999] min-w-48 overflow-hidden ${
                  isRTL ? 'right-0' : 'left-0'
                }`}>
                  <div className="py-1">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Copy button clicked:', comment.content);
                        onCopy(comment.content);
                        setShowOptionsMenu(false);
                      }}
                      className={`w-full px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors duration-200 ${
                        isRTL ? 'text-right justify-start' : 'text-left justify-start'
                      }`}
                    >
                      <Copy className="w-4 h-4" />
                      <span className="font-medium">{t('comments.copyContent')}</span>
                    </button>

                    {currentUserId === comment.author.id && (
                      <>
                        <div className="border-t border-slate-100"></div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDelete(comment.id);
                            setShowOptionsMenu(false);
                          }}
                          className={`w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors duration-200 ${
                            isRTL ? 'text-right justify-start' : 'text-left justify-start'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="font-medium">{t('comments.deleteComment')}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reply Form */}
          {replyingTo === comment.id && (
            <div className="reply-form mb-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200">
              <form onSubmit={handleReplySubmit}>
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={t('comments.replyPlaceholder')}
                  className="w-full p-3 border border-slate-300 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                  rows={3}
                  disabled={submittingReply}
                  autoFocus
                />
                <div className="flex items-center gap-3 mt-3">
                  <button
                    type="submit"
                    disabled={!replyContent.trim() || submittingReply}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
                  >
                    {submittingReply ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {t('common.loading')}
                      </div>
                    ) : (
                      t('comments.submitReply')
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={onCancelReply}
                    className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-all duration-200 text-sm"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Replies Toggle */}
          {(comment.repliesCount || 0) > 0 && (
            <div className="mb-3">
              <button
                onClick={toggleReplies}
                className="replies-toggle-button flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 px-3 py-2 rounded-lg transition-all duration-200 group"
              >
                {showReplies ? (
                  <>
                    <ChevronUp className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span className="font-medium">{t('comments.hideReplies')}</span>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                      {comment.repliesCount}
                    </span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span className="font-medium">{t('comments.showReplies', { count: comment.repliesCount })}</span>
                    <div className="flex items-center gap-1">
                      {/* Preview avatars of reply authors */}
                      <div className="avatar-stack flex -space-x-1">
                        {[...Array(Math.min(3, comment.repliesCount || 0))].map((_, i) => (
                          <div
                            key={i}
                            className="w-5 h-5 bg-gradient-to-r from-primary-300 to-emerald-400 rounded-full border border-white flex items-center justify-center shadow-sm"
                          >
                            <User className="w-2.5 h-2.5 text-white" />
                          </div>
                        ))}
                        {(comment.repliesCount || 0) > 3 && (
                          <div className="w-5 h-5 bg-gradient-to-r from-slate-400 to-slate-500 rounded-full border border-white flex items-center justify-center text-xs text-white font-medium shadow-sm">
                            +{(comment.repliesCount || 0) - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Replies */}
          {showReplies && comment.replies && comment.replies.length > 0 && (
            <div className="replies-container space-y-4 border-r-2 border-slate-100 pr-4 mr-2 mt-4">
              {visibleReplies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  level={level + 1}
                  onReply={onReply}
                  onLike={onLike}
                  onLoadReplies={onLoadReplies}
                  onDelete={onDelete}
                  onCopy={onCopy}
                  isAuthenticated={isAuthenticated}
                  replyingTo={replyingTo}
                  onCancelReply={onCancelReply}
                  onSubmitReply={onSubmitReply}
                  currentUserId={currentUserId}
                  expandReplies={false}
                />
              ))}

              {/* Show More/Less Replies */}
              {hasMoreReplies && (
                <div className="pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setShowAllReplies(!showAllReplies)}
                    className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 px-3 py-2 rounded-lg transition-all duration-200 font-medium"
                  >
                    {showAllReplies ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        {t('comments.showLessReplies')}
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        {t('comments.showMoreReplies', {
                          count: (comment.replies || []).length - maxVisibleReplies
                        })}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CommentSystem: React.FC<CommentSystemProps> = ({ articleId, className = '' }) => {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string>('');
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    commentId: string;
    isReply: boolean;
  }>({ isOpen: false, commentId: '', isReply: false });

  useEffect(() => {
    loadComments();
  }, [articleId, isAuthenticated, user]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const commentsData = await articleService.getComments(articleId);

      // تحويل البيانات للتنسيق المطلوب مع التحقق من الإعجابات
      const processComment = async (comment: any): Promise<Comment> => {
        let isLiked = false;
        if (isAuthenticated && user) {
          isLiked = await articleService.checkUserLikedComment(comment.id, user.id);
        }

        const processedReplies = comment.replies ?
          await Promise.all(comment.replies.map(processComment)) : [];

        // التأكد من وجود بيانات المستخدم
        let userName = 'مستخدم مجهول';
        let userId = comment.user_id || comment.id;

        if (comment.user) {
          const firstName = comment.user.first_name || '';
          const lastName = comment.user.last_name || '';
          if (firstName || lastName) {
            userName = `${firstName} ${lastName}`.trim();
          }
          userId = comment.user.id || comment.user_id || comment.id;
        }



        return {
          id: comment.id,
          content: comment.content || '',
          author: {
            id: userId,
            name: userName,
            verified: comment.user?.verified === true
          },
          created_at: comment.created_at,
          likes: comment.likes || 0,
          isLiked,
          parent_id: comment.parent_id,
          parentAuthor: comment.parentAuthor,
          replies: processedReplies,
          repliesCount: processedReplies.length
        };
      };

      const formattedComments = await Promise.all(
        commentsData.map(processComment)
      );

      setComments(formattedComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !user || !newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const addedComment = await articleService.addComment(
        articleId,
        user.id,
        newComment.trim()
      );

      if (addedComment) {
        await loadComments(); // إعادة تحميل التعليقات من قاعدة البيانات
        setNewComment('');
        showSuccess(
          t('comments.commentAdded'),
          t('comments.commentAddedDesc')
        );
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      showError(
        t('comments.commentError'),
        t('comments.commentErrorDesc')
      );
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReply = (commentId: string) => {
    setReplyingTo(commentId);
  };

  const handleCancelReply = () => {
    setReplyingTo('');
  };

  const handleSubmitReply = async (content: string, parentId: string) => {
    if (!isAuthenticated || !user) return;

    try {
      const addedReply = await articleService.addComment(
        articleId,
        user.id,
        content,
        parentId
      );

      if (addedReply) {
        // إضافة التعليق الأب إلى قائمة التعليقات الموسعة
        setExpandedComments(prev => new Set([...prev, parentId]));

        // إعادة تحميل التعليقات من قاعدة البيانات للحصول على البيانات الكاملة
        await loadComments();

        // إلغاء وضع الرد
        setReplyingTo('');

        showSuccess(
          t('comments.replyAdded'),
          t('comments.replyAddedDesc')
        );
      }
    } catch (error) {
      console.error('Error submitting reply:', error);
      showError(
        t('comments.replyError'),
        t('comments.replyErrorDesc')
      );
    }
  };

  const handleLike = async (commentId: string) => {
    if (!isAuthenticated || !user) {
      showWarning(
        t('comments.authRequired'),
        t('comments.loginToLikeDesc')
      );
      return;
    }

    try {
      const result = await articleService.toggleCommentLike(commentId, user.id);

      // تحديث التعليقات محلياً
      setComments(prevComments =>
        prevComments.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              likes: result.totalLikes,
              isLiked: result.liked
            };
          }

          // تحديث الردود أيضاً
          if (comment.replies) {
            const updatedReplies = comment.replies.map(reply =>
              reply.id === commentId
                ? { ...reply, likes: result.totalLikes, isLiked: result.liked }
                : reply
            );
            return { ...comment, replies: updatedReplies };
          }

          return comment;
        })
      );

      // إظهار toast للإعجاب
      if (result.liked) {
        showSuccess(
          t('comments.likeAdded'),
          t('comments.likeAddedDesc')
        );
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      showError(
        t('comments.likeError'),
        t('comments.likeErrorDesc')
      );
    }
  };

  const handleLoadReplies = async () => {
    // الردود تُحمل تلقائياً مع التعليقات الآن
    console.log('Replies are loaded automatically');
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!isAuthenticated || !user) {
      showWarning(
        t('comments.authRequired'),
        t('comments.authRequiredDesc')
      );
      return;
    }

    // تحديد ما إذا كان تعليق أم رد
    const isReply = comments.some(comment =>
      comment.replies?.some(reply => reply.id === commentId)
    );

    setDeleteModal({
      isOpen: true,
      commentId,
      isReply
    });
  };

  const handleConfirmDelete = async () => {
    if (!user || !deleteModal.commentId) return;

    const success = await articleService.deleteComment(deleteModal.commentId, user.id);

    if (success) {
      // إعادة تحميل التعليقات من قاعدة البيانات
      await loadComments();
    } else {
      throw new Error('Failed to delete comment');
    }
  };

  const handleCloseDeleteModal = () => {
    setDeleteModal({ isOpen: false, commentId: '', isReply: false });
  };

  const handleCopyComment = async (content: string) => {
    try {
      console.log('Copying content:', content);

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(content);
        showSuccess(
          t('comments.copySuccess'),
          t('comments.copySuccessDesc')
        );
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = content;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showSuccess(
          t('comments.copySuccess'),
          t('comments.copySuccessDesc')
        );
      }
    } catch (error) {
      console.error('Error copying comment:', error);
      showError(
        t('comments.copyError'),
        t('comments.copyErrorDesc')
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-slate-500">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className={`comment-system ${className}`}>
      <style>{`
        .comment-item {
          transition: all 0.2s ease;
        }

        .comment-content {
          line-height: 1.8;
          font-size: 1rem;
        }

        .comment-meta {
          font-size: 0.875rem;
          opacity: 0.8;
        }

        .reply-item {
          position: relative;
        }

        .reply-item::before {
          content: '';
          position: absolute;
          right: -1rem;
          top: 0;
          bottom: 0;
          width: 3px;
          background: linear-gradient(to bottom, #059669, #10b981, transparent);
          border-radius: 2px;
        }

        .reply-item::after {
          content: '';
          position: absolute;
          right: -1rem;
          top: 2rem;
          width: 1rem;
          height: 2px;
          background: linear-gradient(to left, #059669, transparent);
          border-radius: 1px;
        }

        .comment-system .space-y-6 > * + * {
          margin-top: 1.5rem;
        }

        .comment-actions {
          opacity: 1;
          /* إزالة تأثير hover */
        }

        .reply-form {
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .replies-container {
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .reply-indicator {
          animation: slideInRight 0.3s ease-out;
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .replies-toggle-button {
          transition: all 0.2s ease;
        }

        .replies-toggle-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .avatar-stack {
          animation: bounceIn 0.4s ease-out;
        }

        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>



      {/* Add Comment Form */}
      {isAuthenticated ? (
        <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-2xl p-8 mb-10 shadow-sm">
          <form onSubmit={handleCommentSubmit}>
            <div className="mb-6">
              <label htmlFor="comment" className="block text-lg font-semibold text-slate-800 mb-4">
                {t('articles.addComment')}
              </label>
              <textarea
                id="comment"
                rows={4}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={t('articles.commentPlaceholder')}
                className="w-full px-5 py-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none transition-all duration-200 text-base leading-relaxed"
                disabled={submittingComment}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                {t('articles.commentGuidelines')}
              </span>
              <button
                type="submit"
                disabled={!newComment.trim() || submittingComment}
                className="bg-gradient-to-r from-primary-600 to-emerald-600 text-white px-8 py-3 rounded-xl hover:from-primary-700 hover:to-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-sm"
              >
                {submittingComment ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {t('common.loading')}
                  </div>
                ) : (
                  t('articles.submitComment')
                )}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Comments List */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        {isAuthenticated ? (
          <div className="p-8">
            {comments.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageCircle className="w-12 h-12 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-3">
                  {t('articles.noComments')}
                </h3>
                <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                  {t('articles.noCommentsDesc')}
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                  <h3 className="text-xl font-semibold text-slate-800">
                    {t('articles.allComments')}
                  </h3>
                  <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                    {comments.length} {t('articles.commentsCount')}
                  </span>
                </div>

                {comments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    level={0}
                    onReply={handleReply}
                    onLike={handleLike}
                    onLoadReplies={handleLoadReplies}
                    onDelete={handleDeleteComment}
                    onCopy={handleCopyComment}
                    isAuthenticated={isAuthenticated}
                    replyingTo={replyingTo}
                    onCancelReply={handleCancelReply}
                    onSubmitReply={handleSubmitReply}
                    currentUserId={user?.id}
                    expandReplies={expandedComments.has(comment.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 p-8 bg-gradient-to-r from-slate-50 to-slate-100">
            <div className="w-20 h-20 bg-gradient-to-r from-slate-300 to-slate-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageCircle className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">
              {t('articles.loginToComment')}
            </h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              {t('articles.loginToCommentDesc')}
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-600 to-emerald-600 text-white px-8 py-3 rounded-xl hover:from-primary-700 hover:to-emerald-700 transition-all duration-200 font-medium shadow-sm"
            >
              <User className="w-5 h-5" />
              {t('common.login')}
            </Link>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title={deleteModal.isReply ? t('comments.confirmDeleteReply') : t('comments.confirmDeleteComment')}
        message={deleteModal.isReply ? t('comments.deleteReplyMessage') : t('comments.deleteCommentMessage')}
        itemType={deleteModal.isReply ? 'reply' : 'comment'}
      />
    </div>
  );
};

export default CommentSystem;
