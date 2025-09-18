import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, User, Menu, LogOut, Shield, X, Activity, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import LanguageToggle from './LanguageToggle';
import NotificationDropdown from './NotificationDropdown';
import SubscriptionStatus from './SubscriptionStatus';
import { profileImageService } from '../lib/profileImageService';
import type { ProfileImage } from '../lib/profileImageService';

const Header: React.FC = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { isAuthenticated, userProfile, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [profileImage, setProfileImage] = useState<ProfileImage | null>(null);
  const [isImageVisible, setIsImageVisible] = useState(true);
  // إغلاق القوائم عند تغيير المسار
  useEffect(() => {
    setShowUserMenu(false);
    setShowMobileMenu(false);
  }, [location.pathname]);

  // إغلاق القوائم عند الضغط على Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowUserMenu(false);
        setShowMobileMenu(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // تحميل الصورة الشخصية
  useEffect(() => {
    const loadProfileImage = async () => {
      if (userProfile?.id && isAuthenticated) {
        try {
          const image = await profileImageService.getUserPrimaryImage(userProfile.id);
          setProfileImage(image);
          setIsImageVisible(userProfile.profile_image_visible !== false);
        } catch (error) {
          console.error('خطأ في تحميل الصورة الشخصية في الهيدر:', error);
        }
      }
    };

    loadProfileImage();

    // إضافة مستمع للأحداث لتحديث الصورة عند تغيير الإعدادات
    const handleProfileImageUpdate = () => {
      loadProfileImage();
    };

    window.addEventListener('profileImageUpdated', handleProfileImageUpdate);
    window.addEventListener('profileSettingsUpdated', handleProfileImageUpdate);

    return () => {
      window.removeEventListener('profileImageUpdated', handleProfileImageUpdate);
      window.removeEventListener('profileSettingsUpdated', handleProfileImageUpdate);
    };
  }, [userProfile?.id, isAuthenticated, userProfile?.profile_image_visible]);

  // الحصول على URL الصورة الشخصية
  const getProfileImageUrl = () => {
    if (profileImage && isImageVisible && profileImage.file_path) {
      if (profileImage.file_path.startsWith('http')) {
        return profileImage.file_path;
      }
    }
    return null;
  };

  return (
    <header className="bg-white shadow-sm border-b border-slate-100 relative z-50" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 lg:h-20">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 lg:gap-3">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-primary-500 to-emerald-500 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg">
                <Heart className="w-5 h-5 lg:w-7 lg:h-7 text-white" />
              </div>
              <h1 className="text-xl lg:text-3xl font-bold text-slate-800 font-display">
                {t('header.brand.name')}
              </h1>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
            <Link
              to="/"
              className={`transition-colors duration-200 font-medium text-base xl:text-lg ${
                location.pathname === '/'
                  ? 'text-primary-600'
                  : 'text-slate-600 hover:text-primary-600'
              }`}
            >
              {t('navigation.home')}
            </Link>

            {/* روابط للمستخدمين المسجلين فقط */}
            {isAuthenticated ? (
              <>
                <Link
                  to="/search"
                  className={`transition-colors duration-200 font-medium text-base xl:text-lg ${
                    location.pathname === '/search'
                      ? 'text-primary-600'
                      : 'text-slate-600 hover:text-primary-600'
                  }`}
                >
                  {t('navigation.search')}
                </Link>
                <Link
                  to="/messages"
                  className={`transition-colors duration-200 font-medium text-base xl:text-lg ${
                    location.pathname === '/messages'
                      ? 'text-primary-600'
                      : 'text-slate-600 hover:text-primary-600'
                  }`}
                >
                  {t('navigation.messages')}
                </Link>
                <Link
                  to="/likes"
                  className={`transition-colors duration-200 font-medium text-base xl:text-lg ${
                    location.pathname === '/likes'
                      ? 'text-primary-600'
                      : 'text-slate-600 hover:text-primary-600'
                  }`}
                >
                  {t('navigation.likes')}
                </Link>
                <Link
                  to="/matches"
                  className={`transition-colors duration-200 font-medium text-base xl:text-lg ${
                    location.pathname === '/matches'
                      ? 'text-primary-600'
                      : 'text-slate-600 hover:text-primary-600'
                  }`}
                >
                  {t('navigation.matches')}
                </Link>
                <Link
                  to="/articles"
                  className={`transition-colors duration-200 font-medium text-base xl:text-lg ${
                    location.pathname === '/articles' || location.pathname.startsWith('/articles/')
                      ? 'text-primary-600'
                      : 'text-slate-600 hover:text-primary-600'
                  }`}
                >
                  {t('navigation.articles')}
                </Link>
              </>
            ) : (
              /* روابط للزوار غير المسجلين */
              <>
                <Link
                  to="/features"
                  className={`transition-colors duration-200 font-medium text-base xl:text-lg ${
                    location.pathname === '/features'
                      ? 'text-primary-600'
                      : 'text-slate-600 hover:text-primary-600'
                  }`}
                >
                  {t('navigation.features')}
                </Link>
                <Link
                  to="/about"
                  className={`transition-colors duration-200 font-medium text-base xl:text-lg ${
                    location.pathname === '/about'
                      ? 'text-primary-600'
                      : 'text-slate-600 hover:text-primary-600'
                  }`}
                >
                  {t('navigation.about')}
                </Link>
                <Link
                  to="/contact"
                  className={`transition-colors duration-200 font-medium text-base xl:text-lg ${
                    location.pathname === '/contact'
                      ? 'text-primary-600'
                      : 'text-slate-600 hover:text-primary-600'
                  }`}
                >
                  {t('navigation.contact')}
                </Link>
                <Link
                  to="/articles"
                  className={`transition-colors duration-200 font-medium text-base xl:text-lg ${
                    location.pathname === '/articles' || location.pathname.startsWith('/articles/')
                      ? 'text-primary-600'
                      : 'text-slate-600 hover:text-primary-600'
                  }`}
                >
                  {t('navigation.articles')}
                </Link>
              </>
            )}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2 lg:gap-4">
            {/* Language toggle - shown on all screen sizes */}
            <div>
              <LanguageToggle />
            </div>

            {/* Subscription Status - shown only for authenticated users */}
            {isAuthenticated && (
              <div>
                <SubscriptionStatus />
              </div>
            )}

            {/* Notifications - shown only for authenticated users */}
            {isAuthenticated && (
              <div>
                <NotificationDropdown />
              </div>
            )}

            {isAuthenticated ? (
              /* قائمة المستخدم المسجل */
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 lg:gap-3 px-2 lg:px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-primary-500 to-emerald-500 rounded-full flex items-center justify-center overflow-hidden">
                    {getProfileImageUrl() ? (
                      <img
                        src={getProfileImageUrl()!}
                        alt={`${userProfile?.first_name} ${userProfile?.last_name}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // في حالة فشل تحميل الصورة، أظهر الأيقونة الافتراضية
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            const userIcon = parent.querySelector('.user-icon-fallback');
                            if (userIcon) {
                              (userIcon as HTMLElement).style.display = 'block';
                            }
                          }
                        }}
                      />
                    ) : null}
                    <User className={`w-4 h-4 lg:w-5 lg:h-5 text-white user-icon-fallback ${getProfileImageUrl() ? 'hidden' : 'block'}`} />
                  </div>
                  <div className={`hidden sm:block ${i18n.language === 'ar' ? 'text-right' : 'text-left'} max-w-32 lg:max-w-none`}>
                    <div className="text-sm font-medium text-slate-800 truncate">
                      {userProfile?.first_name} {userProfile?.last_name}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {userProfile?.verified ? t('navigation.verified') : t('navigation.underReview')}
                    </div>
                  </div>
                </button>

                {/* قائمة منسدلة */}
                {showUserMenu && (
                  <>
                    <div className={`
                      absolute mt-2 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50
                      transform transition-all duration-200 ease-out
                      w-56 max-w-[calc(100vw-2rem)]
                      ${i18n.language === 'ar'
                        ? 'left-0 origin-top-left'
                        : 'right-0 origin-top-right'
                      }
                      sm:w-64
                    `}>
                      <Link
                        to="/dashboard"
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-sm whitespace-nowrap"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Activity className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        <span className="text-slate-800">{t('navigation.dashboard')}</span>
                      </Link>
                      <Link
                        to="/profile"
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-sm whitespace-nowrap"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        <span className="text-slate-800">{t('navigation.profile')}</span>
                      </Link>
                      <Link
                        to="/subscription"
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-sm whitespace-nowrap"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Crown className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        <span className="text-slate-800">{t('navigation.plans', 'الباقات')}</span>
                      </Link>
                      <Link
                        to="/security"
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-sm whitespace-nowrap"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Shield className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        <span className="text-slate-800">{t('navigation.security')}</span>
                      </Link>
                      <hr className="my-2 border-slate-200" />
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          signOut();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-red-600 text-sm whitespace-nowrap"
                      >
                        <LogOut className="w-4 h-4 flex-shrink-0" />
                        <span>{t('navigation.logout')}</span>
                      </button>
                    </div>
                    {/* طبقة لإغلاق القائمة عند النقر خارجها */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowUserMenu(false)}
                    />
                  </>
                )}
              </div>
            ) : (
              /* أزرار تسجيل الدخول للزوار */
              <div className="hidden md:flex items-center gap-2 lg:gap-3">
                <Link
                  to="/login"
                  className="px-3 lg:px-6 py-2 lg:py-3 text-primary-600 border border-primary-200 rounded-lg lg:rounded-xl hover:bg-primary-50 transition-all duration-200 font-medium text-sm lg:text-base"
                >
                  {t('navigation.login')}
                </Link>
                <Link
                  to="/register"
                  className="px-3 lg:px-6 py-2 lg:py-3 bg-gradient-to-r from-primary-600 to-emerald-600 text-white rounded-lg lg:rounded-xl hover:from-primary-700 hover:to-emerald-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl text-sm lg:text-base"
                >
                  {t('navigation.register')}
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden p-2 text-slate-600 hover:text-primary-600 transition-colors"
              aria-label={t('navigation.openMenu')}
            >
              {showMobileMenu ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {showMobileMenu && (
          <>
            <div className="lg:hidden absolute top-full left-0 right-0 bg-white border-t border-slate-200 shadow-xl z-40 animate-slideDown">
              <div className="px-4 py-6 space-y-4">


                {/* Navigation Links */}
                <div className="space-y-3">
                  <Link
                    to="/"
                    className={`mobile-menu-item animate-slideInRight block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                      location.pathname === '/'
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-slate-600 hover:text-primary-600 hover:bg-slate-50'
                    }`}
                    onClick={() => setShowMobileMenu(false)}
                  >
                    {t('navigation.home')}
                  </Link>

                  {/* روابط للمستخدمين المسجلين فقط */}
                  {isAuthenticated && (
                    <>
                      <Link
                        to="/search"
                        className={`mobile-menu-item animate-slideInRight block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                          location.pathname === '/search'
                            ? 'text-primary-600 bg-primary-50'
                            : 'text-slate-600 hover:text-primary-600 hover:bg-slate-50'
                        }`}
                        onClick={() => setShowMobileMenu(false)}
                      >
                        {t('navigation.search')}
                      </Link>
                      <Link
                        to="/messages"
                        className={`mobile-menu-item animate-slideInRight block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                          location.pathname === '/messages'
                            ? 'text-primary-600 bg-primary-50'
                            : 'text-slate-600 hover:text-primary-600 hover:bg-slate-50'
                        }`}
                        onClick={() => setShowMobileMenu(false)}
                      >
                        {t('navigation.messages')}
                      </Link>
                      <Link
                        to="/likes"
                        className={`mobile-menu-item animate-slideInRight block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                          location.pathname === '/likes'
                            ? 'text-primary-600 bg-primary-50'
                            : 'text-slate-600 hover:text-primary-600 hover:bg-slate-50'
                        }`}
                        onClick={() => setShowMobileMenu(false)}
                      >
                        {t('navigation.likes')}
                      </Link>
                      <Link
                        to="/matches"
                        className={`mobile-menu-item animate-slideInRight block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                          location.pathname === '/matches'
                            ? 'text-primary-600 bg-primary-50'
                            : 'text-slate-600 hover:text-primary-600 hover:bg-slate-50'
                        }`}
                        onClick={() => setShowMobileMenu(false)}
                      >
                        {t('navigation.matches')}
                      </Link>
                      <Link
                        to="/articles"
                        className={`mobile-menu-item animate-slideInRight block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                          location.pathname === '/articles' || location.pathname.startsWith('/articles/')
                            ? 'text-primary-600 bg-primary-50'
                            : 'text-slate-600 hover:text-primary-600 hover:bg-slate-50'
                        }`}
                        onClick={() => setShowMobileMenu(false)}
                      >
                        {t('navigation.articles')}
                      </Link>
                      <Link
                        to="/subscription"
                        className={`mobile-menu-item animate-slideInRight block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                          location.pathname === '/subscription'
                            ? 'text-primary-600 bg-primary-50'
                            : 'text-slate-600 hover:text-primary-600 hover:bg-slate-50'
                        }`}
                        onClick={() => setShowMobileMenu(false)}
                      >
                        {t('navigation.plans', 'الباقات')}
                      </Link>
                    </>
                  )}

                  {/* روابط للزوار غير المسجلين */}
                  {!isAuthenticated && (
                    <>
                      <Link
                        to="/features"
                        className={`mobile-menu-item animate-slideInRight block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                          location.pathname === '/features'
                            ? 'text-primary-600 bg-primary-50'
                            : 'text-slate-600 hover:text-primary-600 hover:bg-slate-50'
                        }`}
                        onClick={() => setShowMobileMenu(false)}
                      >
                        {t('navigation.features')}
                      </Link>
                      <Link
                        to="/about"
                        className={`mobile-menu-item animate-slideInRight block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                          location.pathname === '/about'
                            ? 'text-primary-600 bg-primary-50'
                            : 'text-slate-600 hover:text-primary-600 hover:bg-slate-50'
                        }`}
                        onClick={() => setShowMobileMenu(false)}
                      >
                        {t('navigation.about')}
                      </Link>
                      <Link
                        to="/contact"
                        className={`mobile-menu-item animate-slideInRight block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                          location.pathname === '/contact'
                            ? 'text-primary-600 bg-primary-50'
                            : 'text-slate-600 hover:text-primary-600 hover:bg-slate-50'
                        }`}
                        onClick={() => setShowMobileMenu(false)}
                      >
                        {t('navigation.contact')}
                      </Link>
                      <Link
                        to="/articles"
                        className={`mobile-menu-item animate-slideInRight block px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                          location.pathname === '/articles' || location.pathname.startsWith('/articles/')
                            ? 'text-primary-600 bg-primary-50'
                            : 'text-slate-600 hover:text-primary-600 hover:bg-slate-50'
                        }`}
                        onClick={() => setShowMobileMenu(false)}
                      >
                        {t('navigation.articles')}
                      </Link>
                    </>
                  )}
                </div>

                {/* Mobile Auth Buttons */}
                {!isAuthenticated && (
                  <div className="pt-4 border-t border-slate-200 space-y-3 animate-fadeIn">
                    <Link
                      to="/login"
                      className="mobile-menu-item animate-slideInRight block w-full text-center px-4 py-3 text-primary-600 border border-primary-200 rounded-xl hover:bg-primary-50 transition-all duration-200 font-medium"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      {t('navigation.login')}
                    </Link>
                    <Link
                      to="/register"
                      className="mobile-menu-item animate-slideInRight block w-full text-center px-4 py-3 bg-gradient-to-r from-primary-600 to-emerald-600 text-white rounded-xl hover:from-primary-700 hover:to-emerald-700 transition-all duration-300 font-medium shadow-lg"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      {t('navigation.register')}
                    </Link>
                  </div>
                )}


              </div>
            </div>
            {/* طبقة لإغلاق القائمة عند النقر خارجها */}
            <div
              className="fixed inset-0 z-30 lg:hidden"
              onClick={() => setShowMobileMenu(false)}
            />
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
