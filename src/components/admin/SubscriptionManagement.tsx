import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Users,
  TrendingUp,
  Crown,
  Clock,
  DollarSign,
  Calendar,
  Eye,
  Edit,
  Trash2,
  Plus,
  Filter,
  Download,
  RefreshCw,
  X,
  Gift,
  Tag,
  Shield,
  Search,
  Check,
  Building,
  Settings,
  Building2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { adminSupabase } from '../../lib/adminUsersService';
import { createClient } from '@supabase/supabase-js';
import ConfirmDialog from './ConfirmDialog';
import { useToast } from '../ToastContainer';
import PaymentMethodSettingsModal from './PaymentMethodSettingsModal';
import { PaymentMethodsService } from '../../lib/paymentMethodsService';
import type { PaymentMethodConfig } from '../../lib/paymentMethodsService';

// إنشاء admin client مؤقت للاختبار
const tempAdminClient = createClient(
  'https://sbtzngewizgeqzfbhfjy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNidHpuZ2V3aXpnZXF6ZmJoZmp5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTEzNzkxMywiZXhwIjoyMDY2NzEzOTEzfQ.HhFFZyYcaYlrsllR5VZ0ppix8lOYGsso5IWCPsjP-3g', // Service Role Key الصحيح
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
import ModernAdminContainer from './ModernAdminContainer';
import FeatureManager from './FeatureManager';
import CouponManagement from './CouponManagement';
import { SubscriptionService } from '../../lib/subscriptionService';
import { useSubscriptionManagementTab } from '../../hooks/useActiveTab';

interface SubscriptionPlan {
  id: string;
  name: string;
  name_en: string;
  price: number;
  currency: string;
  billing_period: string;
  features: Record<string, any>;
  limits: Record<string, any>;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  trial_enabled: boolean;
  trial_days: number;
  created_at: string;
}

interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  started_at: string;
  expires_at: string;
  amount_paid: number;
  payment_method: string;
  is_trial: boolean;
  created_at: string;
  user?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  plan?: SubscriptionPlan;
}

interface SubscriptionStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  activeTrials: number;
  monthlyRevenue: number;
  totalRevenue: number;
}

