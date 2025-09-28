# “易构”项目贡献指南

非常感谢你对“易构”项目感兴趣，并愿意投入时间来让它变得更好！我们是一个开放和友好的社区，欢迎任何形式的贡献。

本文档将为你提供参与项目所需的所有信息。

## 🤝 行为准则 (Code of Conduct)

为了营造一个积极、健康的社区环境，我们希望所有参与者都能遵守我们的[行为准则](https://www.google.com/search?q=./CODE_OF_CONDUCT.md)。请花一点时间阅读，确保我们共同维护一个互相尊重的协作氛围。

## 💡 如何贡献？

我们欢迎各种形式的贡献，包括但不限于：

- 报告 Bug
- 提交功能建议
- 撰写或改进文档
- 提交代码 (Pull Requests)

### 🐛 报告 Bug

如果你在使用中发现了 Bug，请通过 [GitHub Issues](https://www.google.com/search?q=https://github.com/your-username/yigou/issues) 提交。为了让我们能更快地定位和修复问题，请在提交时尽量提供以下信息：

- **清晰的标题**：简要描述问题。
- **复现步骤**：详细描述如何一步步地触发这个 Bug。
- **期望行为**：你认为正常情况下应该发生什么。
- **实际行为**：实际发生了什么，最好附上截图。
- **你的环境**：你的操作系统 (如 macOS Sonoma 14.5)、应用版本等。

### ✨ 提交功能建议

如果你对“易构”有绝妙的想法，同样欢迎通过 [GitHub Issues](https://www.google.com/search?q=https://github.com/your-username/yigou/issues) 告诉我们。请选择 "Feature Request" 模板，并详细描述：

- **问题描述**：这个功能解决了什么问题？
- **方案描述**：你希望这个功能如何工作？
- **相关信息**：是否有其他类似软件的实现可以参考？

### 🚀 提交你的第一份代码

如果你想通过代码为项目做贡献，我们非常欢迎！

1. **Fork 本仓库**: 点击仓库右上角的 "Fork" 按钮。
2. **Clone 你的 Fork**: `git clone https://github.com/YOUR_USERNAME/yigou.git`
3. **创建你的分支**: `git checkout -b feature/your-awesome-feature`
4. **进行修改**: 编写你的代码。
5. **提交你的修改**: `git commit -m "feat: Add some awesome feature"`
6. **推送到你的 Fork**: `git push origin feature/your-awesome-feature`
7. **创建 Pull Request**: 在 GitHub 上打开一个 Pull Request 到主仓库的 `main` 分支。

## 🛠️ 本地开发环境搭建

1. 确保你已安装 [Node.js](https://nodejs.org/) (v18+) 和 [pnpm](https://pnpm.io/)。

2. 安装项目依赖:

   ```
   pnpm install
   ```

3. 启动开发环境:

   ```
   pnpm dev
   ```

## 🎨 代码风格

我们使用 **ESLint** 和 **Prettier** 来保证代码风格的一致性。请在你提交代码前，确保运行了格式化命令：

```
pnpm format
```