# CloudflareSub 四主题视觉重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the binary dark/light theme with a four-family editorial theme system (terracotta, sage, rose, teal), each with dark/light variants, and update all component styles to match the new design spec.

**Architecture:** CSS custom properties drive all colors. Eight complete `[data-theme="{family}-{mode}"]` variable blocks replace the current `:root` + `[data-theme="light"]` split. `localStorage` stores `themeFamily` and `themeMode`. A dropdown selector in the hero replaces the single toggle button. Mode tabs switch from sliding indicator to pill-style active state.

**Tech Stack:** Vanilla JS, CSS custom properties, no build step.

---

### Task 1: Refactor CSS Theme Variables

**Files:**
- Modify: `public/styles.css:1-107` (existing `:root` and `[data-theme="light"]` blocks)

- [ ] **Step 1: Replace `:root` and `[data-theme="light"]` with eight complete theme blocks**

Replace lines 1–107 of `styles.css` with:

```css
:root {
  font-family: "Sora", "Noto Sans SC", sans-serif;
}

[data-theme="terracotta-dark"] {
  --bg: #0f1115;
  --card: #1a1d23;
  --card-border: rgba(255, 255, 255, 0.06);
  --line: rgba(255, 255, 255, 0.04);
  --text: #e8e6e3;
  --muted: #8a8580;
  --accent: #c4785a;
  --accent-dim: rgba(196, 120, 90, 0.12);
  --accent-text: #e8e6e3;
  --warning: #c9a04c;
  --warning-text: #e8c87a;
  --danger: #c45c5c;
  --shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

[data-theme="terracotta-light"] {
  --bg: #f5f2ed;
  --card: #ffffff;
  --card-border: rgba(0, 0, 0, 0.06);
  --line: rgba(0, 0, 0, 0.04);
  --text: #1a1a1a;
  --muted: #6b6b6b;
  --accent: #a0522d;
  --accent-dim: rgba(160, 82, 45, 0.08);
  --accent-text: #ffffff;
  --warning: #c2410c;
  --warning-text: #9a3412;
  --danger: #dc2626;
  --shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

[data-theme="sage-dark"] {
  --bg: #0f1115;
  --card: #1a1d23;
  --card-border: rgba(255, 255, 255, 0.06);
  --line: rgba(255, 255, 255, 0.04);
  --text: #e8e6e3;
  --muted: #8a8580;
  --accent: #7daa7d;
  --accent-dim: rgba(125, 170, 125, 0.12);
  --accent-text: #0f1115;
  --warning: #c9a04c;
  --warning-text: #e8c87a;
  --danger: #c45c5c;
  --shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

[data-theme="sage-light"] {
  --bg: #f5f2ed;
  --card: #ffffff;
  --card-border: rgba(0, 0, 0, 0.06);
  --line: rgba(0, 0, 0, 0.04);
  --text: #1a1a1a;
  --muted: #6b6b6b;
  --accent: #4a7c4a;
  --accent-dim: rgba(74, 124, 74, 0.08);
  --accent-text: #ffffff;
  --warning: #c2410c;
  --warning-text: #9a3412;
  --danger: #dc2626;
  --shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

[data-theme="rose-dark"] {
  --bg: #0f1115;
  --card: #1a1d23;
  --card-border: rgba(255, 255, 255, 0.06);
  --line: rgba(255, 255, 255, 0.04);
  --text: #e8e6e3;
  --muted: #8a8580;
  --accent: #c97a7a;
  --accent-dim: rgba(201, 122, 122, 0.12);
  --accent-text: #ffffff;
  --warning: #c9a04c;
  --warning-text: #e8c87a;
  --danger: #c45c5c;
  --shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

[data-theme="rose-light"] {
  --bg: #f5f2ed;
  --card: #ffffff;
  --card-border: rgba(0, 0, 0, 0.06);
  --line: rgba(0, 0, 0, 0.04);
  --text: #1a1a1a;
  --muted: #6b6b6b;
  --accent: #a05050;
  --accent-dim: rgba(160, 80, 80, 0.08);
  --accent-text: #ffffff;
  --warning: #c2410c;
  --warning-text: #9a3412;
  --danger: #dc2626;
  --shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

[data-theme="teal-dark"] {
  --bg: #0f1115;
  --card: #1a1d23;
  --card-border: rgba(255, 255, 255, 0.06);
  --line: rgba(255, 255, 255, 0.04);
  --text: #e8e6e3;
  --muted: #8a8580;
  --accent: #5a9e9e;
  --accent-dim: rgba(90, 158, 158, 0.12);
  --accent-text: #ffffff;
  --warning: #c9a04c;
  --warning-text: #e8c87a;
  --danger: #c45c5c;
  --shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

[data-theme="teal-light"] {
  --bg: #f5f2ed;
  --card: #ffffff;
  --card-border: rgba(0, 0, 0, 0.06);
  --line: rgba(0, 0, 0, 0.04);
  --text: #1a1a1a;
  --muted: #6b6b6b;
  --accent: #2d6b6b;
  --accent-dim: rgba(45, 107, 107, 0.08);
  --accent-text: #ffffff;
  --warning: #c2410c;
  --warning-text: #9a3412;
  --danger: #dc2626;
  --shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

h1, h2, h3, .eyebrow {
  font-family: "Syne", "Noto Sans SC", sans-serif;
}
```

- [ ] **Step 2: Verify no syntax errors**

Open `public/styles.css` in a browser dev tools or run a basic CSS validator. The file should parse without errors.

---

### Task 2: Remove Decorative Elements & Update Base Styles

**Files:**
- Modify: `public/styles.css:30-140` (body, scanline, scrollbar, container, card base)

- [ ] **Step 1: Replace body and card base styles**

Replace the block from `body {` through the end of `.card::before` (approximately lines 31–141) with:

