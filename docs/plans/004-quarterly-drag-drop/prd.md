# PRD: Drag-and-Drop for Quarterly View Goals

## Glossary

| Term | Definition |
|------|------------|
| **Weekly Goal** | A goal with `depth: 1`, child of a quarterly goal |
| **Quarterly Goal** | A goal with `depth: 0`, top-level organizational goal |
| **Daily Goal** | A goal with `depth: 2`, child of a weekly goal |
| **Week-to-Week Move** | Moving a weekly goal to a different week while keeping its parent |
| **Reparenting** | Moving a weekly goal to become a child of a different quarterly goal |
| **Drag Handle** | A visual indicator (grip icon) that initiates drag operations |
| **Drop Zone** | An area that highlights when a draggable item can be dropped |
| **Optimistic Update** | UI update that happens immediately before server confirmation |

## User Stories

### Week-to-Week Movement

**As a** user planning my quarter,  
**I want** to drag a weekly goal from one week column to another,  
**So that** I can quickly reschedule goals when plans change.

**Acceptance Criteria:**
- Dragging a weekly goal card highlights valid drop zones (other week columns)
- Dropping on a week column moves the goal to that week
- All daily goals under the weekly goal move with it
- The move is reflected immediately (optimistic update)
- The original week column updates to show the goal removed

### Reparenting to Different Quarterly Goal

**As a** user organizing my quarterly objectives,  
**I want** to drag a weekly goal onto a different quarterly goal section,  
**So that** I can reorganize goals under the correct objectives.

**Acceptance Criteria:**
- Dragging a weekly goal highlights quarterly goal sections as drop targets
- Dropping on a quarterly goal section changes the goal's parent
- The goal remains in the same week but appears under the new quarterly goal
- Child daily goals maintain their relationship to the weekly goal

### Desktop-Only Experience

**As a** mobile user,  
**I want** drag handles hidden on my device,  
**So that** I don't accidentally trigger drag operations while scrolling.

**Acceptance Criteria:**
- Drag handles are hidden on touch devices
- Mobile users use existing menu-based actions to move goals
- Touch detection uses reliable methods (not just screen size)

### Cancel Drag Operation

**As a** user who started dragging by mistake,  
**I want** to cancel the drag by pressing Escape or dropping in an invalid zone,  
**So that** I can undo accidental drag starts.

**Acceptance Criteria:**
- Pressing Escape during drag cancels the operation
- Dropping outside valid drop zones cancels the operation
- Cancelled drags return the goal to its original position
