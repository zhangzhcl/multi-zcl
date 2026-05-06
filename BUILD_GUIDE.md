# Multi-ZCL 构建与发布指南

## 📦 本地构建

### macOS 构建
```bash
npm run dist:mac
```
输出：`release/Multi-ZCL-1.0.1-arm64.dmg`

### Windows 构建
```bash
npm run dist:win
```
输出：`release/Multi-ZCL-1.0.1-win.zip` 和 `release/Multi-ZCL Setup 1.0.1.exe`

**注意：** Windows 构建需要在 Windows 环境中执行。

---

## 🚀 自动化构建（GitHub Actions）

### 工作流程

项目已配置 GitHub Actions 自动化构建，位于 `.github/workflows/build.yml`。

### 触发条件

1. **推送到 main 分支** - 触发测试构建，不上传 Release
2. **创建版本 Tag** - 触发完整构建并自动发布 Release

### 自动化构建平台

- ✅ macOS (ARM64)
- ✅ Windows (x64)

### 创建 Release 步骤

#### 1. 更新版本号（如需要）
编辑 `package.json`：
```json
{
  "version": "1.0.2"
}
```

#### 2. 提交代码
```bash
git add .
git commit -m "chore: bump version to 1.0.2"
git push origin main
```

#### 3. 创建并推送 Tag
```bash
git tag v1.0.2
git push origin v1.0.2
```

#### 4. 等待构建完成
- 访问：https://github.com/<你的用户名>/multi-zcl/actions
- 等待约 10-15 分钟（两个平台并行构建）

#### 5. 下载安装包
- 访问：https://github.com/<你的用户名>/multi-zcl/releases
- 下载对应平台的安装包

---

## 📋 构建产物

### macOS
- **文件名：** `Multi-ZCL-1.0.1-arm64.dmg`
- **大小：** ~111 MB
- **架构：** ARM64 (Apple Silicon)
- **安装：** 双击 DMG 文件，拖拽到 Applications

### Windows
- **文件名：** `Multi-ZCL-1.0.1-win.zip` 或 `Multi-ZCL Setup 1.0.1.exe`
- **大小：** ~120 MB
- **架构：** x64
- **安装：** 解压 ZIP 或运行 EXE 安装程序

---

## 🔧 本地开发

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

### 仅启动 Vite
```bash
npm run dev:vite
```

### 仅启动 Electron
```bash
npm run dev:electron
```

---

## 🛠️ 故障排除

### Windows 构建失败
**问题：** 代码签名错误
**解决：** 已配置 `CSC_IDENTITY_AUTO_DISCOVERY=false` 跳过代码签名

### macOS 图标不显示
**问题：** 开发模式下可能不显示自定义图标
**解决：** 打包后的 .app 会显示正确图标

### 技能安装失败
**问题：** npx skills 未安装
**解决：** 
```bash
npm install -g npx
npx skills add <skill-name> -g -y
```

---

## 📝 版本发布检查清单

- [ ] 更新 `package.json` 版本号
- [ ] 更新 `CHANGELOG.md`（如有）
- [ ] 测试所有核心功能
- [ ] 提交代码到 main 分支
- [ ] 创建 Git Tag
- [ ] 推送 Tag 到远程
- [ ] 等待 GitHub Actions 完成
- [ ] 下载并测试安装包
- [ ] 发布 Release

---

## 🔐 安全签名

### 当前状态
- ❌ macOS: 未配置代码签名
- ❌ Windows: 已禁用代码签名

### 生产环境建议
为避免用户安装时看到安全警告，建议配置代码签名：

**macOS:** 申请 Apple Developer 证书
**Windows:** 购买代码签名证书

配置方法参考 Electron Builder 官方文档。

---

## 📄 许可证

MIT License - 详见 LICENSE 文件
