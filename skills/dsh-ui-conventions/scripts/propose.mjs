#!/usr/bin/env node
/**
 * Read-only outreach proposal generator for the DSH plugin UI conventions.
 *
 * Purpose: prepare a complete, ready-to-send GitHub issue proposal for a
 * third-party DSH plugin that registers `sidebar.footer.action` but has not
 * adopted the community UI conventions yet. This script NEVER posts anything:
 * it inspects the target repository, writes a proposal package (issue draft +
 * a self-contained before/after preview page), and prints a manual checklist.
 * The actual `gh issue create` is an explicit human step.
 *
 * Usage:
 *   node skills/dsh-ui-conventions/scripts/propose.mjs <plugin-repo-root> [--out <dir>] [--owner <gh-user>]
 *
 * Options:
 *   --out <dir>    where the proposal package is written (default: ./out/<repo-name>)
 *   --owner <user> GitHub login of the person preparing the proposal, used to
 *                  determine "not my own plugin" (default: `gh api user`).
 *   --json         print a machine-readable summary at the end.
 *
 * Exit codes:
 *   0  proposal package written (or --dry-run: would write)
 *   1  not applicable (no `sidebar.footer.action` slot, already adopted, …)
 *   2  user error (missing args, unknown flags)
 *   3  environment error (git/gh/node missing or failing)
 *
 * The preview page is a single self-contained HTML file. It renders the target
 * plugin's footer entry "as-is" and "per §20 (or §25)", side by side, using the
 * host's geometry tokens, so the plugin author can eyeball the difference in a
 * browser without installing anything. To also produce a PNG (best-effort),
 * run `node scripts/shot.mjs <preview.html> <out.png>` afterwards; it probes
 * for an installed Chrome/Edge headless and skips silently when none is found.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.resolve(__dirname, '..');

const SLOT = 'sidebar.footer.action';
const CONVENTIONS_URL =
  'https://github.com/abworks-dev/dsh-plugin-ui-conventions';

// --- tiny helpers -----------------------------------------------------------

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, ...opts });
  if (r.error) {
    if (opts.optional) return null;
    fail(3, `[env] ${cmd} 不可用：${r.error.message}`);
  }
  if (r.status !== 0 && !opts.optional) {
    fail(3, `[env] ${cmd} ${args.join(' ')} 失败（exit ${r.status}）：${String(r.stderr || r.stdout).slice(0, 400)}`);
  }
  return r;
}

const gh = (args, opts = {}) => sh('gh', args, opts);

/** Resolve the plugin's GitHub repo from package.json / git remote. */
function detectRepo(root) {
  let pkg = null;
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  } catch { /* no package.json */ }

  let repoUrl = null;
  if (pkg?.repository) {
    if (typeof pkg.repository === 'string') repoUrl = pkg.repository;
    else if (typeof pkg.repository.url === 'string') repoUrl = pkg.repository.url;
  }
  if (!repoUrl && typeof pkg?.homepage === 'string' && /github\.com/.test(pkg.homepage)) {
    repoUrl = pkg.homepage;
  }
  if (!repoUrl) {
    const remote = sh('git', ['-C', root, 'remote', 'get-url', 'origin'], { optional: true });
    if (remote?.stdout?.trim()) repoUrl = remote.stdout.trim();
  }
  if (!repoUrl) return null;

  const m = String(repoUrl).match(
    /(?:github\.com[/:])?([^/]+)\/([^/.#\s]+?)(?:\.git)?(?:[#/].*)?$/,
  );
  return m ? `${m[1]}/${m[2]}` : null;
}

function detectMainBranchNames(repo) {
  const branches = gh(['api', `repos/${repo}/branches`, '--paginate', '--jq', '.[].name'], { optional: true });
  if (!branches?.stdout) return ['main', 'master'];
  return branches.stdout.trim().split('\n').filter(Boolean).slice(0, 20);
}

/** Find the file that registers the slot, first branch that has it wins. */
function* walk(root) {
  let entries;
  try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'out', 'coverage', '.next', 'build'].includes(e.name)) continue;
      yield* walk(path.join(root, e.name));
    } else if (/\.(js|mjs|cjs|ts|tsx|jsx|css|scss|json)$/.test(e.name)) {
      yield path.join(root, e.name);
    }
  }
}

