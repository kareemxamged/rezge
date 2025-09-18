import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Heart } from 'lucide-react';

const NotFoundPage: React.FC = () => {

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-4xl mx-auto text-center">
        {/* رقم 404 الكبير */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-4">
            404
          </h1>
          <div className="w-32 h-1 bg-gradient-to-r from-indigo-600 to-purple-600 mx-auto rounded-full"></div>
        </div>

        {/* العنوان والوصف */}
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            الصفحة غير موجودة
          </h2>
          <p className="text-lg text-gray-600 mb-2">
            عذراً، لم نتمكن من العثور على الصفحة التي تبحث عنها
          </p>
          <p className="text-base text-gray-500">
            ربما تم نقل الصفحة أو حذفها، أو أنك كتبت الرابط بشكل خاطئ
          </p>
        </div>

        {/* أيقونة إسلامية */}
        <div className="mb-12">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
            <Heart className="w-12 h-12 text-indigo-600" />
          </div>
          <p className="text-sm text-gray-500 italic">
            "وَعَسَىٰ أَن تَكْرَهُوا شَيْئًا وَهُوَ خَيْرٌ لَّكُمْ"
          </p>
        </div>



        {/* زر العودة للصفحة الرئيسية */}
        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg"
          >
            <Home className="w-5 h-5 ml-2" />
            العودة للصفحة الرئيسية
          </Link>
        </div>

        {/* معلومات إضافية */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-2">
            إذا كنت تعتقد أن هذا خطأ، يرجى التواصل معنا
          </p>
          <Link
            to="/contact"
            className="text-indigo-600 hover:text-indigo-700 font-medium text-sm underline"
          >
            تواصل مع فريق الدعم
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
