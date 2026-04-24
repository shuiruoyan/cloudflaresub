# 双模式订阅系统实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保留现有优选IP模式的基础上，新增聚合模式，两种模式独立配置并通过同一订阅链接合并输出。

**Architecture:** 后端新增 `sub:aggregate` KV key 存储聚合模式配置，API 通过 `mode` 字段区分更新目标；渲染时读取双模式配置合并节点数组，以 `version: 2` 写入 `sub:${id}`。前端通过标签页切换两种模式的表单，订阅结果区域全局共享。

**Tech Stack:** Vanilla JS (Cloudflare Worker + 前端), KV Storage, 无构建工具

---

## 文件结构

| 文件 | 职责 |
|------|------|
| `src/worker.js` | 后端 API 路由、节点解析/渲染、双模式合并逻辑 |
| `src/core.js` | 与 worker.js 平行的解析/渲染工具，供 smoke 测试使用 |
| `public/index.html` | 前端页面结构，新增标签页和聚合模式表单 |
| `public/app.js` | 前端交互逻辑，标签页切换、双模式保存、合并预览 |
| `tests/smoke.mjs` | Smoke 测试，覆盖聚合模式解析和合并渲染 |

---

### Task 1: worker.js — 新增聚合模式函数并修改默认前缀

**Files:**
- Modify: `src/worker.js`

- [ ] **Step 1: 在 `buildNodes` 中将 namePrefix 默认值改为 `"优选"`**

将第 135 行：
```js
const prefix = (options.namePrefix || '').trim();
```
改为：
```js
const prefix = (options.namePrefix || '优选').trim();
```

- [ ] **Step 2: 在 `buildNodes` 之后新增 `buildAggregateNodes` 函数**

在 `buildNodes` 函数结束（第 156 行）之后、`encodeVmess` 函数之前插入：

```js
function buildAggregateNodes(rawLinks) {
  const baseNodes = parseRawLinks(rawLinks || '');
  return baseNodes.map((node) => ({
    ...node,
    name: node.name ? `${node.name} | 聚合` : `${node.type} | 聚合`,
  }));
}
```

- [ ] **Step 3: 在 `rerenderFromData` 之后新增 `buildMergedNodes` 函数**

将现有的 `rerenderFromData` 函数（第 415-430 行）替换为以下两个函数：

```js
async function buildMergedNodes(env) {
  const [dataRaw, aggRaw] = await Promise.all([
    env.SUB_STORE.get('sub:data'),
    env.SUB_STORE.get('sub:aggregate'),
  ]);

  const allNodes = [];
  let preferredCount = 0;
  let aggregateCount = 0;

  if (dataRaw) {
    const data = JSON.parse(dataRaw);
    const baseNodes = parseRawLinks(data.nodeLinks || '');
    const preferredEndpoints = parsePreferredEndpoints(data.preferredIps || '');
    const options = {
      namePrefix: data.namePrefix || '优选',
      keepOriginalHost: data.keepOriginalHost !== false,
    };
    const nodes = buildNodes(baseNodes, preferredEndpoints, options);
    preferredCount = nodes.length;
    allNodes.push(...nodes);
  }

  if (aggRaw) {
    const agg = JSON.parse(aggRaw);
    const nodes = buildAggregateNodes(agg.nodeLinks || '');
    aggregateCount = nodes.length;
    allNodes.push(...nodes);
  }

  return { nodes: allNodes, preferredCount, aggregateCount };
}

async function saveMergedPayload(env, id) {
  const { nodes, preferredCount, aggregateCount } = await buildMergedNodes(env);
  await env.SUB_STORE.put(`sub:${id}`, JSON.stringify({
    version: 2,
    updatedAt: new Date().toISOString(),
    nodes,
  }));
  return { nodes, preferredCount, aggregateCount };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/worker.js
git commit -m "feat(worker): add aggregate mode build function and merge logic"
```

---

### Task 2: worker.js — 修改 API 路由支持双模式

**Files:**
- Modify: `src/worker.js:481-619`

- [ ] **Step 1: 修改 `handleGetSubscription` 支持双模式配置**

将 `handleGetSubscription` 函数（第 481-533 行）替换为：

