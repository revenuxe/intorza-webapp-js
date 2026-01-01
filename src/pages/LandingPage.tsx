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
  IndianRupee
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
      description: "Get a complete overview of your business - quotations, revenue, pending amounts, and conversion rates all in one place.",
      image: dashboardImg,
      cta: "Explore Dashboard",
      link: "/dashboard",
      color: "from-blue-500/20 to-blue-600/10"
    },
    {
      icon: FileText,
      title: "Professional Quotations",
      description: "Create beautiful, detailed quotations in minutes with templates, auto-calculations, and customizable sections.",
      image: quotationImg,
      cta: "Create Quotation",
      link: "/create-quotation",
      color: "from-terracotta/20 to-orange-500/10"
    },
    {
      icon: Ruler,
      title: "Site Measurement",
      description: "Record site measurements on-the-go, add photos, assign team members, and convert directly to quotations.",
      image: siteMeasurementImg,
      cta: "Start Measuring",
      link: "/site-measurement",
      color: "from-green-500/20 to-emerald-500/10"
    },
    {
      icon: Receipt,
      title: "Invoice Management",
      description: "Track payments, generate invoices from quotations, and never miss a pending amount with smart reminders.",
      image: invoiceImg,
      cta: "Manage Invoices",
      link: "/invoices",
      color: "from-purple-500/20 to-violet-500/10"
    },
    {
      icon: FolderKanban,
      title: "Project Tracking",
      description: "Convert accepted quotations to projects, track progress, manage team assignments, and monitor financials.",
      image: projectsImg,
      cta: "View Projects",
      link: "/my-projects",
      color: "from-amber-500/20 to-yellow-500/10"
    },
    {
      icon: Users,
      title: "Team Management",
      description: "Add team members, assign projects, track attendance, and manage your workforce efficiently.",
      image: teamImg,
      cta: "Manage Team",
      link: "/team",
      color: "from-pink-500/20 to-rose-500/10"
    },
    {
      icon: Library,
      title: "My Library",
      description: "Save items, sections, terms, and templates for quick reuse. Your pricing library learns from your patterns.",
      image: libraryImg,
      cta: "Open Library",
      link: "/library",
      color: "from-cyan-500/20 to-teal-500/10"
    }
  ];

  const benefits = [
    { icon: Zap, title: "10x Faster", desc: "Create quotations in minutes, not hours" },
    { icon: Shield, title: "Never Lose Data", desc: "Cloud sync keeps everything safe" },
    { icon: Clock, title: "Save 5+ Hours/Week", desc: "Automate repetitive tasks" },
    { icon: IndianRupee, title: "Get Paid Faster", desc: "Track payments & send reminders" }
  ];

  const testimonials = [
    { name: "Rajesh Kumar", role: "Interior Designer, Bangalore", text: "Intorza transformed how I handle quotations. My clients love the professional PDFs!", rating: 5 },
    { name: "Priya Sharma", role: "Contractor, Mumbai", text: "The site measurement feature is a game changer. I can quote on-site instantly.", rating: 5 },
    { name: "Amit Patel", role: "Furniture Manufacturer, Ahmedabad", text: "Best investment for my business. Payment tracking alone saved me lakhs.", rating: 5 }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={intorzaLogo} alt="Intorza" className="h-8" />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">Reviews</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" className="hidden sm:inline-flex">Login</Button>
            </Link>
            <Link to="/create-quotation">
              <Button className="bg-terracotta hover:bg-terracotta/90 text-white shadow-lg shadow-terracotta/25">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-terracotta/5 via-transparent to-navy/5" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-terracotta/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-navy/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 bg-terracotta/10 text-terracotta border-terracotta/20 px-4 py-2">
              <Sparkles className="w-4 h-4 mr-2" />
              Trusted by 500+ Interior Professionals
            </Badge>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
              Create{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-terracotta to-orange-500">
                Professional Quotations
              </span>{" "}
              in Minutes
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              The all-in-one business management app for interior designers, contractors & furniture makers. 
              From site measurement to invoice collection.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link to="/create-quotation">
                <Button size="lg" className="bg-terracotta hover:bg-terracotta/90 text-white shadow-xl shadow-terracotta/30 text-lg px-8 py-6 w-full sm:w-auto">
                  Create Your First Quotation
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 w-full sm:w-auto border-2">
                  See All Features
                </Button>
              </a>
            </div>

            {/* Hero Image - Dashboard */}
            <div className="relative mt-8">
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-navy/20 border border-border/50">
                <img 
                  src={dashboardImg} 
                  alt="Intorza Dashboard" 
                  className="w-full h-auto"
                />
              </div>
              {/* Floating Stats */}
              <div className="absolute -left-4 md:left-8 top-1/4 bg-white dark:bg-card rounded-xl shadow-xl p-4 border border-border/50 animate-float">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Revenue Tracked</p>
                    <p className="font-bold text-foreground">₹50L+</p>
                  </div>
                </div>
              </div>
              <div className="absolute -right-4 md:right-8 top-1/3 bg-white dark:bg-card rounded-xl shadow-xl p-4 border border-border/50 animate-float-delayed">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Quotations Created</p>
                    <p className="font-bold text-foreground">2,500+</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Bar */}
      <section className="py-12 bg-navy text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="text-center">
                <benefit.icon className="w-8 h-8 mx-auto mb-3 text-gold" />
                <h3 className="font-semibold mb-1">{benefit.title}</h3>
                <p className="text-sm text-white/70">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-navy/10 text-navy border-navy/20">Features</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Everything You Need to{" "}
              <span className="text-terracotta">Run Your Business</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From first client meeting to final payment, Intorza handles it all.
            </p>
          </div>

          <div className="space-y-32">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-12 items-center`}
              >
                {/* Content */}
                <div className="flex-1 text-center lg:text-left">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} mb-6`}>
                    <feature.icon className="w-8 h-8 text-terracotta" />
                  </div>
                  <h3 className="text-2xl md:text-4xl font-bold mb-4">{feature.title}</h3>
                  <p className="text-lg text-muted-foreground mb-6 max-w-md mx-auto lg:mx-0">
                    {feature.description}
                  </p>
                  <Link to={feature.link}>
                    <Button className="bg-terracotta hover:bg-terracotta/90 text-white shadow-lg">
                      {feature.cta}
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </div>

                {/* Image */}
                <div className="flex-1 relative">
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} rounded-3xl blur-2xl opacity-50`} />
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border/50 hover:shadow-3xl transition-shadow duration-500">
                    <img 
                      src={feature.image} 
                      alt={feature.title} 
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quotation Detail Feature */}
      <section className="py-24 px-4 bg-gradient-to-br from-warm-beige/30 to-background">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative order-2 lg:order-1">
              <div className="absolute inset-0 bg-gradient-to-br from-terracotta/20 to-orange-500/10 rounded-3xl blur-2xl opacity-50" />
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border/50">
                <img 
                  src={quotationDetailImg} 
                  alt="Quotation Details" 
                  className="w-full h-auto"
                />
              </div>
            </div>
            <div className="order-1 lg:order-2 text-center lg:text-left">
              <Badge className="mb-4 bg-terracotta/10 text-terracotta border-terracotta/20">Quotation Management</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Track Every Quotation from{" "}
                <span className="text-terracotta">Pending to Accepted</span>
              </h2>
              <ul className="space-y-4 text-left max-w-md mx-auto lg:mx-0">
                {[
                  "Mark quotations as Accepted or Rejected",
                  "View complete client & project details",
                  "Download professional PDFs anytime",
                  "Convert accepted quotes to projects instantly"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link to="/quotations">
                  <Button className="bg-terracotta hover:bg-terracotta/90 text-white shadow-lg">
                    View My Quotations
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Client Management */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <Badge className="mb-4 bg-navy/10 text-navy border-navy/20">Client Management</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Know Your Clients{" "}
                <span className="text-terracotta">Inside Out</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-6 max-w-md mx-auto lg:mx-0">
                Track total billed amount, payments received, and outstanding balance for each client. 
                Never miss a follow-up again.
              </p>
              <Link to="/clients">
                <Button className="bg-navy hover:bg-navy/90 text-white shadow-lg">
                  Manage Clients
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-navy/20 to-blue-500/10 rounded-3xl blur-2xl opacity-50" />
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border/50">
                <img 
                  src={clientsImg} 
                  alt="Client Management" 
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 bg-gradient-to-br from-navy via-navy/95 to-navy text-white relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-terracotta/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gold/20 rounded-full blur-3xl" />
        </div>
        
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-gold/20 text-gold border-gold/30">Limited Time Offer</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Start Your Pro Journey at{" "}
              <span className="text-gold">97% OFF</span>
            </h2>
            <p className="text-lg text-white/70 max-w-xl mx-auto">
              Join 500+ professionals who upgraded their business with Intorza Pro
            </p>
          </div>

          <div className="max-w-lg mx-auto">
            <Card className="bg-white/10 backdrop-blur-xl border-white/20 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 bg-gradient-to-l from-gold to-amber-500 text-navy font-bold px-6 py-2 text-sm">
                BEST VALUE
              </div>
              <CardContent className="p-8 pt-12">
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-2">Intorza Pro</h3>
                  <p className="text-white/70 mb-6">Everything you need to grow</p>
                  
                  <div className="mb-8">
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-2xl text-white/50 line-through">₹1,999</span>
                      <Badge className="bg-red-500/20 text-red-300 border-red-500/30">97% OFF</Badge>
                    </div>
                    <div className="flex items-baseline justify-center mt-2">
                      <span className="text-6xl font-bold text-gold">₹49</span>
                      <span className="text-xl text-white/70 ml-2">/month</span>
                    </div>
                  </div>

                  <ul className="space-y-4 text-left mb-8">
                    {[
                      "Unlimited Quotations & Invoices",
                      "Site Measurement with Photos",
                      "Project Management & Tracking",
                      "Team Management & Attendance",
                      "My Library - Templates & Items",
                      "Client Management & Analytics",
                      "PDF Downloads with Branding",
                      "Cloud Sync & Backup",
                      "Priority Support"
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-gold flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Link to="/auth">
                    <Button size="lg" className="w-full bg-gradient-to-r from-gold to-amber-500 hover:from-gold/90 hover:to-amber-500/90 text-navy font-bold text-lg py-6 shadow-xl shadow-gold/30">
                      Upgrade to Pro Now
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                  <p className="text-sm text-white/50 mt-4">Cancel anytime. No questions asked.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Free Features */}
          <div className="mt-12 text-center">
            <p className="text-white/70 mb-4">Or start with our Free Plan</p>
            <div className="flex flex-wrap justify-center gap-4">
              {["Create Quotations", "Download PDFs", "View Dashboard", "Basic Client Management"].map((item, i) => (
                <Badge key={i} variant="outline" className="border-white/30 text-white/70 px-4 py-2">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-4 bg-gradient-to-br from-background to-warm-beige/20">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-terracotta/10 text-terracotta border-terracotta/20">Testimonials</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Loved by{" "}
              <span className="text-terracotta">Professionals</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <Card key={i} className="bg-card border-border/50 hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {Array(testimonial.rating).fill(0).map((_, j) => (
                      <Star key={j} className="w-5 h-5 fill-gold text-gold" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 italic">"{testimonial.text}"</p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-terracotta to-orange-500 flex items-center justify-center text-white font-bold">
                      {testimonial.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 bg-gradient-to-r from-terracotta to-orange-500 text-white">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-lg text-white/90 mb-8 max-w-xl mx-auto">
            Join hundreds of interior professionals who save 5+ hours every week with Intorza.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/create-quotation">
              <Button size="lg" className="bg-white text-terracotta hover:bg-white/90 font-bold text-lg px-8 py-6 shadow-xl">
                Start Free - No Card Required
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-navy text-white">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <img src={intorzaLogo} alt="Intorza" className="h-8 mb-4 brightness-0 invert" />
              <p className="text-white/70 text-sm">
                The all-in-one business management app for interior professionals.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-sm text-white/70">
                <li><Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
                <li><Link to="/create-quotation" className="hover:text-white transition-colors">Create Quotation</Link></li>
                <li><Link to="/site-measurement" className="hover:text-white transition-colors">Site Measurement</Link></li>
                <li><Link to="/invoices" className="hover:text-white transition-colors">Invoices</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-white/70">
                <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms-and-conditions" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link to="/cancellation-refund-policy" className="hover:text-white transition-colors">Refund Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Get Started</h4>
              <Link to="/auth">
                <Button className="bg-terracotta hover:bg-terracotta/90 text-white w-full">
                  Sign Up Free
                </Button>
              </Link>
            </div>
          </div>
          <div className="border-t border-white/20 pt-8 text-center text-sm text-white/50">
            <p>© {new Date().getFullYear()} Intorza. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