```css
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  color: var(--text);
  background: var(--bg);
  line-height: 1.7;
}

/* ===== Scrollbar ===== */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--card-border);
  border-radius: 4px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--muted);
  border: 2px solid transparent;
  background-clip: padding-box;
}

/* Firefox */
html {
  scrollbar-width: thin;
  scrollbar-color: var(--card-border) transparent;
}

/* ===== Layout ===== */
.container {
  width: min(1200px, calc(100% - 32px));
  margin: 0 auto;
  padding: 32px 0 56px;
  position: relative;
}

/* ===== Cards ===== */
.card {
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: 10px;
  position: relative;
  backdrop-filter: blur(20px);
  box-shadow: var(--shadow);
}
```

This removes:
- `body::before` scanline overlay
- Body radial-gradient backgrounds
- `.card::before` gradient top border
- Old scrollbar hardcoded colors

---

### Task 3: Update Hero & Theme Toggle Styles

**Files:**
- Modify: `public/styles.css:143-304` (hero, theme toggle)

- [ ] **Step 1: Replace hero and theme toggle styles**

Replace from `.hero {` through the end of the theme toggle section (through line ~304) with:

```css
/* ===== Hero ===== */
.hero {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 24px;
  padding: 24px;
  margin-bottom: 28px;
  align-items: center;
}

.hero :is(h1, h2, h3, p) {
  margin-top: 0;
}

.hero h1 {
  margin-bottom: 8px;
}

.hero-title {
  font-size: clamp(1.3rem, 2.8vw, 1.9rem);
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  letter-spacing: -0.03em;
}

.hero-logo {
  width: 1.1em;
  height: 1.1em;
  flex: 0 0 auto;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--accent);
  font-size: 0.65rem;
  margin: 0 0 8px;
  opacity: 0.65;
  font-weight: 600;
}

.lead {
  color: var(--muted);
  font-size: 0.84rem;
  margin: 0;
  max-width: 100%;
  line-height: 1.5;
}

.hero-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 16px;
  align-self: start;
}

.hero-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* ===== Logout Button ===== */
.logout-btn {
  appearance: none;
  border: 1px solid var(--card-border);
  border-radius: 6px;
  width: 40px;
  height: 40px;
  padding: 0;
  display: grid;
  place-items: center;
  background: var(--card);
  color: var(--muted);
  cursor: pointer;
  transition: all 0.25s ease;
}

.logout-btn svg {
  width: 18px;
  height: 18px;
}

.logout-btn:hover {
  background: rgba(196, 92, 92, 0.1);
  border-color: rgba(196, 92, 92, 0.3);
  color: var(--danger);
  transform: translateY(-1px);
}

/* ===== Theme Selector ===== */
.theme-selector {
  position: relative;
}

.theme-selector-trigger {
  appearance: none;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--card-border);
  background: var(--card);
  color: var(--text);
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
  font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.theme-selector-trigger:hover {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-dim);
}

.theme-current-swatch {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}

.theme-selector-chevron {
  width: 14px;
  height: 14px;
  color: var(--muted);
  flex-shrink: 0;
}

.theme-selector-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 100;
  width: 220px;
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: 10px;
  padding: 12px;
  box-shadow: var(--shadow);
  backdrop-filter: blur(20px);
}

.theme-selector-dropdown.hidden {
  display: none;
}

.theme-selector-families {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.theme-family-btn {
  appearance: none;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 500;
  font-family: inherit;
  transition: all 0.2s;
  text-align: left;
}

.theme-family-btn:hover {
  background: var(--accent-dim);
}

.theme-family-btn.active {
  border-color: var(--accent);
  background: var(--accent-dim);
}

.theme-family-swatch {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid var(--card-border);
}

.theme-family-btn.active .theme-family-swatch {
  border-color: var(--accent);
}

.theme-selector-divider {
  height: 1px;
  background: var(--line);
  margin: 10px 0;
}

.theme-selector-modes {
  display: flex;
  gap: 6px;
}

.theme-mode-btn {
  appearance: none;
  flex: 1;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 500;
  font-family: inherit;
  transition: all 0.2s;
}

.theme-mode-btn:hover {
  background: var(--accent-dim);
  color: var(--text);
}

.theme-mode-btn.active {
  border-color: var(--accent);
  background: var(--accent-dim);
  color: var(--accent);
}
```

---

### Task 4: Update Forms, Inputs, Buttons

**Files:**
- Modify: `public/styles.css:345-583` (forms, inputs, buttons)

- [ ] **Step 1: Replace form, input, and button styles**

Replace from `label {` through the end of `button.warning:hover` (lines ~345–583) with:

