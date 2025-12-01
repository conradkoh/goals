# Safe Areas & iOS Safari Viewport Handling

This document captures technical decisions and learnings about handling safe areas and viewport issues, particularly for iOS Safari and touch-based devices.

## The Problem

iOS Safari presents several challenges for fullscreen modals:

1. **Dynamic Toolbar**: Safari's address bar and bottom toolbar resize dynamically as users scroll. The classic `100vh` CSS unit represents the *largest* possible viewport height (with toolbars hidden), causing content to overflow when toolbars are visible.

2. **Safe Area Insets**: Modern iOS devices have notches (top) and home indicators (bottom) that overlay content. Without proper handling, UI elements can be obscured.

3. **Software Keyboard**: When the keyboard opens, the viewport doesn't resize in the same way as on Android. Content at the bottom of the screen can become unreachable.

## Solutions Implemented

### 1. Dynamic Viewport Units (`dvh`)

**Instead of:**
```css
height: calc(100vh - 32px);
```

**Use:**
```css
height: calc(100dvh - 32px);
```

#### Why `dvh`?

| Unit | Description | Behavior |
|------|-------------|----------|
| `vh` | Viewport Height | Fixed to largest viewport (toolbars hidden) |
| `svh` | Small Viewport Height | Fixed to smallest viewport (toolbars visible) |
| `dvh` | Dynamic Viewport Height | Responds to toolbar visibility changes |
| `lvh` | Large Viewport Height | Same as `vh` |

`dvh` dynamically adjusts as Safari's toolbars appear/disappear, preventing content overflow.

**Browser Support**: `dvh` is supported in all modern browsers (Safari 15.4+, Chrome 108+, Firefox 101+). Older browsers that don't support it will simply ignore the rule, and you can provide a `vh` fallback if needed.

### 2. Safe Area Inset Environment Variables

```css
padding-bottom: env(safe-area-inset-bottom, 0px);
```

These CSS environment variables provide the inset distances for device-specific safe areas:

- `safe-area-inset-top` - Status bar, notch
- `safe-area-inset-bottom` - Home indicator
- `safe-area-inset-left` - (Landscape, left side)
- `safe-area-inset-right` - (Landscape, right side)

The second parameter (`0px`) is a fallback for browsers that don't support the variable.

#### Prerequisite: `viewport-fit=cover`

**Critical**: These environment variables only work when the viewport meta tag includes `viewport-fit=cover`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

In Next.js (App Router), this is set via the viewport export:

```typescript
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // Required for safe-area-inset-* to work
};
```

Without `viewport-fit=cover`, the browser automatically adds padding to keep content within safe areas, and the `env()` variables return `0`.

### 3. Fullscreen-Safe Positioning

**Standard dialog positioning (problematic for fullscreen):**
```css
position: fixed;
left: 50%;
top: 50%;
transform: translate(-50%, -50%);
```

**Fullscreen-safe positioning:**
```css
position: fixed;
inset: 0;
margin: auto;
```

#### Why Change Positioning?

The `transform` approach for centering can cause issues with:
- iOS Safari's viewport resizing behavior
- Keyboard appearance/disappearance
- Dynamic toolbar interactions

Using `inset: 0` with `margin: auto` provides more predictable behavior for fullscreen dialogs on mobile Safari.

### 4. Scroll Container Handling

For scrollable content within fullscreen modals:

```css
.scroll-container {
  overflow-y: auto;
  overscroll-contain: contain;
  padding-bottom: 1rem; /* Extra padding for keyboard */
}
```

- `overscroll-contain`: Prevents scroll chaining to parent elements
- Extra bottom padding: Ensures the last content item can be scrolled above the keyboard

## Implementation Pattern

Here's the recommended pattern for fullscreen dialogs on touch devices:

```tsx
<DialogContent
  fullscreenSafe={isTouchDevice}
  className={cn(
    isTouchDevice && [
      // Width with small margin
      'w-[calc(100vw-16px)]',
      'max-w-none',
      // Height using dynamic viewport units
      'h-[calc(100dvh-32px)]',
      'max-h-none',
      // Safe area padding
      'pb-[env(safe-area-inset-bottom,0px)]',
    ],
    'overflow-hidden flex flex-col'
  )}
>
  <DialogHeader>...</DialogHeader>
  
  {/* Scrollable content with keyboard-friendly padding */}
  <div className="flex-1 overflow-y-auto overscroll-contain pb-4">
    {children}
  </div>
</DialogContent>
```

## Detection Strategy

We detect touch devices using the CSS media query via JavaScript:

```typescript
const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
```

- `pointer: coarse` = Touch input (finger, stylus)
- `pointer: fine` = Precise input (mouse, trackpad)

This is more reliable than user-agent sniffing and covers tablets, touch-screen laptops, and mobile devices.

## Key Takeaways

1. **Use `dvh` for fullscreen elements** on mobile Safari to respect dynamic toolbars
2. **Always add `viewport-fit=cover`** when using safe-area-inset variables
3. **Use `inset` positioning** instead of `transform` centering for fullscreen modals
4. **Add extra bottom padding** in scroll containers for keyboard accessibility
5. **Detect touch devices** via `pointer: coarse` media query, not user-agent

## References

- [MDN: Viewport concepts](https://developer.mozilla.org/en-US/docs/Web/CSS/Viewport_concepts)
- [MDN: env() CSS function](https://developer.mozilla.org/en-US/docs/Web/CSS/env)
- [Safari Web Content Guide: Safe Areas](https://developer.apple.com/documentation/webkit/supporting_associated_domains)
- [CSS Viewport Units (dvh, svh, lvh)](https://web.dev/blog/viewport-units)
