const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { atomicWrite, hash, scan, safeName, inside } = require('./core.cjs');
if (process.env.AKIS_DATA_DIR) app.setPath('userData', path.resolve(process.env.AKIS_DATA_DIR));
const lock = app.requestSingleInstanceLock();
if (!lock) { app.quit(); }
let win, state, dataDir, notesRoot, root, quitting = false;
const documents = new Map(); const externalFiles = new Set();
const extensions = /\.(md|markdown|mdown)$/i;
let pending = process.argv.find(a => extensions.test(a) && fs.existsSync(a));
if (pending) externalFiles.add(path.resolve(pending));
function persist() { atomicWrite(path.join(dataDir, 'state.json'), JSON.stringify(state, null, 2)); }
function read(file) {
  file = fs.realpathSync(file);
  if (!extensions.test(file)) throw new Error('Bir Markdown dosyası seç.');
  if (fs.statSync(file).size > 8 * 1024 * 1024) throw new Error('Bu sürüm en fazla 8 MB dosya açabilir.');
  const content = fs.readFileSync(file, 'utf8');
  documents.set(file, hash(content));
  state.lastFile = file; persist();
  return { path: file, name: path.basename(file), content };
}
function permitted(file) {
  if (documents.has(file)) return file;
  const real = fs.realpathSync(file);
  if (!inside(root, real) || !extensions.test(real)) throw new Error('Bu dosya açık projenin içinde değil.');
  return real;
}
function tree() { return { root, name: root === notesRoot ? 'Yazı defterim' : path.basename(root), entries: scan(root) }; }
function unique(dir, name) {
  const parsed = path.parse(safeName(name)); let file = path.join(dir, parsed.base), n = 2;
  while (fs.existsSync(file)) file = path.join(dir, parsed.name + ' ' + n++ + parsed.ext);
  return file;
}
function save(file, content) {
  if (!documents.has(file) || typeof content !== 'string' || Buffer.byteLength(content) > 8 * 1024 * 1024) throw new Error('Dosya kaydedilemedi.');
  const backup = path.join(dataDir, 'backups', hash(file) + '.md');
  const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  if (current === null || hash(current) !== documents.get(file)) {
    atomicWrite(path.join(dataDir, 'recovery', hash(file) + '.md'), content);
    throw new Error('Dosya dışarıda değişti veya taşındı. Yazın kurtarma taslağında korunuyor. “Kopya olarak dışa aktar” ile sakla, sonra dosyayı yeniden aç.');
  }
  if (current !== content) { atomicWrite(backup, current); atomicWrite(file, content); }
  documents.set(file, hash(content));
  return true;
}
function handle(name, fn) {
  ipcMain.handle(name, async (event, ...args) => {
    const valid = process.env.AKIS_DEV_URL || pathToFileURL(path.join(__dirname, '../dist/index.html')).href;
    if (event.sender !== win.webContents || !event.senderFrame.url.startsWith(valid)) return { ok: false, error: 'Yetkisiz istek.' };
    try { return { ok: true, value: await fn(...args) }; } catch (e) { return { ok: false, error: e.message }; }
  });
}
app.on('second-instance', (_event, args) => {
  const file = args.find(a => extensions.test(a) && fs.existsSync(a));
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); if (file) { externalFiles.add(path.resolve(file)); win.webContents.send('open-file', file); } }
});
app.on('open-file', (event, file) => { event.preventDefault(); externalFiles.add(path.resolve(file)); if (win?.webContents && !win.webContents.isLoading()) win.webContents.send('open-file', file); else pending = file; });
if (lock) app.whenReady().then(() => {
  dataDir = app.getPath('userData'); notesRoot = path.join(dataDir, 'notes'); fs.mkdirSync(notesRoot, { recursive: true });
  const defaults = { theme: 'paper', customColor: '#ece7df', background: '', font: 'lora', fontSize: 20, lineHeight: 1.9, width: 760, sound: 'off', volume: 0.25, gap: 10, goal: 5, typewriter: false };
  try { state = JSON.parse(fs.readFileSync(path.join(dataDir, 'state.json'), 'utf8')); } catch { state = {}; }
  state.settings = { ...defaults, ...state.settings }; state.stats ||= { days: {}, best: 0, sessions: 0 };
  root = state.root && fs.existsSync(state.root) ? fs.realpathSync(state.root) : notesRoot;
  const welcome = path.join(notesRoot, 'Hoş geldin.md');
  if (!fs.existsSync(welcome) && !state.initialized) atomicWrite(welcome, '# Düşüncelerine yer aç.\n\nBazen tek ihtiyacın, boş bir sayfa ve ilk cümledir.\n\nAkış, yazıyla baş başa kalabileceğin sakin bir alan. **Yazdığın her şey kendiliğinden kaydolur.** Bir dosyayı aç, bir klasörle çalış ya da yeni bir düşünceye başla.\n\n## Ritmini bul\n\nYukarıdaki **Akışa başla** düğmesiyle kesintisiz yazma süreni ölç. Duraksamak seriyi bitirir; yazdıkların her zaman sende kalır.\n\n> İlk taslağın mükemmel olması gerekmiyor. Yalnızca var olması gerekiyor.\n\n## Küçük kolaylıklar\n\n- **Ctrl + N** ile yeni bir yazı aç.\n- **Ctrl + Shift + O** ile bir proje klasörü seç.\n- **Ctrl + Shift + F** ile yalnızca yazına odaklan.\n- **F11** ile tam ekranı değiştir.\n\nAyarlar içinden yazı tipini, kâğıdını ve daktilo sesini kendine göre seç.\n\n---\n\nŞimdi sıra sende.\n');
  state.initialized = true; persist();
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({ width: 1440, height: 960, minWidth: 850, minHeight: 620, title: 'Akış', backgroundColor: '#f6f4ee', autoHideMenuBar: true,
    fullscreen: !process.env.AKIS_TEST, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  win.webContents.on('context-menu', (_e, params) => { if (params.isEditable) Menu.buildFromTemplate([{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut', label: 'Kes' }, { role: 'copy', label: 'Kopyala' }, { role: 'paste', label: 'Yapıştır' }, { role: 'selectAll', label: 'Tümünü seç' }]).popup({ window: win }); });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event) => event.preventDefault());
  win.on('close', e => { if (!quitting) { e.preventDefault(); win.webContents.send('prepare-close'); } });
  handle('boot', () => {
    let doc;
    for (const file of [pending, state.lastFile, welcome].filter(Boolean)) { try { doc = read(file); break; } catch {} }
    if (!doc) { const file = unique(notesRoot, 'Yeni yazı'); atomicWrite(file, ''); doc = read(file); }
    return { settings: state.settings, stats: state.stats, tree: tree(), doc };
  });
  handle('tree', tree);
  handle('open', file => read(permitted(file)));
  handle('open-external', file => { if (!externalFiles.has(path.resolve(file))) throw new Error('Dosya açma yetkisi yok.'); externalFiles.delete(path.resolve(file)); return read(file); });
  handle('choose-file', async () => { const result = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'mdown'] }] }); return result.canceled ? null : read(result.filePaths[0]); });
  handle('choose-folder', async () => { const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] }); if (result.canceled) return null; root = fs.realpathSync(result.filePaths[0]); state.root = root; persist(); return tree(); });
  handle('notes', () => { root = notesRoot; state.root = root; persist(); return tree(); });
  handle('new', name => { const file = unique(root, name || 'Yeni yazı'); fs.writeFileSync(file, '', { flag: 'wx' }); return { doc: read(file), tree: tree() }; });
  handle('rename', (file, name) => {
    if (!documents.has(file)) throw new Error('Dosya açık değil.');
    if (hash(fs.readFileSync(file, 'utf8')) !== documents.get(file)) throw new Error('Dosya dışarıda değişti. Önce yeniden aç.');
    const target = path.join(path.dirname(file), safeName(name));
    if (target === file) return { doc: read(file), tree: tree() };
    if (fs.existsSync(target)) throw new Error('Bu adda bir dosya zaten var.');
    fs.renameSync(file, target); documents.delete(file); return { doc: read(target), tree: tree() };
  });
  handle('image', (file, src) => {
    if (!documents.has(file) || typeof src !== 'string' || /^[a-z]+:/i.test(src) || path.isAbsolute(src)) throw new Error('Görsel yolu uygun değil.');
    const image = fs.realpathSync(path.resolve(path.dirname(file), decodeURIComponent(src)));
    if (!inside(path.dirname(file), image) && !inside(root, image)) throw new Error('Görsel projenin içinde değil.');
    if (!/\.(png|jpg|jpeg|webp|gif)$/i.test(image) || fs.statSync(image).size > 10 * 1024 * 1024) throw new Error('Desteklenmeyen veya büyük görsel.');
    const ext = path.extname(image).slice(1).toLowerCase();
    return 'data:image/' + (ext === 'jpg' ? 'jpeg' : ext) + ';base64,' + fs.readFileSync(image).toString('base64');
  });
  handle('open-url', url => { if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) throw new Error('Geçersiz bağlantı.'); return shell.openExternal(url); });

  handle('save', save);
  handle('export', async (content) => {
    if (typeof content !== 'string' || content.length > 8 * 1024 * 1024) throw new Error('Geçersiz içerik.');
    const result = await dialog.showSaveDialog(win, { defaultPath: 'Yazım.md', filters: [{ name: 'Markdown', extensions: ['md'] }] });
    if (result.canceled) return null;
    const target = fs.existsSync(result.filePath) ? fs.realpathSync(result.filePath) : path.resolve(result.filePath);
    if (documents.has(target)) throw new Error('Kopyayı açık belgeden farklı bir dosya adıyla dışa aktar.');
    atomicWrite(target, content); return target;

  });
  handle('settings', settings => {
    const next = { ...state.settings };
    for (const key of Object.keys(defaults)) if (settings[key] !== undefined && typeof settings[key] === typeof defaults[key]) next[key] = settings[key];
    next.fontSize = Math.min(36, Math.max(14, next.fontSize)); next.gap = Math.min(60, Math.max(3, next.gap)); next.volume = Math.min(1, Math.max(0, next.volume));
    state.settings = next; persist(); return next;
  });
  handle('background', async () => {
    const result = await dialog.showOpenDialog(win, { filters: [{ name: 'Görsel', extensions: ['png', 'jpg', 'jpeg', 'webp'] }], properties: ['openFile'] });
    if (result.canceled) return null;
    const file = result.filePaths[0]; if (fs.statSync(file).size > 10 * 1024 * 1024) throw new Error('Görsel en fazla 10 MB olabilir.');
    const ext = path.extname(file).slice(1).toLowerCase(); const mime = ext === 'jpg' ? 'jpeg' : ext;
    const image = 'data:image/' + mime + ';base64,' + fs.readFileSync(file).toString('base64');
    state.settings.background = image; persist(); return image;
  });
  handle('stats', delta => {
    const day = new Date().toLocaleDateString('sv-SE');
    state.stats.days[day] ||= { words: 0, seconds: 0 };
    state.stats.days[day].words += Math.max(0, Math.min(1000, Number(delta.words) || 0));
    state.stats.days[day].seconds += Math.max(0, Math.min(3600, Number(delta.seconds) || 0));
    state.stats.best = Math.max(state.stats.best, Number(delta.best) || 0);
    state.stats.sessions += delta.session ? 1 : 0; persist(); return state.stats;
  });
  handle('reveal', file => { if (documents.has(file)) shell.showItemInFolder(file); });
  handle('backups', () => { fs.mkdirSync(path.join(dataDir, 'backups'), { recursive: true }); return shell.openPath(dataDir); });
  handle('fullscreen', () => { win.setFullScreen(!win.isFullScreen()); return win.isFullScreen(); });
  handle('close-ready', () => { quitting = true; win.close(); });
  if (process.env.AKIS_DEV_URL) win.loadURL(process.env.AKIS_DEV_URL); else win.loadFile(path.join(__dirname, '../dist/index.html'));
});
app.on('window-all-closed', () => app.quit());




