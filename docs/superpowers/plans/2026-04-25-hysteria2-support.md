# Hysteria2 Protocol Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Hysteria2 (`hysteria2://`) protocol parsing and subscription rendering to CloudflareSub.

**Architecture:** Add `hysteria2` as a parallel protocol type in both `src/worker.js` (production runtime) and `src/core.js` (test utilities). No refactoring of existing protocol code.

**Tech Stack:** Vanilla JS (Cloudflare Worker runtime), no new dependencies.

---

## Task 1: core.js — Parse Hysteria2 URI

**Files:**
- Modify: `src/core.js:6`
- Modify: `src/core.js:414-426`
- Test: `tests/smoke.mjs`

- [ ] **Step 1: Update SUPPORTED_PROTOCOLS**

```js
export const SUPPORTED_PROTOCOLS = ['vmess', 'vless', 'trojan', 'hysteria2'];
```

- [ ] **Step 2: Add parseHysteria2Uri after parseTrojanUri**

Insert after `parseTrojanUri` (around line 411), before `maybeExpandRawSubscription`:

```js
function parseHysteria2Uri(uri) {
  const url = new URL(uri);
  const password = decodeURIComponent(url.username);
  const server = url.hostname;
  const port = normalizePort(url.port, 443);
  if (!server || !password) {
    throw new Error('Hysteria2 链接缺少 server 或 password');
  }

  const security = (url.searchParams.get('security') || '').toLowerCase();
  const allowInsecureRaw = url.searchParams.get('allowInsecure') || url.searchParams.get('insecure') || '';

  return {
    type: 'hysteria2',
    name: decodeHashName(url.hash) || 'hysteria2',
    server,
    originalServer: server,
    port,
    password,
    tls: security === 'tls',
    sni: String(url.searchParams.get('sni') || '').trim(),
    fp: String(url.searchParams.get('fp') || '').trim(),
    alpn: splitListValue(url.searchParams.get('alpn')),
    ech: String(url.searchParams.get('ech') || '').trim(),
    obfs: String(url.searchParams.get('obfs') || '').trim(),
    obfsPassword: String(url.searchParams.get('obfs-password') || '').trim(),
    allowInsecure: toBoolean(allowInsecureRaw),
    params: {},
  };
}
```

- [ ] **Step 3: Update parseSingleNode to dispatch hysteria2://**

Modify `src/core.js:414-426`:

```js
function parseSingleNode(uri) {
  const lower = uri.toLowerCase();
  if (lower.startsWith('vmess://')) {
    return parseVmessUri(uri);
  }
  if (lower.startsWith('vless://')) {
    return parseVlessUri(uri);
  }
  if (lower.startsWith('trojan://')) {
    return parseTrojanUri(uri);
  }
  if (lower.startsWith('hysteria2://')) {
    return parseHysteria2Uri(uri);
  }
  throw new Error('只支持 vmess://、vless://、trojan://、hysteria2://');
}
```

- [ ] **Step 4: Run smoke tests to verify no regression**

Run: `npm run check`
Expected: PASS (no hysteria2 tests yet, but existing tests should still pass)

- [ ] **Step 5: Commit**

```bash
git add src/core.js
git commit -m "feat: parse hysteria2:// URI in core.js"
```

---

## Task 2: core.js — Render Hysteria2 Raw URI

**Files:**
- Modify: `src/core.js:319-330`
- Create: helper function after `renderTrojanUri`

- [ ] **Step 1: Add renderHysteria2Uri after renderTrojanUri**

Insert after `renderTrojanUri` (around line 393):

