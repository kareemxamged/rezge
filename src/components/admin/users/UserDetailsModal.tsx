import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Heart,
  GraduationCap,
  Briefcase,
  Ruler,
  Scale,
  Cigarette,

  Church,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,


  Clock,

  FileText,
  IdCard,

} from 'lucide-react';
import type { User as UserType } from '../../../lib/adminUsersService';
import AdminActionsLog from './AdminActionsLog';
import UserActivityTab from './UserActivityTab';
import UserVerificationTab from './UserVerificationTab';

interface UserDetailsModalProps {
  user: UserType | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdate?: (updatedUser: UserType) => void;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  user,
  isOpen,
  onClose,
  onUserUpdate
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'activity' | 'admin_actions' | 'verification'>('profile');
  const [currentUser, setCurrentUser] = useState<UserType | null>(user);

  // تحديث المستخدم المحلي عند تغيير المستخدم المرسل
  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  // دالة لتحديث بيانات المستخدم
  const handleUserUpdate = (updatedFields: Partial<UserType>) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updatedFields };
      setCurrentUser(updatedUser);
      onUserUpdate?.(updatedUser);
    }
  };

  if (!isOpen || !currentUser) return null;

  // العمر متوفر مباشرة في البيانات الآن

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'verified':
        return 'text-green-600 bg-green-100';
      case 'pending':
      case 'suspended':
        return 'text-yellow-600 bg-yellow-100';
      case 'banned':
      case 'rejected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string, type: 'account' | 'verification') => {
    if (type === 'account') {
      switch (status) {
        case 'active': return 'نشط';
        case 'suspended': return 'معلق';
        case 'banned': return 'محظور';
        default: return status;
      }
    } else {
      return Boolean(status) ? 'محقق' : 'غير محقق';
    }
  };

  // دالة لتحويل مستوى التدين إلى نص عربي
  const getReligiosityLevelText = (level: string) => {
    switch (level) {
      case 'very_religious': return 'متدين جداً';
      case 'religious': return 'متدين';
      case 'moderately_religious': return 'متدين بشكل متوسط';
      case 'slightly_religious': return 'متدين قليلاً';
      case 'not_religious': return 'غير متدين';
      default: return level;
    }
  };

  // دالة لتحويل الالتزام بالصلاة إلى نص عربي
  const getPrayerCommitmentText = (commitment: string) => {
    switch (commitment) {
      case 'pray_all': return 'يصلي جميع الصلوات';
      case 'pray_sometimes': return 'يصلي أحياناً';
      case 'dont_pray': return 'لا يصلي';
      case 'prefer_not_say': return 'يفضل عدم الإفصاح';
      case 'always_pray': return 'يصلي دائماً';
      case 'mostly_pray': return 'يصلي غالباً';
      case 'sometimes_pray': return 'يصلي أحياناً';
      case 'rarely_pray': return 'يصلي نادراً';
      case 'never_pray': return 'لا يصلي';
      default: return commitment;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* خلفية */}
        <div
          className="fixed inset-0 transition-opacity modal-backdrop backdrop-blur-sm"
          onClick={onClose}
        />

        {/* المحتوى */}
        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-right align-middle transition-all transform modal-container rounded-2xl">
          {/* رأس النافذة */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                {user.profile_image_url ? (
                  <img
                    src={
                      user.profile_image_url.startsWith('http') || user.profile_image_url.startsWith('/images/')
                        ? user.profile_image_url
                        : `https://sbtzngewizgeqzfbhfjy.supabase.co/storage/v1/object/public/profile-images/${user.profile_image_url}`
                    }
                    alt={`${user.first_name} ${user.last_name}`}
                    className="w-12 h-12 rounded-full object-cover"
                    onError={(e) => {
                      // في حالة فشل تحميل الصورة، عرض أيقونة المستخدم
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                          </svg>
                        `;
                      }
                    }}
                  />
                ) : (
                  <User className="w-6 h-6 text-gray-500" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {user.first_name} {user.last_name}
                </h2>
                <p className="text-gray-600">{user.email}</p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* التبويبات */}
          <div className="border-b border-gray-200">
            <nav className="flex gap-8 px-6">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                الملف الشخصي
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'activity'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                النشاط
              </button>
              <button
                onClick={() => setActiveTab('admin_actions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'admin_actions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  سجل الإجراءات الإدارية
                </div>
              </button>

              {/* تبويب التوثيق - يظهر لجميع المستخدمين الموثقين */}
              {currentUser.verified && (
                <button
                  onClick={() => setActiveTab('verification')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'verification'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <IdCard className="w-4 h-4" />
                    التوثيق
                    {currentUser.verified && (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    )}
                  </div>
                </button>
              )}

            </nav>
          </div>

          {/* محتوى التبويبات */}
          <div className="p-6 max-h-96 overflow-y-auto">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                {/* المعلومات الأساسية */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">المعلومات الأساسية</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <User className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">الاسم الكامل</div>
                        <div className="font-medium">{currentUser.first_name} {currentUser.last_name}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">البريد الإلكتروني</div>
                        <div className="font-medium">{currentUser.email}</div>
                      </div>
                    </div>
                    
                    {user.phone && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="text-sm text-gray-500">رقم الهاتف</div>
                          <div className="font-medium">{user.phone}</div>
                        </div>
                      </div>
                    )}
                    
                    {user.age && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="text-sm text-gray-500">العمر</div>
                          <div className="font-medium">
                            {user.age} سنة
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <User className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">الجنس</div>
                        <div className="font-medium">
                          {user.gender === 'male' ? 'ذكر' : 'أنثى'}
                        </div>
                      </div>
                    </div>
                    
                    {(user.nationality || user.city) && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <MapPin className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="text-sm text-gray-500">الموقع</div>
                          <div className="font-medium">
                            {user.city && user.nationality ? `${user.city}, ${user.nationality}` : user.nationality || user.city}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* المعلومات الشخصية */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">المعلومات الشخصية</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {user.marital_status && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Heart className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="text-sm text-gray-500">الحالة الاجتماعية</div>
                          <div className="font-medium">{user.marital_status}</div>
                        </div>
                      </div>
                    )}
                    
                    {user.education_level && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <GraduationCap className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="text-sm text-gray-500">المستوى التعليمي</div>
                          <div className="font-medium">{user.education_level}</div>
                        </div>
                      </div>
                    )}
                    
                    {user.profession && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Briefcase className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="text-sm text-gray-500">المهنة</div>
                          <div className="font-medium">{user.profession}</div>
                        </div>
                      </div>
                    )}
                    
                    {user.height && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Ruler className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="text-sm text-gray-500">الطول</div>
                          <div className="font-medium">{user.height} سم</div>
                        </div>
                      </div>
                    )}
                    
                    {user.weight && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Scale className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="text-sm text-gray-500">الوزن</div>
                          <div className="font-medium">{user.weight} كغ</div>
                        </div>
                      </div>
                    )}
                    
                    {user.smoking && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Cigarette className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="text-sm text-gray-500">التدخين</div>
                          <div className="font-medium">{user.smoking}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* المعلومات الدينية */}
                {(user.prayer_commitment || user.hijab || user.beard || user.religiosity_level) && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">المعلومات الدينية</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {user.religiosity_level && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <Church className="w-5 h-5 text-gray-400" />
                          <div>
                            <div className="text-sm text-gray-500">مستوى التدين</div>
                            <div className="font-medium">{getReligiosityLevelText(user.religiosity_level)}</div>
                          </div>
                        </div>
                      )}

                      {user.prayer_commitment && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <Church className="w-5 h-5 text-gray-400" />
                          <div>
                            <div className="text-sm text-gray-500">الالتزام بالصلاة</div>
                            <div className="font-medium">{getPrayerCommitmentText(user.prayer_commitment)}</div>
                          </div>
                        </div>
                      )}

                      {user.hijab && user.gender === 'female' && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <Shield className="w-5 h-5 text-gray-400" />
                          <div>
                            <div className="text-sm text-gray-500">الحجاب</div>
                            <div className="font-medium">{user.hijab}</div>
                          </div>
                        </div>
                      )}

                      {user.beard && user.gender === 'male' && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <User className="w-5 h-5 text-gray-400" />
                          <div>
                            <div className="text-sm text-gray-500">اللحية</div>
                            <div className="font-medium">{user.beard}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* حالة الحساب */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">حالة الحساب</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        {user.status === 'active' ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : user.status === 'suspended' ? (
                          <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                        <div>
                          <div className="text-sm text-gray-500">حالة الحساب</div>
                          <div className={`font-medium px-2 py-1 rounded-full text-xs ${getStatusColor(user.status)}`}>
                            {getStatusText(user.status, 'account')}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        {currentUser.verified ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <Clock className="w-5 h-5 text-yellow-500" />
                        )}
                        <div>
                          <div className="text-sm text-gray-500">حالة التحقق</div>
                          <div className={`font-medium px-2 py-1 rounded-full text-xs ${currentUser.verified ? 'text-green-600 bg-green-100' : 'text-yellow-600 bg-yellow-100'}`}>
                            {currentUser.verified ? 'محقق' : 'غير محقق'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <UserActivityTab userId={user.id} />
            )}

            {activeTab === 'admin_actions' && (
              <AdminActionsLog
                userId={user.id}
                className="space-y-4"
              />
            )}

            {activeTab === 'verification' && (
              <UserVerificationTab
                userId={currentUser.id}
                user={currentUser}
                onUserUpdate={handleUserUpdate}
              />
            )}

          </div>

          {/* تذييل النافذة */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;
