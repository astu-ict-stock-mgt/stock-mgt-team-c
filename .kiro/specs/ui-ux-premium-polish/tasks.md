# Implementation Plan: UI/UX Premium Polish

## Overview

This implementation plan transforms the ASTU Stock Management System with professional animations and micro-interactions using framer-motion v13.1.1, react-countup v6.5.3, and vaul v1.1.2. The approach emphasizes progressive enhancement, maintaining existing design identity while adding subtle, performance-optimized animations that work seamlessly in both light and dark themes.

The implementation is organized into foundational setup, component library creation, and progressive integration into existing pages, with testing tasks included as optional sub-tasks to enable faster MVP delivery.

## Tasks

- [ ] 1. Set up animation system foundation and motion tokens
  - Create motion tokens file mapping to existing CSS custom properties (--dur-instant, --dur-fast, --dur-base, --ease-out)
  - Define DURATION, EASING, and STAGGER constants for consistent timing across animations
  - Create MotionProvider component with reduced-motion context and global motion configuration
  - Integrate MotionProvider into application providers.tsx
  - Create useReducedMotion hook for detecting user motion preferences
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 1.7, 20.1, 20.2_

- [ ]* 1.1 Write unit tests for motion tokens and MotionProvider
  - Test MotionProvider respects reducedMotion prop
  - Test useReducedMotion hook returns correct values
  - Test server-side rendering compatibility
  - _Requirements: 1.5, 20.1_

- [ ] 2. Create animation variants library
  - [ ] 2.1 Implement page transition variants
    - Create pageVariants with initial, animate, and exit states
    - Implement fadeIn and slideUp effects within 200ms duration
    - _Requirements: 2.1, 2.2, 2.5_
  
  - [ ] 2.2 Implement card animation variants
    - Create cardVariants for hover (translateY -2px, scale 1.005) and press (scale 0.995) states
    - Create cardEntranceVariants for mount animations
    - Use 140ms duration for hover transitions with --ease-out curve
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  
  - [ ] 2.3 Implement list and grid animation variants
    - Create listContainerVariants with stagger configuration (30ms delay)
    - Create listItemVariants with fadeIn and slideUp effects
    - Implement createStaggerVariants function with maxItems performance optimization (default 20 items)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [ ] 2.4 Implement form input animation variants
    - Create formInputVariants with focus state (scale 1.01)
    - Create formLabelVariants with focus state (translateY -2px)
    - Create validationVariants with success (scaleIn) and error (shake) animations
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ]* 2.5 Write unit tests for animation variants
  - Test all variants match expected shape and timing values
  - Create snapshot tests for variant objects
  - Verify performance optimization in createStaggerVariants
  - _Requirements: 1.4, 4.3_

- [ ] 3. Create animation hooks library
  - [ ] 3.1 Implement useAnimatedMount hook
    - Return initial, animate, and transition props for component mount animations
    - Respect reducedMotion preference by returning static props when enabled
    - Support configurable duration and delay parameters
    - _Requirements: 1.5, 2.1, 2.5_
  
  - [ ] 3.2 Implement useStaggerChildren hook
    - Return container and item variants for staggered list animations
    - Support configurable staggerDelay, itemDuration, and maxItems parameters
    - Return static variants when reducedMotion is enabled
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [ ] 3.3 Implement useScrollAnimation hook
    - Use framer-motion's useInView hook with Intersection Observer
    - Support configurable once, amount, and margin parameters
    - Return ref, isInView, isVisible, and animate values
    - Respect reducedMotion and enableScrollAnimations context values
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [ ]* 3.4 Write unit tests for animation hooks
  - Test useAnimatedMount with and without reducedMotion
  - Test useStaggerChildren performance optimization and reducedMotion handling
  - Test useScrollAnimation with mocked IntersectionObserver
  - _Requirements: 1.5, 16.5, 20.1_

- [ ] 4. Checkpoint - Verify foundation setup
  - Ensure all tests pass for motion tokens, providers, variants, and hooks
  - Verify MotionProvider is correctly integrated into providers.tsx
  - Confirm no TypeScript errors in motion system files
  - Ask the user if questions arise

