import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import globPkg from 'glob';
const { glob } = globPkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TranslationKeys {
  [key: string]: {
    en: string;
    ar: string;
  };
}

function extractTranslationKeys(fileContent: string): Set<string> {
  const keys = new Set<string>();
  const regex = /t\(['"]([^'"]+)['"]\)/g;
  let match;
  while ((match = regex.exec(fileContent)) !== null) {
    keys.add(match[1]);
  }
  return keys;
}

function globAsync(pattern: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    glob(pattern, (err, files) => {
      if (err) reject(err);
      else resolve(files);
    });
  });
}

async function getTranslationKeysFromFiles(): Promise<Set<string>> {
  const keys = new Set<string>();
  const files = await globAsync('src/**/*.{ts,tsx}');
  
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const fileKeys = extractTranslationKeys(content);
    fileKeys.forEach(key => keys.add(key));
  }
  
  return keys;
}

function getTranslationKeysFromContext(): TranslationKeys {
  const contextPath = join(__dirname, '..', 'src', 'contexts', 'language-context.tsx');
  const content = readFileSync(contextPath, 'utf-8');
  
  // Extract the translations object
  const translationsMatch = content.match(/const translations = ({[\s\S]*?});/);
  if (!translationsMatch) {
    throw new Error('Could not find translations object in language-context.tsx');
  }

  // Clean up the object string
  let translationsStr = translationsMatch[1]
    .replace(/\/\/.*$/gm, '') // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
    .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
    .replace(/\n/g, ' ') // Remove newlines
    .replace(/\s+/g, ' '); // Normalize whitespace

  try {
    // Use Function constructor to safely evaluate the object
    const translations = new Function(`return ${translationsStr}`)();
    return translations;
  } catch (error) {
    console.error('Error parsing translations:', error);
    throw new Error('Failed to parse translations object.');
  }
}

function checkArabicTranslation(text: string): boolean {
  // Check if the text contains any Latin characters
  return !/[a-zA-Z]/.test(text);
}

async function checkArabicTranslations() {
  console.log('🔍 Checking Arabic translations...\n');

  try {
    const usedKeys = await getTranslationKeysFromFiles();
    const translations = getTranslationKeysFromContext();

    const missingTranslations = new Set<string>();
    const invalidTranslations = new Set<string>();

    // Check for missing or invalid Arabic translations
    for (const key of usedKeys) {
      if (!translations[key]) {
        missingTranslations.add(key);
      } else if (!checkArabicTranslation(translations[key].ar)) {
        invalidTranslations.add(key);
      }
    }

    // Print results
    console.log('📊 Translation Status:');
    console.log(`Total used keys: ${usedKeys.size}`);
    console.log(`Missing Arabic translations: ${missingTranslations.size}`);
    console.log(`Invalid Arabic translations: ${invalidTranslations.size}\n`);

    if (invalidTranslations.size > 0) {
      console.log('❌ Invalid Arabic translations:');
      invalidTranslations.forEach(key => {
        console.log(`- ${key}: "${translations[key]?.ar}"`);
      });
      console.log('');
    }

    if (missingTranslations.size > 0) {
      console.log('❌ Missing Arabic translations:');
      missingTranslations.forEach(key => {
        console.log(`- ${key}`);
      });
      console.log('');
    }

    if (invalidTranslations.size === 0 && missingTranslations.size === 0) {
      console.log('✅ All translations are valid and complete!');
    }

  } catch (error) {
    console.error('Error checking translations:', error);
  }
}

checkArabicTranslations(); 