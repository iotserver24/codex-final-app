# Xibe AI v1.3.0

Date: 2025-10-12

## 🚀 What's New

- **Major platform update** with significant improvements and modernization
- **App Favorites**: Mark your most-used apps as favorites for quick access
- **Enhanced Chat Activity Tracking**: Better visibility into recent chat sessions and concurrent conversations
- **Improved Onboarding Experience**: New onboarding banner and setup flow to help you get started faster
- **Modernized UI Components**: Cleaner, more intuitive interface throughout the application
- **Better Model Organization**: Improved model picker with clearer categorization between cloud and local models
- **All Pro Features Remain FREE**: Access to all advanced features at no cost

## 🧩 Features

- **App Favorites System**: One-click favoriting for quick access to your most important apps
- **Chat Activity Component**: Track and manage multiple active chat sessions with ease
- **Enhanced Setup Flow**: Improved onboarding with helpful guides and provider setup assistance
- **Action Header**: Improved preview panel header for better clarity
- **Agentic Mode** - Autonomous AI assistant functionality
- **Documentation Indexing** - Local docs crawling and semantic search
- **E2B Integration** - Share and deploy your apps seamlessly
- **GitHub Integration** - Direct issue reporting and repository linking
- **Smart Update System** - Platform-aware updates for seamless upgrades

## 🛠 Improvements

### User Experience

- Cleaner app list with favorite indicators
- Better chat input controls with improved approval flow
- Enhanced provider settings UI with helpful tooltips and popovers
- More intuitive model selection experience
- Improved error handling and user feedback throughout the app

### Performance & Stability

- Optimized codebase for faster performance
- Improved database queries and IPC handlers
- Better memory management in chat streaming
- More efficient file upload handling
- Enhanced concurrent chat management

### Code Quality

- Updated to latest dependencies and Electron Forge configuration
- Cleaner project structure with better separation of concerns
- Enhanced TypeScript types and interfaces
- Better error propagation from main process to renderer
- Improved IPC patterns with TanStack Query integration

## 🔐 Security & Stability

- Updated Electron and related security dependencies
- Improved IPC security with better validation
- Enhanced error handling to prevent crashes
- More robust file system operations
- Better handling of edge cases in chat streaming

## 📦 Technical Details

### Database Changes

- New `is_favorite` column in `apps` table for favorites functionality
- All documentation tables preserved (docs_sources, docs_pages, docs_chunks)
- Migration: `0013_damp_mephistopheles.sql`

### New IPC Channels

- `add-to-favorite`: Toggle app favorite status
- Enhanced chat streaming handlers with activity tracking

### New Components & Hooks

- `OnboardingBanner.tsx`: Welcome and setup guidance
- `ChatActivity.tsx`: Active chat session tracking
- `useAddAppToFavorite`: Hook for favorites management
- `useSelectChat`: Enhanced chat selection logic
- `appItem.tsx`: Reusable app list item component

### Updated Dependencies

- Multiple package updates for security and features
- Cleaner dependency tree with fewer conflicts
- Updated Electron Forge to latest stable version

## 🎯 Breaking Changes

**NONE!** This is a feature-preserving upgrade:

- All existing apps continue to work
- All custom features remain functional
- No configuration changes required
- Seamless upgrade from v1.2.5

## 📝 Migration Notes

### For Users

- **No action required** - upgrade and continue working
- Your apps, chats, and settings are preserved
- New favorites feature is immediately available
- All existing functionality works as before

### For Developers

- Test concurrent chat scenarios
- Verify app favorites functionality
- Review updated IPC patterns and database schema

## 🔗 References

- Previous Version: v1.2.5
- Repository: https://github.com/iotserver24/codex (closed source)

---

Need help or want to learn more?

- Website: https://xibe.app
- Docs: https://docs.xibe.app/docs
- Support: https://github.com/iotserver24/codex/issues
