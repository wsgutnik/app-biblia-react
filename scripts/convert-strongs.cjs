const fs = require('fs');
const path = require('path');
const vm = require('vm');

function extractExportsFromJsFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');

  // sandbox com module.exports para capturar CommonJS export
  const sandbox = {
    module: { exports: {} },
    exports: {},
    window: {}, // some files reference window
    global: {},
    self: {},
    console
  };
  vm.createContext(sandbox);

  // wrap to avoid leaking top-level vars and execute
  const wrapped = `(function(module, exports, window, global, self){\n${src}\n})(module, module.exports, window, global, self);`;
  try {
    vm.runInContext(wrapped, sandbox, { filename: filePath, timeout: 5000 });
  } catch (err) {
    console.error('Execution error for', filePath, err.message || err);
    return null;
  }

  const exported = sandbox.module && sandbox.module.exports ? (sandbox.module.exports.default || sandbox.module.exports) : null;
  return exported;
}

function writeJson(jsRelativePath, outFileName) {
  const jsPath = path.resolve(__dirname, '..', jsRelativePath);
  const outPath = path.resolve(__dirname, '..', 'public', outFileName);
  if (!fs.existsSync(jsPath)) {
    console.warn('JS file not found:', jsPath);
    return;
  }
  const data = extractExportsFromJsFile(jsPath);
  if (!data) {
    console.warn('No export extracted from', jsPath);
    return;
  }
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Wrote ${outPath} (${Object.keys(data || {}).length} keys)`);
}

writeJson('public/strongs-greek-dictionary.js', 'strongs-greek-dictionary.json');
writeJson('public/strongs-hebrew-dictionary.js', 'strongs-hebrew-dictionary.json');