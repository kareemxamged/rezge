import React, { useState, useEffect } from 'react';
// import { useTranslation } from 'react-i18next';
import { 
  Search, 
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Globe,
  Tag,
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { textService } from '../lib/supabase';
import type { SiteText } from '../lib/supabase';

interface TextManagementProps {
  onClose?: () => void;
}

const TextManagement: React.FC<TextManagementProps> = ({ onClose }) => {
  // const { t, i18n } = useTranslation(); // Unused for now
  const [texts, setTexts] = useState<SiteText[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLanguage, setSelectedLanguage] = useState('ar');
  const [editingText, setEditingText] = useState<SiteText | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load texts and categories
  useEffect(() => {
    loadTexts();
    loadCategories();
  }, [selectedLanguage, selectedCategory]);

  const loadTexts = async () => {
    setLoading(true);
    try {
      let result;
      if (selectedCategory === 'all') {
        result = await textService.getTexts(selectedLanguage);
      } else {
        result = await textService.getTextsByCategory(selectedCategory, selectedLanguage);
      }

      if (result.error) {
        showMessage('error', 'خطأ في تحميل النصوص');
      } else {
        setTexts(result.data || []);
      }
    } catch (error) {
      showMessage('error', 'خطأ في تحميل النصوص');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const result = await textService.getCategories();
      if (result.data) {
        setCategories(result.data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadTexts();
      return;
    }

    setLoading(true);
    try {
      const result = await textService.searchTexts(
        searchQuery,
        selectedLanguage,
        selectedCategory === 'all' ? undefined : selectedCategory
      );

      if (result.error) {
        showMessage('error', 'خطأ في البحث');
      } else {
        setTexts(result.data || []);
      }
    } catch (error) {
      showMessage('error', 'خطأ في البحث');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveText = async (textData: Partial<SiteText>) => {
    try {
      let result;
      if (editingText) {
        result = await textService.updateText(editingText.id, textData);
      } else {
        result = await textService.upsertText({
          ...textData,
          language: selectedLanguage,
          is_active: true
        });
      }

      if (result.error) {
        showMessage('error', 'خطأ في حفظ النص');
      } else {
        showMessage('success', 'تم حفظ النص بنجاح');
        setEditingText(null);
        setIsCreating(false);
        loadTexts();
      }
    } catch (error) {
      showMessage('error', 'خطأ في حفظ النص');
    }
  };

  const handleDeleteText = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا النص؟')) return;

    try {
      const result = await textService.deleteText(id);
      if (result.error) {
        showMessage('error', 'خطأ في حذف النص');
      } else {
        showMessage('success', 'تم حذف النص بنجاح');
        loadTexts();
      }
    } catch (error) {
      showMessage('error', 'خطأ في حذف النص');
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const filteredTexts = texts.filter(text => 
    text.text_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    text.text_value.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (text.description && text.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">إدارة نصوص الموقع</h2>
            <p className="text-slate-600">تحرير وإدارة جميع نصوص الموقع</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Controls */}
      <div className="mb-6 space-y-4">
        {/* Search and Add */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="البحث في النصوص..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pr-10 pl-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            بحث
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            إضافة نص جديد
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-600" />
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-slate-600" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">جميع الفئات</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Texts List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-slate-600 mt-2">جاري التحميل...</p>
          </div>
        ) : filteredTexts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-600">لا توجد نصوص</p>
          </div>
        ) : (
          filteredTexts.map((text) => (
            <TextItem
              key={text.id}
              text={text}
              isEditing={editingText?.id === text.id}
              onEdit={() => setEditingText(text)}
              onSave={handleSaveText}
              onCancel={() => setEditingText(null)}
              onDelete={() => handleDeleteText(text.id)}
            />
          ))
        )}
      </div>

      {/* Create New Text Modal */}
      {isCreating && (
        <CreateTextModal
          onSave={handleSaveText}
          onCancel={() => setIsCreating(false)}
          language={selectedLanguage}
          categories={categories}
        />
      )}
    </div>
  );
};

// Text Item Component
interface TextItemProps {
  text: SiteText;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (data: Partial<SiteText>) => void;
  onCancel: () => void;
  onDelete: () => void;
}

const TextItem: React.FC<TextItemProps> = ({
  text,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete
}) => {
  const [editData, setEditData] = useState({
    text_value: text.text_value,
    description: text.description || ''
  });

  const handleSave = () => {
    onSave(editData);
  };

  if (isEditing) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              النص
            </label>
            <textarea
              value={editData.text_value}
              onChange={(e) => setEditData({ ...editData, text_value: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              الوصف
            </label>
            <input
              type="text"
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              حفظ
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              إلغاء
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-blue-600">{text.text_key}</span>
            <span className="px-2 py-1 bg-slate-200 text-slate-700 text-xs rounded">{text.category}</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">{text.language}</span>
          </div>
          <p className="text-slate-800 mb-2">{text.text_value}</p>
          {text.description && (
            <p className="text-sm text-slate-600">{text.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(text.updated_at || text.created_at || '').toLocaleDateString('ar-EG', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                calendar: 'gregory'
              })}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Create Text Modal Component
interface CreateTextModalProps {
  onSave: (data: Partial<SiteText>) => void;
  onCancel: () => void;
  language: string;
  categories: string[];
}

const CreateTextModal: React.FC<CreateTextModalProps> = ({
  onSave,
  onCancel,
  language: _language,
  categories
}) => {
  const [formData, setFormData] = useState({
    text_key: '',
    category: '',
    text_value: '',
    description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.text_key || !formData.category || !formData.text_value) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-xl font-bold text-slate-800 mb-4">إضافة نص جديد</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              مفتاح النص *
            </label>
            <input
              type="text"
              value={formData.text_key}
              onChange={(e) => setFormData({ ...formData, text_key: e.target.value })}
              placeholder="مثال: common.welcome"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              الفئة *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">اختر الفئة</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
              <option value="new">فئة جديدة...</option>
            </select>
          </div>

          {formData.category === 'new' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                اسم الفئة الجديدة *
              </label>
              <input
                type="text"
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              النص *
            </label>
            <textarea
              value={formData.text_value}
              onChange={(e) => setFormData({ ...formData, text_value: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              الوصف
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              حفظ
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TextManagement;