```css
/* ===== Forms ===== */
label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--muted);
  letter-spacing: 0.04em;
}

textarea {
  resize: vertical;
  min-height: 120px;
}

#nodeLinks,
#preferredIps,
#aggregateNodeLinks {
  resize: none;
}

textarea,
input[type="text"],
input[readonly] {
  width: 100%;
  border-radius: 6px;
  border: 1px solid var(--card-border);
  background: var(--bg);
  color: var(--text);
  padding: 14px 16px;
  font-size: 0.86rem;
  line-height: 1.6;
  outline: none;
  font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}

textarea:focus,
input[type="text"]:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-dim);
}

input[readonly] {
  background: var(--bg);
  color: var(--muted);
  font-size: 0.78rem;
  font-family: "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
}

textarea::placeholder,
input[type="text"]::placeholder {
  color: var(--muted);
  opacity: 0.5;
}

#namePrefix {
  padding: 10px 14px;
}

.hint {
  color: var(--muted);
  font-size: 0.8rem;
  margin-top: 8px;
  line-height: 1.6;
  opacity: 0.85;
}

.hint code {
  color: var(--accent);
  background: var(--accent-dim);
  padding: 1px 5px;
  border-radius: 3px;
  font-family: "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  font-size: 0.8em;
}

.checkbox-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 12px 14px;
  border-radius: 6px;
  border: 1px solid var(--card-border);
  background: var(--bg);
}

.checkbox-wrap label {
  margin: 0;
  font-weight: 500;
  letter-spacing: 0;
  font-size: 0.86rem;
  color: var(--text);
}

.checkbox-wrap .checkbox-hint {
  margin: 6px 0 0 26px;
  font-size: 0.76rem;
  line-height: 1.5;
  opacity: 0.75;
}

.checkbox-wrap input {
  width: 16px;
  height: 16px;
  accent-color: var(--accent);
}

/* ===== Buttons ===== */
.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 8px;
  align-items: center;
  justify-content: flex-end;
}

.actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 44px;
}

.action-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 16px;
  border-radius: 6px;
  border: 1px solid var(--card-border);
  background: var(--bg);
  font-size: 0.84rem;
  color: var(--text);
  cursor: pointer;
  user-select: none;
  margin-right: auto;
  height: 44px;
}

.action-checkbox input {
  width: 16px;
  height: 16px;
  accent-color: var(--accent);
  margin: 0;
  cursor: pointer;
}

button {
  appearance: none;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 12px 20px;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  background: var(--accent);
  color: var(--accent-text);
  font-family: inherit;
  transition: opacity 0.2s, transform 0.2s, box-shadow 0.2s;
}

button:hover {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--accent-dim);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

button.secondary {
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--card-border);
}

button.secondary:hover {
  border-color: var(--accent);
  color: var(--text);
  box-shadow: none;
  opacity: 1;
}

button.small {
  padding: 10px 14px;
  font-size: 0.76rem;
}

button.warning {
  background: rgba(201, 160, 76, 0.15);
  color: var(--warning);
  border: 1px solid rgba(201, 160, 76, 0.3);
}

button.warning:hover {
  background: rgba(201, 160, 76, 0.25);
  border-color: rgba(201, 160, 76, 0.45);
  box-shadow: 0 4px 12px rgba(201, 160, 76, 0.1);
  opacity: 1;
}
```

This removes:
- All `button::before` shine effects
- Hardcoded border/focus colors on inputs
- `text-transform: uppercase` from labels
- Old gradient/hardcoded button backgrounds

---

### Task 5: Update Result Section, Client Tabs, URL Display

**Files:**
- Modify: `public/styles.css:637-911` (result section, client tabs, URL display)

- [ ] **Step 1: Replace result section styles**

Replace from `#resultSection {` through `.url-hint` (lines ~637–911) with:

```css
/* ===== Result Section ===== */
#resultSection {
  margin-top: 28px;
}

.section-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: end;
  margin-bottom: 4px;
}

.section-head h2 {
  margin: 0 0 4px;
  font-size: 1.2rem;
  font-weight: 700;
}

.section-desc {
  margin-top: 8px;
  color: var(--muted);
  font-size: 0.86rem;
  line-height: 1.6;
}

/* ===== URL Status ===== */
.url-status {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 6px;
  background: var(--accent-dim);
  border: 1px solid var(--card-border);
  font-size: 0.84rem;
}

.status-badge {
  color: var(--accent);
}

.status-badge code {
  background: var(--accent-dim);
  padding: 2px 8px;
  border-radius: 3px;
  font-family: "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  color: var(--accent);
  font-size: 0.9em;
}

/* ===== URL Generator ===== */
.url-generator {
  display: grid;
  gap: 16px;
}

.url-gen-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.url-gen-title {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.url-gen-title h3 {
  margin: 0;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--muted);
  font-weight: 700;
}

.url-gen-desc {
  margin: 0;
  font-size: 0.8rem;
  color: var(--muted);
  opacity: 0.7;
}

.url-gen-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.url-gen-meta .url-status,
.url-gen-meta .stats-bar {
  margin: 0;
  padding: 8px 12px;
  font-size: 0.78rem;
}

/* Client Tabs */
.client-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: thin;
  scrollbar-color: var(--card-border) transparent;
}

.client-tabs::-webkit-scrollbar {
  height: 4px;
}

.client-tabs::-webkit-scrollbar-track {
  background: transparent;
}

.client-tabs::-webkit-scrollbar-thumb {
  background: var(--card-border);
  border-radius: 2px;
}

.client-tab {
  appearance: none;
  border: 1px solid var(--card-border);
  border-radius: 6px;
  padding: 10px 14px;
  background: var(--bg);
  color: var(--muted);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 76px;
  transition: background 0.2s, border-color 0.2s, color 0.2s, transform 0.2s;
  position: relative;
}

.client-tab:hover {
  border-color: var(--accent);
  background: var(--accent-dim);
  color: var(--text);
  transform: translateY(-1px);
}

.client-tab:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.client-tab.active {
  border-color: var(--accent);
  background: var(--accent-dim);
  color: var(--accent);
}

.client-tab.active .tab-name {
  color: var(--accent);
}

.tab-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: var(--accent-dim);
  border: 1px solid var(--card-border);
}

.tab-icon img {
  width: 16px;
  height: 16px;
  display: block;
}

.tab-name {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.tab-desc {
  font-size: 0.62rem;
  opacity: 0.6;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

/* URL Display */
.url-display {
  display: grid;
  gap: 12px;
}

.url-terminal {
  display: flex;
  align-items: center;
  gap: 0;
  border-radius: 8px;
  border: 1px solid var(--card-border);
  background: var(--bg);
  overflow: hidden;
}

.url-terminal input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 14px 16px;
  font-size: 0.82rem;
  color: var(--text);
  font-family: "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  outline: none;
  min-width: 0;
}

.url-terminal input:focus {
  border: none;
  box-shadow: none;
}

.url-actions {
  display: flex;
  gap: 10px;
}

.url-actions button {
  flex: 0 0 auto;
  padding: 6px 14px;
  font-size: 0.8rem;
}

.url-hint {
  margin-top: 4px;
  text-align: center;
  font-size: 0.75rem;
  opacity: 0.6;
}
```

This removes:
- `.url-prompt` (the `>` terminal prompt symbol)
- Hardcoded client tab colors
- `.client-tab.active::after` gradient top line
- Hardcoded tab icon backgrounds

