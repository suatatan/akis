import { _electron as electron, expect } from 'playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const data=await fs.mkdtemp(path.join(os.tmpdir(),'akis-packaged-'));
const file=path.join(data,'Disaridan.md'); await fs.writeFile(file,'# Dışarıdan açıldı\n\nPaket testi.');
let app;
try {
  app=await electron.launch({executablePath:path.resolve('release/win-unpacked/Akis.exe'),args:[file],env:{...process.env,AKIS_DATA_DIR:path.join(data,'profile'),AKIS_TEST:'1'}});
  const page=await app.firstWindow(); await page.waitForSelector('.tiptap');
  await expect(page.locator('#document-name')).toHaveText('Disaridan');
  await expect(page.locator('.tiptap h1')).toHaveText('Dışarıdan açıldı');
  await page.locator('.tiptap').click(); await page.keyboard.press('Control+End'); await page.keyboard.type(' executable works.');
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].close()); await app.waitForEvent('close');
  if(!(await fs.readFile(file,'utf8')).includes('executable works')) throw new Error('Packaged autosave failed');
  console.log('PASS: packaged Akis.exe, command-line Markdown open, editing, close autosave');
} finally {
  if(app) await app.evaluate(({app})=>app.exit(0)).catch(()=>{});
  await fs.rm(data,{recursive:true,force:true,maxRetries:10,retryDelay:300});
}

