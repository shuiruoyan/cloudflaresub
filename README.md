<h1 align="center">
  <img src="./public/icons/auto.svg" alt="CloudflareSub Logo" height="40" align="absmiddle" /> CloudflareSub
</h1>

<p align="center"><em>一个轻量化的代理节点订阅管理器</em></p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-2ea44f" alt="License MIT" />
  <img src="https://img.shields.io/badge/runtime-Cloudflare%20Workers-F38020?logo=cloudflare&logoColor=white" alt="Cloudflare Workers" />
  <img src="https://img.shields.io/badge/status-active-00C853" alt="Status Active" />
</p>

## 功能特性

- **双模式订阅**
  - **聚合模式**：直接聚合 vmess / vless / trojan / hysteria2 节点，输出多格式订阅
  - **优选 IP 模式**：将自建节点批量替换为优选 IP / 优选域名，生成组合节点
- **多协议支持**：`vmess`、`vless`、`trojan`、`hysteria2`，支持 VLESS Reality + xhttp 扩展参数
- **Base64 订阅文本自动展开**：直接粘贴原始订阅内容即可解析
- **固定订阅 URL**：`/sub/:id` 格式，一次配置永久使用
- **节点管理**：节点预览表格支持过滤、排序、分页，支持批量删除与重置排除
- **多格式导出**：Raw（Base64）/ Clash（YAML）/ Surge（文本）/ Shadowrocket
- **登录鉴权**：`AUTHOR_NAME` + `ADMIN_PASSWORD` 保护管理后台
- **订阅保护**：`SUB_ACCESS_TOKEN` 防止订阅链接被滥用
- **URL 轮换**：手动更新订阅 ID，旧链接立即失效
- **数据持久化**：Workers KV 存储，配置不丢失
- **精致主题**：4 种色系（赤陶橘 / 鼠尾草绿 / 烟灰玫瑰 / 深青灰）× 深色/浅色双模式

## 项目结构

```text
cloudflaresub/
├─ src/
│  ├─ worker.js      # Worker 入口（API + 订阅输出）
│  └─ core.js        # 解析/渲染核心函数（测试使用）
├─ public/           # 前端静态资源
│  ├─ index.html     # 前端页面
│  ├─ styles.css     # 样式
│  ├─ app.js         # 前端逻辑
│  └─ icons/         # 客户端图标
├─ tests/smoke.mjs   # Smoke test
├─ wrangler.toml
└─ package.json
```

## 快速开始

### 1) 准备代码

- Fork 或克隆本项目到 GitHub
- 确认 `wrangler.toml` 中 `name`、`main`、`assets` 路径正确

### 2) 创建 KV Namespace

在 Cloudflare Dashboard 中：
- 进入 `Storage & Databases` -> `KV`
- 点击 `Create namespace`
- 名称填 `SUB_STORE`
- 将返回的 `id` 填入 `wrangler.toml` 的 `[[kv_namespaces]]` 中

### 3) 配置环境变量

在 Worker 项目的 `Settings` -> `Variables` 中配置：

| 变量名 | 类型 | 说明 |
|--------|------|------|
| `AUTHOR_NAME` | 普通变量 | 登录用户名 |
| `ADMIN_PASSWORD` | Secret | 登录密码 |
| `SUB_ACCESS_TOKEN` | Secret | 订阅链接访问令牌（可选但强烈建议） |

**说明**：
- `AUTHOR_NAME` + `ADMIN_PASSWORD` 用于保护管理后台，未配置时任何人可访问
- `SUB_ACCESS_TOKEN` 用于保护订阅链接，未配置时订阅链接可被任意访问

### 4) 部署

**方式 A：GitHub 自动部署（推荐）**
- 在 `Workers & Pages` 点击 `Create` -> `Import a repository`
- 选择 GitHub 仓库
- Framework preset: `None`
- Build command: 留空
- Build output directory: 留空
- 保存并部署

**方式 B：命令行部署**
```bash
npm install
npx wrangler deploy
```

### 5) 验证

- 打开 Worker 域名
- 使用配置的 `AUTHOR_NAME` 和 `ADMIN_PASSWORD` 登录
- 选择聚合模式或优选 IP 模式，输入节点链接
- 点击"保存配置"生成订阅
- 在各客户端中导入对应的订阅链接

