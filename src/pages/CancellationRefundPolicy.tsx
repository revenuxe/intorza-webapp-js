import { useEffect } from "react";
import { ArrowLeft, RefreshCw, Clock, CreditCard, AlertCircle, CheckCircle, XCircle, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";

const CancellationRefundPolicy = () => {
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
          <h1 className="text-3xl font-bold text-foreground">Cancellation & Refund Policy</h1>
          <p className="text-muted-foreground mt-2">Last updated: December 12, 2024</p>
        </div>

        {/* Trust Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-primary/20">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <RefreshCw className="h-8 w-8 text-primary mb-2" />
              <p className="text-xs font-medium text-foreground">Easy Refunds</p>
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <Clock className="h-8 w-8 text-primary mb-2" />
              <p className="text-xs font-medium text-foreground">Quick Process</p>
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <CreditCard className="h-8 w-8 text-primary mb-2" />
              <p className="text-xs font-medium text-foreground">Secure Payment</p>
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <CheckCircle className="h-8 w-8 text-primary mb-2" />
              <p className="text-xs font-medium text-foreground">Transparent</p>
            </CardContent>
          </Card>
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              At INTORZA, we strive to provide you with the best possible service. We understand that circumstances 
              may change, and you may need to cancel your subscription or request a refund. This Cancellation & 
              Refund Policy outlines the terms and conditions under which cancellations and refunds are processed.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <XCircle className="h-5 w-5 text-primary" />
              2. Cancellation Policy
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">2.1 Subscription Cancellation</h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  You may cancel your INTORZA subscription at any time through your account settings or by 
                  contacting our support team. Please note:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Cancellations take effect at the end of the current billing period</li>
                  <li>You will retain access to all features until the billing period ends</li>
                  <li>No partial refunds are provided for unused days within a billing period</li>
                  <li>Your data will be retained for 30 days after cancellation for account recovery</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">2.2 Project Cancellation</h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  For interior design project-related cancellations managed through our platform:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Cancellation requests must be submitted in writing via email</li>
                  <li>Cancellation is subject to the terms agreed upon between you and your clients</li>
                  <li>Work completed prior to cancellation will be charged accordingly</li>
                  <li>Materials already ordered or custom-made items are non-refundable</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">2.3 How to Cancel</h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  To cancel your subscription or services:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Go to Settings → Account → Cancel Subscription</li>
                  <li>Or send an email to intorza.com@gmail.com with subject "Cancellation Request"</li>
                  <li>Include your registered email address and reason for cancellation</li>
                  <li>You will receive confirmation within 24-48 business hours</li>
                </ul>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              3. Refund Policy
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">3.1 Eligibility for Refunds</h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Refunds may be granted under the following circumstances:
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="bg-green-500/10 border-green-500/30">
                    <CardContent className="p-4">
                      <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Eligible for Refund
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Service not provided as described</li>
                        <li>• Technical issues preventing service use</li>
                        <li>• Duplicate charges or billing errors</li>
                        <li>• Cancellation within 7-day trial period</li>
                        <li>• Service unavailability for extended periods</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-500/10 border-red-500/30">
                    <CardContent className="p-4">
                      <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        Not Eligible for Refund
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Change of mind after trial period</li>
                        <li>• Failure to cancel before renewal</li>
                        <li>• Violation of terms of service</li>
                        <li>• Services already rendered</li>
                        <li>• Custom development work completed</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">3.2 Refund Timeline</h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Once a refund is approved:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li><strong>Processing Time:</strong> Refunds are processed within 7-10 business days</li>
                  <li><strong>Credit Card Refunds:</strong> May take 5-10 additional days to reflect in your account</li>
                  <li><strong>Bank Transfer Refunds:</strong> May take 7-14 business days depending on your bank</li>
                  <li><strong>UPI Refunds:</strong> Typically processed within 2-5 business days</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">3.3 Refund Amount</h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  The refund amount depends on the circumstances:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li><strong>Full Refund:</strong> Within 7-day trial period or for billing errors</li>
                  <li><strong>Pro-rated Refund:</strong> For service issues after partial use</li>
                  <li><strong>Partial Refund:</strong> Deducting costs for services already rendered</li>
                  <li><strong>Credit Refund:</strong> Service credits for future use (when applicable)</li>
                </ul>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              4. Refund Request Process
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              To request a refund, please follow these steps:
            </p>
            <div className="space-y-4">
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-semibold">1</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Submit Request</h4>
                      <p className="text-sm text-muted-foreground">
                        Send an email to intorza.com@gmail.com with subject "Refund Request" including your 
                        account email, transaction ID, and reason for refund.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-semibold">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Review Process</h4>
                      <p className="text-sm text-muted-foreground">
                        Our team will review your request within 48 business hours and may contact you 
                        for additional information if needed.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-semibold">3</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Decision & Processing</h4>
                      <p className="text-sm text-muted-foreground">
                        You will receive an email notification about the decision. If approved, the refund 
                        will be processed to your original payment method.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-semibold">4</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Confirmation</h4>
                      <p className="text-sm text-muted-foreground">
                        Once the refund is processed, you will receive a confirmation email with the 
                        refund details and expected timeline.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              5. Special Circumstances
            </h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">5.1 Force Majeure</h3>
                <p className="text-muted-foreground leading-relaxed">
                  In cases of force majeure events (natural disasters, pandemics, government actions, etc.) that 
                  prevent service delivery, we will work with you to find an appropriate solution, which may 
                  include full or partial refunds, service credits, or extended subscription periods.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">5.2 Service Outages</h3>
                <p className="text-muted-foreground leading-relaxed">
                  For extended service outages lasting more than 24 consecutive hours, you may be eligible for 
                  service credits proportional to the outage duration. Please contact support with your request.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">5.3 Disputed Charges</h3>
                <p className="text-muted-foreground leading-relaxed">
                  If you believe there has been an unauthorized charge or billing error, please contact us 
                  immediately. We take billing disputes seriously and will investigate all claims promptly.
                </p>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              6. Payment Methods & Refunds
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Refunds are processed to the original payment method used:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Credit/Debit Cards:</strong> Refunded to the same card used for payment</li>
              <li><strong>Bank Transfer:</strong> Refunded to the originating bank account</li>
              <li><strong>UPI:</strong> Refunded to the linked UPI account</li>
              <li><strong>Net Banking:</strong> Refunded to the source bank account</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              In cases where the original payment method is no longer valid, we may request alternative 
              bank details for processing the refund.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Non-Refundable Items</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The following are not eligible for refunds under any circumstances:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Custom development or integration work already completed</li>
              <li>Data migration services already performed</li>
              <li>Training sessions already conducted</li>
              <li>One-time setup fees</li>
              <li>Third-party service fees passed through our platform</li>
              <li>Services terminated due to terms of service violation</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              8. Contact Us
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about our Cancellation & Refund Policy or need assistance with a 
              cancellation or refund request, please contact us:
            </p>
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-foreground font-medium">INTORZA - Customer Support</p>
              <p className="text-muted-foreground">Email: intorza.com@gmail.com</p>
              <p className="text-muted-foreground">Website: www.intorza.com</p>
              <p className="text-muted-foreground mt-2 text-sm">
                Response Time: Within 24-48 business hours
              </p>
            </div>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">9. Policy Updates</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify this Cancellation & Refund Policy at any time. Any changes will be 
              effective immediately upon posting on this page. We will notify users of significant changes via 
              email. Your continued use of the Service after any changes indicates your acceptance of the 
              updated policy.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} INTORZA. All rights reserved. Customer satisfaction is our priority.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CancellationRefundPolicy;
