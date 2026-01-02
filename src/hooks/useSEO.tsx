import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOConfig {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: string;
  noIndex?: boolean;
  alternateLanguages?: { lang: string; href: string }[];
}

// Country-specific keywords for international SEO
const countryKeywords = {
  global: 'interior design software, quotation software, invoice software, interior designer tools, proposal generator, design business management',
  india: 'interior design software India, quotation software for interior designers India, GST invoice software, interior designer tools India, modular kitchen quotation, wardrobe quotation software, home interior cost calculator India',
  uae: 'interior design software Dubai, quotation software UAE, fit-out quotation software, interior designer tools Dubai, villa interior quotation, office interior quotation UAE',
  usa: 'interior design software USA, quotation software for interior designers, invoice software designers, interior designer tools America, home renovation quotation, commercial interior quotation',
  uk: 'interior design software UK, quotation software for interior designers UK, invoice software designers, interior designer tools Britain, home interior quotation, office fit-out quotation UK',
  australia: 'interior design software Australia, quotation software for interior designers, invoice software designers, interior designer tools Australia, home renovation quotation',
  singapore: 'interior design software Singapore, quotation software HDB renovation, interior designer tools Singapore, home interior quotation Singapore, condo renovation quotation',
  malaysia: 'interior design software Malaysia, quotation software for interior designers, interior designer tools Malaysia, home interior quotation KL, renovation quotation software',
  indonesia: 'interior design software Indonesia, quotation software for interior designers, interior designer tools Jakarta, home interior quotation Indonesia',
  philippines: 'interior design software Philippines, quotation software for interior designers, interior designer tools Manila, home interior quotation Philippines',
  thailand: 'interior design software Thailand, quotation software for interior designers, interior designer tools Bangkok, home interior quotation Thailand',
  vietnam: 'interior design software Vietnam, quotation software for interior designers, interior designer tools Vietnam, home interior quotation Vietnam',
  canada: 'interior design software Canada, quotation software for interior designers, interior designer tools Canada, home renovation quotation, commercial interior quotation',
  germany: 'interior design software Germany, quotation software for interior designers, interior designer tools Germany, Einrichtungsdesign Software',
  france: 'interior design software France, quotation software for interior designers, interior designer tools France, logiciel design intérieur',
  italy: 'interior design software Italy, quotation software for interior designers, interior designer tools Italy, software design interni',
  spain: 'interior design software Spain, quotation software for interior designers, interior designer tools Spain, software diseño interiores',
  netherlands: 'interior design software Netherlands, quotation software for interior designers, interior designer tools Netherlands',
  belgium: 'interior design software Belgium, quotation software for interior designers, interior designer tools Belgium',
  sweden: 'interior design software Sweden, quotation software for interior designers, interior designer tools Sweden',
  norway: 'interior design software Norway, quotation software for interior designers, interior designer tools Norway',
  denmark: 'interior design software Denmark, quotation software for interior designers, interior designer tools Denmark',
  switzerland: 'interior design software Switzerland, quotation software for interior designers, interior designer tools Switzerland',
  austria: 'interior design software Austria, quotation software for interior designers, interior designer tools Austria',
  portugal: 'interior design software Portugal, quotation software for interior designers, interior designer tools Portugal',
  poland: 'interior design software Poland, quotation software for interior designers, interior designer tools Poland',
  newzealand: 'interior design software New Zealand, quotation software for interior designers, interior designer tools New Zealand',
  southafrica: 'interior design software South Africa, quotation software for interior designers, interior designer tools South Africa',
  nigeria: 'interior design software Nigeria, quotation software for interior designers, interior designer tools Nigeria',
  kenya: 'interior design software Kenya, quotation software for interior designers, interior designer tools Kenya',
  egypt: 'interior design software Egypt, quotation software for interior designers, interior designer tools Egypt',
  saudiarabia: 'interior design software Saudi Arabia, quotation software for interior designers, interior designer tools Saudi Arabia, villa interior quotation',
  qatar: 'interior design software Qatar, quotation software for interior designers, interior designer tools Qatar, villa interior quotation',
  kuwait: 'interior design software Kuwait, quotation software for interior designers, interior designer tools Kuwait',
  bahrain: 'interior design software Bahrain, quotation software for interior designers, interior designer tools Bahrain',
  oman: 'interior design software Oman, quotation software for interior designers, interior designer tools Oman',
  japan: 'interior design software Japan, quotation software for interior designers, interior designer tools Japan, インテリアデザインソフトウェア',
  southkorea: 'interior design software South Korea, quotation software for interior designers, interior designer tools South Korea, 인테리어 디자인 소프트웨어',
  china: 'interior design software China, quotation software for interior designers, interior designer tools China, 室内设计软件',
  hongkong: 'interior design software Hong Kong, quotation software for interior designers, interior designer tools Hong Kong',
  taiwan: 'interior design software Taiwan, quotation software for interior designers, interior designer tools Taiwan',
  brazil: 'interior design software Brazil, quotation software for interior designers, interior designer tools Brazil, software design de interiores',
  mexico: 'interior design software Mexico, quotation software for interior designers, interior designer tools Mexico, software diseño interiores',
  argentina: 'interior design software Argentina, quotation software for interior designers, interior designer tools Argentina',
  chile: 'interior design software Chile, quotation software for interior designers, interior designer tools Chile',
  colombia: 'interior design software Colombia, quotation software for interior designers, interior designer tools Colombia',
  peru: 'interior design software Peru, quotation software for interior designers, interior designer tools Peru',
  russia: 'interior design software Russia, quotation software for interior designers, interior designer tools Russia, программное обеспечение для дизайна интерьера',
  turkey: 'interior design software Turkey, quotation software for interior designers, interior designer tools Turkey, iç tasarım yazılımı',
  israel: 'interior design software Israel, quotation software for interior designers, interior designer tools Israel',
  pakistan: 'interior design software Pakistan, quotation software for interior designers, interior designer tools Pakistan',
  bangladesh: 'interior design software Bangladesh, quotation software for interior designers, interior designer tools Bangladesh',
  srilanka: 'interior design software Sri Lanka, quotation software for interior designers, interior designer tools Sri Lanka',
  nepal: 'interior design software Nepal, quotation software for interior designers, interior designer tools Nepal',
};

