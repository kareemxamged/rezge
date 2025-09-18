import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Calendar,
  User,
  FileText,
  Shield,
  MessageSquare,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';

interface Report {
  id: string;
  reason: string;
  description: string;
  severity: string;
  status: string;
  admin_notes: string;
  created_at: string;
  updated_at: string;
  reviewed_at: string;
  reported_user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  reviewer?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

const ReportDetailsPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user || !reportId) {
      navigate('/login');
      return;
    }
    fetchReportDetails();
  }, [user, reportId]);

  const copyReportId = async () => {
    if (!report) return;

    try {
      await navigator.clipboard.writeText(report.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy report ID:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = report.id;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  const fetchReportDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reports')
        .select(`
          id,
          reason,
          description,
          severity,
          status,
          admin_notes,
          created_at,
          updated_at,
          reviewed_at,
          reported_user:users!reports_reported_user_id_fkey(
            id,
            first_name,
            last_name,
            email
          ),
          reviewer:users!reports_reviewed_by_fkey(
            first_name,
            last_name,
            email
          )
        `)
        .eq('id', reportId)
        .eq('reporter_id', user!.id)
        .single();

      if (error) {
        console.error('Error fetching report:', error);
        setError(t('reportDetails.error.notFound'));
        return;
      }

      // إصلاح أنواع البيانات للمصفوفات
      const fixedData = {
        ...data,
        reported_user: Array.isArray(data.reported_user) ? data.reported_user[0] : data.reported_user,
        reviewer: Array.isArray(data.reviewer) ? data.reviewer[0] : data.reviewer
      };
      setReport(fixedData);
    } catch (err) {
      console.error('Error:', err);
      setError(t('reportDetails.error.general'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      pending: {
        label: t('reportDetails.status.pending.label'),
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        icon: Clock,
        description: t('reportDetails.status.pending.description')
      },
      reviewing: {
        label: t('reportDetails.status.reviewing.label'),
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        icon: Eye,
        description: t('reportDetails.status.reviewing.description')
      },
      resolved: {
        label: t('reportDetails.status.resolved.label'),
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        icon: CheckCircle,
        description: t('reportDetails.status.resolved.description')
      },
      rejected: {
        label: t('reportDetails.status.rejected.label'),
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        icon: XCircle,
        description: t('reportDetails.status.rejected.description')
      }
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

  const getReasonLabel = (reason: string) => {
    const reasonKey = `reportDetails.reasons.${reason}`;
    return t(reasonKey, { defaultValue: reason });
  };

  const getSeverityConfig = (severity: string) => {
    const configs = {
      low: { label: t('reportDetails.severity.low'), color: 'text-green-600', bgColor: 'bg-green-100' },
      medium: { label: t('reportDetails.severity.medium'), color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
      high: { label: t('reportDetails.severity.high'), color: 'text-red-600', bgColor: 'bg-red-100' }
    };
    return configs[severity as keyof typeof configs] || configs.medium;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">{t('reportDetails.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('reportDetails.error.title')}</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/notifications')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('reportDetails.error.backToNotifications')}
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(report.status);
  const severityConfig = getSeverityConfig(report.severity);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/notifications')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isRTL ? (
                <ArrowRight className="w-5 h-5 text-gray-600" />
              ) : (
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              )}
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t('reportDetails.pageTitle')}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500">{t('reportDetails.reportId')}:</span>
                <button
                  onClick={copyReportId}
                  className="text-sm text-blue-600 hover:text-blue-800 font-mono bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors flex items-center gap-1 group"
                  title={copied ? (isRTL ? 'تم النسخ!' : 'Copied!') : (isRTL ? 'انقر لنسخ معرف البلاغ' : 'Click to copy report ID')}
                >
                  <span className="select-all">{report.id}</span>
                  {copied ? (
                    <Check className="w-3 h-3 text-green-600" />
                  ) : (
                    <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-3 rounded-full ${statusConfig.bgColor}`}>
                <StatusIcon className={`w-6 h-6 ${statusConfig.color}`} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('reportDetails.status.title')}</h2>
                <p className={`font-medium ${statusConfig.color}`}>{statusConfig.label}</p>
              </div>
            </div>
            <p className="text-gray-600">{statusConfig.description}</p>
          </div>

          {/* Report Details */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {t('reportDetails.details.title')}
            </h3>
            
            <div className="space-y-4">
              {/* Reported User */}
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="font-medium text-gray-900">{t('reportDetails.details.reportedUser')}</p>
                  <p className="text-gray-600">
                    {report.reported_user.first_name} {report.reported_user.last_name}
                  </p>
                </div>
              </div>

              {/* Reason */}
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="font-medium text-gray-900">{t('reportDetails.details.reason')}</p>
                  <p className="text-gray-600">{getReasonLabel(report.reason)}</p>
                </div>
              </div>

              {/* Severity */}
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="font-medium text-gray-900">{t('reportDetails.details.severity')}</p>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${severityConfig.bgColor} ${severityConfig.color}`}>
                    {severityConfig.label}
                  </span>
                </div>
              </div>

              {/* Description */}
              {report.description && (
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="font-medium text-gray-900">{t('reportDetails.details.description')}</p>
                    <p className="text-gray-600 whitespace-pre-wrap">{report.description}</p>
                  </div>
                </div>
              )}

              {/* Created Date */}
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="font-medium text-gray-900">{t('reportDetails.details.createdDate')}</p>
                  <p className="text-gray-600">
                    {new Date(report.created_at).toLocaleDateString('en-GB', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Response */}
          {(report.status === 'resolved' || report.status === 'rejected') && report.admin_notes && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {t('reportDetails.adminResponse.title')}
              </h3>

              <div className="space-y-4">
                {report.reviewer && (
                  <div>
                    <p className="font-medium text-gray-900">{t('reportDetails.adminResponse.reviewedBy')}</p>
                    <p className="text-gray-600">
                      {report.reviewer.first_name} {report.reviewer.last_name}
                    </p>
                  </div>
                )}

                {report.reviewed_at && (
                  <div>
                    <p className="font-medium text-gray-900">{t('reportDetails.adminResponse.reviewDate')}</p>
                    <p className="text-gray-600">
                      {new Date(report.reviewed_at).toLocaleDateString('en-GB', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      })}
                    </p>
                  </div>
                )}

                <div>
                  <p className="font-medium text-gray-900">{t('reportDetails.adminResponse.adminNotes')}</p>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">{report.admin_notes}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('reportDetails.timeline.title')}</h3>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="font-medium text-gray-900">{t('reportDetails.timeline.created')}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(report.created_at).toLocaleDateString('en-GB', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    })}
                  </p>
                </div>
              </div>

              {report.status !== 'pending' && (
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    report.status === 'reviewing' ? 'bg-yellow-500' :
                    report.status === 'resolved' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {report.status === 'reviewing' ? t('reportDetails.timeline.reviewStarted') :
                       report.status === 'resolved' ? t('reportDetails.timeline.accepted') : t('reportDetails.timeline.rejected')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(report.updated_at).toLocaleDateString('en-GB', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDetailsPage;
