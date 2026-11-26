# 变更记录

## v1.1.4 — 2026-11-26

- 新增**外联提案**能力（传播社区约定）：`skills/dsh-ui-conventions/scripts/propose.mjs` 只读地检查第三方插件仓库 → 确认注册了 `sidebar.footer.action`、判定按钮/卡片型、查重，再产出提案包（`issue.md` 草稿 + `preview.html`/`preview.png` before/after 预览图）；**绝不自动开 issue**，发出永远是人最后一步（`gh issue create`）。配套 `scripts/shot.mjs` 探测本机 Chrome/Edge 无头截图，找不到浏览器时静默跳过。
- `SKILL.md` 新增 §0.5「外联：插件不是自己维护的怎么办」：只对自己维护的仓库改代码，第三方插件一律走提案包 + 人工发出；护栏=只对注册了槽位且未采纳的插件提、单仓库只提一次、正文注明社区约定非官方并附已采纳落地提交作证据。

## v1.1.3 — 2026-11-24

- §20.12 新增「纵向列容器」：`flex-direction: column` 时每个占位者独占整行（`width:100%`），`count` 不参与判定，图标态不用于纵向列；附手机实机三种宽度不齐的对照图 `09-column-normalize.png`。
- §20.13 新增「文案」建议：中文界面用中文、≤4 字、同组长度一致；品牌名保留时在 `title`/`aria-label` 给出中文。
- 说明：`wide` 只表示「文字放得下」，不能用来判断横排/纵排。

## v1.1.2 — 2026-11-24

- §20.11 新增「窄屏 / 触屏：优先图标态」：触屏与 ≤1023px 视口默认 36×36 单行 + 横向滚动 + 明细内联展开；禁止因设备能力把用户显式选择的图标布局静默回退成卡片；点击区不小于 36×36。
- 参考实现补充 `dsh-cost-meter` 1.9.88+ 的 `src/sidebar-icons/`；配图 `docs/images/08-icons-mobile.png`（桌面窄 268 / 手机 360 / 旧 32×32 对照 / 卡片回退对照 四栏）。

## v1.1.1 — 2026-11-24

**§25 补 25.6「纵向栈与窄栏」**
- 方案 A 的「有邻居就收窄」按同一横向 flex 行的宽度判定，遇到手机端这类 **纵向栈** footer（`flex-direction: column`）永不触发，卡片仍铺满整行。新增 25.6：判定改为「占用环境」——只看最近 footer 容器的 `flex-direction: column`（不用容器宽度做判据，理由见 6.1），此时卡片一律降级为 36×36 钱包按钮 + 点击浮层（`role=dialog`、绝对定位不撑高、Esc/点外部关闭、宽度恢复后自动还原）。
- 配参考实现：`dsh-cost-meter` v1.9.88。

**触发来源**：手机端 DSH Mobile 侧栏截图（`dsh-cost-meter` 1.9.87 + Remote + 导入会话 纵向堆叠）。

## v1.1.0 — 2026-11-23

**新增草案章节**
- §25 卡片型占用者（`conventions/25-card-occupants.md`）：区分按钮型 / 卡片型；给出 A（降级为图标）/ B（卡片独占一行）/ C（移出 footer）三种形态及各自代价；五条硬规则（`count>1` 禁止 `width:100%`、禁止改造宿主容器、必须提供 36×36 兜底、B 形态不得挤压邻居、卡片不计入 §20 容量公式）。
- 配图 `docs/images/05-occupancy-modes.png`（四种共存形态对比）。
- §20 增加 20.10 指向本节。
- 新增 `skills/dsh-ui-conventions/`：面向 agent 的迁移 skill（`SKILL.md` + `scripts/audit.mjs` 只读审计 + `references/footer-lane.ts` 参考实现）。
- **方案 A 已实践**：`dsh-cost-meter` v1.9.86（PR #577 / issue #576）落地「独占保持卡片、有邻居收成 36×36 钱包按钮、点击展开」，且不再修改宿主行的 `flex-wrap` / `flex-direction`。§25 状态由草案升为 v1.1，配图 `docs/images/06-cost-meter-form-a.png`，§90 增加卡片型参考实现。

**触发来源**：`dsh-cost-meter#576`、`dsh-ui-usage-billing#130` 两个卡片型插件与其它 footer 入口并排时互相挤压（源自 `saya-ch/dsh-mobile#237` 的同一类问题）。

## v1.0.0 — 2026-11-23

首个版本。

**已实践章节**
- §00 基本原则：五条硬原则
- §10 宿主 token 与尺度基准：侧栏间距 token、圆角梯级、尺寸表
- §20 侧栏底部入口（`sidebar.footer.action`）：两态几何、容量规则 `required(count) = count × 112 + (count − 1) × 4 + 16`、`order` 档位、测量方法、适配指南、反模式
- §40 状态与可访问性（焦点环、hover、图标态命名）
- §90 参考实现：`dsh-chat-import` 0.26.8、`ds-harness-remote` 0.6.7、`dsh-mobile` 0.8.14

**草案章节**
- §30 面板与浮层（只记录宿主事实与待定问题）

**背景**
三个插件曾在同一排入口上出现三种高度（36 / 42 / 49）、三种圆角（8 / 12 / 50%）、以及「一个带字两个不带字」的混搭。根源是宿主容器只给位置不给尺度，每个插件各自解一次。v1.0 把共用的部分固定下来；三个插件随后各自发版采纳。
