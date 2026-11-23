# 10 · 宿主 token 与尺度基准

所有数值以宿主 `@deepseek-ai/dsh-client-ui-sidebar` 与 `dsh-client-ui-theme` 的公开 token 为准。下表是 v1.0 时的实测值，插件应**引用变量名**而不是抄数字。

## 侧栏间距 token

定义在宿主侧栏根节点的 `:root` 上：

| Token | 值 | 含义 |
|---|---|---|
| `--dsh-sidebar-inline-padding` | `8px` | 侧栏左右内边距 |
| `--dsh-sidebar-row-padding` | `12px` | 行内左侧内边距（图标到行左缘的视觉距离） |
| `--dsh-sidebar-label-gap` | `6px` | 图标与文字之间的间距 |
| `--dsh-sidebar-paint-inset` | `3px` | 行内「绘制内缩」——hover 底色比行盒内缩这么多 |

### 为什么 `padding-inline` 是 `9px` 而不是 `12px`

设置行的写法是：

```css
padding: 0 calc(var(--dsh-sidebar-row-padding) - var(--dsh-sidebar-paint-inset));
border-inline: var(--dsh-sidebar-paint-inset) solid transparent;
background-clip: padding-box;
```

`border-inline` 是透明的，但会占位；`background-clip: padding-box` 让 hover 底色不画到那 3px 里。两者相抵后，**文字起点仍然是 12px，而底色比行盒内缩 3px**。照抄这一个组合是让「我的按钮和设置行左边缘严格对齐」的唯一办法。

## 圆角梯级

来自主题包 `--dsw-*` 系列：

| Token | 值 | 典型用途 |
|---|---|---|
| `--dsw-radius-xs` | `4px` | 徽标、小标签 |
| `--dsw-radius-sm` | `8px` | 紧凑控件 |
| `--dsw-radius-md` | `12px` | **行级控件（本约定的默认值）** |
| `--dsw-radius-lg` | `16px` | 卡片 |
| `--dsw-radius-xl` | `20px` | 面板 |
| `--dsw-radius-panel` | `28px` | 浮层面板外框 |

**行级控件一律用 `--dsw-radius-md`（12px），不要用 `50%`。** 圆形按钮在行里会破坏「一行等高同形」的观感，也是 2026-11 那轮三插件不一致的主要观感来源之一（见 §20 反模式）。

## 尺寸基准

| 量 | 值 | 说明 |
|---|---|---|
| 行高（文字态） | `42px` | 与设置行 `.trigger` 同高，保证同一列对齐 |
| 正方形控件（图标态） | `36 × 36` | 折叠/图标态的通用尺寸 |
| 图标（文字态） | `16 × 16` | 与 14px 文字视觉重量匹配 |
| 图标（图标态） | `18 × 18` | 正方形按钮里略大一点补偿无文字的视觉空洞 |
| 字号 / 行高 | `14px / 22px` | 与侧栏其它行一致 |

## 颜色

| 用途 | Token |
|---|---|
| 主文字 | `--dsw-alias-label-primary` |
| hover 底色 | `--dsw-alias-interactive-bg-hover` |
| 焦点环 | `--dsw-alias-brand-primary` |
| 品牌/业务强调 | `--dsw-alias-state-business-primary` |

> 注：`dsh-mobile` 0.8.14 的焦点环用的是 `--dsw-alias-state-business-primary`（两者都在主题里存在，视觉接近）。**新实现请用 `--dsw-alias-brand-primary`**，并在 §40 保持一致。
