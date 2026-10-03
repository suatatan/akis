import { _electron as electron, expect } from 'playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const data = await fs.mkdtemp(path.join(os.tmpdir(), 'akis-desktop-'));
const out = path.resolve('test-results'); await fs.mkdir(out,{recursive:true});
let app, page;
async function launch() {
  app = await electron.launch({ args: ['.'], env: { ...process.env, AKIS_TEST:'1', AKIS_DATA_DIR:data } });
  page = await app.firstWindow();
  page.on('pageerror', e => { console.error(e); errors.push(e.message); });
  await page.waitForSelector('.tiptap');
}
const errors=[];
try {
  await launch();
  await expect(page.locator('#document-name')).toHaveText('Hoş geldin');
  await page.screenshot({path:path.join(out,'editor.png')});
  await page.click('#new-note'); await page.fill('#dialog-value','Test yazısı'); await page.click('button[value=confirm]');
  await page.locator('.tiptap').click();
  await page.keyboard.type('Bir dusunce yeni bir yol acar. ',{delay:50});
  await expect(page.locator('#save-state')).toHaveText('Kaydedildi');
  const file=path.join(data,'notes','Test yazısı.md');
  if (!(await fs.readFile(file,'utf8')).includes('Bir dusunce')) throw new Error('Autosave failed');
  await page.click('#source-button'); await expect(page.locator('#source-editor')).toBeVisible();
  await page.locator('#source-editor').fill('# Başlık\n\n**Kalın** ve *italik*.\n\n- [x] Görev\n\n| A | B |\n| --- | --- |\n| 1 | 2 |');
  await expect(page.locator('#save-state')).toHaveText('Kaydedildi');
  await page.click('#source-button'); await expect(page.locator('.tiptap h1')).toHaveText('Başlık');
  await expect(page.locator('.tiptap table')).toBeVisible(); await expect(page.locator('.tiptap input[type=checkbox]')).toBeChecked();
  await page.click('#settings-button'); await page.click('[data-theme=night]');
  await expect(page.locator('body')).toHaveClass(/night/);
  await page.selectOption('#font-select','mono'); await page.click('[data-tab=writing]');
  await page.selectOption('#gap-select','3'); await page.selectOption('#sound-select','soft');
  await page.click('[data-tab=stats]'); await page.screenshot({path:path.join(out,'statistics.png')});
  await page.click('#close-settings'); await page.click('#start-flow'); await page.locator('.tiptap').click(); await page.keyboard.press('Control+End');
  await page.keyboard.type(' Akis devam eder',{delay:300}); await page.waitForTimeout(1000);
  await expect(page.locator('#flow-time')).not.toHaveText('00:00');
  await page.waitForTimeout(3500); await expect(page.locator('#flow-time')).toHaveText('00:00');
  await page.click('#stop-flow'); await page.click('#focus-button'); await expect(page.locator('body')).toHaveClass(/focused/);
  await page.click('#leave-focus'); await page.keyboard.press('F11'); await page.waitForTimeout(400);
  if (!(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isFullScreen()))) throw new Error('Fullscreen failed');
  await page.keyboard.press('F11');
  await page.locator('.tiptap').click(); await page.keyboard.press('Control+End'); await page.keyboard.type(' kapanis testi');
  // Close through the native window so the renderer's pending save is flushed.
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  await app.waitForEvent('close');
  if (!(await fs.readFile(file,'utf8')).includes('kapanis testi')) throw new Error('Close flush failed');
  await launch(); await expect(page.locator('#document-name')).toHaveText('Test yazısı'); await expect(page.locator('body')).toHaveClass(/night/);
  if (!(await page.locator('.tiptap').innerText()).includes('kapanis testi')) throw new Error('Persistence failed');
  // Use native-dialog stubs to exercise the actual project IPC and sidebar.
  const folder=path.join(data,'project'), nested=path.join(folder,'chapters');
  await fs.mkdir(nested,{recursive:true});
  await fs.copyFile('build/icon.png',path.join(nested,'image.png'));
  await fs.writeFile(path.join(nested,'Bolum.md'),'# Bölüm\n\nProje yazısı.\n\n![Yerel görsel](image.png)');
  await app.evaluate(({dialog}, folder) => { dialog.showOpenDialog=async()=>({canceled:false,filePaths:[folder]}); },folder);
  await page.click('#folder-open'); await expect(page.locator('#project-name')).toHaveText('project');
  await page.click('[data-folder]'); await page.click('.tree-file');
  await expect(page.locator('.tiptap h1')).toHaveText('Bölüm');
  await expect(page.locator('.tiptap img')).toHaveAttribute('src',/^data:image/);
  await page.click('#new-note'); await page.fill('#dialog-value','Proje taslagi'); await page.click('button[value=confirm]');
  await page.locator('.tiptap').click(); await page.keyboard.type('Project autosave works.');
  await expect(page.locator('#save-state')).toHaveText('Kaydedildi');
  if (!(await fs.readFile(path.join(folder,'Proje taslagi.md'),'utf8')).includes('Project autosave')) throw new Error('Project save failed');
  await page.click('#document-name'); await page.fill('#dialog-value','Yeni ad'); await page.click('button[value=confirm]');
  await expect(page.locator('#document-name')).toHaveText('Yeni ad');
  if (!(await fs.stat(path.join(folder,'Yeni ad.md'))).isFile()) throw new Error('Rename failed');
  await page.click('#my-notes'); await page.click('.tree-file:has-text("Test yazısı")');
  await expect(page.locator('#document-name')).toHaveText('Test yazısı');

  // A third party change must survive autosave.
  await fs.writeFile(file,'External version','utf8');
  await page.locator('.tiptap').click(); await page.keyboard.press('Control+End'); await page.keyboard.type(' conflict');
  await expect(page.locator('#save-state')).toHaveText('Kayıt bekliyor');
  if ((await fs.readFile(file,'utf8'))!=='External version') throw new Error('External change overwritten');
  const recovery=await fs.readdir(path.join(data,'recovery')); if (!recovery.length) throw new Error('Recovery missing');
  await app.evaluate(({dialog}, file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});},file);
  await page.click('#export-button');
  await expect(page.locator('#toast')).toContainText('farklı bir dosya adıyla');
  if ((await fs.readFile(file,'utf8'))!=='External version') throw new Error('Export overwrote open conflicting file');
  const copy=path.join(data,'Recovered.md');
  await app.evaluate(({dialog}, file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});},copy);
  await page.click('#settings-button'); await page.click('[data-tab=about]'); await page.click('#reload-doc');
  await expect(page.locator('.tiptap')).toContainText('External version');
  if (!(await fs.readFile(copy,'utf8')).includes('conflict')) throw new Error('Conflict copy missing');
  await page.click('#close-settings');

  if(errors.length) throw new Error('Renderer errors: '+errors.join(','));
  console.log('PASS: autosave, Markdown, tables, tasks, settings, flow, focus, fullscreen, close flush, persistence, conflict recovery');
} finally {
  if(app) { await app.evaluate(({app})=>app.exit(0)).catch(()=>{}); }
  await fs.rm(data,{recursive:true,force:true,maxRetries:10,retryDelay:300});
}




