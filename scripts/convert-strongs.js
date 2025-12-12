const fs = require('fs');
const path = require('path');

function writeJsonFromJs(jsPath, outName) {
  try {
    const abs = path.resolve(jsPath);
    delete require.cache[abs];
    const exported = require(abs);
    const data = exported && exported.default ? exported.default : exported;
    const outPath = path.resolve(__dirname, '..', 'public', outName);
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Wrote ${outPath} (${Object.keys(data || {}).length} keys)`);
  } catch (err) {
    console.error(`Failed to convert ${jsPath}:`, err.message || err);
    process.exitCode = 1;
  }
}

writeJsonFromJs('./public/strongs-greek-dictionary.js', 'strongs-greek-dictionary.json');
writeJsonFromJs('./public/strongs-hebrew-dictionary.js', 'strongs-hebrew-dictionary.json');