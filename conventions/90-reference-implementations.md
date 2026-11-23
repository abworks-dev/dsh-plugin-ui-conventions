# 90 · 参考实现

已采纳的插件各自独立实现过同一套规则，代码可以直接抄 —— 它们是本章的实证来源。按钮型（§20）有三个，卡片型（§25 方案 A）有一个。

## `dsh-chat-import` 0.26.8（`Nwflower/dsh-chat-import`）

- 文件：[`lib/footer-layout.mjs`](https://github.com/Nwflower/dsh-chat-import/blob/main/lib/footer-layout.mjs)（纯函数，构建时内联进 `lib/client.js`）
- 合并提交 `52da14e`，issue [#120](https://github.com/Nwflower/dsh-chat-import/issues/120)
- 导出：`FOOTER_ICON_WIDTH = 36`、`MAX_LABEL_BOX = 112`、`COUNT_LIMIT = 2`、`ROW_GAP = 4`、`ROW_PADDING = 16`、`measureFooterLane(button)`、`resolveFooterForm(count, rowWidth)`
- 特点：最早落地，判定用 `rowWidth >= count * 112 + (count - 1) * 4 + 16`；容量逻辑与本章 §20.3 完全一致

## `ds-harness-remote` 0.6.7（`liguobao/ds-harness-remote`）

- 文件：[`packages/plugin/src/client/footer-lane.ts`](https://github.com/liguobao/ds-harness-remote/blob/main/packages/plugin/src/client/footer-lane.ts)
- PR [#498](https://github.com/liguobao/ds-harness-remote/pull/498)（合并 `206c25e`），issue [#462](https://github.com/liguobao/ds-harness-remote/issues/462)
- 导出：`FOOTER_ICON_WIDTH`、`FOOTER_MAX_LABEL_BOX`、`FOOTER_COUNT_LIMIT`、`FOOTER_ROW_GAP`、`FOOTER_ROW_PADDING`、`footerRequiredWidth(count)`、`resolveFooterForm(count, rowWidth)`、`occupiesFooterSeat(entry)`、`measureFooterSeat(entry, view)`、`footerFormFor(facts, wide)`、`watchFooterLane(entry, wide, onForm, view)`
- 特点：把**观察器**也封装进来了（`ResizeObserver` + `MutationObserver` + `window resize`，等值去重后回调），适合「组件里不想自己写三路监听」的场景；带 `typeof window !== 'undefined'` 守卫，可在 Node 单测里跑

## `dsh-mobile` 0.8.14（`saya-ch/dsh-mobile`）

- 文件：[`src/footer-form.ts`](https://github.com/saya-ch/dsh-mobile/blob/main/src/footer-form.ts)（`src/client.ts` 内注册与 CSS）
- PR [#452](https://github.com/saya-ch/dsh-mobile/pull/452)（合并 `b794e32`），issue [#440](https://github.com/saya-ch/dsh-mobile/issues/440)
- 导出：与 remote 同形的常量 + `footerFormFor(facts, wide)`、`measureFooterSeat(button, view)`
- 特点：`order: 40`；实践了 `is-icon` / `is-shared`（多个占位时 `flex: 0 0 auto`）两个类的做法；单测 `tests/footer-form.test.ts` 用假 DOM 覆盖阈值 128 / 244 / 360

---

## 卡片型（§25 方案 A）：`dsh-cost-meter` 1.9.86（`Han-1413141/dsh-cost-meter`）

- 发布：v1.9.86，PR [#577](https://github.com/Han-1413141/dsh-cost-meter/pull/577)，issue [#576](https://github.com/Han-1413141/dsh-cost-meter/issues/576)
- 行为：独占槽位时保留原费用卡（`width:100%`）；**存在其它可见入口时**收成同一行的 `36 × 36` 钱包按钮（`12px` 圆角，与邻居同高同理），点击在同一行上方展开完整卡片，`Esc` / 点击外部关闭；邻居隐藏或卸载后自动展开回卡片。
- 关键点：**条目本身不再修改宿主行的 `flex-wrap` / `flex-direction`** —— 换行与方向交回宿主。这是 §25 方案 A 与「自己 `:has()` 注入 wrap」的本质差别。
- 验证：Chrome 覆盖侧栏展开/收起 × 两种插槽结构 × 邻居动态挂载/移除，共 48 种布局、20 次切换；含首次布局时邻居被挤到零宽的情况。
- 对照图：[`docs/images/06-cost-meter-form-a.png`](../docs/images/06-cost-meter-form-a.png)（独占 / 有邻居 / 点击后 三态）

---

## 共同的不变量（按钮型）

| 项 | 值 |
|---|---|
| 图标态尺寸 | `36 × 36` |
| 圆角 | `12px`（两态都是，图标态不是 50%） |
| 文字宽度上限 | `112px` |
| 相邻间隙 | `4px`（各 2px margin） |
| 行两端余量 | `16px`（各 8px） |
| 文字态行高 | `42px` |
| 图标 16 / 18 | 文字态 16，图标态 18 |
| 最大带字入口数 | `2` |

## 复现方式

三个仓库的 `README` / 测试里都有可复跑的验证：

- `dsh-mobile`：`npm run smoke:native-layout`（304 个布局场景）、`npm test`（`tests/footer-form.test.ts`、`tests/sidebar-footer.test.ts`）
- `ds-harness-remote`：`npx vitest run packages/plugin/tests/footer-lane.test.ts`
- `dsh-chat-import`：`test/footer-layout.test.mjs`
