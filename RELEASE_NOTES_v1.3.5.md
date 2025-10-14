# Xibe AI v1.3.5

Date: 2025-01-15

## 🚀 What's New

- **Agent Router Integration**: New AI provider with $200 free credits and access to Claude, DeepSeek, GLM, GPT-5, and Grok models
- **Enhanced Authentication**: Improved login persistence with proper user email storage
- **Fullscreen Login Experience**: Streamlined authentication flow with no bypass options
- **Production API Integration**: Updated all endpoints to use production URLs instead of localhost
- **Major platform update** with significant improvements and modernization
- **App Favorites**: Mark your most-used apps as favorites for quick access
- **Enhanced Chat Activity Tracking**: Better visibility into recent chat sessions and concurrent conversations
- **Improved Onboarding Experience**: New onboarding banner and setup flow to help you get started faster
- **Modernized UI Components**: Cleaner, more intuitive interface throughout the application
- **Better Model Organization**: Improved model picker with clearer categorization between cloud and local models
- **All Pro Features Remain FREE**: Access to all advanced features at no cost

## 🧩 Features

### New in v1.3.5

- **Agent Router Provider**:
  - 9 premium AI models including Claude 4.5, DeepSeek V3.2, GPT-5, and Grok Code
  - $200 free credits for new users
  - OpenAI-compatible API with streaming support
  - Special headers for optimal performance
- **Authentication Improvements**:
  - Persistent user email storage across app restarts
  - Fullscreen login modal with no close button
  - Production API endpoints for reliable authentication
- **API Endpoint Updates**:
  - All localhost URLs replaced with production endpoints
  - Environment variable configuration for easy deployment
  - Improved error handling and validation

### Existing Features (from v1.3.0)

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

- **New AI Provider**: Agent Router with 9 premium models and $200 free credits
- **Better Authentication**: No more "unknown@example.com" - proper user email persistence
- **Streamlined Login**: Fullscreen authentication with no bypass options
- Cleaner app list with favorite indicators
- Better chat input controls with improved approval flow
- Enhanced provider settings UI with helpful tooltips and popovers
- More intuitive model selection experience
- Improved error handling and user feedback throughout the app

### Performance & Stability

- **Production API**: All endpoints now use production URLs for better reliability
- **Environment Configuration**: Proper environment variable usage for deployment
- Optimized codebase for faster performance
- Improved database queries and IPC handlers
- Better memory management in chat streaming
- More efficient file upload handling
- Enhanced concurrent chat management

### Code Quality

- **No Hardcoded URLs**: All API endpoints now use environment variables
- **Better Error Handling**: Improved validation and error messages
- Updated to latest dependencies and Electron Forge configuration
- Cleaner project structure with better separation of concerns
- Enhanced TypeScript types and interfaces
- Better error propagation from main process to renderer
- Improved IPC patterns with TanStack Query integration

## 🔐 Security & Stability

- **Production Security**: All API calls now use secure production endpoints
- **Authentication Security**: Proper user data persistence and validation
- Updated Electron and related security dependencies
- Improved IPC security with better validation
- Enhanced error handling to prevent crashes
- More robust file system operations
- Better handling of edge cases in chat streaming

## 📦 Technical Details

### Database Changes

- New `is_favorite` column in `apps` table for favorites functionality
- New `authenticatedUser` field in settings for user data persistence
- All documentation tables preserved (docs_sources, docs_pages, docs_chunks)
- Migration: `0013_damp_mephistopheles.sql`

### New IPC Channels

- `add-to-favorite`: Toggle app favorite status
- Enhanced chat streaming handlers with activity tracking
- Improved authentication handlers with user data persistence

### New Components & Hooks

- **Agent Router Provider**: Complete integration with 9 AI models
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
- New Agent Router provider is optional

## 📝 Migration Notes

### For Users

- **No action required** - upgrade and continue working
- Your apps, chats, and settings are preserved
- New Agent Router provider available in settings
- New favorites feature is immediately available
- All existing functionality works as before
- **New**: Get $200 free credits with Agent Router at https://agentrouter.org/register?aff=ywol

### For Developers

- Test concurrent chat scenarios
- Verify app favorites functionality
- Review updated IPC patterns and database schema
- **New**: Test Agent Router integration with various models
- **New**: Verify production API endpoint configuration

## 🔗 References

- Previous Version: v1.2.5
- Repository: https://github.com/iotserver24/codex (closed source)

---

Need help or want to learn more?

- Website: https://xibe.app
- Docs: https://docs.xibe.app/docs
- Support: https://github.com/iotserver24/codex/issues
- **New**: Agent Router: https://agentrouter.org/register?aff=ywol
