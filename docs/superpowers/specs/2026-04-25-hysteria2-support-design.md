# Hysteria2 Protocol Support Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Hysteria2 (`hysteria2://`) protocol parsing and subscription rendering to CloudflareSub, alongside existing vmess/vless/trojan support.

**Architecture:** Follow the existing minimal-invasive pattern. Add `hysteria2` as a parallel protocol type in both `src/worker.js` (production runtime) and `src/core.js` (test utilities). No refactoring of existing protocol code.

**Tech Stack:** Vanilla JS (Cloudflare Worker runtime), no new dependencies.

---

## Scope

- **In scope:** `hysteria2://` URI parsing, Clash/Mihomo `hysteria2` proxy rendering, Surge `hysteria2` proxy rendering, Raw/base64 `hysteria2://` URI encoding, frontend type recognition.
- **Out of scope:** Hysteria v1 (`hysteria://`), `hy2://` shorthand alias, GUI protocol-specific fields (all handled via generic node preview table).
- **Not decomposable:** This is a single protocol addition that touches parsing + rendering in parallel. Cannot be split into independently shippable subsystems.

---

## Node Object Schema (hysteria2)

After parsing, a hysteria2 node is represented as:

```js
{
  type: 'hysteria2',
  name: '新加坡-rabis-hy2-1-d12k4t80',
  server: 'xui2.songwh.top',
  port: 19127,
  password: 'AMM2wPMO7l',           // auth field from URI
  tls: true,                         // security === 'tls'
  sni: 'xui2.songwh.top',
  fp: 'chrome',                      // client fingerprint
  alpn: 'h3',                        // comma-separated in URI, stored as string
  ech: 'AGL+DQBeAAAg...',           // Encrypted Client Hello (base64url)
  obfs: 'salamander',                // obfuscation type
  obfsPassword: '7DyY9YXAqFL9hG-Vqb3i',
  allowInsecure: false,
}
```

All fields are optional except `type`, `name`, `server`, `port`, `password`.

---

## Files to Touch

### Production Runtime

- **`src/worker.js`**
  - Add `parseHysteria2(link)` function after `parseUrlLike`
  - Update `parseRawLinks` to detect `hysteria2://` prefix
  - Add `encodeHysteria2(node)` after `encodeTrojan`
  - Update `renderClash` to handle `node.type === 'hysteria2'`
  - Update `renderSurge` to handle `node.type === 'hysteria2'`
  - Update `renderRaw` to include `hysteria2` nodes

### Test Utilities

- **`src/core.js`**
  - Update `SUPPORTED_PROTOCOLS` to include `'hysteria2'`
  - Add `parseHysteria2Uri(link)` in `parseSingleNode`
  - Add `renderHysteria2Uri(node)` for Raw output
  - Update `renderClashProxy` to handle `hysteria2` type
  - Update `renderSurgeProxy` to handle `hysteria2` type
  - Update `renderNodeUri` to dispatch `hysteria2`

### Frontend

- **`public/index.html`**
  - Update `nodeLinks` and `aggregateNodeLinks` textarea placeholders to mention `hysteria2://`
  - Update empty-state helper text if it mentions supported protocols

- **`public/app.js`**
  - No structural changes needed (node preview table dynamically reads `node.type`)
  - Verify no hardcoded protocol list excludes hysteria2

### Tests

- **`tests/smoke.mjs`**
  - Add hysteria2 URI parsing test case
  - Add Clash hysteria2 proxy rendering assertion
  - Add Surge hysteria2 proxy rendering assertion
  - Add Raw round-trip (parse → render → parse) test

---

## Detailed Design

### 1. URI Parsing (`hysteria2://`)

Input format:
```
hysteria2://password@server:port?security=tls&fp=chrome&alpn=h3&ech=BASE64&sni=DOMAIN&obfs=salamander&obfs-password=PASS#NAME
```