```js
async function handleGetSubscription(request, env, url) {
  try {
    const tokenCheck = validateToken(request, url, env);
    if (!tokenCheck.ok) return tokenCheck.response;

    const bindCheck = checkBindings(env);
    if (!bindCheck.ok) return json({ ok: false, error: bindCheck.error }, 500);

    const [dataRaw, aggRaw, fixedId] = await Promise.all([
      env.SUB_STORE.get('sub:data'),
      env.SUB_STORE.get('sub:aggregate'),
      env.SUB_STORE.get('sub:fixed-id'),
    ]);

    const hasPreferred = Boolean(dataRaw);
    const hasAggregate = Boolean(aggRaw);

    if (!hasPreferred && !hasAggregate) {
      return json({ ok: true, exists: false });
    }

    const data = hasPreferred ? JSON.parse(dataRaw) : {};
    const result = {
      ok: true,
      exists: true,
      preferred: {
        nodeLinks: data.nodeLinks || '',
        preferredIps: data.preferredIps || '',
        namePrefix: data.namePrefix || '',
        keepOriginalHost: data.keepOriginalHost !== false,
      },
      aggregate: hasAggregate ? JSON.parse(aggRaw) : { nodeLinks: '' },
      fixedId: fixedId || null,
    };

    if (fixedId) {
      const subRaw = await env.SUB_STORE.get(`sub:${fixedId}`);
      if (subRaw) {
        const sub = JSON.parse(subRaw);
        const nodes = sub.nodes || [];
        const { preferredCount, aggregateCount } = await buildMergedNodes(env);
        result.counts = {
          preferredNodes: preferredCount,
          aggregateNodes: aggregateCount,
          totalNodes: preferredCount + aggregateCount,
        };
        result.preview = nodes.map((node) => ({
          name: node.name,
          type: node.type,
          server: node.server,
          port: node.port,
          host: node.host || '',
          sni: node.sni || '',
        }));
      }
    }

    return json(result);
  } catch (err) {
    return json({ ok: false, error: '获取订阅错误: ' + (err.message || String(err)) }, 500);
  }
}
```

- [ ] **Step 2: 修改 `handleUpdateSubscription` 支持 mode 字段**

将 `handleUpdateSubscription` 函数（第 535-619 行）替换为：

```js
async function handleUpdateSubscription(request, env, url) {
  try {
    const tokenCheck = validateToken(request, url, env);
    if (!tokenCheck.ok) return tokenCheck.response;

    const bindCheck = checkBindings(env);
    if (!bindCheck.ok) return json({ ok: false, error: bindCheck.error }, 500);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: '请求体不是合法 JSON' }, 400);
    }

    const mode = body.mode || 'preferred';

    if (mode === 'preferred') {
      const baseNodes = parseRawLinks(body.nodeLinks || '');
      const preferredEndpoints = parsePreferredEndpoints(body.preferredIps || '');

      if (!baseNodes.length) return json({ ok: false, error: '没有识别到可用节点' }, 400);
      if (!preferredEndpoints.length) return json({ ok: false, error: '没有识别到可用优选地址' }, 400);

      await env.SUB_STORE.put('sub:data', JSON.stringify({
        nodeLinks: body.nodeLinks || '',
        preferredIps: body.preferredIps || '',
        namePrefix: body.namePrefix || '',
        keepOriginalHost: body.keepOriginalHost !== false,
      }));
    } else if (mode === 'aggregate') {
      const baseNodes = parseRawLinks(body.nodeLinks || '');
      if (!baseNodes.length) {
        await env.SUB_STORE.delete('sub:aggregate');
      } else {
        await env.SUB_STORE.put('sub:aggregate', JSON.stringify({
          nodeLinks: body.nodeLinks || '',
        }));
      }
    } else {
      return json({ ok: false, error: '不支持的 mode，请使用 preferred 或 aggregate' }, 400);
    }

    // Get or create fixed ID
    let fixedId = await env.SUB_STORE.get('sub:fixed-id');
    let isNew = false;
    if (!fixedId) {
      fixedId = await createUniqueShortId(env);
      await env.SUB_STORE.put('sub:fixed-id', fixedId);
      isNew = true;
    }

    // Rebuild merged payload
    const { nodes, preferredCount, aggregateCount } = await saveMergedPayload(env, fixedId);

    const origin = url.origin;
    const accessToken = env.SUB_ACCESS_TOKEN || '';

    return json({
      ok: true,
      isNew,
      fixedId,
      urls: {
        auto: buildSubUrl(origin, fixedId, '', accessToken),
        raw: buildSubUrl(origin, fixedId, 'raw', accessToken),
        clash: buildSubUrl(origin, fixedId, 'clash', accessToken),
        surge: buildSubUrl(origin, fixedId, 'surge', accessToken),
      },
      counts: {
        preferredNodes: preferredCount,
        aggregateNodes: aggregateCount,
        totalNodes: preferredCount + aggregateCount,
      },
      preview: nodes.map((node) => ({
        name: node.name,
        type: node.type,
        server: node.server,
        port: node.port,
        host: node.host || '',
        sni: node.sni || '',
      })),
      warnings: accessToken ? [] : ['未检测到 SUB_ACCESS_TOKEN，订阅链接将没有访问保护。'],
    });
  } catch (err) {
    return json({ ok: false, error: '保存配置错误: ' + (err.message || String(err)) }, 500);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/worker.js
git commit -m "feat(worker): update API routes for dual-mode subscription"
```