## API 说明

### `POST /api/login`

登录获取访问令牌。

请求体：
```json
{
  "username": "your_author_name",
  "password": "your_admin_password"
}
```

返回：
```json
{
  "ok": true,
  "token": "your_sub_access_token"
}
```

### `GET /api/subscription`

获取当前订阅配置（需 `x-sub-token` Header 或 `token` 查询参数）。

返回：
```json
{
  "ok": true,
  "exists": true,
  "preferred": {
    "nodeLinks": "...",
    "preferredIps": "...",
    "namePrefix": "CF",
    "keepOriginalHost": true
  },
  "aggregate": {
    "nodeLinks": "..."
  },
  "fixedId": "AbC123xYz9",
  "counts": {
    "preferredNodes": 3,
    "aggregateNodes": 5,
    "totalNodes": 15
  },
  "preview": [...],
  "excluded": [...]
}
```

### `POST /api/update-subscription`

保存或更新订阅配置。

请求体（优选 IP 模式）：
```json
{
  "mode": "preferred",
  "nodeLinks": "vmess://...\nvless://...",
  "preferredIps": "104.16.1.2#HK\n104.17.2.3:2053#US",
  "namePrefix": "CF",
  "keepOriginalHost": true
}
```

请求体（聚合模式）：
```json
{
  "mode": "aggregate",
  "nodeLinks": "vmess://...\nvless://..."
}
```

返回：
```json
{
  "ok": true,
  "isNew": false,
  "fixedId": "AbC123xYz9",
  "counts": { ... },
  "preview": [...],
  "excluded": [...]
}
```

### `POST /api/update-url`

轮换固定订阅 URL（旧链接立即失效）。

返回：
```json
{
  "ok": true,
  "fixedId": "newIdHere"
}
```

### `POST /api/exclude-node`

排除单个节点。

请求体：
```json
{ "name": "节点名称" }
```

### `POST /api/exclude-nodes`

批量排除节点。

请求体：
```json
{ "names": ["节点1", "节点2"] }
```

### `POST /api/reset-excluded`

重置排除列表，恢复所有被排除的节点。

### `GET /sub/:id`

按 `target` 返回订阅内容：
- `target=raw`（默认）：Base64 编码的节点链接
- `target=clash`：Clash / Mihomo YAML 配置
- `target=surge`：Surge 代理配置

示例：
```bash
curl "https://<worker>/sub/AbC123xYz9?target=clash&token=<SUB_ACCESS_TOKEN>"
```

## 前端管理后台

根路径 `/` 提供网页管理后台，采用编辑杂志风格设计：

- **登录界面**：简洁的节点控制台风格，需 AUTHOR_NAME + ADMIN_PASSWORD
- **模式切换**：聚合模式 / 优选 IP 模式，药丸式 Tab 切换
- **配置表单**：粘贴节点链接、优选 IP、设置备注前缀、保留原 Host/SNI 选项
- **主题系统**：4 种色系（赤陶橘 / 鼠尾草绿 / 烟灰玫瑰 / 深青灰）× 深色/浅色双模式
- **客户端选项卡**：自动 / V2rayN / Clash / 小火箭 / Surge 五种格式，一键切换
- **订阅链接终端**：一键复制、二维码扫描导入
- **统计面板**：原始节点数、聚合节点数、总计节点数
- **节点预览表格**：完整节点列表，支持列过滤、列排序、分页浏览、批量删除、重置排除
- **操作反馈**：Toast 通知（成功/失败/警告）、确认对话框
- **URL 轮换**：手动更新订阅 ID，旧链接立即失效

## 注意事项

- 优选 IP 模式下，系统不会帮你寻找优选 IP，只负责将节点地址替换为你提供的 IP/域名
- Surge 导出当前仅包含 `vmess` / `trojan` / `hysteria2` 节点；`vless` 节点在 Surge 中可能不兼容
- 推荐勾选"保留原 Host / SNI"，更适合 Cloudflare CDN 场景
- 订阅链接包含敏感信息，请勿公开分享
- 部署前务必配置 `ADMIN_PASSWORD` 和 `SUB_ACCESS_TOKEN`，防止未授权访问

## License

MIT
