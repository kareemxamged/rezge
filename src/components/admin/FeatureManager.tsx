import React, { useState } from 'react';
import {
  MessageCircle,
  MessageSquare,
  Mic,
  Search,
  Filter,
  MapPin,
  Calendar,
  Eye,
  Users,
  TrendingUp,
  Shield,
  Star,
  BadgeCheck,
  Headphones,
  UserCheck,
  Heart,
  Check,
  X,
  User,
  Gift
} from 'lucide-react';
import { SubscriptionService } from '../../lib/subscriptionService';

// تعريف محلي للواجهة
interface FeatureDefinition {
  key: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  category: 'messaging' | 'search' | 'profile' | 'premium' | 'support';
  type: 'boolean' | 'number' | 'unlimited';
  icon: string;
}

interface FeatureManagerProps {
  selectedFeatures: string[];
  onFeaturesChange: (features: string[]) => void;
  disabled?: boolean;
}

const FeatureManager: React.FC<FeatureManagerProps> = ({ 
  selectedFeatures, 
  onFeaturesChange, 
  disabled = false 
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('messaging');
  
  const availableFeatures = SubscriptionService.getAvailableFeatures();
  const categories = [
    { key: 'messaging', name: 'المراسلة', icon: MessageCircle, color: 'blue' },
    { key: 'search', name: 'البحث', icon: Search, color: 'green' },
    { key: 'profile', name: 'الملف الشخصي', icon: Users, color: 'purple' },
    { key: 'premium', name: 'المميزات المتقدمة', icon: Star, color: 'amber' },
    { key: 'support', name: 'الدعم', icon: Headphones, color: 'indigo' }
  ];

  const getIcon = (iconName: string) => {
    const icons: Record<string, React.ComponentType<any>> = {
      MessageCircle, MessageSquare, Mic, Search, Filter, MapPin, Calendar,
      Eye, Users, TrendingUp, Shield, Star, BadgeCheck, Headphones, UserCheck, Heart,
      User, Gift
    };
    return icons[iconName] || MessageCircle;
  };

  const toggleFeature = (featureKey: string) => {
    if (disabled) return;
    
    const newFeatures = selectedFeatures.includes(featureKey)
      ? selectedFeatures.filter(key => key !== featureKey)
      : [...selectedFeatures, featureKey];
    
    onFeaturesChange(newFeatures);
  };

  const toggleAllInCategory = (category: string) => {
    if (disabled) return;
    
    const categoryFeatures = availableFeatures
      .filter(feature => feature.category === category)
      .map(feature => feature.key);
    
    const allSelected = categoryFeatures.every(key => selectedFeatures.includes(key));
    
    let newFeatures: string[];
    if (allSelected) {
      // إلغاء تحديد جميع مميزات الفئة
      newFeatures = selectedFeatures.filter(key => !categoryFeatures.includes(key));
    } else {
      // تحديد جميع مميزات الفئة
      newFeatures = [...new Set([...selectedFeatures, ...categoryFeatures])];
    }
    
    onFeaturesChange(newFeatures);
  };

  const getCategoryColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      amber: 'bg-amber-500',
      indigo: 'bg-indigo-500'
    };
    return colors[color] || 'bg-gray-500';
  };

  const getCategoryBorderColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'border-blue-200 bg-blue-50',
      green: 'border-green-200 bg-green-50',
      purple: 'border-purple-200 bg-purple-50',
      amber: 'border-amber-200 bg-amber-50',
      indigo: 'border-indigo-200 bg-indigo-50'
    };
    return colors[color] || 'border-gray-200 bg-gray-50';
  };

  const activeTab = categories.find(cat => cat.key === activeCategory);
  const categoryFeatures = availableFeatures.filter(feature => feature.category === activeCategory);
  const selectedInCategory = categoryFeatures.filter(feature => selectedFeatures.includes(feature.key)).length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">إدارة مميزات الباقة</h3>
          <div className="text-sm text-slate-600">
            {selectedFeatures.length} من {availableFeatures.length} مميزة محددة
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Categories Sidebar */}
        <div className="w-64 bg-slate-50 border-r border-slate-200">
          <div className="p-4">
            <h4 className="text-sm font-medium text-slate-700 mb-3">فئات المميزات</h4>
            <div className="space-y-2">
              {categories.map((category) => {
                const Icon = category.icon;
                const featuresInCategory = availableFeatures.filter(f => f.category === category.key);
                const selectedInCat = featuresInCategory.filter(f => selectedFeatures.includes(f.key)).length;
                
                return (
                  <button
                    key={category.key}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveCategory(category.key);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeCategory === category.key
                        ? `${getCategoryBorderColor(category.color)} border`
                        : 'hover:bg-slate-100'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${getCategoryColor(category.color)} flex items-center justify-center`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-800">{category.name}</div>
                      <div className="text-xs text-slate-500">
                        {selectedInCat}/{featuresInCategory.length} محدد
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Features Content */}
        <div className="flex-1 p-6">
          {activeTab && (
            <>
              {/* Category Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${getCategoryColor(activeTab.color)} flex items-center justify-center`}>
                    <activeTab.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-slate-800">{activeTab.name}</h4>
                    <p className="text-sm text-slate-600">
                      {selectedInCategory} من {categoryFeatures.length} مميزة محددة
                    </p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAllInCategory(activeCategory);
                  }}
                  disabled={disabled}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    disabled
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : selectedInCategory === categoryFeatures.length
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  {selectedInCategory === categoryFeatures.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                </button>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryFeatures.map((feature) => {
                  const Icon = getIcon(feature.icon);
                  const isSelected = selectedFeatures.includes(feature.key);
                  
                  return (
                    <div
                      key={feature.key}
                      className={`border-2 rounded-lg p-4 transition-all cursor-pointer ${
                        disabled 
                          ? 'opacity-50 cursor-not-allowed'
                          : isSelected
                          ? `border-${activeTab.color}-300 bg-${activeTab.color}-50`
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFeature(feature.key);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isSelected 
                            ? `${getCategoryColor(activeTab.color)} text-white`
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium text-slate-800">{feature.name_ar}</h5>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected 
                                ? `border-${activeTab.color}-500 bg-${activeTab.color}-500`
                                : 'border-slate-300'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 mt-1">{feature.description_ar}</p>
                          <p className="text-xs text-slate-500 mt-2">{feature.name_en}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeatureManager;
