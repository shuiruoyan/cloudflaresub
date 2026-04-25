import assert from 'node:assert/strict';
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

const vmess = 'vmess://ewogICJ2IjogIjIiLAogICJwcyI6ICJkZW1vLXdzLXRscyIsCiAgImFkZCI6ICJlZGdlLmV4YW1wbGUuY29tIiwKICAicG9ydCI6ICI0NDMiLAogICJpZCI6ICIwMDAwMDAwMC0wMDAwLTQwMDAtODAwMC0wMDAwMDAwMDAwMDEiLAogICJzY3kiOiAiYXV0byIsCiAgIm5ldCI6ICJ3cyIsCiAgInRscyI6ICJ0bHMiLAogICJwYXRoIjogIi93cyIsCiAgImhvc3QiOiAiZWRnZS5leGFtcGxlLmNvbSIsCiAgInNuaSI6ICJlZGdlLmV4YW1wbGUuY29tIiwKICAiZnAiOiAiY2hyb21lIiwKICAiYWxwbiI6ICJoMixodHRwLzEuMSIKfQ==';

const { nodes } = parseNodeLinks(vmess);
assert.equal(nodes.length, 1);
assert.equal(nodes[0].type, 'vmess');
assert.equal(nodes[0].server, 'edge.example.com');

const { endpoints } = parsePreferredEndpoints('104.16.1.2#HK\n104.17.2.3:2053#US');
assert.equal(endpoints.length, 2);

const expanded = expandNodes(nodes, endpoints, { keepOriginalHost: true, namePrefix: 'CF' });
assert.equal(expanded.nodes.length, 2);
assert.equal(expanded.nodes[0].server, '104.16.1.2');
assert.equal(expanded.nodes[0].hostHeader, 'edge.example.com');
assert.equal(expanded.nodes[1].port, 2053);

const raw = renderRawSubscription(expanded.nodes);
assert.ok(raw.length > 10);

const clash = renderClashSubscription(expanded.nodes);
assert.match(clash, /proxies:/);
assert.match(clash, /edge\.example\.com/);

const surge = renderSurgeSubscription(expanded.nodes, 'https://sub.example.com/sub/demo?target=surge');
assert.match(surge, /\[Proxy]/);
assert.match(surge, /vmess/);

const secret = 'this-is-a-very-secret-key';
const token = await encryptPayload({ nodes: expanded.nodes }, secret);
const payload = await decryptPayload(token, secret);
assert.equal(payload.nodes.length, 2);

// Test aggregate mode node prefixing
const aggregateNodes = prefixAggregateNodes(nodes);
assert.equal(aggregateNodes.length, 1);
assert.equal(aggregateNodes[0].name, 'demo-ws-tls | 聚合');
assert.equal(aggregateNodes[0].server, 'edge.example.com');

// Test default preferred prefix in expandNodes
const expandedDefault = expandNodes(nodes, endpoints, { keepOriginalHost: true });
assert.ok(expandedDefault.nodes[0].name.includes(' | 优选-1'), 'default preferred prefix should contain "优选-1"');
assert.ok(expandedDefault.nodes[0].name.includes('优选'), 'default preferred prefix should contain "优选"');

// Test merge order: preferred nodes first, then aggregate
const mergedNodes = [...expandedDefault.nodes, ...aggregateNodes];
assert.equal(mergedNodes.length, 3);
assert.ok(mergedNodes[0].name.includes('优选'));
assert.ok(mergedNodes[2].name.includes('聚合'));

// Test VLESS with Reality and xhttp parameters
const vlessReality = 'vless://00000000-0000-4000-8000-000000000002@reality.example.com:443?security=reality&sni=www.example.com&fp=chrome&pbk=AbCdEf123&sid=abcd1234&spx=%2F&flow=xtls-rprx-vision&allowInsecure=1&type=xhttp&mode=auto&extra=%7B%7D#reality-node';
const { nodes: vlessNodes } = parseNodeLinks(vlessReality);
assert.equal(vlessNodes.length, 1);
const vlessNode = vlessNodes[0];
assert.equal(vlessNode.type, 'vless');
assert.equal(vlessNode.security, 'reality');
assert.equal(vlessNode.pbk, 'AbCdEf123');
assert.equal(vlessNode.sid, 'abcd1234');
assert.equal(vlessNode.spx, '/');
assert.equal(vlessNode.flow, 'xtls-rprx-vision');
assert.equal(vlessNode.allowInsecure, true);
assert.equal(vlessNode.mode, 'auto');
assert.equal(vlessNode.extra, '{}');
assert.equal(vlessNode.network, 'xhttp');

// Test VLESS with grpc serviceName and authority
const vlessGrpc = 'vless://00000000-0000-4000-8000-000000000003@grpc.example.com:443?security=tls&type=grpc&serviceName=svc&authority=auth.example.com#grpc-node';
const { nodes: grpcNodes } = parseNodeLinks(vlessGrpc);
assert.equal(grpcNodes.length, 1);
assert.equal(grpcNodes[0].serviceName, 'svc');
assert.equal(grpcNodes[0].authority, 'auth.example.com');
assert.equal(grpcNodes[0].network, 'grpc');

// Test VLESS peer alias for sni
const vlessPeer = 'vless://00000000-0000-4000-8000-000000000004@peer.example.com:443?peer=peer-sni.example.com#peer-node';
const { nodes: peerNodes } = parseNodeLinks(vlessPeer);
assert.equal(peerNodes[0].sni, 'peer-sni.example.com');

// Test aggregate mode render pipelines
const aggRaw = renderRawSubscription(aggregateNodes);
assert.ok(aggRaw.length > 10);

const aggClash = renderClashSubscription(aggregateNodes);
assert.match(aggClash, /proxies:/);
assert.match(aggClash, /\| 聚合/);

const aggSurge = renderSurgeSubscription(aggregateNodes, 'https://sub.example.com/sub/demo?target=surge');
assert.match(aggSurge, /\[Proxy]/);

// Test Clash rendering for xhttp and Reality
const clashVless = renderClashSubscription([vlessNode]);
assert.match(clashVless, /reality-opts:/);
assert.match(clashVless, /public-key:/);
assert.match(clashVless, /xhttp-opts:/);
assert.match(clashVless, /mode:/);

// Test Clash rendering for grpc with serviceName
const clashGrpc = renderClashSubscription([grpcNodes[0]]);
assert.match(clashGrpc, /grpc-opts:/);
assert.match(clashGrpc, /grpc-service-name:/);
assert.match(clashGrpc, /authority:/);

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
assert.match(hy2Clash, /password: "AMM2wPMO7l"/);
assert.match(hy2Clash, /obfs: "salamander"/);
assert.match(hy2Clash, /obfs-password: "7DyY9YXAqFL9hG-Vqb3i"/);
assert.match(hy2Clash, /client-fingerprint: "chrome"/);
assert.match(hy2Clash, /servername: "xui2\.songwh\.top"/);

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

console.log('smoke test passed');