---

### Task 6: Update Stats, Table, Preview Styles

**Files:**
- Modify: `public/styles.css:992-1525` (stats, table, preview)

- [ ] **Step 1: Replace stats bar and table styles**

Replace from `.stats-bar {` through the end of `.preview-empty-content span` (lines ~992–1525) with:

```css
/* ===== Stats Bar ===== */
.stats-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--card-border);
  background: var(--bg);
  font-size: 0.82rem;
  margin-bottom: 16px;
}

.stat-item {
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-item strong {
  color: var(--accent);
  font-weight: 700;
  font-size: 1rem;
}

.stat-divider {
  width: 1px;
  height: 14px;
  background: var(--card-border);
}

/* ===== Preview Table ===== */
.preview-wrap {
  margin-top: 8px;
}

.preview-wrap h3 {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--muted);
  margin: 0;
  font-weight: 700;
}

.preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;
  flex-wrap: wrap;
}

.preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 12px;
  flex-wrap: wrap;
}

.col-check { width: 44px; }
.col-index { width: 52px; }
.col-name { width: 280px; }
.col-type { width: 80px; }
.col-server { width: 180px; }
.col-port { width: 72px; }
.col-host { width: 140px; }
.col-sni { width: 140px; }
.col-action { width: 60px; }

.col-index {
  text-align: center;
  color: var(--muted);
  font-size: 0.78rem;
}

.col-check {
  text-align: center;
}

.col-check input[type="checkbox"] {
  cursor: pointer;
  width: 14px;
  height: 14px;
  appearance: none;
  -webkit-appearance: none;
  border: 1.5px solid var(--muted);
  border-radius: 3px;
  background: transparent;
  position: relative;
  transition: border-color 0.15s, background 0.15s;
}

.col-check input[type="checkbox"]:checked {
  background: var(--accent);
  border-color: var(--accent);
}

.col-check input[type="checkbox"]:checked::after {
  content: "";
  position: absolute;
  left: 3.5px;
  top: 0.5px;
  width: 4px;
  height: 8px;
  border: solid #fff;
  border-width: 0 1.5px 1.5px 0;
  transform: rotate(45deg);
}

.col-action {
  text-align: center;
}

.table-wrap td:nth-child(3),
.table-wrap td:nth-child(5),
.table-wrap td:nth-child(7),
.table-wrap td:nth-child(8) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 0;
}

.btn-delete {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}

.btn-delete:hover {
  color: var(--danger);
  background: rgba(196, 92, 92, 0.12);
}

.btn-delete svg {
  width: 14px;
  height: 14px;
}

.btn-danger {
  background: rgba(196, 92, 92, 0.12);
  color: var(--danger);
  border-color: rgba(196, 92, 92, 0.25);
}

.btn-danger:hover:not(:disabled) {
  background: rgba(196, 92, 92, 0.2);
  color: var(--danger);
  border-color: rgba(196, 92, 92, 0.4);
  box-shadow: 0 4px 12px rgba(196, 92, 92, 0.1);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.page-info {
  font-size: 0.8rem;
  color: var(--muted);
  min-width: 60px;
  text-align: center;
}

.page-size {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--muted);
  line-height: 1;
}

.text-btn {
  background: transparent;
  border: none;
  color: var(--muted);
  font-size: 0.84rem;
  padding: 4px 8px;
  height: auto;
  line-height: 1.4;
}

.text-btn:hover {
  color: var(--text);
  background: var(--accent-dim);
}

.text-btn:disabled {
  opacity: 0.35;
  background: transparent;
}

.page-size label {
  display: inline-flex;
  align-items: center;
  line-height: 1;
  margin-bottom: 0;
}

.page-size select {
  background: var(--card);
  color: var(--text);
  border: 1px solid var(--card-border);
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 0.8rem;
  cursor: pointer;
  line-height: 1.4;
}

.table-wrap {
  overflow-x: auto;
  overflow-y: auto;
  max-height: 560px;
  border-radius: 6px;
  border: 1px solid var(--card-border);
}

.table-wrap table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  min-width: 1048px;
  font-size: 0.84rem;
}

.table-wrap th,
.table-wrap td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--line);
}

.table-wrap thead tr {
  position: sticky;
  top: 0;
  z-index: 2;
}

.table-wrap th {
  color: var(--accent);
  background: var(--bg);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-weight: 700;
  white-space: nowrap;
}

.table-wrap th.sortable {
  cursor: pointer;
  user-select: none;
}

.table-wrap th.sortable:hover {
  color: var(--text);
}

.sort-indicator {
  font-size: 0.65em;
  color: var(--accent);
  min-width: 0.9em;
  text-align: center;
  display: inline-block;
  line-height: 1;
}

.table-wrap th {
  position: relative;
}

.th-content {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.th-filter-icon {
  width: 14px;
  height: 14px;
  padding: 2px;
  margin: -2px;
  cursor: pointer;
  color: var(--muted);
  flex-shrink: 0;
  transition: color 0.2s, transform 0.2s, opacity 0.2s;
  opacity: 0.7;
}

.th-filter-icon:hover {
  color: var(--text);
  opacity: 1;
  transform: scale(1.15);
}

.th-filter-icon.active {
  color: var(--accent);
  opacity: 1;
}

.table-wrap th.has-filter {
  border-bottom: 2px solid var(--accent);
}

.th-filter-popover {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 10;
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 12px;
  min-width: 160px;
  box-shadow: var(--shadow);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transform-origin: top left;
  transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s;
  opacity: 1;
  transform: translateY(0) scale(1);
  visibility: visible;
}

.th-filter-popover.hidden {
  opacity: 0;
  transform: translateY(-4px) scale(0.96);
  pointer-events: none;
  visibility: hidden;
}

.th-filter-popover::before {
  content: '';
  position: absolute;
  top: -5px;
  left: 14px;
  width: 8px;
  height: 8px;
  background: var(--card);
  border-left: 1px solid var(--card-border);
  border-top: 1px solid var(--card-border);
  transform: rotate(45deg);
}

.th-filter-popover input,
.th-filter-popover select {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--card-border);
  border-radius: 6px;
  padding: 6px 10px;
  color: var(--text);
  font-size: 0.85rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.th-filter-popover input:focus,
.th-filter-popover select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-dim);
}

.th-filter-popover input::placeholder {
  color: var(--muted);
}

.table-wrap tr:last-child td {
  border-bottom: none;
}

.table-wrap td {
  color: var(--muted);
}

.table-wrap tbody tr:hover td {
  background: var(--accent-dim);
}

.preview-empty-row td {
  border-bottom: none;
  padding: 48px 16px;
}

.preview-empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--muted);
  text-align: center;
}

.preview-empty-content svg {
  width: 40px;
  height: 40px;
  opacity: 0.35;
  stroke-width: 1.2;
}

.preview-empty-content p {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text);
  opacity: 0.6;
}

.preview-empty-content span {
  font-size: 0.8rem;
  opacity: 0.45;
}
```

