# Xibe AI v1.2.5

Date: 2025-10-02

## 🚀 What's New

- Switched update source to `http://api.xibe.app/api/releases/latest` with platform-aware assets.
- Update dialogs now render rich Markdown (GFM) with safe inline media (images, audio, video).
- Single, system-detected download button in the update modal for a simpler UX.
- Wider update modal and taller changelog viewport for better readability.
- New Donate popup with three options:
  - Razorpay (India): `https://razorpay.me/@megavault`
  - Buy Me a Coffee: `https://buymeacoffee.com/r3ap3redit`
  - Polar: `https://buy.polar.sh/polar_cl_NR3IF9VYKBFO5QHq4Vi8fLGLGpC3Mb6h3EU5r3Crspl`
- Smarter Model Picker: clearer model groups (cloud and local), cleaner names, and fast access to the models you actually use.
- Safer Send Flow: the Send button now stays disabled when an approval is required, preventing accidental submits.
- Simpler Provider Setup: clearer status for provider configuration and a more direct path to being “ready to use.”
- Better App Mentions: improved handling when referencing other apps so context is gathered more reliably.

## 🧩 Features

- Update system rework with platform-targeted URLs and renderer-side UI revamp
- Inline changelog rendered with GFM + media (images, audio, video)
- Single-click “Download for <platform>” button using system detection
- Donate dialog with multi-provider support (Razorpay, Buy Me a Coffee, Polar)
- Enhanced model selection experience with grouped providers and quick filtering of relevant options

## 🛠 Improvements

- Unified update check flow; removed duplicate update popup instances.
- Accessibility: every dialog now includes `DialogTitle` and `DialogDescription`.
- Updated documentation/donation links to the new domain `https://docs.xibe.app/`.
- Cleaned linter issues and removed unused imports/handlers.
- Model Picker polish: clearer labels, better ordering, and smarter visibility based on your plan.
- Chat input ergonomics: avoids unintended sends while a code change is awaiting your approval.
- Provider settings clarity: easier to see when a provider is configured and what’s missing.
- Mentioned apps are resolved more consistently when you reference them in chats.

## 🔐 Security & Stability

- Enabled sanitized HTML in markdown via `rehype-raw` + `rehype-sanitize` to prevent unsafe content.
- Kept iframes/scripts blocked by default in markdown for Electron security.
- More resilient startup paths and graceful fallbacks in edge cases to reduce spurious errors.

## 📦 Developer Notes

- New deps: `rehype-raw`, `rehype-sanitize`.
- Version bumped in `package.json` to `1.2.5`.

---

Need help or want to learn more?

- Website: https://xibe.app
- Docs: https://docs.xibe.app/docs
