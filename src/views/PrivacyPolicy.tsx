"use client";

import { useEffect } from "react";
import { ArrowLeft, Shield, Lock, Eye, Database, Bell, Users, Globe } from "lucide-react";
import { Link } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";

const PrivacyPolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/settings">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
          <p className="text-muted-foreground mt-2">Last updated: December 9, 2024</p>
        </div>

        {/* Trust Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-primary/20">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <Shield className="h-8 w-8 text-primary mb-2" />
              <p className="text-xs font-medium text-foreground">Data Protected</p>
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <Lock className="h-8 w-8 text-primary mb-2" />
              <p className="text-xs font-medium text-foreground">SSL Encrypted</p>
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <Eye className="h-8 w-8 text-primary mb-2" />
              <p className="text-xs font-medium text-foreground">Transparent</p>
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <Database className="h-8 w-8 text-primary mb-2" />
              <p className="text-xs font-medium text-foreground">Secure Storage</p>
            </CardContent>
          </Card>
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              INTORZA ("we," "our," or "us") is committed to protecting your privacy and ensuring the security 
              of your personal and business information. This Privacy Policy explains how we collect, use, 
              disclose, and safeguard your information when you use our Service. Please read this privacy 
              policy carefully. By using the Service, you consent to the practices described in this policy.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              2. Information We Collect
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">2.1 Personal Information</h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  We may collect personally identifiable information that you voluntarily provide, including:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Full name and company name</li>
                  <li>Email address and phone number</li>
                  <li>Business address and location</li>
                  <li>Company logo and signature images</li>
                  <li>Bank account details and payment information</li>
                  <li>GST identification number (GSTIN)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">2.2 Business Data</h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  To provide our services, we collect and store:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Client information (names, contact details, addresses)</li>
                  <li>Quotation and invoice data</li>
                  <li>Site measurement records and photographs</li>
                  <li>Payment history and financial transactions</li>
                  <li>Team member information and attendance records</li>
                  <li>Project details and documentation</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">2.3 Automatically Collected Information</h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  When you access the Service, we automatically collect:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Device information (type, operating system, browser)</li>
                  <li>IP address and general location data</li>
                  <li>Usage patterns and feature interactions</li>
                  <li>Access times and session duration</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              3. How We Use Your Information
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use the collected information for various purposes:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>To provide, maintain, and improve the Service</li>
              <li>To process transactions and send related notifications</li>
              <li>To generate quotations, invoices, and professional documents</li>
              <li>To manage team members and project assignments</li>
              <li>To send administrative information and updates</li>
              <li>To respond to customer service requests and support needs</li>
              <li>To analyze usage patterns and improve user experience</li>
              <li>To detect, prevent, and address technical issues and fraud</li>
              <li>To comply with legal obligations and enforce our terms</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              4. Data Security
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We implement comprehensive security measures to protect your data:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <h4 className="font-medium text-foreground mb-2">Encryption</h4>
                  <p className="text-sm text-muted-foreground">
                    All data is encrypted in transit using SSL/TLS protocols and at rest using AES-256 encryption.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <h4 className="font-medium text-foreground mb-2">Access Control</h4>
                  <p className="text-sm text-muted-foreground">
                    Row-level security ensures users can only access their own data. Team members have restricted access.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <h4 className="font-medium text-foreground mb-2">Secure Infrastructure</h4>
                  <p className="text-sm text-muted-foreground">
                    Our servers are hosted on enterprise-grade infrastructure with 24/7 monitoring and backups.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <h4 className="font-medium text-foreground mb-2">Regular Audits</h4>
                  <p className="text-sm text-muted-foreground">
                    We conduct regular security assessments and vulnerability testing to ensure data protection.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              5. Data Sharing and Disclosure
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We do not sell, trade, or rent your personal information to third parties. We may share your 
              information only in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Service Providers:</strong> With trusted third-party service providers who assist in operating our Service (hosting, analytics, payment processing)</li>
              <li><strong>Legal Requirements:</strong> When required by law, court order, or governmental authority</li>
              <li><strong>Business Transfers:</strong> In connection with any merger, acquisition, or sale of company assets</li>
              <li><strong>Protection:</strong> To protect the rights, property, or safety of INTORZA, our users, or the public</li>
              <li><strong>Consent:</strong> With your explicit consent for any other purpose</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              6. Your Rights and Choices
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You have the following rights regarding your personal data:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Access:</strong> Request access to the personal data we hold about you</li>
              <li><strong>Correction:</strong> Request correction of any inaccurate or incomplete data</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data (subject to legal obligations)</li>
              <li><strong>Export:</strong> Request a copy of your data in a portable format</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent for data processing where applicable</li>
              <li><strong>Opt-Out:</strong> Opt out of marketing communications at any time</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              To exercise any of these rights, please contact us at intorza.com@gmail.com
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your personal information for as long as your account is active or as needed to provide 
              you services. We will retain and use your information as necessary to comply with legal obligations, 
              resolve disputes, and enforce our agreements. Business data (quotations, invoices, payments) is 
              retained for a minimum of 7 years to comply with financial and tax regulations.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">8. Cookies and Tracking Technologies</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use cookies and similar tracking technologies to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Maintain your session and remember your preferences</li>
              <li>Analyze usage patterns and improve the Service</li>
              <li>Provide secure authentication</li>
              <li>Customize your experience</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              You can control cookies through your browser settings. Note that disabling cookies may affect 
              some functionality of the Service.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              9. International Data Transfers
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Your information may be transferred to and maintained on servers located outside of your state, 
              province, country, or other governmental jurisdiction where data protection laws may differ. 
              We ensure that appropriate safeguards are in place for such transfers in compliance with 
              applicable data protection laws.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">10. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is not intended for use by individuals under the age of 18. We do not knowingly 
              collect personal information from children under 18. If we become aware that we have collected 
              personal information from a child under 18, we will take steps to delete such information.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">11. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our Service may contain links to third-party websites or integrate with third-party services 
              (such as Google for authentication). We are not responsible for the privacy practices of these 
              third parties. We encourage you to review their privacy policies before providing any personal 
              information.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">12. Changes to This Privacy Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting 
              the new Privacy Policy on this page and updating the "Last updated" date. For significant changes, 
              we will provide a more prominent notice or email notification. You are advised to review this 
              Privacy Policy periodically for any changes.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">13. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-foreground font-medium">INTORZA - Data Protection</p>
              <p className="text-muted-foreground">Email: intorza.com@gmail.com</p>
              <p className="text-muted-foreground">Website: www.intorza.com</p>
            </div>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">14. Compliance</h2>
            <p className="text-muted-foreground leading-relaxed">
              We comply with the Information Technology Act, 2000 and the Information Technology (Reasonable 
              Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011 of India. 
              We also strive to align our practices with international standards including GDPR principles where 
              applicable.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} INTORZA. All rights reserved. Your privacy is our priority.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
