# 变更记录

## v1.1.4 — 2026-11-27

**§20.2 焦点令牌优先级（MUST）**
- 新增「键盘焦点令牌优先级」：`outline: 2px solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary))`、`outline-offset: -2px`。明确「先取 focus-ring，再回退业务主色」，直接写 `--dsw-alias-brand-primary` 会跳过宿主的焦点色设置，仅作最后一级兼容回退；内联焦点处理同样适用。
- 审计脚本 `audit.mjs` 补两条整文件规则：`FOCUS_TOKEN_ORDER`（焦点轮廓直接用品牌主色）、`FOCUS_OUTLINE_OFFSET`（`outline-offset` 向外为正）。仍仅对注册 `sidebar.footer.action` 的仓库生效。
- §40 同步指向这条优先级与两个审计规则。
- 触发来源：Windows 桌面 DSH 0.2.3-alpha.2 侧栏底部五项实测，见 `docs/pilot-chat-import-footer.md`。

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
