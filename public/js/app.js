import { initCsrf, get, post, patch } from './api.js';
import { loadTranslations, t, getCurrentLanguage } from './i18n.js';
import { register, login, logout, requestReset } from './auth.js';
import { createLessonEngine } from './lesson.js';
import { initAdmin } from './admin.js';

let currentUser = null;
let lessonEngine = null;

const sections = {
  auth: document.getElementById('authSection'),
  dashboard: document.getElementById('dashboardSection'),
  lesson: document.getElementById('lessonSection'),
  profile: document.getElementById('profileSection'),
  admin: document.getElementById('adminSection'),
};

function showSection(name) {
  Object.entries(sections).forEach(([key, section]) => {
    section.classList.toggle('hidden', key !== name);
  });
}

function updateLanguageSelect(language) {
  const select = document.getElementById('languageSelect');
  select.innerHTML = '';
  const optionEn = document.createElement('option');
  optionEn.value = 'en';
  optionEn.textContent = t('language.en');
  const optionPl = document.createElement('option');
  optionPl.value = 'pl';
  optionPl.textContent = t('language.pl');
  select.append(optionEn, optionPl);
  select.value = language;

  const settingsLang = document.getElementById('settingsLanguage');
  settingsLang.innerHTML = '';
  const settingsEn = document.createElement('option');
  settingsEn.value = 'en';
  settingsEn.textContent = t('language.en');
  const settingsPl = document.createElement('option');
  settingsPl.value = 'pl';
  settingsPl.textContent = t('language.pl');
  settingsLang.append(settingsEn, settingsPl);
  settingsLang.value = language;
}

async function refreshDashboard() {
  const data = await get('/api/me');
  currentUser = data.user;
  const progress = data.progress;
  document.getElementById('xpValue').textContent = progress.xp;
  document.getElementById('streakValue').textContent = progress.streak;
  document.getElementById('heartsValue').textContent = progress.hearts;
  document.getElementById('lessonHearts').textContent = progress.hearts;
  const continueText = document.getElementById('continueText');
  if (progress.last_lesson_id) {
    continueText.textContent = t('dashboard.continuePrompt');
    document.getElementById('continueBtn').classList.remove('hidden');
    document.getElementById('continueBtn').onclick = () => startLesson(progress.last_lesson_id);
  } else {
    continueText.textContent = t('dashboard.startPrompt');
    document.getElementById('continueBtn').classList.add('hidden');
  }

  const lessonsData = await get('/api/lessons');
  const lessonList = document.getElementById('lessonList');
  lessonList.innerHTML = '';
  lessonsData.lessons.forEach((lesson) => {
    const card = document.createElement('div');
    card.className = 'lesson-card';
    const title = getCurrentLanguage() === 'pl' ? lesson.title_pl : lesson.title_en;
    card.innerHTML = `<div><strong>${lesson.title_fr}</strong><div>${title}</div><small>${lesson.unit} • ${lesson.level}</small></div>`;
    const btn = document.createElement('button');
    btn.textContent = t('lesson.start');
    btn.addEventListener('click', () => startLesson(lesson.id));
    card.appendChild(btn);
    lessonList.appendChild(card);
  });

  const quests = await get('/api/quests');
  const questList = document.getElementById('questList');
  questList.innerHTML = '';
  quests.quest.goals.forEach((goal) => {
    const li = document.createElement('li');
    li.textContent = `${t(`quests.${goal.id}`)}: ${quests.quest.progress[goal.id]}/${goal.target}`;
    questList.appendChild(li);
  });

  const leaderboard = await get('/api/leaderboard');
  const leaderboardList = document.getElementById('leaderboardList');
  leaderboardList.innerHTML = '';
  leaderboard.leaders.forEach((leader) => {
    const li = document.createElement('li');
    li.textContent = `${leader.email} • ${leader.xp} ${t('dashboard.xp')}`;
    leaderboardList.appendChild(li);
  });

  const achievementData = await get('/api/achievements');
  const achievementList = document.getElementById('achievementList');
  achievementList.innerHTML = '';
  achievementData.achievements.forEach((achievement) => {
    const li = document.createElement('li');
    li.textContent = `${t(`achievements.${achievement.id}`)} ${achievement.earned ? '✅' : '⬜️'}`;
    achievementList.appendChild(li);
  });

  if (currentUser.is_admin === 1) {
    sections.admin.classList.remove('hidden');
    document.getElementById('adminBtn').classList.remove('hidden');
  }
}

