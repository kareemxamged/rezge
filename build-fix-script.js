// Script to fix common TypeScript build issues
const fs = require('fs');
const path = require('path');

// Function to remove unused imports from a file
function removeUnusedImports(filePath, unusedImports) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    unusedImports.forEach(importName => {
      // Remove from import statements
      content = content.replace(new RegExp(`\\s*${importName},?`, 'g'), '');
      content = content.replace(new RegExp(`,\\s*${importName}`, 'g'), '');
      
      // Clean up empty import lines
      content = content.replace(/import\s*{\s*}\s*from\s*['"][^'"]*['"];?\s*\n/g, '');
      content = content.replace(/import\s*{\s*,\s*}/g, 'import {}');
    });
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed unused imports in ${filePath}`);
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
}

// Function to add @ts-ignore comments for specific errors
function addTsIgnore(filePath, lineNumbers) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Add @ts-ignore comments (in reverse order to maintain line numbers)
    lineNumbers.sort((a, b) => b - a).forEach(lineNum => {
      if (lineNum > 0 && lineNum <= lines.length) {
        lines.splice(lineNum - 1, 0, '  // @ts-ignore');
      }
    });
    
    content = lines.join('\n');
    fs.writeFileSync(filePath, content);
    console.log(`✅ Added @ts-ignore comments in ${filePath}`);
  } catch (error) {
    console.error(`❌ Error adding @ts-ignore to ${filePath}:`, error.message);
  }
}

// Fix specific files
const fixes = [
  // Remove unused imports
  {
    file: 'src/components/admin/users/UnifiedUsersManagement.tsx',
    unusedImports: ['RefreshCw']
  },
  {
    file: 'src/components/admin/users/UserVerificationTab.tsx',
    unusedImports: ['CheckCircle', 'AlertTriangle', 'verificationService']
  },
  {
    file: 'src/components/admin/users/VerificationRequestsTab.tsx',
    unusedImports: ['React', 'Clock', 'FileText', 'Calendar', 'Filter', 'Download']
  },
  {
    file: 'src/components/FaviconManager.tsx',
    unusedImports: ['useEffect']
  },
  {
    file: 'src/components/LikesPage.tsx',
    unusedImports: ['Shield']
  },
  {
    file: 'src/components/ProtectedRoute.tsx',
    unusedImports: ['AlertCircle']
  },
  {
    file: 'src/components/PublicProfilePage.tsx',
    unusedImports: ['Shield']
  },
  {
    file: 'src/components/SearchPage.tsx',
    unusedImports: ['Shield']
  }
];

// Apply fixes
fixes.forEach(fix => {
  if (fix.unusedImports) {
    removeUnusedImports(fix.file, fix.unusedImports);
  }
  if (fix.tsIgnoreLines) {
    addTsIgnore(fix.file, fix.tsIgnoreLines);
  }
});

console.log('🎉 Build fixes applied successfully!');
