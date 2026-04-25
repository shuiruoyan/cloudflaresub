# CloudflareSub 四主题视觉重设计

## 背景与目标

当前 CloudflareSub 管理后台的配色以深蓝黑底 + 亮蓝强调色为主，视觉上色彩相近、层次不清，且装饰元素（扫描线、网格背景、渐变顶边、按钮扫光）叠加后显得杂乱。

本次重设计的目标是：
- 建立一套协调、精致、有辨识度的视觉系统
- 提供 4 种色系主题，每种含独立深色/浅色变体
- 去掉冗余装饰，让内容和功能成为视觉焦点
- 提升表格、表单、卡片等核心组件的可用性和美感

## 设计方向：编辑杂志风

参考 Monocle 杂志、高端 SaaS 仪表盘的克制美学：
- **大留白** — 减少视觉噪音，让界面呼吸
- **低饱和强调色** — 避免荧光感，追求精致
- **明确的层级** — 通过字重、字号、色彩对比建立信息层级
- **功能性优先** — 每个视觉元素都有存在的理由

## 主题系统

### 存储模型

localStorage 存储两个键：
- `themeFamily`: `terracotta` | `sage` | `rose` | `teal`
- `themeMode`: `dark` | `light`

组合成 `data-theme` 属性：`terracotta-dark`, `terracotta-light`, `sage-dark`, ... 共 8 种。

### 色系定义

所有主题共享相同的背景/文字灰阶，仅强调色不同：

**共享灰阶（所有主题）**
| Token | 深色 | 浅色 |
|-------|------|------|
| `--bg` | `#0f1115` | `#f5f2ed` |
| `--card` | `#1a1d23` | `#ffffff` |
| `--card-border` | `rgba(255,255,255,0.06)` | `rgba(0,0,0,0.06)` |
| `--text` | `#e8e6e3` | `#1a1a1a` |
| `--muted` | `#8a8580` | `#6b6b6b` |
| `--line` | `rgba(255,255,255,0.04)` | `rgba(0,0,0,0.04)` |

**赤陶橘 (terracotta)**
| Token | 深色 | 浅色 |
|-------|------|------|
| `--accent` | `#c4785a` | `#a0522d` |
| `--accent-dim` | `rgba(196,120,90,0.12)` | `rgba(160,82,45,0.08)` |
| `--accent-text` | `#e8e6e3` | `#ffffff` |
| 情绪标签 | 温暖 · 大地 · 手工感 |

**鼠尾草绿 (sage)**
| Token | 深色 | 浅色 |
|-------|------|------|
| `--accent` | `#7daa7d` | `#4a7c4a` |
| `--accent-dim` | `rgba(125,170,125,0.12)` | `rgba(74,124,74,0.08)` |
| `--accent-text` | `#0f1115` | `#ffffff` |
| 情绪标签 | 自然 · 平静 · 现代 |

**烟灰玫瑰 (rose)**
| Token | 深色 | 浅色 |
|-------|------|------|
| `--accent` | `#c97a7a` | `#a05050` |
| `--accent-dim` | `rgba(201,122,122,0.12)` | `rgba(160,80,80,0.08)` |
| `--accent-text` | `#ffffff` | `#ffffff` |
| 情绪标签 | 柔和 · 优雅 · 独特 |

**深青灰 (teal)**
| Token | 深色 | 浅色 |
|-------|------|------|
| `--accent` | `#5a9e9e` | `#2d6b6b` |
| `--accent-dim` | `rgba(90,158,158,0.12)` | `rgba(45,107,107,0.08)` |
| `--accent-text` | `#ffffff` | `#ffffff` |
| 情绪标签 | 冷静 · 专业 · 克制 |

### 危险/警告色（跨主题固定）
- `--danger`: `#c45c5c`（深色）/ `#dc2626`（浅色）
- `--warning`: `#c9a04c`（深色）/ `#c2410c`（浅色）

## 排版系统

保留现有字体栈：
- Display: `"Syne", "Noto Sans SC", sans-serif`
- Body: `"Sora", "Noto Sans SC", sans-serif`
- Mono: `"JetBrains Mono", ui-monospace, monospace`

调整：
- 正文行高从 `1.65` 提升到 `1.7`
- Hero 标题字重保持 700，但增加 `-0.03em` 字间距提升精致感
- 表格表头使用 `letter-spacing: 0.15em` 的大写字母间距（保持）
- 标签/hint 文字不再全部大写，改为正常大小写 + 字重区分，减少视觉噪音

## 布局调整

### 全局
- 移除 `body::before` 扫描线背景
- 移除登录页的扫描线和网格背景
- 移除所有卡片 `::before` 渐变顶边装饰
- 卡片圆角统一为 `10px`，阴影更柔和：`0 8px 32px rgba(0,0,0,0.12)`（深色）/ `0 2px 12px rgba(0,0,0,0.06)`（浅色）
- 区块间距从 `20px-24px` 提升到 `28px`
- 最大容器宽度保持 `min(1200px, calc(100% - 32px))`

