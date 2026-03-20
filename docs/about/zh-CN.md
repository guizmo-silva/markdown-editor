![Image](https://raw.githubusercontent.com/guizmo-silva/markdown-editor/refs/heads/main/docs/logo/mkd-zimaos-icon.png)
# MKD — 自托管 Markdown 编辑器

专为个人使用设计的自托管 Markdown 编辑器，通过 Docker 运行在家庭服务器、NAS 设备及 ZimaOS 等平台上。

---

## 功能特性

- **侧边栏** — 文档元素导航（标题、引用、链接、图片、表格、提示框和脚注）及内置文件管理器
- **视图模式** — 纯代码、纯预览或并排分屏视图
- **导入** `.md`、`.docx`、`.zip`（.md + 图片）和 `.txt` 文件
- **导出** 为 `.txt`、`.md`、`.pdf`、`.html` 及含本地链接图片的 `.zip` 压缩包
- **自动保存**
- **标签页** — 同时编辑多个文档
- **多语言界面与拼写检查** — 葡萄牙语、英语、西班牙语、法语、德语、俄语和简体中文
- **图片支持** — 导入外部或链接图片
- **明暗主题**
- **内置回收站**

### 支持的 Markdown 语法

- GitHub Flavored Markdown (GFM)：表格、任务列表、删除线、自动链接
- 提示框（`[!NOTE]`、`[!WARNING]`、`[!TIP]` 等）
- 脚注
- 代码块语法高亮
- 数学公式

---

## 安装

完整指南请参阅 **[docs/install/SETUP.zh-CN.md](../install/SETUP.zh-CN.md)**。

### 快速开始

1. 从 `docs/install/` 文件夹下载 [`docker-compose.yml`](../install/docker-compose.yml)
1. 配置您希望访问的文件夹路径（volumes）
1. 启动容器：

```bash
docker compose up -d
```

1. 在浏览器中打开 <http://localhost:3010>

> 编辑器仅能访问在 `docker-compose.yml` 中明确配置的文件夹，不会任意访问服务器文件系统。

---

## 开发

### 环境要求

| 工具 | 最低版本 |
| --- | --- |
| Node.js | 20+ |
| npm | 10+ |
| Docker | 20.10+（生产环境） |

### 主要依赖

#### 前端

- [Next.js 15](https://nextjs.org/) + React 19 + TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- [CodeMirror 6](https://codemirror.net/) — 编辑器核心
- [react-markdown](https://github.com/remarkjs/react-markdown) + remark/rehype 插件 — 预览渲染
- [react-i18next](https://react.i18next.com/) — 国际化
- [nspell](https://github.com/wooorm/nspell) — 基于 Hunspell 词典的拼写检查

#### 后端

- [Express](https://expressjs.com/) + TypeScript
- [multer](https://github.com/expressjs/multer) — 图片上传
- [archiver](https://github.com/archiverjs/node-archiver) — ZIP 导出

### 本地运行

**后端：**

```bash
cd backend
npm install
npm run dev
```

**前端**（在另一个终端中）：

```bash
cd frontend
npm install
npm run dev
```

- 前端：<http://localhost:3000>
- API：<http://localhost:3001>

### 项目结构

```text
markdown-editor/
├── frontend/
│   ├── app/                # 路由与布局 (Next.js App Router)
│   ├── components/         # React 组件
│   │   ├── Editor/         # CodeMirror 编辑器
│   │   ├── Preview/        # Markdown 渲染
│   │   ├── Toolbar/        # 工具栏
│   │   ├── Sidebar/        # 侧边栏
│   │   ├── Tabs/           # 标签系统
│   │   └── FileBrowser/    # 文件管理器
│   ├── hooks/
│   ├── locales/            # 翻译文件（每种语言一个 JSON）
│   └── utils/
│
├── backend/
│   └── src/
│       ├── routes/
│       ├── controllers/
│       ├── services/
│       ├── middleware/
│       └── utils/
│
└── docker/
    ├── Dockerfile.frontend
    └── Dockerfile.backend
```

---

##### 这个程序对您有帮助吗？请我喝杯咖啡吧！😉

<a href='https://ko-fi.com/M4M41W6IPV' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi1.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