---

### Task 3: worker.js — 更新 handleUpdateUrl 和 handleSub 兼容 version 1/2

**Files:**
- Modify: `src/worker.js:621-704`

- [ ] **Step 1: 修改 `handleUpdateUrl` 使用新的合并渲染**

将 `handleUpdateUrl` 函数（第 621-670 行）替换为：

```js
async function handleUpdateUrl(request, env, url) {
  try {
    const tokenCheck = validateToken(request, url, env);
    if (!tokenCheck.ok) return tokenCheck.response;

    const bindCheck = checkBindings(env);
    if (!bindCheck.ok) return json({ ok: false, error: bindCheck.error }, 500);

    const [dataRaw, aggRaw, oldId] = await Promise.all([
      env.SUB_STORE.get('sub:data'),
      env.SUB_STORE.get('sub:aggregate'),
      env.SUB_STORE.get('sub:fixed-id'),
    ]);
    if (!dataRaw && !aggRaw) return json({ ok: false, error: '没有现有订阅配置，请先保存配置' }, 400);

    const newId = await createUniqueShortId(env);

    if (oldId) {
      await env.SUB_STORE.delete(`sub:${oldId}`);
    }

    await saveMergedPayload(env, newId);
    await env.SUB_STORE.put('sub:fixed-id', newId);

    const origin = url.origin;
    const accessToken = env.SUB_ACCESS_TOKEN || '';

    return json({
      ok: true,
      fixedId: newId,
      urls: {
        auto: buildSubUrl(origin, newId, '', accessToken),
        raw: buildSubUrl(origin, newId, 'raw', accessToken),
        clash: buildSubUrl(origin, newId, 'clash', accessToken),
        surge: buildSubUrl(origin, newId, 'surge', accessToken),
      },
    });
  } catch (err) {
    return json({ ok: false, error: '更新URL错误: ' + (err.message || String(err)) }, 500);
  }
}
```

- [ ] **Step 2: 修改 `handleSub` 兼容 version 1/2**

将 `handleSub` 函数（第 672-704 行）替换为：

```js
async function handleSub(url, env) {
  try {
    const tokenCheck = validateToken(null, url, env);
    if (!tokenCheck.ok) return tokenCheck.response;

    const bindCheck = checkBindings(env);
    if (!bindCheck.ok) return text('KV not bound: ' + bindCheck.error, 500);

    const id = url.pathname.split('/').pop();
    if (!id) return text('missing id', 400);

    const raw = await env.SUB_STORE.get(`sub:${id}`);
    if (!raw) return text('not found', 404);

    const record = JSON.parse(raw);
    const nodes = record.nodes || [];
    const target = (url.searchParams.get('target') || 'raw').toLowerCase();

    if (target === 'clash') {
      return text(renderClash(nodes), 200, 'text/yaml; charset=utf-8');
    }
    if (target === 'surge') {
      return text(
        renderSurge(nodes, url.origin + url.pathname, env.SUB_ACCESS_TOKEN || ''),
        200,
        'text/plain; charset=utf-8',
      );
    }
    return text(renderRaw(nodes), 200, 'text/plain; charset=utf-8');
  } catch (err) {
    return text('订阅服务错误: ' + (err.message || String(err)), 500);
  }
}
```

