import { textService } from '../lib/supabase';
import arTranslations from '../locales/ar.json';
import enTranslations from '../locales/en.json';

interface TranslationEntry {
  text_key: string;
  category: string;
  language: string;
  text_value: string;
  description?: string;
}

/**
 * Flatten nested translation object into dot-notation keys
 */
function flattenTranslations(obj: any, prefix: string = '', category: string = ''): TranslationEntry[] {
  const result: TranslationEntry[] = [];
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      const currentCategory = category || key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        // If it's an object, recurse
        result.push(...flattenTranslations(obj[key], newKey, currentCategory));
      } else {
        // If it's a primitive value, add to result
        result.push({
          text_key: newKey,
          category: currentCategory,
          language: '', // Will be set by caller
          text_value: String(obj[key]),
          description: `Translation for ${newKey}`
        });
      }
    }
  }
  
  return result;
}

/**
 * Migrate all translations from JSON files to database
 */
export async function migrateTranslationsToDatabase(): Promise<{
  success: boolean;
  message: string;
  stats: {
    arabic: number;
    english: number;
    total: number;
    errors: number;
  };
}> {
  const stats = {
    arabic: 0,
    english: 0,
    total: 0,
    errors: 0
  };

  try {
    console.log('Starting translation migration...');

    // Flatten Arabic translations
    const arabicEntries = flattenTranslations(arTranslations);
    arabicEntries.forEach(entry => {
      entry.language = 'ar';
    });

    // Flatten English translations
    const englishEntries = flattenTranslations(enTranslations);
    englishEntries.forEach(entry => {
      entry.language = 'en';
    });

    // Combine all entries
    const allEntries = [...arabicEntries, ...englishEntries];

    console.log(`Found ${arabicEntries.length} Arabic translations`);
    console.log(`Found ${englishEntries.length} English translations`);
    console.log(`Total: ${allEntries.length} translations to migrate`);

    // Migrate in batches to avoid overwhelming the database
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < allEntries.length; i += batchSize) {
      batches.push(allEntries.slice(i, i + batchSize));
    }

    console.log(`Processing ${batches.length} batches...`);

    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} items)`);

      // Process each entry in the batch
      for (const entry of batch) {
        try {
          const result = await textService.upsertText({
            text_key: entry.text_key,
            category: entry.category,
            language: entry.language,
            text_value: entry.text_value,
            description: entry.description,
            is_active: true
          });

          if (result.error) {
            console.error(`Error migrating ${entry.text_key} (${entry.language}):`, result.error);
            stats.errors++;
          } else {
            if (entry.language === 'ar') {
              stats.arabic++;
            } else {
              stats.english++;
            }
            stats.total++;
          }
        } catch (error) {
          console.error(`Exception migrating ${entry.text_key} (${entry.language}):`, error);
          stats.errors++;
        }
      }

      // Small delay between batches to avoid rate limiting
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const successMessage = `Migration completed! 
    - Arabic translations: ${stats.arabic}
    - English translations: ${stats.english}
    - Total successful: ${stats.total}
    - Errors: ${stats.errors}`;

    console.log(successMessage);

    return {
      success: stats.errors === 0,
      message: successMessage,
      stats
    };

  } catch (error) {
    const errorMessage = `Migration failed: ${error}`;
    console.error(errorMessage);
    
    return {
      success: false,
      message: errorMessage,
      stats
    };
  }
}

/**
 * Verify migration by checking if all keys exist in database
 */
export async function verifyMigration(): Promise<{
  success: boolean;
  message: string;
  missing: string[];
}> {
  try {
    console.log('Verifying migration...');

    const arabicEntries = flattenTranslations(arTranslations);
    const englishEntries = flattenTranslations(enTranslations);
    
    const missing: string[] = [];

    // Check Arabic translations
    for (const entry of arabicEntries) {
      const result = await textService.getText(entry.text_key, 'ar');
      if (result.error || !result.data) {
        missing.push(`${entry.text_key} (ar)`);
      }
    }

    // Check English translations
    for (const entry of englishEntries) {
      const result = await textService.getText(entry.text_key, 'en');
      if (result.error || !result.data) {
        missing.push(`${entry.text_key} (en)`);
      }
    }

    if (missing.length === 0) {
      return {
        success: true,
        message: 'Migration verification successful! All translations found in database.',
        missing: []
      };
    } else {
      return {
        success: false,
        message: `Migration verification failed! ${missing.length} translations missing.`,
        missing
      };
    }

  } catch (error) {
    return {
      success: false,
      message: `Verification failed: ${error}`,
      missing: []
    };
  }
}

/**
 * Get migration statistics
 */
export async function getMigrationStats(): Promise<{
  totalTexts: number;
  arabicTexts: number;
  englishTexts: number;
  categories: string[];
}> {
  try {
    const [arabicResult, englishResult, categoriesResult] = await Promise.all([
      textService.getTexts('ar'),
      textService.getTexts('en'),
      textService.getCategories()
    ]);

    return {
      totalTexts: (arabicResult.data?.length || 0) + (englishResult.data?.length || 0),
      arabicTexts: arabicResult.data?.length || 0,
      englishTexts: englishResult.data?.length || 0,
      categories: categoriesResult.data || []
    };
  } catch (error) {
    console.error('Error getting migration stats:', error);
    return {
      totalTexts: 0,
      arabicTexts: 0,
      englishTexts: 0,
      categories: []
    };
  }
}

/**
 * Clear all texts from database (use with caution!)
 */
export async function clearAllTexts(): Promise<{ success: boolean; message: string }> {
  try {
    // This would require a custom SQL function or admin privileges
    // For now, we'll just return a warning
    return {
      success: false,
      message: 'Clear function not implemented for safety. Use database admin tools if needed.'
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error}`
    };
  }
}
