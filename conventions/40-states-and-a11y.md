# 40 · 状态、焦点与可访问性

**状态：v1.0（部分已验证）** —— 焦点与 hover 已在三个插件里统一；其余条目为草案。

## 焦点环（MUST）

```css
outline: 2px solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
outline-offset: -2px;
```

两点必须注意：

1. **`outline-offset: -2px`（向内）**。行内入口紧贴容器边缘，向外画会被相邻入口或容器裁掉。
2. **选择器特异度要够**。宿主/插件常有形如 `.my-control button:focus-visible`（0,2,1）的通用规则，你的 `.my-entry:focus-visible`（0,2,0）会被它压过。要么提升到同等特异度（如 `.my-control .my-entry:focus-visible` → 0,3,0），要么用同样的形状写。

`--dsw-focus-ring-color` 缺省时会回退到 `--dsw-alias-state-business-primary`；若直接写 `--dsw-alias-brand-primary`，就跳过了宿主的焦点色设置。审计脚本对这两类偏离报 `FOCUS_TOKEN_ORDER` / `FOCUS_OUTLINE_OFFSET`（完整优先级见 §20.2）。

> 0.8.15 起 `dsh-mobile` 已改用这条宿主链（`--dsw-focus-ring-color` 未定义时回退到 `--dsw-alias-state-business-primary`），与宿主 `ui-theme/src/styles/focus.css` 的做法一致。

## 交互态

| 状态 | 样式 |
|---|---|
| 默认（文字与图标） | `color: var(--dsw-alias-label-primary)`（footer 入口；见 §20.2「关于前景色」） |
| hover | `background-color: var(--dsw-alias-interactive-bg-hover)` |
| active / 展开中 | 同 hover，可叠 `background-color: var(--dsw-alias-interactive-bg-hover-solid)` |
| disabled | `opacity: 0.5` + `cursor: default`，不改变几何 |
| 有更新/提醒 | 用 `box-shadow: inset 0 0 0 1px <color>` 画内描边，**不要用 `border: 1px`** —— 会与 `border-inline: 3px` 的绘制内缩冲突，改变几何 |

## 可访问性（MUST）

- 图标态**必须**保留 `aria-label`（和 `title`），因为此时文字被 CSS `display:none` 隐藏
- 文字态的文字节点应**始终存在于 DOM**，由 CSS 控制显隐；不要条件渲染 —— 否则尺寸测量和朗读器都会抖
- `aria-expanded` / `aria-controls` 只在真的控制一个可展开层时使用
- 命中区域不小于 `36 × 36`

## 文案

- 入口文字用动词短语或功能名，不超过 6 个汉字 / 16 个字符（112px 是它的上限，见 §20.3）
- 不要用省略号截断作为常态；截断只应发生在极端窄侧栏

## 草案部分

以下尚未形成约定，欢迎补数据：键盘 Tab 顺序在多插件同排时的期望；屏幕朗读器对「图标态 + 更新点」的播报；高对比度模式下的焦点环替换。