// Combine all country keywords for global targeting
const allKeywords = Object.values(countryKeywords).join(', ');

const routeSEOConfig: Record<string, SEOConfig> = {
  '/': {
    title: 'INTORZA - Best Interior Design Quotation & Invoice Software 2025 | Free Trial',
    description: 'Create professional interior design quotations & invoices in minutes. GST-ready, beautiful PDF themes, payment tracking & client management. Trusted by 10,000+ designers worldwide. Start free today!',
    keywords: `${allKeywords}, best quotation software 2025, free quotation maker, professional invoice generator, interior design estimate software, modular kitchen calculator, wardrobe cost estimator, home interior pricing, renovation quotation template, commercial interior estimate, office interior quotation, restaurant interior quotation, hotel interior quotation, retail shop interior quotation, showroom interior quotation`,
    ogType: 'website',
    ogImage: 'https://intorza.com/og-image.png',
  },
  '/auth': {
    title: 'Login | INTORZA - Interior Design Software',
    description: 'Sign in to INTORZA to manage your interior design quotations, invoices, and client projects. Access your business dashboard.',
    noIndex: true,
  },
  '/dashboard': {
    title: 'Dashboard | INTORZA',
    description: 'View your interior design business dashboard with project analytics, recent quotations, and invoice tracking.',
    noIndex: true,
  },
  '/quotations': {
    title: 'Create Interior Design Quotations Online | INTORZA',
    description: 'Create and manage professional interior design quotations with beautiful PDF themes. Generate itemized proposals with room-wise pricing, GST calculation, and payment schedules.',
    keywords: 'interior design quotations, design proposals, project estimates, modular kitchen quotation, wardrobe quotation, living room quotation, bedroom quotation, bathroom quotation, office interior quotation, commercial interior quotation, quotation template interior design, free quotation maker',
    ogImage: 'https://intorza.com/og-quotations.png',
  },
  '/create-quotation': {
    title: 'Create New Quotation | INTORZA Interior Design Software',
    description: 'Create a professional quotation for your interior design project with itemized pricing, room sections, GST calculation, and beautiful PDF themes.',
    keywords: 'create quotation, interior design quote, project estimate, proposal generator, quotation maker',
  },
  '/invoices': {
    title: 'Interior Design Invoice Software | Track Payments | INTORZA',
    description: 'Professional invoice software for interior designers. Generate GST invoices, track payments, manage due dates, and maintain financial records. Beautiful invoice templates included.',
    keywords: 'interior design invoices, payment tracking, billing software, GST invoice software, invoice generator, payment reminder, interior designer billing, project billing software, invoice template interior design',
    ogImage: 'https://intorza.com/og-invoices.png',
  },
  '/site-measurement': {
    title: 'Site Measurement App for Interior Designers | INTORZA',
    description: 'Record site measurements digitally with room dimensions, photos, and notes. Calculate area automatically and convert to quotations instantly. Perfect for on-site visits.',
    keywords: 'site measurement, room dimensions, interior design planning, area calculator, site visit app, measurement tool, room measurement app, floor plan measurement, on-site measurement',
    ogImage: 'https://intorza.com/og-measurement.png',
  },
  '/clients': {
    title: 'Client Management | INTORZA',
    description: 'Manage your interior design clients efficiently. Keep track of client information, projects, and communication history.',
    noIndex: true,
  },
  '/my-projects': {
    title: 'My Projects | INTORZA',
    description: 'View and manage all your interior design projects in one place. Track project status and progress.',
    noIndex: true,
  },
  '/library': {
    title: 'My Library | INTORZA',
    description: 'Access your saved templates, pricing items, and reusable content for faster quotation creation.',
    noIndex: true,
  },
  '/team': {
    title: 'Team Management | INTORZA',
    description: 'Manage your interior design team members, assign projects, and track attendance and work progress.',
    noIndex: true,
  },
  '/settings': {
    title: 'Settings | INTORZA',
    description: 'Configure your INTORZA account settings, company profile, brand colors, and preferences.',
    noIndex: true,
  },
  '/terms-and-conditions': {
    title: 'Terms and Conditions | INTORZA Interior Design Software',
    description: 'Read the terms and conditions for using INTORZA interior design quotation and invoice software.',
    keywords: 'terms of service, legal terms, user agreement, INTORZA terms',
  },
  '/privacy-policy': {
    title: 'Privacy Policy | INTORZA Interior Design Software',
    description: 'Learn how INTORZA protects your privacy and handles your personal data. We are committed to data security.',
    keywords: 'privacy policy, data protection, personal information, INTORZA privacy, GDPR compliance',
  },
  '/cancellation-refund-policy': {
    title: 'Cancellation & Refund Policy | INTORZA',
    description: 'Understand our cancellation and refund policy for INTORZA Pro subscriptions. Fair and transparent policies.',
    keywords: 'refund policy, cancellation, subscription terms, INTORZA refund',
  },
};

