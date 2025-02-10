# Goals Tracking Application Design Document

## Overview

This design document outlines the technical implementation details for the Goals Tracking Application, mapping directly to requirements specified in the PRD.

## 1. Screens

### 1.1 Quarter Overview Screen

_Maps to PRD: Quarter Overview (Full Context View)_

#### Layout

- Full-width desktop view optimized for 1920x1080
- Fixed header with navigation and user controls
- Three-column layout for maximum information density

#### Sections

1. **Navigation Header**

   - Quick view switcher (Quarter/Week/Day)
   - User profile and settings
   - Global search
   - Notifications bell

2. **Quarter Goals Grid**

   - Collapsible goal cards
   - Progress indicators
   - Dependencies visualization
   - Filter and sort controls

3. **Status Summary Sidebar**
   - Quarter progress overview
   - Team availability
   - Key metrics dashboard

### 1.2 Weekly Focus Screen

_Maps to PRD: Weekly Context View_

#### Layout

- Three-panel split view
- Synchronized scrolling between panels
- Collapsible side panels

#### Sections

1. **Quarter Context Panel (Left)**

   - Minimized quarter goals list
   - Focus item selector
   - Progress indicators

2. **Current Week Panel (Center)**

   - Weekly goals breakdown
   - Team assignments
   - Resource links
   - Daily status updates

3. **Previous Week Panel (Right)**
   - Last week's state
   - Progress comparison
   - Completed items

### 1.3 Daily Tasks Screen

_Maps to PRD: Daily Task View_

#### Layout

- Three-column layout
- Quick-action toolbar
- Real-time updates panel

#### Sections

1. **Context Sidebar**

   - Minimized quarter view
   - Weekly focus items
   - Team availability

2. **Task Management**

   - Task creation area
   - Task list with status
   - Priority indicators
   - Assignment controls

3. **Daily Summary**
   - Progress metrics
   - Completed vs pending
   - Blockers and dependencies

## 2. Components

### 2.1 Goal Card Component

_Maps to PRD: Hierarchical Goal Management_

#### Properties

- Title
- Progress indicator [X/10]
- Status indicators (★, ✓)
- Dependencies list
- Assigned team members
- Due date

#### Interactions

- Click to expand/collapse
- Drag for reordering
- Click status to update
- Hover for quick actions

### 2.2 Progress Tracker Component

_Maps to PRD: Progress Tracking_

#### Properties

- Visual progress bar
- Numerical indicator
- Status history
- Weekly snapshots

#### Interactions

- Click to update progress
- Hover for detailed history
- Double-click for edit mode

### 2.3 Team Member Component

_Maps to PRD: Team Coordination_

#### Properties

- Avatar
- Availability status
- Current tasks
- OOO indicator

#### Interactions

- Click for detailed view
- Hover for quick stats
- Drag to assign tasks

### 2.4 Resource Link Component

_Maps to PRD: Resource Management_

#### Properties

- Link title
- Resource type icon
- Last updated timestamp
- Quick preview

#### Interactions

- Click to open resource
- Right-click for options
- Drag to reorder
- Hover for preview

## 3. User Interactions

### 3.1 Goal Management

_Maps to PRD: Core Features_

#### Create Goal

1. Click "New Goal" button
2. Fill in goal details form
3. Set dependencies
4. Assign team members
5. Set progress tracking method

#### Update Progress

1. Click progress indicator
2. Select new value or increment
3. Add progress note (optional)
4. System updates all dependent items

### 3.2 Weekly Planning

_Maps to PRD: Weekly Goals_

#### Select Focus Items

1. Navigate to Weekly View
2. Click star icon on quarter goals
3. Drag to reorder priority
4. Set weekly targets

#### Track Progress

1. Daily status updates
2. Automatic rollup to quarter goals
3. Week-over-week comparison
4. Snapshot preservation

### 3.3 Daily Task Management

_Maps to PRD: Daily Tasks_

#### Task Creation

1. Quick-add from toolbar
2. Set priority and assignee
3. Link to quarter/weekly goals
4. Add due time if needed

#### Task Completion

1. Click checkbox to complete
2. System updates progress
3. Moves to completed list
4. Updates parent goal progress

## 4. Technical Components

### 4.1 Frontend Architecture

_Maps to PRD: Technical Requirements_

- Next.js 14 with App Router
- TailwindCSS for styling
- ShadcnUI component library
- Real-time updates with Convex

### 4.2 Data Models

#### Goal

```typescript
interface Goal {
  id: string;
  title: string;
  description: string;
  progress: number; // 0-10
  type: 'quarter' | 'weekly' | 'daily';
  status: 'active' | 'completed' | 'archived';
  dependencies: string[]; // Goal IDs
  assignees: string[]; // User IDs
  resources: Resource[];
  createdAt: Date;
  updatedAt: Date;
}
```

#### Task

```typescript
interface Task {
  id: string;
  goalId: string;
  title: string;
  status: 'pending' | 'completed';
  assigneeId: string;
  dueDate: Date;
  completedAt?: Date;
}
```

#### User

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'leader' | 'member';
  availability: 'available' | 'ooo' | 'busy';
  assignedTasks: string[]; // Task IDs
}
```

### 4.3 API Endpoints

#### Goals API

- `GET /api/goals/quarter` - Get quarter goals
- `GET /api/goals/weekly` - Get weekly goals
- `POST /api/goals` - Create new goal
- `PATCH /api/goals/:id` - Update goal
- `DELETE /api/goals/:id` - Delete goal

#### Tasks API

- `GET /api/tasks/daily` - Get daily tasks
- `POST /api/tasks` - Create task
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

#### Users API

- `GET /api/users` - Get team members
- `PATCH /api/users/:id/availability` - Update availability
- `GET /api/users/:id/tasks` - Get user's tasks

## 5. Editor Enhancements

- Keyboard Shortcut for Hyperlink Embedding: Pressing Cmd + K in any editable text field will open a modal/dialog that allows users to embed hyperlinks. Users can enter the URL and optional display text to create clickable links within goal descriptions, task details, and other text content.

- Rich Text Preservation on Cut and Paste: When users cut and paste content (for example, an entire day's content), all hyperlinks and rich text formatting (such as bold, italics, underlining) will be preserved, ensuring consistency in appearance and functionality.