- [ ] 5. Create animated component wrappers
  - [ ] 5.1 Implement AnimatedCard component
    - Create wrapper that supports interactive (hover/press) and entrance modes
    - Apply cardVariants for interactive mode with whileHover and whileTap
    - Apply cardEntranceVariants for entrance mode
    - Fall back to static Card when reducedMotion is enabled
    - Add astu-card-hover class for interactive cards
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  
  - [ ] 5.2 Implement AnimatedList component
    - Create wrapper that applies stagger animation to children array
    - Use useStaggerChildren hook with configurable staggerDelay and maxItems
    - Wrap each child in motion.div with item variants
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [ ] 5.3 Implement AnimatedPage component
    - Create wrapper that applies page transition variants
    - Use pageVariants with initial, animate, and exit states
    - Fall back to static div when reducedMotion is enabled
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [ ] 5.4 Implement AnimatedModal component
    - Create overlay and content animations with AnimatePresence
    - Animate overlay fadeIn within 140ms
    - Animate content with scaleIn, fadeIn, and slideUp effects within 200ms
    - Support open prop and onClose callback
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ]* 5.5 Write integration tests for animated components
  - Test AnimatedCard responds to hover and click interactions
  - Test AnimatedList renders children with correct structure
  - Test AnimatedPage applies transitions correctly
  - Test AnimatedModal opens and closes with proper animations
  - _Requirements: 3.1, 3.5, 10.5_

- [ ] 6. Implement CountUp component wrapper
  - Wrap react-countup with reducedMotion support
  - Display final value immediately when reducedMotion is enabled
  - Support end, start, decimals, duration, prefix, suffix, separator, decimal, useInView props
  - Implement custom easeOut easing function matching cubic-bezier(0.22, 1, 0.36, 1)
  - Set default duration to 1200ms
  - Use enableScrollSpy for viewport-triggered animations
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ]* 6.1 Write unit tests for CountUp component
  - Test displays final value immediately with reducedMotion
  - Test applies prefix and suffix correctly
  - Test handles decimal values
  - Test validates numeric inputs
  - _Requirements: 7.5_

- [ ] 7. Implement Drawer components using vaul
  - Create Drawer root component with open, onOpenChange, and direction props
  - Create DrawerContent component with overlay and content animations
  - Export DrawerTrigger, DrawerTitle, DrawerDescription, DrawerClose from vaul
  - Style DrawerContent with bottom-anchored positioning and drag handle
  - Apply backdrop fade animation synchronized to drawer position
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 10.6_

- [ ]* 7.1 Write integration tests for Drawer component
  - Test drawer opens and closes correctly
  - Test drawer restores focus to trigger on close
  - Test drawer handles drag-to-dismiss gesture
  - Test drawer maintains state during theme changes
  - _Requirements: 9.6, 9.7_

- [ ] 8. Checkpoint - Verify component library
  - Ensure all animated components render correctly
  - Verify reducedMotion handling works across all components
  - Test components in both light and dark themes
  - Confirm no accessibility violations
  - Ask the user if questions arise

- [ ] 9. Enhance login page with premium animations
  - [ ] 9.1 Add staggered reveal animation to login page
    - Implement staggered animation sequence: logo → title → form → footer
    - Use 80ms stagger delay between elements
    - Apply fadeIn and slideUp effects to each element
    - _Requirements: 6.1_
  
  - [ ] 9.2 Add glass effect to login card
    - Apply backdrop-filter blur to login card background
    - Ensure glass effect works in both light and dark themes
    - Maintain existing card shadow and border styling
    - _Requirements: 6.2_
  
  - [ ] 9.3 Enhance theme toggle button animation
    - Add 180deg rotation animation on theme toggle click
    - Crossfade between Sun and Moon icons
    - Use 200ms duration with --ease-out curve
    - _Requirements: 6.3, 18.2, 18.3, 18.4_
  
  - [ ] 9.4 Enhance login form input focus states
    - Apply scale 1.01 effect on input focus
    - Add subtle glow effect to focused inputs
    - Animate label with translateY -2px on focus
    - _Requirements: 6.4, 17.1, 17.3_
  
  - [ ] 9.5 Animate demo accounts panel expansion
    - Add height expansion animation with smooth easing
    - Use spring physics for natural motion feel
    - _Requirements: 6.5_
  
  - [ ] 9.6 Add subtle background gradient animation
    - Enhance existing radial-gradient with subtle animation
    - Ensure animation respects reducedMotion preference
    - _Requirements: 6.6_
  
  - [ ] 9.7 Add ASTU logo pulse animation
    - Implement subtle pulse effect on page load
    - Use scale animation with gentle spring physics
    - Trigger once on mount
    - _Requirements: 6.7_

