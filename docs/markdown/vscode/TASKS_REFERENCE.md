# VS Code Tasks Reference for Dzinza Project

This document outlines the optimized VS Code tasks available for the Dzinza genealogy platform development workflow.

## 🚀 Quick Access

**Method 1**: Press `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`) → Type "Tasks: Run Task" → Select from list
**Method 2**: Use keyboard shortcuts (see below)
**Method 3**: Terminal → Run Task menu

## 📋 Available Tasks

### 🏃‍♂️ Development Environment

| Task                                  | Description                                   | Keyboard Shortcut |
| ------------------------------------- | --------------------------------------------- | ----------------- |
| 🚀 Start Full Development Environment | Starts all services (DB + Backend + Frontend) | `Ctrl+Shift+D`    |
| 🛑 Stop Development Environment       | Stops all development services                | `Ctrl+Shift+S`    |
| 🔄 Restart Development Environment    | Full restart sequence                         | -                 |

### 🔧 Individual Services

| Task                          | Description                      | Keyboard Shortcut |
| ----------------------------- | -------------------------------- | ----------------- |
| 🔧 Start Backend Service Only | Runs backend-service in dev mode | `Ctrl+Shift+B`    |
| 🎨 Start Frontend Only        | Runs frontend Vite dev server    | `Ctrl+Shift+F`    |
| 🧬 Start Genealogy Service    | Runs genealogy microservice      | -                 |

### 🧪 Testing

| Task                      | Description                       | Keyboard Shortcut |
| ------------------------- | --------------------------------- | ----------------- |
| 🧪 Run All Tests          | Executes all test suites          | `Ctrl+Shift+T`    |
| 🧪 Frontend Tests (Watch) | Runs frontend tests in watch mode | `Ctrl+Shift+W`    |
| 🎭 E2E Tests              | Runs Playwright end-to-end tests  | -                 |
| 📊 Test Coverage Report   | Generates test coverage report    | -                 |

### 🏗️ Building

| Task                  | Description           | Keyboard Shortcut  |
| --------------------- | --------------------- | ------------------ |
| 🏗️ Build All Services | Builds all workspaces | `Ctrl+Shift+Alt+B` |
| 🏗️ Build Frontend     | Builds frontend only  | -                  |
| 🏗️ Build Backend      | Builds backend only   | -                  |

### ✨ Code Quality

| Task              | Description                        | Keyboard Shortcut |
| ----------------- | ---------------------------------- | ----------------- |
| ✨ Lint All Code  | Runs ESLint on all workspaces      | `Ctrl+Shift+L`    |
| 🔍 Type Check All | TypeScript type checking           | `Ctrl+Shift+Y`    |
| 🚨 Security Audit | Runs npm audit for security issues | -                 |

### 🗄️ Database Operations

| Task                       | Description                                      | Keyboard Shortcut  |
| -------------------------- | ------------------------------------------------ | ------------------ |
| 🗄️ Start Database Services | Starts PostgreSQL, Redis, MongoDB, Elasticsearch | `Ctrl+Shift+Alt+D` |
| 🗄️ Stop Database Services  | Stops all database containers                    | -                  |
| 🗄️ Reset Database          | Completely resets database with fresh data       | `Ctrl+Shift+Alt+R` |
| 🗄️ View Database Logs      | Shows PostgreSQL logs in real-time               | -                  |
| 🗄️ Connect to PostgreSQL   | Opens psql shell to database                     | -                  |

### 🐳 Docker Operations

| Task                   | Description              |
| ---------------------- | ------------------------ |
| 🐳 Build Docker Images | Builds all Docker images |

### 🧹 Maintenance

| Task                        | Description                                |
| --------------------------- | ------------------------------------------ |
| 🧹 Clean All                | Cleans build artifacts and Docker cache    |
| 📦 Install All Dependencies | Installs dependencies in all workspaces    |
| 🔐 Generate Password Hash   | Utility to generate bcrypt password hashes |

### 📝 Git Operations

| Task                   | Description                              | Keyboard Shortcut |
| ---------------------- | ---------------------------------------- | ----------------- |
| 📋 Check Git Status    | Shows git status and branch info         | `Ctrl+Shift+G`    |
| 📤 Quick Commit & Push | Adds all changes, commits, and pushes    | -                 |
| 🔄 Pull Latest Changes | Pulls latest changes from current branch | -                 |

## 🎯 Most Common Workflows

### Starting Development

1. `🚀 Start Full Development Environment` - Starts everything
2. Wait for services to initialize
3. Open http://localhost:5173 for frontend
4. Backend API available at http://localhost:3001

### Quick Frontend Development

1. `🗄️ Start Database Services` (if not running)
2. `🔧 Start Backend Service Only`
3. `🎨 Start Frontend Only`

### Testing Workflow

1. `🧪 Frontend Tests (Watch)` - For TDD
2. `🧪 Run All Tests` - Before committing
3. `🎭 E2E Tests` - For integration testing

### Code Quality Check

1. `✨ Lint All Code`
2. `🔍 Type Check All`
3. `🚨 Security Audit`

### Database Development

1. `🗄️ Start Database Services`
2. `🗄️ Connect to PostgreSQL` - For manual queries
3. `🗄️ Reset Database` - When you need fresh data

## 🔧 Task Features

### Background Tasks

- Services run in background with proper problem matchers
- Auto-restart detection for file changes
- Dedicated terminal panels for each service

### Problem Matchers

- TypeScript errors automatically highlighted
- ESLint issues shown in Problems panel
- Build errors linked to source files

### Terminal Management

- Each service gets its own dedicated terminal
- Shared terminals for build/test operations
- Clean terminal reuse to avoid clutter

## 🎨 Customization

### Adding New Tasks

Edit `.vscode/tasks.json` to add project-specific tasks:

```json
{
  "label": "🆕 My Custom Task",
  "type": "shell",
  "command": "your-command",
  "group": "build",
  "presentation": {
    "echo": true,
    "reveal": "always"
  }
}
```

### Keyboard Shortcuts

Edit `.vscode/keybindings.json` to customize shortcuts:

```json
{
  "key": "ctrl+shift+x",
  "command": "workbench.action.tasks.runTask",
  "args": "🆕 My Custom Task"
}
```

## 🐛 Troubleshooting

### Task Not Running

- Check if the command exists in the workspace
- Verify file paths and permissions
- Look at the terminal output for errors

### Services Not Starting

- Ensure Docker is running for database tasks
- Check if ports are already in use
- Verify environment variables are set

### Database Connection Issues

- Run `🗄️ Reset Database` to fix corruption
- Check Docker container status
- Verify database credentials in .env files

## 📊 Performance Tips

1. Use individual service tasks instead of full environment when possible
2. Keep test watchers running during development
3. Use the restart task instead of manual stop/start
4. Clean build artifacts periodically with `🧹 Clean All`

---

_Happy coding! 🚀_