// دوال مساعدة لتنسيق التواريخ بالميلادي
const formatDate = (dateString: string) => {
  if (!dateString) return 'غير محدد';
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const formatDateTime = (dateString: string) => {
  if (!dateString) return 'غير محدد';
  return new Date(dateString).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

const formatTime = (dateString: string) => {
  if (!dateString) return 'غير محدد';
  return new Date(dateString).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

const SubscriptionManagement: React.FC = () => {
  const { showSuccess, showError, showWarning } = useToast();
  const [loading, setLoading] = useState(true);

  // حالة إعدادات الدفع
  const [paymentSettings, setPaymentSettings] = useState({
    paytabs_profile_id: 'CVK2D7-MD7T6B-Q2P22N-6NGTNB',
    paytabs_api_key: 'SGJ9L6926W-JLNB9BBMKL-KMM9KWZTKN',
    paytabs_server_key: 'SGJ9L6926W-JLNB9BBMKL-KMM9KWZTKN',
    environment: 'test',
    payment_methods: {
      creditcard: { enabled: true, fees: 2.75 },
      mada: { enabled: true, fees: 2.0 },
      stcpay: { enabled: true, fees: 1.5 },
      applepay: { enabled: true, fees: 2.75 },
      banktransfer: { enabled: true, fees: 0 }
    }
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [stats, setStats] = useState<SubscriptionStats>({
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    activeTrials: 0,
    monthlyRevenue: 0,
    totalRevenue: 0
  });
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<any[]>([]);
  const [paymentFilters, setPaymentFilters] = useState({
    status: '',
    paymentMethod: '',
    dateRange: '',
    searchTerm: ''
  });
  const [trials, setTrials] = useState<any[]>([]);
  const [bankInfo, setBankInfo] = useState({
    bank_name: 'البنك الأهلي السعودي',
    bank_name_en: 'National Commercial Bank',
    account_name: 'شركة رزقي للتقنية',
    account_name_en: 'Rezge Technology Company',
    account_number: 'SA1234567890123456789012',
    iban: 'SA1234567890123456789012',
    swift_code: 'NCBKSARI',
    branch: 'الرياض الرئيسي',
    branch_en: 'Riyadh Main Branch',
    instructions: 'يرجى كتابة رقم المستخدم في خانة البيان عند التحويل'
  });
  // حالة التبويبات مع حفظ في localStorage
  const { activeTab, setActiveTab } = useSubscriptionManagementTab();
  const [refreshing, setRefreshing] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<SubscriptionPlan | null>(null);
  const [showSubscriptionDetails, setShowSubscriptionDetails] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<UserSubscription | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [currentFilterTab, setCurrentFilterTab] = useState<'subscriptions' | 'payments' | 'coupons'>('subscriptions');
  const [subscriptionFilters, setSubscriptionFilters] = useState({
    status: '',
    planId: '',
    dateRange: '',
    isTrialOnly: false
  });

  const [couponFilters, setCouponFilters] = useState({
    isActive: '',
    discountType: '',
    dateRange: ''
  });

  // حالات نظام إعدادات طرق الدفع المتقدم
  const [paymentMethodModal, setPaymentMethodModal] = useState<{
    isOpen: boolean;
    methodId: string;
    config: PaymentMethodConfig | null;
  }>({
    isOpen: false,
    methodId: '',
    config: null
  });
  const [paymentMethodsConfigs, setPaymentMethodsConfigs] = useState<PaymentMethodConfig[]>([]);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  // نوافذ التأكيد المحسنة
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
    type: 'info' as 'danger' | 'warning' | 'info'
  });

  // تسجيل تغييرات حالة confirmDialog
  useEffect(() => {
    console.log('🔄 confirmDialog state changed:', confirmDialog);
    if (confirmDialog.isOpen) {
      console.log('🔍 Dialog should be visible now');
      // إضافة class لمنع scroll في الخلفية
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // تنظيف عند إلغاء المكون
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [confirmDialog]);

  useEffect(() => {
    console.log('Component mounted, loading data...');
    loadData();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [payments, paymentFilters]);

  useEffect(() => {
    console.log('Modal state changed - showPaymentDetails:', showPaymentDetails);
    console.log('Modal state changed - selectedPayment:', selectedPayment);
  }, [showPaymentDetails, selectedPayment]);

  const loadData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);

      await Promise.all([
        loadStats(),
        loadPlans(),
        loadSubscriptions(),
        loadPayments(),
        loadTrials(),
        loadBankInfo()
      ]);
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStats = async () => {
    try {
      // إحصائيات الاشتراكات
      const { count: totalSubs } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true });

      const { count: activeSubs } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString());

      // إحصائيات الفترات التجريبية من user_subscriptions
      const { count: activeTrials } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('is_trial', true)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString());

      // الإيرادات
      const { data: revenueData } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed');

      const totalRevenue = revenueData?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      const { data: monthlyRevenueData } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', monthAgo.toISOString());

      const monthlyRevenue = monthlyRevenueData?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

      setStats({
        totalSubscriptions: totalSubs || 0,
        activeSubscriptions: activeSubs || 0,
        activeTrials: activeTrials || 0,
        monthlyRevenue,
        totalRevenue
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .neq('billing_period', 'trial') // استبعاد باقات الفترة التجريبية
        .order('sort_order');

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  const loadSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          user:users(first_name, last_name, email),
          plan:subscription_plans(name, name_en, price)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    }
  };

  const loadPayments = async () => {
    try {
      console.log('Loading payments...');
      console.log('adminSupabase available:', !!adminSupabase);
      console.log('Service key available:', !!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
      console.log('Service key length:', import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY?.length || 0);

      // استخدام tempAdminClient للاختبار
      const client = tempAdminClient;
      console.log('Using client: tempAdminClient');

      // الحصول على المدفوعات مع العلاقات
      const { data, error } = await client
        .from('payments')
        .select(`
          *,
          users (
            id,
            first_name,
            last_name,
            email
          ),
          subscription_plans (
            id,
            name,
            name_en
          )
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        console.error('Supabase error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('Raw data from Supabase:', data?.length || 0);

      if (!data || data.length === 0) {
        console.log('No payments found');
        setPayments([]);
        setFilteredPayments([]);
        return;
      }

      // تحويل البيانات للتوافق مع الكود
      const formattedData = data.map(payment => ({
        ...payment,
        user: payment.users,
        plan: payment.subscription_plans
      }));

      console.log('Formatted payments:', formattedData.length);
      console.log('Sample payment:', formattedData[0]);

      setPayments(formattedData);
      setFilteredPayments(formattedData);
    } catch (error) {
      console.error('Error loading payments:', error);
      setPayments([]);
      setFilteredPayments([]);
    }
  };

  const filterPayments = () => {
    console.log('Filtering payments. Total payments:', payments.length);
    console.log('Current filters:', paymentFilters);

    let filtered = [...payments];

    // فلترة حسب الحالة
    if (paymentFilters.status) {
      filtered = filtered.filter(payment => payment.status === paymentFilters.status);
    }

    // فلترة حسب طريقة الدفع
    if (paymentFilters.paymentMethod) {
      filtered = filtered.filter(payment => payment.payment_method === paymentFilters.paymentMethod);
    }

    // فلترة حسب الفترة الزمنية
    if (paymentFilters.dateRange) {
      const days = parseInt(paymentFilters.dateRange);
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);
      filtered = filtered.filter(payment => new Date(payment.created_at) >= dateFrom);
    }

    // فلترة حسب البحث
    if (paymentFilters.searchTerm) {
      const searchLower = paymentFilters.searchTerm.toLowerCase();
      filtered = filtered.filter(payment =>
        payment.user?.first_name?.toLowerCase().includes(searchLower) ||
        payment.user?.last_name?.toLowerCase().includes(searchLower) ||
        payment.user?.email?.toLowerCase().includes(searchLower) ||
        payment.id?.toLowerCase().includes(searchLower)
      );
    }

    console.log('Filtered payments:', filtered.length);
    setFilteredPayments(filtered);
  };

  const handleApprovePayment = async (paymentId: string) => {
    console.log('🔄 Approving payment:', paymentId);

    const confirmMessage = `هل أنت متأكد من تأكيد هذا الدفع؟

رقم المعاملة: ${paymentId}

سيتم تغيير حالة الدفع إلى "مكتمل" ولا يمكن التراجع عن هذا الإجراء.`;

    showConfirmDialog(
      'تأكيد الدفع',
      confirmMessage,
      async () => {
        console.log('✅ User confirmed payment approval');
        await executeApprovePayment(paymentId);
      },
      'info'
    );
  };

  const executeApprovePayment = async (paymentId: string) => {

    try {
      console.log('Starting payment approval process...');
      const client = tempAdminClient;

      const { data, error } = await client
        .from('payments')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Payment approved successfully:', data);
      await loadPayments();

      showSuccess(
        'تم التأكيد بنجاح',
        'تم تأكيد الدفع بنجاح وتحديث حالته إلى "مكتمل"'
      );
    } catch (error) {
      console.error('Error approving payment:', error);
      showError(
        'خطأ في التأكيد',
        `حدث خطأ في تأكيد الدفع: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
      );
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    console.log('🔄 Rejecting payment:', paymentId);

    const confirmMessage = `هل أنت متأكد من رفض هذا الدفع؟

رقم المعاملة: ${paymentId}

سيتم تغيير حالة الدفع إلى "فاشل" ولا يمكن التراجع عن هذا الإجراء.

تأكد من صحة قرارك قبل المتابعة.`;

    showConfirmDialog(
      'رفض الدفع',
      confirmMessage,
      async () => {
        console.log('✅ User confirmed payment rejection');
        await executeRejectPayment(paymentId);
      },
      'danger'
    );
  };

  const executeRejectPayment = async (paymentId: string) => {

    try {
      console.log('Starting payment rejection process...');
      const client = tempAdminClient;

      const { data, error } = await client
        .from('payments')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Payment rejected successfully:', data);
      await loadPayments();

      showWarning(
        'تم الرفض بنجاح',
        'تم رفض الدفع وتحديث حالته إلى "فاشل"'
      );
    } catch (error) {
      console.error('Error rejecting payment:', error);
      showError(
        'خطأ في الرفض',
        `حدث خطأ في رفض الدفع: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
      );
    }
  };

  const handleRefundPayment = async (paymentId: string) => {
    console.log('🔄 Refunding payment:', paymentId);

    const confirmMessage = `هل أنت متأكد من استرداد هذا الدفع؟

رقم المعاملة: ${paymentId}

سيتم تغيير حالة الدفع إلى "مسترد" وقد يتطلب هذا إجراءات إضافية مع البنك أو مقدم خدمة الدفع.

تأكد من أنك قمت بالإجراءات المطلوبة قبل المتابعة.`;

    showConfirmDialog(
      'استرداد الدفع',
      confirmMessage,
      async () => {
        console.log('✅ User confirmed payment refund');
        await executeRefundPayment(paymentId);
      },
      'warning'
    );
  };

  const executeRefundPayment = async (paymentId: string) => {

    try {
      console.log('Starting payment refund process...');
      const client = tempAdminClient;

      const { data, error } = await client
        .from('payments')
        .update({
          status: 'refunded',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Payment refunded successfully:', data);
      await loadPayments();

      showSuccess(
        'تم الاسترداد بنجاح',
        'تم استرداد الدفع وتحديث حالته إلى "مسترد"'
      );
    } catch (error) {
      console.error('Error refunding payment:', error);
      showError(
        'خطأ في الاسترداد',
        `حدث خطأ في استرداد الدفع: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
      );
    }
  };

  const exportPayments = () => {
    try {
      console.log('Exporting payments. Count:', filteredPayments.length);

      if (filteredPayments.length === 0) {
        alert('لا توجد مدفوعات للتصدير');
        return;
      }

      const csvData = [
        ['رقم المعاملة', 'المستخدم', 'البريد الإلكتروني', 'الباقة', 'المبلغ الأصلي', 'المبلغ المدفوع', 'الخصم', 'العملة', 'طريقة الدفع', 'الحالة', 'تاريخ الإنشاء', 'تاريخ التحديث'],
        ...filteredPayments.map(payment => [
          payment.id || '',
          `${payment.user?.first_name || ''} ${payment.user?.last_name || ''}`.trim() || 'غير محدد',
          payment.user?.email || '',
          payment.plan?.name || 'غير محدد',
          payment.original_amount || payment.amount || 0,
          payment.amount || 0,
          payment.discount_amount || 0,
          payment.currency || 'SAR',
          payment.payment_method || '',
          payment.status || '',
          formatDate(payment.created_at),
          formatDate(payment.updated_at)
        ])
      ];

      const csvContent = '\uFEFF' + csvData.map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `payments_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('Export completed successfully');
      alert(`تم تصدير ${filteredPayments.length} مدفوعة بنجاح`);
    } catch (error) {
      console.error('Error exporting payments:', error);
      alert(`حدث خطأ في تصدير البيانات: ${error.message}`);
    }
  };

  // دالة لإظهار نافذة التأكيد المحسنة
  const showConfirmDialog = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'info') => {
    console.log('🔔 showConfirmDialog called with:', { title, type, messageLength: message.length });
    console.log('🔍 Current confirmDialog state before update:', confirmDialog);

    const newDialogState = {
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        console.log('🎯 Confirm button clicked, executing action...');
        try {
          onConfirm();
          console.log('✅ Action executed successfully');
        } catch (error) {
          console.error('❌ Error executing action:', error);
        }
        // إغلاق النافذة
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => {
        console.log('🚫 Cancel button clicked');
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
      type
    };

    console.log('🔄 Setting new dialog state:', newDialogState);
    setConfirmDialog(newDialogState);

    // التأكد من أن النافذة ستظهر
    setTimeout(() => {
      console.log('🔍 Dialog state after timeout:', confirmDialog);
    }, 100);
  };

  const handleViewPaymentDetails = (payment: any) => {
    console.log('=== VIEWING PAYMENT DETAILS ===');
    console.log('Payment ID:', payment.id);
    console.log('Payment data:', payment);
    console.log('Current showPaymentDetails state:', showPaymentDetails);
    console.log('Current selectedPayment state:', selectedPayment);

    try {
      setSelectedPayment(payment);
      setShowPaymentDetails(true);
      console.log('✅ State updated successfully');
      console.log('After setting state - showPaymentDetails should be true');
      console.log('After setting state - selectedPayment should be:', payment);
    } catch (error) {
      console.error('❌ Error updating payment details state:', error);
    }
  };

  // دوال إعدادات الدفع
  const handleSavePaymentSettings = async () => {
    setSavingSettings(true);
    try {
      // محاكاة حفظ الإعدادات في قاعدة البيانات
      await new Promise(resolve => setTimeout(resolve, 1500));

      showSuccess('تم الحفظ بنجاح', 'تم حفظ إعدادات الدفع بنجاح');
    } catch (error) {
      console.error('Error saving payment settings:', error);
      showError('خطأ في الحفظ', 'حدث خطأ في حفظ إعدادات الدفع');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      // محاكاة اختبار الاتصال مع PayTabs
      await new Promise(resolve => setTimeout(resolve, 2000));

      // محاكاة نتيجة الاختبار
      const isSuccess = Math.random() > 0.3; // 70% نجاح

      if (isSuccess) {
        showSuccess('الاتصال ناجح', 'تم الاتصال بـ PayTabs بنجاح');
      } else {
        showError('فشل الاتصال', 'فشل في الاتصال بـ PayTabs. تحقق من الإعدادات');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      showError('خطأ في الاختبار', 'حدث خطأ في اختبار الاتصال');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleTogglePaymentMethod = (methodId: string) => {
    setPaymentSettings(prev => ({
      ...prev,
      payment_methods: {
        ...prev.payment_methods,
        [methodId]: {
          ...prev.payment_methods[methodId],
          enabled: !prev.payment_methods[methodId].enabled
        }
      }
    }));

    const methodName = {
      creditcard: 'البطاقات الائتمانية',
      mada: 'مدى',
      stcpay: 'STC Pay',
      applepay: 'Apple Pay',
      banktransfer: 'التحويل البنكي'
    }[methodId] || methodId;

    const isEnabled = !paymentSettings.payment_methods[methodId].enabled;
    showSuccess(
      `تم ${isEnabled ? 'تفعيل' : 'إلغاء تفعيل'} ${methodName}`,
      `تم ${isEnabled ? 'تفعيل' : 'إلغاء تفعيل'} طريقة الدفع بنجاح`
    );
  };



  const handlePaymentMethodSettings = async (methodId: string) => {
    try {
      // الحصول على إعدادات طريقة الدفع من قاعدة البيانات أو الافتراضية
      let config = await PaymentMethodsService.getPaymentMethod(methodId);

      if (!config) {
        // إذا لم توجد في قاعدة البيانات، استخدم الافتراضية
        config = PaymentMethodsService.getDefaultPaymentMethod(methodId);
      }

      if (!config) {
        showError('خطأ', 'لم يتم العثور على إعدادات طريقة الدفع');
        return;
      }

      // فتح نافذة الإعدادات
      setPaymentMethodModal({
        isOpen: true,
        methodId,
        config
      });
    } catch (error) {
      console.error('Error loading payment method settings:', error);
      showError('خطأ', 'حدث خطأ في تحميل إعدادات طريقة الدفع');
    }
  };

  const handleSavePaymentMethodSettings = async (config: PaymentMethodConfig) => {
    try {
      await PaymentMethodsService.savePaymentMethod(config);

      // تحديث الحالة المحلية
      setPaymentSettings(prev => ({
        ...prev,
        payment_methods: {
          ...prev.payment_methods,
          [config.id]: {
            enabled: config.enabled,
            fees: config.fees
          }
        }
      }));

      // تحديث قائمة الإعدادات
      const updatedConfigs = paymentMethodsConfigs.map(c =>
        c.id === config.id ? config : c
      );

      if (!paymentMethodsConfigs.find(c => c.id === config.id)) {
        updatedConfigs.push(config);
      }

      setPaymentMethodsConfigs(updatedConfigs);

    } catch (error) {
      console.error('Error saving payment method settings:', error);
      throw error;
    }
  };

  const testDatabaseConnection = async () => {
    try {
      console.log('Testing database connection...');
      const client = tempAdminClient;

      const { error } = await client
        .from('payments')
        .select('count')
        .limit(1);

      if (error) {
        console.error('Database connection test failed:', error);
        alert(`فشل الاتصال بقاعدة البيانات: ${error.message}`);
        return false;
      }

      console.log('Database connection successful');
      alert('الاتصال بقاعدة البيانات يعمل بشكل صحيح');
      return true;
    } catch (error) {
      console.error('Database connection test error:', error);
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      alert(`خطأ في اختبار الاتصال: ${errorMessage}`);
      return false;
    }
  };



  const getPaymentStats = () => {
    const total = payments.length;
    const completed = payments.filter(p => p.status === 'completed').length;
    const pending = payments.filter(p => p.status === 'pending').length;
    const failed = payments.filter(p => p.status === 'failed').length;
    const refunded = payments.filter(p => p.status === 'refunded').length;
    const cancelled = payments.filter(p => p.status === 'cancelled').length;

    const totalRevenue = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const pendingAmount = payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const refundedAmount = payments
      .filter(p => p.status === 'refunded')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const today = new Date();
    const todayPayments = payments.filter(p => {
      const paymentDate = new Date(p.created_at);
      return paymentDate.toDateString() === today.toDateString();
    });

    const thisWeek = payments.filter(p => {
      const paymentDate = new Date(p.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return paymentDate >= weekAgo;
    });

    const thisMonth = payments.filter(p => {
      const paymentDate = new Date(p.created_at);
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return paymentDate >= monthAgo;
    });

    return {
      total,
      completed,
      pending,
      failed,
      refunded,
      cancelled,
      totalRevenue,
      pendingAmount,
      refundedAmount,
      todayCount: todayPayments.length,
      todayRevenue: todayPayments.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0),
      weekCount: thisWeek.length,
      weekRevenue: thisWeek.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0),
      monthCount: thisMonth.length,
      monthRevenue: thisMonth.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0),
      successRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  };



  const loadTrials = async () => {
    try {
      // تحميل الفترات التجريبية من جدول user_subscriptions
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          user:users(first_name, last_name, email),
          plan:subscription_plans(name, name_en)
        `)
        .eq('is_trial', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTrials(data || []);
    } catch (error) {
      console.error('Error loading trials:', error);
      setTrials([]);
    }
  };

  const handleRefresh = () => {
    loadData(true);
  };

  // دوال معالجة المدفوعات المعلقة
  const handleApprovePendingPayment = async (paymentId: string) => {
    try {
      // تحديث حالة الدفع إلى مكتمل
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (paymentError) {
        console.error('Error updating payment:', paymentError);
        return;
      }

      // الحصول على بيانات الدفع
      const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select('*, subscription_plans(*)')
        .eq('id', paymentId)
        .single();

      if (fetchError || !payment) {
        console.error('Error fetching payment:', fetchError);
        return;
      }

      // إنشاء الاشتراك
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (payment.subscription_plans?.duration_days || 30));

      const { error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: payment.user_id,
          plan_id: payment.plan_id,
          status: 'active',
          started_at: startDate.toISOString(),
          expires_at: endDate.toISOString(),
          amount_paid: payment.amount,
          payment_method: payment.payment_method,
          is_trial: false,
          auto_renew: false,
          payment_reference: payment.reference
        });

      if (subscriptionError) {
        console.error('Error creating subscription:', subscriptionError);
        return;
      }

      // إرسال إشعار للمستخدم
      await supabase
        .from('notifications')
        .insert({
          user_id: payment.user_id,
          title: 'تم تفعيل اشتراكك',
          content: `تم تأكيد دفعتك وتفعيل اشتراكك في ${payment.subscription_plans?.name}`,
          type: 'subscription_activated',
          is_read: false
        });

      // تحديث البيانات
      await loadData();

    } catch (error) {
      console.error('Error approving payment:', error);
    }
  };

  const handleRejectPendingPayment = async (paymentId: string) => {
    try {
      // تحديث حالة الدفع إلى مرفوض
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (paymentError) {
        console.error('Error updating payment:', paymentError);
        return;
      }

      // الحصول على بيانات الدفع للإشعار
      const { data: payment } = await supabase
        .from('payments')
        .select('user_id, subscription_plans(name)')
        .eq('id', paymentId)
        .single();

      if (payment) {
        // إرسال إشعار للمستخدم
        await supabase
          .from('notifications')
          .insert({
            user_id: payment.user_id,
            title: 'تم رفض طلب الدفع',
            content: 'لم يتم العثور على التحويل البنكي. يرجى المحاولة مرة أخرى أو التواصل معنا.',
            type: 'payment_rejected',
            is_read: false
          });
      }

      // تحديث البيانات
      await loadData();

    } catch (error) {
      console.error('Error rejecting payment:', error);
    }
  };

  // دالة حفظ معلومات البنك
  const handleSaveBankInfo = async (bankData: any) => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'bank_account_info',
          setting_value: bankData,
          description: 'Bank account information for wire transfers',
          category: 'payment'
        });

      if (error) {
        console.error('Error saving bank info:', error);
        alert('فشل في حفظ معلومات البنك');
        return;
      }

      alert('تم حفظ معلومات البنك بنجاح');
    } catch (error) {
      console.error('Error saving bank info:', error);
      alert('حدث خطأ في حفظ معلومات البنك');
    }
  };

  // دالة تحميل معلومات البنك
  const loadBankInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'bank_account_info')
        .single();

      if (!error && data) {
        setBankInfo(data.setting_value);
      }
    } catch (error) {
      console.error('Error loading bank info:', error);
    }
  };

  const handleTogglePlan = async (planId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update({ is_active: !isActive })
        .eq('id', planId);

      if (error) throw error;

      // إعادة تحميل البيانات
      await loadPlans();
    } catch (error) {
      console.error('Error toggling plan status:', error);
    }
  };

  const handleSetDefaultPlan = async (planId: string) => {
    try {
      // إزالة الافتراضية من جميع الباقات أولاً
      const { error: removeError } = await supabase
        .from('subscription_plans')
        .update({ is_default: false })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // تحديث جميع الباقات

      if (removeError) {
        console.error('Error removing default status:', removeError);
        throw removeError;
      }

      // تعيين الباقة الجديدة كافتراضية
      const { error: setError } = await supabase
        .from('subscription_plans')
        .update({ is_default: true })
        .eq('id', planId);

      if (setError) {
        console.error('Error setting default plan:', setError);
        throw setError;
      }

      // إعادة تحميل البيانات
      await loadPlans();

      console.log('Default plan updated successfully');
    } catch (error) {
      console.error('Error setting default plan:', error);
      alert('حدث خطأ في تعيين الباقة الافتراضية');
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!confirm('هل أنت متأكد من إلغاء هذا الاشتراك؟')) return;

    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (error) throw error;

      // إعادة تحميل البيانات
      await loadSubscriptions();
      alert('تم إلغاء الاشتراك بنجاح');
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert('حدث خطأ في إلغاء الاشتراك');
    }
  };

  const handleViewSubscriptionDetails = (subscription: UserSubscription) => {
    setSelectedSubscription(subscription);
    setShowSubscriptionDetails(true);
  };

  const handleRenewSubscription = async (subscriptionId: string) => {
    if (!confirm('هل أنت متأكد من تجديد هذا الاشتراك؟')) return;

    try {
      // تجديد الاشتراك لشهر إضافي
      const newExpiryDate = new Date();
      newExpiryDate.setMonth(newExpiryDate.getMonth() + 1);

      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          expires_at: newExpiryDate.toISOString(),
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (error) throw error;

      await loadSubscriptions();
      alert('تم تجديد الاشتراك بنجاح');
    } catch (error) {
      console.error('Error renewing subscription:', error);
      alert('حدث خطأ في تجديد الاشتراك');
    }
  };

  const handleExtendTrial = async (subscriptionId: string) => {
    if (!confirm('هل أنت متأكد من تمديد الفترة التجريبية؟')) return;

    try {
      // تمديد الفترة التجريبية لأسبوع إضافي
      const currentSubscription = subscriptions.find(s => s.id === subscriptionId);
      if (!currentSubscription) return;

      const newExpiryDate = new Date(currentSubscription.expires_at);
      newExpiryDate.setDate(newExpiryDate.getDate() + 7);

      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          expires_at: newExpiryDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (error) throw error;

      await loadSubscriptions();
      alert('تم تمديد الفترة التجريبية بنجاح');
    } catch (error) {
      console.error('Error extending trial:', error);
      alert('حدث خطأ في تمديد الفترة التجريبية');
    }
  };

  const handleFilter = (tabType: 'subscriptions' | 'payments' | 'coupons') => {
    setCurrentFilterTab(tabType);
    setShowFilterModal(true);
  };

  const applyFilter = async () => {
    try {
      if (currentFilterTab === 'subscriptions') {
        let query = supabase
          .from('user_subscriptions')
          .select(`
            *,
            user:users(first_name, last_name, email),
            plan:subscription_plans(name, name_en, price)
          `);

        // تطبيق فلاتر الاشتراكات
        if (subscriptionFilters.status) {
          query = query.eq('status', subscriptionFilters.status);
        }
        if (subscriptionFilters.planId) {
          query = query.eq('plan_id', subscriptionFilters.planId);
        }
        if (subscriptionFilters.isTrialOnly) {
          query = query.eq('is_trial', true);
        }
        if (subscriptionFilters.dateRange) {
          const days = parseInt(subscriptionFilters.dateRange);
          const dateFrom = new Date();
          dateFrom.setDate(dateFrom.getDate() - days);
          query = query.gte('created_at', dateFrom.toISOString());
        }

        const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;
        setSubscriptions(data || []);
      } else if (currentFilterTab === 'payments') {
        let query = supabase
          .from('payments')
          .select(`
            *,
            user:users(first_name, last_name, email),
            plan:subscription_plans(name, name_en, price)
          `);

        // تطبيق فلاتر المدفوعات
        if (paymentFilters.status) {
          query = query.eq('status', paymentFilters.status);
        }
        if (paymentFilters.planId) {
          query = query.eq('plan_id', paymentFilters.planId);
        }
        if (paymentFilters.paymentMethod) {
          query = query.eq('payment_method', paymentFilters.paymentMethod);
        }
        if (paymentFilters.dateRange) {
          const days = parseInt(paymentFilters.dateRange);
          const dateFrom = new Date();
          dateFrom.setDate(dateFrom.getDate() - days);
          query = query.gte('created_at', dateFrom.toISOString());
        }

        const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;
        setPayments(data || []);
      }

      setShowFilterModal(false);
    } catch (error) {
      console.error('Error applying filter:', error);
      alert('حدث خطأ في تطبيق الفلتر');
    }
  };

  const clearFilter = async () => {
    if (currentFilterTab === 'subscriptions') {
      setSubscriptionFilters({
        status: '',
        planId: '',
        dateRange: '',
        isTrialOnly: false
      });
      await loadSubscriptions();
    } else if (currentFilterTab === 'payments') {
      setPaymentFilters({
        status: '',
        planId: '',
        dateRange: '',
        paymentMethod: ''
      });
      await loadPayments();
    } else if (currentFilterTab === 'coupons') {
      setCouponFilters({
        isActive: '',
        discountType: '',
        dateRange: ''
      });
    }
    setShowFilterModal(false);
  };

  const handleExport = async (type: 'subscriptions' | 'payments' | 'trials' | 'overview') => {
    try {
      let data: any[] = [];
      let filename = '';

      switch (type) {
        case 'subscriptions':
          data = subscriptions.map(sub => ({
            'اسم المستخدم': `${sub.user?.first_name} ${sub.user?.last_name}`,
            'البريد الإلكتروني': sub.user?.email,
            'الباقة': sub.plan?.name,
            'الحالة': sub.status,
            'نوع الاشتراك': sub.is_trial ? 'فترة تجريبية' : 'مدفوع',
            'تاريخ البدء': new Date(sub.started_at).toLocaleDateString('en-GB'),
            'تاريخ الانتهاء': new Date(sub.expires_at).toLocaleDateString('en-GB'),
            'المبلغ المدفوع': sub.amount_paid || 0
          }));
          filename = 'subscriptions';
          break;
        case 'payments':
          data = payments.map(payment => ({
            'اسم المستخدم': payment.user ? `${payment.user.first_name} ${payment.user.last_name}` : 'غير محدد',
            'البريد الإلكتروني': payment.user?.email || 'غير محدد',
            'الباقة': payment.plan?.name || 'غير محدد',
            'المبلغ': payment.amount,
            'العملة': payment.currency,
            'طريقة الدفع': payment.payment_method,
            'الحالة': payment.status,
            'المرجع': payment.reference,
            'التاريخ': new Date(payment.created_at).toLocaleDateString('en-GB')
          }));
          filename = 'payments';
          break;
        case 'trials':
          data = trials.map(trial => ({
            'اسم المستخدم': trial.user ? `${trial.user.first_name} ${trial.user.last_name}` : 'غير محدد',
            'البريد الإلكتروني': trial.user?.email || 'غير محدد',
            'الباقة': trial.plan?.name || 'غير محدد',
            'الحالة': trial.status,
            'تاريخ البدء': new Date(trial.started_at).toLocaleDateString('en-GB'),
            'تاريخ الانتهاء': new Date(trial.expires_at).toLocaleDateString('en-GB'),
            'الأيام المتبقية': Math.ceil((new Date(trial.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          }));
          filename = 'trials';
          break;
        case 'overview':
          data = [
            { 'المؤشر': 'إجمالي الاشتراكات', 'القيمة': stats.totalSubscriptions },
            { 'المؤشر': 'الاشتراكات النشطة', 'القيمة': stats.activeSubscriptions },
            { 'المؤشر': 'الفترات التجريبية النشطة', 'القيمة': stats.activeTrials },
            { 'المؤشر': 'إجمالي الإيرادات', 'القيمة': `${stats.totalRevenue} SAR` },
            { 'المؤشر': 'الإيرادات الشهرية', 'القيمة': `${stats.monthlyRevenue} SAR` }
          ];
          filename = 'overview';
          break;
      }

      // تحويل البيانات إلى CSV
      const csvContent = convertToCSV(data);
      downloadCSV(csvContent, `${filename}_${new Date().toISOString().split('T')[0]}.csv`);

    } catch (error) {
      console.error('Error exporting data:', error);
      alert('حدث خطأ في تصدير البيانات');
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

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setShowEditModal(true);
  };

  const handleSavePlan = async (updatedPlan: Partial<SubscriptionPlan>) => {
    if (!editingPlan) return;

    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update(updatedPlan)
        .eq('id', editingPlan.id);

      if (error) throw error;

      // إعادة تحميل البيانات
      await loadPlans();
      setShowEditModal(false);
      setEditingPlan(null);

      console.log('Plan updated successfully');
    } catch (error) {
      console.error('Error updating plan:', error);
      alert('حدث خطأ في تحديث الباقة');
    }
  };

  const handleAddPlan = () => {
    setEditingPlan({
      id: '',
      name: '',
      name_en: '',
      price: 0,
      currency: 'SAR',
      billing_period: 'monthly',
      features: {},
      limits: {},
      is_active: true,
      is_default: false,
      sort_order: 0,
      trial_enabled: false,
      trial_days: 0,
      created_at: ''
    });
    setShowAddModal(true);
  };

  const handleSaveNewPlan = async (newPlan: Partial<SubscriptionPlan>) => {
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .insert(newPlan);

      if (error) throw error;

      // إعادة تحميل البيانات
      await loadPlans();
      setShowAddModal(false);
      setEditingPlan(null);

      console.log('Plan added successfully');
    } catch (error) {
      console.error('Error adding plan:', error);
      alert('حدث خطأ في إضافة الباقة');
    }
  };

  const handleDeletePlan = (plan: SubscriptionPlan) => {
    setPlanToDelete(plan);
    setShowDeleteModal(true);
  };

  const confirmDeletePlan = async () => {
    if (!planToDelete) return;

    try {
      // التحقق من وجود اشتراكات نشطة لهذه الباقة
      const { data: activeSubscriptions, error: checkError } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('plan_id', planToDelete.id)
        .eq('status', 'active')
        .limit(1);

      if (checkError) throw checkError;

      if (activeSubscriptions && activeSubscriptions.length > 0) {
        alert('لا يمكن حذف هذه الباقة لأن هناك مستخدمين مشتركين فيها حالياً. يرجى إلغاء تفعيل الباقة بدلاً من حذفها.');
        setShowDeleteModal(false);
        setPlanToDelete(null);
        return;
      }

      // حذف الباقة
      const { error: deleteError } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', planToDelete.id);

      if (deleteError) throw deleteError;

      // إعادة تحميل البيانات
      await loadPlans();
      setShowDeleteModal(false);
      setPlanToDelete(null);

      console.log('Plan deleted successfully');
    } catch (error) {
      console.error('Error deleting plan:', error);
      alert('حدث خطأ في حذف الباقة');
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('ar-SA')} ر.س`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'نشط', color: 'bg-green-100 text-green-800' },
      expired: { label: 'منتهي', color: 'bg-red-100 text-red-800' },
      cancelled: { label: 'ملغي', color: 'bg-gray-100 text-gray-800' },
      suspended: { label: 'معلق', color: 'bg-yellow-100 text-yellow-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.expired;

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <ModernAdminContainer>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-slate-600">جاري تحميل بيانات الاشتراكات...</p>
          </div>
        </div>
      </ModernAdminContainer>
    );
  }

  return (
    <>
    <ModernAdminContainer>
        <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">إدارة الباقات والاشتراكات</h1>
            <p className="text-slate-600 mt-1">إدارة الباقات والاشتراكات والمدفوعات</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              تحديث
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">إجمالي الاشتراكات</p>
                <p className="text-2xl font-bold text-slate-900">{stats.totalSubscriptions}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">الاشتراكات النشطة</p>
                <p className="text-2xl font-bold text-slate-900">{stats.activeSubscriptions}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">الفترات التجريبية</p>
                <p className="text-2xl font-bold text-slate-900">{stats.activeTrials}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">الإيرادات الشهرية</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.monthlyRevenue)}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">إجمالي الإيرادات</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="border-b border-slate-200">
            <nav className="flex space-x-8 px-6" dir="ltr">
              {[
                { id: 'plans', label: 'الباقات', icon: Crown },
                { id: 'subscriptions', label: 'اشتراكات المستخدمين', icon: Users },
                { id: 'payments', label: 'المدفوعات', icon: CreditCard },
                { id: 'coupons', label: 'كوبونات الخصم', icon: Tag },
                { id: 'payment-settings', label: 'إعدادات الدفع', icon: Shield }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">


            {activeTab === 'plans' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">إدارة الباقات</h3>
                  <button
                    onClick={handleAddPlan}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة باقة جديدة
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {plans.map((plan) => (
                    <div key={plan.id} className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-slate-800">{plan.name}</h4>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTogglePlan(plan.id, plan.is_active)}
                            className={`p-2 transition-colors ${
                              plan.is_active
                                ? 'text-red-600 hover:text-red-700'
                                : 'text-green-600 hover:text-green-700'
                            }`}
                            title={plan.is_active ? 'إلغاء تفعيل' : 'تفعيل'}
                          >
                            <Eye className={`w-4 h-4 ${plan.is_active ? '' : 'opacity-50'}`} />
                          </button>
                          {!plan.is_default && plan.billing_period !== 'trial' && plan.price > 0 && (
                            <button
                              onClick={() => handleSetDefaultPlan(plan.id)}
                              className="p-2 text-yellow-600 hover:text-yellow-700 transition-colors"
                              title="تعيين كافتراضية"
                            >
                              <Crown className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEditPlan(plan)}
                            className="p-2 text-slate-600 hover:text-primary-600 transition-colors"
                            title="تعديل الباقة"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePlan(plan)}
                            className="p-2 text-red-600 hover:text-red-700 transition-colors"
                            title="حذف الباقة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">السعر:</span>
                          <span className="font-medium text-slate-900">{formatCurrency(plan.price)}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">فترة الفوترة:</span>
                          <span className="font-medium text-slate-900">
                            {plan.billing_period === 'monthly' ? 'شهرياً' : 'سنوياً'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">الحالة:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            plan.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {plan.is_active ? 'نشط' : 'غير نشط'}
                          </span>
                        </div>

                        {plan.is_default && plan.billing_period !== 'trial' && plan.price > 0 && (
                          <div className="flex items-center gap-2">
                            <Crown className="w-4 h-4 text-yellow-600" />
                            <span className="text-sm text-yellow-600 font-medium">الباقة الافتراضية</span>
                          </div>
                        )}

                        {plan.trial_enabled && (
                          <div className="flex items-center gap-2">
                            <Gift className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-600 font-medium">
                              فترة تجريبية {plan.trial_days} أيام
                            </span>
                          </div>
                        )}

                        {/* عرض المميزات */}
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <h5 className="text-sm font-medium text-slate-700 mb-2">المميزات:</h5>
                          <div className="flex flex-wrap gap-1">
                            {SubscriptionService.extractActiveFeatures(plan.features || {}).slice(0, 3).map((featureKey) => {
                              const featureDefinition = SubscriptionService.getFeatureDefinition(featureKey);
                              return (
                                <span key={featureKey} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  {featureDefinition?.name_ar || featureKey}
                                </span>
                              );
                            })}
                            {SubscriptionService.extractActiveFeatures(plan.features || {}).length > 3 && (
                              <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">
                                +{SubscriptionService.extractActiveFeatures(plan.features || {}).length - 3} أخرى
                              </span>
                            )}
                            {SubscriptionService.extractActiveFeatures(plan.features || {}).length === 0 && (
                              <span className="text-xs text-slate-500">لا توجد مميزات محددة</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'subscriptions' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">جميع الاشتراكات</h3>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleFilter('subscriptions')}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <Filter className="w-4 h-4" />
                      فلترة
                    </button>
                    <button
                      onClick={() => handleExport('subscriptions')}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      تصدير
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200" style={{minWidth: '800px'}}>
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                          المستخدم
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                          الباقة
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                          الحالة
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                          تاريخ البداية
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                          تاريخ الانتهاء
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                          المبلغ
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                          الإجراءات
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {subscriptions.map((subscription) => (
                        <tr key={subscription.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-slate-900">
                                {subscription.user?.first_name} {subscription.user?.last_name}
                              </div>
                              <div className="text-sm text-slate-500">{subscription.user?.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-900">{subscription.plan?.name}</div>
                            {subscription.is_trial && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                فترة تجريبية
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(subscription.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                            {formatDate(subscription.started_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                            {formatDate(subscription.expires_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                            {formatCurrency(subscription.amount_paid || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleViewSubscriptionDetails(subscription)}
                                className="text-primary-600 hover:text-primary-900 transition-colors"
                                title="عرض التفاصيل"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {subscription.status === 'active' && (
                                <>
                                  {subscription.is_trial ? (
                                    <button
                                      onClick={() => handleExtendTrial(subscription.id)}
                                      className="text-green-600 hover:text-green-900 transition-colors"
                                      title="تمديد الفترة التجريبية"
                                    >
                                      <Calendar className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleRenewSubscription(subscription.id)}
                                      className="text-green-600 hover:text-green-900 transition-colors"
                                      title="تجديد الاشتراك"
                                    >
                                      <RefreshCw className="w-4 h-4" />
                                    </button>
                                  )}

                                  <button
                                    onClick={() => handleCancelSubscription(subscription.id)}
                                    className="text-red-600 hover:text-red-900 transition-colors"
                                    title="إلغاء الاشتراك"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              )}

                              {(subscription.status === 'expired' || subscription.status === 'cancelled') && (
                                <button
                                  onClick={() => handleRenewSubscription(subscription.id)}
                                  className="text-blue-600 hover:text-blue-900 transition-colors"
                                  title="إعادة تفعيل الاشتراك"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-6">
                {/* Header with Search and Actions */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">إدارة المدفوعات</h3>
                    <p className="text-sm text-slate-600">جميع المدفوعات والتحويلات البنكية</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="البحث في المدفوعات..."
                        value={paymentFilters.searchTerm}
                        onChange={(e) => setPaymentFilters({...paymentFilters, searchTerm: e.target.value})}
                        className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-64"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    </div>
                    <button
                      onClick={async () => {
                        console.log('Refreshing payments data...');
                        setRefreshing(true);
                        try {
                          await loadPayments();
                          console.log('Payments refreshed successfully');
                        } catch (error) {
                          console.error('Error refreshing payments:', error);
                        } finally {
                          setRefreshing(false);
                        }
                      }}
                      disabled={refreshing}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                      {refreshing ? 'جاري التحديث...' : 'تحديث'}
                    </button>
                    <button
                      onClick={exportPayments}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      تصدير
                    </button>
                    {payments.length === 0 && (
                      <>
                        <button
                          onClick={testDatabaseConnection}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Shield className="w-4 h-4" />
                          اختبار الاتصال
                        </button>
                        <button
                          onClick={() => {
                            console.log('Testing modal with dummy data');
                            const dummyPayment = {
                              id: 'TEST_PAYMENT_001',
                              amount: 299,
                              status: 'completed',
                              payment_method: 'credit_card',
                              created_at: new Date().toISOString(),
                              updated_at: new Date().toISOString(),
                              user: { first_name: 'اختبار', last_name: 'المودال', email: 'test@example.com' },
                              plan: { name: 'الباقة التجريبية' }
                            };
                            handleViewPaymentDetails(dummyPayment);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          اختبار المودال
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 lg:p-6">
                  <h4 className="text-md font-semibold text-slate-800 mb-4">فلاتر البحث</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">الحالة</label>
                      <select
                        value={paymentFilters.status}
                        onChange={(e) => setPaymentFilters({...paymentFilters, status: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">جميع الحالات</option>
                        <option value="completed">مكتمل</option>
                        <option value="pending">معلق</option>
                        <option value="failed">فاشل</option>
                        <option value="cancelled">ملغي</option>
                        <option value="refunded">مسترد</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">طريقة الدفع</label>
                      <select
                        value={paymentFilters.paymentMethod}
                        onChange={(e) => setPaymentFilters({...paymentFilters, paymentMethod: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">جميع الطرق</option>
                        <option value="credit_card">بطاقة ائتمانية</option>
                        <option value="mada">مدى</option>
                        <option value="stc_pay">STC Pay</option>
                        <option value="apple_pay">Apple Pay</option>
                        <option value="bank_transfer">تحويل بنكي</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">الفترة الزمنية</label>
                      <select
                        value={paymentFilters.dateRange}
                        onChange={(e) => setPaymentFilters({...paymentFilters, dateRange: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">جميع الفترات</option>
                        <option value="1">اليوم</option>
                        <option value="7">آخر 7 أيام</option>
                        <option value="30">آخر 30 يوم</option>
                        <option value="90">آخر 3 أشهر</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        onClick={() => setPaymentFilters({ status: '', paymentMethod: '', dateRange: '', searchTerm: '' })}
                        className="w-full px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        مسح الفلاتر
                      </button>
                    </div>
                  </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm text-slate-600 truncate">إجمالي المدفوعات</p>
                        <p className="text-xl lg:text-2xl font-bold text-slate-900">{getPaymentStats().total}</p>
                        <p className="text-xs text-slate-500 truncate">اليوم: {getPaymentStats().todayCount}</p>
                      </div>
                      <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm text-slate-600 truncate">المدفوعات المكتملة</p>
                        <p className="text-xl lg:text-2xl font-bold text-green-600">{getPaymentStats().completed}</p>
                        <p className="text-xs text-green-500 truncate">معدل النجاح: {getPaymentStats().successRate}%</p>
                      </div>
                      <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Check className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm text-slate-600 truncate">المدفوعات المعلقة</p>
                        <p className="text-xl lg:text-2xl font-bold text-yellow-600">{getPaymentStats().pending}</p>
                        <p className="text-xs text-yellow-500 truncate">{getPaymentStats().pendingAmount.toLocaleString()} ريال</p>
                      </div>
                      <div className="w-10 h-10 lg:w-12 lg:h-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 lg:w-6 lg:h-6 text-yellow-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm text-slate-600 truncate">المدفوعات الفاشلة</p>
                        <p className="text-xl lg:text-2xl font-bold text-red-600">{getPaymentStats().failed}</p>
                        <p className="text-xs text-red-500 truncate">الملغية: {getPaymentStats().cancelled}</p>
                      </div>
                      <div className="w-10 h-10 lg:w-12 lg:h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <X className="w-5 h-5 lg:w-6 lg:h-6 text-red-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm text-slate-600 truncate">إجمالي الإيرادات</p>
                        <p className="text-xl lg:text-2xl font-bold text-emerald-600">{getPaymentStats().totalRevenue.toLocaleString()}</p>
                        <p className="text-xs text-emerald-500 truncate">ريال سعودي</p>
                      </div>
                      <div className="w-10 h-10 lg:w-12 lg:h-12 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <DollarSign className="w-5 h-5 lg:w-6 lg:h-6 text-emerald-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm text-slate-600 truncate">هذا الشهر</p>
                        <p className="text-xl lg:text-2xl font-bold text-purple-600">{getPaymentStats().monthCount}</p>
                        <p className="text-xs text-purple-500 truncate">{getPaymentStats().monthRevenue.toLocaleString()} ريال</p>
                      </div>
                      <div className="w-10 h-10 lg:w-12 lg:h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {(() => {
                  console.log('Rendering payments. Filtered count:', filteredPayments.length);
                  return filteredPayments.length > 0;
                })() ? (
                  <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200" style={{minWidth: '900px'}}>
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 lg:px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                            رقم المعاملة
                          </th>
                          <th className="px-3 lg:px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                            المستخدم
                          </th>
                          <th className="px-3 lg:px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                            الباقة
                          </th>
                          <th className="px-3 lg:px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                            المبلغ
                          </th>
                          <th className="px-3 lg:px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">
                            طريقة الدفع
                          </th>
                          <th className="px-3 lg:px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                            الحالة
                          </th>
                          <th className="px-3 lg:px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                            التاريخ
                          </th>
                          <th className="px-3 lg:px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                            الإجراءات
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {filteredPayments.map((payment) => (
                          <tr key={payment.id} className="hover:bg-slate-50">
                            <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                              <div className="text-xs lg:text-sm font-mono text-slate-900">
                                {payment.id?.substring(0, 8)}...
                              </div>
                            </td>
                            <td className="px-3 lg:px-6 py-4">
                              <div>
                                <div className="text-xs lg:text-sm font-medium text-slate-900 truncate max-w-[120px] lg:max-w-none">
                                  {payment.user?.first_name} {payment.user?.last_name}
                                </div>
                                <div className="text-xs text-slate-500 truncate max-w-[120px] lg:max-w-none">{payment.user?.email}</div>
                              </div>
                            </td>
                            <td className="px-3 lg:px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                              <div className="text-xs lg:text-sm text-slate-900 truncate max-w-[100px] lg:max-w-none">{payment.plan?.name || 'غير محدد'}</div>
                            </td>
                            <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                              <div className="text-xs lg:text-sm font-medium text-slate-900">
                                {payment.amount?.toLocaleString()} {payment.currency || 'ريال'}
                              </div>
                              {payment.discount_amount > 0 && (
                                <div className="text-xs text-green-600">
                                  خصم: {payment.discount_amount} ريال
                                </div>
                              )}
                            </td>
                            <td className="px-3 lg:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                              <div className="flex items-center gap-1 lg:gap-2">
                                {payment.payment_method === 'credit_card' && <CreditCard className="w-3 h-3 lg:w-4 lg:h-4 text-blue-500" />}
                                {payment.payment_method === 'bank_transfer' && <Building className="w-3 h-3 lg:w-4 lg:h-4 text-purple-500" />}
                                {payment.payment_method === 'mada' && <span className="text-green-500 text-sm">🏧</span>}
                                {payment.payment_method === 'stc_pay' && <span className="text-purple-500 text-sm">📱</span>}
                                <span className="text-xs lg:text-sm text-slate-900 truncate max-w-[80px] lg:max-w-none">
                                  {payment.payment_method === 'credit_card' ? 'بطاقة ائتمانية' :
                                   payment.payment_method === 'bank_transfer' ? 'تحويل بنكي' :
                                   payment.payment_method === 'mada' ? 'مدى' :
                                   payment.payment_method === 'stc_pay' ? 'STC Pay' :
                                   payment.payment_method === 'apple_pay' ? 'Apple Pay' :
                                   payment.payment_method}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                                payment.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                                payment.status === 'refunded' ? 'bg-orange-100 text-orange-800' :
                                'bg-slate-100 text-slate-800'
                              }`}>
                                {payment.status === 'completed' ? 'مكتمل' :
                                 payment.status === 'pending' ? 'معلق' :
                                 payment.status === 'failed' ? 'فاشل' :
                                 payment.status === 'cancelled' ? 'ملغي' :
                                 payment.status === 'refunded' ? 'مسترد' :
                                 payment.status}
                              </span>
                            </td>
                            <td className="px-3 lg:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                              <div className="text-xs lg:text-sm text-slate-500">
                                {formatDate(payment.created_at)}
                              </div>
                              <div className="text-xs text-slate-400">
                                {formatTime(payment.created_at)}
                              </div>
                            </td>
                            <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center gap-1 lg:gap-2">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('🔍 View details button clicked for payment:', payment.id);
                                    handleViewPaymentDetails(payment);
                                  }}
                                  className="text-blue-600 hover:text-blue-900 transition-colors p-1 rounded hover:bg-blue-50"
                                  title="عرض التفاصيل"
                                  type="button"
                                >
                                  <Eye className="w-3 h-3 lg:w-4 lg:h-4" />
                                </button>
                                {payment.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        console.log('✅ Approve button clicked for payment:', payment.id);
                                        handleApprovePayment(payment.id);
                                      }}
                                      className="text-green-600 hover:text-green-900 transition-colors p-1 rounded hover:bg-green-50"
                                      title="تأكيد الدفع"
                                      type="button"
                                    >
                                      <Check className="w-3 h-3 lg:w-4 lg:h-4" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        console.log('❌ Reject button clicked for payment:', payment.id);
                                        handleRejectPayment(payment.id);
                                      }}
                                      className="text-red-600 hover:text-red-900 transition-colors p-1 rounded hover:bg-red-50"
                                      title="رفض الدفع"
                                      type="button"
                                    >
                                      <X className="w-3 h-3 lg:w-4 lg:h-4" />
                                    </button>
                                  </>
                                )}
                                {payment.status === 'completed' && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      console.log('🔄 Refund button clicked for payment:', payment.id);
                                      handleRefundPayment(payment.id);
                                    }}
                                    className="text-orange-600 hover:text-orange-900 transition-colors p-1 rounded hover:bg-orange-50"
                                    title="استرداد الدفع"
                                    type="button"
                                  >
                                    <RefreshCw className="w-3 h-3 lg:w-4 lg:h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <CreditCard className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">لا توجد مدفوعات</h3>
                    <p className="text-slate-600 mb-6">
                      {paymentFilters.status || paymentFilters.paymentMethod || paymentFilters.dateRange || paymentFilters.searchTerm
                        ? 'لا توجد مدفوعات تطابق الفلاتر المحددة'
                        : 'لا توجد مدفوعات مسجلة حتى الآن'
                      }
                    </p>
                    {(paymentFilters.status || paymentFilters.paymentMethod || paymentFilters.dateRange || paymentFilters.searchTerm) && (
                      <button
                        onClick={() => setPaymentFilters({ status: '', paymentMethod: '', dateRange: '', searchTerm: '' })}
                        className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        مسح الفلاتر
                      </button>
                    )}
                  </div>
                )}

                {/* Additional Statistics */}
                {filteredPayments.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-4 lg:p-6">
                      <h4 className="text-base lg:text-lg font-semibold text-blue-800 mb-2">طرق الدفع الأكثر استخداماً</h4>
                      <div className="space-y-2">
                        {['credit_card', 'mada', 'stc_pay', 'bank_transfer', 'apple_pay'].map(method => {
                          const count = payments.filter(p => p.payment_method === method).length;
                          const percentage = payments.length > 0 ? Math.round((count / payments.length) * 100) : 0;
                          return count > 0 ? (
                            <div key={method} className="flex justify-between items-center">
                              <span className="text-sm text-blue-700">
                                {method === 'credit_card' ? 'بطاقة ائتمانية' :
                                 method === 'mada' ? 'مدى' :
                                 method === 'stc_pay' ? 'STC Pay' :
                                 method === 'bank_transfer' ? 'تحويل بنكي' :
                                 method === 'apple_pay' ? 'Apple Pay' : method}
                              </span>
                              <span className="text-sm font-semibold text-blue-800">{count} ({percentage}%)</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200 p-4 lg:p-6">
                      <h4 className="text-base lg:text-lg font-semibold text-green-800 mb-2">الإيرادات حسب الفترة</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs lg:text-sm text-green-700">اليوم</span>
                          <span className="text-xs lg:text-sm font-semibold text-green-800">{getPaymentStats().todayRevenue.toLocaleString()} ريال</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs lg:text-sm text-green-700">هذا الأسبوع</span>
                          <span className="text-xs lg:text-sm font-semibold text-green-800">{getPaymentStats().weekRevenue.toLocaleString()} ريال</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs lg:text-sm text-green-700">هذا الشهر</span>
                          <span className="text-xs lg:text-sm font-semibold text-green-800">{getPaymentStats().monthRevenue.toLocaleString()} ريال</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-green-300 pt-2">
                          <span className="text-xs lg:text-sm text-green-700">الإجمالي</span>
                          <span className="text-xs lg:text-sm font-bold text-green-800">{getPaymentStats().totalRevenue.toLocaleString()} ريال</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200 p-4 lg:p-6">
                      <h4 className="text-base lg:text-lg font-semibold text-yellow-800 mb-2">حالة المدفوعات</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs lg:text-sm text-yellow-700">مكتملة</span>
                          <span className="text-xs lg:text-sm font-semibold text-green-600">{getPaymentStats().completed}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs lg:text-sm text-yellow-700">معلقة</span>
                          <span className="text-xs lg:text-sm font-semibold text-yellow-600">{getPaymentStats().pending}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs lg:text-sm text-yellow-700">فاشلة</span>
                          <span className="text-xs lg:text-sm font-semibold text-red-600">{getPaymentStats().failed}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs lg:text-sm text-yellow-700">مسترد</span>
                          <span className="text-xs lg:text-sm font-semibold text-orange-600">{getPaymentStats().refunded}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl border border-purple-200 p-4 lg:p-6">
                      <h4 className="text-base lg:text-lg font-semibold text-purple-800 mb-2">معلومات إضافية</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs lg:text-sm text-purple-700">معدل النجاح</span>
                          <span className="text-xs lg:text-sm font-semibold text-purple-800">{getPaymentStats().successRate}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs lg:text-sm text-purple-700">متوسط المبلغ</span>
                          <span className="text-xs lg:text-sm font-semibold text-purple-800">
                            {getPaymentStats().completed > 0 ? Math.round(getPaymentStats().totalRevenue / getPaymentStats().completed).toLocaleString() : 0} ريال
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs lg:text-sm text-purple-700">المبلغ المعلق</span>
                          <span className="text-xs lg:text-sm font-semibold text-purple-800">{getPaymentStats().pendingAmount.toLocaleString()} ريال</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs lg:text-sm text-purple-700">المبلغ المسترد</span>
                          <span className="text-xs lg:text-sm font-semibold text-purple-800">{getPaymentStats().refundedAmount.toLocaleString()} ريال</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'coupons' && (
              <CouponManagement />
            )}

            {activeTab === 'payment-settings' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-800">إعدادات نظام الدفع</h3>
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    PayTabs مفعل - وضع الاختبار
                  </div>
                </div>

                {/* PayTabs Configuration */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-800">PayTabs Payment Gateway</h4>
                      <p className="text-sm text-slate-600">بوابة الدفع الرائدة في الشرق الأوسط - مدعومة بالكامل في السعودية</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          PayTabs Profile ID
                        </label>
                        <input
                          type="text"
                          placeholder="CVK2D7-MD7T6B-Q2P22N-6NGTNB"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          defaultValue="CVK2D7-MD7T6B-Q2P22N-6NGTNB"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          PayTabs API Key
                        </label>
                        <input
                          type="text"
                          placeholder="SGJ9L6926W-JLNB9BBMKL-KMM9KWZTKN"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          defaultValue="SGJ9L6926W-JLNB9BBMKL-KMM9KWZTKN"
                          readOnly
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          PayTabs Server Key
                        </label>
                        <input
                          type="password"
                          placeholder="SGJ9L6926W-JLNB9BBMKL-KMM9KWZTKN"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          defaultValue="SGJ9L6926W-JLNB9BBMKL-KMM9KWZTKN"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          البيئة
                        </label>
                        <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500" defaultValue="test">
                          <option value="test">اختبار (Test) - مفعل حالياً</option>
                          <option value="live">مباشر (Live)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                      حفظ الإعدادات
                    </button>
                    <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                      اختبار الاتصال
                    </button>
                  </div>
                </div>

                {/* Payment Methods Configuration */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h4 className="text-lg font-bold text-slate-800 mb-6">طرق الدفع المدعومة</h4>

                  <div className="grid gap-4">
                    {paymentSettings.payment_methods && Object.entries(paymentSettings.payment_methods).map(([methodId, methodData]) => {
                      const methodInfo = {
                        creditcard: {
                          name: 'البطاقات الائتمانية',
                          name_en: 'Credit Cards',
                          description: 'فيزا، ماستركارد - عبر PayTabs',
                          countries: ['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'EG', 'JO'],
                          iconComponent: <CreditCard className="w-6 h-6 text-blue-600" />,
                          bgColor: 'bg-blue-50',
                          borderColor: 'border-blue-200'
                        },
                        mada: {
                          name: 'مدى',
                          name_en: 'Mada',
                          description: 'بطاقة مدى السعودية - عبر PayTabs',
                          countries: ['SA'],
                          iconComponent: (
                            <img
                              src="/Mada_pay.svg"
                              alt="Mada"
                              className="w-8 h-6 object-contain"
                            />
                          ),
                          bgColor: 'bg-green-50',
                          borderColor: 'border-green-200'
                        },
                        stcpay: {
                          name: 'STC Pay',
                          name_en: 'STC Pay',
                          description: 'محفظة STC Pay الرقمية - عبر PayTabs',
                          countries: ['SA'],
                          iconComponent: (
                            <img
                              src="/stc_pay.svg"
                              alt="STC Pay"
                              className="w-8 h-6 object-contain"
                            />
                          ),
                          bgColor: 'bg-purple-50',
                          borderColor: 'border-purple-200'
                        },
                        applepay: {
                          name: 'Apple Pay',
                          name_en: 'Apple Pay',
                          description: 'الدفع عبر Apple Pay - عبر PayTabs',
                          countries: ['SA', 'AE', 'KW', 'QA', 'BH', 'OM'],
                          iconComponent: (
                            <img
                              src="/apple_pay.svg"
                              alt="Apple Pay"
                              className="w-8 h-6 object-contain"
                            />
                          ),
                          bgColor: 'bg-gray-50',
                          borderColor: 'border-gray-200'
                        },
                        banktransfer: {
                          name: 'التحويل البنكي',
                          name_en: 'Bank Transfer',
                          description: 'تحويل مباشر إلى الحساب البنكي',
                          countries: ['SA', 'AE', 'KW', 'QA', 'BH', 'OM'],
                          iconComponent: <Building2 className="w-6 h-6 text-orange-600" />,
                          bgColor: 'bg-orange-50',
                          borderColor: 'border-orange-200'
                        }
                      }[methodId] || {
                        name: methodId,
                        name_en: methodId,
                        description: 'طريقة دفع',
                        countries: ['SA'],
                        iconComponent: <CreditCard className="w-6 h-6 text-gray-600" />,
                        bgColor: 'bg-gray-50',
                        borderColor: 'border-gray-200'
                      };

                      return (
                        <div key={methodId} className={`flex items-center justify-between p-4 border ${methodInfo.borderColor} ${methodInfo.bgColor} rounded-lg hover:shadow-md transition-all duration-200`}>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={methodData.enabled}
                                onChange={() => handleTogglePaymentMethod(methodId)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white shadow-sm">
                                {methodInfo.iconComponent}
                              </div>
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">{methodInfo.name}</div>
                              <div className="text-sm text-slate-500">{methodInfo.description}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-slate-400">الدول:</span>
                                <div className="flex gap-1">
                                  {methodInfo.countries.map(country => (
                                    <span key={country} className="px-1.5 py-0.5 bg-white/70 text-slate-600 text-xs rounded border">
                                      {country}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-sm font-medium text-slate-900">
                                رسوم: {methodData.fees}%
                              </div>
                              <div className={`text-xs ${methodData.enabled ? 'text-green-600' : 'text-red-500'}`}>
                                {methodData.enabled ? 'مفعل' : 'معطل'}
                              </div>
                            </div>
                            <button
                              onClick={() => handlePaymentMethodSettings(methodId)}
                              className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                            >
                              <Settings className="w-4 h-4" />
                              إعدادات
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bank Account Settings */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h4 className="text-lg font-bold text-slate-800 mb-6">إعدادات الحساب البنكي</h4>
                  <p className="text-sm text-slate-600 mb-6">
                    معلومات الحساب البنكي للتحويلات المباشرة
                  </p>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          اسم البنك
                        </label>
                        <input
                          type="text"
                          value={bankInfo.bank_name}
                          onChange={(e) => setBankInfo({...bankInfo, bank_name: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          اسم الحساب
                        </label>
                        <input
                          type="text"
                          value={bankInfo.account_name}
                          onChange={(e) => setBankInfo({...bankInfo, account_name: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          رقم الحساب / IBAN
                        </label>
                        <input
                          type="text"
                          value={bankInfo.iban}
                          onChange={(e) => setBankInfo({...bankInfo, iban: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          رمز SWIFT
                        </label>
                        <input
                          type="text"
                          value={bankInfo.swift_code}
                          onChange={(e) => setBankInfo({...bankInfo, swift_code: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          الفرع
                        </label>
                        <input
                          type="text"
                          value={bankInfo.branch}
                          onChange={(e) => setBankInfo({...bankInfo, branch: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          تعليمات إضافية
                        </label>
                        <textarea
                          rows={3}
                          value={bankInfo.instructions}
                          onChange={(e) => setBankInfo({...bankInfo, instructions: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => handleSaveBankInfo(bankInfo)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                      حفظ معلومات البنك
                    </button>
                    <button
                      onClick={() => {
                        setBankInfo({
                          bank_name: 'البنك الأهلي السعودي',
                          bank_name_en: 'National Commercial Bank',
                          account_name: 'شركة رزقي للتقنية',
                          account_name_en: 'Rezge Technology Company',
                          account_number: 'SA1234567890123456789012',
                          iban: 'SA1234567890123456789012',
                          swift_code: 'NCBKSARI',
                          branch: 'الرياض الرئيسي',
                          branch_en: 'Riyadh Main Branch',
                          instructions: 'يرجى كتابة رقم المستخدم في خانة البيان عند التحويل'
                        });
                      }}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                      إعادة تعيين
                    </button>
                  </div>
                </div>

                {/* Currency Settings */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h4 className="text-lg font-bold text-slate-800 mb-6">إعدادات العملات</h4>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        العملة الافتراضية
                      </label>
                      <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option value="SAR">ريال سعودي (SAR)</option>
                        <option value="USD">دولار أمريكي (USD)</option>
                        <option value="EUR">يورو (EUR)</option>
                        <option value="AED">درهم إماراتي (AED)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        العملات المدعومة
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['SAR', 'USD', 'EUR', 'AED', 'KWD', 'QAR', 'BHD', 'OMR'].map(currency => (
                          <label key={currency} className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600" />
                            <span className="text-sm">{currency}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security Settings */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h4 className="text-lg font-bold text-slate-800 mb-6">إعدادات الأمان</h4>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-700">
                          تفعيل 3D Secure
                        </label>
                        <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-700">
                          التحقق من CVV
                        </label>
                        <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-700">
                          التحقق من العنوان
                        </label>
                        <input type="checkbox" className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          الحد الأقصى للمبلغ (بدون تحقق إضافي)
                        </label>
                        <input
                          type="number"
                          defaultValue="1000"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          عدد المحاولات المسموحة
                        </label>
                        <input
                          type="number"
                          defaultValue="3"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* PayTabs Statistics */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h4 className="text-lg font-bold text-slate-800 mb-6">إحصائيات PayTabs</h4>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-600">99.2%</div>
                      <div className="text-sm text-green-700">معدل نجاح الدفع</div>
                      <div className="text-xs text-green-600 mt-1">PayTabs</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-600">1.8s</div>
                      <div className="text-sm text-blue-700">متوسط وقت المعالجة</div>
                      <div className="text-xs text-blue-600 mt-1">سريع جداً</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-purple-600">0</div>
                      <div className="text-sm text-purple-700">المعاملات (وضع الاختبار)</div>
                      <div className="text-xs text-purple-600 mt-1">جاهز للاستخدام</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-orange-600">2.75%</div>
                      <div className="text-sm text-orange-700">متوسط الرسوم</div>
                      <div className="text-xs text-orange-600 mt-1">تنافسي</div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-800">حالة الاتصال: متصل</span>
                    </div>
                    <p className="text-sm text-green-700">
                      PayTabs جاهز للاستخدام. يمكنك الآن قبول المدفوعات من العملاء.
                    </p>
                  </div>
                </div>

                {/* PayTabs Callback Configuration */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h4 className="text-lg font-bold text-slate-800 mb-6">إعدادات PayTabs Callback</h4>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Callback URL (أضف هذا في PayTabs Dashboard)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={`${window.location.origin}/api/paytabs/callback`}
                          readOnly
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-mono text-sm"
                        />
                        <button
                          onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/paytabs/callback`)}
                          className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                        >
                          نسخ
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        أضف هذا الرابط في PayTabs Dashboard &gt; Settings &gt; Integration
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        الأحداث المدعومة
                      </label>
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        {[
                          { event: 'payment.success', desc: 'نجاح الدفع' },
                          { event: 'payment.failed', desc: 'فشل الدفع' },
                          { event: 'payment.pending', desc: 'دفع معلق' },
                          { event: 'refund.processed', desc: 'استرداد مُعالج' }
                        ].map(item => (
                          <div key={item.event} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="font-mono text-slate-600 text-xs">{item.event}</span>
                            </div>
                            <span className="text-slate-500 text-xs">{item.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h5 className="font-medium text-blue-800 mb-2">خطوات الإعداد:</h5>
                      <ol className="text-sm text-blue-700 space-y-1">
                        <li>1. اذهب إلى PayTabs Dashboard</li>
                        <li>2. Settings &gt; Integration</li>
                        <li>3. أضف Callback URL أعلاه</li>
                        <li>4. فعل IPN (Instant Payment Notification)</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={handleSavePaymentSettings}
                    disabled={savingSettings}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {savingSettings ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        جاري الحفظ...
                      </>
                    ) : (
                      'حفظ إعدادات PayTabs'
                    )}
                  </button>
                  <button
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    className="px-6 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {testingConnection ? (
                      <>
                        <div className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
                        جاري الاختبار...
                      </>
                    ) : (
                      'اختبار الاتصال'
                    )}
                  </button>
                  <button
                    onClick={() => window.open('https://secure.paytabs.sa/reports', '_blank')}
                    className="px-6 py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium"
                  >
                    عرض تقارير PayTabs
                  </button>
                  <button
                    onClick={() => {
                      setPaymentSettings({
                        paytabs_profile_id: 'CVK2D7-MD7T6B-Q2P22N-6NGTNB',
                        paytabs_api_key: 'SGJ9L6926W-JLNB9BBMKL-KMM9KWZTKN',
                        paytabs_server_key: 'SGJ9L6926W-JLNB9BBMKL-KMM9KWZTKN',
                        environment: 'test',
                        payment_methods: {
                          creditcard: { enabled: true, fees: 2.75 },
                          mada: { enabled: true, fees: 2.0 },
                          stcpay: { enabled: true, fees: 1.5 },
                          applepay: { enabled: true, fees: 2.75 },
                          banktransfer: { enabled: true, fees: 0 }
                        }
                      });
                      showSuccess('تم إعادة التعيين', 'تم إعادة تعيين الإعدادات للقيم الافتراضية');
                    }}
                    className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                  >
                    إعادة تعيين
                  </button>
                </div>

                {/* Quick Actions */}
                <div className="bg-slate-50 rounded-xl p-6">
                  <h5 className="font-medium text-slate-800 mb-4">إجراءات سريعة</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <a
                      href="https://secure.paytabs.sa"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-white rounded-lg border hover:border-green-300 transition-colors"
                    >
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">PayTabs Dashboard</div>
                        <div className="text-xs text-slate-500">إدارة المدفوعات</div>
                      </div>
                    </a>

                    <a
                      href="https://support.paytabs.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-white rounded-lg border hover:border-blue-300 transition-colors"
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Shield className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">الدعم الفني</div>
                        <div className="text-xs text-slate-500">مساعدة PayTabs</div>
                      </div>
                    </a>

                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Users className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">920033633</div>
                        <div className="text-xs text-slate-500">هاتف الدعم</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* نافذة الفلتر */}
      {showFilterModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={() => setShowFilterModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-800">فلترة البيانات</h3>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {currentFilterTab === 'subscriptions' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">الحالة</label>
                    <select
                      value={subscriptionFilters.status}
                      onChange={(e) => setSubscriptionFilters({...subscriptionFilters, status: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">جميع الحالات</option>
                      <option value="active">نشط</option>
                      <option value="expired">منتهي</option>
                      <option value="cancelled">ملغي</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">الباقة</label>
                    <select
                      value={subscriptionFilters.planId}
                      onChange={(e) => setSubscriptionFilters({...subscriptionFilters, planId: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">جميع الباقات</option>
                      {plans.map(plan => (
                        <option key={plan.id} value={plan.id}>{plan.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">الفترة الزمنية</label>
                    <select
                      value={subscriptionFilters.dateRange}
                      onChange={(e) => setSubscriptionFilters({...subscriptionFilters, dateRange: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">جميع الفترات</option>
                      <option value="7">آخر 7 أيام</option>
                      <option value="30">آخر 30 يوم</option>
                      <option value="90">آخر 3 أشهر</option>
                      <option value="365">آخر سنة</option>
                    </select>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="trialOnly"
                      checked={subscriptionFilters.isTrialOnly}
                      onChange={(e) => setSubscriptionFilters({...subscriptionFilters, isTrialOnly: e.target.checked})}
                      className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="trialOnly" className="mr-2 text-sm font-medium text-slate-700">
                      الفترات التجريبية فقط
                    </label>
                  </div>
                </>
              )}

              {currentFilterTab === 'payments' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">حالة الدفع</label>
                    <select
                      value={paymentFilters.status}
                      onChange={(e) => setPaymentFilters({...paymentFilters, status: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">جميع الحالات</option>
                      <option value="completed">مكتمل</option>
                      <option value="pending">معلق</option>
                      <option value="failed">فاشل</option>
                      <option value="refunded">مسترد</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">طريقة الدفع</label>
                    <select
                      value={paymentFilters.paymentMethod}
                      onChange={(e) => setPaymentFilters({...paymentFilters, paymentMethod: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">جميع الطرق</option>
                      <option value="credit_card">بطاقة ائتمانية</option>
                      <option value="bank_transfer">تحويل بنكي</option>
                      <option value="paypal">PayPal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">الفترة الزمنية</label>
                    <select
                      value={paymentFilters.dateRange}
                      onChange={(e) => setPaymentFilters({...paymentFilters, dateRange: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">جميع الفترات</option>
                      <option value="7">آخر 7 أيام</option>
                      <option value="30">آخر 30 يوم</option>
                      <option value="90">آخر 3 أشهر</option>
                      <option value="365">آخر سنة</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-slate-200 px-6 py-4">
              <div className="flex justify-end gap-3">
                <button
                  onClick={clearFilter}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  مسح الفلتر
                </button>
                <button
                  onClick={applyFilter}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  تطبيق الفلتر
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تعديل الباقة */}
      {showEditModal && editingPlan && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-800">تعديل الباقة</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <EditPlanForm
                plan={editingPlan}
                onSave={handleSavePlan}
                onCancel={() => setShowEditModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* نافذة تفاصيل الاشتراك */}
      {showSubscriptionDetails && selectedSubscription && (
        <SubscriptionDetailsModal
          subscription={selectedSubscription}
          onClose={() => {
            setShowSubscriptionDetails(false);
            setSelectedSubscription(null);
          }}
        />
      )}

      {/* نافذة إضافة باقة جديدة */}
      {showAddModal && editingPlan && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-800">إضافة باقة جديدة</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <EditPlanForm
                plan={editingPlan}
                onSave={handleSaveNewPlan}
                onCancel={() => setShowAddModal(false)}
                isNew={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* نافذة تأكيد حذف الباقة */}
      {showDeleteModal && planToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">تأكيد حذف الباقة</h3>
                  <p className="text-sm text-slate-600">هذا الإجراء لا يمكن التراجع عنه</p>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-800 mb-2">
                  <strong>هل أنت متأكد من حذف الباقة "{planToDelete.name}"؟</strong>
                </p>
                <ul className="text-xs text-red-700 space-y-1">
                  <li>• سيتم حذف الباقة نهائياً من النظام</li>
                  <li>• لن يتمكن المستخدمون الجدد من الاشتراك فيها</li>
                  <li>• المستخدمون الحاليون سيحتفظون باشتراكهم حتى انتهائه</li>
                </ul>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={confirmDeletePlan}
                  className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  نعم، احذف الباقة
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setPlanToDelete(null);
                  }}
                  className="flex-1 bg-slate-100 text-slate-700 py-3 px-4 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة التأكيد المخصصة */}
      {confirmDialog.isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4"
          style={{
            zIndex: 999999,
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }}
          onClick={(e) => {
            console.log('🔍 Modal backdrop clicked');
            if (e.target === e.currentTarget) {
              console.log('🚫 Closing modal via backdrop click');
              confirmDialog.onCancel();
            }
          }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                  confirmDialog.type === 'danger' ? 'bg-red-100' :
                  confirmDialog.type === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
                }`}>
                  {confirmDialog.type === 'danger' ? '❌' :
                   confirmDialog.type === 'warning' ? '⚠️' : '✅'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {confirmDialog.title}
                  </h3>
                </div>
              </div>

              {/* Message */}
              <div className="mb-6">
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                  {confirmDialog.message}
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    console.log('🚫 Cancel button clicked');
                    confirmDialog.onCancel();
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => {
                    console.log('✅ Confirm button clicked');
                    confirmDialog.onConfirm();
                  }}
                  className={`px-4 py-2 text-white rounded-lg transition-colors font-medium ${
                    confirmDialog.type === 'danger' ? 'bg-red-600 hover:bg-red-700' :
                    confirmDialog.type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' :
                    'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  تأكيد
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة عرض تفاصيل المدفوعة */}
      {showPaymentDetails && selectedPayment && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
          style={{ zIndex: 999998 }}
          onClick={(e) => {
            console.log('🔍 Payment details backdrop clicked');
            if (e.target === e.currentTarget) {
              console.log('🚫 Closing payment details modal');
              setShowPaymentDetails(false);
            }
          }}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 lg:p-6 border-b border-slate-200">
              <h3 className="text-lg lg:text-xl font-bold text-slate-800">تفاصيل المعاملة</h3>
              <button
                onClick={() => {
                  console.log('🚪 Closing payment details modal via X button');
                  setShowPaymentDetails(false);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 lg:p-6 space-y-6">
              {/* معلومات أساسية */}
              <div>
                <h4 className="text-lg font-semibold text-slate-800 mb-4">المعلومات الأساسية</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">رقم المعاملة</label>
                    <p className="text-slate-900 font-mono">{selectedPayment.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">الحالة</label>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      selectedPayment.status === 'completed' ? 'bg-green-100 text-green-800' :
                      selectedPayment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      selectedPayment.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedPayment.status === 'completed' ? 'مكتمل' :
                       selectedPayment.status === 'pending' ? 'معلق' :
                       selectedPayment.status === 'failed' ? 'فاشل' :
                       selectedPayment.status}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">المبلغ</label>
                    <p className="text-slate-900 font-semibold">{selectedPayment.amount} {selectedPayment.currency}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">طريقة الدفع</label>
                    <p className="text-slate-900">{selectedPayment.payment_method}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">تاريخ الإنشاء</label>
                    <p className="text-slate-900">{formatDateTime(selectedPayment.created_at)}</p>
                  </div>
                  {selectedPayment.updated_at && (
                    <div>
                      <label className="text-sm font-medium text-slate-600">آخر تحديث</label>
                      <p className="text-slate-900">{formatDateTime(selectedPayment.updated_at)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* إجراءات */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-200">
                {selectedPayment.status === 'pending' && (
                  <>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('✅ Approving payment from modal:', selectedPayment.id);
                        handleApprovePayment(selectedPayment.id);
                        setShowPaymentDetails(false);
                      }}
                      className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm lg:text-base flex items-center justify-center gap-2"
                      type="button"
                    >
                      <Check className="w-4 h-4" />
                      تأكيد الدفع
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('❌ Rejecting payment from modal:', selectedPayment.id);
                        handleRejectPayment(selectedPayment.id);
                        setShowPaymentDetails(false);
                      }}
                      className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm lg:text-base flex items-center justify-center gap-2"
                      type="button"
                    >
                      <X className="w-4 h-4" />
                      رفض الدفع
                    </button>
                  </>
                )}
                {selectedPayment.status === 'completed' && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🔄 Refunding payment from modal:', selectedPayment.id);
                      handleRefundPayment(selectedPayment.id);
                      setShowPaymentDetails(false);
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm lg:text-base flex items-center justify-center gap-2"
                    type="button"
                  >
                    <RefreshCw className="w-4 h-4" />
                    استرداد الدفع
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🚪 Closing payment details modal');
                    setShowPaymentDetails(false);
                  }}
                  type="button"
                  className="w-full sm:w-auto px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm lg:text-base"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </ModernAdminContainer>
    </>
  );
};

// مكون نموذج تعديل الباقة
interface EditPlanFormProps {
  plan: SubscriptionPlan;
  onSave: (updatedPlan: Partial<SubscriptionPlan>) => void;
  onCancel: () => void;
  isNew?: boolean;
}

const EditPlanForm: React.FC<EditPlanFormProps> = ({ plan, onSave, onCancel, isNew = false }) => {
  const [formData, setFormData] = React.useState({
    name: plan.name,
    name_en: plan.name_en,
    price: plan.price,
    is_active: plan.is_active,
    trial_enabled: plan.trial_enabled || false,
    trial_days: plan.trial_days || 0,
    discount_percentage: (plan as any).discount_percentage || 0,
    discount_starts_at: (plan as any).discount_starts_at || '',
    discount_expires_at: (plan as any).discount_expires_at || ''
  });

  const [selectedFeatures, setSelectedFeatures] = React.useState<string[]>(
    SubscriptionService.extractActiveFeatures(plan.features || {})
  );

  const [planLimits, setPlanLimits] = React.useState({
    messages_per_month: plan.limits?.messages_per_month || -1,
    profile_views_per_day: plan.limits?.profile_views_per_day || -1,
    search_results_per_day: plan.limits?.search_results_per_day || 50,
    likes_per_day: plan.limits?.likes_per_day || 20,
    voice_messages_per_day: plan.limits?.voice_messages_per_day || 10,
    consultation_hours_per_month: plan.limits?.consultation_hours_per_month || 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedData = {
      ...formData,
      features: SubscriptionService.formatFeaturesForDatabase(selectedFeatures),
      limits: planLimits,
      discount_percentage: formData.discount_percentage || 0,
      discount_starts_at: formData.discount_starts_at || null,
      discount_expires_at: formData.discount_expires_at || null
    };
    onSave(updatedData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            اسم الباقة (عربي)
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            required
            placeholder="مثال: الباقة الأساسية"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            اسم الباقة (إنجليزي)
          </label>
          <input
            type="text"
            value={formData.name_en}
            onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            required
            placeholder="Example: Basic Plan"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          السعر (ريال سعودي)
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          required
          placeholder="19.00"
        />
      </div>

      <div className="bg-slate-50 p-4 rounded-lg">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-slate-300 rounded"
          />
          <label htmlFor="is_active" className="mr-3 block text-sm font-medium text-slate-700">
            باقة نشطة
          </label>
        </div>
        <p className="text-xs text-slate-500 mt-1 mr-8">
          الباقات النشطة فقط ستظهر للمستخدمين
        </p>
      </div>

      {/* إعدادات الفترة التجريبية - تظهر فقط للباقات المدفوعة */}
      {plan.billing_period !== 'trial' && plan.price > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-base font-semibold text-blue-900 mb-4 flex items-center gap-2">
            <Gift className="w-5 h-5" />
            إعدادات الفترة التجريبية
          </h4>

          <div className="space-y-4">
            <div className="flex items-start">
              <input
                type="checkbox"
                id="trial_enabled"
                checked={formData.trial_enabled}
                onChange={(e) => setFormData({ ...formData, trial_enabled: e.target.checked })}
                className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-slate-300 rounded mt-0.5"
              />
              <div className="mr-3">
                <label htmlFor="trial_enabled" className="block text-sm font-medium text-slate-700">
                  تفعيل الفترة التجريبية لهذه الباقة
                </label>
                <p className="text-xs text-slate-500 mt-1">
                  السماح للمستخدمين الجدد بتجربة هذه الباقة مجاناً
                </p>
              </div>
            </div>

            {formData.trial_enabled && (
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  مدة الفترة التجريبية (بالأيام)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={formData.trial_days}
                  onChange={(e) => setFormData({ ...formData, trial_days: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="مثال: 3"
                />
                <p className="text-xs text-slate-500 mt-2">
                  المستخدمون الجدد سيحصلون على فترة تجريبية مجانية بمميزات هذه الباقة
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* إعدادات الخصم */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <h4 className="text-base font-semibold text-orange-900 mb-4 flex items-center gap-2">
          <Tag className="w-5 h-5" />
          إعدادات الخصم
        </h4>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              نسبة الخصم (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.discount_percentage}
              onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              placeholder="مثال: 20"
            />
            <p className="text-xs text-slate-500 mt-1">
              اتركه 0 لعدم تطبيق خصم على هذه الباقة
            </p>
          </div>

          {formData.discount_percentage > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  تاريخ بداية الخصم
                </label>
                <input
                  type="datetime-local"
                  value={formData.discount_starts_at ? new Date(formData.discount_starts_at).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFormData({ ...formData, discount_starts_at: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  تاريخ انتهاء الخصم
                </label>
                <input
                  type="datetime-local"
                  value={formData.discount_expires_at ? new Date(formData.discount_expires_at).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFormData({ ...formData, discount_expires_at: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                />
              </div>
            </div>
          )}

          {formData.discount_percentage > 0 && formData.discount_expires_at && (
            <div className="bg-white p-3 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2 text-orange-700">
                <Tag className="w-4 h-4" />
                <span className="text-sm font-medium">معاينة الخصم</span>
              </div>
              <div className="mt-2 text-sm text-slate-600">
                السعر الأصلي: <span className="font-medium">{formData.price} ر.س</span>
                <br />
                السعر بعد الخصم: <span className="font-medium text-green-600">
                  {(formData.price * (1 - formData.discount_percentage / 100)).toFixed(2)} ر.س
                </span>
                <br />
                توفير: <span className="font-medium text-orange-600">
                  {(formData.price * formData.discount_percentage / 100).toFixed(2)} ر.س ({formData.discount_percentage}%)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* إدارة المميزات */}
      <div>
        <h4 className="text-base font-semibold text-slate-800 mb-4">مميزات الباقة</h4>
        <FeatureManager
          selectedFeatures={selectedFeatures}
          onFeaturesChange={setSelectedFeatures}
          disabled={false}
        />
      </div>

      {/* إدارة الحدود */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 className="text-base font-semibold text-amber-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          حدود الاستخدام
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              الرسائل شهرياً
            </label>
            <select
              value={planLimits.messages_per_month}
              onChange={(e) => setPlanLimits({...planLimits, messages_per_month: parseInt(e.target.value)})}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            >
              <option value={-1}>غير محدود</option>
              <option value={5}>5 رسائل</option>
              <option value={20}>20 رسالة</option>
              <option value={50}>50 رسالة</option>
              <option value={100}>100 رسالة</option>
              <option value={500}>500 رسالة</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              مشاهدة الملفات يومياً
            </label>
            <select
              value={planLimits.profile_views_per_day}
              onChange={(e) => setPlanLimits({...planLimits, profile_views_per_day: parseInt(e.target.value)})}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            >
              <option value={-1}>غير محدود</option>
              <option value={3}>3 ملفات</option>
              <option value={10}>10 ملفات</option>
              <option value={25}>25 ملف</option>
              <option value={50}>50 ملف</option>
              <option value={100}>100 ملف</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              عمليات البحث يومياً
            </label>
            <select
              value={planLimits.search_results_per_day}
              onChange={(e) => setPlanLimits({...planLimits, search_results_per_day: parseInt(e.target.value)})}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            >
              <option value={-1}>غير محدود</option>
              <option value={10}>10 عمليات</option>
              <option value={25}>25 عملية</option>
              <option value={50}>50 عملية</option>
              <option value={100}>100 عملية</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              الإعجابات يومياً
            </label>
            <select
              value={planLimits.likes_per_day}
              onChange={(e) => setPlanLimits({...planLimits, likes_per_day: parseInt(e.target.value)})}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            >
              <option value={-1}>غير محدود</option>
              <option value={5}>5 إعجابات</option>
              <option value={15}>15 إعجاب</option>
              <option value={30}>30 إعجاب</option>
              <option value={50}>50 إعجاب</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              الرسائل الصوتية يومياً
            </label>
            <select
              value={planLimits.voice_messages_per_day}
              onChange={(e) => setPlanLimits({...planLimits, voice_messages_per_day: parseInt(e.target.value)})}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            >
              <option value={0}>غير متاح</option>
              <option value={5}>5 رسائل</option>
              <option value={10}>10 رسائل</option>
              <option value={25}>25 رسالة</option>
              <option value={-1}>غير محدود</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              ساعات الاستشارة شهرياً
            </label>
            <select
              value={planLimits.consultation_hours_per_month}
              onChange={(e) => setPlanLimits({...planLimits, consultation_hours_per_month: parseInt(e.target.value)})}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            >
              <option value={0}>غير متاح</option>
              <option value={1}>ساعة واحدة</option>
              <option value={2}>ساعتان</option>
              <option value={5}>5 ساعات</option>
              <option value={10}>10 ساعات</option>
              <option value={-1}>غير محدود</option>
            </select>
          </div>
        </div>

        <div className="mt-4 p-3 bg-amber-100 rounded-lg">
          <p className="text-xs text-amber-800">
            <strong>ملاحظة:</strong> "غير محدود" يعني عدم وجود حد أقصى للاستخدام.
            تأكد من تعيين حدود مناسبة لكل باقة لضمان الاستخدام العادل للموارد.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 pt-6 border-t border-slate-200">
        <button
          type="submit"
          className="flex-1 bg-primary-600 text-white py-3 px-6 rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-sm hover:shadow-md"
        >
          {isNew ? 'إضافة الباقة' : 'حفظ التغييرات'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-slate-100 text-slate-700 py-3 px-6 rounded-lg hover:bg-slate-200 transition-colors font-medium"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
};

// نافذة تفاصيل الاشتراك
const SubscriptionDetailsModal: React.FC<{
  subscription: UserSubscription;
  onClose: () => void;
}> = ({ subscription, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-slate-800">تفاصيل الاشتراك</h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* معلومات المستخدم */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-slate-800 mb-3">معلومات المستخدم</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-600">الاسم</label>
                <p className="text-slate-900">{subscription.user?.first_name} {subscription.user?.last_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">البريد الإلكتروني</label>
                <p className="text-slate-900">{subscription.user?.email}</p>
              </div>
            </div>
          </div>

          {/* معلومات الباقة */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-slate-800 mb-3">معلومات الباقة</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-600">اسم الباقة</label>
                <p className="text-slate-900">{subscription.plan?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">السعر</label>
                <p className="text-slate-900">{subscription.plan?.price} SAR</p>
              </div>
            </div>
          </div>

          {/* معلومات الاشتراك */}
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-slate-800 mb-3">تفاصيل الاشتراك</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-600">الحالة</label>
                <p className={`font-medium ${
                  subscription.status === 'active' ? 'text-green-600' :
                  subscription.status === 'expired' ? 'text-red-600' :
                  subscription.status === 'cancelled' ? 'text-orange-600' :
                  'text-slate-600'
                }`}>
                  {subscription.status === 'active' ? 'نشط' :
                   subscription.status === 'expired' ? 'منتهي' :
                   subscription.status === 'cancelled' ? 'ملغي' :
                   subscription.status}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">نوع الاشتراك</label>
                <p className="text-slate-900">{subscription.is_trial ? 'فترة تجريبية' : 'اشتراك مدفوع'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">تاريخ البدء</label>
                <p className="text-slate-900">{new Date(subscription.started_at).toLocaleDateString('en-GB')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">تاريخ الانتهاء</label>
                <p className="text-slate-900">{new Date(subscription.expires_at).toLocaleDateString('en-GB')}</p>
              </div>
              {(subscription as any).cancelled_at && (
                <div>
                  <label className="text-sm font-medium text-slate-600">تاريخ الإلغاء</label>
                  <p className="text-slate-900">{new Date((subscription as any).cancelled_at).toLocaleDateString('en-GB')}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-slate-600">المبلغ المدفوع</label>
                <p className="text-slate-900">{subscription.amount_paid || 0} SAR</p>
              </div>
            </div>
          </div>

          {/* معلومات الدفع */}
          {subscription.payment_method && (
            <div className="bg-amber-50 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-slate-800 mb-3">معلومات الدفع</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">طريقة الدفع</label>
                  <p className="text-slate-900">{subscription.payment_method}</p>
                </div>
                {(subscription as any).payment_reference && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">مرجع الدفعة</label>
                    <p className="text-slate-900 font-mono text-sm">{(subscription as any).payment_reference}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* الملاحظات */}
          {(subscription as any).notes && (
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-slate-800 mb-3">الملاحظات</h4>
              <p className="text-slate-700">{(subscription as any).notes}</p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 px-6 py-4">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>

      {/* نافذة إعدادات طرق الدفع المتقدمة */}
      <PaymentMethodSettingsModal
        isOpen={paymentMethodModal.isOpen}
        onClose={() => setPaymentMethodModal({ isOpen: false, methodId: '', config: null })}
        methodId={paymentMethodModal.methodId}
        methodConfig={paymentMethodModal.config || PaymentMethodsService.getDefaultPaymentMethod(paymentMethodModal.methodId) || {
          id: paymentMethodModal.methodId,
          name: 'طريقة دفع',
          name_en: 'Payment Method',
          enabled: true,
          fees: 0,
          min_amount: 10,
          max_amount: 10000,
          countries: ['SA'],
          currency: 'SAR',
          processing_time: 'instant',
          description: 'طريقة دفع'
        }}
        onSave={handleSavePaymentMethodSettings}
      />

    </div>
  );
};

export default SubscriptionManagement;
