import { chromium, expect } from 'playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('docs'), mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname === '/' ? '/index.html' : new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep))throw new Error('Forbidden');
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));
}catch{res.statusCode=404;res.end('Not found');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
  browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1050},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://api.github.com/repos/suatatan/akis/releases/latest',route=>route.fulfill({json:{tag_name:'v0.1.0',draft:false,prerelease:false,assets:[
    {name:'Akis-0.1.0-x64-setup.exe',browser_download_url:'https://github.com/suatatan/akis/releases/download/v0.1.0/Akis-0.1.0-x64-setup.exe'},
    {name:'Akis-0.1.0-x64-portable.exe',browser_download_url:'https://github.com/suatatan/akis/releases/download/v0.1.0/Akis-0.1.0-x64-portable.exe'}]}}));
  await page.goto('http://127.0.0.1:'+server.address().port);await page.evaluate(()=>document.fonts.ready);
  await expect(page.locator('h1')).toContainText('Düşüncelerine');
  await expect(page.locator('.download-windows').first()).toHaveAttribute('href',/x64-setup.exe$/);
  await page.locator('.stats-image').scrollIntoViewIfNeeded(); await expect.poll(()=>page.evaluate(()=>Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0))).toBe(true); await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:'test-results/site-desktop.png',fullPage:true});
  await page.locator('#demo-text').fill('');
  await page.locator('#demo-text').pressSequentially('Dusunce akisi devam eder.',{delay:110});
  await expect(page.locator('#demo-words')).toHaveText('4 kelime');
  await expect(page.locator('#demo-time')).not.toHaveText('00:00');
  await page.waitForTimeout(10700);await expect(page.locator('#demo-time')).toHaveText('00:00');
  await expect(page.locator('#demo-text')).toHaveValue('Dusunce akisi devam eder.');
  await page.click('[data-demo-theme=night]');await expect(page.locator('#demo')).toHaveAttribute('data-theme','night');
  await page.click('#reset-demo');await expect(page.locator('#demo-words')).toHaveText('0 kelime');
  await page.locator('details').first().locator('summary').click();await expect(page.locator('details').first()).toHaveAttribute('open','');
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:'+server.address().port);await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:'test-results/site-mobile.png',fullPage:true});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Mobile overflow');
  if(errors.length)throw new Error(errors.join(','));
  console.log('PASS: desktop/mobile layout, images/fonts, release links, live flow counter, pause reset, text retention, themes, FAQ.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}


