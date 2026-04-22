// Cloudflare Worker: Fixed subscription URL with token protection
// Requires:
// - KV namespace binding: SUB_STORE
// - Secret/Variable: AUTHOR_NAME (登录用户名)
// - Secret/Variable: ADMIN_PASSWORD (登录密码)
// - Secret/Variable: SUB_ACCESS_TOKEN (订阅链接访问令牌)

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type, x-sub-token',
    },
  });
}

function text(body, status = 200, contentType = 'text/plain; charset=utf-8') {
  return new Response(body, {
    status,
    headers: {
      'content-type': contentType,
      'access-control-allow-origin': '*',
    },
  });
}

function b64EncodeUtf8(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function b64DecodeUtf8(str) {
  return decodeURIComponent(escape(atob(str)));
}

function escapeYaml(str = '') {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, ' ');
}

function parsePreferredEndpoints(input) {
  return String(input || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [raw, remark = ''] = line.split('#');
      const value = raw.trim();
      const hashRemark = remark.trim();
      const match = value.match(/^(.*?)(?::(\d+))?$/);
      return {
        server: match?.[1] || value,
        port: match?.[2] ? Number(match[2]) : undefined,
        remark: hashRemark,
      };
    });
}

function parseVmess(link) {
  const raw = link.slice('vmess://'.length).trim();
  const obj = JSON.parse(b64DecodeUtf8(raw));
  return {
    type: 'vmess',
    name: obj.ps || 'vmess',
    server: obj.add,
    port: Number(obj.port || 443),
    uuid: obj.id,
    cipher: obj.scy || 'auto',
    network: obj.net || 'ws',
    tls: obj.tls === 'tls',
    host: obj.host || '',
    path: obj.path || '/',
    sni: obj.sni || obj.host || '',
    alpn: obj.alpn || '',
    fp: obj.fp || '',
  };
}

