import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { separateAdminAuth, type AdminAccount } from '../../lib/separateAdminAuth';

interface SeparateAdminContextType {
  adminAccount: AdminAccount | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasPermission: (permissionCode: string) => boolean;
  refreshData: () => Promise<void>;
}

const SeparateAdminContext = createContext<SeparateAdminContextType | undefined>(undefined);

interface SeparateAdminProviderProps {
  children: ReactNode;
}

export const SeparateAdminProvider: React.FC<SeparateAdminProviderProps> = ({ children }) => {
  const [adminAccount, setAdminAccount] = useState<AdminAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const refreshData = async () => {
    try {
      setIsLoading(true);
      
      const isValid = await separateAdminAuth.validateSession();
      const account = separateAdminAuth.getCurrentAccount();
      
      if (isValid && account) {
        setAdminAccount(account);
        setIsAuthenticated(true);
        console.log('✅ SeparateAdminProvider: Admin authenticated:', account.username);
      } else {
        setAdminAccount(null);
        setIsAuthenticated(false);
        console.log('❌ SeparateAdminProvider: No valid admin session');
      }
    } catch (error) {
      console.error('❌ SeparateAdminProvider: Error refreshing data:', error);
      setAdminAccount(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const hasPermission = (permissionCode: string): boolean => {
    if (!adminAccount || !isAuthenticated) {
      return false;
    }
    
    // السوبر أدمن له جميع الصلاحيات
    if (adminAccount.is_super_admin) {
      return true;
    }
    
    // المشرفين العاديين لهم صلاحيات محدودة (يمكن توسيعها لاحقاً)
    const basicPermissions = [
      'view_users',
      'view_articles',
      'view_messages',
      'view_subscriptions',
      'view_payments',
      'manage_plans'
    ];
    
    return basicPermissions.includes(permissionCode);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const value: SeparateAdminContextType = {
    adminAccount,
    isLoading,
    isAuthenticated,
    hasPermission,
    refreshData
  };

  return (
    <SeparateAdminContext.Provider value={value}>
      {children}
    </SeparateAdminContext.Provider>
  );
};

export const useSeparateAdmin = (): SeparateAdminContextType => {
  const context = useContext(SeparateAdminContext);
  if (context === undefined) {
    throw new Error('useSeparateAdmin must be used within a SeparateAdminProvider');
  }
  return context;
};

export default SeparateAdminProvider;
