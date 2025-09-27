import React from "react";

interface Sponsor {
  name: string;
  logo: string;
  url?: string;
  alt?: string;
}

interface SponsorshipLogosProps {
  sponsors?: Sponsor[];
  className?: string;
}

const defaultSponsors: Sponsor[] = [
  {
    name: "Product Hunt",
    logo: "/sponsors/product-hunt-logo.svg",
    url: "https://www.producthunt.com",
    alt: "Product Hunt Logo",
  },
  // Add more sponsors here as they come in
];

export const SponsorshipLogos: React.FC<SponsorshipLogosProps> = ({
  sponsors = defaultSponsors,
  className = "",
}) => {
  return (
    <div className={`sponsorship-logos ${className}`}>
      <div className="sponsorship-logos__container">
        <div className="sponsorship-logos__track">
          {/* First set of logos */}
          {sponsors.map((sponsor, index) => (
            <div key={`first-${index}`} className="sponsorship-logos__item">
              {sponsor.url ? (
                <a
                  href={sponsor.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sponsorship-logos__link"
                >
                  <img
                    src={sponsor.logo}
                    alt={sponsor.alt || `${sponsor.name} logo`}
                    className="sponsorship-logos__logo"
                  />
                </a>
              ) : (
                <img
                  src={sponsor.logo}
                  alt={sponsor.alt || `${sponsor.name} logo`}
                  className="sponsorship-logos__logo"
                />
              )}
            </div>
          ))}

          {/* Duplicate set for seamless loop */}
          {sponsors.map((sponsor, index) => (
            <div key={`second-${index}`} className="sponsorship-logos__item">
              {sponsor.url ? (
                <a
                  href={sponsor.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sponsorship-logos__link"
                >
                  <img
                    src={sponsor.logo}
                    alt={sponsor.alt || `${sponsor.name} logo`}
                    className="sponsorship-logos__logo"
                  />
                </a>
              ) : (
                <img
                  src={sponsor.logo}
                  alt={sponsor.alt || `${sponsor.name} logo`}
                  className="sponsorship-logos__logo"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SponsorshipLogos;
