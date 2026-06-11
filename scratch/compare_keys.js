import { locales } from '../translations.js';

const enKeys = Object.keys(locales.en);
const trKeys = Object.keys(locales.tr);

console.log(`English keys count: ${enKeys.length}`);
console.log(`Turkish keys count: ${trKeys.length}`);

// Find missing in Turkish
const missingInTr = enKeys.filter(k => !trKeys.includes(k));
if (missingInTr.length > 0) {
  console.log('\nMissing in Turkish:', missingInTr);
} else {
  console.log('\nNo keys missing in Turkish.');
}

// Find missing in English
const missingInEn = trKeys.filter(k => !enKeys.includes(k));
if (missingInEn.length > 0) {
  console.log('\nMissing in English:', missingInEn);
} else {
  console.log('\nNo keys missing in English.');
}

// Check placeholders
const checkPlaceholders = (key, text) => {
  const matches = text.match(/\{[^}]+\}/g);
  return matches ? matches.sort().join(',') : '';
};

let placeholderMismatches = 0;
enKeys.forEach(key => {
  if (locales.tr[key]) {
    const enPl = checkPlaceholders(key, locales.en[key]);
    const trPl = checkPlaceholders(key, locales.tr[key]);
    if (enPl !== trPl) {
      placeholderMismatches++;
      console.log(`Mismatch in placeholders for "${key}":`);
      console.log(`  EN: "${locales.en[key]}" (${enPl})`);
      console.log(`  TR: "${locales.tr[key]}" (${trPl})`);
    }
  }
});

if (placeholderMismatches === 0) {
  console.log('\nNo placeholder mismatches found.');
}
