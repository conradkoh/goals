# Feature: CMD + K Command Palette on Mobile

## Summary

Enable the CMD + K command palette functionality on mobile devices by adding a visual trigger button. Currently, the command palette (goal search dialog) is only accessible via the CMD/CTRL + K keyboard shortcut, which doesn't work on mobile devices that lack physical keyboards.

## Goals

1. Provide mobile users access to the command palette / goal search functionality
2. Maintain consistency with the desktop experience
3. Position the trigger in an easily accessible location on mobile screens
4. Ensure the mobile trigger doesn't interfere with desktop keyboard usage
5. Keep the UI clean and non-intrusive

## Non-Goals

1. Replacing the existing keyboard shortcut (it should continue working on desktop)
2. Creating a completely different search experience for mobile
3. Adding mobile-specific gestures (swipe to open, etc.) - keeping it simple with a tap target
4. Modifying the command palette's internal functionality or search results
