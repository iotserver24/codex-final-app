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

## 🧩 Features

- Update system rework with platform-targeted URLs and renderer-side UI revamp
- Inline changelog rendered with GFM + media (images, audio, video)
- Single-click “Download for <platform>” button using system detection
- Donate dialog with multi-provider support (Razorpay, Buy Me a Coffee, Polar)

## 🛠 Improvements

- Unified update check flow; removed duplicate update popup instances.
- Accessibility: every dialog now includes `DialogTitle` and `DialogDescription`.
- Updated documentation/donation links to the new domain `https://docs.xibe.app/`.
- Cleaned linter issues and removed unused imports/handlers.

## 🔐 Security & Stability

- Enabled sanitized HTML in markdown via `rehype-raw` + `rehype-sanitize` to prevent unsafe content.
- Kept iframes/scripts blocked by default in markdown for Electron security.

## 📦 Developer Notes

- New deps: `rehype-raw`, `rehype-sanitize`.
- Version bumped in `package.json` to `1.2.5`.
