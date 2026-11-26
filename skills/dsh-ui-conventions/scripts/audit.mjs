#!/usr/bin/env node
/**
 * Read-only audit for DSH plugin UI conventions.
 *
 * Usage:
 *   node skills/dsh-ui-conventions/scripts/audit.mjs <plugin-repo-root>
 *
 * Only files that actually mention `sidebar.footer.action` are inspected. The
 * seat rules match within ~400 chars of that mention so the report stays about
 * the footer seat instead of every `width:100%` in the repo; the icon rules
 * (§15) inspect the whole of such files because icon definitions usually live
 * in the rendering component, far from the slot registration.
 * Nothing is written and nothing from the target is executed.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const SKIP = new Set(['node_modules', '.git', 'coverage', '.next', 'out', 'dist']);
const EXT = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.css', '.scss']);
const SLOT = 'sidebar.footer.action';

const RULES = [
  { id: 'FLEX_WRAP', re: /flex-wrap\s*:\s*wrap|flexWrap\s*=\s*['"]wrap['"]/, msg: '给宿主行开 wrap（应由宿主决定）' },
  { id: 'HOST_MUTATION', re: /:has\(/, msg: '用 :has() 选择/改造宿主行' },
  { id: 'ORDER_OVERRIDE', re: /order\s*:\s*(?:-1|2147483647)\b/, msg: '用极端 order 抢位置（-1 / 2147483647）' },
  { id: 'RADIUS_50', re: /border-radius\s*:\s*50%/, msg: '圆形按钮（约定为 12px 圆角）' },
  { id: 'WIDTH_100', re: /width\s*:\s*100%/, msg: 'width:100%（仅独占时允许）' },
  { id: 'ONLY_CHILD', re: /:only-child|:not\(\s*\.is-rail\s*\)/, msg: '用 :only-child 判定容量（应用 count + rowWidth）' },
  /*
   * 图标三条规则（§15）：图标定义常在渲染组件里、离 slot 提及点超过 400 字符，
   * 故整文件匹配。仅对注册了 footer slot 的插件生效，不会扫到无关仓库。
   */
  { id: 'ICON_OVERSIZE', wholeFile: true, re: /\.[\w-]*(?:sidebar|footer|rail)[\w-]*[^{}]*\.[\w-]*(?:icon|logo|bird|glyph|mark)[\w-]*\s*\{[^}]*\b(?:width|height)\s*:\s*(?:20|[2-9]\d|3[0-5])\s*px|<svg[^>]*\b(?:width|height)\s*=\s*["'](?:2[0-9]|[3-9]\d|\d{3,})["'][^>]*>/, msg: '图标渲染尺寸超限（图标态应为 18px，文字态 16px；20px 及以上需 §15 品牌例外）' },
  { id: 'ICON_FILL_HEX', wholeFile: true, re: /<svg[^>]*\b(?:fill|stroke)\s*=\s*["']#[0-9a-fA-F]{3,8}\b/, msg: 'SVG 写死颜色（§15：fill/stroke 应只用 currentColor）' },
  { id: 'ICON_VIEWBOX_DRIFT', wholeFile: true, re: /viewBox\s*[:=]\s*["']0 0 (?:[4-9]\d|\d{3,}) (?:[4-9]\d|\d{3,})["']/, msg: 'viewBox 非 16×16 网格（44/1024 等旧资产；§15 品牌 logo 例外须注释声明）' },
];

function* walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP.has(entry.name)) continue;
      yield* walk(path.join(dir, entry.name));
    } else if (EXT.has(path.extname(entry.name))) {
      yield path.join(dir, entry.name);
    }
  }
}

const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;

let hasSlot = false;
const findings = [];

for (const file of walk(root)) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
  const mentions = [];
  let at = text.indexOf(SLOT);
  while (at !== -1) { mentions.push(at); at = text.indexOf(SLOT, at + 1); }
  if (!mentions.length) continue;
  hasSlot = true;

  for (const m of mentions) {
    const start = Math.max(0, m - 400);
    const end = Math.min(text.length, m + 400);
    const window = text.slice(start, end);
    for (const rule of RULES) {
      const hay = rule.wholeFile ? text : window;
      const base = rule.wholeFile ? 0 : start;
      const re = rule.wholeFile ? new RegExp(rule.re.source, 'g') : rule.re;
      let hit;
      while ((hit = re.exec(hay)) !== null) {
        const absolute = base + hit.index;
        const line = lineOf(text, absolute);
        const lineStart = text.lastIndexOf('\n', absolute) + 1;
        const lineEnd = text.indexOf('\n', absolute);
        const snippet = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd).trim().slice(0, 160);
        const key = `${file}:${line}:${rule.id}`;
        if (!findings.some(f => f.key === key)) {
          findings.push({ key, rule: rule.id, file: path.relative(root, file), line, msg: rule.msg, text: snippet });
        }
        if (!re.global) break;
      }
    }
  }
}

if (!hasSlot) {
  console.log(`NO_FOOTER_SLOT 这个仓库没有注册 ${SLOT}，不适用本约定（其它槽位只看 §00 原则）。`);
  process.exit(0);
}

const byRule = new Map();
for (const f of findings) byRule.set(f.rule, (byRule.get(f.rule) || 0) + 1);

console.log(`FOOTER_SLOT_FOUND 共 ${findings.length} 条告警`);
for (const [rule, count] of byRule) console.log(`- ${rule}: ${count}`);
for (const f of findings.slice(0, 40)) {
  console.log(`${f.file}:${f.line}  [${f.rule}] ${f.msg}\n    ${f.text}`);
}
if (findings.length > 40) console.log(`… 还有 ${findings.length - 40} 条，建议先修上面这些。`);
if (!findings.length) console.log('NO_FINDINGS 未发现已知反模式。');
