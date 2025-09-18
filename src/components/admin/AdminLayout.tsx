import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { AdminProvider } from '../../contexts/AdminContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import SeparateAdminProvider from './SeparateAdminProvider';
import ModernAdminHeader from './ModernAdminHeader';
import ModernAdminSidebar from './ModernAdminSidebar';
import ModernAdminQualityCheck from './ModernAdminQualityCheck';
import SeparateAdminRoute from './SeparateAdminRoute';
import '../../styles/modern-admin.css';
import '../../styles/custom-scrollbar.css';
import '../../styles/themes.css';
import '../../styles/admin-modals-theme.css';

const AdminLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // تحديد حجم الشاشة
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);

      if (mobile) {
        setSidebarCollapsed(false);
        setSidebarOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      setSidebarOpen(!sidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // منع التمرير في الخلفية عند فتح القائمة في الجوال
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobile, sidebarOpen]);

  return (
    <ThemeProvider>
      <AdminProvider>
        <SeparateAdminProvider>
          <SeparateAdminRoute>
        <div className="modern-admin-layout" dir="rtl">
          {/* الشريط الجانبي المودرن */}
          <ModernAdminSidebar
            collapsed={sidebarCollapsed}
            isOpen={sidebarOpen}
            isMobile={isMobile}
            onClose={closeSidebar}
          />

          {/* المحتوى الرئيسي */}
          <div className={`modern-admin-main ${
            isMobile
              ? 'mobile'
              : sidebarCollapsed
                ? 'sidebar-collapsed'
                : 'sidebar-expanded'
          }`}>
            {/* الهيدر المودرن */}
            <ModernAdminHeader
              onMenuToggle={toggleSidebar}
              sidebarCollapsed={sidebarCollapsed}
              isMobile={isMobile}
            />

            {/* منطقة المحتوى */}
            <main className="modern-admin-content">
              <div className="content-wrapper">
                <Outlet />
              </div>
            </main>
          </div>

          {/* خلفية للجوال */}
          {isMobile && sidebarOpen && (
            <div
              className="mobile-overlay"
              onClick={closeSidebar}
            />
          )}

          {/* مكون فحص الجودة - يظهر في وضع التطوير فقط */}
          <ModernAdminQualityCheck />
        </div>
          </SeparateAdminRoute>
        </SeparateAdminProvider>
      </AdminProvider>
    </ThemeProvider>
  );
};

export default AdminLayout;
