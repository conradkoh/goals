# Feature: Drag-and-Drop for Quarterly View Goals

## Summary

Enable drag-and-drop functionality for weekly goals in the quarterly view. Users can drag weekly goal cards to move them between weeks or reparent them to different quarterly goals. This feature is desktop-only initially; touch devices continue using existing menu-based actions.

## Goals

1. Allow users to quickly move weekly goals between different weeks using drag-and-drop
2. Allow users to reparent weekly goals to different quarterly goals by dragging
3. Provide smooth visual feedback during drag operations
4. Maintain optimistic UI updates for responsive feel
5. Keep the existing menu-based move functionality as fallback
6. Hide drag handles on touch devices to avoid mobile UX issues

## Non-Goals

1. Touch/mobile drag-and-drop support (explicitly desktop-only for Phase 1)
2. Dragging daily goals independently (they move with their parent weekly goal)
3. Reordering goals within the same week (sortable lists)
4. Cross-quarter goal movement
5. Keyboard-based drag-and-drop (accessibility via existing menu actions)
