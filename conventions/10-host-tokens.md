# 10 · 宿主 token 与尺度基准

本节只记录**侧栏入口如何跟宿主对齐**。通用颜色、材质、阴影、动效与共享组件以官方 [Web UI 样式规范](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/web-styling.md) 为准；插件按目标宿主版本引用语义 token，不把实测值当作另一套主题。

## 侧栏间距 token

以下是宿主侧栏提供的 token。数值为实测参考，插件应引用变量名：

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

## 圆角：侧栏入口与展开内容分开

圆角梯级与组件例外见官方 [圆角规范](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/ui-radius.md#radius-scale)，本仓不另列通用尺寸表。**§20 的行级入口和 §25.6 的降级按钮用 `--dsw-radius-md`，不做成 `50%` 圆形**，以便同列入口对齐。展开后的菜单、内容卡或承载面板按自身角色选型，不继承触发按钮的圆角，见 [§30](30-panels.md)。

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
| 键盘焦点环 | 见 [§20.2 键盘焦点令牌优先级](20-sidebar-footer.md#键盘焦点令牌优先级must) |
| 业务强调 | `--dsw-alias-state-business-primary` |
