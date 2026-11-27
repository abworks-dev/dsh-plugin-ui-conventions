# 侧栏底部试点 · Chat Import 键盘焦点

## 验证范围

- 规范基线为本仓 `2c4cb0e43893df0be9603637a9fdd93cbc5bddad` 的 §20 和 §40。测试对象为本机 `dsh-chat-import@0.26.9` 的已安装客户端构建，由 Chromium 153.0.8010.12 加载。
- DSH `0.2.3-alpha.2` 的 Cordis 在 `sidebar.footer.action` 槽返回 9 条活动注册。Chat Import 在隔离宿主中以 `chat-import`、`order: 20` 注册。夹具模拟宿主服务和同槽邻居，因此开启面板只验证到 `openTab('chat-import')` 调用。另在现有 Windows 桌面窗口核对实际可见项和键盘焦点。桌面现场覆盖浅暗两种主题的展开、最窄可拖状态及折叠态。
- 11 种布局覆盖单项 127/128 px、双项 243/244 px 及缩窄后恢复、三项、折叠栏、纵排、换行。图标按钮为 36×36 px，文字态高 42 px。三项挤进 112 px 的夹具时槽溢出 6 px，其余场景没有溢出。图标和文字形态都有可访问名称，Enter、Space 和点击均触发打开调用。

## 本机注册盘点

以下是 DSH `0.2.3-alpha.2` 的 Cordis `Slots/listSubTree` 对 `sidebar.footer.action` 返回的活动注册，与本机安装清单和客户端构建对照。注册状态表示入口已登记，不代表该入口在当前窗口状态下可见。

| 组件来源 | 安装版本 | 槽内注册 ID |
| --- | --- | --- |
| Cost Meter（`dsh-cost-meter`） | `1.9.93` | `cost-meter`、`cost-meter-peak-alert`、`cost-meter-display-onboarding`、`cost-meter-codex-compat` |
| DSH 官方 Cordis Panel | 随宿主 | `cordis-panel` |
| Remote（`ds-harness-remote`） | `0.6.8` | `ds-harness-remote-workspace` |
| Magpie Connector（`dsh-magpie-connector`） | `0.7.4` | `magpie-usage` |
| Chat Import（`dsh-chat-import`） | `0.26.9` | `chat-import` |
| DSH Mobile（`dsh-mobile`） | `0.9.0` | `dsh-mobile` |

## Windows 桌面现场核对

在 DSH `0.2.3-alpha.2` 的 Windows 桌面窗口（1734×1399）用 Windows UI Automation 读取可访问名称与布局盒。浅暗两种主题的展开与窄栏测量均覆盖五个可见动作。五项同排，均为 36×36 屏幕像素、间隔 4 像素，合计占宽 196 像素。账号菜单在下方独立一行，不计入动作槽。后续展开时也见到费用卡片暂时不在可见入口中，以及它与 Remote 顺序互换。表中的顺序与坐标对应采样时的界面。

### 展开与窄栏

浅暗两种主题下，拖动侧栏分隔线使账号行从 260×44 缩至 244×44 屏幕像素。浅色下再次向内拖动时宽度保持 244。五个按钮的尺寸、位置和 4 像素间距均保持一致，未见换行或裁切。暗色窄栏的实际动作容器在 DOM 中为横向 `flex`，`flex-wrap: nowrap`，`clientWidth` 和 `scrollWidth` 均为 248 CSS px。账号行的 244 屏幕像素与动作容器的 248 CSS px 对应两个不同的盒。

从账号菜单逐次按 `Shift+Tab`，以 UI Automation 确认焦点落点，并对比聚焦前后的屏幕像素。四个展开场景的五项均可依次抵达，键盘逆向遍历与各次采样的可见顺序相反。浅色与暗色窄栏均额外覆盖按钮盒外 4 像素。暗色窄栏这次采样的前两项为 Remote、费用卡片，坐标依次为 (18, 1293)、(58, 1293)。

