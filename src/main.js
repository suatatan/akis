import './style.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/lora/latin-400.css';
import '@fontsource/lora/latin-500.css';
import '@fontsource/lora/latin-700.css';
import '@fontsource/lora/latin-400-italic.css';
import '@fontsource/lora/latin-ext-400-italic.css';
import '@fontsource/lora/latin-ext-700.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/inter/latin-ext-400.css';
import '@fontsource/inter/latin-ext-500.css';
import '@fontsource/inter/latin-ext-600.css';
import '@fontsource/lora/latin-ext-400.css';
import '@fontsource/lora/latin-ext-500.css';
import '@fontsource/jetbrains-mono/latin-ext-400.css';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import Placeholder from '@tiptap/extension-placeholder';
import { TableKit } from '@tiptap/extension-table';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import { createIcons, icons } from 'lucide';
import { countWords, duration, Flow } from './metrics.js';
import { shellHTML, settingsHTML } from './views.js';
export const $ = s => document.querySelector(s);
export const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const icon = n => '<i data-lucide="' + n + '"></i>';
export const btn = (id, n, label, cls = '') => '<button id="' + id + '" class="icon-button ' + cls + '" title="' + label + '" aria-label="' + label + '">' + icon(n) + '</button>';
export function drawIcons() { createIcons({ icons, attrs: { 'stroke-width': 1.65 } }); }
let settings, stats, project, doc, editor, source = false, loading = false, dirty = false, saveTimer, revision = 0;
let flow = new Flow(), flowEnabled = false, flowStarted = false, targetReached = false, lastActivity = -Infinity;
let wordsPending = 0, secondsPending = 0, previousWords = 0, typed = false, audio;
let saveChain = Promise.resolve(), statsChain = Promise.resolve(), settingsChain = Promise.resolve(), settingsTab = 'appearance';
const folders = new Set();
async function api(name, ...args) { const r = await window.akis.call(name, ...args); if (!r.ok) throw new Error(r.error); return r.value; }
function toast(message, error = false) {
  $('#toast').textContent = message; $('#toast').classList.toggle('error', error); $('#toast').classList.add('visible');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').classList.remove('visible'), error ? 10000 : 4000);
}
const run = fn => Promise.resolve().then(fn).catch(e => toast(e.message, true));
function raw() { return source ? $('#source-editor').value : editor.getMarkdown(); }
function text() { return source ? $('#source-editor').value.replace(/[#*_~\x60>|[\]()-]/g, ' ') : editor.getText(); }
function counts() {
  const t = text(), n = countWords(t);
  $('#word-count').textContent = n.toLocaleString('tr');
  $('#char-count').textContent = t.length.toLocaleString('tr') + ' karakter';
  $('#reading-time').textContent = Math.max(1, Math.ceil(n / 200)) + ' dk okuma';
  return n;
}
function changed() {
  if (loading) return;
  revision++; dirty = true; $('#save-state').textContent = 'Kaydediliyor…'; $('#save-state').className = 'pending';
  const n = counts(); if (typed) { wordsPending += Math.max(0, n - previousWords); typed = false; }
  previousWords = n;
  try { localStorage.setItem('recovery:' + doc.path, JSON.stringify({ content: raw(), original: doc.original })); } catch { toast('Kurtarma önbelleği dolu. Disk kaydı devam ediyor.', true); }
  clearTimeout(saveTimer); saveTimer = setTimeout(() => run(flush), 450);
}
async function flush() {
  clearTimeout(saveTimer); if (!dirty) { await saveChain; return; }
  const file = doc.path, content = raw(), snapshot = revision;
  saveChain = saveChain.catch(() => {}).then(() => api('save', file, content));
  try {
    await saveChain;
    if (snapshot === revision && file === doc.path) { dirty = false; doc.original = content; localStorage.removeItem('recovery:' + file); $('#save-state').textContent = 'Kaydedildi'; $('#save-state').className = ''; }
  } catch (e) { $('#save-state').textContent = 'Kayıt bekliyor'; $('#save-state').className = 'failed'; throw e; }
}
const special = s => /^(?:---|\+\+\+)\r?\n/.test(s) || /^\[\^[^\]]+\]:|^:::|<script|<style/im.test(s);
async function loadDoc(next) {
  if (!next) return;
  loading = true; doc = { ...next, original: next.content }; source = false;
  editor.commands.setContent(next.content, { contentType: 'markdown', emitUpdate: false });
  $('#document-name').textContent = next.name.replace(/\.(md|markdown|mdown)$/i, ''); $('#document-name').title = next.path;
  document.title = $('#document-name').textContent + ' — Akış'; revision++; dirty = false;
  $('#save-state').textContent = 'Kaydedildi'; $('#save-state').className = '';
  let recovery; try { recovery = JSON.parse(localStorage.getItem('recovery:' + next.path)); } catch {}
  if (special(next.content)) { source = true; $('#source-editor').value = next.content; toast('Özel Markdown sözdizimi kaynak görünümünde korunuyor.'); }
  if (recovery && recovery.content !== next.content) {
    source = true; $('#source-editor').value = recovery.content; dirty = true;
    toast('Önceki oturumdaki yazın kurtarıldı.');
    if (recovery.original !== next.content) toast('Dosya dışarıda değişmiş. Kurtarılan yazını kopya olarak dışa aktar.', true);
    else saveTimer = setTimeout(() => run(flush), 500);
  }
  $('#source-editor').hidden = !source; $('#editor').hidden = source; $('#source-button').classList.toggle('selected', source);
  loading = false; previousWords = counts(); renderTree(); $('#writing-scroll').scrollTop = 0;
}
function renderTree() {
  $('#project-name').textContent = project.name;
  const query = $('#file-search').value.toLocaleLowerCase('tr');
  const render = (entries, depth = 0) => entries.map(e => {
    if (e.children) {
      const children = render(e.children, depth + 1); if (!children) return '';
      const expanded = query || folders.has(e.path);
      return '<button class="tree-folder" data-folder="' + esc(e.path) + '" style="padding-left:' + (12 + depth * 14) + 'px">' + icon(expanded ? 'chevron-down' : 'chevron-right') + icon('folder') + '<span>' + esc(e.name) + '</span></button><div ' + (expanded ? '' : 'hidden') + '>' + children + '</div>';
    }
    if (query && !e.name.toLocaleLowerCase('tr').includes(query)) return '';
    return '<button class="tree-file ' + (doc?.path === e.path ? 'active' : '') + '" data-path="' + esc(e.path) + '" style="padding-left:' + (14 + depth * 14) + 'px">' + icon('file-text') + '<span>' + esc(e.name.replace(/\.(md|markdown|mdown)$/i, '')) + '</span>' + (doc?.path === e.path ? '<span class="file-dot"></span>' : '') + '</button>';
  }).join('');
  $('#file-tree').innerHTML = render(project.entries) || '<p class="empty">Burada henüz bir yazı yok.<br>Yeni bir yazıyla başla.</p>'; drawIcons();
}
function applySettings() {
  const themes = { paper: ['#f6f4ee', '#2e3430', '#747a70'], sage: ['#e7ede5', '#29392d', '#657366'], sand: ['#f2e6d7', '#4a3e33', '#887564'], night: ['#202824', '#dbe3d9', '#93a293'], custom: [settings.customColor, '#2e3430', '#667168'] };
  let [bg, ink, muted] = themes[settings.theme] || themes.paper;
  if (settings.theme === 'custom') {
    bg = /^#[0-9a-f]{6}$/i.test(bg) ? bg : '#ece7df';
    const rgb = [1, 3, 5].map(i => parseInt(bg.slice(i, i + 2), 16));
    const dark = rgb[0] * .299 + rgb[1] * .587 + rgb[2] * .114 < 130;
    ink = dark ? '#eef0e8' : '#2e3430'; muted = dark ? '#b5c0b2' : '#667168';
  }
  const style = document.documentElement.style;
  style.setProperty('--paper', bg); style.setProperty('--ink', ink); style.setProperty('--muted', muted);
  style.setProperty('--writing-font', ({ lora: '"Lora", Georgia, serif', inter: '"Inter", sans-serif', mono: '"JetBrains Mono", monospace', georgia: 'Georgia, serif', system: 'system-ui, sans-serif' })[settings.font] || 'Georgia, serif');
  style.setProperty('--writing-size', settings.fontSize + 'px'); style.setProperty('--writing-line', settings.lineHeight); style.setProperty('--writing-width', settings.width + 'px');
  $('#writing-scroll').style.backgroundImage = settings.background ? 'linear-gradient(color-mix(in srgb, var(--paper) 88%, transparent), color-mix(in srgb, var(--paper) 88%, transparent)), url("' + settings.background + '")' : '';
  document.body.classList.toggle('night', settings.theme === 'night'); flow.gap = settings.gap;
}
function saveSettings() { applySettings(); const snapshot = { ...settings }; settingsChain = settingsChain.catch(() => {}).then(() => api('settings', snapshot)); run(() => settingsChain); }
function sound(enter = false) {
  if (settings.sound === 'off') return;
  try {
    audio ||= new AudioContext(); if (audio.state === 'suspended') audio.resume();
    const now = audio.currentTime, gain = audio.createGain(), osc = audio.createOscillator(), soft = settings.sound === 'soft';
    osc.type = soft ? 'sine' : 'triangle'; osc.frequency.setValueAtTime(enter ? 480 : soft ? 150 + Math.random() * 70 : 650 + Math.random() * 350, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + .04); gain.gain.setValueAtTime(settings.volume * (soft ? .09 : .15), now); gain.gain.exponentialRampToValueAtTime(.001, now + .055);
    osc.connect(gain); gain.connect(audio.destination); osc.start(now); osc.stop(now + .06);
    if (!soft) {
      const b = audio.createBuffer(1, audio.sampleRate * .025, audio.sampleRate), a = b.getChannelData(0);
      for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / a.length);
      const noise = audio.createBufferSource(); noise.buffer = b; const ng = audio.createGain(); ng.gain.value = settings.volume * .11; noise.connect(ng); ng.connect(audio.destination); noise.start();
    }
  } catch {}
}
function stroke(e) {
  if (!e.inputType?.startsWith('insert') || /Paste|Drop|Replacement/.test(e.inputType)) { typed = false; return; }
  typed = true; lastActivity = performance.now(); sound(e.inputType.includes('Paragraph'));
  if (flowEnabled) {
    flow.stroke(performance.now());
    if (!flowStarted) { flowStarted = true; run(async () => stats = await api('stats', { session: true })); }
  }
}
function flowUI() {
  const now = performance.now(), active = flow.start !== null; flow.tick(now);
  if (active && flow.start === null) { flowStarted = false; targetReached = false; toast('Küçük bir mola. Yeni bir kelimeyle akış yeniden başlar.'); run(flushStats); }
  const sec = flow.seconds(); $('#flow-time').textContent = duration(sec); $('#footer-flow span').textContent = flowEnabled ? duration(sec) + ' akış' : 'Akış bekliyor';
  if (flowEnabled) {
    $('#flow-gap').textContent = flow.last === null ? settings.gap + ' sn mola sınırı' : Math.ceil(Math.max(0, settings.gap - (now - flow.last) / 1000)) + ' sn mola payı';
    $('#flow-message').textContent = flow.start === null ? 'İlk kelimenle başlar. Kendini düzenlemeden yaz.' : 'Düşünceyi takip et. Hedefin ' + settings.goal + ' dakika.';
    if (!targetReached && sec >= settings.goal * 60) { targetReached = true; toast('Hedefine ulaştın! İstersen devam et.'); }
  }
}
function toggleFlow() {
  flowEnabled = !flowEnabled; $('#flow-banner').hidden = !flowEnabled; $('#start-flow').classList.toggle('running', flowEnabled);
  $('#start-flow span').textContent = flowEnabled ? 'Akışı bitir' : 'Akışa başla';
  if (!flowEnabled) { flow.finish(); flowStarted = false; run(flushStats); } else { targetReached = false; (source ? $('#source-editor') : editor.view.dom).focus(); }
  flowUI();
}
function flushStats() {
  const payload = { words: wordsPending, seconds: secondsPending, best: flow.best }; wordsPending = secondsPending = 0;
  statsChain = statsChain.catch(() => {}).then(async () => {
    try { stats = await api('stats', payload); } catch (e) { wordsPending += payload.words; secondsPending += payload.seconds; throw e; }
  }); return statsChain;
}
function focusMode() { document.body.classList.toggle('focused'); $('#leave-focus').hidden = !document.body.classList.contains('focused'); }
function toggleSource() {
  if (source) { if (special($('#source-editor').value)) return toast('Özel sözdizimini korumak için kaynak görünümünü kullan.', true); loading = true; editor.commands.setContent($('#source-editor').value, { contentType: 'markdown', emitUpdate: false }); loading = false; }
  else $('#source-editor').value = dirty ? editor.getMarkdown() : doc.original;
  source = !source; $('#source-editor').hidden = !source; $('#editor').hidden = source; $('#source-button').classList.toggle('selected', source); previousWords = counts(); (source ? $('#source-editor') : editor.view.dom).focus();
}
function inputDialog(title, value, action, label = 'Devam et') {
  const d = $('#input-dialog');
  d.innerHTML = '<form method="dialog"><div class="modal-heading"><h2>' + esc(title) + '</h2><button value="cancel" class="icon-button" aria-label="Kapat">' + icon('x') + '</button></div><input id="dialog-value" aria-label="Dosya adı veya arama ifadesi" value="' + esc(value) + '" autocomplete="off" required><p id="dialog-error" role="alert" style="color:#986453;font-size:12px"></p><div class="input-actions"><button value="cancel" formnovalidate>Vazgeç</button><button class="primary" value="confirm">' + label + '</button></div></form>';
  drawIcons(); d.showModal(); $('#dialog-value').select();
  d.querySelector('form').onsubmit = e => { if (e.submitter.value === 'confirm') { e.preventDefault(); const val = $('#dialog-value').value; run(async () => { try { await action(val); d.close(); } catch (err) { document.getElementById("dialog-error").textContent = err.message; } }); } };
}
async function newNote() { await flush(); inputDialog('Yeni bir düşünce', 'Yeni yazı', async name => { const r = await api('new', name); project = r.tree; await loadDoc(r.doc); editor.commands.focus(); }, 'Oluştur'); }
function format(fn) { if (source) return toast('Biçimlendirme için görsel editöre geç.'); fn(editor.chain().focus()).run(); }
function renderSettings(tab = settingsTab) { settingsTab = tab; $('#settings-dialog').innerHTML = settingsHTML(tab, settings, stats); drawIcons(); }
async function openSettings(tab = 'appearance') { await flushStats(); renderSettings(tab); $('#settings-dialog').showModal(); }
const LocalImage = Image.extend({
  addNodeView() {
    return ({ node }) => {
      const img = document.createElement('img');
      const update = next => {
        if (next.type.name !== 'image') return false;
        img.alt = next.attrs.alt || ''; img.title = next.attrs.title || '';
        const src = next.attrs.src || '';
        if (/^(https:|data:image\/)/i.test(src)) img.src = src;
        else if (src && doc) api('image', doc.path, src).then(value => img.src = value).catch(() => { img.removeAttribute('src'); img.alt = next.attrs.alt || 'Görsel bulunamadı'; });
        return true;
      };
      update(node); return { dom: img, update };
    };
  }
});

async function start() {
  $('#app').innerHTML = shellHTML(); drawIcons();
  if (!window.akis) return toast('Masaüstü uygulamasını npm run dev ile başlat.', true);
  const init = await api('boot'); settings = init.settings; stats = init.stats; project = init.tree; flow.gap = settings.gap;
  editor = new Editor({
    element: $('#editor'), extensions: [StarterKit.configure({ link: { openOnClick: false } }), Markdown.configure({ markedOptions: { gfm: true } }), TableKit, TaskList, TaskItem.configure({ nested: true }), LocalImage, Placeholder.configure({ placeholder: 'Bir düşünceyle başla…' })],
    content: '', contentType: 'markdown',
    editorProps: { attributes: { spellcheck: 'true', 'aria-label': 'Yazı editörü', role: 'textbox', 'aria-multiline': 'true' }, handleDOMEvents: { beforeinput: (_v, e) => { stroke(e); return false; }, paste: () => { typed = false; return false; }, drop: () => { typed = false; return false; } } },
    onUpdate: changed, onSelectionUpdate: () => {
      for (const [id, type] of [['bold', 'bold'], ['italic', 'italic'], ['heading', 'heading'], ['list', 'bulletList'], ['quote', 'blockquote']]) $('#' + id).classList.toggle('selected', editor.isActive(type));
      if (settings.typewriter && document.activeElement === editor.view.dom) {
        const c = editor.view.coordsAtPos(editor.state.selection.head), s = $('#writing-scroll'), r = s.getBoundingClientRect(); s.scrollBy({ top: c.top - r.top - r.height * .44, behavior: 'smooth' });
      }
    }
  });
  applySettings(); await loadDoc(init.doc);
  $('#source-editor').addEventListener('beforeinput', stroke); $('#source-editor').addEventListener('input', changed);
  $('#file-tree').onclick = e => { const folder = e.target.closest('[data-folder]'), file = e.target.closest('[data-path]'); if (folder) { const p = folder.dataset.folder; folders.has(p) ? folders.delete(p) : folders.add(p); renderTree(); } if (file) run(async () => { await flush(); await loadDoc(await api('open', file.dataset.path)); }); };
  $('#file-search').oninput = renderTree;
  $('#new-note').onclick = () => run(newNote);
  $('#open-file').onclick = () => run(async () => { await flush(); await loadDoc(await api('choose-file')); });
  $('#folder-open').onclick = () => run(async () => { await flush(); const t = await api('choose-folder'); if (t) { project = t; renderTree(); } });
  $('#my-notes').onclick = () => run(async () => { project = await api('notes'); renderTree(); });
  $('#refresh').onclick = () => run(async () => { project = await api('tree'); renderTree(); });
  $('#hide-sidebar').onclick = () => document.body.classList.add('sidebar-hidden'); $('#show-sidebar').onclick = () => document.body.classList.remove('sidebar-hidden');
  $('#document-name').onclick = () => run(async () => { await flush(); inputDialog('Yazının adı', doc.name, async name => { const r = await api('rename', doc.path, name); project = r.tree; await loadDoc(r.doc); }, 'Adını değiştir'); });
  $('#export-button').onclick = () => run(async () => { if (await api('export', dirty ? raw() : doc.original)) toast('Markdown kopyası dışa aktarıldı.'); });
  $('#source-button').onclick = toggleSource; $('#focus-button').onclick = focusMode; $('#leave-focus').onclick = focusMode; $('#fullscreen-button').onclick = () => run(() => api('fullscreen'));
  $('#start-flow').onclick = toggleFlow; $('#stop-flow').onclick = toggleFlow;
  $('#settings-button').onclick = () => run(() => openSettings()); $('#word-stats').onclick = () => run(() => openSettings('stats'));
  $('#bold').onclick = () => format(c => c.toggleBold()); $('#italic').onclick = () => format(c => c.toggleItalic()); $('#heading').onclick = () => format(c => c.toggleHeading({ level: 2 })); $('#list').onclick = () => format(c => c.toggleBulletList()); $('#quote').onclick = () => format(c => c.toggleBlockquote());
  $('#link').onclick = () => inputDialog('Bağlantı adresi', 'https://', async url => { if (!/^https?:\/\//i.test(url)) throw new Error('http veya https adresi kullan.'); format(c => c.extendMarkRange('link').setLink({ href: url })); }, 'Ekle');
  $('#settings-dialog').onclick = e => {
    const tab = e.target.closest('[data-tab]'), theme = e.target.closest('[data-theme]'), id = e.target.closest('button')?.id;
    if (tab) renderSettings(tab.dataset.tab); if (theme) { settings.theme = theme.dataset.theme; saveSettings(); renderSettings('appearance'); }
    if (id === 'close-settings') $('#settings-dialog').close();
    if (id === 'choose-background') run(async () => { const image = await api('background'); if (image) { settings.background = image; applySettings(); toast('Arka planın hazır.'); } });
    if (id === 'clear-background') { settings.background = ''; saveSettings(); toast('Arka plan kaldırıldı.'); }
    if (id === 'reload-doc') run(async () => {
      if (dirty) { const target = await api('export', raw()); if (!target) return; }
      localStorage.removeItem('recovery:' + doc.path); dirty = false; saveChain = Promise.resolve();
      await loadDoc(await api('open', doc.path)); toast('Diskteki sürüm yeniden açıldı.');
    });

    if (id === 'show-data') run(() => api('backups')); if (id === 'reveal-doc') run(() => api('reveal', doc.path));
  };
  $('#settings-dialog').oninput = e => {
    const key = ({ 'custom-color': 'customColor', 'font-select': 'font', 'font-size': 'fontSize', 'line-height': 'lineHeight', 'paper-width': 'width', 'gap-select': 'gap', 'goal-select': 'goal', 'sound-select': 'sound', volume: 'volume', typewriter: 'typewriter' })[e.target.id]; if (!key) return;
    settings[key] = e.target.type === 'checkbox' ? e.target.checked : ['fontSize', 'lineHeight', 'width', 'gap', 'goal', 'volume'].includes(key) ? Number(e.target.value) : e.target.value;
    if (key === 'customColor') settings.theme = 'custom'; if (key === 'gap') { flow.finish(); flowStarted = false; } saveSettings();
    if (key === 'fontSize') $('#font-size-value').textContent = settings.fontSize + ' px'; if (key === 'sound') sound();
  };
  document.addEventListener('click', e => { const link = e.target.closest('#editor a'); if (link) { e.preventDefault(); if (e.ctrlKey || e.metaKey) run(() => api('open-url', link.href)); } });
  document.addEventListener('keydown', e => {
    const mod = e.ctrlKey || e.metaKey, dialog = $('#settings-dialog').open || $('#input-dialog').open, key = e.key.toLowerCase();
    if (e.key === 'F11') { e.preventDefault(); run(() => api('fullscreen')); return; }
    if (e.key === 'Escape' && document.body.classList.contains('focused') && !dialog) focusMode();
    if (!mod || dialog) return;
    if (key === 'n') { e.preventDefault(); run(newNote); }
    if (key === 'o') { e.preventDefault(); (e.shiftKey ? $('#folder-open') : $('#open-file')).click(); }
    if (key === 's') { e.preventDefault(); run(flush); }
    if (e.shiftKey && key === 'f') { e.preventDefault(); focusMode(); }
    if (e.shiftKey && key === 'm') { e.preventDefault(); toggleSource(); }
    if (key === 'f' && !e.shiftKey) { e.preventDefault(); inputDialog('Yazıda bul', '', async term => {
      if (source) { const p = $('#source-editor').value.toLocaleLowerCase('tr').indexOf(term.toLocaleLowerCase('tr')); if (p < 0) throw new Error('Bu ifade bulunamadı.'); $('#input-dialog').close(); $('#source-editor').focus(); $('#source-editor').setSelectionRange(p, p + term.length); }
      else { let found = false; editor.state.doc.descendants((node, pos) => { if (found || !node.isText) return; const i = node.text.toLocaleLowerCase('tr').indexOf(term.toLocaleLowerCase('tr')); if (i >= 0) { editor.chain().focus().setTextSelection({ from: pos + i, to: pos + i + term.length }).scrollIntoView().run(); found = true; } }); if (!found) throw new Error('Bu ifade bulunamadı.'); }
    }, 'Bul'); }
  });
  window.akis.on('open-file', file => run(async () => { await flush(); await loadDoc(await api('open-external', file)); }));
  window.akis.on('prepare-close', () => run(async () => { flow.finish(); await flush(); await flushStats(); await settingsChain; await api('close-ready'); }));
  setInterval(() => { flowUI(); if (document.hasFocus() && performance.now() - lastActivity < 5000) secondsPending++; }, 1000);
  setInterval(() => run(flushStats), 15000);
}
run(start);





