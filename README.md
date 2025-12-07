# Goals Tracking Application

A modern web application for managing organizational goals and tasks across different time horizons (quarterly, weekly, daily) with enhanced collaboration features and automated tracking capabilities.

## 🎯 Overview

Currently, many organizations manage goals and tasks using Google Sheets, which has limitations in terms of progress tracking, automated completion updates, task dependencies visualization, and historical tracking. This application provides a modern alternative with:

- **Hierarchical Goal Management**: Track objectives across quarterly, weekly, and daily time horizons
- **Team Coordination**: Member availability tracking, task assignment, and real-time collaboration
- **Progress Tracking**: Visual indicators, automated status updates, and timeline visualization
- **Resource Management**: Link external documents, meeting minutes, and project resources
- **Reporting & Analytics**: Generate progress reports and performance metrics

## 🛠️ Technology Stack

### Frontend (`apps/webapp`)
- **Next.js 14** with App Router
- **React** with TypeScript
- **TailwindCSS** for styling
- **ShadCN UI** component library
- **Convex** for real-time data synchronization

### Backend (`services/backend`)
- **Convex** real-time backend platform
- **TypeScript** for type safety
- Real-time data synchronization
- User authentication and session management

### Development Tools
- **pnpm** package manager with workspaces
- **Nx** for monorepo orchestration
- **Biome** for linting and formatting
- **TypeScript** throughout the stack
- **Husky** for Git hooks

## 📋 Prerequisites

- **Node.js** (v18 or later)
- **pnpm** (v8 or later)
- **Git**

## 🚀 Getting Started

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/conradkoh/goals.git
   cd goals
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   - Copy environment example files and configure as needed
   - Configure Convex backend settings

### Development

1. **Start the development servers**
   ```bash
   pnpm run dev
   ```
   This will start both the frontend and backend in parallel.

2. **Run individual services**
   ```bash
   # Frontend only
   nx run @apps/webapp:dev
   
   # Backend only  
   nx run @services/backend:dev
   ```

### Building

```bash
# Build all projects
pnpm run build

# Build specific project
nx run @apps/webapp:build
nx run @services/backend:build
```

### Testing

```bash
# Run all tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Type checking
pnpm run typecheck
```

### Code Quality

```bash
# Lint all files
pnpm run lint

# Fix linting issues
pnpm run lint:fix

# Format code
pnpm run format

# Apply formatting
pnpm run format:fix
```

## 📁 Project Structure

```
.
├── apps/
│   └── webapp/                 # Next.js frontend application
│       ├── src/
│       │   ├── app/           # Next.js app router pages
│       │   ├── components/    # React components
│       │   ├── hooks/         # Custom React hooks
│       │   └── modules/       # Feature modules
│       └── package.json
├── services/
│   └── backend/               # Convex backend
│       ├── convex/           # Convex functions and schema
│       ├── src/              # Backend utilities and use cases
│       └── package.json
├── docs/                      # Project documentation
│   ├── prd.md                # Product requirements document
│   ├── design.md             # Design specifications
│   └── roadmap.md            # Development roadmap
├── guides/                    # Development guides
├── progress.html             # Project progress tracking
├── nx.json                   # Nx configuration
├── pnpm-workspace.yaml       # pnpm workspace configuration
└── package.json              # Root package.json
```

## 🎮 Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm run dev` | Start development servers for all projects |
| `pnpm run build` | Build all projects for production |
| `pnpm run test` | Run tests across all projects |
| `pnpm run test:watch` | Run tests in watch mode |
| `pnpm run lint` | Check code quality with Biome |
| `pnpm run lint:fix` | Fix auto-fixable linting issues |
| `pnpm run format` | Check code formatting |
| `pnpm run format:fix` | Apply code formatting |
| `pnpm run typecheck` | Run TypeScript type checking |
| `pnpm run clean` | Clean node_modules directories |

## 🏗️ Key Features

### Goal Management
- **Quarterly Goals**: High-level organizational objectives with progress tracking
- **Weekly Goals**: Breakdown of quarterly goals into achievable weekly targets
- **Daily Tasks**: Granular task management with status tracking

### User Interface
- **Quarter Overview**: Full-context view optimized for desktop (1920x1080+)
- **Weekly Focus**: Detailed weekly planning and progress tracking
- **Daily Tasks**: Quick task management and completion tracking

### Team Collaboration
- Team member availability tracking
- Task assignment and ownership
- Real-time status updates
- Cross-team collaboration features

## 📖 Documentation

- **[Product Requirements Document](docs/prd.md)**: Detailed feature specifications
- **[Design Document](docs/design.md)**: Technical implementation details
- **[Development Roadmap](docs/roadmap.md)**: Implementation timeline and milestones
- **[Progress Tracking](progress.html)**: Current project status and task planning

## 🤝 Contributing

1. **Follow the development guidelines**:
   - Use TypeScript throughout
   - Follow existing code patterns and structure
   - Write tests for new features
   - Use Biome for code formatting and linting

2. **Development workflow**:
   - Create feature branches from `main`
   - Make small, focused commits
   - Ensure all tests pass before submitting
   - Use the project's progress tracking system

3. **Code quality standards**:
   - Type safety first - ensure strong typing throughout
   - Complete features vertically (backend to frontend)
   - Follow the cleanup routine in `guides/cleanup-improve-code-quality.md`

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Project Repository](https://github.com/conradkoh/goals)
- [Documentation](docs/)
- [Development Guides](guides/)

---

For detailed information about specific features and implementation details, please refer to the documentation in the `docs/` directory.