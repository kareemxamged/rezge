import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, 
  X, 
  Bell, 
  Settings, 
  LogOut, 
  User, 
  Shield,
  ChevronDown,
  Search,
  Moon,
  Sun
} from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import { useAuth } from '../../contexts/AuthContext';

interface AdminHeaderProps {
  onMenuToggle?: () => void;
  isSidebarOpen?: boolean;
  isMobile?: boolean;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({
  onMenuToggle,
  isSidebarOpen = false,
  isMobile = false
}) => {
  const { adminUser, logout: adminLogout } = useAdmin();
  const { signOut } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // إغلاق القوائم عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await adminLogout();
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    // يمكن إضافة منطق تطبيق الوضع المظلم هنا
  };

  return (
    <header className="admin-header admin-transition sticky top-0" dir="rtl">
      <div className="flex items-center justify-between h-16 px-6">
        {/* الجانب الأيمن - الشعار والقائمة */}
        <div className="flex items-center gap-4">
          {/* زر القائمة للجوال */}
          {isMobile && (
            <button
              onClick={onMenuToggle}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label={isSidebarOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            >
              {isSidebarOpen ? (
                <X className="w-5 h-5 text-slate-600" />
              ) : (
                <Menu className="w-5 h-5 text-slate-600" />
              )}
            </button>
          )}

          {/* الشعار المنفصل للوحة الإدارة */}
          <div className="flex items-center gap-3">
            <div className="admin-header-logo admin-icon w-10 h-10 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="admin-text-gradient text-xl font-bold">لوحة التحكم الإدارية</h1>
              <p className="text-sm text-slate-500">رزقي - نظام الإدارة</p>
            </div>
          </div>
        </div>

        {/* الوسط - شريط البحث */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="البحث في لوحة التحكم..."
              className="w-full pr-10 pl-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* الجانب الأيسر - الإشعارات والملف الشخصي */}
        <div className="flex items-center gap-3">
          {/* زر الوضع المظلم */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            title={darkMode ? 'الوضع النهاري' : 'الوضع المظلم'}
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-slate-600" />
            ) : (
              <Moon className="w-5 h-5 text-slate-600" />
            )}
          </button>

          {/* الإشعارات */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <Bell className="w-5 h-5 text-slate-600" />
              {/* نقطة الإشعارات */}
              <span className="absolute top-1 left-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* قائمة الإشعارات */}
            {showNotifications && (
              <div className="admin-dropdown admin-fade-in absolute left-0 mt-2 w-80 rounded-lg border border-slate-200 py-2">
                <div className="px-4 py-2 border-b border-slate-200">
                  <h3 className="font-medium text-slate-800">الإشعارات</h3>
                </div>
                
                <div className="max-h-64 overflow-y-auto">
                  {/* إشعار مثال */}
                  <div className="px-4 py-3 hover:bg-slate-50 cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">مستخدم جديد</p>
                        <p className="text-xs text-slate-600">انضم مستخدم جديد إلى المنصة</p>
                        <p className="text-xs text-slate-400 mt-1">منذ 5 دقائق</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="px-4 py-3 hover:bg-slate-50 cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">تنبيه أمني</p>
                        <p className="text-xs text-slate-600">محاولة دخول مشبوهة</p>
                        <p className="text-xs text-slate-400 mt-1">منذ 15 دقيقة</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="px-4 py-2 border-t border-slate-200">
                  <button className="text-sm text-primary-600 hover:text-primary-700">
                    عرض جميع الإشعارات
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* الملف الشخصي */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden">
                {adminUser?.user_profile?.profile_image_url ? (
                  <img
                    src={adminUser.user_profile.profile_image_url}
                    alt={`${adminUser.user_profile.first_name || ''} ${adminUser.user_profile.last_name || ''}`}
                    className="w-8 h-8 rounded-full object-cover"
                    onError={(e) => {
                      // في حالة فشل تحميل الصورة، عرض الأيقونة الافتراضية
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                          </svg>
                        `;
                      }
                    }}
                  />
                ) : (
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-600" />
                  </div>
                )}
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-slate-800">
                  {adminUser?.user_profile?.first_name && adminUser?.user_profile?.last_name
                    ? `${adminUser.user_profile.first_name} ${adminUser.user_profile.last_name}`
                    : 'المشرف'
                  }
                </p>
                <p className="text-xs text-slate-500">
                  {adminUser?.role?.display_name || 'مشرف'}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {/* قائمة الملف الشخصي */}
            {showProfileMenu && (
              <div className="admin-dropdown admin-fade-in absolute left-0 mt-2 w-48 rounded-lg border border-slate-200 py-2">
                <div className="px-4 py-2 border-b border-slate-200">
                  <p className="text-sm font-medium text-slate-800">
                    {adminUser?.user_profile?.email}
                  </p>
                  <p className="text-xs text-slate-500">
                    {adminUser?.is_super_admin ? 'مشرف عام' : adminUser?.role?.display_name}
                  </p>
                </div>
                
                <button className="w-full px-4 py-2 text-right text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  الملف الشخصي
                </button>
                
                <button className="w-full px-4 py-2 text-right text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  الإعدادات
                </button>
                
                <div className="border-t border-slate-200 my-2"></div>
                
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-right text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  تسجيل الخروج
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* شريط البحث للجوال */}
      <div className="md:hidden px-6 pb-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="البحث..."
            className="w-full pr-10 pl-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