Key changes:
- Table row hover uses `var(--accent-dim)` on the entire row
- Table header background is `var(--bg)`
- Borders use `var(--line)`
- Delete button starts as muted, only shows danger on hover
- Removed hardcoded filter accent colors

---

### Task 7: Update Modal & Toast Styles

**Files:**
- Modify: `public/styles.css:1526-2165` (modal, toast, responsive)

- [ ] **Step 1: Replace modal and toast styles**

Replace from `.modal {` through the end of `@media (max-width: 640px)` for toast/confirm sections (lines ~1526–2165) with:

```css
/* ===== Modal ===== */
.modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  opacity: 1;
  transition: opacity 0.25s ease;
}

.modal.hidden {
  display: none;
  opacity: 0;
}

.modal:not(.hidden) .modal-backdrop {
  animation: modalFadeIn 0.25s ease;
}

.modal:not(.hidden) .modal-dialog {
  animation: modalScaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes modalScaleIn {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.92); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

.modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
}

.modal-dialog {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(92vw, 400px);
  margin: 0;
  padding: 24px;
  border-radius: 10px;
  background: var(--card);
  border: 1px solid var(--card-border);
  box-shadow: var(--shadow);
  z-index: 1;
}

.modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.modal-head h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
}

.modal-body {
  display: grid;
  gap: 16px;
  justify-items: center;
}

.qr-box {
  width: 244px;
  min-height: 244px;
  padding: 12px;
  border-radius: 8px;
  background: #fff;
  display: grid;
  place-items: center;
}

.qr-text {
  word-break: break-all;
  text-align: center;
  font-size: 0.76rem;
  color: var(--muted);
}

/* ===== Confirm Dialog ===== */
.confirm-dialog {
  width: min(92vw, 360px);
  text-align: center;
}

.confirm-message {
  margin: 8px 0 24px;
  font-size: 0.92rem;
  line-height: 1.7;
  color: var(--text);
  word-break: break-word;
}

.confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.confirm-actions button {
  min-width: 100px;
}

.confirm-actions button.secondary {
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--card-border);
}

.confirm-actions button.secondary:hover {
  border-color: var(--accent);
  color: var(--text);
}

/* ===== Toast Notifications ===== */
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  min-width: 260px;
  max-width: 400px;
  padding: 14px 18px;
  border-radius: 8px;
  background: var(--card);
  border: 1px solid var(--card-border);
  border-left: 3px solid var(--accent);
  box-shadow: var(--shadow);
  font-size: 0.86rem;
  line-height: 1.6;
  color: var(--text);
  backdrop-filter: blur(12px);
  animation: toastSlideIn 0.35s ease;
  position: relative;
}

.toast.toast-success { border-left-color: var(--accent); }
.toast.toast-error { border-left-color: var(--danger); }
.toast.toast-warning { border-left-color: var(--warning); }
.toast.toast-info { border-left-color: var(--accent); }

@keyframes toastSlideIn {
  from { transform: translateX(120%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes toastSlideOut {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(120%); opacity: 0; }
}

.toast.toast-exit {
  animation: toastSlideOut 0.3s ease forwards;
}

@media (max-width: 640px) {
  .toast-container {
    top: 12px;
    right: 12px;
    left: 12px;
    align-items: stretch;
  }

  .toast {
    max-width: 100%;
    min-width: 0;
  }

  .confirm-actions {
    flex-direction: column;
  }

  .confirm-actions button {
    width: 100%;
  }
}
```

This removes:
- `.modal-dialog::before` gradient top border
- Hardcoded modal background `#0e1528`
- Hardcoded modal backdrop color
- Hardcoded toast background

---

### Task 8: Update Login Overlay Styles

**Files:**
- Modify: `public/styles.css:1770-2070` (login overlay)

- [ ] **Step 1: Replace login overlay styles**

Replace from `.login-overlay {` through the end of the login section (lines ~1770–2070) with:

