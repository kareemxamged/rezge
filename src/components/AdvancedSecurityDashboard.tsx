import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Eye, Ban, Unlock, RefreshCw, Search, Activity, Zap, Globe, Monitor } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { deviceSecurityService } from '../lib/deviceSecurityService';

interface DeviceRecord {
  id: string;
  fingerprint_hash: string;
  device_data: any;
  first_seen: string;
  last_seen: string;
  total_attempts: number;
  failed_attempts: number;
  successful_attempts: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  is_blocked: boolean;
  blocked_until?: string;
  block_reason?: string;
  suspicious_activities: string[];
  associated_emails: string[];
}

interface SecurityEvent {
  id: string;
  device_fingerprint: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  event_data: any;
  ip_address?: string;
  user_agent?: string;
  email?: string;
  action_taken?: string;
  created_at: string;
}

const AdvancedSecurityDashboard: React.FC = () => {
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'devices' | 'events' | 'analytics'>('devices');
  const [filter, setFilter] = useState<'all' | 'blocked' | 'high_risk' | 'suspicious'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<DeviceRecord | null>(null);

  // إحصائيات عامة
  const [stats, setStats] = useState({
    totalDevices: 0,
    blockedDevices: 0,
    highRiskDevices: 0,
    securityEvents24h: 0,
    vpnDetections: 0,
    automationDetections: 0
  });

  // تحميل البيانات
  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadDevices(),
        loadSecurityEvents(),
        loadStats()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDevices = async () => {
    let query = supabase
      .from('device_fingerprints')
      .select('*')
      .order('last_seen', { ascending: false });

    // تطبيق الفلاتر
    if (filter === 'blocked') {
      query = query.eq('is_blocked', true);
    } else if (filter === 'high_risk') {
      query = query.in('risk_level', ['high', 'critical']);
    } else if (filter === 'suspicious') {
      query = query.gt('failed_attempts', 5);
    }

    const { data, error } = await query.limit(100);

    if (error) {
      console.error('Error loading devices:', error);
      return;
    }

    setDevices(data || []);
  };

  const loadSecurityEvents = async () => {
    const { data, error } = await supabase
      .from('security_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading security events:', error);
      return;
    }

    setSecurityEvents(data || []);
  };

  const loadStats = async () => {
    try {
      // إجمالي الأجهزة
      const { data: totalDevices } = await supabase
        .from('device_fingerprints')
        .select('id', { count: 'exact' });

      // الأجهزة المحظورة
      const { data: blockedDevices } = await supabase
        .from('device_fingerprints')
        .select('id', { count: 'exact' })
        .eq('is_blocked', true);

      // الأجهزة عالية الخطورة
      const { data: highRiskDevices } = await supabase
        .from('device_fingerprints')
        .select('id', { count: 'exact' })
        .in('risk_level', ['high', 'critical']);

      // الأحداث الأمنية في آخر 24 ساعة
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const { data: recentEvents } = await supabase
        .from('security_events')
        .select('id', { count: 'exact' })
        .gte('created_at', oneDayAgo.toISOString());

      // اكتشافات VPN
      const { data: vpnDetections } = await supabase
        .from('security_events')
        .select('id', { count: 'exact' })
        .eq('event_type', 'vpn_detected');

      // اكتشافات الأتمتة
      const { data: automationDetections } = await supabase
        .from('security_events')
        .select('id', { count: 'exact' })
        .eq('event_type', 'automation_detected');

      setStats({
        totalDevices: totalDevices?.length || 0,
        blockedDevices: blockedDevices?.length || 0,
        highRiskDevices: highRiskDevices?.length || 0,
        securityEvents24h: recentEvents?.length || 0,
        vpnDetections: vpnDetections?.length || 0,
        automationDetections: automationDetections?.length || 0
      });

    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleUnblockDevice = async (deviceFingerprint: string) => {
    try {
      const result = await deviceSecurityService.unblockDevice(deviceFingerprint);
      if (result.success) {
        alert('تم إلغاء حظر الجهاز بنجاح');
        loadData();
      } else {
        alert('فشل في إلغاء الحظر: ' + result.error);
      }
    } catch (error) {
      console.error('Error unblocking device:', error);
      alert('حدث خطأ أثناء إلغاء الحظر');
    }
  };

  const handleViewDeviceDetails = async (device: DeviceRecord) => {
    setSelectedDevice(device);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ar-SA');
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  const getRiskLevelLabel = (level: string) => {
    switch (level) {
      case 'critical': return 'حرج';
      case 'high': return 'عالي';
      case 'medium': return 'متوسط';
      default: return 'منخفض';
    }
  };

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'vpn_detected': 'VPN مكتشف',
      'proxy_detected': 'Proxy مكتشف',
      'automation_detected': 'أتمتة مكتشفة',
      'fingerprint_mismatch': 'عدم تطابق البصمة',
      'suspicious_behavior': 'سلوك مشبوه',
      'rate_limit_exceeded': 'تجاوز الحد المسموح'
    };
    return labels[type] || type;
  };

  const filteredDevices = devices.filter(device => {
    if (!searchTerm) return true;
    return device.fingerprint_hash.includes(searchTerm) ||
           device.associated_emails.some(email => email.includes(searchTerm)) ||
           device.block_reason?.includes(searchTerm);
  });

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">لوحة الأمان المتقدمة</h1>
          </div>

          {/* إحصائيات سريعة */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <Monitor className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">{stats.totalDevices}</div>
              <div className="text-sm text-gray-600">إجمالي الأجهزة</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <Ban className="w-6 h-6 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-600">{stats.blockedDevices}</div>
              <div className="text-sm text-gray-600">أجهزة محظورة</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg text-center">
              <AlertTriangle className="w-6 h-6 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-600">{stats.highRiskDevices}</div>
              <div className="text-sm text-gray-600">عالية الخطورة</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <Activity className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">{stats.securityEvents24h}</div>
              <div className="text-sm text-gray-600">أحداث (24س)</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <Globe className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-yellow-600">{stats.vpnDetections}</div>
              <div className="text-sm text-gray-600">VPN مكتشف</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <Zap className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">{stats.automationDetections}</div>
              <div className="text-sm text-gray-600">أتمتة مكتشفة</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('devices')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'devices'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              إدارة الأجهزة
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'events'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              الأحداث الأمنية
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              التحليلات
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-wrap gap-4 items-center">
            {activeTab === 'devices' && (
              <>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="all">جميع الأجهزة</option>
                  <option value="blocked">الأجهزة المحظورة</option>
                  <option value="high_risk">عالية الخطورة</option>
                  <option value="suspicious">مشبوهة</option>
                </select>
                
                <div className="flex gap-2">
                  <Search className="w-5 h-5 text-gray-400 mt-2" />
                  <input
                    type="text"
                    placeholder="البحث في الأجهزة..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </>
            )}
            
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4" />
              تحديث
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {/* Devices Tab */}
              {activeTab === 'devices' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-right py-3 px-4">بصمة الجهاز</th>
                        <th className="text-right py-3 px-4">مستوى الخطر</th>
                        <th className="text-right py-3 px-4">المحاولات</th>
                        <th className="text-right py-3 px-4">البريد الإلكتروني</th>
                        <th className="text-right py-3 px-4">آخر نشاط</th>
                        <th className="text-right py-3 px-4">الحالة</th>
                        <th className="text-right py-3 px-4">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDevices.map((device) => (
                        <tr key={device.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 font-mono text-xs">
                            {device.fingerprint_hash.substring(0, 12)}...
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(device.risk_level)}`}>
                              {getRiskLevelLabel(device.risk_level)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-xs">
                              <div>إجمالي: {device.total_attempts}</div>
                              <div className="text-red-600">فاشلة: {device.failed_attempts}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {device.associated_emails.slice(0, 2).map((email, idx) => (
                              <div key={idx} className="text-xs">{email}</div>
                            ))}
                            {device.associated_emails.length > 2 && (
                              <div className="text-xs text-gray-500">+{device.associated_emails.length - 2} أخرى</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs">{formatDate(device.last_seen)}</td>
                          <td className="py-3 px-4">
                            {device.is_blocked ? (
                              <span className="flex items-center gap-1 text-red-600 text-xs">
                                <Ban className="w-3 h-3" />
                                محظور
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-green-600 text-xs">
                                <Shield className="w-3 h-3" />
                                نشط
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleViewDeviceDetails(device)}
                                className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                              >
                                <Eye className="w-3 h-3" />
                                عرض
                              </button>
                              {device.is_blocked && (
                                <button
                                  onClick={() => handleUnblockDevice(device.fingerprint_hash)}
                                  className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                                >
                                  <Unlock className="w-3 h-3" />
                                  إلغاء الحظر
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {filteredDevices.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      لا توجد أجهزة مطابقة للفلتر المحدد
                    </div>
                  )}
                </div>
              )}

              {/* Security Events Tab */}
              {activeTab === 'events' && (
                <div className="space-y-4">
                  {securityEvents.map((event) => (
                    <div key={event.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(event.severity)}`}>
                            {getRiskLevelLabel(event.severity)}
                          </span>
                          <span className="font-medium">{getEventTypeLabel(event.event_type)}</span>
                        </div>
                        <span className="text-sm text-gray-500">{formatDate(event.created_at)}</span>
                      </div>
                      
                      <p className="text-gray-700 mb-2">{event.description}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        {event.email && (
                          <div>
                            <strong>البريد الإلكتروني:</strong> {event.email}
                          </div>
                        )}
                        {event.ip_address && (
                          <div>
                            <strong>عنوان IP:</strong> {event.ip_address}
                          </div>
                        )}
                        {event.device_fingerprint && (
                          <div>
                            <strong>بصمة الجهاز:</strong> {event.device_fingerprint.substring(0, 12)}...
                          </div>
                        )}
                        {event.action_taken && (
                          <div>
                            <strong>الإجراء المتخذ:</strong> {event.action_taken}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {securityEvents.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      لا توجد أحداث أمنية
                    </div>
                  )}
                </div>
              )}

              {/* Analytics Tab */}
              {activeTab === 'analytics' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">توزيع مستويات الخطر</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span>منخفض</span>
                        <span className="text-green-600 font-medium">
                          {devices.filter(d => d.risk_level === 'low').length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>متوسط</span>
                        <span className="text-yellow-600 font-medium">
                          {devices.filter(d => d.risk_level === 'medium').length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>عالي</span>
                        <span className="text-orange-600 font-medium">
                          {devices.filter(d => d.risk_level === 'high').length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>حرج</span>
                        <span className="text-red-600 font-medium">
                          {devices.filter(d => d.risk_level === 'critical').length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">أنواع التهديدات</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span>VPN/Proxy</span>
                        <span className="font-medium">{stats.vpnDetections}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>أتمتة</span>
                        <span className="font-medium">{stats.automationDetections}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>سلوك مشبوه</span>
                        <span className="font-medium">
                          {securityEvents.filter(e => e.event_type === 'suspicious_behavior').length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Device Details Modal */}
      {selectedDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">تفاصيل الجهاز</h2>
              <button
                onClick={() => setSelectedDevice(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">معلومات أساسية</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>بصمة الجهاز:</strong> {selectedDevice.fingerprint_hash}</div>
                  <div><strong>مستوى الخطر:</strong> {getRiskLevelLabel(selectedDevice.risk_level)}</div>
                  <div><strong>أول ظهور:</strong> {formatDate(selectedDevice.first_seen)}</div>
                  <div><strong>آخر نشاط:</strong> {formatDate(selectedDevice.last_seen)}</div>
                  <div><strong>إجمالي المحاولات:</strong> {selectedDevice.total_attempts}</div>
                  <div><strong>المحاولات الفاشلة:</strong> {selectedDevice.failed_attempts}</div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">البريد الإلكتروني المرتبط</h3>
                <div className="space-y-1 text-sm">
                  {selectedDevice.associated_emails.map((email, idx) => (
                    <div key={idx}>{email}</div>
                  ))}
                </div>
              </div>
            </div>

            {selectedDevice.device_data && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">بيانات الجهاز التقنية</h3>
                <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto">
                  {JSON.stringify(selectedDevice.device_data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedSecurityDashboard;