Parse rules:
- `password` = `decodeURIComponent(u.username)`
- `server` = `u.hostname`
- `port` = `Number(u.port || 443)`
- `tls` = `(u.searchParams.get('security') || '').toLowerCase() === 'tls'`
- `sni` = `u.searchParams.get('sni') || ''`
- `fp` = `u.searchParams.get('fp') || ''`
- `alpn` = `u.searchParams.get('alpn') || ''`
- `ech` = `u.searchParams.get('ech') || ''`
- `obfs` = `u.searchParams.get('obfs') || ''`
- `obfsPassword` = `u.searchParams.get('obfs-password') || ''`
- `allowInsecure` = same logic as vless/trojan (`allowInsecure` or `insecure` param)
- `name` = `decodeURIComponent(u.hash.replace(/^#/, ''))`

### 2. Raw Encoding (`hysteria2://`)

Rebuild the URI:
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

### 3. Clash / Mihomo Rendering

```yaml
- name: "节点名"
  type: hysteria2
  server: xui2.songwh.top
  port: 19127
  password: AMM2wPMO7l
  tls: true
  sni: xui2.songwh.top
  alpn:
    - h3
  obfs: salamander
  obfs-password: 7DyY9YXAqFL9hG-Vqb3i
  fingerprint: chrome
  skip-cert-verify: false
```

Output rules:
- Always output `password`, `server`, `port`
- Output `tls: true` only when `node.tls` is truthy
- Output `sni` when present
- Output `alpn` as YAML array when present (split by comma if multiple)
- Output `obfs` and `obfs-password` when present
- Output `fingerprint` when `node.fp` present
- Output `ech` when present (Clash Meta/Mihomo supports this)
- Output `skip-cert-verify` based on `node.allowInsecure`

### 4. Surge Rendering

Surge 4+ Hysteria2 proxy line format:
```
节点名 = hysteria2, server, port, password=xxx, sni=xxx, ...
```

Specifically:
```
节点名 = hysteria2, xui2.songwh.top, 19127, password=AMM2wPMO7l, sni=xui2.songwh.top, skip-cert-verify=false
```

Add obfs params if present: `obfs=salamander`, `obfs-password=xxx`.
Add `fingerprint=chrome` if fp present.

### 5. Shadowrocket

Shadowrocket 直接支持 `hysteria2://` URI 导入。Raw 订阅格式中的 `hysteria2://` URI 即可被识别。无需特殊渲染逻辑。

### 6. Frontend Changes

Minimal:
- Update placeholder text in `index.html` line 131 and 179: change "支持 vmess://、vless://、trojan://" to "支持 vmess://、vless://、trojan://、hysteria2://"
- Update `SUPPORTED_PROTOCOLS` in `core.js` line 6
- The node preview table already dynamically renders `node.type`, so no JS change needed for display

---

## Error Handling

- Parsing failure: same pattern as vless/trojan — catch and push to warnings array, skip the line
- Missing password: throw parse error (hysteria2 requires auth)
- Missing server/port: throw parse error
- Rendering to Clash/Surge with unsupported fields: silently omit unsupported fields (existing pattern)

## Testing

Smoke tests must cover:
1. Parse a full hysteria2 URI with all params → verify every field
2. Parse minimal hysteria2 URI (password, server, port only) → verify defaults
3. Render Clash hysteria2 proxy → verify YAML structure
4. Render Surge hysteria2 proxy → verify line format
5. Raw round-trip: parse → render → re-parse → verify equality
6. `SUPPORTED_PROTOCOLS` includes `'hysteria2'`

## Risks

- **ECH parameter encoding:** The `ech` param in URI is base64url-encoded. When rebuilding URI, we must preserve the original encoding or re-encode correctly.
- **Surge compatibility:** Surge 的 hysteria2 支持在不同版本间有差异。如果 Surge 渲染出错，需要 gracefully degrade（但当前项目没有 fallback 机制，所以会作为已知限制文档化）。
- **worker.js / core.js 同步:** 两个文件的逻辑需要保持一致，这是现有技术债。改 hysteria2 时两边必须同步修改。