```css
/* ===== Login Overlay ===== */
.login-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: grid;
  place-items: center;
  background: var(--bg);
}

.login-overlay.hidden {
  display: none !important;
}

/* Status bar */
.login-status-bar {
  position: absolute;
  top: 24px;
  left: 28px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.78rem;
  color: var(--muted);
  letter-spacing: 0.08em;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
}

/* Main container */
.login-container {
  position: relative;
  z-index: 2;
  width: min(440px, calc(100% - 40px));
}

/* Card */
.login-card {
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: 10px;
  padding: 44px 40px 32px;
  backdrop-filter: blur(20px);
  box-shadow: var(--shadow);
  position: relative;
}

/* Header */
.login-header {
  text-align: center;
  margin-bottom: 36px;
}

.login-icon-wrap {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  border-radius: 12px;
  background: var(--accent-dim);
  border: 1px solid var(--card-border);
  display: grid;
  place-items: center;
}

.login-icon {
  width: 28px;
  height: 28px;
}

.login-title {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.login-title-main {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--text);
  letter-spacing: 0.04em;
  font-family: "Syne", "Noto Sans SC", sans-serif;
}

.login-title-sub {
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--accent);
  letter-spacing: 0.25em;
  opacity: 0.7;
}

/* Form */
.login-form {
  display: grid;
  gap: 24px;
}

.input-group {
  display: grid;
  gap: 10px;
}

.input-group label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--muted);
  text-transform: uppercase;
}

.input-id {
  font-size: 0.65rem;
  color: var(--muted);
  opacity: 0.5;
  font-weight: 500;
}

.input-wrap {
  position: relative;
}

.input-wrap input {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--card-border);
  border-radius: 6px;
  padding: 14px 16px;
  font-size: 0.92rem;
  color: var(--text);
  font-family: inherit;
  letter-spacing: 0.02em;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input-wrap input::placeholder {
  color: var(--muted);
  opacity: 0.5;
  font-size: 0.82rem;
}

.input-wrap input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-dim);
}

/* Submit button */
.login-submit {
  position: relative;
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 6px;
  background: var(--accent);
  color: var(--accent-text);
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  cursor: pointer;
  overflow: hidden;
  transition: opacity 0.2s, transform 0.2s, box-shadow 0.2s;
  margin-top: 4px;
}

.login-submit:hover {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--accent-dim);
}

.login-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Error hint */
.login-error {
  color: var(--danger);
  font-size: 0.82rem;
  line-height: 1.6;
  text-align: center;
  padding: 8px 12px;
  background: rgba(196, 92, 92, 0.08);
  border: 1px solid rgba(196, 92, 92, 0.15);
  border-radius: 6px;
}

/* Footer */
.login-footer {
  margin-top: 28px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.footer-line {
  width: 40px;
  height: 1px;
  background: var(--card-border);
}

.login-footer span {
  font-size: 0.68rem;
  color: var(--muted);
  letter-spacing: 0.1em;
}
```

This removes:
- `.login-scanline` and `.login-grid`
- `.login-card::before` gradient top border
- `.input-glow` and focus effect
- `.btn-shine` sweep animation
- Status dot pulse animation
- All login-specific color variables (now uses main vars)

---

### Task 9: Remove Old Light Theme Overrides & Clean CSS

**Files:**
- Modify: `public/styles.css:2167-2381` (light theme overrides)

- [ ] **Step 1: Remove the entire `[data-theme="light"]` override section**

Delete lines ~2167 through ~2381 (everything from `[data-theme="light"] body {` through the end of the light overrides). With the new 8-theme system, all colors are defined per-theme at the variable level. No element-level overrides are needed.

- [ ] **Step 2: Verify no remaining hardcoded old accent references**

Run a search for `#4a9eff`, `#1677ff`, `rgba(74, 158, 255`, `rgba(22, 119, 255` in `styles.css`. Replace any remaining occurrences with `var(--accent)` or `var(--accent-dim)` as appropriate.

Command:
```bash
grep -n "#4a9eff\|#1677ff\|rgba(74, 158, 255\|rgba(22, 119, 255" public/styles.css
```

Expected: no output (all cleaned).

---

### Task 10: Refactor JS Theme System

**Files:**
- Modify: `public/app.js:809-827` (theme functions)

- [ ] **Step 1: Replace theme functions in app.js**

Replace lines 809–827 with:

```javascript
// Theme system
const THEME_FAMILIES = [
  { key: 'terracotta', label: '赤陶橘' },
  { key: 'sage', label: '鼠尾草' },
  { key: 'rose', label: '烟灰玫瑰' },
  { key: 'teal', label: '深青灰' },
];
const DEFAULT_FAMILY = 'terracotta';

function getSystemMode() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(family, mode) {
  document.documentElement.dataset.theme = `${family}-${mode}`;
}

function initTheme() {
  // Migrate old binary theme
  const oldTheme = localStorage.getItem('theme');
  if (oldTheme === 'light' || oldTheme === 'dark') {
    localStorage.removeItem('theme');
    localStorage.setItem('themeMode', oldTheme);
    localStorage.setItem('themeFamily', DEFAULT_FAMILY);
  }

  const family = localStorage.getItem('themeFamily') || DEFAULT_FAMILY;
  const mode = localStorage.getItem('themeMode') || getSystemMode();
  applyTheme(family, mode);
  updateThemeSelectorUI();
}

function setThemeFamily(family) {
  const mode = localStorage.getItem('themeMode') || getSystemMode();
  localStorage.setItem('themeFamily', family);
  applyTheme(family, mode);
  updateThemeSelectorUI();
}

function toggleThemeMode() {
  const family = localStorage.getItem('themeFamily') || DEFAULT_FAMILY;
  const currentMode = localStorage.getItem('themeMode') || getSystemMode();
  const next = currentMode === 'light' ? 'dark' : 'light';
  localStorage.setItem('themeMode', next);
  applyTheme(family, next);
  updateThemeSelectorUI();
}

function updateThemeSelectorUI() {
  const family = localStorage.getItem('themeFamily') || DEFAULT_FAMILY;
  const mode = localStorage.getItem('themeMode') || getSystemMode();
  const familyInfo = THEME_FAMILIES.find((f) => f.key === family) || THEME_FAMILIES[0];

  const nameEl = document.getElementById('themeCurrentName');
  const swatchEl = document.getElementById('themeCurrentSwatch');
  if (nameEl) nameEl.textContent = familyInfo.label;
  if (swatchEl) swatchEl.style.background = `var(--accent)`;

  document.querySelectorAll('.theme-family-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.family === family);
  });
  document.querySelectorAll('.theme-mode-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
}

function setupThemeSelector() {
  const trigger = document.getElementById('themeSelectorTrigger');
  const dropdown = document.getElementById('themeSelectorDropdown');
  if (!trigger || !dropdown) return;

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = dropdown.classList.contains('hidden');
    dropdown.classList.toggle('hidden', !isHidden);
    trigger.setAttribute('aria-expanded', String(isHidden));
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && e.target !== trigger) {
      dropdown.classList.add('hidden');
      trigger.setAttribute('aria-expanded', 'false');
    }
  });

  dropdown.querySelectorAll('.theme-family-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      setThemeFamily(btn.dataset.family);
    });
  });

  dropdown.querySelectorAll('.theme-mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetMode = btn.dataset.mode;
      const currentMode = localStorage.getItem('themeMode') || getSystemMode();
      if (targetMode !== currentMode) {
        toggleThemeMode();
      }
    });
  });
}

initTheme();
setupThemeSelector();
```