```js
export function renderHysteria2Uri(node) {
  const params = new URLSearchParams();
  if (node.tls) params.set('security', 'tls');
  setQueryParam(params, 'sni', node.sni || '');
  setQueryParam(params, 'fp', node.fp || '');
  if (node.alpn?.length) params.set('alpn', node.alpn.join(','));
  setQueryParam(params, 'ech', node.ech || '');
  setQueryParam(params, 'obfs', node.obfs || '');
  setQueryParam(params, 'obfs-password', node.obfsPassword || '');
  if (node.allowInsecure) params.set('insecure', '1');
  const hash = node.name ? `#${encodeURIComponent(node.name)}` : '';
  return `hysteria2://${encodeURIComponent(node.password)}@${formatHostForUrl(node.server)}:${node.port}?${params.toString()}${hash}`;
}
```

- [ ] **Step 2: Update renderNodeUri to dispatch hysteria2**

Modify `src/core.js:319-330`:

```js
export function renderNodeUri(node) {
  switch (node.type) {
    case 'vmess':
      return renderVmessUri(node);
    case 'vless':
      return renderVlessUri(node);
    case 'trojan':
      return renderTrojanUri(node);
    case 'hysteria2':
      return renderHysteria2Uri(node);
    default:
      throw new Error(`未知节点类型：${node.type}`);
  }
}
```

- [ ] **Step 3: Run smoke tests**

Run: `npm run check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/core.js
git commit -m "feat: render hysteria2:// URI in core.js"
```

---

## Task 3: core.js — Render Hysteria2 in Clash

**Files:**
- Modify: `src/core.js:585-668`
- Modify: `src/core.js:720-722`

- [ ] **Step 1: Update isClashSupportedNode**

Modify `src/core.js:720-722`:

```js
function isClashSupportedNode(node) {
  return ['vmess', 'vless', 'trojan', 'hysteria2'].includes(node.type);
}
```

- [ ] **Step 2: Add hysteria2 rendering in renderClashProxy**

In `renderClashProxy` (`src/core.js:585-668`), after the `trojan` block (after line 611), add:

```js
  if (node.type === 'hysteria2') {
    lines.push(`    password: ${yamlQuote(node.password)}`);
  }
```

Then after the existing `tls` block (after line 626), add a hysteria2-specific block:

```js
  if (node.type === 'hysteria2') {
    if (node.obfs) {
      lines.push(`    obfs: ${yamlQuote(node.obfs)}`);
    }
    if (node.obfsPassword) {
      lines.push(`    obfs-password: ${yamlQuote(node.obfsPassword)}`);
    }
    if (node.ech) {
      lines.push(`    ech: ${yamlQuote(node.ech)}`);
    }
  }
```

The full `renderClashProxy` after modification should have this structure:
- vmess block (lines 591-595)
- vless block (lines 596-607)
- trojan block (lines 609-611)
- hysteria2 password block (new, after trojan)
- tls block (lines 613-626)
- hysteria2 obfs/ech block (new, after tls)
- network block (line 628)
- ws-opts, grpc-opts, http-opts, xhttp-opts blocks

- [ ] **Step 3: Run smoke tests**

Run: `npm run check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/core.js
git commit -m "feat: render hysteria2 proxy in Clash format (core.js)"
```

---

## Task 4: core.js — Render Hysteria2 in Surge

**Files:**
- Modify: `src/core.js:670-708`

- [ ] **Step 1: Add hysteria2 rendering in renderSurgeProxy**

In `renderSurgeProxy` (`src/core.js:670-708`), replace the final `return` for trojan (line 707) with an if/else that handles both trojan and hysteria2:

Change from:
```js
  return `${name} = trojan, ${formatHostForUrl(node.server)}, ${node.port}, ${trojanParams.join(', ')}`;
```

To:
```js
  if (node.type === 'trojan') {
    return `${name} = trojan, ${formatHostForUrl(node.server)}, ${node.port}, ${trojanParams.join(', ')}`;
  }

  // hysteria2
  const hy2Params = [
    `password=${node.password}`,
    `skip-cert-verify=${node.allowInsecure ? 'true' : 'false'}`,
  ];
  const hy2Sni = getEffectiveTlsHost(node);
  if (hy2Sni) hy2Params.push(`sni=${hy2Sni}`);
  if (node.obfs) hy2Params.push(`obfs=${node.obfs}`);
  if (node.obfsPassword) hy2Params.push(`obfs-password=${node.obfsPassword}`);
  if (node.fp) hy2Params.push(`fingerprint=${node.fp}`);
  return `${name} = hysteria2, ${formatHostForUrl(node.server)}, ${node.port}, ${hy2Params.join(', ')}`;