function parseUrlLike(link, type) {
  const u = new URL(link);
  return {
    type,
    name: decodeURIComponent(u.hash.replace(/^#/, '')) || type,
    server: u.hostname,
    port: Number(u.port || 443),
    password: type === 'trojan' ? decodeURIComponent(u.username) : undefined,
    uuid: type === 'vless' ? decodeURIComponent(u.username) : undefined,
    network: u.searchParams.get('type') || 'tcp',
    tls: (u.searchParams.get('security') || '').toLowerCase() === 'tls',
    host: u.searchParams.get('host') || u.searchParams.get('sni') || '',
    path: u.searchParams.get('path') || '/',
    sni: u.searchParams.get('sni') || u.searchParams.get('host') || '',
    fp: u.searchParams.get('fp') || '',
    alpn: u.searchParams.get('alpn') || '',
    flow: u.searchParams.get('flow') || '',
  };
}

function parseRawLinks(input) {
  const lines = String(input || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const result = [];
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
    try {
      const decoded = b64DecodeUtf8(line);
      if (/^(vmess|vless|trojan):\/\//m.test(decoded)) {
        result.push(...parseRawLinks(decoded));
      }
    } catch {}
  }
  return result;
}

function buildNodes(baseNodes, preferredEndpoints, options = {}) {
  const output = [];
  const prefix = (options.namePrefix || '').trim();
  let counter = 0;
  for (const node of baseNodes) {
    for (const ep of preferredEndpoints) {
      counter += 1;
      const nameParts = [];
      if (node.name) nameParts.push(node.name);
      if (prefix) nameParts.push(prefix);
      if (ep.remark) nameParts.push(ep.remark);
      else nameParts.push(String(counter));
      output.push({
        ...node,
        name: nameParts.join(' | '),
        server: ep.server,
        port: ep.port || node.port,
        host: options.keepOriginalHost ? node.host : '',
        sni: options.keepOriginalHost ? node.sni : '',
      });
    }
  }
  return output;
}

function encodeVmess(node) {
  const obj = {
    v: '2',
    ps: node.name,
    add: node.server,
    port: String(node.port),
    id: node.uuid,
    aid: '0',
    scy: node.cipher || 'auto',
    net: node.network || 'ws',
    type: 'none',
    host: node.host || '',
    path: node.path || '/',
    tls: node.tls ? 'tls' : '',
    sni: node.sni || '',
    alpn: node.alpn || '',
    fp: node.fp || '',
  };
  return 'vmess://' + b64EncodeUtf8(JSON.stringify(obj));
}

function encodeVless(node) {
  const url = new URL(`vless://${encodeURIComponent(node.uuid)}@${node.server}:${node.port}`);
  url.searchParams.set('type', node.network || 'ws');
  if (node.tls) url.searchParams.set('security', 'tls');
  if (node.host) url.searchParams.set('host', node.host);
  if (node.sni) url.searchParams.set('sni', node.sni);
  if (node.path) url.searchParams.set('path', node.path);
  if (node.alpn) url.searchParams.set('alpn', node.alpn);
  if (node.fp) url.searchParams.set('fp', node.fp);
  if (node.flow) url.searchParams.set('flow', node.flow);
  url.hash = node.name;
  return url.toString();
}

function encodeTrojan(node) {
  const url = new URL(`trojan://${encodeURIComponent(node.password)}@${node.server}:${node.port}`);
  if (node.network) url.searchParams.set('type', node.network);
  if (node.tls) url.searchParams.set('security', 'tls');
  if (node.host) url.searchParams.set('host', node.host);
  if (node.sni) url.searchParams.set('sni', node.sni);
  if (node.path) url.searchParams.set('path', node.path);
  if (node.alpn) url.searchParams.set('alpn', node.alpn);
  if (node.fp) url.searchParams.set('fp', node.fp);
  url.hash = node.name;
  return url.toString();
}

function renderRaw(nodes) {
  const lines = nodes
    .map((node) => {
      if (node.type === 'vmess') return encodeVmess(node);
      if (node.type === 'vless') return encodeVless(node);
      if (node.type === 'trojan') return encodeTrojan(node);
      return '';
    })
    .filter(Boolean);
  return b64EncodeUtf8(lines.join('\n'));
}

function renderClash(nodes) {
  const proxies = nodes
    .map((node) => {
      if (node.type === 'vmess') {
        const lines = [
          `  - name: "${escapeYaml(node.name)}"`,
          `    type: vmess`,
          `    server: ${node.server}`,
          `    port: ${node.port}`,
          `    uuid: ${node.uuid}`,
          `    alterId: 0`,
          `    cipher: ${node.cipher || 'auto'}`,
          `    udp: true`,
          `    tls: ${node.tls ? 'true' : 'false'}`,
          `    network: ${node.network || 'ws'}`,
        ];

        if (node.sni) {
          lines.push(`    servername: "${escapeYaml(node.sni)}"`);
        }

        if ((node.network || 'ws') === 'ws') {
          lines.push(
            `    ws-opts:`,
            `      path: "${escapeYaml(node.path || '/')}"`,
            `      headers:`,
            `        Host: "${escapeYaml(node.host || node.sni || '')}"`
          );
        }

        return lines.join('\n');
      }

      if (node.type === 'vless') {
        const lines = [
          `  - name: "${escapeYaml(node.name)}"`,
          `    type: vless`,
          `    server: ${node.server}`,
          `    port: ${node.port}`,
          `    uuid: ${node.uuid}`,
          `    udp: true`,
          `    tls: ${node.tls ? 'true' : 'false'}`,
          `    network: ${node.network || 'ws'}`,
        ];

        if (node.sni) {
          lines.push(`    servername: "${escapeYaml(node.sni)}"`);
        }

        if ((node.network || 'ws') === 'ws') {
          lines.push(
            `    ws-opts:`,
            `      path: "${escapeYaml(node.path || '/')}"`,
            `      headers:`,
            `        Host: "${escapeYaml(node.host || node.sni || '')}"`
          );
        }

        return lines.join('\n');
      }

      if (node.type === 'trojan') {
        const lines = [
          `  - name: "${escapeYaml(node.name)}"`,
          `    type: trojan`,
          `    server: ${node.server}`,
          `    port: ${node.port}`,
          `    password: "${escapeYaml(node.password || '')}"`,
          `    udp: true`,
        ];

        if (node.sni) {
          lines.push(`    sni: "${escapeYaml(node.sni)}"`);
        }

        if (node.tls !== false) {
          lines.push(`    tls: true`);
        }

        if (node.network) {
          lines.push(`    network: ${node.network}`);
        }

        if (node.network === 'ws') {
          lines.push(
            `    ws-opts:`,
            `      path: "${escapeYaml(node.path || '/')}"`,
            `      headers:`,
            `        Host: "${escapeYaml(node.host || node.sni || '')}"`
          );
        }

        return lines.join('\n');
      }

      return '';
    })
    .filter(Boolean);

  const proxyNames = nodes.map(
    (node) => `      - "${escapeYaml(node.name)}"`
  );

  const allGroupMembers = [
    `      - "自动选择"`,
    ...proxyNames,
    `      - DIRECT`,
  ];

  const autoGroupMembers = proxyNames.length ? proxyNames : [`      - DIRECT`];

  return [
    `mixed-port: 7890`,
    `allow-lan: false`,
    `mode: rule`,
    `log-level: info`,
    `ipv6: true`,
    ``,
    `proxies:`,
    ...(proxies.length ? proxies : []),
    ``,
    `proxy-groups:`,
    `  - name: "自动选择"`,
    `    type: url-test`,
    `    url: "http://www.gstatic.com/generate_204"`,
    `    interval: 300`,
    `    tolerance: 50`,
    `    proxies:`,
    ...autoGroupMembers,
    ``,
    `  - name: "节点选择"`,
    `    type: select`,
    `    proxies:`,
    ...allGroupMembers,
    ``,
    `rules:`,
    `  - MATCH,节点选择`,
  ].join('\n');
}

function renderSurge(nodes, baseUrl, accessToken) {
  const proxies = nodes
    .filter((node) => node.type === 'vmess' || node.type === 'trojan')
    .map((node) => {
      if (node.type === 'vmess') {
        return `${node.name} = vmess, ${node.server}, ${node.port}, username=${node.uuid}, ws=true, ws-path=${node.path || '/'}, ws-headers=Host:${node.host || ''}, tls=${node.tls ? 'true' : 'false'}, sni=${node.sni || ''}`;
      }
      return `${node.name} = trojan, ${node.server}, ${node.port}, password=${node.password || ''}, sni=${node.sni || ''}`;
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
        .filter((n) => n.type === 'vmess' || n.type === 'trojan')
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

function createShortId(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

async function createUniqueShortId(env, tries = 8) {
  for (let i = 0; i < tries; i++) {
    const id = createShortId(10);
    const exists = await env.SUB_STORE.get(`sub:${id}`);
    if (!exists) return id;
  }
  throw new Error('无法生成唯一短链接，请稍后再试');
}

function getProvidedToken(request, url) {
  const header = request?.headers?.get('x-sub-token') || '';
  const query = url.searchParams.get('token') || '';
  const pageToken = url.searchParams.get('t') || '';
  return header || query || pageToken;
}

function validateToken(request, url, env) {
  const expected = env.SUB_ACCESS_TOKEN;
  if (!expected) return { ok: true };
  const provided = getProvidedToken(request, url);
  if (!provided || provided !== expected) {
    return { ok: false, response: text('Forbidden: invalid token', 403) };
  }
  return { ok: true };
}

function checkBindings(env) {
  if (!env.SUB_STORE) {
    return { ok: false, error: 'KV namespace SUB_STORE 未绑定，请在 Cloudflare Dashboard 中绑定' };
  }
  return { ok: true };
}

async function handleLogin(request, env) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: '请求体不是合法 JSON' }, 400);
    }

    const expectedName = env.AUTHOR_NAME;
    const expectedPass = env.ADMIN_PASSWORD;
    if (!expectedName || !expectedPass) {
      return json({ ok: true, warning: '未配置 AUTHOR_NAME 或 ADMIN_PASSWORD，任何人都可以访问' });
    }

    if (body.username !== expectedName || body.password !== expectedPass) {
      return json({ ok: false, error: '用户名或密码错误' }, 403);
    }

    return json({ ok: true, token: env.SUB_ACCESS_TOKEN || '' });
  } catch (err) {
    return json({ ok: false, error: '登录处理错误: ' + (err.message || String(err)) }, 500);
  }
}

async function handleGetSubscription(request, env, url) {
  try {
    const tokenCheck = validateToken(request, url, env);
    if (!tokenCheck.ok) return tokenCheck.response;

    const bindCheck = checkBindings(env);
    if (!bindCheck.ok) return json({ ok: false, error: bindCheck.error }, 500);

    const dataRaw = await env.SUB_STORE.get('sub:data');
    const fixedId = await env.SUB_STORE.get('sub:fixed-id');

    if (!dataRaw) {
      return json({ ok: true, exists: false });
    }

    const data = JSON.parse(dataRaw);
    const result = {
      ok: true,
      exists: true,
      config: data,
      fixedId: fixedId || null,
    };

    if (fixedId) {
      const subRaw = await env.SUB_STORE.get(`sub:${fixedId}`);
      if (subRaw) {
        const sub = JSON.parse(subRaw);
        const nodes = sub.nodes || [];
        const baseNodes = parseRawLinks(data.nodeLinks || '');
        const preferredEndpoints = parsePreferredEndpoints(data.preferredIps || '');
        result.counts = {
          inputNodes: baseNodes.length,
          preferredEndpoints: preferredEndpoints.length,
          outputNodes: nodes.length,
        };
        result.preview = nodes.slice(0, 20).map((node) => ({
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

    const baseNodes = parseRawLinks(body.nodeLinks || '');
    const preferredEndpoints = parsePreferredEndpoints(body.preferredIps || '');

    if (!baseNodes.length) return json({ ok: false, error: '没有识别到可用节点' }, 400);
    if (!preferredEndpoints.length) return json({ ok: false, error: '没有识别到可用优选地址' }, 400);

    const options = {
      namePrefix: body.namePrefix || '',
      keepOriginalHost: body.keepOriginalHost !== false,
    };

    const nodes = buildNodes(baseNodes, preferredEndpoints, options);

    // Save raw config
    await env.SUB_STORE.put('sub:data', JSON.stringify({
      nodeLinks: body.nodeLinks || '',
      preferredIps: body.preferredIps || '',
      namePrefix: body.namePrefix || '',
      keepOriginalHost: body.keepOriginalHost !== false,
    }));

    // Get or create fixed ID
    let fixedId = await env.SUB_STORE.get('sub:fixed-id');
    let isNew = false;
    if (!fixedId) {
      fixedId = await createUniqueShortId(env);
      await env.SUB_STORE.put('sub:fixed-id', fixedId);
      isNew = true;
    }

    // Save rendered payload
    const payload = {
      version: 1,
      updatedAt: new Date().toISOString(),
      options,
      nodes,
    };
    await env.SUB_STORE.put(`sub:${fixedId}`, JSON.stringify(payload));

    const origin = url.origin;
    const accessToken = env.SUB_ACCESS_TOKEN || '';
    const withToken = (target) =>
      `${origin}/sub/${fixedId}${
        target
          ? `?target=${target}&token=${encodeURIComponent(accessToken)}`
          : `?token=${encodeURIComponent(accessToken)}`
      }`;

    return json({
      ok: true,
      isNew,
      fixedId,
      urls: {
        auto: withToken(''),
        raw: withToken('raw'),
        clash: withToken('clash'),
        surge: withToken('surge'),
      },
      counts: {
        inputNodes: baseNodes.length,
        preferredEndpoints: preferredEndpoints.length,
        outputNodes: nodes.length,
      },
      preview: nodes.slice(0, 20).map((node) => ({
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

async function handleUpdateUrl(request, env, url) {
  try {
    const tokenCheck = validateToken(request, url, env);
    if (!tokenCheck.ok) return tokenCheck.response;

    const bindCheck = checkBindings(env);
    if (!bindCheck.ok) return json({ ok: false, error: bindCheck.error }, 500);

    const dataRaw = await env.SUB_STORE.get('sub:data');
    if (!dataRaw) return json({ ok: false, error: '没有现有订阅配置，请先保存配置' }, 400);

    const oldId = await env.SUB_STORE.get('sub:fixed-id');

    // Generate new fixed ID
    const newId = await createUniqueShortId(env);

    // Copy old payload or re-render from data
    if (oldId) {
      const oldRaw = await env.SUB_STORE.get(`sub:${oldId}`);
      if (oldRaw) {
        const payload = JSON.parse(oldRaw);
        payload.rotatedAt = new Date().toISOString();
        await env.SUB_STORE.put(`sub:${newId}`, JSON.stringify(payload));
      } else {
        const data = JSON.parse(dataRaw);
        const baseNodes = parseRawLinks(data.nodeLinks || '');
        const preferredEndpoints = parsePreferredEndpoints(data.preferredIps || '');
        const options = {
          namePrefix: data.namePrefix || '',
          keepOriginalHost: data.keepOriginalHost !== false,
        };
        const nodes = buildNodes(baseNodes, preferredEndpoints, options);
        await env.SUB_STORE.put(`sub:${newId}`, JSON.stringify({
          version: 1,
          updatedAt: new Date().toISOString(),
          options,
          nodes,
        }));
      }
      // Invalidate old URL
      await env.SUB_STORE.delete(`sub:${oldId}`);
    } else {
      const data = JSON.parse(dataRaw);
      const baseNodes = parseRawLinks(data.nodeLinks || '');
      const preferredEndpoints = parsePreferredEndpoints(data.preferredIps || '');
      const options = {
        namePrefix: data.namePrefix || '',
        keepOriginalHost: data.keepOriginalHost !== false,
      };
      const nodes = buildNodes(baseNodes, preferredEndpoints, options);
      await env.SUB_STORE.put(`sub:${newId}`, JSON.stringify({
        version: 1,
        updatedAt: new Date().toISOString(),
        options,
        nodes,
      }));
    }

    // Save new fixed ID
    await env.SUB_STORE.put('sub:fixed-id', newId);

    const origin = url.origin;
    const accessToken = env.SUB_ACCESS_TOKEN || '';
    const withToken = (target) =>
      `${origin}/sub/${newId}${
        target
          ? `?target=${target}&token=${encodeURIComponent(accessToken)}`
          : `?token=${encodeURIComponent(accessToken)}`
      }`;

    return json({
      ok: true,
      fixedId: newId,
      urls: {
        auto: withToken(''),
        raw: withToken('raw'),
        clash: withToken('clash'),
        surge: withToken('surge'),
      },
    });
  } catch (err) {
    return json({ ok: false, error: '更新URL错误: ' + (err.message || String(err)) }, 500);
  }
}

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

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'GET,POST,OPTIONS',
            'access-control-allow-headers': 'content-type, x-sub-token',
          },
        });
      }

      if (request.method === 'POST' && url.pathname === '/api/login') {
        return handleLogin(request, env);
      }

      if (request.method === 'GET' && url.pathname === '/api/subscription') {
        return handleGetSubscription(request, env, url);
      }

      if (request.method === 'POST' && url.pathname === '/api/update-subscription') {
        return handleUpdateSubscription(request, env, url);
      }

      if (request.method === 'POST' && url.pathname === '/api/update-url') {
        return handleUpdateUrl(request, env, url);
      }

      if (request.method === 'GET' && url.pathname.startsWith('/sub/')) {
        return handleSub(url, env);
      }

      return env.ASSETS.fetch(request);
    } catch (err) {
      return json({ ok: false, error: 'Worker 全局错误: ' + (err.message || String(err)) }, 500);
    }
  },
};