- [ ] **Step 2: Remove old theme toggle event listener**

Delete the old line:
```javascript
document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
```

This line should no longer exist after the replacement above. Verify it is gone.

---

### Task 11: Update HTML Theme Selector & Inline Script

**Files:**
- Modify: `public/index.html:16-22` (inline theme script)
- Modify: `public/index.html:93-96` (theme toggle button)

- [ ] **Step 1: Update inline theme script in `<head>`**

Replace lines 16–22 with:

```html
    <script>
      (function() {
        var old = localStorage.getItem('theme');
        var family = localStorage.getItem('themeFamily') || 'terracotta';
        var mode = localStorage.getItem('themeMode');
        if (old === 'light' || old === 'dark') {
          mode = old;
          family = 'terracotta';
        }
        if (!mode && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
          mode = 'light';
        }
        document.documentElement.dataset.theme = family + '-' + (mode || 'dark');
      })();
    </script>
```

- [ ] **Step 2: Replace theme toggle button with selector**

Replace lines 93–96:

```html
            <button id="themeToggle" type="button" class="theme-toggle" aria-label="切换主题">
              <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            </button>
```

With:

```html
            <div class="theme-selector" id="themeSelector">
              <button type="button" class="theme-selector-trigger" id="themeSelectorTrigger" aria-haspopup="true" aria-expanded="false" aria-label="切换主题">
                <span class="theme-current-swatch" id="themeCurrentSwatch"></span>
                <span class="theme-current-name" id="themeCurrentName">赤陶橘</span>
                <svg class="theme-selector-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="theme-selector-dropdown hidden" id="themeSelectorDropdown">
                <div class="theme-selector-families">
                  <button type="button" class="theme-family-btn" data-family="terracotta">
                    <span class="theme-family-swatch" style="background:#c4785a"></span>
                    <span class="theme-family-label">赤陶橘</span>
                  </button>
                  <button type="button" class="theme-family-btn" data-family="sage">
                    <span class="theme-family-swatch" style="background:#7daa7d"></span>
                    <span class="theme-family-label">鼠尾草</span>
                  </button>
                  <button type="button" class="theme-family-btn" data-family="rose">
                    <span class="theme-family-swatch" style="background:#c97a7a"></span>
                    <span class="theme-family-label">烟灰玫瑰</span>
                  </button>
                  <button type="button" class="theme-family-btn" data-family="teal">
                    <span class="theme-family-swatch" style="background:#5a9e9e"></span>
                    <span class="theme-family-label">深青灰</span>
                  </button>
                </div>
                <div class="theme-selector-divider"></div>
                <div class="theme-selector-modes">
                  <button type="button" class="theme-mode-btn" data-mode="dark">深色</button>
                  <button type="button" class="theme-mode-btn" data-mode="light">浅色</button>
                </div>
              </div>
            </div>
```

---

### Task 12: Update Mode Tabs to Pill Style

**Files:**
- Modify: `public/styles.css:2383-2555` (mode tabs)
- Modify: `public/index.html:124` (mode tab indicator)
- Modify: `public/app.js:769-807` (mode indicator JS)

- [ ] **Step 1: Replace mode tabs CSS**

Replace from `.mode-panel {` to the end of the file (lines ~2383–2555) with:

```css
/* ===== Mode Panel ===== */
.mode-panel {
  padding: 0;
  overflow: hidden;
  margin-bottom: 28px;
}

/* ===== Mode Tabs ===== */
.mode-tabs {
  display: flex;
  position: relative;
  gap: 4px;
  padding: 6px;
  background: var(--bg);
  border-bottom: 1px solid var(--card-border);
}

.mode-tab {
  flex: 1;
  position: relative;
  padding: 12px 16px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow: visible;
  color: var(--muted);
}

.mode-tab:hover {
  color: var(--text);
  background: transparent;
  border-color: transparent;
  box-shadow: none;
  transform: none;
}

.mode-tab:hover .mode-tab-name {
  color: var(--text);
}

.mode-tab:hover .mode-tab-desc {
  color: var(--muted);
}

.mode-tab-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: var(--accent-dim);
  border: 1px solid var(--card-border);
  color: var(--accent);
  margin-bottom: 2px;
  transition: all 0.2s ease;
}

.mode-tab-icon svg {
  width: 14px;
  height: 14px;
}

.mode-tab:hover .mode-tab-icon {
  background: var(--accent-dim);
  border-color: var(--accent);
}

.mode-tab.active .mode-tab-icon {
  background: var(--accent-dim);
  border-color: var(--accent);
}

.mode-tab-name {
  display: block;
  font-weight: 600;
  font-size: 0.88rem;
  color: var(--text);
  letter-spacing: 0.01em;
}

.mode-tab-desc {
  display: block;
  font-size: 0.74rem;
  color: var(--muted);
  line-height: 1.4;
}

.mode-tab.active {
  background: var(--accent-dim);
  color: var(--accent);
  border-color: rgba(from var(--accent) r g b / 0.25);
}

.mode-tab.active .mode-tab-name {
  color: var(--accent);
}

.mode-tab.active .mode-tab-desc {
  color: var(--accent);
  opacity: 0.7;
}

/* ===== Mode Forms ===== */
.mode-forms {
  padding: 28px;
  position: relative;
}

.mode-form {
  display: none;
  animation: formFadeOut 0.2s ease forwards;
}

.mode-form.active {
  display: block;
  animation: formFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes formFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes formFadeOut {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-8px); }
}
```

