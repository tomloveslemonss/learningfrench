const bcrypt = require('bcrypt');
const { openDb, run, get } = require('../db');

const lessons = [
  {
    unit: 'Unit 1: Greetings',
    level: 'A1',
    title_fr: 'Bonjour et présentations',
    title_en: 'Greetings and introductions',
    title_pl: 'Powitania i przedstawianie się',
    content: {
      intro: {
        grammar: {
          en: 'Use “Bonjour” for hello and “Je m’appelle…” to introduce yourself.',
          pl: 'Używaj “Bonjour” jako dzień dobry i “Je m’appelle…” aby się przedstawić.'
        },
        vocab: {
          en: 'bonjour, salut, je, m’appelle, enchanté',
          pl: 'bonjour, salut, je, m’appelle, enchanté'
        }
      },
      exercises: [
        {
          type: 'multiple_choice',
          prompt: { en: 'Translate: Bonjour', pl: 'Przetłumacz: Bonjour' },
          options: { en: ['Hello', 'Goodbye', 'Please'], pl: ['Dzień dobry', 'Do widzenia', 'Proszę'] },
          answer: { en: 'Hello', pl: 'Dzień dobry' }
        },
        {
          type: 'fill_blank',
          prompt: { en: 'Fill in: Je ____ Marie.', pl: 'Uzupełnij: Je ____ Marie.' },
          answer: { fr: 'm’appelle' },
          acceptable: ['mappelle']
        },
        {
          type: 'order',
          prompt: { en: 'Order the words', pl: 'Ułóż słowa' },
          words: { fr: ['Je', 'm’appelle', 'Luc'] },
          answer: { fr: 'Je m’appelle Luc' }
        },
        {
          type: 'matching',
          prompt: { en: 'Match the greetings', pl: 'Dopasuj powitania' },
          pairs: [
            { fr: 'Bonjour', en: 'Hello', pl: 'Dzień dobry' },
            { fr: 'Salut', en: 'Hi', pl: 'Cześć' }
          ]
        },
        {
          type: 'listening',
          prompt: { en: 'Listen and type', pl: 'Posłuchaj i wpisz' },
          sentence: { fr: 'Enchanté' }
        },
        {
          type: 'speaking',
          prompt: { en: 'Say: Je suis Paul.', pl: 'Powiedz: Je suis Paul.' },
          answer: { fr: 'Je suis Paul' },
          acceptable: ['Je suis Paul.']
        }
      ],
      review: {
        items: ['bonjour', 'salut', 'je m’appelle']
      }
    }
  },
  {
    unit: 'Unit 1: Family',
    level: 'A1',
    title_fr: 'La famille',
    title_en: 'Family basics',
    title_pl: 'Podstawy o rodzinie',
    content: {
      intro: {
        grammar: {
          en: 'Use “mon/ma/mes” before family nouns.',
          pl: 'Używaj “mon/ma/mes” przed rzeczownikami rodzinnymi.'
        },
        vocab: {
          en: 'mère, père, frère, sœur, parents',
          pl: 'mère, père, frère, sœur, parents'
        }
      },
      exercises: [
        {
          type: 'multiple_choice',
          prompt: { en: 'Translate: ma mère', pl: 'Przetłumacz: ma mère' },
          options: { en: ['my mother', 'my father', 'my sister'], pl: ['moja mama', 'mój tata', 'moja siostra'] },
          answer: { en: 'my mother', pl: 'moja mama' }
        },
        {
          type: 'fill_blank',
          prompt: { en: 'Fill in: ____ frère est étudiant.', pl: 'Uzupełnij: ____ frère est étudiant.' },
          answer: { fr: 'Mon' },
          acceptable: ['mon']
        },
        {
          type: 'order',
          prompt: { en: 'Order the words', pl: 'Ułóż słowa' },
          words: { fr: ['Ma', 'sœur', 'est', 'sympa'] },
          answer: { fr: 'Ma sœur est sympa' }
        },
        {
          type: 'matching',
          prompt: { en: 'Match family words', pl: 'Dopasuj słowa o rodzinie' },
          pairs: [
            { fr: 'père', en: 'father', pl: 'ojciec' },
            { fr: 'frère', en: 'brother', pl: 'brat' }
          ]
        },
        {
          type: 'listening',
          prompt: { en: 'Listen and type', pl: 'Posłuchaj i wpisz' },
          sentence: { fr: 'Mes parents sont gentils' }
        },
        {
          type: 'speaking',
          prompt: { en: 'Say: Ma sœur est médecin.', pl: 'Powiedz: Ma sœur est médecin.' },
          answer: { fr: 'Ma sœur est médecin' }
        }
      ],
      review: {
        items: ['mère', 'père', 'frère', 'sœur']
      }
    }
  },
  {
    unit: 'Unit 2: Food',
    level: 'A2',
    title_fr: 'Commander au café',
    title_en: 'Ordering at a cafe',
    title_pl: 'Zamawianie w kawiarni',
    content: {
      intro: {
        grammar: {
          en: 'Use “Je voudrais…” for polite orders and “s’il vous plaît”.',
          pl: 'Używaj “Je voudrais…” do grzecznego zamawiania i “s’il vous plaît”.'
        },
        vocab: {
          en: 'café, thé, addition, eau, croissant',
          pl: 'café, thé, addition, eau, croissant'
        }
      },
      exercises: [
        {
          type: 'multiple_choice',
          prompt: { en: 'Translate: Je voudrais un café.', pl: 'Przetłumacz: Je voudrais un café.' },
          options: { en: ['I would like a coffee.', 'I need a coffee.', 'I drink coffee.'], pl: ['Poproszę kawę.', 'Potrzebuję kawy.', 'Piję kawę.'] },
          answer: { en: 'I would like a coffee.', pl: 'Poproszę kawę.' }
        },
        {
          type: 'fill_blank',
          prompt: { en: 'Fill in: L’____, s’il vous plaît.', pl: 'Uzupełnij: L’____, s’il vous plaît.' },
          answer: { fr: 'addition' }
        },
        {
          type: 'order',
          prompt: { en: 'Order the words', pl: 'Ułóż słowa' },
          words: { fr: ['Je', 'voudrais', 'un', 'thé'] },
          answer: { fr: 'Je voudrais un thé' }
        },
        {
          type: 'matching',
          prompt: { en: 'Match drinks', pl: 'Dopasuj napoje' },
          pairs: [
            { fr: 'eau', en: 'water', pl: 'woda' },
            { fr: 'thé', en: 'tea', pl: 'herbata' }
          ]
        },
        {
          type: 'listening',
          prompt: { en: 'Listen and type', pl: 'Posłuchaj i wpisz' },
          sentence: { fr: 'Un croissant, s’il vous plaît' }
        },
        {
          type: 'speaking',
          prompt: { en: 'Say: Je voudrais payer.', pl: 'Powiedz: Je voudrais payer.' },
          answer: { fr: 'Je voudrais payer' }
        }
      ],
      review: {
        items: ['je voudrais', 'addition', 's’il vous plaît']
      }
    }
  },
  {
    unit: 'Unit 3: Travel',
    level: 'A2',
    title_fr: 'Transports et directions',
    title_en: 'Transport and directions',
    title_pl: 'Transport i kierunki',
    content: {
      intro: {
        grammar: {
          en: 'Use “à gauche / à droite / tout droit” for directions.',
          pl: 'Używaj “à gauche / à droite / tout droit” do wskazywania kierunków.'
        },
        vocab: {
          en: 'gare, bus, métro, tout droit, à gauche',
          pl: 'gare, bus, métro, tout droit, à gauche'
        }
      },
      exercises: [
        {
          type: 'multiple_choice',
          prompt: { en: 'Translate: tout droit', pl: 'Przetłumacz: tout droit' },
          options: { en: ['straight ahead', 'left', 'right'], pl: ['prosto', 'w lewo', 'w prawo'] },
          answer: { en: 'straight ahead', pl: 'prosto' }
        },
        {
          type: 'fill_blank',
          prompt: { en: 'Fill in: Tournez à ____.', pl: 'Uzupełnij: Tournez à ____.' },
          answer: { fr: 'gauche' }
        },
        {
          type: 'order',
          prompt: { en: 'Order the words', pl: 'Ułóż słowa' },
          words: { fr: ['La', 'gare', 'est', 'ici'] },
          answer: { fr: 'La gare est ici' }
        },
        {
          type: 'matching',
          prompt: { en: 'Match transport', pl: 'Dopasuj transport' },
          pairs: [
            { fr: 'métro', en: 'subway', pl: 'metro' },
            { fr: 'bus', en: 'bus', pl: 'autobus' }
          ]
        },
        {
          type: 'listening',
          prompt: { en: 'Listen and type', pl: 'Posłuchaj i wpisz' },
          sentence: { fr: 'Le bus arrive' }
        },
        {
          type: 'speaking',
          prompt: { en: 'Say: C’est loin?', pl: 'Powiedz: C’est loin?' },
          answer: { fr: 'C’est loin' },
          acceptable: ['C’est loin?']
        }
      ],
      review: {
        items: ['à gauche', 'à droite', 'tout droit']
      }
    }
  },
  {
    unit: 'Unit 4: Work',
    level: 'B1',
    title_fr: 'Réunions et planning',
    title_en: 'Meetings and scheduling',
    title_pl: 'Spotkania i planowanie',
    content: {
      intro: {
        grammar: {
          en: 'Use “Il faut…” and “On doit…” to express obligations.',
          pl: 'Używaj “Il faut…” i “On doit…” aby wyrażać obowiązek.'
        },
        vocab: {
          en: 'réunion, calendrier, délai, tâche, planifier',
          pl: 'réunion, calendrier, délai, tâche, planifier'
        }
      },
      exercises: [
        {
          type: 'multiple_choice',
          prompt: { en: 'Translate: Il faut finir ce rapport.', pl: 'Przetłumacz: Il faut finir ce rapport.' },
          options: { en: ['We need to finish this report.', 'We started the report.', 'We read the report.'], pl: ['Trzeba skończyć ten raport.', 'Zaczęliśmy raport.', 'Czytamy raport.'] },
          answer: { en: 'We need to finish this report.', pl: 'Trzeba skończyć ten raport.' }
        },
        {
          type: 'fill_blank',
          prompt: { en: 'Fill in: On ____ planifier la réunion.', pl: 'Uzupełnij: On ____ planifier la réunion.' },
          answer: { fr: 'doit' }
        },
        {
          type: 'order',
          prompt: { en: 'Order the words', pl: 'Ułóż słowa' },
          words: { fr: ['Le', 'délai', 'est', 'court'] },
          answer: { fr: 'Le délai est court' }
        },
        {
          type: 'matching',
          prompt: { en: 'Match work words', pl: 'Dopasuj słowa o pracy' },
          pairs: [
            { fr: 'tâche', en: 'task', pl: 'zadanie' },
            { fr: 'réunion', en: 'meeting', pl: 'spotkanie' }
          ]
        },
        {
          type: 'listening',
          prompt: { en: 'Listen and type', pl: 'Posłuchaj i wpisz' },
          sentence: { fr: 'La réunion commence à neuf heures' }
        },
        {
          type: 'speaking',
          prompt: { en: 'Say: On doit répondre vite.', pl: 'Powiedz: On doit répondre vite.' },
          answer: { fr: 'On doit répondre vite' }
        }
      ],
      review: {
        items: ['il faut', 'on doit', 'réunion']
      }
    }
  },
  {
    unit: 'Unit 5: Health',
    level: 'B1',
    title_fr: 'Chez le médecin',
    title_en: 'At the doctor',
    title_pl: 'U lekarza',
    content: {
      intro: {
        grammar: {
          en: 'Use “J’ai mal à…” to describe pain.',
          pl: 'Używaj “J’ai mal à…” aby opisać ból.'
        },
        vocab: {
          en: 'douleur, pharmacie, ordonnance, fièvre, consulter',
          pl: 'douleur, pharmacie, ordonnance, fièvre, consulter'
        }
      },
      exercises: [
        {
          type: 'multiple_choice',
          prompt: { en: 'Translate: J’ai mal à la tête.', pl: 'Przetłumacz: J’ai mal à la tête.' },
          options: { en: ['My head hurts.', 'My leg hurts.', 'I feel good.'], pl: ['Boli mnie głowa.', 'Boli mnie noga.', 'Czuję się dobrze.'] },
          answer: { en: 'My head hurts.', pl: 'Boli mnie głowa.' }
        },
        {
          type: 'fill_blank',
          prompt: { en: 'Fill in: Je dois aller à la ____.', pl: 'Uzupełnij: Je dois aller à la ____.' },
          answer: { fr: 'pharmacie' }
        },
        {
          type: 'order',
          prompt: { en: 'Order the words', pl: 'Ułóż słowa' },
          words: { fr: ['J’ai', 'de', 'la', 'fièvre'] },
          answer: { fr: 'J’ai de la fièvre' }
        },
        {
          type: 'matching',
          prompt: { en: 'Match health words', pl: 'Dopasuj słowa o zdrowiu' },
          pairs: [
            { fr: 'douleur', en: 'pain', pl: 'ból' },
            { fr: 'ordonnance', en: 'prescription', pl: 'recepta' }
          ]
        },
        {
          type: 'listening',
          prompt: { en: 'Listen and type', pl: 'Posłuchaj i wpisz' },
          sentence: { fr: 'Je dois consulter un médecin' }
        },
        {
          type: 'speaking',
          prompt: { en: 'Say: Je suis malade.', pl: 'Powiedz: Je suis malade.' },
          answer: { fr: 'Je suis malade' }
        }
      ],
      review: {
        items: ['mal à', 'pharmacie', 'médecin']
      }
    }
  },
  {
    unit: 'Unit 6: Advanced',
    level: 'B2 (preview)',
    title_fr: 'Réclamations polies',
    title_en: 'Polite complaints',
    title_pl: 'Uprzejme reklamacje',
    content: {
      intro: {
        grammar: {
          en: 'Use conditional forms to soften complaints: “Je voudrais signaler…”',
          pl: 'Używaj trybu warunkowego, aby złagodzić skargi: “Je voudrais signaler…”'
        },
        vocab: {
          en: 'réclamation, signaler, déranger, remboursement, satisfait',
          pl: 'réclamation, signaler, déranger, remboursement, satisfait'
        }
      },
      exercises: [
        {
          type: 'multiple_choice',
          prompt: { en: 'Translate: Je voudrais signaler un problème.', pl: 'Przetłumacz: Je voudrais signaler un problème.' },
          options: { en: ['I would like to report a problem.', 'I solved a problem.', 'I have a problem.'], pl: ['Chciałbym zgłosić problem.', 'Rozwiązałem problem.', 'Mam problem.'] },
          answer: { en: 'I would like to report a problem.', pl: 'Chciałbym zgłosić problem.' }
        },
        {
          type: 'fill_blank',
          prompt: { en: 'Fill in: Je ne suis pas ____.', pl: 'Uzupełnij: Je ne suis pas ____.' },
          answer: { fr: 'satisfait' }
        },
        {
          type: 'order',
          prompt: { en: 'Order the words', pl: 'Ułóż słowa' },
          words: { fr: ['Je', 'voudrais', 'un', 'remboursement'] },
          answer: { fr: 'Je voudrais un remboursement' }
        },
        {
          type: 'matching',
          prompt: { en: 'Match complaint words', pl: 'Dopasuj słowa reklamacji' },
          pairs: [
            { fr: 'réclamation', en: 'complaint', pl: 'reklamacja' },
            { fr: 'remboursement', en: 'refund', pl: 'zwrot pieniędzy' }
          ]
        },
        {
          type: 'listening',
          prompt: { en: 'Listen and type', pl: 'Posłuchaj i wpisz' },
          sentence: { fr: 'Je voudrais signaler un retard' }
        },
        {
          type: 'speaking',
          prompt: { en: 'Say: Cela me dérange.', pl: 'Powiedz: Cela me dérange.' },
          answer: { fr: 'Cela me dérange' }
        }
      ],
      review: {
        items: ['je voudrais', 'réclamation', 'remboursement']
      }
    }
  }
];