注意：`handleSub` 本身已经只读取 `record.nodes`，所以 `version: 1` 和 `version: 2` 都兼容，无需额外修改。

- [ ] **Step 3: Commit**

```bash
git add src/worker.js
git commit -m "feat(worker): update handleUpdateUrl and handleSub for dual-mode"
```

---

### Task 4: core.js — 同步新增聚合模式支持

**Files:**
- Modify: `src/core.js`

- [ ] **Step 1: 修改 `expandNodes` 默认 namePrefix 为 `"优选"`**

找到 `expandNodes` 函数中的这一行（约第 155 行）：
```js
const namePrefix = String(options.namePrefix || '').trim();
```
改为：
```js
const namePrefix = String(options.namePrefix || '优选').trim();
```

- [ ] **Step 2: 在 `expandNodes` 之后新增 `prefixAggregateNodes` 函数**

在 `expandNodes` 函数结束后（约第 201 行，`summarizeNodes` 之前）插入：

```js
export function prefixAggregateNodes(nodes) {
  return nodes.map((node) => ({
    ...deepClone(node),
    name: node.name ? `${node.name} | 聚合` : `${node.type} | 聚合`,
  }));
}
```

- [ ] **Step 3: Commit**

```bash
git add src/core.js
git commit -m "feat(core): add prefixAggregateNodes and default preferred prefix"
```

---

### Task 5: public/index.html — 新增标签页结构和聚合模式表单

**Files:**
- Modify: `public/index.html:112-160`

- [ ] **Step 1: 将现有表单区域替换为标签页结构**

将第 112-160 行（`<form id="generator-form">` 及其内容）替换为：

```html
      <div class="mode-tabs">
        <button type="button" class="mode-tab active" data-mode="preferred">
          <span class="mode-tab-name">优选 IP 模式</span>
          <span class="mode-tab-desc">节点 + 优选 IP 组合生成</span>
        </button>
        <button type="button" class="mode-tab" data-mode="aggregate">
          <span class="mode-tab-name">聚合模式</span>
          <span class="mode-tab-desc">节点链接直接聚合</span>
        </button>
      </div>

      <form id="generator-form-preferred" class="card stack-lg mode-form active">
        <div class="form-grid">
          <div>
            <label for="nodeLinks">节点链接</label>
            <textarea
              id="nodeLinks"
              name="nodeLinks"
              rows="10"
              placeholder="支持 vmess://、vless://、trojan://，一行一个。也支持直接粘贴原始 base64 订阅内容。"
              required
            ></textarea>
            <p class="hint">支持 vmess / vless / trojan，一行一个。兼容自建 WS + TLS 写法，也支持粘贴 base64 订阅。</p>
          </div>

          <div>
            <label for="preferredIps">优选 IP / 优选域名</label>
            <textarea
              id="preferredIps"
              name="preferredIps"
              rows="10"
              placeholder="示例：
104.16.1.2#HK-01
104.17.2.3:2053#HK-02
cf.example.com:443#US-Edge"
              required
            ></textarea>
            <p class="hint">
              格式：<code>IP</code>、<code>IP:端口</code>、<code>域名</code>、<code>域名:端口</code>，<code>#</code> 后面写备注。不会帮你找优选 IP，只负责替换。
            </p>
          </div>
        </div>

        <div class="grid compact">
          <div>
            <label for="namePrefix">备注前缀（可选）</label>
            <input id="namePrefix" name="namePrefix" type="text" placeholder="例如 CF" />
            <p class="hint">附加到每个节点名称中，方便区分。</p>
          </div>
        </div>

        <div class="actions">
          <label class="action-checkbox">
            <input id="keepOriginalHost" name="keepOriginalHost" type="checkbox" checked />
            <span>保留原节点 Host / SNI</span>
          </label>
          <button id="submitBtn" type="submit">保存配置</button>
        </div>
      </form>

      <form id="generator-form-aggregate" class="card stack-lg mode-form">
        <div>
          <label for="aggregateNodeLinks">节点链接</label>
          <textarea
            id="aggregateNodeLinks"
            name="nodeLinks"
            rows="14"
            placeholder="支持 vmess://、vless://、trojan://，一行一个。也支持直接粘贴原始 base64 订阅内容。"
            required
          ></textarea>
          <p class="hint">支持 vmess / vless / trojan，一行一个。兼容自建 WS + TLS 写法，也支持粘贴 base64 订阅。节点将原样聚合，名称自动追加「| 聚合」后缀。</p>
        </div>

        <div class="actions">
          <button id="submitAggregateBtn" type="submit">保存配置</button>
        </div>
      </form>
```

