# Pull Goals from Previous Week

## Overview

A feature to move incomplete daily goals from the previous week to the current week. Weekly goals remain fixed in their original week and are not moved, as they represent week-specific planning units.

## Feature Specification

### Core Functionality

- Move incomplete daily goals from the previous week to the current week
- Weekly goals stay in their original week (not movable)
- Preview daily goals before moving them
- Daily goals maintain their association with their original weekly goals

### User Interface

- Option to pull incomplete daily goals in the week view
- Preview dialog showing daily goals to be moved
- Confirmation step before moving goals
- Success/error feedback after operation completes

### Constraints

- Cannot pull goals to the first week of a quarter
- Only incomplete daily goals can be moved
- Weekly goals remain fixed in their original week
- Daily goals maintain their original weekly goal association

## Technical Requirements

### Data Model

- Daily goals must preserve their weekly goal relationship when moved
- Weekly goals are immutable in terms of their week assignment
- Daily goal state (completion, etc.) must be preserved during move
- Week boundaries must be handled correctly at quarter transitions

### Performance

- Preview should be responsive
- Batch updates for moving multiple daily goals
- Optimistic updates in the UI

### Error Handling

- Clear error messages for invalid operations
- Rollback support for failed batch operations
- Handle edge cases (first week, empty weeks)

## To Do

### Backend Implementation (6 points)

- [ ] Create `moveIncompleteTasksFromPreviousWeek` mutation (2 points)
  - Validation logic
  - Daily goal filtering
  - Batch update operations
- [ ] Add week boundary validation helpers (1 point)
  - First week detection
  - Quarter transition handling
- [ ] Implement dry-run preview functionality (2 points)
  - Daily goal collection and filtering
  - Weekly goal relationship preservation
- [ ] Add error handling and rollback mechanisms (1 point)

### Frontend Components (5 points)

- [ ] Add week-level pull action UI (1 point)
  - Menu item
  - Disabled state handling
- [ ] Create preview dialog component (2 points)
  - Group daily goals by their weekly goals
  - Daily goal list rendering
  - Confirmation actions
- [ ] Implement optimistic updates (1 point)
  - Loading states
  - Success/error feedback
- [ ] Add keyboard shortcuts and accessibility (1 point)

### Testing & Documentation (3 points)

- [ ] Write unit tests for mutation (1 point)
  - Edge cases
  - Error scenarios
- [ ] Add integration tests for UI flow (1 point)
  - User interactions
  - State updates
- [ ] Update user documentation (1 point)
  - Feature guide
  - Usage examples

### Quality Assurance (2 points)

- [ ] Perform error scenario testing (1 point)
  - Network failures
  - Invalid states
  - Boundary conditions
- [ ] Conduct accessibility review (1 point)
  - Keyboard navigation
  - Screen reader compatibility
  - ARIA attributes

## Total Story Points: 16

Each checklist item is scoped to be completable within 1-2 story points, allowing for clear progress tracking and manageable implementation chunks. The implementation order should generally follow the order listed, with backend work preceding frontend development.