function findRegistration(root) {
  for (const file of walk(root)) {
    let text;
    try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
    const at = text.indexOf(SLOT);
    if (at === -1) continue;
    const line = text.slice(0, at).split('\n').length;
    return { file: path.relative(root, file), line, snippet: text.slice(Math.max(0, at - 120), at + 160).replace(/\s+/g, ' ').trim() };
  }
  return null;
}

/** Best-effort per-shape metrics extracted from the repo (may be empty). */
function collectShapeMetrics(root) {
  const metrics = { height: null, radius: null, icon: null };
  for (const file of walk(root)) {
    if (!/\.(css|scss|tsx|ts|jsx|js)$/.test(file)) continue;
    let text;
    try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
    if (!text.includes(SLOT)) continue;
    const rel = path.relative(root, file);
    const wins = [];
    const rxHeight = /(?:height|minHeight|min-height)\s*[:=]\s*['"]?(\d+)px/i;
    const rxRadius = /border-radius\s*:\s*(\d+)px/i;
    const rxIcon = /(?:fontSize|font-size|width|height)\s*[:=]\s*['"]?(\d+)(?:px)?/i;
    let mt, mRadius, mIcon;
    if ((mt = text.match(rxHeight))) wins.push(`高度=${mt[1]}px`);
    if ((mRadius = text.match(rxRadius))) wins.push(`圆角=${mRadius[1]}px`);
    if ((mIcon = text.match(rxIcon))) wins.push(`图标≈${mIcon[1]}px`);
    if (wins.length) metrics[rel] = wins.join(' / ');
  }
  return metrics;
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- proposal package -------------------------------------------------------

/** Build the before/after preview HTML (self-contained, no external assets). */
function buildPreviewHtml({ name, owner, section, metrics, registration, now }) {
  const beforeRows = Object.entries(metrics)
    .map(([k, v]) => ({ k: k === 'height' ? '高度' : k === 'radius' ? '圆角' : k === 'icon' ? '图标' : k, v }))
    .filter(r => r.v);
  const metricsRows = beforeRows.length
    ? beforeRows.map(r => `<tr><td>${esc(r.k)}</td><td>${esc(r.v)}</td></tr>`).join('')
    : '<tr><td colspan="2">仓库里没有直接量到（请以实机为准）</td></tr>';

  const futureSection = section === '25' ? '25-card-occupants.md' : '20-sidebar-footer.md';
  const futureTitle = section === '25' ? '§25 卡片型占用者（方案 A）' : '§20 两态几何与容量规则';

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(name)} · DSH 插件 UI 约定提案预览</title>
<style>
  :root { --bg:#f4f5f7; --card:#fff; --line:#e3e5e8; --txt:#1f2328; --sub:#6b7280; --brand:#3b82f6; }
  * { box-sizing: border-box; }
  body { margin:0; font:14px/1.6 -apple-system,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif; background:var(--bg); color:var(--txt); padding:24px; }
  h1 { font-size:18px; margin:0 0 4px; }
  h2 { font-size:15px; margin:28px 0 10px; }
  .meta { color:var(--sub); font-size:12px; margin-bottom:20px; }
  .lanes { display:flex; gap:16px; flex-wrap:wrap; }
  .lane { flex:1 1 320px; background:var(--card); border:1px solid var(--line); border-radius:12px; padding:16px; }
  .lane h3 { margin:0 0 12px; font-size:14px; }
  .lane .note { color:var(--sub); font-size:12px; margin-top:10px; }
  .hostrow { display:flex; align-items:center; background:#0f172a; border-radius:12px; padding:14px 16px; gap:4px; min-height:70px; }
  .seat { flex:0 0 auto; height:42px; padding:0 9px; display:flex; align-items:center; gap:6px;
          border-radius:12px; background:rgba(255,255,255,.12); color:#e2e8f0; font-size:13px; min-width:0; }
  .seat .dot { width:16px; height:16px; border-radius:4px; background:rgba(255,255,255,.28); flex:0 0 auto; }
  .future .seat { background:var(--brand); color:#fff; }
  .future .seat.icon { width:36px; height:36px; padding:0; justify-content:center; }
  .future .seat.icon .dot { width:18px; height:18px; }
  .tag { display:inline-block; font-size:11px; padding:1px 8px; border-radius:999px; margin-left:6px; vertical-align:middle; }
  .tag.mine { background:#eef2ff; color:#4f46e5; }
  .tag.future { background:#ecfdf5; color:#059669; }
  table { border-collapse:collapse; width:100%; margin-top:8px; }
  th, td { border:1px solid var(--line); padding:6px 10px; text-align:left; font-size:13px; }
  th { background:#f9fafb; }
  footer { margin-top:28px; color:var(--sub); font-size:12px; }
</style>
</head>
<body>
  <h1>${esc(name)} · DSH 插件 UI 约定 — 提案预览</h1>
  <div class="meta">维护者：${esc(owner)} · 提案由<strong>迁移助手生成</strong>（社区约定，非官方）· ${now}</div>

  <h2>现状 vs 按约定调整后</h2>
  <div class="lanes">
    <div class="lane">
      <h3>现状（仓库代码推断 <span class="tag mine">当前</span>）</h3>
      <div class="hostrow">
        <div class="seat" title="你的入口（示意）"><span class="dot"></span>${esc(name)}</div>
        <div class="seat" title="邻居插件（示意）"><span class="dot"></span>其它</div>
      </div>
      <table>
        <tr><th>项</th><th>当前推断值</th></tr>
        ${metricsRows}
      </table>
      <div class="note">⚠️ 数值是按仓库代码的 <em>best-effort 推断</em>，可能与实机有出入，以下一栏才是约定目标。</div>
    </div>
    <div class="lane future">
      <h3>按约定调整后 <span class="tag future">§20 / §25 目标</span></h3>
      <div class="hostrow">
        <div class="seat"><span class="dot"></span>${esc(name)}</div>
        <div class="seat icon"><span class="dot"></span></div>
      </div>
      <table>
        <tr><th>项</th><th>约定值</th></tr>
        <tr><td>文字态高度</td><td>42px</td></tr>
        <tr><td>图标态</td><td>36×36</td></tr>
        <tr><td>圆角</td><td>12px（不是 50%）</td></tr>
        <tr><td>容量判定</td><td>count + rowWidth（<code>required(count)=count×112+(count−1)×4+16</code>）</td></tr>
      </table>
      <div class="note">完整的§${futureSection.startsWith('25') ? '25' : '20'}几何见 <a href="${CONVENTIONS_URL}/blob/main/conventions/${futureSection}">${futureTitle}</a>（社区约定，非官方）。</div>
    </div>
  </div>

  <h2>审计结果</h2>
  <p>槽位注册于 <code>${esc(registration?.file ?? '?')}:${esc(String(registration?.line ?? '?'))}</code>，片段：<code>${esc(registration?.snippet ?? '')}</code></p>
  <p>完整提案（含草稿正文与发出清单）见随本页一起生成的 <code>issue.md</code>。</p>

  <footer>由 <code>skills/dsh-ui-conventions/scripts/propose.mjs</code> 生成 · 本页仅用于预览，未发送任何内容。</footer>
</body>
</html>
`;
}

/** Build the issue draft markdown. */
function buildIssueMarkdown({ name, owner, repo, section, registration, metrics, now, proposer }) {
  const secLink = section === '25'
    ? `[§25 卡片型占用者](${CONVENTIONS_URL}/blob/main/conventions/25-card-occupants.md)`
    : `[§20 侧栏底部入口](${CONVENTIONS_URL}/blob/main/conventions/20-sidebar-footer.md)`;
  const metricsBlock = Object.keys(metrics).length
    ? '```\n' + Object.entries(metrics).map(([k, v]) => `${k}: ${v}`).join('\n') + '\n```'
    : '（仓库里没有直接量到，以实机为准）';

  return `## 建议：按 DSH 插件 UI 约定对齐侧栏底部入口

你好！你的插件注册了 \`${SLOT}\`（侧栏底部入口）。当多个插件共用这一排时，各自的几何如果没有约定很容易互相挤压（历史上出现过 36/42/49px 三种高度、8/12/50% 三种圆角混排）。

[DSH 插件 UI 约定](https://github.com/abworks-dev/dsh-plugin-ui-conventions)（**社区约定，非官方**，MIT）为这一类共享容器固定了尺寸、间距、圆角与容量规则，并附可以直接拷贝的参考实现。已有多家插件采纳（${'`dsh-chat-import`、`ds-harness-remote`、`dsh-mobile`、`dsh-cost-meter`'}），落地方式见[§90 参考实现](${CONVENTIONS_URL}/blob/main/conventions/90-reference-implementations.md)。

### 建议内容

套用 ${secLink}：

- 文字态高度 42px，图标态 36×36，圆角 12px；
- 容量判定只使用 \`count\`（槽内可见占位数量）与 \`rowWidth\`（宿主行宽度），不读取邻居插件；
- 不改造宿主容器（不使用 \`:has()\` 改 \`flex-wrap\`、不注入 \`order\` 抢位、不用 \`border-radius: 50%\`）；
- 若你的入口是卡片型（高度 > 48px 或 \`width:100%\` 信息卡），请参考 ${section === '25' ? '方案 A（有邻居时收成 36×36 图标 + 点击展开）' : '§20'}。

${
  section === '25'
    ? `### 为什么是卡片型

${registration?.snippet ? `注册位置：\`${registration.file}:${registration.line}\`。` : ''}代码里疑似使用了 \`width:100%\` / 多行内容，按约定 §25 判定为卡片型。`
    : `### 现状推断

${registration?.snippet ? `注册位置：\`${registration.file}:${registration.line}\`。` : ''}
\`\`\`
${metricsBlock}
\`\`\`
`
}

### 参考实现

- 按钮型：[\`references/footer-lane.ts\`](${CONVENTIONS_URL}/blob/main/skills/dsh-ui-conventions/references/footer-lane.ts)（容量契约，MIT，直接拷贝）
- 已采纳插件：${'`dsh-cost-meter` v1.9.86（PR #577）、`ds-harness-remote` v0.6.7（PR #498）'} 等

> 本建议由 DSH 插件 UI 约定迁移助手（[skills/dsh-ui-conventions](${CONVENTIONS_URL}/tree/main/skills/dsh-ui-conventions)）生成，仅供维护者参考；是否采纳完全由你决定。非官方规范，不代表 DeepSeek 官方路线。
`;
}

// --- main -------------------------------------------------------------------

const args = process.argv.slice(2);
const opts = { out: null, owner: null, json: false };
const positional = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--out') opts.out = args[++i];
  else if (a === '--owner') opts.owner = args[++i];
  else if (a === '--json') opts.json = true;
  else if (a === '--dry-run') opts.dryRun = true;
  else if (a === '--help' || a === '-h') {
    console.log(`用法：node propose.mjs <插件仓库根目录> [--out <目录>] [--owner <登录名>] [--json]
只读生成提案包（issue 草稿 + before/after 预览页），绝不自动发 issue。`);
    process.exit(0);
  } else if (a.startsWith('-')) fail(2, `未知参数：${a}`);
  else positional.push(a);
}
if (positional.length !== 1) fail(2, '用法：node skills/dsh-ui-conventions/scripts/propose.mjs <插件仓库根目录>');
const root = path.resolve(positional[0]);
if (!fs.existsSync(root)) fail(2, `目录不存在：${root}`);

// 1. must have the slot
const registration = findRegistration(root);
if (!registration) {
  console.log('NO_FOOTER_SLOT 这个仓库没有注册 sidebar.footer.action（或不在本仓库源码里），不适用本约定。');
  process.exit(1);
}

// 2. identify the repo and the current user
const repo = detectRepo(root);
if (!repo) {
  console.error('NO_REPO 找不到插件仓库（package.json 的 repository/homepage 或 git remote 都没有 GitHub 地址）。需要仓库位置才能查重与生成提案。');
  process.exit(1);
}
let owner;
if (opts.owner) owner = opts.owner;
else {
  const u = gh(['api', 'user', '--jq', '.login'], { optional: true });
  owner = u?.stdout?.trim() || null;
}

const [repoOwner] = repo.split('/');
const isOwn = owner && repoOwner.toLowerCase() === owner.toLowerCase();

// 3. dedupe: already-adopted list in the conventions README
let adopted = [];
try {
  const readme = gh(['api', `repos/${CONVENTIONS_URL.replace('https://github.com/', '')}/readme`, '--jq', '.content'], { optional: true });
  if (readme?.stdout) {
    const content = Buffer.from(readme.stdout.trim(), 'base64').toString('utf8');
    const m = content.match(/\[`([^`]+)`\]\(https:\/\/github\.com\/[^/]+\/[^)]+\)/g) || [];
    adopted = m.map(x => x.match(/\[`([^`]+)`\]/)?.[1]).filter(Boolean);
  }
} catch { /* readme read is best-effort */ }
const isAdopted = adopted.some(n => n === path.basename(root));

// check whether the target repo's issues already mention the conventions
let existing = null;
const search = gh(['issue', 'list', '-R', repo, '--search', '"dsh-plugin-ui-conventions" in:body', '--state', 'all', '--limit', '10'], { optional: true });
if (search?.stdout?.trim()) existing = search.stdout.trim().split('\n').slice(0, 5);

// 4. classify button vs card (best-effort, mirror of SKILL.md §1)
const width100 = ['width:100%', 'width: 100%'].some(s => {
  for (const file of walk(root)) {
    let t;
    try { t = fs.readFileSync(file, 'utf8'); } catch { continue; }
    if (t.includes(SLOT) && t.includes(s)) return true;
  }
  return false;
});
const section = width100 ? '25' : '20';
const metrics = collectShapeMetrics(root);

// 5. write the proposal package
const now = new Date();
const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, '-');
const outDir = path.resolve(opts.out || path.join('out', path.basename(root)));
if (!opts.dryRun) fs.mkdirSync(outDir, { recursive: true });

const name = path.basename(root);
const issueMd = buildIssueMarkdown({ name, owner: repoOwner, repo, section, registration, metrics, now: now.toLocaleString('zh-CN'), proposer: owner });
const previewHtml = buildPreviewHtml({ name, owner: repoOwner, section, metrics, registration, now: now.toLocaleString('zh-CN') });

let shotHint = '';
if (!opts.dryRun) {
  fs.writeFileSync(path.join(outDir, 'issue.md'), issueMd, 'utf8');
  fs.writeFileSync(path.join(outDir, 'preview.html'), previewHtml, 'utf8');

  // best-effort screenshot, never an error
  const shot = path.join(SKILL_ROOT, 'scripts', 'shot.mjs');
  if (fs.existsSync(shot)) {
    const r = sh('node', [shot, path.join(outDir, 'preview.html'), path.join(outDir, 'preview.png')], { optional: true });
    if (r?.status === 0) shotHint = `、preview.png`;
  }
}

// 6. human checklist
console.log(`PROPOSAL_PACKAGE 已生成（${opts.dryRun ? 'dry-run，未写入' : outDir}）`);
console.log(`- 目标仓库：${repo}（owner=${repoOwner}${isOwn ? '，这是你自己的插件' : '，第三方插件'}）`);
console.log(`- 判定：${section === '25' ? '卡片型 → 建议 §25' : '按钮型 → 建议 §20'}`);
console.log(`- 查重：${isAdopted ? '⚠️ 已在 README 已采纳清单中，不要重复提案' : '已采纳清单未命中'}${existing?.length ? `；该仓库 issues 已有 ${existing.length} 条提及约定（${existing.join(' / ')}）` : '；未发现已有相关 issue'}`);
console.log('');
console.log('人工发出步骤（只读脚本到此为止，下面这一步由你决定）:');
console.log('  1. 打开 preview.html 看一眼 before/after 效果' + (shotHint ? `（截图${shotHint}）` : ''));
console.log('  2. 打开 issue.md 检查措辞、补上插件实际版本号');
console.log('  3. 在该仓库发 issue（或作为 PR 内容）:');
console.log(`     gh issue create -R ${repo} --title "建议：按 DSH 插件 UI 约定对齐侧栏底部入口" --body-file ${path.join(outDir, 'issue.md')}`);
console.log('');
console.log('提示：尊重对方仓库的 CONTRIBUTING 与 issue 模板；若对方不接受外部建议，请就此打住。');
if (opts.json) {
  console.log('\n' + JSON.stringify({ repo, owner: repoOwner, isOwn, isAdopted, section, outDir, existing }, null, 2));
}
process.exit(0);