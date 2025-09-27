import React from "react";
import { SponsorshipLogos } from "./components/SponsorshipLogos";
import "./styles/SponsorshipLogos.css";

// Example usage of the SponsorshipLogos component
export const ExamplePage: React.FC = () => {
  // Example with default sponsors
  const _defaultExample = (
    <section>
      <h2>Default Sponsors</h2>
      <SponsorshipLogos />
    </section>
  );

  // Example with custom sponsors
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
    {
      name: "Vercel",
      logo: "/sponsors/vercel-logo.svg",
      url: "https://vercel.com",
      alt: "Vercel Logo",
    },
  ];

  const _customExample = (
    <section>
      <h2>Custom Sponsors</h2>
      <SponsorshipLogos sponsors={customSponsors} />
    </section>
  );

  // Example with custom styling
  const _styledExample = (
    <section>
      <h2>Custom Styled</h2>
      <SponsorshipLogos className="custom-sponsorship-section" />
    </section>
  );

  return (
    <div className="example-page">
      <header>
        <h1>CodeX Website</h1>
        <p>AI-powered development environment</p>
      </header>

      <main>
        {/* Hero section */}
        <section className="hero">
          <h2>Build Faster with AI</h2>
          <p>
            CodeX helps you create applications using natural language with
            support for 50+ AI models.
          </p>
          <button>Download CodeX Free</button>
          <button>View Documentation</button>
        </section>

        {/* Sponsorship logos section */}
        <section className="sponsorship-section">
          <h3>Trusted by developers worldwide</h3>
          <SponsorshipLogos />
        </section>

        {/* Features section */}
        <section className="features">
          <div className="feature-grid">
            <div className="feature-card">
              <h4>27+ AI Models</h4>
              <p>Access to the latest AI models from top providers</p>
            </div>
            <div className="feature-card">
              <h4>100% Free</h4>
              <p>No hidden costs, completely free to use</p>
            </div>
            <div className="feature-card">
              <h4>3 Platforms</h4>
              <p>Windows, macOS, and Linux support</p>
            </div>
            <div className="feature-card">
              <h4>∞ Possibilities</h4>
              <p>Build anything you can imagine</p>
            </div>
          </div>
        </section>

        {/* Another sponsorship section */}
        <section className="sponsorship-section">
          <h3>Featured on</h3>
          <SponsorshipLogos sponsors={customSponsors} />
        </section>

        {/* Demo section */}
        <section className="demo">
          <h2>See CodeX in Action</h2>
          <p>
            Watch how CodeX transforms your development workflow with AI
            assistance.
          </p>
          <div className="demo-video">{/* Demo video placeholder */}</div>
        </section>
      </main>

      <footer>
        <p>&copy; 2024 CodeX. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default ExamplePage;