async function startLesson(id) {
  const data = await get(`/api/lessons/${id}`);
  const lesson = data.lesson;
  const reviewData = await get('/api/review');
  if ((data.progress.last_position || 0) === 0 && reviewData.items.length >= 3) {
    const reviewExercises = reviewData.items.map((item) => {
      let payload = { prompt: t('dashboard.review'), answer: '' };
      try {
        payload = JSON.parse(item.item_key);
      } catch (error) {
        payload = { prompt: t('dashboard.review'), answer: item.item_key };
      }
      return {
        type: 'fill_blank',
        prompt: { en: payload.prompt, pl: payload.prompt },
        answer: { fr: payload.answer },
        acceptable: [payload.answer],
      };
    });
    lesson.content.exercises = [...reviewExercises, ...lesson.content.exercises];
  }
  lessonEngine = createLessonEngine({
    lesson,
    onComplete: async (mistakeCount) => {
      await post(`/api/lessons/${id}/complete`, { xp: 50 });
      await post('/api/quests/progress', { key: 'complete_lesson', amount: 1 });
      await post('/api/quests/progress', { key: 'earn_xp', amount: 50 });
      if (mistakeCount > 0) {
        await post('/api/quests/progress', { key: 'practice_mistakes', amount: 1 });
      }
      await refreshDashboard();
      showSection('dashboard');
    },
    onProgress: async (current, total) => {
      const progressFill = document.getElementById('progressFill');
      const safeTotal = total || 1;
      progressFill.style.width = `${((current + 1) / safeTotal) * 100}%`;
      await post(`/api/lessons/${id}/position`, { position: current });
    },
    onNotice: (message) => {
      alert(message);
    },
    startIndex: data.progress.last_position || 0,
  });
  showSection('lesson');
  lessonEngine.render();
}

async function startReview() {
  const reviewData = await get('/api/review');
  if (!reviewData.items.length) {
    alert(t('dashboard.reviewHint'));
    return;
  }
  const exercises = reviewData.items.map((item) => {
    let payload = { prompt: t('dashboard.review'), answer: '' };
    try {
      payload = JSON.parse(item.item_key);
    } catch (error) {
      payload = { prompt: t('dashboard.review'), answer: item.item_key };
    }
    return {
      type: 'fill_blank',
      prompt: { en: payload.prompt, pl: payload.prompt },
      answer: { fr: payload.answer },
      acceptable: [payload.answer],
    };
  });
  const lesson = {
    id: 'review',
    title_fr: 'Révision',
    content: {
      intro: {
        grammar: { en: t('dashboard.reviewHint'), pl: t('dashboard.reviewHint') },
        vocab: { en: '', pl: '' },
      },
      exercises,
      review: { items: [] },
    },
  };
  lessonEngine = createLessonEngine({
    lesson,
    onComplete: async () => {
      await post('/api/progress/heal', {});
      await refreshDashboard();
      showSection('dashboard');
    },
    onProgress: async (current, total) => {
      const progressFill = document.getElementById('progressFill');
      const safeTotal = total || 1;
      progressFill.style.width = `${((current + 1) / safeTotal) * 100}%`;
    },
    onNotice: (message) => alert(message),
    startIndex: 0,
  });
  showSection('lesson');
  lessonEngine.render();
}

async function init() {
  await initCsrf();
  await loadTranslations('en');
  updateLanguageSelect('en');

  document.getElementById('languageSelect').addEventListener('change', async (event) => {
    await loadTranslations(event.target.value);
    if (currentUser) {
      await patch('/api/me', { uiLanguage: event.target.value, dailyGoal: currentUser.daily_goal });
      await refreshDashboard();
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await logout();
    currentUser = null;
    document.getElementById('adminBtn').classList.add('hidden');
    showSection('auth');
  });

  document.getElementById('profileBtn').addEventListener('click', () => {
    showSection('profile');
  });

  document.getElementById('adminBtn').addEventListener('click', () => {
    showSection('admin');
  });

  document.getElementById('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    await login(event.target);
    await refreshDashboard();
    showSection('dashboard');
  });

  document.getElementById('registerForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    await register(event.target);
    await refreshDashboard();
    showSection('dashboard');
  });

  document.getElementById('resetPasswordBtn').addEventListener('click', async () => {
    const email = prompt(t('auth.resetPrompt'));
    if (!email) {
      return;
    }
    await requestReset(email);
    alert(t('auth.resetSent'));
  });

  document.getElementById('reviewBtn').addEventListener('click', () => {
    startReview();
  });

  document.getElementById('backToDashboard').addEventListener('click', () => {
    showSection('dashboard');
  });

  document.getElementById('nextExercise').addEventListener('click', () => {
    if (lessonEngine) {
      lessonEngine.next();
    }
  });

  document.getElementById('prevExercise').addEventListener('click', () => {
    if (lessonEngine) {
      lessonEngine.prev();
    }
  });

  document.getElementById('audioBtn').addEventListener('click', () => {
    if (lessonEngine) {
      lessonEngine.speakCurrent();
    }
  });

  document.getElementById('hintBtn').addEventListener('click', () => {
    alert(t('lesson.hintText'));
  });

  document.getElementById('reportBtn').addEventListener('click', () => {
    alert(t('lesson.reportText'));
  });

  document.getElementById('settingsForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    await patch('/api/me', {
      uiLanguage: formData.get('uiLanguage'),
      dailyGoal: formData.get('dailyGoal'),
    });
    await loadTranslations(formData.get('uiLanguage'));
    updateLanguageSelect(formData.get('uiLanguage'));
    await refreshDashboard();
  });

  document.getElementById('resetProgressBtn').addEventListener('click', async () => {
    if (!confirm(t('settings.confirmReset'))) {
      return;
    }
    await post('/api/progress/reset', {});
    alert(t('settings.resetDone'));
  });

  initAdmin();

  try {
    const me = await get('/api/me');
    currentUser = me.user;
    await loadTranslations(currentUser.ui_language);
    updateLanguageSelect(currentUser.ui_language);
    await refreshDashboard();
    showSection('dashboard');
  } catch (error) {
    showSection('auth');
  }
}

init();