- [ ]* 9.8 Write visual regression tests for login page
  - Capture screenshots of login page in idle, hover, and focus states
  - Test staggered reveal animation timing
  - Test theme toggle animation
  - Test reducedMotion version matches expectations
  - _Requirements: 6.1, 6.3, 18.2_

- [ ] 10. Enhance dashboard with KPI animations and widgets
  - [ ] 10.1 Add CountUp animations to KPI cards
    - Replace static numeric displays with CountUp component
    - Configure count animations from 0 to target value in 1200ms
    - Format numbers with thousand separators (commas)
    - Support decimal values for percentages and currency
    - Trigger animations when cards enter viewport
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6_
  
  - [ ] 10.2 Add trend indicator bounce animations
    - Animate up/down arrow icons with bounce effect
    - Use spring physics for natural motion
    - Trigger on KPI card entrance
    - _Requirements: 7.7_
  
  - [ ] 10.3 Add stagger animation to dashboard widgets
    - Wrap dashboard widgets in AnimatedList component
    - Use 80ms stagger delay between widgets
    - Apply fadeIn and slideUp effects to each widget
    - Limit animation to first 20 widgets for performance
    - _Requirements: 8.2, 8.4_
  
  - [ ] 10.4 Add chart entrance animations
    - Animate chart containers with fadeIn and scaleIn effects
    - Apply scroll-triggered animation using useScrollAnimation hook
    - Ensure charts animate when entering viewport
    - _Requirements: 8.1, 8.5_

- [ ]* 10.5 Write integration tests for dashboard animations
  - Test CountUp triggers on viewport entry
  - Test widget stagger animation renders correctly
  - Test chart entrance animations with mocked IntersectionObserver
  - Verify performance with 20+ widgets
  - _Requirements: 7.6, 8.2, 8.3_

- [ ] 11. Enhance table and data grid interactions
  - [ ] 11.1 Add table row hover animations
    - Transition background-color on row hover within 90ms
    - Apply subtle scale 0.995 effect on row selection
    - Preserve existing hover color from theme
    - _Requirements: 12.1, 12.3_
  
  - [ ] 11.2 Add stagger animation to table rows on load
    - Apply stagger animation to first 15 rows only
    - Use 30ms delay between rows
    - Apply fadeIn and slideUp effects
    - _Requirements: 12.2, 4.3_
  
  - [ ] 11.3 Add sort operation transitions
    - Animate row fadeOut/fadeIn during sort operations
    - Use 140ms duration for smooth transitions
    - Maintain sticky header position during animations
    - _Requirements: 12.4, 12.5_

- [ ]* 11.4 Write integration tests for table animations
  - Test row hover transitions work correctly
  - Test stagger animation applies to first 15 rows only
  - Test sort animations don't break table functionality
  - _Requirements: 12.2, 12.4_

- [ ] 12. Enhance buttons and interactive elements
  - [ ] 12.1 Add button press feedback animations
    - Apply scale 0.97 effect on button press within 90ms
    - Animate on whileTap using framer-motion
    - _Requirements: 15.1, 5.6_
  
  - [ ] 12.2 Add button hover animations
    - Transition background-color and box-shadow on hover within 140ms
    - Add subtle glow effect to primary buttons on hover
    - Preserve existing button color system
    - _Requirements: 15.2, 15.3_
  
  - [ ] 12.3 Add disabled state animations
    - Animate disabled state transitions with opacity change
    - Use 200ms duration for state changes
    - _Requirements: 15.4_
  
  - [ ] 12.4 Add shake effect for destructive actions
    - Implement shake animation (translateX: [-4px, 4px, -4px, 0]) for delete confirmations
    - Trigger on destructive button interactions
    - _Requirements: 15.5, 5.4_

