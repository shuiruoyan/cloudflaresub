# 双模式订阅系统设计文档

## 背景

CloudflareSub 当前仅支持"单节点 + 优选 IP"模式：用户输入节点链接和优选 IP 列表，通过笛卡尔积生成大量节点并输出订阅链接。用户希望在保留该功能的基础上，新增"节点聚合模式"——直接输入多个节点链接，原样聚合输出为一个订阅链接。两种模式独立配置，但最终通过一个订阅链接合并输出全部节点。

---

## 目标

1. 保留现有优选 IP 模式的全部功能（向后兼容）
2. 新增聚合模式：输入节点链接 → 直接解析聚合 → 输出订阅
3. 两种模式通过标签页切换独立配置
4. 最终订阅链接同时包含两种模式的全部节点
5. 通过节点名称前缀区分来源：`| 优选` 和 `| 聚合`

---

## 架构设计

### 后端 API 变更

| 路由 | 方法 | 变更 |
|------|------|------|
| `POST /api/login` | POST | 不变 |
| `GET /api/subscription` | GET | 返回双模式配置 + 合并统计/预览 |
| `POST /api/update-subscription` | POST | 新增 `mode` 字段（`preferred` / `aggregate`） |
| `POST /api/update-url` | POST | 不变，旋转固定 ID |
| `GET /sub/:id` | GET | 兼容 `version: 1` 和 `version: 2` |

### `GET /api/subscription` 响应

```json
{
  "ok": true,
  "exists": true,
  "preferred": {
    "nodeLinks": "...",
    "preferredIps": "...",
    "namePrefix": "",
    "keepOriginalHost": true
  },
  "aggregate": {
    "nodeLinks": ""
  },
  "fixedId": "abc123",
  "counts": {
    "preferredNodes": 24,
    "aggregateNodes": 8,
    "totalNodes": 32
  },
  "preview": [ /* 合并后的全部节点 */ ]
}
```

### `POST /api/update-subscription` 请求

优选 IP 模式：
```json
{
  "mode": "preferred",
  "nodeLinks": "...",
  "preferredIps": "...",
  "namePrefix": "",
  "keepOriginalHost": true
}
```

聚合模式：
```json
{
  "mode": "aggregate",
  "nodeLinks": "..."
}
```

---

## KV 存储设计

| Key | 内容 | 说明 |
|------|------|------|
| `sub:data` | 优选 IP 模式配置（JSON） | **保持不变**，现有用户零迁移 |
| `sub:aggregate` | 聚合模式配置（JSON） | **新增**，字段：`{ nodeLinks }` |
| `sub:fixed-id` | 短 ID 字符串 | 不变，双模式共享 |
| `sub:${id}` | 预渲染节点 | **version: 2**，含合并后的全部节点 |

### `sub:${id}` version 2 格式

```json
{
  "version": 2,
  "updatedAt": "2026-04-24T...",
  "sources": {
    "preferred": { "options": {...}, "nodes": [...] },
    "aggregate": { "nodes": [...] }
  },
  "nodes": [ /* 合并后的全部节点，用于直接输出 */ ]
}
```

### 更新数据流

```
用户保存（指定模式）
    │
    ▼
更新对应 KV key（sub:data 或 sub:aggregate）
    │
    ▼
读取两个 KV key
    │
    ▼
解析 preferred → buildNodes() → 节点数组 A
解析 aggregate → parseRawLinks() + 命名 → 节点数组 B
    │
    ▼
合并：nodes = [...数组A, ...数组B]
    │
    ▼
写入 sub:${fixedId}（version: 2）
```

---

## 节点命名规则

### 优选 IP 模式

格式：`原节点名 | 优选 | 备注/序号`

示例：
```
香港节点 | 优选 | HK-01
香港节点 | 优选 | US-Edge
```

实现：复用现有 `buildNodes`，将原 `namePrefix` 的默认值从空字符串改为 `"优选"`。

### 聚合模式

格式：`原节点名 | 聚合`

示例：
```
香港节点 | 聚合
vmess | 聚合          // 原节点无名时
```

实现：新增 `buildAggregateNodes(rawLinks)` 函数，对 `parseRawLinks` 结果逐个追加 `| 聚合`。

### 合并输出顺序

```js
nodes = [
  ...preferredNodes,   // 优选 IP 节点在前
  ...aggregateNodes,   // 聚合节点在后
]
```

---

## 前端 UI 设计

### 标签页切换

在现有表单区域上方增加两个标签页：

```
┌─────────────────┬─────────────────┐
│   优选 IP 模式   │    聚合模式      │
└─────────────────┴─────────────────┘
```

- 默认激活"优选 IP 模式"
- 点击切换时替换下方表单内容
- 两个模式各自独立保存

### 优选 IP 模式表单

保留现有全部字段：节点链接、优选 IP、备注前缀、保留 Host/SNI 开关、保存按钮。

### 聚合模式表单

仅保留：节点链接文本框 + 保存按钮。

不需要：优选 IP、备注前缀、keepOriginalHost。

### 订阅结果区域（全局公共）

- 客户端格式切换标签（自动 / V2rayN / Clash / 小火箭 / Surge）
- 订阅链接输入框
- 复制链接 + 二维码按钮
- **更新订阅 URL 按钮**（公共功能，位于此区域）
- 统计栏：`优选节点 N | 聚合节点 M | 总计 K`
- 预览表格：**展示全部节点**（不再限制前 20 个）

---

## 错误处理

| 场景 | 行为 |
|------|------|
| 仅优选 IP 模式有数据 | 正常输出优选节点，聚合节点数为 0 |
| 仅聚合模式有数据 | 正常输出聚合节点，优选节点数为 0 |
| 两个模式都为空 | `exists: false`，不生成订阅链接 |
| 保存聚合模式时 nodeLinks 为空 | 清空 `sub:aggregate`，渲染时跳过 |
| 保存优选 IP 模式缺少节点或端点 | 返回 400（与现有行为一致） |
| 旧版 `sub:${id}` 为 `version: 1` | `handleSub` 兼容读取，直接取 `nodes` |

---

## 测试计划

Smoke 测试（`npm run check`）新增覆盖：

1. `buildAggregateNodes` 正确解析并追加 `| 聚合`
2. 合并渲染输出顺序正确（优选在前，聚合在后）
3. `version: 1` 的 `sub:${id}` 在 `handleSub` 中兼容读取
4. 空聚合配置不导致错误

---

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/worker.js` | 修改 | API 路由、双模式存储、合并渲染、version 2 格式 |
| `src/core.js` | 修改 | 同步新增聚合模式解析/渲染函数 |
| `public/index.html` | 修改 | 标签页结构、聚合模式表单、UI 布局调整 |
| `public/app.js` | 修改 | 标签页切换逻辑、双模式独立保存、合并统计/预览 |
| `tests/smoke.mjs` | 修改 | 新增聚合模式测试用例 |