```

- [ ] **Step 2: Run smoke tests**

Run: `npm run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/core.js
git commit -m "feat: render hysteria2 proxy in Surge format (core.js)"
```

---

## Task 5: worker.js — Parse Hysteria2 URI

**Files:**
- Modify: `src/worker.js:83-142`

- [ ] **Step 1: Add parseHysteria2 after parseUrlLike**

Insert after `parseUrlLike` (line 112), before `parseRawLinks`:

```js
function parseHysteria2(link) {
  const u = new URL(link);
  const security = (u.searchParams.get('security') || '').toLowerCase();
  const allowInsecureRaw = u.searchParams.get('allowInsecure') || u.searchParams.get('insecure') || '';
  return {
    type: 'hysteria2',
    name: decodeURIComponent(u.hash.replace(/^#/, '')) || 'hysteria2',
    server: u.hostname,
    port: Number(u.port || 443),
    password: decodeURIComponent(u.username),
    tls: security === 'tls',
    sni: u.searchParams.get('sni') || '',
    fp: u.searchParams.get('fp') || '',
    alpn: u.searchParams.get('alpn') || '',
    ech: u.searchParams.get('ech') || '',
    obfs: u.searchParams.get('obfs') || '',
    obfsPassword: u.searchParams.get('obfs-password') || '',
    allowInsecure: allowInsecureRaw === '1' || allowInsecureRaw.toLowerCase() === 'true',
  };
}
```

- [ ] **Step 2: Update parseRawLinks to detect hysteria2://**

Modify `src/worker.js:121-140`:

```js
  for (const line of lines) {
    if (line.startsWith('vmess://')) {
      result.push(parseVmess(line));
      continue;
    }
    if (line.startsWith('vless://')) {
      result.push(parseUrlLike(line, 'vless'));
      continue;
    }
    if (line.startsWith('trojan://')) {
      result.push(parseUrlLike(line, 'trojan'));
      continue;
    }
    if (line.startsWith('hysteria2://')) {
      result.push(parseHysteria2(line));
      continue;
    }
    try {
      const decoded = b64DecodeUtf8(line);
      if (/^(vmess|vless|trojan|hysteria2):\/\//m.test(decoded)) {
        result.push(...parseRawLinks(decoded));
      }
    } catch {}
  }
```

- [ ] **Step 3: Run smoke tests**

Run: `npm run check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/worker.js
git commit -m "feat: parse hysteria2:// URI in worker.js"
```

---

## Task 6: worker.js — Encode Hysteria2 Raw URI

**Files:**
- Modify: `src/worker.js:225-244`

- [ ] **Step 1: Add encodeHysteria2 after encodeTrojan**

Insert after `encodeTrojan` (line 236), before `renderRaw`:

```js
function encodeHysteria2(node) {
  const url = new URL(`hysteria2://${encodeURIComponent(node.password)}@${node.server}:${node.port}`);
  if (node.tls) url.searchParams.set('security', 'tls');
  if (node.sni) url.searchParams.set('sni', node.sni);
  if (node.fp) url.searchParams.set('fp', node.fp);
  if (node.alpn) url.searchParams.set('alpn', node.alpn);
  if (node.ech) url.searchParams.set('ech', node.ech);
  if (node.obfs) url.searchParams.set('obfs', node.obfs);
  if (node.obfsPassword) url.searchParams.set('obfs-password', node.obfsPassword);
  if (node.allowInsecure) url.searchParams.set('insecure', '1');
  url.hash = node.name;
  return url.toString();
}
```

- [ ] **Step 2: Update renderRaw to include hysteria2**

Modify `src/worker.js:238-244`:

```js
function renderRaw(nodes) {
  const lines = nodes
    .map((node) => {
      if (node.type === 'vmess') return encodeVmess(node);
      if (node.type === 'vless') return encodeVless(node);
      if (node.type === 'trojan') return encodeTrojan(node);
      if (node.type === 'hysteria2') return encodeHysteria2(node);
      return '';
    })
    .filter(Boolean);
  return b64EncodeUtf8(lines.join('\n'));
}
```

- [ ] **Step 3: Run smoke tests**

Run: `npm run check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/worker.js
git commit -m "feat: encode hysteria2:// URI in worker.js"
```

---

## Task 7: worker.js — Render Hysteria2 in Clash

**Files:**
- Modify: `src/worker.js:250-431`

- [ ] **Step 1: Add hysteria2 rendering in renderClash**

In `renderClash` (`src/worker.js:250-431`), after the `trojan` block (after line 386, before `return ''`), add:

```js
      if (node.type === 'hysteria2') {
        const lines = [
          `  - name: "${escapeYaml(node.name)}"`,
          `    type: hysteria2`,
          `    server: ${node.server}`,
          `    port: ${node.port}`,
          `    password: "${escapeYaml(node.password || '')}"`,
          `    udp: true`,
        ];

        if (node.tls) {
          lines.push(`    tls: true`);
        }

        if (node.sni) {
          lines.push(`    sni: "${escapeYaml(node.sni)}"`);
        }

        if (node.alpn) {
          lines.push(`    alpn:`);
          node.alpn.split(',').forEach((a) => {
            lines.push(`      - "${escapeYaml(a.trim())}"`);
          });
        }

        if (node.obfs) {
          lines.push(`    obfs: "${escapeYaml(node.obfs)}"`);
        }
        if (node.obfsPassword) {
          lines.push(`    obfs-password: "${escapeYaml(node.obfsPassword)}"`);
        }

        if (node.fp) {
          lines.push(`    fingerprint: "${escapeYaml(node.fp)}"`);
        }

        if (node.ech) {
          lines.push(`    ech: "${escapeYaml(node.ech)}"`);
        }

        lines.push(`    skip-cert-verify: ${node.allowInsecure ? 'true' : 'false'}`);

        return lines.join('\n');
      }
```

- [ ] **Step 2: Run smoke tests**

Run: `npm run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/worker.js
git commit -m "feat: render hysteria2 proxy in Clash format (worker.js)"
```

---

## Task 8: worker.js — Render Hysteria2 in Surge

**Files:**
- Modify: `src/worker.js:433-463`

- [ ] **Step 1: Update renderSurge to include hysteria2**

Modify `src/worker.js:433-463`:

```js
function renderSurge(nodes, baseUrl, accessToken) {
  const proxies = nodes
    .filter((node) => node.type === 'vmess' || node.type === 'trojan' || node.type === 'hysteria2')
    .map((node) => {
      if (node.type === 'vmess') {
        return `${node.name} = vmess, ${node.server}, ${node.port}, username=${node.uuid}, ws=true, ws-path=${node.path || '/'}, ws-headers=Host:${node.host || ''}, tls=${node.tls ? 'true' : 'false'}, sni=${node.sni || ''}`;
      }
      if (node.type === 'trojan') {
        return `${node.name} = trojan, ${node.server}, ${node.port}, password=${node.password || ''}, sni=${node.sni || ''}`;
      }
      // hysteria2
      const params = [`password=${node.password}`, `skip-cert-verify=${node.allowInsecure ? 'true' : 'false'}`];
      if (node.sni) params.push(`sni=${node.sni}`);
      if (node.obfs) params.push(`obfs=${node.obfs}`);
      if (node.obfsPassword) params.push(`obfs-password=${node.obfsPassword}`);
      if (node.fp) params.push(`fingerprint=${node.fp}`);
      return `${node.name} = hysteria2, ${node.server}, ${node.port}, ${params.join(', ')}`;
    });

  return [
    '[General]',
    'skip-proxy = 127.0.0.1, localhost',
    '',
    '[Proxy]',
    ...proxies,
    '',
    '[Proxy Group]',
    'Proxy = select, ' +
      nodes
        .filter((n) => n.type === 'vmess' || n.type === 'trojan' || n.type === 'hysteria2')
        .map((n) => n.name)
        .join(', '),
    '',
    '[Rule]',
    'FINAL,Proxy',
    '',
    '; token-protected subscription',
    `; ${baseUrl}?token=${accessToken}`,
  ].join('\n');
}
```

- [ ] **Step 2: Run smoke tests**

Run: `npm run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/worker.js
git commit -m "feat: render hysteria2 proxy in Surge format (worker.js)"
```

---

## Task 9: Frontend — Update protocol references

**Files:**
- Modify: `public/index.html:9`
- Modify: `public/index.html:131`
- Modify: `public/index.html:134`
- Modify: `public/index.html:179`
- Modify: `public/index.html:182`

- [ ] **Step 1: Update meta description**

Line 9:
```html
<meta name="description" content="将自建 vmess/vless/trojan/hysteria2 节点批量替换为优选 IP 或直接聚合，并导出 Clash、V2rayN、Shadowrocket、Surge 可用订阅链接。" />
```

- [ ] **Step 2: Update preferred mode placeholder and hint**

Line 131:
```html
placeholder="支持 vmess://、vless://、trojan://、hysteria2://，一行一个。也支持直接粘贴原始 base64 订阅内容。"
```

Line 134:
```html
<p class="hint">支持 vmess / vless / trojan / hysteria2，一行一个。兼容自建 WS + TLS 写法，也支持粘贴 base64 订阅。</p>
```

- [ ] **Step 3: Update aggregate mode placeholder and hint**

Line 179:
```html
placeholder="支持 vmess://、vless://、trojan://、hysteria2://，一行一个。也支持直接粘贴原始 base64 订阅内容。"
```

Line 182:
```html
<p class="hint">支持 vmess / vless / trojan / hysteria2，一行一个。兼容自建 WS + TLS 写法，也支持粘贴 base64 订阅。节点将原样聚合，名称自动追加「| 聚合」后缀。</p>
```

- [ ] **Step 4: Run smoke tests**

Run: `npm run check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add public/index.html
git commit -m "feat: mention hysteria2 in frontend placeholders"
```

---

## Task 10: Smoke tests — Hysteria2 coverage

**Files:**
- Modify: `tests/smoke.mjs`

- [ ] **Step 1: Add import for renderNodeUri**

Add to the import list from `../src/core.js`:
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
  renderNodeUri,
  SUPPORTED_PROTOCOLS,
} from '../src/core.js';
```

- [ ] **Step 2: Add hysteria2 test cases at the end of smoke.mjs**

Append before the final `console.log('smoke test passed')`:

```js
// Test Hysteria2 parsing with full params
const hysteria2Uri = 'hysteria2://AMM2wPMO7l@xui2.songwh.top:19127?security=tls&fp=chrome&alpn=h3&ech=AGL%2BDQBeAAAgACAY93wNf3pOPKE%2BxZ9OwdPUo98kAPksXrwUgMvq2trNegAkAAEAAQABAAIAAQADAAIAAQACAAIAAgADAAMAAQADAAIAAwADAA94dWkyLnNvbmd3aC50b3AAAA%3D%3D&sni=xui2.songwh.top&obfs=salamander&obfs-password=7DyY9YXAqFL9hG-Vqb3i#%E6%96%B0%E5%8A%A0%E5%9D%A1-rabis-hy2-1';
const { nodes: hy2Nodes, warnings: hy2Warnings } = parseNodeLinks(hysteria2Uri);
assert.equal(hy2Nodes.length, 1, 'should parse 1 hysteria2 node');
assert.equal(hy2Warnings.length, 0, 'should have no warnings');
const hy2 = hy2Nodes[0];
assert.equal(hy2.type, 'hysteria2');
assert.equal(hy2.server, 'xui2.songwh.top');
assert.equal(hy2.port, 19127);
assert.equal(hy2.password, 'AMM2wPMO7l');
assert.equal(hy2.tls, true);
assert.equal(hy2.sni, 'xui2.songwh.top');
assert.equal(hy2.fp, 'chrome');
assert.deepEqual(hy2.alpn, ['h3']);
assert.equal(hy2.ech, 'AGL+DQBeAAAgACAY93wNf3pOPKE+xZ9OwdPUo98kAPksXrwUgMvq2trNegAkAAEAAQABAAIAAQADAAIAAQACAAIAAgADAAMAAQADAAIAAwADAA94dWkyLnNvbmd3aC50b3AAAA==');
assert.equal(hy2.obfs, 'salamander');
assert.equal(hy2.obfsPassword, '7DyY9YXAqFL9hG-Vqb3i');
assert.equal(hy2.allowInsecure, false);
assert.equal(hy2.name, '新加坡-rabis-hy2-1');

// Test SUPPORTED_PROTOCOLS includes hysteria2
assert.ok(SUPPORTED_PROTOCOLS.includes('hysteria2'), 'SUPPORTED_PROTOCOLS should include hysteria2');

// Test Hysteria2 Raw round-trip
const hy2Raw = renderNodeUri(hy2);
assert.ok(hy2Raw.startsWith('hysteria2://'), 'raw should start with hysteria2://');
const { nodes: hy2Reparsed } = parseNodeLinks(hy2Raw);
assert.equal(hy2Reparsed[0].type, 'hysteria2');
assert.equal(hy2Reparsed[0].server, hy2.server);
assert.equal(hy2Reparsed[0].port, hy2.port);
assert.equal(hy2Reparsed[0].password, hy2.password);
assert.equal(hy2Reparsed[0].sni, hy2.sni);

// Test Hysteria2 Clash rendering
const hy2Clash = renderClashSubscription([hy2]);
assert.match(hy2Clash, /type: hysteria2/);
assert.match(hy2Clash, /password: AMM2wPMO7l/);
assert.match(hy2Clash, /obfs: salamander/);
assert.match(hy2Clash, /obfs-password: 7DyY9YXAqFL9hG-Vqb3i/);
assert.match(hy2Clash, /fingerprint: chrome/);
assert.match(hy2Clash, /sni: xui2\.songwh\.top/);

// Test Hysteria2 Surge rendering
const hy2Surge = renderSurgeSubscription([hy2], 'https://sub.example.com/sub/demo?target=surge');
assert.match(hy2Surge, /hysteria2/);
assert.match(hy2Surge, /password=AMM2wPMO7l/);
assert.match(hy2Surge, /sni=xui2\.songwh\.top/);

// Test minimal Hysteria2 URI (defaults)
const hy2Minimal = 'hysteria2://pass@example.com:443#minimal';
const { nodes: hy2MinNodes } = parseNodeLinks(hy2Minimal);
assert.equal(hy2MinNodes[0].tls, false);
assert.equal(hy2MinNodes[0].port, 443);
assert.deepEqual(hy2MinNodes[0].alpn, []);
```

- [ ] **Step 3: Run smoke tests**

Run: `npm run check`
Expected: PASS with all new assertions passing

- [ ] **Step 4: Commit**

```bash
git add tests/smoke.mjs
git commit -m "test: add hysteria2 smoke test coverage"
```

---

## Self-Review Checklist

Before handing off to execution, verify:

1. **Spec coverage:** Every design spec section has a corresponding task:
   - ✅ URI parsing (Task 1, Task 5)
   - ✅ Raw encoding (Task 2, Task 6)
   - ✅ Clash rendering (Task 3, Task 7)
   - ✅ Surge rendering (Task 4, Task 8)
   - ✅ Frontend updates (Task 9)
   - ✅ Testing (Task 10)

2. **Placeholder scan:** No "TBD", "TODO", "implement later" in the plan.

3. **Type consistency:**
   - Node object field names match between parse functions and render functions
   - `obfsPassword` used consistently (not `obfs_password` or `obfs-password` in node objects)
   - `allowInsecure` boolean logic consistent across both files
