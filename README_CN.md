# PolyMind — AI 预测市场分析器

基于 AI 的 [Polymarket](https://polymarket.com/) 预测市场分析工具。浏览事件、查看市场数据，并通过 AI 获取结果概率分析。

**在线体验：** [polymind-rho.vercel.app](https://polymind-rho.vercel.app/)

## 功能

### 事件浏览

- 网格视图展示 Polymarket 实时事件，包含图片、市场数量和交易量
- 分页加载（每页 50 个事件），支持无限滚动
- 点击任意事件打开侧边详情面板

### 市场数据

- 每个市场的 Yes/No 结果概率条
- 关键指标：交易量、流动性、买卖价差
- 通过 CLOB API 获取实时订单簿深度（买单/卖单）
- 每日奖励资格标识

### AI 分析

- 一键对任意事件的市场进行 AI 分析
- 流式响应，实时 Markdown 渲染（支持表格、列表等）
- 兼容**任何 OpenAI 格式的 API** — 支持 OpenAI、MiniMax、DeepSeek、本地模型等
- 可自定义 Prompt 模板，支持变量插值（`${event.title}`、`${marketsText}` 等）
- 设置中提供 Prompt 预览/测试功能

### 联网搜索集成

- 可选接入 [Tavily](https://tavily.com/) 实现实时联网搜索
- AI 自主判断是否需要搜索补充信息
- 搜索过程带有状态指示器
- 每次分析最多 3 轮搜索

### 分析历史

- 所有 AI 分析自动保存到本地存储
- 历史侧边栏可查看、重读或删除历史分析
- 重新访问事件时自动恢复上次分析结果

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 19 + TypeScript |
| 构建 | Vite 7 |
| 样式 | Tailwind CSS 4 |
| 动画 | Framer Motion |
| 图标 | Lucide React |
| Markdown | react-markdown + remark-gfm |
| HTTP | Axios（Polymarket API）、Fetch（AI 流式请求） |
| 部署 | Vercel |

## 快速开始

### 环境要求

- Node.js >= 18
- OpenAI 兼容格式的 API Key（OpenAI、MiniMax、DeepSeek 等）
- （可选）[Tavily API Key](https://tavily.com/) 用于联网搜索

### 安装与运行

```bash
git clone https://github.com/your-username/polymind.git
cd polymind
npm install
npm run dev
```

浏览器打开 [http://localhost:5173](http://localhost:5173)。

### 配置

点击右上角的 **设置** 图标进行配置：

| 字段 | 说明 |
|------|------|
| API Base URL | AI 服务商的接口地址（如 `https://api.openai.com`） |
| API Key | 你的 API 密钥 |
| Model | 模型名称（如 `gpt-5`） |
| Tavily API Key | （可选）启用 AI 联网搜索功能 |
| Prompt Template | 自定义分析提示词，支持事件/市场变量 |

所有配置保存在浏览器本地存储中，不会发送到任何第三方服务器（仅与你配置的 AI 服务商通信）。

### 生产构建

```bash
npm run build
npm run preview
```

## 许可证

MIT