| 可见入口 | 对应注册 ID | 窗口相对坐标（x, y） | 暗色展开焦点 | 浅色展开及窄栏焦点 |
| --- | --- | --- | --- | --- |
| 费用卡片 | `cost-meter` | (18, 1293) | 约 2 像素蓝色内环 `#7AAAFF` | 约 2 像素蓝色内环 `#4176E6` |
| Remote | `ds-harness-remote-workspace` | (58, 1293) | 约 2 像素浅色内环 `#F9FAFB` | 约 2 像素深色内环 `#0F1115` |
| Magpie 用量 | `magpie-usage` | (98, 1293) | 盒内 41 个像素变化，主要变化色 `#7AAAFF`。四边中点无变化，盒外未采样 | 约 2 像素蓝色外环 `#4176E6`。展开态盒内 41 个、盒外 294 个像素变化 |
| 导入会话 | `chat-import` | (138, 1293) | 约 2 像素浅色内环 `#F9FAFB`。正向 Tab 复测时聚焦前后有 282 个像素变化，失焦后差异归零 | 约 2 像素深色内环 `#0F1115` |
| 移动访问 | `dsh-mobile` | (178, 1293) | 四边中点内侧约 1 像素蓝色 `#7AAAFF`，第二个像素接近背景 | 四边中点内侧可见蓝色 `#4176E6`，盒外另有浅色像素变化 |

### 折叠