### 登录页
- 背景改为纯色 `var(--bg)`，不加任何纹理
- 登录卡片去掉渐变顶边，保留 `backdrop-filter: blur(20px)`
- 状态指示器从脉冲圆点改为静态颜色标识，减少动画干扰
- 输入框聚焦时去掉底部发光条，改为边框颜色变化 +  subtle glow

### Hero 区域
- 保持两列网格布局
- 主题切换按钮从当前方形图标按钮改为**下拉选择器**：点击后弹出 4 个色系的色板 + 深浅切换开关
- 增加当前主题名称的文字显示

### 模式切换器（聚合/优选 IP）
- 去掉滑动指示器动画，改用**药丸式 tab**
- 选中状态：背景 `var(--accent-dim)` + 文字 `var(--accent)` + 边框 `var(--accent)` 25%
- 未选中状态：透明背景 + `var(--muted)` 文字
- 减少内边距，更紧凑精致

### 表单区域
- textarea / input 边框从 `rgba(148,163,184,0.18)` 改为 `var(--card-border)`
- 聚焦状态：`border-color: var(--accent)` + `box-shadow: 0 0 0 3px var(--accent-dim)`
- 去掉所有按钮的 `::before` 扫光动画
- 按钮悬停：背景加深 + `translateY(-1px)` + 更柔和的阴影
- 按钮使用 `--accent` 实心色（深色主题中部分按钮可能用 `--accent-text` 作为文字色）

### 订阅结果区
- 客户端标签页（Auto/V2rayN/Clash/...）改为更简洁的 tab 样式
- URL 展示区的终端风格去掉 `$` prompt，改为更干净的只读输入框
- 统计面板数字使用 `--accent` 色，保持大字号突出

### 节点预览表格
- 表头：小号大写字母间距，颜色 `var(--accent)`，背景 `var(--bg)` 带轻微透明度
- 数据行：边框减淡到 `var(--line)`，悬停时整行背景变为 `var(--accent-dim)`
- 删除按钮改为更克制的图标，悬停时才显示颜色
- 分页器文字按钮去掉下划线风格，保持简洁

### 模态框与 Toast
- 模态框背景从 `#0e1528` 改为 `var(--card)`，去掉渐变顶边
- Toast 左边框颜色跟随主题 accent 色
- 确认对话框按钮样式统一为实心主按钮 + 描边次要按钮

## 组件规范

### 按钮
```css
button.primary {
  background: var(--accent);
  color: var(--accent-text);
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 12px 20px;
  font-weight: 600;
  transition: opacity 0.2s, transform 0.2s, box-shadow 0.2s;
}
button.primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--accent-dim);
}

button.secondary {
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--card-border);
}
button.secondary:hover {
  border-color: var(--accent);
  color: var(--text);
}
```

### 卡片
```css
.card {
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: 10px;
  padding: 28px;
  box-shadow: var(--shadow);
}
```

### 输入框
```css
input, textarea {
  background: var(--bg);
  border: 1px solid var(--card-border);
  border-radius: 6px;
  padding: 14px 16px;
  color: var(--text);
  transition: border-color 0.2s, box-shadow 0.2s;
}
input:focus, textarea:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-dim);
  outline: none;
}
```

## 响应式

保持现有断点：
- `max-width: 920px`：两列布局折叠为单列
- `max-width: 640px`：移动端优化，按钮全宽，表格横向滚动

## 无障碍

- 所有主题需满足 WCAG 2.1 AA 对比度标准
- 浅色主题中 `--accent` 与 `--bg` 的对比度 ≥ 4.5:1
- 深色主题中 `--text` 与 `--bg` 的对比度 ≥ 7:1
- 主题切换需可通过键盘操作
- 保持现有的 ARIA 属性

## 实现范围

### 修改文件
- `public/styles.css` — 主题变量重构、组件样式更新、装饰元素移除
- `public/app.js` — 主题切换逻辑重构（从 binary dark/light 改为 family+mode）
- `public/index.html` — 主题初始化 inline script 更新、主题选择器 DOM 结构调整

### 不修改的文件
- `src/worker.js` — 后端不受主题影响
- `src/core.js` — 纯逻辑模块
- `tests/smoke.mjs` — 功能测试不受 UI 主题影响

## 验证标准

- [ ] 四种主题的深色/浅色变体都能正常切换
- [ ] 刷新页面后主题选择保持
- [ ] 所有现有功能（表单提交、表格筛选/排序/分页、节点删除、二维码、模态框）正常工作
- [ ] smoke tests 通过
- [ ] 在桌面端和移动端都视觉协调
