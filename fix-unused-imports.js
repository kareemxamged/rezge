/**
 * أداة إصلاح الواردات غير المستخدمة
 * تقوم بحذف الواردات غير المستخدمة من ملفات TypeScript/React
 */

const fs = require('fs');
const path = require('path');

// قائمة الواردات غير المستخدمة المستخرجة من أخطاء البناء
const unusedImports = {
  'src/components/admin/ModernAdminSidebar.tsx': ['Home', 'AlertTriangle'],
  'src/components/admin/SeparateAdminRoute.tsx': ['Shield', 'Lock'],
  'src/components/admin/users/AcceptReportModal.tsx': ['AlertCircle'],
  'src/components/admin/users/AdminUsersPage.tsx': ['error'],
  'src/components/admin/users/AllUsersTab.tsx': ['Filter', 'Unlock', 'MapPin', 'onUpdateUserStatus'],
  'src/components/admin/users/BlockedUsersTab.tsx': ['UserCheck', 'MapPin'],
  'src/components/admin/users/BlockUserModal.tsx': ['Save'],
  'src/components/admin/users/RejectReportModal.tsx': ['AlertTriangle'],
  'src/components/admin/users/ReportsTab.tsx': ['MessageSquare', 'Ban', 'FileText', 'data', 'handleUpdateReportStatus'],
  'src/components/admin/users/SendAlertModal.tsx': ['Calendar', 'EyeOff', 'getSelectedAlertType', 'getSelectedPriority'],
  'src/components/admin/users/UnifiedUsersManagement.tsx': [
    'Search', 'Filter', 'MoreVertical', 'Eye', 'Edit', 'Trash2', 'Shield', 
    'ShieldOff', 'Mail', 'Phone', 'Calendar', 'MapPin', 'CheckCircle', 
    'XCircle', 'UserCheck', 'Ban', 'Plus', 'X', 'adminUser', 'handleUpdateVerificationStatus'
  ],
  'src/components/admin/users/UserActivityTab.tsx': ['Shield'],
  'src/components/admin/users/UserDetailsModal.tsx': ['UserPlus', 'Edit', 'UserCheck', 'Activity'],
  'src/components/HelpCenterPage.tsx': ['MessageCircle'],
  'src/components/ReportDetailsPage.tsx': ['t'],
  'src/contexts/ThemeContext.tsx': ['actualTheme'],
  'src/hooks/useRealtimeUpdates.ts': ['subscription', 'payload'],
  'src/lib/notificationService.ts': ['additionalData'],
  'src/lib/separateAdminAuth.ts': ['sessionData'],
  'src/services/autoRefreshService.ts': ['isInitialized'],
  'src/utils/realtimeTestUtils.ts': ['data']
};

// دالة لحذف وارد معين من ملف
function removeUnusedImport(filePath, importName) {
  try {
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`❌ الملف غير موجود: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;

    // أنماط مختلفة لحذف الواردات
    const patterns = [
      // حذف من قائمة واردات متعددة الأسطر
      new RegExp(`\\s*${importName},?\\s*\\n`, 'g'),
      // حذف من قائمة واردات في سطر واحد
      new RegExp(`\\s*,\\s*${importName}\\s*`, 'g'),
      new RegExp(`\\s*${importName}\\s*,\\s*`, 'g'),
      // حذف وارد منفرد
      new RegExp(`import\\s*{\\s*${importName}\\s*}\\s*from\\s*[^;]+;\\s*\\n?`, 'g'),
      // حذف من destructuring
      new RegExp(`\\s*${importName}\\s*[,}]`, 'g'),
      // حذف متغير منفرد
      new RegExp(`\\s*const\\s+${importName}\\s*=.*?;\\s*\\n?`, 'g'),
      // حذف من useCallback أو useState
      new RegExp(`\\s*const\\s*\\[\\s*${importName}[^\\]]*\\]\\s*=.*?;\\s*\\n?`, 'g')
    ];

    patterns.forEach(pattern => {
      content = content.replace(pattern, '');
    });

    // تنظيف الأقواس الفارغة
    content = content.replace(/import\s*{\s*}\s*from\s*[^;]+;\s*\n?/g, '');
    content = content.replace(/{\s*,\s*}/g, '{}');
    content = content.replace(/{\s*,/g, '{');
    content = content.replace(/,\s*}/g, '}');

    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ تم حذف ${importName} من ${filePath}`);
      return true;
    } else {
      console.log(`⚠️  لم يتم العثور على ${importName} في ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ خطأ في معالجة ${filePath}:`, error.message);
    return false;
  }
}

// تشغيل الإصلاح
function runFix() {
  console.log('🔧 بدء إصلاح الواردات غير المستخدمة...\n');
  
  let totalFixed = 0;
  let totalAttempted = 0;

  Object.entries(unusedImports).forEach(([filePath, imports]) => {
    console.log(`📁 معالجة الملف: ${filePath}`);
    
    imports.forEach(importName => {
      totalAttempted++;
      if (removeUnusedImport(filePath, importName)) {
        totalFixed++;
      }
    });
    
    console.log(''); // سطر فارغ بين الملفات
  });

  console.log(`\n📊 النتائج:`);
  console.log(`✅ تم إصلاح: ${totalFixed} من ${totalAttempted}`);
  console.log(`📈 نسبة النجاح: ${((totalFixed / totalAttempted) * 100).toFixed(1)}%`);
}

// تشغيل الأداة
if (require.main === module) {
  runFix();
}

module.exports = { removeUnusedImport, runFix };