- [ ]* 12.5 Write integration tests for button animations
  - Test button press feedback with user-event
  - Test hover state transitions
  - Test disabled state animations
  - Test shake effect triggers correctly
  - _Requirements: 15.1, 15.5_

- [ ] 13. Implement notification and badge animations
  - [ ] 13.1 Add badge entrance animations
    - Animate new notification badges with scaleIn and bounce effects
    - Use spring physics for bounce animation
    - _Requirements: 11.2_
  
  - [ ] 13.2 Add badge number change animations
    - Use CountUp component for animating badge value changes
    - Keep animation duration short (400ms) for responsiveness
    - _Requirements: 11.1_
  
  - [ ] 13.3 Add pulse animation to unread indicators
    - Apply continuous pulse animation to unread notification indicators
    - Use CSS keyframe animation for performance
    - Respect reducedMotion preference
    - _Requirements: 11.3_
  
  - [ ] 13.4 Add notification dismissal animations
    - Animate badge exit with scaleOut and fadeOut effects
    - Use 140ms duration
    - _Requirements: 11.4_
  
  - [ ] 13.5 Add toast notification slide-in animations
    - Animate toast notifications from top-right corner with slideIn
    - Use existing sonner toast system
    - _Requirements: 11.5_

- [ ]* 13.6 Write integration tests for notification animations
  - Test badge entrance and exit animations
  - Test badge number changes animate correctly
  - Test pulse animation respects reducedMotion
  - Test toast slide-in animations
  - _Requirements: 11.2, 11.3, 11.4_

- [ ] 14. Enhance loading and skeleton states
  - [ ] 14.1 Improve skeleton sweep animation timing
    - Update existing astu-skeleton animation duration to 1600ms
    - Add pulse animation to skeleton text blocks
    - Maintain existing skeleton gradient
    - _Requirements: 13.1, 13.2_
  
  - [ ] 14.2 Add skeleton-to-content crossfade
    - Implement fadeOut/fadeIn crossfade when content replaces skeleton
    - Use 140ms duration for smooth transition
    - _Requirements: 13.3_
  
  - [ ] 14.3 Add spinner rotation animations
    - Ensure spinner components use smooth 360deg rotation
    - Use CSS animation for performance
    - _Requirements: 13.4_
  
  - [ ] 14.4 Add progress bar animations
    - Animate progress bar width transitions
    - Implement indeterminate state animations
    - _Requirements: 13.5_

- [ ]* 14.5 Write visual regression tests for loading states
  - Capture skeleton animation states
  - Test skeleton-to-content crossfade timing
  - Test spinner rotation smoothness
  - _Requirements: 13.1, 13.3_

- [ ] 15. Enhance focus indicators and keyboard navigation
  - [ ] 15.1 Add animated focus ring
    - Animate focus ring appearance with scaleIn effect within 90ms
    - Maintain existing 2px solid outline focus style
    - Apply to all focusable elements
    - _Requirements: 17.1, 17.2_
  
  - [ ] 15.2 Add input focus background transitions
    - Add subtle background-color transition on input focus
    - Use 90ms duration with --ease-out
    - _Requirements: 17.3_
  
  - [ ] 15.3 Enhance focus-visible behavior
    - Preserve all existing focus-visible styling
    - Ensure animations don't interfere with keyboard navigation
    - _Requirements: 17.4, 17.5_

- [ ]* 15.4 Write accessibility tests for focus animations
  - Test focus ring appears and scales correctly
  - Test keyboard navigation works with animations
  - Test focus-visible behavior is preserved
  - Run axe-core audit to verify no violations
  - _Requirements: 17.2, 17.5, 20.6_

- [ ] 16. Implement responsive layout improvements
  - [ ] 16.1 Add viewport resize transition animations
    - Transition layout changes smoothly on viewport resize within 200ms
    - Maintain grid and flexbox layouts during transitions
    - _Requirements: 19.1, 19.2_
  
  - [ ] 16.2 Adjust mobile spacing and padding
    - Ensure spacing and padding scale proportionally for mobile viewports
    - Maintain existing responsive breakpoints
    - _Requirements: 19.3_
  
  - [ ] 16.3 Verify mobile touch targets
    - Ensure all interactive elements meet 44x44px minimum size on mobile
    - Test buttons, links, and form inputs
    - _Requirements: 19.4, 20.6_
  
  - [ ] 16.4 Optimize mobile animation complexity
    - Reduce particle effects and complex animations on mobile devices
    - Use simplified animations for better performance
    - _Requirements: 19.5_

