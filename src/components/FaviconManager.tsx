import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useFavicon, getFaviconForPath } from '../hooks/useFavicon';

const FaviconManager: React.FC = () => {
  const location = useLocation();
  const faviconPath = getFaviconForPath(location.pathname);
  
  useFavicon(faviconPath);
  
  return null; // هذا المكون لا يعرض أي شيء
};

export default FaviconManager;
