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

console.log('smoke test passed');
