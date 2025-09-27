# CodeX Website

This directory contains the website components and assets for the CodeX project.

## Sponsorship Logos Component

The `SponsorshipLogos` component is a moving strap animation that displays sponsor logos in a continuous scrolling loop. It's designed to be easily expandable as more sponsors are added.

### Features

- **Moving Strap Animation**: Continuous horizontal scrolling with seamless loop
- **Responsive Design**: Adapts to different screen sizes
- **Hover Effects**: Interactive elements with smooth transitions
- **Accessibility**: Supports reduced motion preferences and high contrast mode
- **Easy Expansion**: Simple to add new sponsors

### Usage

#### Option 1: Regular CSS Classes

```tsx
import { SponsorshipLogos } from "./components/SponsorshipLogos";
import "./styles/SponsorshipLogos.css";

function App() {
  return (
    <div>
      {/* Your other content */}
      <SponsorshipLogos />
      {/* More content */}
    </div>
  );
}
```

#### Option 2: CSS Modules

```tsx
import { SponsorshipLogos } from "./components/SponsorshipLogosWithModules";

function App() {
  return (
    <div>
      {/* Your other content */}
      <SponsorshipLogos />
      {/* More content */}
    </div>
  );
}
```

### Customizing Sponsors

You can pass custom sponsors to the component:

```tsx
const customSponsors = [
  {
    name: "Product Hunt",
    logo: "/sponsors/product-hunt-logo.svg",
    url: "https://www.producthunt.com",
    alt: "Product Hunt Logo",
  },
  {
    name: "GitHub",
    logo: "/sponsors/github-logo.svg",
    url: "https://github.com",
    alt: "GitHub Logo",
  },
  // Add more sponsors as needed
];

<SponsorshipLogos sponsors={customSponsors} />;
```

### Adding New Sponsors

To add a new sponsor:

1. Add the sponsor logo image to the `/public/sponsors/` directory
2. Update the `defaultSponsors` array in the component file:

```tsx
const defaultSponsors: Sponsor[] = [
  {
    name: "Product Hunt",
    logo: "/sponsors/product-hunt-logo.svg",
    url: "https://www.producthunt.com",
    alt: "Product Hunt Logo",
  },
  {
    name: "New Sponsor",
    logo: "/sponsors/new-sponsor-logo.svg",
    url: "https://newsponsor.com",
    alt: "New Sponsor Logo",
  },
];
```

### Styling

The component includes comprehensive styling with:

- **Dark theme support**: Automatically adapts to dark mode
- **Responsive breakpoints**: Mobile, tablet, and desktop optimizations
- **Accessibility features**: High contrast and reduced motion support
- **Smooth animations**: CSS transitions and keyframe animations
- **Hover effects**: Interactive feedback for better UX

### File Structure

```
website/
├── components/
│   ├── SponsorshipLogos.tsx              # Main component (CSS classes)
│   ├── SponsorshipLogosWithModules.tsx   # CSS Modules version
│   └── SponsorshipLogos.module.css       # CSS Modules styles
├── styles/
│   └── SponsorshipLogos.css              # Regular CSS styles
└── public/
    └── sponsors/                         # Sponsor logo images
        └── product-hunt-logo.svg
```

### Browser Support

- Modern browsers with CSS Grid and Flexbox support
- CSS custom properties (CSS variables)
- CSS backdrop-filter (with fallbacks)
- CSS animations and transitions

### Performance

- Optimized animations using `transform` and `opacity`
- Hardware acceleration for smooth scrolling
- Minimal DOM manipulation
- Efficient CSS selectors

### Accessibility

- Semantic HTML structure
- Proper alt text for images
- Keyboard navigation support
- Screen reader friendly
- Respects `prefers-reduced-motion`
- High contrast mode support
