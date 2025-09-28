<!--suppress HtmlDeprecatedAttribute -->

<p align="center"> 
    <img src="https://www.google.com/search?q=https://placehold.co/150x150/7F56D9/FFFFFF%3Ftext%3D🦦" alt="易构吉祥物-海獭"> </p>

<h1 align="center">易构 (Yì Gòu)</h1>

<p align="center"> 一款为开发者而生的、极致易用的开源架构设计工具。 </p>

<p align="center"> 
    <a href="#"><img src="https://www.google.com/search?q=https://img.shields.io/badge/build-passing-brightgreen" alt="Build Status"></a> 
    <a href="https://www.google.com/search?q=./LICENSE"><img src="https://www.google.com/search?q=https://img.shields.io/badge/license-MIT-blue" alt="License"></a> 
    <a href="#"><img src="https://www.google.com/search?q=https://img.shields.io/github/stars/your-username/yigou%3Fstyle%3Dsocial" alt="GitHub Stars"></a> 
    <a href="#"><img src="https://www.google.com/search?q=https://img.shields.io/github/forks/your-username/yigou%3Fstyle%3Dsocial" alt="GitHub Forks"></a> 
</p>

<p align="center"> 轻松构思，优雅成图。像海獭一样，用聪明的工具，轻松“破壳”复杂问题。 </p>

## ✨ 核心特性

- **极致易用**: 简洁、现代的界面，符合直觉的操作，让你在 5 分钟内上手。
- **开发者友好**: 内置 C4 模型，专注于软件架构设计场景。
- **本地优先**: 所有文件默认存储在本地，你可以用 Git 轻松管理版本。
- **开源免费**: 采用 MIT 许可证，对个人和商业使用完全免费。
- **跨平台**: 支持 Windows, macOS 和 Linux。

## 🚀 快速上手

1. 前往 [**Releases**](https://www.google.com/search?q=https://github.com/your-username/yigou/releases) 页面下载最新版本的安装包。
2. 安装并打开应用。
3. 开始你的创作吧！🦦

## 🏗️ 项目结构

本项目采用 **Electron + React + TypeScript** 技术栈构建，遵循主进程与渲染进程分离的最佳实践。

```
yigou/
├── .github/              # GitHub Action 工作流、Issue 模板等
├── release/              # 应用打包后的输出目录
├── src/                  # 核心源代码
│   ├── main/             # ✨ 主进程 (应用的“后端”)
│   │   ├── services/     # 核心服务 (文件读写, 导出等)
│   │   ├── preload.ts    # 预加载脚本 (用于安全的 IPC 通信)
│   │   └── index.ts      # 主进程入口文件
│   │
│   ├── renderer/         # 🎨 渲染进程 (应用的“前端” - React App)
│   │   ├── assets/       # 静态资源 (图片, 字体等)
│   │   ├── components/   # 可复用的 React 组件 (Canvas, Toolbar...)
│   │   ├── store/        # 状态管理 (Zustand)
│   │   ├── App.tsx       # React 应用根组件
│   │   └── main.tsx      # 渲染进程入口文件
│   │
│   └── shared/           # 📦 主进程与渲染进程共享的代码 (如 TypeScript 类型定义)
│
├── package.json          # 项目依赖与脚本
├── tsconfig.json         # TypeScript 配置文件
├── CONTRIBUTING.md       # 贡献指南
├── LICENSE               # MIT 许可证
└── README.md             # 就是你正在看的这个文件
```

## 🤝 贡献指南

我们是一个开放和友好的社区，欢迎任何形式的贡献！无论是提交一个 Bug、建议一个新功能，还是直接贡献代码，我们都非常欢迎。

在开始之前，请花几分钟阅读我们的 [**贡献指南 (CONTRIBUTING.md)**](https://www.google.com/search?q=./CONTRIBUTING.md)。

## 📜 开源许可证

本项目基于 [**MIT License**](https://www.google.com/search?q=./LICENSE) 开源。

**易构** - 用智慧构建，轻松生活。