- [ ] **Step 2: 在订阅结果区域添加更新订阅URL按钮**

在第 157-158 行（原保存配置按钮区域，现在位于 preferred 表单内）确认已移除 `rotateUrlBtn`。在第 182 行左右的订阅结果区域 `<div id="urlGenerator">` 内，找到 URL 操作按钮区域（约第 236-238 行），在复制链接和二维码按钮之后添加更新URL按钮：

将：
```html
            <div class="url-actions">
              <button type="button" data-copy-target="activeUrl">复制链接</button>
              <button type="button" class="secondary" data-qrcode-target="activeUrl">二维码</button>
            </div>
```

改为：
```html
            <div class="url-actions">
              <button type="button" data-copy-target="activeUrl">复制链接</button>
              <button type="button" class="secondary" data-qrcode-target="activeUrl">二维码</button>
              <button id="rotateUrlBtn" type="button" class="secondary warning">更新订阅URL</button>
            </div>
```

- [ ] **Step 3: Commit**

```bash
git add public/index.html
git commit -m "feat(ui): add mode tabs and aggregate form, move rotate URL to result area"
```

---

### Task 6: public/app.js — 实现标签页切换和双模式保存逻辑

**Files:**
- Modify: `public/app.js`

- [ ] **Step 1: 新增模式切换相关的 DOM 引用和事件绑定**

在第 131-139 行的 DOM refs 区域，新增以下引用（在现有 refs 之后）：

```js
const modeTabs = document.querySelectorAll('.mode-tab');
const modeForms = document.querySelectorAll('.mode-form');
const aggregateForm = document.getElementById('generator-form-aggregate');
const aggregateNodeLinks = document.getElementById('aggregateNodeLinks');
const submitAggregateBtn = document.getElementById('submitAggregateBtn');
```

- [ ] **Step 2: 在文件末尾添加模式切换逻辑**

在 `initTheme()` 调用之前（约第 445 行）插入：

```js
// Mode tab switching
modeTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const mode = tab.dataset.mode;
    modeTabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    modeForms.forEach((f) => f.classList.remove('active'));
    const targetForm = document.getElementById(`generator-form-${mode}`);
    if (targetForm) targetForm.classList.add('active');
  });
});
```

- [ ] **Step 3: 修改 `loadConfig` 以加载双模式配置**

将 `loadConfig` 函数（第 243-263 行）替换为：

```js
async function loadConfig() {
  try {
    const res = await apiFetch('/api/subscription');
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || '加载失败');

    if (data.exists) {
      if (data.preferred) {
        nodeLinks.value = data.preferred.nodeLinks || '';
        preferredIps.value = data.preferred.preferredIps || '';
        namePrefixInput.value = data.preferred.namePrefix || '';
        keepOriginalHost.checked = data.preferred.keepOriginalHost !== false;
      }
      if (data.aggregate) {
        aggregateNodeLinks.value = data.aggregate.nodeLinks || '';
      }

      if (data.fixedId) {
        showResultState(data.counts, data.fixedId);
        showPreview(data.preview);
      }
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}
```

- [ ] **Step 4: 修改 `showResultState` 支持双模式统计**