- [ ] **Step 2: Remove mode tab indicator from HTML**

Delete line 124 in `index.html`:
```html
          <div class="mode-tab-indicator"></div>
```

- [ ] **Step 3: Simplify mode tab JS**

Replace `updateModeIndicator()` and `setActiveMode()` in `app.js` (lines ~769–786) with:

```javascript
function setActiveMode(mode) {
  modeTabs.forEach((t) => t.classList.remove('active'));
  modeForms.forEach((f) => f.classList.remove('active'));
  const targetTab = document.querySelector(`.mode-tab[data-mode="${mode}"]`);
  const targetForm = document.getElementById(`generator-form-${mode}`);
  if (targetTab) targetTab.classList.add('active');
  if (targetForm) targetForm.classList.add('active');
}
```

And delete the `modeIndicator` and `modeTabsContainer` cached refs (lines 164–165) since they are no longer needed:
```javascript
const modeIndicator = document.querySelector('.mode-tab-indicator');
const modeTabsContainer = document.querySelector('.mode-tabs');
```

Also remove the `window.addEventListener('resize', ...)` call for the indicator (line 805–807):
```javascript
window.addEventListener('resize', () => {
  requestAnimationFrame(updateModeIndicator);
});
```

---

### Task 13: Update Empty State & Warning Styles

**Files:**
- Modify: `public/styles.css:913-990` (warning, empty state)

- [ ] **Step 1: Update warning and empty state**

Replace from `.warning {` through `.empty-cta:hover` (lines ~913–990) with:

```css
/* ===== Warning ===== */
.warning {
  padding: 14px 16px;
  border-radius: 6px;
  background: rgba(201, 160, 76, 0.06);
  border: 1px solid rgba(201, 160, 76, 0.12);
  color: var(--warning-text);
  line-height: 1.75;
  white-space: pre-wrap;
  font-size: 0.86rem;
}

/* ===== Empty State ===== */
.empty-state {
  padding: 40px 24px;
  border-radius: 8px;
  background: var(--bg);
  border: 1px solid var(--card-border);
  color: var(--muted);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.empty-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--accent-dim);
  border: 1px solid var(--card-border);
  display: grid;
  place-items: center;
  color: var(--accent);
  margin-bottom: 4px;
}

.empty-icon svg {
  width: 22px;
  height: 22px;
}

.empty-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text);
}

.empty-desc {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.7;
  max-width: 360px;
}

.empty-cta {
  margin-top: 8px;
  padding: 10px 24px;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  cursor: pointer;
  border-radius: 6px;
  border: 1px solid var(--card-border);
  background: var(--accent-dim);
  color: var(--accent);
  transition: all 0.2s;
  font-family: inherit;
}

.empty-cta:hover {
  background: var(--accent);
  color: var(--accent-text);
  border-color: var(--accent);
  box-shadow: 0 4px 12px var(--accent-dim);
  transform: translateY(-1px);
}
```

---

### Task 14: Verify & Test

**Files:**
- Test: `tests/smoke.mjs`

- [ ] **Step 1: Run smoke tests**

```bash
npm run check
```

Expected: All tests pass.

- [ ] **Step 2: Start dev server and visually verify**

```bash
npm run dev
```

Open the local URL in a browser and verify:
1. Page loads without CSS errors
2. All 8 themes switch correctly via the dropdown
3. Theme preference persists after refresh
4. Login page renders correctly
5. Mode tabs (aggregate/preferred) work with pill style
6. Client tabs, URL display, table, modal, toast all look correct
7. Both dark and light variants of all 4 families look coordinated

- [ ] **Step 3: Check responsive breakpoints**

Shrink browser to < 920px and < 640px. Verify layout collapses correctly and theme dropdown remains usable.

- [ ] **Step 4: Commit**

```bash
git add public/styles.css public/app.js public/index.html
git commit -m "feat: four-family editorial theme system with terracotta/sage/rose/teal"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- [x] 4 theme families with dark/light variants → 8 `data-theme` blocks in CSS
- [x] Shared gray scale → defined in each theme block
- [x] Accent colors per family → terracotta, sage, rose, teal
- [x] `--accent-text` token → included in all 8 blocks
- [x] Fixed danger/warning → included
- [x] Remove body scanline → removed `body::before`
- [x] Remove card gradient top border → removed `.card::before`
- [x] Remove login scanline/grid → removed `.login-scanline`, `.login-grid`
- [x] Remove button shine → removed `button::before`
- [x] Card radius 10px, shadow updated → done
- [x] Section spacing 28px → updated
- [x] Login background solid → `background: var(--bg)`
- [x] Status dot static → removed animation
- [x] Input focus: border + glow → `border-color: var(--accent)` + `box-shadow: 0 0 0 3px var(--accent-dim)`
- [x] Mode tabs: pill style → `.mode-tab.active` has `background: var(--accent-dim)` + border
- [x] Table row hover: `var(--accent-dim)` → added
- [x] URL display: remove `$` prompt → removed `.url-prompt`
- [x] Modal background `var(--card)` → updated
- [x] Toast left border accent → kept
- [x] localStorage `themeFamily` + `themeMode` → implemented
- [x] Theme selector dropdown with 4 swatches + mode toggle → implemented
- [x] Old `theme` key migration → handled in `initTheme()` and inline script
- [x] Responsive breakpoints preserved → unchanged
- [x] Smoke tests → Task 14

**2. Placeholder scan:** No TBD, TODO, or incomplete sections.

**3. Type consistency:** `data-theme` values consistently use `${family}-${mode}` format. CSS selectors match. JS `localStorage` keys are `themeFamily` and `themeMode` everywhere.
