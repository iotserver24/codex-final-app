## CodeX v1.2.0

### TL;DR (What's new)

- **Universal Thinking Support** - All AI models now support thinking capabilities
- **E2B Integration** - Share your app previews with the world via E2B sandboxes
- **Enhanced Share Panel** - New sharing interface with duration controls
- **Improved Model Support** - Extended thinking capabilities across all providers
- **Better Error Handling** - Enhanced error management and user feedback

### Highlights

#### 🧠 Universal Thinking Support

- **All models now support thinking** - No more division between thinking and non-thinking models
- **User-controlled thinking intensity** - Low/Medium/High budget settings work for all providers
- **Provider-specific optimizations** - OpenAI gets reasoning_effort + thinking, others get thinking config
- **Backward compatibility** - Existing thinking models continue to work as before

#### 🌐 E2B Integration & Sharing

- **E2B Sandbox Sharing** - Share your app previews publicly via E2B sandboxes
- **Duration Controls** - Choose from 5/10/15 minutes for sharing
- **Real-time Status** - Live monitoring of sandbox status, logs, and progress
- **Automatic URL Copying** - Share links are automatically copied to clipboard

#### 🎨 Enhanced Share Panel

- **New Share Interface** - Dedicated share panel with comprehensive controls
- **Duration Selection** - Easy dropdown for choosing sandbox duration
- **Status Monitoring** - Real-time display of sandbox status and logs
- **Progress Tracking** - Visual progress indicators for sandbox operations
- **Version Management** - Track and manage multiple sandbox versions

### Technical Improvements

#### Enhanced AI Model Support

- **Universal Thinking** - All AI models now support advanced reasoning and thinking capabilities
- **Better Performance** - Improved response quality and speed across all providers
- **Smarter Responses** - Models can now think through complex problems before responding
- **User Control** - Adjust thinking intensity (Low/Medium/High) for any model

#### Sharing & Collaboration

- **Public App Sharing** - Share your app previews with anyone via secure sandboxes
- **Real-time Monitoring** - Watch your shared apps in real-time with live status updates
- **Flexible Duration** - Choose how long your shared apps stay online (5-15 minutes)
- **One-Click Sharing** - Share links are automatically copied to your clipboard

### New Features & Capabilities

- **App Sharing** - Share your built apps with others via secure online sandboxes
- **Thinking Controls** - Fine-tune how much AI models think before responding
- **Better Error Messages** - Clearer feedback when things go wrong
- **Improved Settings** - Enhanced configuration options for better control

### User Experience Improvements

- **Intuitive Sharing** - One-click sharing with automatic URL copying
- **Visual Feedback** - Clear status indicators and progress tracking
- **Flexible Duration** - Choose appropriate sandbox duration for your needs
- **Better Error Recovery** - Clearer error messages and helpful guidance
- **Smoother Performance** - Faster app loading and more responsive interface

### Breaking Changes

- None - All changes are backward compatible

### What's New for Users

- **All AI Models Now Think** - Every model can now use advanced reasoning, not just specific ones
- **Share Your Apps** - Show your creations to others with secure, temporary sharing links
- **Better AI Responses** - Models think more carefully before responding, leading to better results
- **Improved Reliability** - Fewer errors and clearer feedback when issues occur

### Performance & Reliability

- **Faster Responses** - Optimized AI model performance across all providers
- **Better Stability** - Improved error handling and recovery
- **Secure Sharing** - Your shared apps run in isolated, secure environments
- **Smoother Experience** - Reduced loading times and more responsive interface

### Summary

- **Major Feature Addition** - App sharing capabilities for collaboration and showcasing
- **Universal AI Enhancement** - All models now support advanced thinking and reasoning
- **Better User Experience** - Improved performance, reliability, and error handling
- **No Breaking Changes** - Everything works exactly as before, just better

---

## Previous Versions

### CodeX v1.1.0

#### TL;DR (What's new)

- addition of 2 more providers
- added prompt library to save the prompts
- added docs (beta)
- Added 5 new themes with app-wide color variables
- Improved text contrast across the UI (inputs, pills, cards)
- Theme‑aware chat inputs and title bar window controls
- Settings and Hub now use theme tokens (no hardcoded colors)
- Temporarily hid the "Backend Services" card on Hub
- Improved macOS CI: upload correct artifacts for universal builds

#### Highlights

- Themes
  - New themes: Retro‑Future Tech, Urban Mysteries, Micro‑Adventures, AI + Art Experiments, Digital Magic
  - Each theme defines foreground/on‑color tokens for accessibility
- Readability & Contrast
  - Input boxes, action icons, headings, and helper text now bind to `foreground`, `muted-foreground`, `bg-card`, and `border` tokens
  - Better visibility on both light and dark backgrounds
- Title Bar
  - Minimize / Maximize / Close icons adopt sidebar theme colors with proper hover behavior
- Hub
  - "Backend Services" section is hidden for now
- CI/CD
  - macOS release workflow collects x64 and arm64 zips generated by the universal step

#### Fixes & polish

- Removed hardcoded grays in Settings and other screens in favor of theme tokens
- Minor UI consistency tweaks across buttons and labels

#### Notes

- This version focuses on visual polish and accessibility; functionality remains unchanged.

### CodeX v1.0.8

#### TL;DR (What's new)

- Added 5 new themes with app-wide color variables
- Improved text contrast across the UI (inputs, pills, cards)
- Theme‑aware chat inputs and title bar window controls
- Settings and Hub now use theme tokens (no hardcoded colors)
- Temporarily hid the "Backend Services" card on Hub
- Improved macOS CI: upload correct artifacts for universal builds

#### Highlights

- Themes
  - New themes: Retro‑Future Tech, Urban Mysteries, Micro‑Adventures, AI + Art Experiments, Digital Magic
  - Each theme defines foreground/on‑color tokens for accessibility
- Readability & Contrast
  - Input boxes, action icons, headings, and helper text now bind to `foreground`, `muted-foreground`, `bg-card`, and `border` tokens
  - Better visibility on both light and dark backgrounds
- Title Bar
  - Minimize / Maximize / Close icons adopt sidebar theme colors with proper hover behavior
- Hub
  - "Backend Services" section is hidden for now
- CI/CD
  - macOS release workflow collects x64 and arm64 zips generated by the universal step

#### Fixes & polish

- Removed hardcoded grays in Settings and other screens in favor of theme tokens
- Minor UI consistency tweaks across buttons and labels

#### Notes

- This version focuses on visual polish and accessibility; functionality remains unchanged.
