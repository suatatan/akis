const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
function atomicWrite(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    const fd = fs.openSync(temp, 'wx');
    try { fs.writeFileSync(fd, text, 'utf8'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    fs.renameSync(temp, file);
  } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}
function inside(root, file) {
  const relative = path.relative(root, file);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}
function scan(root, depth = 0) {
  if (depth > 12) return [];
  return fs.readdirSync(root, { withFileTypes: true })
    .filter(e => !e.name.startsWith('.') && !['node_modules', 'dist', 'release'].includes(e.name) && !e.isSymbolicLink())
    .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name, 'tr'))
    .flatMap(e => {
      const file = path.join(root, e.name);
      if (e.isDirectory()) {
        let children; try { children = scan(file, depth + 1); } catch { return []; }
        return children.length ? [{ name: e.name, path: file, children }] : [];
      }
      return /\.(md|markdown|mdown)$/i.test(e.name) ? [{ name: e.name, path: file }] : [];
    });
}
function safeName(name) {
  let clean = String(name).trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').replace(/[. ]+$/, '');
  if (!clean || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(clean)) throw new Error('Geçerli bir dosya adı yaz.');
  if (clean.length > 120) throw new Error('Dosya adı en fazla 120 karakter olabilir.');
  if (!/\.(md|markdown|mdown)$/i.test(clean)) clean += '.md';
  return clean;
}
module.exports = { hash, atomicWrite, inside, scan, safeName };
