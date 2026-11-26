#!/usr/bin/env node
/**
 * Best-effort PNG capture of a proposal preview page.
 *
 * Usage:
 *   node scripts/shot.mjs <preview.html> <out.png>
 *
 * Probes for an installed Chrome/Edge (headless) on the current platform and
 * skips silently when none is found or capture fails — the preview page is
 * the primary artifact, the PNG is a convenience.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const [html, png] = process.argv.slice(2);
if (!html || !png) {
  console.error('用法：node scripts/shot.mjs <preview.html> <out.png>');
  process.exit(2);
}
if (!fs.existsSync(html)) {
  console.error(`HTML 不存在：${html}`);
  process.exit(2);
}

const candidates = process.platform === 'win32'
  ? [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    ]
  : process.platform === 'darwin'
    ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']
    : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'];

const browser = candidates.find(p => fs.existsSync(p));
if (!browser) {
  console.error('SHOT_SKIP 未找到 Chrome/Edge，跳过截图（preview.html 仍可使用）。');
  process.exit(0);
}

const url = 'file://' + path.resolve(html).replace(/\\/g, '/');
const r = spawnSync(browser, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--window-size=1280,900',
  '--screenshot=' + path.resolve(png),
  url,
], { encoding: 'utf8', timeout: 60000 });

if (r.status !== 0 || !fs.existsSync(png)) {
  console.error('SHOT_SKIP 截图失败（headless 不可用），preview.html 仍可使用。');
  process.exit(0);
}
console.log(`SHOT_OK ${path.resolve(png)}`);
process.exit(0);