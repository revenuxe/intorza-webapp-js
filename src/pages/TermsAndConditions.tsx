import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const TermsAndConditions = () => {
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
          <h1 className="text-3xl font-bold text-foreground">Terms and Conditions</h1>
          <p className="text-muted-foreground mt-2">Last updated: December 9, 2024</p>
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Agreement to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using INTORZA ("the Service"), you agree to be bound by these Terms and Conditions. 
              If you disagree with any part of these terms, you may not access the Service. These Terms apply to 
              all visitors, users, and others who access or use the Service.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              INTORZA is a professional business management platform designed for interior designers and contractors. 
              The Service provides tools for:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Creating and managing quotations</li>
              <li>Generating professional invoices</li>
              <li>Site measurement documentation</li>
              <li>Client management</li>
              <li>Team and project management</li>
              <li>Payment tracking and financial reporting</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">3. User Accounts</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">3.1 Account Creation</h3>
                <p className="text-muted-foreground leading-relaxed">
                  To use certain features of the Service, you must register for an account. You agree to provide 
                  accurate, current, and complete information during registration and to update such information 
                  to keep it accurate, current, and complete.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">3.2 Account Security</h3>
                <p className="text-muted-foreground leading-relaxed">
                  You are responsible for safeguarding the password that you use to access the Service and for 
                  any activities or actions under your password. You must notify us immediately upon becoming 
                  aware of any breach of security or unauthorized use of your account.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">3.3 Account Termination</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to terminate or suspend your account immediately, without prior notice or 
                  liability, for any reason whatsoever, including without limitation if you breach the Terms.
                </p>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">4. User Responsibilities</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">You agree to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Use the Service only for lawful purposes and in accordance with these Terms</li>
              <li>Not use the Service in any way that violates any applicable laws or regulations</li>
              <li>Not transmit any malicious code, viruses, or harmful software</li>
              <li>Not attempt to gain unauthorized access to any portion of the Service</li>
              <li>Not interfere with or disrupt the integrity or performance of the Service</li>
              <li>Maintain the confidentiality of your account credentials</li>
              <li>Be solely responsible for all data and content you upload to the Service</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Intellectual Property Rights</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">5.1 Service Content</h3>
                <p className="text-muted-foreground leading-relaxed">
                  The Service and its original content, features, and functionality are owned by INTORZA and 
                  are protected by international copyright, trademark, patent, trade secret, and other 
                  intellectual property laws.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">5.2 User Content</h3>
                <p className="text-muted-foreground leading-relaxed">
                  You retain ownership of all content you submit to the Service. By uploading content, you 
                  grant INTORZA a non-exclusive, worldwide, royalty-free license to use, store, and process 
                  that content solely for the purpose of providing the Service.
                </p>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Data and Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your use of the Service is also governed by our Privacy Policy. By using the Service, you consent 
              to the collection and use of information as detailed in our Privacy Policy. We are committed to 
              protecting your personal and business data with industry-standard security measures.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Payment Terms</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">7.1 Subscription Fees</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Certain features of the Service may require payment. You agree to pay all fees associated 
                  with your chosen plan. All payments are non-refundable unless otherwise specified.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">7.2 Billing</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We will bill you through an online billing account for use of the Service. You agree to pay 
                  all charges at the prices then in effect for your purchases, and you authorize us to charge 
                  your chosen payment provider for any such amounts upon placing your order.
                </p>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">8. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              IN NO EVENT SHALL INTORZA, ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, SUPPLIERS, OR AFFILIATES 
              BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING 
              WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mt-4">
              <li>Your access to or use of or inability to access or use the Service</li>
              <li>Any conduct or content of any third party on the Service</li>
              <li>Any content obtained from the Service</li>
              <li>Unauthorized access, use, or alteration of your transmissions or content</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">9. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. INTORZA EXPRESSLY DISCLAIMS ALL 
              WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE IMPLIED 
              WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">10. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to defend, indemnify, and hold harmless INTORZA and its licensees, licensors, employees, 
              contractors, agents, officers, and directors from and against any and all claims, damages, 
              obligations, losses, liabilities, costs or debt, and expenses arising from your use of the Service 
              or violation of these Terms.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">11. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed and construed in accordance with the laws of India, without regard 
              to its conflict of law provisions. Any disputes arising from these Terms shall be subject to the 
              exclusive jurisdiction of the courts in Bangalore, Karnataka, India.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">12. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify or replace these Terms at any time. If a revision is material, 
              we will try to provide at least 30 days notice prior to any new terms taking effect. What 
              constitutes a material change will be determined at our sole discretion. By continuing to access 
              or use our Service after those revisions become effective, you agree to be bound by the revised terms.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">13. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-foreground font-medium">INTORZA</p>
              <p className="text-muted-foreground">Email: intorza.com@gmail.com</p>
              <p className="text-muted-foreground">Website: www.intorza.com</p>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} INTORZA. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
