---
name: dsh-ui-conventions
description: Migrate a DeepSeek Harness (DSH) plugin's sidebar/footer UI to the community UI conventions —— audit the slot code, classify button vs card occupants, apply §20 two-state geometry or §25 card forms, remove host-container hacks, and verify with the bundled audit script. Use when a plugin registers `sidebar.footer.action` (or another shared slot) and looks misaligned next to other plugins, or when the user asks to adopt "DSH 插件 UI 约定" / "sidebar footer 规范".
---

# DSH 插件 UI 约定 · 迁移助手

把第三方 DSH 插件改到 [社区 UI 约定](https://github.com/abworks-dev/dsh-plugin-ui-conventions) 上。**非官方**，不代表 DeepSeek 官方规范。

## 0. 先判断值不值得改

跑一下仓库里的审计脚本（只读，不改任何文件）：

```bash
node skills/dsh-ui-conventions/scripts/audit.mjs <插件仓库根目录>
```

- 输出 `NO_FOOTER_SLOT` → 这个插件没有注册 `sidebar.footer.action`，**不要套用本约定**（其它槽位只适用 §00 原则）。
- 输出里有 `FLEX_WRAP` / `HOST_MUTATION` / `ORDER_OVERRIDE` / `RADIUS_50` / `WIDTH_100` / `ICON_OVERSIZE` / `ICON_FILL_HEX` / `ICON_VIEWBOX_DRIFT` → 属于本约定的适用范围，继续。

## 1. 分类：按钮型还是卡片型

| 类型 | 判定 | 走哪一节 |
|---|---|---|
| 按钮型 | 单行、宽态高度 ≤ 48px、只有一个图标或图标 + 文字 | §20（第 2 步） |
| 卡片型 | 多行、宽态高度 > 48px、高度随内容变化、`width:100%` 的信息卡 | §25（第 3 步） |

不确定就量：宽态下取占位元素的 `getBoundingClientRect().height`，> 48 即卡片型。

## 2. 按钮型：套 §20

目标几何（全部定值，不要自创）：

| 项 | 文字态 | 图标态 |
|---|---|---|
| 高度 | `42px` | `36px` |
| 宽度 | `auto`（`flex: 0 0 auto`；`count = 1` 时 `flex: 1 1 auto`） | `36px` |
| 圆角 | `12px` | `12px`（**不是 50%**） |
| `padding-inline` | `calc(var(--dsh-sidebar-row-padding, 12px) - var(--dsh-sidebar-paint-inset, 3px))`（= 9px） | `0` |
| `gap` | `var(--dsh-sidebar-label-gap, 6px)` | `0` |
| 图标 | `16px` | `18px`（墨迹盒见 §15） |
| 外边距 | `4px 2px` | `4px 2px` |
| 文字 | 显示 | 隐藏（保留 `aria-label` / `title`） |

容量判定：**只允许两个输入** —— `count`（本槽内可见占位数量）与 `rowWidth`（宿主行 `clientWidth`）：

```js
required(count) = count * 112 + (count - 1) * 4 + 16
// count ≤ 2 且 rowWidth >= required(count) → 全排 label；否则全排 icon
```

实现：直接拷 [references/footer-lane.ts](references/footer-lane.ts)（MIT，来自 `ds-harness-remote` 0.6.7），导出常量、`footerRequiredWidth`、`resolveFooterForm`、`measureFooterSeat`、`footerFormFor`、`watchFooterLane`。

两个必须做的改造：

1. **把「侧栏展开」和「显示文字」拆开**：`wide` 只表示侧栏展开；`labelled = wide && form === 'label'` 才渲染文字。不要用 `:only-child` / `:not(.is-rail)` 判断有没有邻居。
2. **order 选档**：0–19 账号/身份、20–39 会话/数据、40+ 设备/连接（§20.5）。不要越界，也不要给宿主行注入排序。

## 3. 卡片型：套 §25

按代价选形态（产品判断，由插件作者定）：

| 形态 | 做法 | 代价 |
|---|---|---|
| **A（推荐）** | 有可见邻居 → 收成 `36×36` 图标按钮；点击在**同一行上方**展开完整卡片；`Esc` / 点外部关闭；邻居隐藏或卸载后自动展开回卡片 | 少了一眼可见的数字 |
| **B** | 卡片 `flex-wrap` 到独占一行 | footer 高度 +约 52px，行数随插件数变化 |
| **C** | 卡片移出 footer，进侧栏面板 / 设置页 | 同上 |

硬规则（违反任何一条都算没落地）：

1. `count > 1` 时**禁止** `width:100%`
2. **禁止改造宿主容器**：不得用 `:has()` / 注入 CSS 改 `.footerActions` 的 `flex-wrap` / 方向，也不得改 `sidebar.settings` 的 `order`、尺寸、圆角
3. 必须提供 `36×36` 按钮兜底（没有兜底的卡片型插件不允许进这个槽）
4. B 形态只允许 wrap 到独立行，不得挤压邻居（邻居可见宽度 ≥ `required(1) = 128px`）
5. 卡片不计入 §20 容量公式；有卡片时按钮型一律取图标态

参考实现：`dsh-cost-meter` v1.9.86（PR #577），见 §90。

## 3.5 点击后弹出的入口卡片：套 §30

footer 入口点击后展开的浮层（popover / panel / dialog）不属于 §25；按 §30 先选形态：

| 形态 | 何时用 | 关键值 |
|---|---|---|
| 菜单卡 | 一组动作 / 选项 | 直接用宿主 `Menu` / `MenuSurface`，不要自绘外壳 |
| 锚定卡（默认） | 状态、数据、少量操作，内容 ≤ 440px | 16px 圆角、16px 内边距、300–440px 宽、`--dsw-specific-menu` + `--dsw-menu-backdrop-filter`、`--dsw-elevation-prominent`；非模态 `role="dialog"`（不写 `aria-modal`） |
| 居中面板 | 多步流程，或内容 > 440px | 优先用宿主 `Modal`：28px 圆角、`--dsw-alias-bg-layer-2`、遮罩 `--dsw-alias-bg-mask-1`、`aria-modal="true"` |

禁止：各插件自定 264 / 292 / 320 / 380 / 460 / 680 / 704px 宽度；8 / 10 / 14 / 18 / 20px 圆角；`border:1px` 叠自定义阴影；`z-index:9999` / `2147483000`；`max-height:calc(100vh - 140px)` 之类硬编码。

## 4. 删掉宿主改造

审计脚本报 `HOST_MUTATION` 的地方逐条删除，常见形态：

- `div:has(> [data-slot="sidebar.footer.action"]) { flex-wrap: wrap }`
- 运行时向上找 flex 容器、写 `style.flexWrap = 'wrap'`、卸载时还原
- 给 `[data-slot="sidebar.settings"] button` 改 `order` / 尺寸 / 圆角
- 把槽包装层改成 `display: contents` 再自己重排

删完后插件只控制自己的盒子。确实需要「独占一行」时走 §25 的 B 形态，并把「宿主是否提供 wrap」作为前提写进 README，而不是运行时硬改。

## 5. 测量与测试

- **不要用 `[data-slot]` 元素量宽度**：它是 `display: contents`，`clientWidth` 恒为 0。要向上找到真正有盒子的行（见 `measureFooterSeat`）。
- 单元测试至少覆盖阈值：`128`（1 个带字）、`244`（2 个带字）、`360`（3 个），以及 `count = 0`、`NaN`、邻居零宽。
- DOM 测试覆盖「邻居动态挂载 / 卸载」和「首次布局即被挤到零宽」。
- 真实宿主至少验证：三入口 268px、两入口 268px、两入口 200px、折叠态。

## 6. 自检清单

- [ ] 只注册一个可见占位（卡片型在 A 形态下算一个）
- [ ] 文字态 42 / 图标态 36 / 圆角 12 / 图标 16 与 18
- [ ] 判定只用 `count` + `rowWidth`，不读邻居插件
- [ ] 没有 `:has()` / `flex-wrap` / `order` 注入到宿主
- [ ] 没有 `border-radius: 50%`
- [ ] `wide` 与 `label` 已拆开
- [ ] 图标态有 `aria-label` 和 `title`
- [ ] 图标画风符合 §15：16×16 网格、1.0/1.3 用户单位描边、`currentColor`、不写死颜色；图标态墨迹 `max(w,h)` 落在 13.5–17px，文字态 12–15px
- [ ] 默认前景色为 `var(--dsw-alias-label-primary)`，同排不混用 `label-secondary`（见 §20.2「关于前景色」）
- [ ] 品牌 logo 走 §15 例外（18px 渲染、墨迹仍 13.5–17px、单色 `currentColor`，并在源码注释里声明）
- [ ] 焦点环 `outline: 2px solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: -2px`
- [ ] 点击后的浮层按 §30 选形（菜单卡 / 锚定卡 / 居中面板），没有自造宽度、圆角、阴影与层级
- [ ] 审计脚本无 `FLEX_WRAP` / `HOST_MUTATION` / `RADIUS_50` / `ICON_OVERSIZE` / `ICON_FILL_HEX` / `ICON_VIEWBOX_DRIFT` 告警

## 7. 引用

在 PR / issue 里写：

> 遵循 [DSH 插件 UI 约定 §20 侧栏底部入口](https://github.com/abworks-dev/dsh-plugin-ui-conventions/blob/main/conventions/20-sidebar-footer.md)（社区约定，非官方）。
