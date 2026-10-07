import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load local fallback question bank safely
let localQuestions = [];
try {
  const filePath = path.join(__dirname, '../data/triviaQuestions.json');
  const rawData = fs.readFileSync(filePath, 'utf8');
  localQuestions = JSON.parse(rawData);
  console.log(`[TriviaService] Loaded ${localQuestions.length} fallback questions.`);
} catch (err) {
  console.error('[TriviaService] Failed to load local questions bank:', err);
  localQuestions = [
    {
      id: 1,
      category: 'General',
      difficulty: 'easy',
      question: 'What is the capital of France?',
      options: ['London', 'Berlin', 'Paris', 'Rome'],
      correctIndex: 2,
      explanation: 'Paris is the capital of France.'
    }
  ];
}

/**
 * Decode HTML entities commonly returned by Open Trivia DB (e.g. &quot;, &#039;, &amp;)
 */
export function decodeHtmlEntities(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&eacute;/g, 'é')
    .replace(/&Eacute;/g, 'É')
    .replace(/&oacute;/g, 'ó')
    .replace(/&aacute;/g, 'á')
    .replace(/&iacute;/g, 'í')
    .replace(/&ntilde;/g, 'ñ')
    .replace(/&uuml;/g, 'ü')
    .replace(/&shy;/g, '')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Shuffles an array in-place using Fisher-Yates algorithm
 */
export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Get random questions from the local JSON fallback bank
 */
export function getLocalQuestions(count = 10) {
  const shuffled = shuffle(localQuestions);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  return selected.map((q, idx) => {
    const originalCorrect = q.options[q.correctIndex];
    const shuffledOptions = shuffle(q.options);
    const newCorrectIndex = shuffledOptions.indexOf(originalCorrect);

    return {
      id: `local_${q.id}_${Date.now()}_${idx}`,
      category: q.category || 'General Knowledge',
      difficulty: q.difficulty || 'medium',
      question: q.question,
      options: shuffledOptions,
      correctIndex: newCorrectIndex,
      explanation: q.explanation || `The correct answer is "${originalCorrect}".`,
      source: 'local'
    };
  });
}

/**
 * Fetch 10 questions from Open Trivia DB API with automatic local fallback
 * @param {number} amount Number of questions (default: 10)
 * @returns {Promise<Array>} Array of formatted questions
 */
export async function fetchTriviaQuestions(amount = 10) {
  const url = `https://opentdb.com/api.php?amount=${amount}&type=multiple`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); // 4s timeout

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[TriviaService] OpenTDB returned HTTP ${response.status}. Using fallback bank.`);
      return getLocalQuestions(amount);
    }

    const data = await response.json();

    if (data.response_code !== 0 || !Array.isArray(data.results) || data.results.length === 0) {
      console.warn(`[TriviaService] OpenTDB response_code ${data.response_code}. Using fallback bank.`);
      return getLocalQuestions(amount);
    }

    // Format OpenTDB questions to unified structure
    const formatted = data.results.map((item, idx) => {
      const decodedQuestion = decodeHtmlEntities(item.question);
      const decodedCorrect = decodeHtmlEntities(item.correct_answer);
      const decodedIncorrect = (item.incorrect_answers || []).map(decodeHtmlEntities);

      // Combine and shuffle options
      const allOptions = shuffle([...decodedIncorrect, decodedCorrect]);
      const correctIndex = allOptions.indexOf(decodedCorrect);

      return {
        id: `opentdb_${Date.now()}_${idx}`,
        category: decodeHtmlEntities(item.category || 'General Knowledge'),
        difficulty: item.difficulty || 'medium',
        question: decodedQuestion,
        options: allOptions,
        correctIndex: correctIndex,
        explanation: `The correct answer is "${decodedCorrect}".`,
        source: 'opentdb'
      };
    });

    console.log(`[TriviaService] Successfully fetched ${formatted.length} questions from Open Trivia DB.`);
    return formatted;
  } catch (err) {
    console.warn(`[TriviaService] Fetch failed (${err.message}). Using local questions.`);
    return getLocalQuestions(amount);
  }
}