- [ ]* 16.5 Write responsive tests for mobile animations
  - Test layout transitions at different viewport sizes
  - Test touch target sizes meet WCAG guidelines
  - Test mobile animation performance
  - _Requirements: 19.1, 19.4, 20.6_

- [ ] 17. Implement scroll-triggered animations across pages
  - [ ] 17.1 Add scroll animation to inventory page cards
    - Use useScrollAnimation hook for inventory cards
    - Trigger fadeIn and slideUp when cards enter viewport
    - Set once: true to animate only on first appearance
    - _Requirements: 16.1, 16.2, 16.4_
  
  - [ ] 17.2 Add scroll animation to major sections
    - Apply scroll animations to dashboard sections, reports, and settings
    - Use Intersection Observer with 30% visibility threshold
    - _Requirements: 16.3, 16.4_
  
  - [ ] 17.3 Implement performance optimization
    - Use Intersection Observer API for efficient scroll detection
    - Trigger animations once per element to prevent re-triggering
    - _Requirements: 16.2, 16.4, 16.5_

- [ ]* 17.4 Write integration tests for scroll animations
  - Test scroll animations trigger at correct viewport positions
  - Test animations only trigger once per element
  - Test reducedMotion disables scroll animations
  - Mock IntersectionObserver for tests
  - _Requirements: 16.4, 16.5_

- [ ] 18. Implement theme transition animations
  - [ ] 18.1 Add global theme transition animation
    - Animate color transitions across all components when theme toggles
    - Use 200ms duration for smooth color changes
    - Apply to all themed elements (background, text, borders)
    - _Requirements: 18.1, 18.5_
  
  - [ ] 18.2 Enhance theme toggle button
    - Add icon rotation and crossfade animations
    - Maintain button position and styling during animation
    - Already partially implemented in login page task 9.3
    - _Requirements: 18.2, 18.3, 18.4_

- [ ]* 18.3 Write visual regression tests for theme transitions
  - Capture theme toggle animation at key frames
  - Test color transitions across major components
  - Test theme toggle in different pages
  - _Requirements: 18.1, 18.5_

- [ ] 19. Implement performance monitoring
  - [ ] 19.1 Create AnimationPerformanceMonitor utility
    - Implement frame rate monitoring that logs warnings if FPS drops below 55
    - Measure frame count over 1-second intervals
    - Provide start() and stop() methods
    - _Requirements: 1.4, 20.2_
  
  - [ ] 19.2 Add performance utilities
    - Implement debounce utility for scroll and resize events
    - Export performance monitoring instance
    - _Requirements: 20.2_
  
  - [ ] 19.3 Add will-change optimization
    - Ensure will-change CSS property is used only during active animations
    - Remove will-change after animation completion to prevent GPU memory issues
    - _Requirements: 20.3, 20.4_

- [ ]* 19.4 Write performance tests
  - Test animation frame rate maintains 55+ FPS on mid-range devices
  - Test Time to Interactive impact stays under 50ms
  - Test GPU memory usage doesn't exceed 15% baseline increase
  - Use Playwright for performance testing
  - _Requirements: 1.4, 20.2_

- [ ] 20. Replace mobile bottom sheets with vaul drawers
  - Identify existing bottom sheet components in mobile navigation
  - Replace with Drawer component from task 7
  - Test drawer drag-to-dismiss gesture on mobile devices
  - Ensure drawer maintains focus trap and accessibility
  - _Requirements: 10.6, 9.2, 9.3, 9.5_

- [ ]* 20.1 Write mobile-specific tests for drawers
  - Test drawer opens correctly on mobile viewport
  - Test drag gesture dismisses drawer
  - Test drawer works with mobile keyboards
  - _Requirements: 9.3, 9.5_

- [ ] 21. Typography and spacing refinements
  - Update line-height for paragraph text from 1.5 to 1.6
  - Update letter-spacing for h1/h2 headings from -0.012em to -0.015em
  - Add subtle text-shadow to headings in dark mode for legibility
  - Preserve existing font-family and font-size values
  - Maintain tabular-nums for numeric data displays
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ]* 21.1 Write visual regression tests for typography
  - Capture typography changes in light and dark themes
  - Test line-height and letter-spacing adjustments
  - Test text-shadow visibility in dark mode
  - _Requirements: 14.5_

