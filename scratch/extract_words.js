
const fs = require('fs');

const inputFile = 'data/ods.txt';
const outputFile = 'src/words2.ts';

function normalize(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

try {
  const data = fs.readFileSync(inputFile, 'utf8');
  const lines = data.split(/\r?\n/);

  const words5 = new Set();

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 5) {
      const normalized = normalize(trimmed);
      // Ensure it's only letters A-Z
      if (/^[A-Z]{5}$/.test(normalized)) {
        words5.add(normalized);
      }
    }
  }

  const wordList = Array.from(words5).sort();

  const content = `export const WORDS = ${JSON.stringify(wordList, null, 2)};

export function getRandomWord(): string {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}
`;

  fs.writeFileSync(outputFile, content);
  console.log(`Generated ${wordList.length} words in ${outputFile}`);
} catch (err) {
  console.error(err);
}
