# Feature: Scratchpad History UX Overhaul

## Summary

Redesign the scratchpad history dialog into a polished, responsive master-detail view with flat list items, smooth transitions, copy-to-clipboard (as markdown), and delete capability.

## Goals

1. Flat list with 2-line content preview — each history item is a clickable list item showing timestamp and truncated content
2. Responsive master-detail layout — desktop: list on the left, content on the right; mobile: drill-down with back navigation
3. Smooth transitions — animate between list and detail views, especially on mobile
4. Copy as markdown — allow users to copy the full content of an archived item to clipboard as markdown
5. Delete history items — allow users to remove individual archived scratchpads with confirmation

## Non-Goals

1. Bulk delete/selection
2. Search/filter within history
3. Restore archived content back to the active scratchpad
4. Pagination/infinite scroll (current 50-item limit is sufficient)
