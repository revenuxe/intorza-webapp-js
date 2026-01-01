import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOConfig {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: string;
  noIndex?: boolean;
}

const routeSEOConfig: Record<string, SEOConfig> = {
  '/': {
    title: 'INTORZA - Interior Design Quotation & Invoice Software',
    description: 'Professional quotation and invoice software for interior designers. Create beautiful proposals, manage clients, and streamline your design business.',
    keywords: 'interior design software, quotation software, invoice software, interior designer tools, proposal generator',
    ogType: 'website',
  },
  '/auth': {
    title: 'Login | INTORZA',
    description: 'Sign in to INTORZA to manage your interior design quotations, invoices, and client projects.',
    noIndex: true,
  },
  '/dashboard': {
    title: 'Dashboard | INTORZA',
    description: 'View your interior design business dashboard with project analytics, recent quotations, and invoices.',
    noIndex: true,
  },
  '/quotations': {
    title: 'Quotations | INTORZA',
    description: 'Create and manage professional interior design quotations. Generate beautiful PDF proposals for your clients.',
    keywords: 'interior design quotations, design proposals, project estimates',
  },
  '/create-quotation': {
    title: 'Create Quotation | INTORZA',
    description: 'Create a new professional quotation for your interior design project with itemized pricing and beautiful themes.',
  },
  '/invoices': {
    title: 'Invoices | INTORZA',
    description: 'Manage your interior design invoices. Track payments, generate professional invoices, and maintain financial records.',
    keywords: 'interior design invoices, payment tracking, billing software',
  },
  '/site-measurement': {
    title: 'Site Measurement | INTORZA',
    description: 'Record and manage site measurements for interior design projects. Capture room dimensions, photos, and notes.',
    keywords: 'site measurement, room dimensions, interior design planning',
  },
  '/clients': {
    title: 'Clients | INTORZA',
    description: 'Manage your interior design clients. Keep track of client information, projects, and communication history.',
    noIndex: true,
  },
  '/my-projects': {
    title: 'My Projects | INTORZA',
    description: 'View and manage all your interior design projects in one place.',
    noIndex: true,
  },
  '/library': {
    title: 'My Library | INTORZA',
    description: 'Access your saved templates, pricing items, and reusable content for interior design quotations.',
    noIndex: true,
  },
  '/team': {
    title: 'Team Management | INTORZA',
    description: 'Manage your interior design team members, assign projects, and track work progress.',
    noIndex: true,
  },
  '/settings': {
    title: 'Settings | INTORZA',
    description: 'Configure your INTORZA account settings, business profile, and preferences.',
    noIndex: true,
  },
  '/terms-and-conditions': {
    title: 'Terms and Conditions | INTORZA',
    description: 'Read the terms and conditions for using INTORZA interior design quotation software.',
    keywords: 'terms of service, legal terms, user agreement',
  },
  '/privacy-policy': {
    title: 'Privacy Policy | INTORZA',
    description: 'Learn how INTORZA protects your privacy and handles your personal data.',
    keywords: 'privacy policy, data protection, personal information',
  },
  '/cancellation-refund-policy': {
    title: 'Cancellation & Refund Policy | INTORZA',
    description: 'Understand our cancellation and refund policy for INTORZA subscriptions.',
    keywords: 'refund policy, cancellation, subscription terms',
  },
};

const defaultSEO: SEOConfig = {
  title: 'INTORZA - Interior Design Software',
  description: 'Professional quotation and invoice software for interior designers.',
  keywords: 'interior design, quotation software, invoice software',
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

    // Set keywords
    if (config.keywords) {
      updateMetaTag('keywords', config.keywords);
    }

    // Set robots meta - Complete noindex, nofollow, noarchive for all pages
    updateMetaTag('robots', 'noindex, nofollow, noarchive, nosnippet, noimageindex');
    updateMetaTag('googlebot', 'noindex, nofollow, noarchive, nosnippet, noimageindex');
    updateMetaTag('bingbot', 'noindex, nofollow, noarchive');

    // Open Graph tags
    updateMetaTag('og:title', config.title || defaultSEO.title || 'INTORZA', true);
    updateMetaTag('og:description', config.description || defaultSEO.description || '', true);
    updateMetaTag('og:url', canonicalUrl, true);
    updateMetaTag('og:type', config.ogType || 'website', true);
    updateMetaTag('og:site_name', 'INTORZA', true);
    
    if (config.ogImage) {
      updateMetaTag('og:image', config.ogImage, true);
    }

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', config.title || defaultSEO.title || 'INTORZA');
    updateMetaTag('twitter:description', config.description || defaultSEO.description || '');
    
    if (config.ogImage) {
      updateMetaTag('twitter:image', config.ogImage);
    }

    // Cleanup function
    return () => {
      // Optional: Remove dynamically added meta tags on unmount if needed
    };
  }, [location.pathname, customConfig]);
};

export default useSEO;
