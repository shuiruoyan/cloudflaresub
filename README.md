<h1 align="center">
  <img src="./public/icons/auto.svg" alt="CloudflareSub Logo" height="40" align="absmiddle" /> CloudflareSub
</h1>

<p align="center"><em>一个轻量化的优选IP订阅器</em></p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-2ea44f" alt="License MIT" />
  <img src="https://img.shields.io/badge/runtime-Cloudflare%20Workers-F38020?logo=cloudflare&logoColor=white" alt="Cloudflare Workers" />
  <img src="https://img.shields.io/badge/status-active-00C853" alt="Status Active" />
</p>

## 功能特性

- 支持 `vmess`、`vless`、`trojan` 节点解析
- 支持 Base64 订阅文本自动展开
- 支持 `host[:port][#remark]` 格式的优选地址
- 固定订阅 URL：一次配置，永久使用 `/sub/:id`
- 登录鉴权：`AUTHOR_NAME` + `ADMIN_PASSWORD` 管理后台
- 订阅保护：`SUB_ACCESS_TOKEN` 防止订阅链接被滥用
- 支持导出：Raw（Base64）/ Clash（YAML）/ Surge（文本）/ Shadowrocket
- 数据持久化：Workers KV 存储，配置不丢失
- 订阅 URL 支持手动轮换（旧链接立即失效）

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
- 输入节点链接和优选 IP，点击"保存配置"
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
  "config": {
    "nodeLinks": "...",
    "preferredIps": "...",
    "namePrefix": "CF",
    "keepOriginalHost": true
  },
  "fixedId": "AbC123xYz9",
  "counts": {
    "inputNodes": 3,
    "preferredEndpoints": 5,
    "outputNodes": 15
  },
  "preview": [...]
}
```

### `POST /api/update-subscription`

保存或更新订阅配置。

请求体：
```json
{
  "nodeLinks": "vmess://...\nvless://...",
  "preferredIps": "104.16.1.2#HK\n104.17.2.3:2053#US",
  "namePrefix": "CF",
  "keepOriginalHost": true
}
```

返回：
```json
{
  "ok": true,
  "isNew": false,
  "fixedId": "AbC123xYz9",
  "urls": {
    "auto": "https://<worker>/sub/AbC123xYz9?token=...",
    "raw": "https://<worker>/sub/AbC123xYz9?target=raw&token=...",
    "clash": "https://<worker>/sub/AbC123xYz9?target=clash&token=...",
    "surge": "https://<worker>/sub/AbC123xYz9?target=surge&token=..."
  },
  "counts": { ... },
  "preview": [...]
}
```

### `POST /api/update-url`

轮换固定订阅 URL（旧链接立即失效）。

返回：
```json
{
  "ok": true,
  "fixedId": "newIdHere",
  "urls": { ... }
}
```

### `GET /sub/:id`

按 `target` 返回订阅内容：
- `target=raw`（默认）：Base64 编码的节点链接
- `target=clash`：Clash / Mihomo YAML 配置
- `target=surge`：Surge 代理配置

示例：
```bash
curl "https://<worker>/sub/AbC123xYz9?target=clash&token=<SUB_ACCESS_TOKEN>"
```

## 前端页面

根路径 `/` 提供网页管理后台：
- **登录界面**：网络节点控制台风格，需 AUTHOR_NAME + ADMIN_PASSWORD
- **配置表单**：粘贴节点链接、优选 IP、设置备注前缀
- **选项卡切换**：自动 / V2rayN / Clash / 小火箭 / Surge 五种格式
- **订阅链接终端**：一键复制、二维码扫描导入
- **节点预览**：生成结果前 20 个节点预览表
- **统计面板**：原始节点数、优选地址数、生成节点数
- **Toast 通知**：操作成功/失败/警告横幅提示
- **URL 轮换**：手动更新订阅 ID，旧链接立即失效

## 注意事项

- 每条订阅记录默认保存 7 天（TTL），固定 ID 持久保存
- Surge 导出当前仅包含 `vmess` / `trojan` 节点
- VLESS 节点在 Surge 中可能不兼容
- 推荐勾选"保留原 Host / SNI"，更适合 Cloudflare CDN 场景
- 订阅链接包含敏感信息，请勿公开分享

## License

MIT
