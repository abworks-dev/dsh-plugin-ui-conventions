# 00 · 基本原则

这五条是所有章节的前提。它们来自三个插件在同一排入口上反复踩坑的教训，任何一条被违反，几何再对也会互相打架。

## 1. 不改造宿主容器

宿主给的容器（如 `.footerActions`）是**共享**的：你对它做的任何改动都会落到邻居身上。

- ❌ 注入 `flex-wrap: wrap`、改 `flex-direction`、加 `gap`/`padding`
- ❌ 用 `:has()` / `[data-slot=…]` 反向选中宿主容器来改它
- ✅ 只样式化自己的入口，尺寸用「行里还剩多少」自己算

> 反例：`zh667/TokenLedger` 注入 `div:has(> [data-slot='sidebar.footer.action']){flex-wrap:wrap}`，把整行改成可换行。它解决了自己的溢出，但改变了所有邻居的排布。

## 2. 单一判定输入

判定「我该显示文字还是图标」只能用两个数：**同排入口数 `count`** 和 **行可用宽度 `rowWidth`**。

- ✅ 两者都能在渲染时测到，且变化可观察（ResizeObserver / MutationObserver）
- ❌ 不要测邻居的宽度来决定自己 —— 结果是循环依赖，两家互相等对方先缩，最后抖动
- ❌ 不要用「我是不是 `:only-child`」 —— 那是「有没有别人」的判定，不是「放不放得下」的判定

> 反例：`dsh-mobile` 0.6.14–0.8.13 用 `:not(:only-child)` 判定，必然产生「一个带字、一个不带字」的混搭（见 §20 的历史说明）。

## 3. 全有或全无

一排共享入口**要么全带文字，要么全图标**。不允许出现「第一个带字、后面两个只有图标」。

理由：混搭会让宽度分配完全失去可预测性，而且视觉上像是某个插件加载失败了。全有或全无让每个入口的宽度都是常量，布局可以被算出来。

## 4. 只用自己的选择器

- 宿主的 CSS Module 类名是**哈希过的**，不能依赖
- `[data-slot]` 锚点外壳是 `display: contents`，它的 `clientWidth` / `scrollWidth` 恒为 0 —— 能用来定位，**不能用来测量**
- 插件注入的 `<style>` 元素也可能命中宽松选择器（如 `[data-plugin]`），测量时要把 `position: absolute/fixed` 与零尺寸元素排除

## 5. 复用宿主 token，不写魔法数

尺寸、间距、圆角一律引用宿主 CSS 变量（见 §10），并提供字面量兜底：

```css
padding: 0 calc(var(--dsh-sidebar-row-padding, 12px) - var(--dsh-sidebar-paint-inset, 3px));
border-radius: var(--dsw-radius-md, 12px);
```

这样宿主调主题或密度时，插件跟着走，不需要发版。
