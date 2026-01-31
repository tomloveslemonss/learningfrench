import { post } from './api.js';
import { t, getCurrentLanguage } from './i18n.js';

function normalizeAnswer(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{Letter}\p{Number}\s]/gu, '')
    .trim();
}

function supportsSpeechRecognition() {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

function supportsSpeechSynthesis() {
  return 'speechSynthesis' in window;
}

export function createLessonEngine({ lesson, onComplete, onProgress, onNotice, startIndex = 0 }) {
  let currentIndex = startIndex;
  const exercises = lesson.content.exercises;
  const mistakeBuffer = [];

  function render() {
    const exercise = exercises[currentIndex];
    const container = document.getElementById('lessonContent');
    container.innerHTML = '';
    if (!exercise) {
      onComplete(mistakeBuffer.length);
      return;
    }

    const intro = document.createElement('div');
    intro.className = 'exercise-block';
    intro.innerHTML = `<h2>${lesson.title_fr}</h2><p>${lesson.content.intro.grammar[getCurrentLanguage()]}</p>`;
    container.appendChild(intro);

    const block = document.createElement('div');
    block.className = 'exercise-block';
    const prompt = document.createElement('p');
    prompt.textContent = exercise.prompt[getCurrentLanguage()] || exercise.prompt.en;
    block.appendChild(prompt);

    if (exercise.type === 'multiple_choice') {
      const options = document.createElement('div');
      options.className = 'exercise-options';
      exercise.options[getCurrentLanguage()].forEach((option) => {
        const btn = document.createElement('button');
        btn.className = 'ghost';
        btn.type = 'button';
        btn.textContent = option;
        btn.addEventListener('click', () => handleAnswer(option, exercise.answer[getCurrentLanguage()]));
        options.appendChild(btn);
      });
      block.appendChild(options);
    }

    if (exercise.type === 'fill_blank') {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = t('lesson.typeAnswer');
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          handleAnswer(input.value, exercise.answer.fr, exercise.acceptable || []);
        }
      });
      block.appendChild(input);
    }

    if (exercise.type === 'order') {
      const words = exercise.words.fr.slice().sort(() => Math.random() - 0.5);
      const selected = [];
      const options = document.createElement('div');
      options.className = 'exercise-options';
      words.forEach((word) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ghost';
        btn.textContent = word;
        btn.addEventListener('click', () => {
          selected.push(word);
          btn.disabled = true;
        });
        options.appendChild(btn);
      });
      const submit = document.createElement('button');
      submit.type = 'button';
      submit.className = 'primary';
      submit.textContent = t('lesson.submit');
      submit.addEventListener('click', () => handleAnswer(selected.join(' '), exercise.answer.fr));
      block.appendChild(options);
      block.appendChild(submit);
    }

    if (exercise.type === 'matching') {
      const pairs = exercise.pairs;
      const left = document.createElement('div');
      left.className = 'exercise-options';
      const right = document.createElement('div');
      right.className = 'exercise-options';
      const rightItems = pairs.map((pair) => pair[getCurrentLanguage()]).sort(() => Math.random() - 0.5);
      let selectedLeft = null;
      let matches = 0;
      pairs.forEach((pair) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ghost';
        btn.textContent = pair.fr;
        btn.addEventListener('click', () => {
          selectedLeft = pair;
        });
        left.appendChild(btn);
      });
      rightItems.forEach((item) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ghost';
        btn.textContent = item;
        btn.addEventListener('click', () => {
          if (!selectedLeft) {
            return;
          }
          const expected = selectedLeft[getCurrentLanguage()];
          if (expected === item) {
            btn.disabled = true;
            matches += 1;
            if (matches === pairs.length) {
              handleAnswer('ok', 'ok');
            }
          } else {
            handleAnswer('wrong', 'ok');
          }
        });
        right.appendChild(btn);
      });
      block.appendChild(left);
      block.appendChild(right);
    }

    if (exercise.type === 'listening') {
      const sentence = exercise.sentence.fr;
      const audioNotice = document.createElement('p');
      audioNotice.className = 'notice';
      audioNotice.textContent = supportsSpeechSynthesis() ? t('lesson.listenPrompt') : t('lesson.noAudio');
      block.appendChild(audioNotice);
      const answer = document.createElement('input');
      answer.type = 'text';
      answer.placeholder = t('lesson.typeAnswer');
      answer.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          handleAnswer(answer.value, sentence);
        }
      });
      block.appendChild(answer);
    }

    if (exercise.type === 'speaking') {
      if (!supportsSpeechRecognition()) {
        const notice = document.createElement('p');
        notice.className = 'notice';
        notice.textContent = t('lesson.noMic');
        block.appendChild(notice);
      } else {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'primary';
        button.textContent = t('lesson.startSpeaking');
        button.addEventListener('click', () => {
          const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          const recognition = new Recognition();
          recognition.lang = 'fr-FR';
          recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            handleAnswer(transcript, exercise.answer.fr, exercise.acceptable || []);
          };
          recognition.start();
        });
        block.appendChild(button);
      }
    }

    container.appendChild(block);
    onProgress(currentIndex, exercises.length);
  }

  async function handleAnswer(value, expected, acceptable = []) {
    const normalized = normalizeAnswer(value);
    const normalizedExpected = normalizeAnswer(expected);
    const isCorrect = normalized === normalizedExpected || acceptable.some((alt) => normalizeAnswer(alt) === normalized);
    if (!isCorrect) {
      mistakeBuffer.push(expected);
      await post('/api/progress/record', {
        correct: false,
        itemKey: JSON.stringify({
          prompt: exercisePrompt(),
          answer: expected,
        }),
      });
      onNotice(t('lesson.mistake'));
      return;
    }
    await post('/api/progress/record', {
      correct: true,
      itemKey: JSON.stringify({
        prompt: exercisePrompt(),
        answer: expected,
      }),
    });
    currentIndex += 1;
    render();
  }

  function exercisePrompt() {
    const exercise = exercises[currentIndex];
    return exercise.prompt[getCurrentLanguage()] || exercise.prompt.en;
  }

  function next() {
    currentIndex = Math.min(currentIndex + 1, exercises.length - 1);
    render();
  }

  function prev() {
    currentIndex = Math.max(currentIndex - 1, 0);
    render();
  }

  function speakCurrent() {
    if (!supportsSpeechSynthesis()) {
      onNotice(t('lesson.noAudio'));
      return;
    }
    const exercise = exercises[currentIndex];
    const text = exercise.sentence ? exercise.sentence.fr : exercise.answer?.fr || lesson.title_fr;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    window.speechSynthesis.speak(utterance);
  }

  return { render, next, prev, speakCurrent };
}
