import * as cheerio from 'cheerio';
import fs from 'fs';

console.log('Reading XHTML dictionary file...');
const xhtml = fs.readFileSync('strongs-dictionary.xhtml', 'utf-8');

console.log('Parsing XHTML...');
const $ = cheerio.load(xhtml, {
  xmlMode: true,
  decodeEntities: false
});

const dictionary = {};
let count = 0;

// The XHTML file uses 'div' elements with a class 'entry' for each word
$('div.entry').each((i, el) => {
  const entry = $(el);
  const strongNumber = entry.attr('id');

  if (strongNumber) {
    const greekWord = entry.find('span[lang="grc"]').first().text();
    const transliteration = entry.find('i').first().text();
    const definition = entry.find('p').first().text().trim();

    dictionary[strongNumber] = {
      strong_number: strongNumber,
      lemma: greekWord,
      transliteration: transliteration,
      definition: definition,
    };
    count++;
  }
});

console.log(`Found and processed ${count} entries.`);
console.log('Saving to public/strongs-dictionary.json...');

// Ensure the public directory exists
if (!fs.existsSync('public')) {
  fs.mkdirSync('public');
}

// Save the final JSON file inside the 'public' folder
fs.writeFileSync(
  'public/strongs-dictionary.json',
  JSON.stringify(dictionary, null, 2)
);

console.log('✅ Success! Dictionary is ready at public/strongs-dictionary.json');