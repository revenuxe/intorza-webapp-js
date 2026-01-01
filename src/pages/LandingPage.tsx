import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, 
  CheckCircle2, 
  LayoutDashboard, 
  FileText, 
  Ruler, 
  Receipt, 
  FolderKanban, 
  Users, 
  Library, 
  Star,
  Sparkles,
  Zap,
  Shield,
  Clock,
  IndianRupee,
  Play,
  ChevronRight
} from "lucide-react";
import intorzaLogo from "@/assets/intorza-logo.webp";
import dashboardImg from "@/assets/screenshots/dashboard.png";
import quotationImg from "@/assets/screenshots/quotation.png";
import quotationDetailImg from "@/assets/screenshots/quotation-detail.png";
import siteMeasurementImg from "@/assets/screenshots/site-measurement.png";
import invoiceImg from "@/assets/screenshots/invoice.png";
import projectsImg from "@/assets/screenshots/projects.png";
import teamImg from "@/assets/screenshots/team.png";
import libraryImg from "@/assets/screenshots/library.png";
import clientsImg from "@/assets/screenshots/clients.png";

const LandingPage = () => {
  const features = [
    {
      icon: LayoutDashboard,
      title: "Smart Dashboard",
      description: "Complete business overview with revenue tracking, quotation status, and conversion analytics.",
      image: dashboardImg,
      cta: "Explore Dashboard",
      link: "/dashboard"
    },
    {
      icon: FileText,
      title: "Professional Quotations",
      description: "Create stunning quotations with auto-calculations, templates, and instant PDF generation.",
      image: quotationImg,
      cta: "Create Quotation",
      link: "/create-quotation"
    },
    {
      icon: Ruler,
      title: "Site Measurement",
      description: "Record measurements on-site, attach photos, and convert directly to quotations.",
      image: siteMeasurementImg,
      cta: "Start Measuring",
      link: "/site-measurement"
    },
    {
      icon: Receipt,
      title: "Invoice Management",
      description: "Track payments, generate invoices, and monitor outstanding balances effortlessly.",
      image: invoiceImg,
      cta: "Manage Invoices",
      link: "/invoices"
    },
    {
      icon: FolderKanban,
      title: "Project Tracking",
      description: "Convert quotations to projects, track progress, and manage team assignments.",
      image: projectsImg,
      cta: "View Projects",
      link: "/my-projects"
    },
    {
      icon: Users,
      title: "Team Management",
      description: "Add members, assign projects, track attendance, and manage your workforce.",
      image: teamImg,
      cta: "Manage Team",
      link: "/team"
    }
  ];

  const stats = [
    { value: "500+", label: "Active Users" },
    { value: "₹2Cr+", label: "Revenue Tracked" },
    { value: "10K+", label: "Quotations Created" },
    { value: "98%", label: "Customer Satisfaction" }
  ];

  const proFeatures = [
    "Unlimited Quotations & Invoices",
    "Site Measurement with Photos",
    "Project Management",
    "Team Management & Attendance",
    "My Library - Templates & Items",
    "Client Analytics",
    "Branded PDF Downloads",
    "Cloud Sync & Backup",
    "Priority Support"
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src={intorzaLogo} alt="Intorza" className="h-9" />
          </Link>
          <div className="hidden md:flex items-center gap-10">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="#reviews" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Reviews</a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex font-medium">
                Login
              </Button>
            </Link>
            <Link to="/create-quotation">
              <Button size="sm" className="bg-terracotta hover:bg-terracotta/90 text-white font-medium px-5">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-28 pb-20 px-6 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-terracotta/8 via-transparent to-transparent" />
        
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 bg-terracotta/10 border border-terracotta/20 rounded-full px-4 py-2 mb-8">
              <Sparkles className="w-4 h-4 text-terracotta" />
              <span className="text-sm font-medium text-terracotta">For Interior Designers & Contractors</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              <span className="text-foreground">Create Quotations</span>
              <br />
              <span className="bg-gradient-to-r from-terracotta via-orange-500 to-terracotta bg-clip-text text-transparent">
                Like a Pro
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              The complete business management solution for interior professionals. 
              From site measurement to payment collection — all in one place.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/create-quotation">
                <Button size="lg" className="bg-terracotta hover:bg-terracotta/90 text-white text-base px-8 h-14 shadow-lg shadow-terracotta/20 w-full sm:w-auto">
                  Start Free — No Card Required
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline" className="text-base px-8 h-14 border-2 w-full sm:w-auto">
                  <Play className="mr-2 w-4 h-4" />
                  See How It Works
                </Button>
              </a>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative max-w-6xl mx-auto">
            <div className="absolute -inset-4 bg-gradient-to-r from-terracotta/20 via-orange-500/10 to-terracotta/20 rounded-3xl blur-2xl opacity-60" />
            <div className="relative bg-card rounded-2xl border border-border/60 shadow-2xl overflow-hidden">
              <div className="aspect-[16/9] overflow-hidden">
                <img 
                  src={dashboardImg} 
                  alt="Intorza Dashboard" 
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6 bg-navy">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-sm text-white/60">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-navy/30 text-navy">
              Powerful Features
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Streamline your entire workflow from client meeting to final payment
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="group border-border/50 hover:border-terracotta/30 hover:shadow-xl hover:shadow-terracotta/5 transition-all duration-300 overflow-hidden"
              >
                <div className="aspect-[4/3] overflow-hidden bg-muted/30">
                  <img 
                    src={feature.image} 
                    alt={feature.title} 
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-terracotta/10 flex items-center justify-center">
                      <feature.icon className="w-5 h-5 text-terracotta" />
                    </div>
                    <h3 className="text-lg font-semibold">{feature.title}</h3>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                    {feature.description}
                  </p>
                  <Link to={feature.link}>
                    <Button variant="ghost" size="sm" className="text-terracotta hover:text-terracotta hover:bg-terracotta/10 p-0 h-auto font-medium">
                      {feature.cta}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Library Feature Highlight */}
      <section className="py-24 px-6 bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge variant="outline" className="mb-4 border-terracotta/30 text-terracotta">
                My Library
              </Badge>
              <h2 className="text-4xl font-bold mb-6">
                Save Time with <span className="text-terracotta">Smart Templates</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Build your personal library of items, sections, payment terms, and quotation templates. 
                Intorza learns from your patterns and auto-suggests pricing.
              </p>
              
              <ul className="space-y-4 mb-8">
                {[
                  "Auto-learned items with smart pricing",
                  "Reusable section templates",
                  "Custom payment stage configurations",
                  "Terms & warranty templates"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>

              <Link to="/library">
                <Button className="bg-terracotta hover:bg-terracotta/90 text-white">
                  Explore Library
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-terracotta/10 to-orange-500/10 rounded-3xl blur-xl" />
              <div className="relative bg-card rounded-2xl border border-border/60 shadow-xl overflow-hidden">
                <div className="aspect-[4/3] overflow-hidden">
                  <img 
                    src={libraryImg} 
                    alt="My Library" 
                    className="w-full h-full object-cover object-top"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Client & Quotation Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-navy/10 to-blue-500/10 rounded-3xl blur-xl" />
              <div className="relative bg-card rounded-2xl border border-border/60 shadow-xl overflow-hidden">
                <div className="aspect-[4/3] overflow-hidden">
                  <img 
                    src={clientsImg} 
                    alt="Client Management" 
                    className="w-full h-full object-cover object-top"
                  />
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <Badge variant="outline" className="mb-4 border-navy/30 text-navy">
                Client Management
              </Badge>
              <h2 className="text-4xl font-bold mb-6">
                Know Your <span className="text-navy">Clients Better</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Get a complete financial picture for each client — total billed, payments received, 
                and outstanding amounts. Never miss a follow-up again.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  { icon: Zap, label: "Instant Overview" },
                  { icon: Shield, label: "Payment Tracking" },
                  { icon: Clock, label: "Follow-up Reminders" },
                  { icon: IndianRupee, label: "Revenue Analytics" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <item.icon className="w-5 h-5 text-navy" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                ))}
              </div>

              <Link to="/clients">
                <Button className="bg-navy hover:bg-navy/90 text-white">
                  Manage Clients
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quotation Detail Section */}
      <section className="py-24 px-6 bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge variant="outline" className="mb-4 border-terracotta/30 text-terracotta">
                Quotation Management
              </Badge>
              <h2 className="text-4xl font-bold mb-6">
                Track Every <span className="text-terracotta">Quotation Status</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                From pending to accepted — manage the complete lifecycle of your quotations. 
                Mark status, download PDFs, and convert to projects with one click.
              </p>
              
              <ul className="space-y-4 mb-8">
                {[
                  "Mark as Accepted or Rejected",
                  "Complete client & project details",
                  "Professional PDF downloads",
                  "One-click project conversion"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-terracotta/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-terracotta" />
                    </div>
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>

              <Link to="/quotations">
                <Button className="bg-terracotta hover:bg-terracotta/90 text-white">
                  View Quotations
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-terracotta/10 to-orange-500/10 rounded-3xl blur-xl" />
              <div className="relative bg-card rounded-2xl border border-border/60 shadow-xl overflow-hidden">
                <div className="aspect-[4/3] overflow-hidden">
                  <img 
                    src={quotationDetailImg} 
                    alt="Quotation Details" 
                    className="w-full h-full object-cover object-top"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 bg-navy relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/3 w-96 h-96 bg-terracotta/15 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-gold/15 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-4xl mx-auto relative">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-gold/20 text-gold border-gold/30">
              Limited Time Offer
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Upgrade to Pro at <span className="text-gold">97% OFF</span>
            </h2>
            <p className="text-lg text-white/60">
              Join 500+ professionals growing their business with Intorza
            </p>
          </div>

          <Card className="bg-white/10 backdrop-blur-xl border-white/20 overflow-hidden">
            <CardContent className="p-8 md:p-12">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl text-white/40 line-through">₹1,999</span>
                    <Badge className="bg-red-500/80 text-white border-0">97% OFF</Badge>
                  </div>
                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-6xl font-bold text-gold">₹49</span>
                    <span className="text-xl text-white/60">/month</span>
                  </div>
                  <Link to="/auth">
                    <Button size="lg" className="w-full md:w-auto bg-gradient-to-r from-gold to-amber-500 hover:from-gold/90 hover:to-amber-500/90 text-navy font-bold text-lg h-14 px-10">
                      Upgrade Now
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                  <p className="text-sm text-white/40 mt-3">Cancel anytime. No questions asked.</p>
                </div>

                <div className="flex-1 md:max-w-xs">
                  <h4 className="text-white font-semibold mb-4">Everything in Pro:</h4>
                  <ul className="space-y-3">
                    {proFeatures.map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm text-white/80">
                        <CheckCircle2 className="w-4 h-4 text-gold flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center mt-8">
            <p className="text-white/50 mb-3">Start with our Free Plan</p>
            <div className="flex flex-wrap justify-center gap-2">
              {["Create Quotations", "Download PDFs", "View Dashboard"].map((item, i) => (
                <Badge key={i} variant="outline" className="border-white/20 text-white/60">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section id="reviews" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-terracotta/30 text-terracotta">
              Customer Reviews
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Trusted by Professionals
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "Rajesh Kumar", role: "Interior Designer, Bangalore", text: "Intorza transformed how I handle quotations. My clients are impressed with the professional PDFs!" },
              { name: "Priya Sharma", role: "Contractor, Mumbai", text: "The site measurement feature is incredible. I can quote on-site and close deals faster." },
              { name: "Amit Patel", role: "Furniture Manufacturer, Ahmedabad", text: "Best investment for my business. Payment tracking alone has saved me lakhs in missed follow-ups." }
            ].map((review, i) => (
              <Card key={i} className="border-border/50 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-gold text-gold" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 leading-relaxed">"{review.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-terracotta to-orange-500 flex items-center justify-center text-white font-semibold text-sm">
                      {review.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{review.name}</p>
                      <p className="text-xs text-muted-foreground">{review.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-terracotta via-orange-500 to-terracotta">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Grow Your Business?
          </h2>
          <p className="text-lg text-white/90 mb-8">
            Join hundreds of interior professionals saving 5+ hours every week
          </p>
          <Link to="/create-quotation">
            <Button size="lg" className="bg-white text-terracotta hover:bg-white/90 font-semibold text-base h-14 px-10">
              Start Free Today
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 bg-navy text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-1">
              <img src={intorzaLogo} alt="Intorza" className="h-8 mb-4 brightness-0 invert" />
              <p className="text-white/60 text-sm leading-relaxed">
                The all-in-one business management app for interior professionals.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm">Features</h4>
              <ul className="space-y-3 text-sm text-white/60">
                <li><Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
                <li><Link to="/create-quotation" className="hover:text-white transition-colors">Create Quotation</Link></li>
                <li><Link to="/site-measurement" className="hover:text-white transition-colors">Site Measurement</Link></li>
                <li><Link to="/invoices" className="hover:text-white transition-colors">Invoices</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm">Legal</h4>
              <ul className="space-y-3 text-sm text-white/60">
                <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms-and-conditions" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link to="/cancellation-refund-policy" className="hover:text-white transition-colors">Refund Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm">Get Started</h4>
              <Link to="/auth">
                <Button size="sm" className="bg-terracotta hover:bg-terracotta/90 text-white w-full">
                  Sign Up Free
                </Button>
              </Link>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 text-center text-sm text-white/40">
            © {new Date().getFullYear()} Intorza. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
