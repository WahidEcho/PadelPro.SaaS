import * as fs from 'fs';
import * as path from 'path';
import globPkg from 'glob';
const { glob } = globPkg;

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TranslationKeys {
  [key: string]: {
    en: string;
    ar: string;
  };
}

function extractTranslationKeys(fileContent: string): Set<string> {
  const regex = /t\(['"]([^'"]+)['"]\)/g;
  const keys = new Set<string>();
  let match;

  while ((match = regex.exec(fileContent)) !== null) {
    keys.add(match[1]);
  }

  return keys;
}

function globAsync(pattern: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    glob(pattern, (err: Error | null, matches: string[]) => {
      if (err) reject(err);
      else resolve(matches);
    });
  });
}

async function getTranslationKeysFromFiles(): Promise<Set<string>> {
  const keys = new Set<string>();
  const files = await globAsync('src/**/*.{ts,tsx}');

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const fileKeys = extractTranslationKeys(content);
    fileKeys.forEach(key => keys.add(key));
  }

  return keys;
}

function stripCommentsAndTrailingCommas(str: string): string {
  // Remove single-line comments
  str = str.replace(/\/\/.*$/gm, '');
  // Remove multi-line comments
  str = str.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove trailing commas
  str = str.replace(/,\s*([}\]])/g, '$1');
  return str;
}

function getTranslationKeysFromContext(): any {
  const contextPath = path.join(__dirname, '../src/contexts/language-context.tsx');
  const content = fs.readFileSync(contextPath, 'utf-8');
  
  // Extract the translations object using regex
  const translationsMatch = content.match(/const translations = (\{[\s\S]*?\n\});/);
  if (!translationsMatch) {
    throw new Error('Could not find translations object in language-context.tsx');
  }

  let objStr = translationsMatch[1];
  objStr = stripCommentsAndTrailingCommas(objStr);

  // Replace single quotes with double quotes for JSON compatibility
  objStr = objStr.replace(/([\w]+):/g, '"$1":'); // keys
  objStr = objStr.replace(/'([^']*)'/g, '"$1"'); // values

  // Parse as JSON
  let translations;
  try {
    translations = JSON.parse(objStr);
  } catch (e) {
    throw new Error('Failed to parse translations object as JSON.');
  }
  return translations;
}

async function checkTranslations() {
  console.log('🔍 Checking translation keys...\n');

  // Get all translation keys used in the codebase
  const usedKeys = await getTranslationKeysFromFiles();
  
  // Get all translation keys defined in the context
  const definedTranslations = getTranslationKeysFromContext();
  const definedKeys = new Set(Object.keys(definedTranslations.en || {}));

  // Find unused keys
  const unusedKeys = [...definedKeys].filter(key => !usedKeys.has(key));
  
  // Find missing keys
  const missingKeys = [...usedKeys].filter(key => !definedKeys.has(key));
  
  // Find duplicate keys
  const duplicateKeys = [...definedKeys].filter(key => {
    const count = [...usedKeys].filter(k => k === key).length;
    return count > 1;
  });

  // Print results
  if (unusedKeys.length > 0) {
    console.log('⚠️  Unused translation keys:');
    unusedKeys.forEach(key => console.log(`  - ${key}`));
    console.log();
  }

  if (missingKeys.length > 0) {
    console.log('❌ Missing translation keys:');
    missingKeys.forEach(key => console.log(`  - ${key}`));
    console.log();
  }

  if (duplicateKeys.length > 0) {
    console.log('🔄 Duplicate translation keys:');
    duplicateKeys.forEach(key => console.log(`  - ${key}`));
    console.log();
  }

  if (unusedKeys.length === 0 && missingKeys.length === 0 && duplicateKeys.length === 0) {
    console.log('✅ All translation keys are properly defined and used!');
  }

  // Print summary
  console.log('\n📊 Summary:');
  console.log(`  Total defined keys: ${definedKeys.size}`);
  console.log(`  Total used keys: ${usedKeys.size}`);
  console.log(`  Unused keys: ${unusedKeys.length}`);
  console.log(`  Missing keys: ${missingKeys.length}`);
  console.log(`  Duplicate keys: ${duplicateKeys.length}`);
}

checkTranslations(); 