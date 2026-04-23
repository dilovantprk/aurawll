import { locales } from '../../translations.js?v=202';
import { AppState } from './state.js';

export function t(key) {
  if (!locales || !AppState.lang || !locales[AppState.lang]) return key;
  return locales[AppState.lang][key] || key;
}

/**
 * Sweeps the DOM for elements with data-i18n attributes and updates their content.
 */
export function renderLocalization(root = document) {
  if (!locales[AppState.lang]) return;

  // Update text content
  root.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = t(key);
    if (translation && translation !== key) {
      el.textContent = translation;
    }
  });

  // Update innerHTML for elements that contain HTML tags (e.g. legal links)
  root.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    const translation = t(key);
    if (translation && translation !== key) {
      el.innerHTML = translation;
    }
  });

  // Update specific attributes (e.g., placeholder:auth_email)
  root.querySelectorAll('[data-i18n-prop]').forEach(el => {
    const propMap = el.getAttribute('data-i18n-prop'); // Format: "placeholder:key,title:key"
    propMap.split(',').forEach(mapping => {
      const [attr, key] = mapping.split(':');
      const translation = t(key);
      if (translation && translation !== key) {
        el.setAttribute(attr, translation);
      }
    });
  });
}
