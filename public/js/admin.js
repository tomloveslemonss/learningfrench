import { post } from './api.js';
import { t } from './i18n.js';

export function initAdmin() {
  const form = document.getElementById('adminLessonForm');
  if (!form) {
    return;
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const contentText = data.get('content');
    let content;
    try {
      content = JSON.parse(contentText);
    } catch (error) {
      alert(t('admin.invalidJson'));
      return;
    }
    const lessonId = data.get('lessonId');
    const payload = {
      unit: data.get('unit'),
      level: data.get('level'),
      titleFr: data.get('titleFr'),
      titleEn: data.get('titleEn'),
      titlePl: data.get('titlePl'),
      content,
    };
    if (lessonId) {
      await post(`/api/admin/lessons/${lessonId}`, payload);
    } else {
      await post('/api/admin/lessons', payload);
    }
    form.reset();
    alert(t('admin.saved'));
  });
}