在浅色和暗色下收起侧栏后，五个底部动作及账号菜单均从可见控件树中消失。标题栏保留 28×28 像素的「打开侧边栏」与「新建会话」，位置分别为 (20, 6) 和 (56, 6)。收起后焦点落在打开按钮。按 `Tab` 到新建会话，按 `Shift+Tab` 返回打开按钮，按 `Enter` 可重新展开。打开按钮的四边中点都有约 2 像素内环，暗色为 `#7AAAFF`，浅色为 `#4176E6`。这与官方说明中的 Windows 原生标题栏折叠行为一致。 [官方侧栏说明](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/ui-sidebar/README.md#collapse-behavior)

对这个宿主状态，审计应先识别动作槽是否可见；§20 的 36×36 rail 规则适用于宿主保留动作槽的折叠形态。测试后确认主题为「跟随系统」，侧栏展开，账号行恢复至 260×44。

展开与窄栏的图标布局符合 §20 的多入口形态。五项都可通过键盘抵达，其焦点环的颜色、粗细和位置有所不同。导入按钮在四种展开场景均有约 2 像素内环。下方草稿聚焦令牌兼容性，缺环仅在隔离夹具模拟的令牌条件下复现。

### 暗色窄栏的 CSS 焦点取值

用桌面 DevTools 在实际 `Shift+Tab` 触发 `:focus-visible` 时采集计算样式，并核对命中的样式规则和内联声明。五个按钮上的 `--dsw-focus-ring-color` 均为空，`--dsw-alias-state-business-primary` 为 `#7AAAFF`，`--dsw-alias-brand-primary` 为 `#F9FAFB`。

| 入口 | 实际生效的令牌与来源 | 计算轮廓与偏移 |
| --- | --- | --- |
| Remote | 插件选择器直接使用 `--dsw-alias-brand-primary` | `2px solid #F9FAFB`，−2 px |
| 费用卡片 | 插件先取 `--dsw-focus-ring-color`，当前回退至 `--dsw-alias-state-business-primary` | `2px solid #7AAAFF`，−2 px |
| Magpie 用量 | 插件选择器直接使用 `--dsw-alias-state-business-primary` | `2px solid #7AAAFF`，+1 px |
| 导入会话 | 聚焦时写入内联 `outline: 2px solid var(--dsw-alias-brand-primary)` | `2px solid #F9FAFB`，−2 px |
| 移动访问 | 宿主 `:focus-visible` 先取 `--dsw-focus-ring-color`，当前回退至 `--dsw-alias-state-business-primary` | `2px auto #7AAAFF`，0 px |

暗色窄栏的像素差分确认 Magpie 有外环，盒内 41 个、盒外 294 个像素变化。移动访问的 `auto` 轮廓由 Chromium 绘制，2 CSS px 是计算属性值，屏幕上的可见线条以像素差分为准。浅色窄栏的对应实测如下。测试后关闭本次 DevTools，账号行宽度恢复至 260 像素。

### 浅色窄栏的 CSS 焦点取值

在同一桌面窗口确认 `color-scheme: light`，动作槽的 `clientWidth` 和 `scrollWidth` 均为 248 CSS px，账号行宽 244 px。从账号菜单连续按 `Shift+Tab`，在每个按钮命中 `:focus-visible` 时读取计算样式、命中的规则及内联声明。五项的 `--dsw-focus-ring-color` 均为空，`--dsw-alias-state-business-primary` 为 `#4176E6`，`--dsw-alias-brand-primary` 为 `#0F1115`。

| 键盘到达顺序 | 焦点颜色来源 | 计算轮廓 | `outline-offset` |
| --- | --- | --- | --- |
| 移动访问 | 宿主焦点规则回退至业务主色 | `2px auto #4176E6` | `0px` |
| 导入会话 | 插件内联声明直接取品牌主色 | `2px solid #0F1115` | `-2px` |
| Magpie 用量 | 插件规则直接取业务主色 | `2px solid #4176E6` | `1px` |
| 费用卡片 | 插件规则回退至业务主色 | `2px solid #4176E6` | `-2px` |
| Remote | 插件侧栏规则直接取品牌主色 | `2px solid #0F1115` | `-2px` |

两种主题下，每个入口使用的令牌、轮廓样式和偏移一致。浅色计算值也与先前的桌面像素采样吻合。

**配对：** 本次直接测量现有桌面窗口；独立浏览器的配对申请已过期并关闭。DSH 桌面壳经私有 IPC 自动认证，不显示官方浏览器配对审批页。新浏览器如需配对，应由连接同一 Host 的已登录 Web 应用批准。底部的第三方 Remote 入口不是该审批入口。见 [桌面应用说明](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/desktop/README.md#application-overview) 和 [远程连接包说明](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/remote-connection/README.md#use-this-package)。

## 上游 Issue 草稿

**建议侧栏底部导入按钮优先使用宿主焦点令牌，并保留旧令牌回退**

使用 Tab 聚焦侧栏底部的导入按钮时，已安装的 `dsh-chat-import@0.26.9` 在 `:focus-visible` 状态下使用 `--dsw-alias-brand-primary` 绘制焦点环。如果宿主仅提供焦点令牌或语义主色，Chromium 会计算出 `outline-style: none`。在隔离宿主中，图标和文字按钮都可复现，键盘仍能打开导入入口。本机 DSH `0.2.3-alpha.2` 的浅暗展开与窄栏均有可见焦点环。暗色窄栏 DevTools 确认 `--dsw-alias-brand-primary` 当前解析为 `#F9FAFB`。缺环仅在隔离夹具模拟的令牌条件下复现。 [当前源码](https://github.com/Nwflower/dsh-chat-import/blob/6f552826a1c424bd3ad4166de2dd2301c5469bf8/src/client/entry.js#L141-L150)

复现可用本仓探针。它加载已安装的构建，模拟三组宿主令牌，按 Tab 读取实际焦点元素、`:focus-visible` 和计算样式。

```sh
node skills/dsh-ui-conventions/scripts/probe-chat-import-footer.mjs --help
node skills/dsh-ui-conventions/scripts/probe-chat-import-footer.mjs
```

可通过 `--client`、`--react`、`--react-dom`、`--playwright` 和 `--chromium` 指定本机依赖路径。探针用合成按钮和测试色，无需聊天记录、登录信息或网络请求。

| 宿主提供的令牌 | 已安装构建 | 内存补丁 |
| --- | --- | --- |
| 焦点、语义主色与旧品牌令牌 | 旧品牌色 | 焦点色 |
| 仅语义主色 | 无轮廓 | 语义主色 |
| 仅旧品牌令牌 | 旧品牌色 | 旧品牌色 |

候选改动是将 `src/client/entry.js` 中焦点事件的颜色取值改为以下级联，并保留现有 2 px 宽度与 −2 px 偏移。

```js
e.currentTarget.style.outline = "2px solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary, var(--dsw-alias-brand-primary)))";
```

隔离 A/B 测试中，两个按钮形态在三组令牌下都绘制了预期颜色，所有布局指标和可访问名称一致，激活与失焦断言均通过。如果维护者愿意接受修复，可在上游源码实现这一行，按项目流程构建并运行贡献检查。

## 投递记录

本地草稿。上游 [#120 的维护者回复](https://github.com/Nwflower/dsh-chat-import/issues/120#issuecomment-6976985373) 已记录侧栏按钮布局收敛，当前草稿聚焦其中尚未覆盖的焦点令牌兼容性。贡献前先核对最新实现、重复报告和维护者反馈。PR 使用上游模板中的测试检查，并按指南提供经过脱敏的复现。 [贡献指南](https://github.com/Nwflower/dsh-chat-import/blob/main/docs/CONTRIBUTING.md) · [PR 模板](https://github.com/Nwflower/dsh-chat-import/blob/main/.github/PULL_REQUEST_TEMPLATE.md)