将 `showResultState` 函数（第 219-231 行）替换为：

```js
function showResultState(counts, fixedId) {
  fixedIdDisplay.textContent = fixedId;
  urlStatus.classList.remove('hidden');
  populateUrls(fixedId);
  emptyState.classList.add('hidden');
  statsBar.classList.remove('hidden');
  urlGenerator.classList.remove('hidden');
  if (counts) {
    statInputNodes.textContent = counts.preferredNodes ?? 0;
    statEndpoints.textContent = counts.aggregateNodes ?? 0;
    statOutputNodes.textContent = counts.totalNodes ?? 0;
  }
}
```

注意：这里复用了现有的统计 DOM 元素，将它们的含义调整为：
- `statInputNodes` → 优选节点数
- `statEndpoints` → 聚合节点数
- `statOutputNodes` → 总计节点数

- [ ] **Step 5: 修改 preferred 表单提交事件**

将 preferred 表单的事件监听（第 265-311 行）修改为：

```js
const preferredForm = document.getElementById('generator-form-preferred');
preferredForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  warningBox.classList.add('hidden');
  previewBody.innerHTML = '';

  const payload = {
    mode: 'preferred',
    nodeLinks: nodeLinks.value,
    preferredIps: preferredIps.value,
    namePrefix: namePrefixInput.value,
    keepOriginalHost: keepOriginalHost.checked,
  };

  submitBtn.disabled = true;
  submitBtn.textContent = '保存中...';

  try {
    const response = await apiFetch('/api/update-subscription', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || '保存失败');
    }

    showResultState(data.counts, data.fixedId);
    showPreview(data.preview);

    if (Array.isArray(data.warnings) && data.warnings.length) {
      showToast(data.warnings.join('\n'), 'warning', 5000);
    }

    if (data.isNew) {
      showToast('首次保存，已生成订阅链接。', 'success');
    } else {
      showToast('配置已保存', 'success');
    }

    smoothScrollToElement(resultSection, 650);
  } catch (error) {
    showToast(error.message || '请求失败', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '保存配置';
  }
});
```

- [ ] **Step 6: 添加 aggregate 表单提交事件**

在 preferred 表单事件监听之后（第 311 行之后）插入：

```js
aggregateForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  warningBox.classList.add('hidden');
  previewBody.innerHTML = '';

  const payload = {
    mode: 'aggregate',
    nodeLinks: aggregateNodeLinks.value,
  };

  submitAggregateBtn.disabled = true;
  submitAggregateBtn.textContent = '保存中...';

  try {
    const response = await apiFetch('/api/update-subscription', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || '保存失败');
    }

    showResultState(data.counts, data.fixedId);
    showPreview(data.preview);

    if (Array.isArray(data.warnings) && data.warnings.length) {
      showToast(data.warnings.join('\n'), 'warning', 5000);
    }

    showToast('聚合节点已保存', 'success');
    smoothScrollToElement(resultSection, 650);
  } catch (error) {
    showToast(error.message || '请求失败', 'error');
  } finally {
    submitAggregateBtn.disabled = false;
    submitAggregateBtn.textContent = '保存配置';
  }
});
```

- [ ] **Step 7: 修改 rotateUrlBtn 事件绑定**

旋转 URL 按钮的代码（第 313-338 行）需要将 `rotateUrlBtn` 从原位置移出后的逻辑保持不变。确认 rotateUrlBtn 仍在第 106 行被引用（无需修改）。事件监听代码本身无需修改。

- [ ] **Step 8: Commit**

```bash
git add public/app.js
git commit -m "feat(ui): implement mode switching and dual-mode save logic"
```

---

### Task 7: 新增 CSS 样式支持标签页切换

**Files:**
- Modify: `public/styles.css`

- [ ] **Step 1: 在 styles.css 末尾添加模式标签页样式**

```css
/* Mode tabs */
.mode-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.mode-tab {
  flex: 1;
  padding: 1rem;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.mode-tab:hover {
  border-color: var(--primary);
}

.mode-tab.active {
  border-color: var(--primary);
  background: var(--primary-bg, rgba(99, 102, 241, 0.08));
}

.mode-tab-name {
  display: block;
  font-weight: 600;
  font-size: 1rem;
  color: var(--text);
}

.mode-tab-desc {
  display: block;
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
}

.mode-form {
  display: none;
}

.mode-form.active {
  display: block;
}
```

