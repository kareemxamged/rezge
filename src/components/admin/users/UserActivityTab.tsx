import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Heart,
  MessageCircle,
  ThumbsUp,
  Mail,

  AlertTriangle,
  UserPlus,
  Key,
  Phone,
  AtSign,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface UserActivityProps {
  userId: string;
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  details?: any;
}

const UserActivityTab: React.FC<UserActivityProps> = ({ userId }) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // دالة مساعدة لاستخراج البيانات من المصفوفات أو الكائنات
  const extractData = (data: any) => {
    return Array.isArray(data) ? data[0] : data;
  };

  useEffect(() => {
    fetchUserActivities();
  }, [userId]);

  const fetchUserActivities = async () => {
    try {
      setLoading(true);
      setError(null);

      const activities: ActivityItem[] = [];

      // 1. جلب الرسائل المرسلة (بدون المحتوى)
      const { data: messages } = await supabase
        .from('messages')
        .select(`
          id,
          created_at,
          conversation_id,
          conversations!inner(
            user1_id,
            user2_id,
            user1:users!conversations_user1_id_fkey(first_name, last_name),
            user2:users!conversations_user2_id_fkey(first_name, last_name)
          )
        `)
        .eq('sender_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (messages) {
        messages.forEach(msg => {
          const conversation = extractData(msg.conversations);
          const otherUser = conversation?.user1_id === userId ?
            extractData(conversation.user2) :
            extractData(conversation.user1);
          activities.push({
            id: `message_${msg.id}`,
            type: 'message_sent',
            description: `أرسل رسالة إلى ${otherUser?.first_name} ${otherUser?.last_name}`,
            timestamp: msg.created_at,
            details: { conversation_id: msg.conversation_id }
          });
        });
      }

      // 2. جلب الإعجابات بالمقالات
      const { data: articleLikes } = await supabase
        .from('article_likes')
        .select('id, created_at, articles(title)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (articleLikes) {
        articleLikes.forEach(like => {
          activities.push({
            id: `article_like_${like.id}`,
            type: 'article_like',
            description: `أعجب بمقالة: ${extractData(like.articles)?.title || 'مقالة محذوفة'}`,
            timestamp: like.created_at
          });
        });
      }

      // 3. جلب التعليقات على المقالات
      const { data: comments } = await supabase
        .from('article_comments')
        .select('id, created_at, articles(title)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (comments) {
        comments.forEach(comment => {
          activities.push({
            id: `comment_${comment.id}`,
            type: 'article_comment',
            description: `علق على مقالة: ${extractData(comment.articles)?.title || 'مقالة محذوفة'}`,
            timestamp: comment.created_at
          });
        });
      }

      // 4. جلب الإعجابات بالتعليقات
      const { data: commentLikes } = await supabase
        .from('comment_likes')
        .select('id, created_at, article_comments(articles(title))')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (commentLikes) {
        commentLikes.forEach(like => {
          activities.push({
            id: `comment_like_${like.id}`,
            type: 'comment_like',
            description: `أعجب بتعليق على مقالة: ${extractData(extractData(like.article_comments)?.articles)?.title || 'مقالة محذوفة'}`,
            timestamp: like.created_at
          });
        });
      }

      // 5. جلب طلبات التواصل (contact_requests)
      const { data: contactRequests } = await supabase
        .from('contact_requests')
        .select('id, created_at, request_type, receiver:users!contact_requests_receiver_id_fkey(first_name, last_name)')
        .eq('sender_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (contactRequests) {
        contactRequests.forEach(req => {
          activities.push({
            id: `contact_${req.id}`,
            type: 'contact_request',
            description: `أرسل طلب تواصل إلى ${extractData(req.receiver)?.first_name} ${extractData(req.receiver)?.last_name} - ${req.request_type || 'طلب عام'}`,
            timestamp: req.created_at
          });
        });
      }

      // 6. جلب البلاغات المرسلة
      const { data: reports } = await supabase
        .from('reports')
        .select('id, created_at, reason, users!reports_reported_user_id_fkey(first_name, last_name)')
        .eq('reporter_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (reports) {
        reports.forEach(report => {
          activities.push({
            id: `report_${report.id}`,
            type: 'report_sent',
            description: `أبلغ عن ${extractData(report.users)?.first_name} ${extractData(report.users)?.last_name} - ${getReasonLabel(report.reason)}`,
            timestamp: report.created_at
          });
        });
      }

      // 7. جلب الإعجابات بالمستخدمين (استخدام جدول likes)
      const { data: userLikes } = await supabase
        .from('likes')
        .select('id, created_at, like_type, liked_user:users!likes_liked_user_id_fkey(first_name, last_name)')
        .eq('liker_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (userLikes) {
        userLikes.forEach(like => {
          activities.push({
            id: `user_like_${like.id}`,
            type: 'user_like',
            description: `أعجب بـ ${extractData(like.liked_user)?.first_name} ${extractData(like.liked_user)?.last_name}`,
            timestamp: like.created_at
          });
        });
      }

      // 8. جلب المحادثات الجديدة
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, created_at, user1_id, user2_id, users!conversations_user1_id_fkey(first_name, last_name), users_user2:users!conversations_user2_id_fkey(first_name, last_name)')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (conversations) {
        conversations.forEach(conv => {
          const otherUser = conv.user1_id === userId ? conv.users_user2 : conv.users;
          activities.push({
            id: `conversation_${conv.id}`,
            type: 'conversation_started',
            description: `بدأ محادثة مع ${extractData(otherUser)?.first_name} ${extractData(otherUser)?.last_name}`,
            timestamp: conv.created_at
          });
        });
      }

      // ترتيب الأنشطة حسب التاريخ
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setActivities(activities);
    } catch (err) {
      console.error('Error fetching user activities:', err);
      setError('حدث خطأ في تحميل أنشطة المستخدم');
    } finally {
      setLoading(false);
    }
  };

  const getReasonLabel = (reason: string) => {
    const reasons = {
      fake_profile: 'ملف شخصي مزيف',
      inappropriate_content: 'محتوى غير مناسب',
      harassment: 'مضايقة',
      spam: 'رسائل مزعجة',
      scam: 'احتيال',
      inappropriate_behavior: 'سلوك غير مناسب',
      other: 'أخرى'
    };
    return reasons[reason as keyof typeof reasons] || reason;
  };

  const getActivityIcon = (type: string) => {
    const icons = {
      message_sent: MessageSquare,
      article_like: Heart,
      article_comment: MessageCircle,
      comment_like: ThumbsUp,
      contact_message: Mail,
      contact_request: Mail,
      report_sent: AlertTriangle,
      user_like: Heart,
      conversation_started: UserPlus,
      password_change: Key,
      email_change: AtSign,
      phone_change: Phone
    };
    return icons[type as keyof typeof icons] || Clock;
  };

  const getActivityColor = (type: string) => {
    const colors = {
      message_sent: 'text-blue-600 bg-blue-100',
      article_like: 'text-red-600 bg-red-100',
      article_comment: 'text-green-600 bg-green-100',
      comment_like: 'text-purple-600 bg-purple-100',
      contact_message: 'text-yellow-600 bg-yellow-100',
      contact_request: 'text-orange-600 bg-orange-100',
      report_sent: 'text-red-600 bg-red-100',
      user_like: 'text-pink-600 bg-pink-100',
      conversation_started: 'text-blue-600 bg-blue-100',
      password_change: 'text-gray-600 bg-gray-100',
      email_change: 'text-orange-600 bg-orange-100',
      phone_change: 'text-teal-600 bg-teal-100'
    };
    return colors[type as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500 ml-2" />
        <span className="text-gray-600">جاري تحميل أنشطة المستخدم...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchUserActivities}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">لا توجد أنشطة مسجلة لهذا المستخدم</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          نشاط المستخدم ({activities.length})
        </h3>
        <button
          onClick={fetchUserActivities}
          className="flex items-center gap-2 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          تحديث
        </button>
      </div>

      <div className="space-y-3">
        {activities.map((activity) => {
          const Icon = getActivityIcon(activity.type);
          const colorClass = getActivityColor(activity.type);
          const isExpanded = expandedItems.has(activity.id);

          return (
            <div
              key={activity.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{formatDate(activity.timestamp)}</span>
                      {activity.details && (
                        <button
                          onClick={() => toggleExpanded(activity.id)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {isExpanded && activity.details && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                      <pre>{JSON.stringify(activity.details, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UserActivityTab;
