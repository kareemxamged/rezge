import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Percent,
  DollarSign,
  Users,
  TrendingUp,
  Filter,
  Download,
  X,
  Check,
  AlertCircle,
  Copy
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ToastContainer';

interface Coupon {
  id: string;
  code: string;
  name: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_discount_amount?: number;
  max_uses: number;
  used_count: number;
  starts_at: string;
  expires_at: string;
  is_active: boolean;
  applicable_plans: string[];
  created_by: string;
  created_at: string;
}

interface CouponStats {
  totalCoupons: number;
  activeCoupons: number;
  expiredCoupons: number;
  totalUsage: number;
  totalSavings: number;
}

const CouponManagement: React.FC = () => {
  const { showSuccess, showError, showWarning } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [stats, setStats] = useState<CouponStats>({
    totalCoupons: 0,
    activeCoupons: 0,
    expiredCoupons: 0,
    totalUsage: 0,
    totalSavings: 0
  });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    isActive: '',
    discountType: '',
    dateRange: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  // إعادة تحميل البيانات عند تغيير الفلاتر
  useEffect(() => {
    loadCoupons();
  }, [filterOptions]);

  const loadData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);

      await Promise.all([
        loadCoupons(),
        loadStats()
      ]);
    } catch (error) {
      console.error('Error loading coupon data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadCoupons = async () => {
    try {
      let query = supabase
        .from('coupons')
        .select('*');

      // تطبيق الفلاتر
      if (filterOptions.isActive !== '') {
        query = query.eq('is_active', filterOptions.isActive === 'true');
      }

      if (filterOptions.discountType !== '') {
        query = query.eq('discount_type', filterOptions.discountType);
      }

      if (filterOptions.dateRange !== '') {
        const days = parseInt(filterOptions.dateRange);
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - days);
        query = query.gte('created_at', dateFrom.toISOString());
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (error) {
      console.error('Error loading coupons:', error);
    }
  };

  const loadStats = async () => {
    try {
      // إحصائيات الكوبونات
      const { count: totalCoupons } = await supabase
        .from('coupons')
        .select('*', { count: 'exact', head: true });

      const { count: activeCoupons } = await supabase
        .from('coupons')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString());

      const { count: expiredCoupons } = await supabase
        .from('coupons')
        .select('*', { count: 'exact', head: true })
        .lt('expires_at', new Date().toISOString());

      // إحصائيات الاستخدام
      const { data: usageData } = await supabase
        .from('coupons')
        .select('used_count');

      const totalUsage = usageData?.reduce((sum, coupon) => sum + (coupon.used_count || 0), 0) || 0;

      // إحصائيات التوفير
      const { data: savingsData } = await supabase
        .from('payments')
        .select('discount_amount')
        .not('coupon_id', 'is', null);

      const totalSavings = savingsData?.reduce((sum, payment) => sum + (payment.discount_amount || 0), 0) || 0;

      setStats({
        totalCoupons: totalCoupons || 0,
        activeCoupons: activeCoupons || 0,
        expiredCoupons: expiredCoupons || 0,
        totalUsage,
        totalSavings
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleAddCoupon = () => {
    setEditingCoupon({
      id: '',
      code: '',
      name: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      min_order_amount: 0,
      max_discount_amount: undefined,
      max_uses: 1,
      used_count: 0,
      starts_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: true,
      applicable_plans: [],
      created_by: 'admin',
      created_at: new Date().toISOString()
    });
    setShowAddModal(true);
  };

  const handleEditCoupon = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setShowEditModal(true);
  };

  const handleDeleteCoupon = async (couponId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الكوبون؟')) return;

    try {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', couponId);

      if (error) throw error;

      await loadData();
      showSuccess('تم الحذف بنجاح', 'تم حذف الكوبون بنجاح');
    } catch (error) {
      console.error('Error deleting coupon:', error);
      showError('خطأ في الحذف', 'حدث خطأ في حذف الكوبون');
    }
  };

  const handleToggleCoupon = async (couponId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('coupons')
        .update({
          is_active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', couponId);

      if (error) throw error;

      await loadData();
      showSuccess(
        `تم ${!currentStatus ? 'تفعيل' : 'إلغاء تفعيل'} الكوبون`,
        `تم ${!currentStatus ? 'تفعيل' : 'إلغاء تفعيل'} الكوبون بنجاح`
      );
    } catch (error) {
      console.error('Error toggling coupon status:', error);
      showError('خطأ في التحديث', 'حدث خطأ في تغيير حالة الكوبون');
    }
  };

  const handleToggleActive = async (couponId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('coupons')
        .update({ is_active: !isActive })
        .eq('id', couponId);

      if (error) throw error;

      await loadData();
    } catch (error) {
      console.error('Error toggling coupon status:', error);
      showError('خطأ في التحديث', 'حدث خطأ في تغيير حالة الكوبون');
    }
  };

  const handleSaveCoupon = async (couponData: Partial<Coupon>) => {
    try {
      if (editingCoupon?.id) {
        // تحديث كوبون موجود
        const { error } = await supabase
          .from('coupons')
          .update(couponData)
          .eq('id', editingCoupon.id);

        if (error) throw error;
        showSuccess('تم التحديث بنجاح', 'تم تحديث الكوبون بنجاح');
      } else {
        // إضافة كوبون جديد
        const { error } = await supabase
          .from('coupons')
          .insert(couponData);

        if (error) throw error;
        showSuccess('تم الإضافة بنجاح', 'تم إضافة الكوبون بنجاح');
      }

      await loadData();
      setShowAddModal(false);
      setShowEditModal(false);
      setEditingCoupon(null);
    } catch (error) {
      console.error('Error saving coupon:', error);
      showError('خطأ في الحفظ', 'حدث خطأ في حفظ الكوبون');
    }
  };

  const handleExportCoupons = () => {
    try {
      const csvData = coupons.map(coupon => ({
        'الكود': coupon.code,
        'الاسم': coupon.name,
        'الوصف': coupon.description,
        'نوع الخصم': coupon.discount_type === 'percentage' ? 'نسبة مئوية' : 'مبلغ ثابت',
        'قيمة الخصم': coupon.discount_value,
        'الحد الأدنى': coupon.min_order_amount,
        'الحد الأقصى للخصم': coupon.max_discount_amount || 'غير محدد',
        'عدد الاستخدامات': `${coupon.used_count}/${coupon.max_uses}`,
        'تاريخ البداية': formatDate(coupon.starts_at),
        'تاريخ الانتهاء': formatDate(coupon.expires_at),
        'الحالة': coupon.is_active ? 'نشط' : 'معطل',
        'تاريخ الإنشاء': formatDate(coupon.created_at)
      }));

      const csvContent = convertToCSV(csvData);
      downloadCSV(csvContent, `coupons_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (error) {
      console.error('Error exporting coupons:', error);
      showError('خطأ في التصدير', 'حدث خطأ في تصدير البيانات');
    }
  };

  const convertToCSV = (data: any[]): string => {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ];

    return csvRows.join('\n');
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showSuccess('تم النسخ', 'تم نسخ الكود بنجاح');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)} SAR`;
  };

  const getStatusBadge = (coupon: Coupon) => {
    const now = new Date();
    const expiresAt = new Date(coupon.expires_at);
    const startsAt = new Date(coupon.starts_at);

    if (!coupon.is_active) {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-800">معطل</span>;
    }

    if (now < startsAt) {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">قريباً</span>;
    }

    if (now > expiresAt) {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">منتهي</span>;
    }

    if (coupon.used_count >= coupon.max_uses) {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">مستنفد</span>;
    }

    return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">نشط</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">إدارة كوبونات الخصم</h1>
          <p className="text-slate-600 mt-2">إدارة وتتبع كوبونات الخصم والعروض الترويجية</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <TrendingUp className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            تحديث
          </button>
          <button
            onClick={handleAddCoupon}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            إضافة كوبون
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">إجمالي الكوبونات</p>
              <p className="text-2xl font-bold text-slate-800">{stats.totalCoupons}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Tag className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">الكوبونات النشطة</p>
              <p className="text-2xl font-bold text-green-600">{stats.activeCoupons}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Check className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">الكوبونات المنتهية</p>
              <p className="text-2xl font-bold text-red-600">{stats.expiredCoupons}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <X className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">إجمالي الاستخدامات</p>
              <p className="text-2xl font-bold text-purple-600">{stats.totalUsage}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">إجمالي التوفير</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalSavings)}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">جميع الكوبونات</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilterModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Filter className="w-4 h-4" />
                فلترة
              </button>
              <button
                onClick={handleExportCoupons}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                تصدير
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full" style={{minWidth: '900px'}}>
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">الكود</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">الاسم</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">نوع الخصم</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">قيمة الخصم</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">الاستخدامات</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">تاريخ الانتهاء</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <code className="bg-slate-100 px-2 py-1 rounded text-sm font-mono">{coupon.code}</code>
                      <button
                        onClick={() => copyToClipboard(coupon.code)}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                        title="نسخ الكود"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">{coupon.name}</div>
                    <div className="text-sm text-slate-500">{coupon.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {coupon.discount_type === 'percentage' ? (
                        <Percent className="w-4 h-4 text-blue-600" />
                      ) : (
                        <DollarSign className="w-4 h-4 text-green-600" />
                      )}
                      <span className="text-sm text-slate-600">
                        {coupon.discount_type === 'percentage' ? 'نسبة مئوية' : 'مبلغ ثابت'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                    {coupon.discount_type === 'percentage' 
                      ? `${coupon.discount_value}%` 
                      : formatCurrency(coupon.discount_value)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                    {coupon.used_count} / {coupon.max_uses}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                    {formatDate(coupon.expires_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(coupon)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-3">
                      {/* زر التعديل */}
                      <button
                        onClick={() => handleEditCoupon(coupon)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-all duration-200 hover:scale-105"
                        title="تعديل الكوبون"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      {/* زر التفعيل/التعطيل */}
                      <button
                        onClick={() => handleToggleCoupon(coupon.id, coupon.is_active)}
                        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 hover:scale-105 ${
                          coupon.is_active
                            ? 'bg-orange-50 text-orange-600 hover:bg-orange-100 hover:text-orange-700'
                            : 'bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700'
                        }`}
                        title={coupon.is_active ? 'تعطيل الكوبون' : 'تفعيل الكوبون'}
                      >
                        {coupon.is_active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                      </button>

                      {/* زر الحذف */}
                      <button
                        onClick={() => handleDeleteCoupon(coupon.id)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all duration-200 hover:scale-105"
                        title="حذف الكوبون"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* نافذة الفلتر */}
      {showFilterModal && (
        <div
          className="fixed inset-0 modal-backdrop backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={() => setShowFilterModal(false)}
        >
          <div className="modal-container rounded-xl shadow-2xl w-full max-w-md max-h-[95vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header flex items-center justify-between p-6 border-b border-slate-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Filter className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold modal-text-primary">فلترة الكوبونات</h3>
                  <p className="text-sm modal-text-secondary">تطبيق فلاتر على قائمة الكوبونات</p>
                </div>
              </div>
              <button
                onClick={() => setShowFilterModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-lg hover:bg-slate-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="modal-body flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium modal-text-primary mb-2">الحالة</label>
                <select
                  value={filterOptions.isActive}
                  onChange={(e) => setFilterOptions({...filterOptions, isActive: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 modal-bg"
                >
                  <option value="">جميع الحالات</option>
                  <option value="true">نشط</option>
                  <option value="false">معطل</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium modal-text-primary mb-2">نوع الخصم</label>
                <select
                  value={filterOptions.discountType}
                  onChange={(e) => setFilterOptions({...filterOptions, discountType: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 modal-bg"
                >
                  <option value="">جميع الأنواع</option>
                  <option value="percentage">نسبة مئوية</option>
                  <option value="fixed">مبلغ ثابت</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium modal-text-primary mb-2">الفترة الزمنية</label>
                <select
                  value={filterOptions.dateRange}
                  onChange={(e) => setFilterOptions({...filterOptions, dateRange: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 modal-bg"
                >
                  <option value="">جميع الفترات</option>
                  <option value="7">آخر 7 أيام</option>
                  <option value="30">آخر 30 يوم</option>
                  <option value="90">آخر 3 أشهر</option>
                </select>
              </div>
            </div>

            <div className="modal-footer border-t border-slate-200 px-6 py-4 flex-shrink-0">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setFilterOptions({ isActive: '', discountType: '', dateRange: '' });
                    setShowFilterModal(false);
                    loadData();
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  مسح الفلتر
                </button>
                <button
                  onClick={() => {
                    setShowFilterModal(false);
                    loadCoupons();
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  تطبيق الفلتر
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Coupon Modal */}
      {showAddModal && (
        <CouponModal
          coupon={editingCoupon}
          onSave={handleSaveCoupon}
          onClose={() => {
            setShowAddModal(false);
            setEditingCoupon(null);
          }}
          title="إضافة كوبون جديد"
        />
      )}

      {/* Edit Coupon Modal */}
      {showEditModal && (
        <CouponModal
          coupon={editingCoupon}
          onSave={handleSaveCoupon}
          onClose={() => {
            setShowEditModal(false);
            setEditingCoupon(null);
          }}
          title="تعديل الكوبون"
        />
      )}
    </div>
  );
};

// Coupon Modal Component
interface CouponModalProps {
  coupon: Coupon | null;
  onSave: (couponData: Partial<Coupon>) => void;
  onClose: () => void;
  title: string;
}

const CouponModal: React.FC<CouponModalProps> = ({ coupon, onSave, onClose, title }) => {
  const { showError } = useToast();
  const [formData, setFormData] = useState({
    code: coupon?.code || '',
    name: coupon?.name || '',
    description: coupon?.description || '',
    discount_type: coupon?.discount_type || 'percentage',
    discount_value: coupon?.discount_value || 0,
    min_order_amount: coupon?.min_order_amount || 0,
    max_discount_amount: coupon?.max_discount_amount || '',
    max_uses: coupon?.max_uses || 1,
    starts_at: coupon?.starts_at ? new Date(coupon.starts_at).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
    expires_at: coupon?.expires_at ? new Date(coupon.expires_at).toISOString().slice(0, 16) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    is_active: coupon?.is_active ?? true,
    applicable_plans: coupon?.applicable_plans || []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // التحقق من صحة البيانات
    if (!formData.code.trim()) {
      showError('خطأ في البيانات', 'يرجى إدخال كود الكوبون');
      return;
    }

    if (!formData.name.trim()) {
      showError('خطأ في البيانات', 'يرجى إدخال اسم الكوبون');
      return;
    }

    if (formData.discount_value <= 0) {
      showError('خطأ في البيانات', 'يرجى إدخال قيمة خصم صحيحة');
      return;
    }

    if (formData.discount_type === 'percentage' && formData.discount_value > 100) {
      showError('خطأ في البيانات', 'نسبة الخصم لا يمكن أن تزيد عن 100%');
      return;
    }

    // تحضير البيانات للحفظ
    const couponData = {
      ...formData,
      max_discount_amount: formData.max_discount_amount ? Number(formData.max_discount_amount) : null,
      starts_at: new Date(formData.starts_at).toISOString(),
      expires_at: new Date(formData.expires_at).toISOString(),
      created_by: 'admin',
      updated_at: new Date().toISOString()
    };

    onSave(couponData);
  };

  return (
    <div
      className="fixed inset-0 modal-backdrop backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <div className="modal-container rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header flex items-center justify-between p-6 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold modal-text-primary">{title}</h3>
              <p className="text-sm modal-text-secondary">
                {coupon?.id ? 'تعديل بيانات الكوبون الموجود' : 'إضافة كوبون خصم جديد للنظام'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-lg hover:bg-slate-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="modal-body flex-1 overflow-y-auto p-6 space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium modal-text-primary mb-2">
                  كود الكوبون *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 modal-bg"
                  placeholder="مثال: SAVE20"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium modal-text-primary mb-2">
                  اسم الكوبون *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 modal-bg"
                  placeholder="خصم الترحيب"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium modal-text-primary mb-2">
                الوصف
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 modal-bg"
                rows={3}
                placeholder="وصف الكوبون..."
              />
            </div>

            {/* Discount Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium modal-text-primary mb-2">
                  نوع الخصم *
                </label>
                <select
                  value={formData.discount_type}
                  onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percentage' | 'fixed' })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 modal-bg"
                >
                  <option value="percentage">نسبة مئوية (%)</option>
                  <option value="fixed">مبلغ ثابت (ريال)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium modal-text-primary mb-2">
                  قيمة الخصم *
                </label>
                <input
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 modal-bg"
                  min="0"
                  max={formData.discount_type === 'percentage' ? 100 : undefined}
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium modal-text-primary mb-2">
                  الحد الأقصى للخصم (ريال)
                </label>
                <input
                  type="number"
                  value={formData.max_discount_amount}
                  onChange={(e) => setFormData({ ...formData, max_discount_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 modal-bg"
                  min="0"
                  step="0.01"
                  placeholder="اختياري"
                />
              </div>
            </div>

            {/* Usage Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium modal-text-primary mb-2">
                  الحد الأدنى لقيمة الطلب (ريال)
                </label>
                <input
                  type="number"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 modal-bg"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium modal-text-primary mb-2">
                  عدد الاستخدامات المسموحة
                </label>
                <input
                  type="number"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 modal-bg"
                  min="1"
                />
              </div>
            </div>

            {/* Date Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium modal-text-primary mb-2">
                  تاريخ البداية *
                </label>
                <input
                  type="datetime-local"
                  value={formData.starts_at}
                  onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 modal-bg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium modal-text-primary mb-2">
                  تاريخ الانتهاء *
                </label>
                <input
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 modal-bg"
                  required
                />
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="is_active" className="text-sm font-medium modal-text-primary">
                كوبون نشط
              </label>
            </div>
          </div>


          {/* Modal Footer */}
          <div className="modal-footer border-t border-slate-200 px-6 py-4 flex-shrink-0">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
              >
                {coupon?.id ? 'تحديث الكوبون' : 'إضافة الكوبون'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CouponManagement;
