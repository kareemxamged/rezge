import React from 'react';
import { usePageTitle } from '../hooks/usePageTitle';

interface PageTitleManagerProps {
  customTitle?: string;
}

const PageTitleManager: React.FC<PageTitleManagerProps> = ({ customTitle }) => {
  usePageTitle(customTitle);
  
  return null; // هذا المكون لا يعرض أي شيء
};

export default PageTitleManager;
