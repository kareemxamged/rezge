import React, { useState, useEffect } from 'react';
import {
  Shield,
  Ban,
  CheckCircle,
  AlertTriangle,
  Edit,
  Mail,
  Key,
  UserCheck,
  FileText,
  Clock,
  User,
  Calendar,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface AdminAction {
  id: string;
  target_user_id: string;
  admin_user_id: string;
  action_type: string;
  action_title: string;
  action_description?: string;
  reason?: string;
  details?: any;
  old_values?: any;
  new_values?: any;
  status: string;
  related_action_id?: string;
  admin_ip_address?: string;
  admin_user_agent?: string;
  created_at: string;
  updated_at: string;
  admin_user?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface AdminActionsLogProps {
  userId: string;
  className?: string;
}

const AdminActionsLog: React.FC<AdminActionsLogProps> = ({ userId, className = '' }) => {
  const [actions, setActions] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAdminActions();
  }, [userId]);

  const fetchAdminActions = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('admin_actions')
        .select(`
          *,
          admin_user:users!admin_actions_admin_user_id_fkey(first_name, last_name, email)
        `)
        .eq('target_user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching admin actions:', error);
        setError('حدث خطأ في جلب سجل الإجراءات');
        return;
      }

      setActions(data || []);
    } catch (error) {
      console.error('Error in fetchAdminActions:', error);
      setError('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'user_banned':
        return <Ban className="w-5 h-5 text-red-600" />;
      case 'user_unbanned':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'user_suspended':
        return <Clock className="w-5 h-5 text-orange-600" />;
      case 'user_activated':
        return <UserCheck className="w-5 h-5 text-green-600" />;
      case 'user_deactivated':
        return <Ban className="w-5 h-5 text-gray-600" />;
      case 'profile_updated':
        return <Edit className="w-5 h-5 text-blue-600" />;
      case 'email_updated':
        return <Mail className="w-5 h-5 text-blue-600" />;
      case 'password_reset':
        return <Key className="w-5 h-5 text-purple-600" />;
      case 'role_updated':
        return <Shield className="w-5 h-5 text-indigo-600" />;
      case 'verification_updated':
        return <CheckCircle className="w-5 h-5 text-teal-600" />;
      case 'report_resolved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'report_rejected':
        return <Ban className="w-5 h-5 text-red-600" />;
      case 'warning_issued':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'note_added':
        return <FileText className="w-5 h-5 text-gray-600" />;
      default:
        return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'user_banned':
      case 'user_suspended':
      case 'report_rejected':
        return 'border-red-200 bg-red-50';
      case 'user_unbanned':
      case 'user_activated':
      case 'report_resolved':
        return 'border-green-200 bg-green-50';
      case 'warning_issued':
        return 'border-yellow-200 bg-yellow-50';
      case 'profile_updated':
      case 'email_updated':
        return 'border-blue-200 bg-blue-50';
      case 'password_reset':
        return 'border-purple-200 bg-purple-50';
      case 'role_updated':
        return 'border-indigo-200 bg-indigo-50';
      case 'verification_updated':
        return 'border-teal-200 bg-teal-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const toggleActionExpansion = (actionId: string) => {
    const newExpanded = new Set(expandedActions);
    if (newExpanded.has(actionId)) {
      newExpanded.delete(actionId);
    } else {
      newExpanded.add(actionId);
    }
    setExpandedActions(newExpanded);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('ar-EG'),
      time: date.toLocaleTimeString('ar-EG', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  const renderActionDetails = (action: AdminAction) => {
    const isExpanded = expandedActions.has(action.id);
    
    return (
      <div className={`border rounded-lg p-4 mb-4 ${getActionColor(action.action_type)}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex-shrink-0 mt-1">
              {getActionIcon(action.action_type)}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 mb-1">
                  {action.action_title}
                </h4>
                <button
                  onClick={() => toggleActionExpansion(action.id)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>
                    {action.admin_user?.first_name} {action.admin_user?.last_name}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {formatDate(action.created_at).date} - {formatDate(action.created_at).time}
                  </span>
                </div>
              </div>
              
              {action.reason && (
                <div className="text-sm text-gray-700 mb-2">
                  <strong>السبب:</strong> {action.reason}
                </div>
              )}
              
              {isExpanded && (
                <div className="mt-3 space-y-3 border-t pt-3">
                  {action.action_description && (
                    <div className="text-sm text-gray-700">
                      <strong>التفاصيل:</strong> {action.action_description}
                    </div>
                  )}
                  
                  {action.old_values && action.new_values && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-red-50 p-3 rounded border border-red-200">
                        <h5 className="font-medium text-red-800 mb-2">القيم القديمة:</h5>
                        <pre className="text-xs text-red-700 whitespace-pre-wrap">
                          {JSON.stringify(action.old_values, null, 2)}
                        </pre>
                      </div>
                      <div className="bg-green-50 p-3 rounded border border-green-200">
                        <h5 className="font-medium text-green-800 mb-2">القيم الجديدة:</h5>
                        <pre className="text-xs text-green-700 whitespace-pre-wrap">
                          {JSON.stringify(action.new_values, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                  
                  {action.details && Object.keys(action.details).length > 0 && (
                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                      <h5 className="font-medium text-gray-800 mb-2">معلومات إضافية:</h5>
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(action.details, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {action.admin_ip_address && (
                    <div className="text-xs text-gray-500">
                      <strong>عنوان IP:</strong> {action.admin_ip_address}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="mr-3 text-gray-600">جاري تحميل سجل الإجراءات...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          سجل الإجراءات الإدارية
        </h3>
        <p className="text-sm text-gray-600">
          جميع الإجراءات التي تمت على هذا الحساب من قبل الأدمنز
        </p>
      </div>

      {actions.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">لا توجد إجراءات إدارية مسجلة لهذا المستخدم</p>
        </div>
      ) : (
        <div className="space-y-4">
          {actions.map((action) => (
            <div key={action.id}>
              {renderActionDetails(action)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminActionsLog;
