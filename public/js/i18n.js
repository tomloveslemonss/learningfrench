let currentLang = 'en';
let translations = {};

export async function loadTranslations(lang) {
  const response = await fetch(`/i18n/${lang}.json`);
  translations = await response.json();
  currentLang = lang;
  applyTranslations();
}

export function t(key) {
  return key.split('.').reduce((acc, part) => (acc ? acc[part] : null), translations) || key;
}

export function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const value = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = value;
    } else {
      el.textContent = value;
    }
  });

  document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    const mapping = el.getAttribute('data-i18n-attr');
    mapping.split(',').forEach((pair) => {
      const [attr, key] = pair.split(':');
      if (attr && key) {
        el.setAttribute(attr.trim(), t(key.trim()));
      }
    });
  });

  const title = document.getElementById('pageTitle');
  if (title) {
    title.textContent = t('app.title');
  }
}

export function getCurrentLanguage() {
  return currentLang;
}
