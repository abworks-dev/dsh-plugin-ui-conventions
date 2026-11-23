#!/usr/bin/env node
/**
 * Read-only audit for DSH plugin UI conventions.
 *
 * Usage:
 *   node skills/dsh-ui-conventions/scripts/audit.mjs <plugin-repo-root>
 *
 * Only files that actually mention `sidebar.footer.action` are inspected, and
 * only the code within ~400 chars of that mention is matched. This keeps the
 * report about the footer seat instead of every `width:100%` in the repo.
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
      const hit = rule.re.exec(window);
      if (!hit) continue;
      const absolute = start + hit.index;
      const line = lineOf(text, absolute);
      const lineStart = text.lastIndexOf('\n', absolute) + 1;
      const lineEnd = text.indexOf('\n', absolute);
      const snippet = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd).trim().slice(0, 160);
      const key = `${file}:${line}:${rule.id}`;
      if (!findings.some(f => f.key === key)) {
        findings.push({ key, rule: rule.id, file: path.relative(root, file), line, msg: rule.msg, text: snippet });
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