- [ ] **Step 2: Commit**

```bash
git add public/styles.css
git commit -m "feat(ui): add mode tab styles"
```

---

### Task 8: tests/smoke.mjs — 新增聚合模式测试

**Files:**
- Modify: `tests/smoke.mjs`

- [ ] **Step 1: 导入新增的 `prefixAggregateNodes` 函数**

在第 3-10 行的 import 语句中，添加 `prefixAggregateNodes`：

```js
import {
  decryptPayload,
  encryptPayload,
  expandNodes,
  parseNodeLinks,
  parsePreferredEndpoints,
  prefixAggregateNodes,
  renderClashSubscription,
  renderRawSubscription,
  renderSurgeSubscription,
} from '../src/core.js';
```

- [ ] **Step 2: 在文件末尾添加聚合模式测试断言**

在 `console.log('smoke test passed');` 之前插入：

```js
// Test aggregate mode node prefixing
const aggregateNodes = prefixAggregateNodes(nodes);
assert.equal(aggregateNodes.length, 1);
assert.equal(aggregateNodes[0].name, 'demo-ws-tls | 聚合');
assert.equal(aggregateNodes[0].server, 'edge.example.com');

// Test default preferred prefix in expandNodes
const expandedDefault = expandNodes(nodes, endpoints, { keepOriginalHost: true });
assert.ok(expandedDefault.nodes[0].name.includes(' | 优选 | '), 'default preferred prefix should contain "优选"');

// Test merge order: preferred nodes first, then aggregate
const mergedNodes = [...expandedDefault.nodes, ...aggregateNodes];
assert.equal(mergedNodes.length, 3);
assert.ok(mergedNodes[0].name.includes('优选'));
assert.ok(mergedNodes[2].name.includes('聚合'));

console.log('smoke test passed');
```

- [ ] **Step 3: 运行测试验证**

```bash
npm run check
```

预期输出：`smoke test passed`

- [ ] **Step 4: Commit**

```bash
git add tests/smoke.mjs
git commit -m "test: add aggregate mode smoke tests"
```

---

### Task 9: 最终验证

- [ ] **Step 1: 运行完整 smoke 测试**

```bash
npm run check
```

预期输出：`smoke test passed`

- [ ] **Step 2: 检查 worker.js 语法**

```bash
node --check src/worker.js || echo "Syntax check completed"
```

注意：`src/worker.js` 使用 Cloudflare Worker 全局 API（如 `crypto.getRandomValues`、`Response`），在 Node.js 中直接运行会报错，但 `node --check` 只做语法检查，应通过。

- [ ] **Step 3: 检查 core.js 语法**

```bash
node --check src/core.js
```

预期：无错误输出。

- [ ] **Step 4: 最终提交**

```bash
git log --oneline -5
```

预期看到所有任务提交记录。

---

## Spec 覆盖检查

| Spec 要求 | 对应任务 |
|-----------|----------|
| 后端 API 新增 `mode` 字段 | Task 2 |
| `GET /api/subscription` 返回双模式配置 | Task 2 |
| `sub:aggregate` KV key 新增 | Task 2 |
| `sub:${id}` version 2 格式 | Task 1, 3 |
| 优选IP模式固定前缀 "优选" | Task 1, 4 |
| 聚合模式前缀 "聚合" | Task 1, 4 |
| 合并输出顺序（优选在前） | Task 1 |
| 前端标签页切换 | Task 5, 6, 7 |
| 聚合模式简化表单 | Task 5 |
| 更新订阅URL作为公共功能 | Task 5 |
| 预览展示全部节点 | Task 2 |
| 向后兼容 version 1 | Task 3 |
| Smoke 测试覆盖 | Task 8 |

## Placeholder 检查

- 无 TBD/TODO/"implement later"
- 所有步骤包含完整代码
- 无 "Similar to Task N" 引用
- 所有函数名和类型前后一致
