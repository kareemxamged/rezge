import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Search,
  Bell,
  Settings,
  User,
  LogOut,
  Shield,
  ChevronDown,

  Maximize,
  Minimize,

} from 'lucide-react';
import { useSeparateAdmin } from './SeparateAdminProvider';

import { separateAdminAuth } from '../../lib/separateAdminAuth';
import { SimpleThemeToggle } from '../../contexts/ThemeContext';

interface ModernAdminHeaderProps {
  onMenuToggle: () => void;
  sidebarCollapsed: boolean;
  isMobile: boolean;
}

const ModernAdminHeader: React.FC<ModernAdminHeaderProps> = ({
  onMenuToggle,
  sidebarCollapsed,
  isMobile
}) => {
  const { adminAccount } = useSeparateAdmin();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);


  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // إغلاق القوائم عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // اختصارات لوحة المفاتيح
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + / للبحث (بدلاً من K لتجنب تعارض مع المتصفح)
      if ((event.ctrlKey || event.metaKey) && event.key === '/') {
        event.preventDefault();
        searchRef.current?.focus();
      }

      // Escape لإغلاق القوائم
      if (event.key === 'Escape') {
        setShowProfileMenu(false);
        setShowNotifications(false);
        // إزالة التركيز من البحث عند الضغط على Escape
        if (document.activeElement === searchRef.current) {
          searchRef.current?.blur();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    try {
      // تسجيل الخروج من النظام الإداري المنفصل
      await separateAdminAuth.logout();

      // توجيه لصفحة تسجيل الدخول الإدارية
      window.location.href = '/admin/login';
    } catch (error) {
      console.error('❌ Error during admin logout:', error);
      // في حالة الخطأ، توجيه مباشر
      window.location.href = '/admin/login';
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };



  return (
    <header className="modern-admin-header">
      <div className="header-container">
        {/* الجانب الأيمن */}
        <div className="header-left">
          {/* زر القائمة */}
          <button
            onClick={onMenuToggle}
            className="menu-toggle-btn modern-focus"
            aria-label={isMobile ? 'فتح القائمة' : sidebarCollapsed ? 'توسيع الشريط الجانبي' : 'طي الشريط الجانبي'}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* شعار لوحة التحكم */}
          <div className="header-logo">
            <div className="logo-icon">
              <Shield className="w-5 h-5" />
            </div>
            <div className="logo-text">
              <h1>لوحة التحكم</h1>
              <span>رزقي - الإدارة</span>
            </div>
          </div>
        </div>

        {/* الوسط - البحث */}
        <div className="header-center">
          <div className="search-container">
            <Search className="search-icon" />
            <input
              ref={searchRef}
              type="text"
              placeholder="البحث... (Ctrl+/)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input modern-focus"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="search-clear"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* الجانب الأيسر */}
        <div className="header-right">
          {/* أدوات سريعة */}
          <div className="quick-tools">
            {/* تبديل الثيم */}
            <SimpleThemeToggle className="tool-btn modern-focus" />

            {/* ملء الشاشة */}
            <button
              onClick={toggleFullscreen}
              className="tool-btn modern-focus"
              title="ملء الشاشة"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>

            {/* الإشعارات */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="tool-btn modern-focus relative"
                title="الإشعارات"
              >
                <Bell className="w-4 h-4" />
                <span className="notification-badge">3</span>
              </button>

              {showNotifications && (
                <div className="notifications-dropdown animate-slide-in-up">
                  <div className="dropdown-header">
                    <h3>الإشعارات</h3>
                    <span className="badge">3 جديد</span>
                  </div>
                  <div className="notifications-list">
                    <div className="notification-item">
                      <div className="notification-icon bg-blue-100 text-blue-600">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="notification-content">
                        <p>مستخدم جديد انضم للموقع</p>
                        <span>منذ 5 دقائق</span>
                      </div>
                    </div>
                    <div className="notification-item">
                      <div className="notification-icon bg-green-100 text-green-600">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div className="notification-content">
                        <p>تم تحديث إعدادات الأمان</p>
                        <span>منذ ساعة</span>
                      </div>
                    </div>
                    <div className="notification-item">
                      <div className="notification-icon bg-yellow-100 text-yellow-600">
                        <Settings className="w-4 h-4" />
                      </div>
                      <div className="notification-content">
                        <p>صيانة مجدولة للنظام</p>
                        <span>منذ 3 ساعات</span>
                      </div>
                    </div>
                  </div>
                  <div className="dropdown-footer">
                    <button className="view-all-btn">عرض جميع الإشعارات</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* الملف الشخصي */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="profile-btn modern-focus"
            >
              <div className="profile-avatar">
                {adminAccount?.profile_image_url ? (
                  <img
                    src={adminAccount.profile_image_url}
                    alt="الملف الشخصي"
                    className="avatar-image"
                  />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </div>
              <div className="profile-info">
                <span className="profile-name">
                  {adminAccount?.first_name && adminAccount?.last_name
                    ? `${adminAccount.first_name} ${adminAccount.last_name}`
                    : adminAccount?.email || 'المشرف'
                  }
                </span>
                <span className="profile-role">{adminAccount?.is_super_admin ? 'مشرف عام' : 'مشرف'}</span>
              </div>
              <ChevronDown className="w-4 h-4 profile-arrow" />
            </button>

            {showProfileMenu && (
              <div className="profile-dropdown animate-slide-in-up">
                <div className="dropdown-header">
                  <div className="profile-avatar large">
                    {adminAccount?.profile_image_url ? (
                      <img
                        src={adminAccount.profile_image_url}
                        alt="الملف الشخصي"
                        className="avatar-image"
                      />
                    ) : (
                      <User className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h3>
                      {adminAccount?.first_name && adminAccount?.last_name
                        ? `${adminAccount.first_name} ${adminAccount.last_name}`
                        : 'المشرف'
                      }
                    </h3>
                    <p>{adminAccount?.email}</p>
                  </div>
                </div>
                
                <div className="dropdown-menu">
                  <button className="menu-item">
                    <User className="w-4 h-4" />
                    <span>الملف الشخصي</span>
                  </button>
                  <button className="menu-item">
                    <Settings className="w-4 h-4" />
                    <span>الإعدادات</span>
                  </button>
                  <div className="menu-divider"></div>
                  <button 
                    onClick={handleLogout}
                    className="menu-item danger"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default ModernAdminHeader;
