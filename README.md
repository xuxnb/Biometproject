# 项目管理系统

这是一个基于Node.js和SQLite的本地项目管理系统，用于跟踪和管理各种项目的信息，包括里程碑、原材料状态、文档、团队成员和制造计划等。

## 功能特点

- 项目信息管理：创建、查看和编辑项目信息
- 里程碑管理：跟踪项目重要节点
- 原材料管理：记录原材料采购和使用状态
- 文档管理：上传和管理项目相关文档
- 团队管理：记录项目团队成员信息
- 制造计划：安排和跟踪项目制造流程

## 技术栈

- 前端：HTML、CSS、JavaScript、Bootstrap 5
- 后端：Node.js、Express.js
- 数据库：SQLite3
- 模板引擎：EJS

## 安装步骤

1. 确保已安装Node.js（建议使用v14.0.0或更高版本）

2. 克隆或下载项目到本地

3. 安装依赖项：
   ```
   npm install
   ```

4. 启动应用：
   ```
   npm start
   ```
   或使用开发模式（自动重启）：
   ```
   npm run dev
   ```

5. 在浏览器中访问 http://localhost:3000

## 目录结构

```
project-management-system/
├── app.js                # 应用主入口
├── database.db           # SQLite数据库文件
├── package.json          # 项目依赖
├── public/               # 静态资源
│   ├── css/              # CSS样式文件
│   └── js/               # JavaScript文件
├── uploads/              # 上传文件存储目录老婆，；o-
└── views/                # EJS模板
    ├── layout.ejs        # 主布局模板
    ├── index.ejs         # 主页/项目列表
    └── projects/         # 项目相关视图
        ├── new.ejs       # 创建新项目
        └── show.ejs      # 项目详情
```

## 自定义和扩展

1. 数据库模型：在app.js中的`initializeDatabase`函数中修改或添加数据表结构
2. 增加新功能：添加新的路由和视图
3. 样式调整：修改public/css/style.css文件

## 后续开发计划

系统基础功能已经实现，后续可以按需扩展以下功能：

1. 用户认证和权限管理
2. 数据导出功能（Excel、PDF等）
3. 项目统计和数据可视化
4. 任务分配和跟踪
5. 通知提醒系统
6. 项目间的依赖关系
7. 移动端适配优化 