async function seed() {
  const db = openDb();
  for (const lesson of lessons) {
    const existing = await get(db, 'SELECT id FROM lessons WHERE title_fr = ?', [lesson.title_fr]);
    if (!existing) {
      await run(
        db,
        'INSERT INTO lessons (unit, level, title_fr, title_en, title_pl, content_json) VALUES (?, ?, ?, ?, ?, ?)',
        [lesson.unit, lesson.level, lesson.title_fr, lesson.title_en, lesson.title_pl, JSON.stringify(lesson.content)]
      );
    }
  }

  const demoEmail = 'demo@frenchquest.local';
  const adminEmail = 'admin@frenchquest.local';
  const demoUser = await get(db, 'SELECT id FROM users WHERE email = ?', [demoEmail]);
  if (!demoUser) {
    const passwordHash = await bcrypt.hash('DemoPass123', 10);
    const result = await run(
      db,
      'INSERT INTO users (email, password_hash, ui_language) VALUES (?, ?, ?)',
      [demoEmail, passwordHash, 'en']
    );
    await run(
      db,
      'INSERT INTO user_progress (user_id, xp, streak, last_activity, hearts, level) VALUES (?, 120, 3, datetime("now"), 5, 2)',
      [result.lastID]
    );
  }

  const adminUser = await get(db, 'SELECT id FROM users WHERE email = ?', [adminEmail]);
  if (!adminUser) {
    const passwordHash = await bcrypt.hash('AdminPass123', 10);
    const result = await run(
      db,
      'INSERT INTO users (email, password_hash, ui_language, is_admin) VALUES (?, ?, ?, 1)',
      [adminEmail, passwordHash, 'en']
    );
    await run(
      db,
      'INSERT INTO user_progress (user_id, xp, streak, last_activity, hearts, level) VALUES (?, 0, 0, datetime("now"), 5, 1)',
      [result.lastID]
    );
  }

  db.close();
  console.log('Seed complete');
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