- [ ] 22. Final integration and polish
  - [ ] 22.1 Add AnimatedPage wrapper to all major routes
    - Wrap page components with AnimatedPage for consistent transitions
    - Test page transitions across navigation flows
    - _Requirements: 2.1, 2.2_
  
  - [ ] 22.2 Add AnimatedCard to remaining card components
    - Apply AnimatedCard wrapper to dashboard cards, inventory cards, and report cards
    - Configure interactive prop for clickable cards
    - Configure entrance prop for cards that should animate on mount
    - _Requirements: 3.1, 3.2, 3.6_
  
  - [ ] 22.3 Apply form input animations globally
    - Enhance all form inputs with focus scale and label animations
    - Apply validation animations to form error and success states
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [ ] 22.4 Verify animation consistency across all pages
    - Test animations on login, dashboard, inventory, reports, suppliers, and settings pages
    - Ensure consistent timing and easing across all animations
    - Verify both light and dark themes display correctly
    - _Requirements: 1.3, 1.4_

- [ ] 23. Checkpoint - Final quality assurance
  - Run full test suite (unit, integration, visual regression, performance, accessibility)
  - Verify all animations respect reducedMotion preference
  - Test on mobile, tablet, and desktop viewports
  - Ensure 60fps performance across all animations
  - Verify WCAG 2.1 Level AA compliance with axe DevTools
  - Ask the user if questions arise

- [ ]* 24. Create comprehensive animation documentation
  - Document all animation variants and their use cases
  - Create Storybook or component showcase for animated components
  - Document performance best practices
  - Document accessibility considerations
  - _Requirements: 1.1, 1.2, 1.3_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- All animation components include built-in reducedMotion handling for accessibility
- Performance optimization is built-in through maxItems limits on stagger animations
- Testing is organized as optional sub-tasks under implementation tasks for flexibility
- Each task references specific requirements from requirements.md for traceability
- The implementation uses TypeScript with React 19, Next.js 16, and framer-motion v13.1.1
- All animations use hardware-accelerated properties (transform, opacity) for 60fps performance
- Animation timing uses existing CSS custom properties (--dur-instant: 90ms, --dur-fast: 140ms, --dur-base: 200ms)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["1.1", "2.1", "2.2", "2.3", "2.4"] },
    { "id": 2, "tasks": ["2.5", "3.1", "3.2", "3.3"] },
    { "id": 3, "tasks": ["3.4", "5.1", "5.2", "5.3", "5.4", "6", "7"] },
    { "id": 4, "tasks": ["5.5", "6.1", "7.1"] },
    { "id": 5, "tasks": ["9.1", "9.2", "9.3", "9.4", "9.5", "9.6", "9.7"] },
    { "id": 6, "tasks": ["9.8", "10.1", "10.2", "10.3", "10.4"] },
    { "id": 7, "tasks": ["10.5", "11.1", "11.2", "11.3"] },
    { "id": 8, "tasks": ["11.4", "12.1", "12.2", "12.3", "12.4"] },
    { "id": 9, "tasks": ["12.5", "13.1", "13.2", "13.3", "13.4", "13.5"] },
    { "id": 10, "tasks": ["13.6", "14.1", "14.2", "14.3", "14.4"] },
    { "id": 11, "tasks": ["14.5", "15.1", "15.2", "15.3"] },
    { "id": 12, "tasks": ["15.4", "16.1", "16.2", "16.3", "16.4"] },
    { "id": 13, "tasks": ["16.5", "17.1", "17.2", "17.3"] },
    { "id": 14, "tasks": ["17.4", "18.1", "18.2"] },
    { "id": 15, "tasks": ["18.3", "19.1", "19.2", "19.3"] },
    { "id": 16, "tasks": ["19.4", "20", "21"] },
    { "id": 17, "tasks": ["20.1", "21.1", "22.1", "22.2", "22.3", "22.4"] },
    { "id": 18, "tasks": ["24"] }
  ]
}
```