const defaultSEO: SEOConfig = {
  title: 'INTORZA - Interior Design Quotation & Invoice Software',
  description: 'Professional quotation and invoice software for interior designers. Create beautiful proposals, manage clients, and grow your design business.',
  keywords: countryKeywords.global,
  ogType: 'website',
};

export const useSEO = (customConfig?: SEOConfig) => {
  const location = useLocation();

  useEffect(() => {
    const pathname = location.pathname;
    const config = customConfig || routeSEOConfig[pathname] || defaultSEO;
    
    // Get the current origin for canonical URL
    const origin = window.location.origin;
    const canonicalUrl = `${origin}${pathname}`;

    // Update document title
    document.title = config.title || defaultSEO.title || 'INTORZA';

    // Helper function to update or create meta tag
    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
      
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    // Helper function to update or create link tag
    const updateLinkTag = (rel: string, href: string) => {
      let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
      
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.href = href;
    };

    // Set canonical URL
    updateLinkTag('canonical', canonicalUrl);

    // Set meta description
    if (config.description) {
      updateMetaTag('description', config.description);
    }

    // Set keywords with comprehensive global and country targeting
    if (config.keywords) {
      updateMetaTag('keywords', config.keywords);
    }

    // Set robots meta - index public pages, noindex private pages
    if (config.noIndex) {
      updateMetaTag('robots', 'noindex, nofollow');
      updateMetaTag('googlebot', 'noindex, nofollow');
    } else {
      updateMetaTag('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
      updateMetaTag('googlebot', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
      updateMetaTag('bingbot', 'index, follow');
    }

    // Open Graph tags
    updateMetaTag('og:title', config.title || defaultSEO.title || 'INTORZA', true);
    updateMetaTag('og:description', config.description || defaultSEO.description || '', true);
    updateMetaTag('og:url', canonicalUrl, true);
    updateMetaTag('og:type', config.ogType || 'website', true);
    updateMetaTag('og:site_name', 'INTORZA', true);
    updateMetaTag('og:locale', 'en_US', true);
    
    if (config.ogImage) {
      updateMetaTag('og:image', config.ogImage, true);
      updateMetaTag('og:image:width', '1200', true);
      updateMetaTag('og:image:height', '630', true);
      updateMetaTag('og:image:alt', config.title || 'INTORZA Interior Design Software', true);
    }

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:site', '@intorza');
    updateMetaTag('twitter:creator', '@intorza');
    updateMetaTag('twitter:title', config.title || defaultSEO.title || 'INTORZA');
    updateMetaTag('twitter:description', config.description || defaultSEO.description || '');
    
    if (config.ogImage) {
      updateMetaTag('twitter:image', config.ogImage);
    }

    // Additional SEO meta tags
    updateMetaTag('author', 'INTORZA');
    updateMetaTag('publisher', 'INTORZA');
    updateMetaTag('application-name', 'INTORZA');
    updateMetaTag('apple-mobile-web-app-title', 'INTORZA');
    updateMetaTag('theme-color', '#6366f1');
    updateMetaTag('msapplication-TileColor', '#6366f1');
    
    // Geo-targeting meta tags for international SEO
    updateMetaTag('geo.region', 'GLOBAL');
    updateMetaTag('geo.placename', 'Worldwide');
    updateMetaTag('distribution', 'global');
    updateMetaTag('audience', 'interior designers, interior design firms, architects, home decorators, renovation contractors');
    updateMetaTag('target', 'all');
    updateMetaTag('rating', 'general');
    updateMetaTag('revisit-after', '7 days');

    // Cleanup function
    return () => {
      // Optional: Remove dynamically added meta tags on unmount if needed
    };
  }, [location.pathname, customConfig]);
};

export default useSEO;