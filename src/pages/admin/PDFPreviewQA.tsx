import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Download, RefreshCw, Check, AlertTriangle, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateQuotationPDF } from '@/lib/pdfGenerator';
import { generateInvoicePDF } from '@/lib/invoicePdfGenerator';

// Test configurations for different countries
const COUNTRY_CONFIGS = [
  {
    code: 'IN',
    name: 'India',
    locale: 'en-IN',
    currencyCode: 'INR',
    currencySymbol: '₹',
    taxLabel: 'GST',
    taxRate: 18,
    sampleAmounts: [164800, 45000, 12500, 789, 1000000],
  },
  {
    code: 'US',
    name: 'United States',
    locale: 'en-US',
    currencyCode: 'USD',
    currencySymbol: '$',
    taxLabel: 'Tax',
    taxRate: 8.5,
    sampleAmounts: [1648.00, 450.00, 125.50, 78.99, 10000.00],
  },
  {
    code: 'AE',
    name: 'UAE',
    locale: 'ar-AE',
    currencyCode: 'AED',
    currencySymbol: 'AED',
    taxLabel: 'VAT',
    taxRate: 5,
    sampleAmounts: [6050, 1650, 459, 290, 36750],
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    locale: 'en-GB',
    currencyCode: 'GBP',
    currencySymbol: '£',
    taxLabel: 'VAT',
    taxRate: 20,
    sampleAmounts: [1299.00, 350.00, 97.50, 62.99, 7800.00],
  },
  {
    code: 'EU',
    name: 'Europe (EUR)',
    locale: 'de-DE',
    currencyCode: 'EUR',
    currencySymbol: '€',
    taxLabel: 'VAT',
    taxRate: 19,
    sampleAmounts: [1499.00, 400.00, 112.50, 72.99, 9000.00],
  },
];

// Font options to test
const FONT_OPTIONS = [
  { id: 'helvetica', name: 'Helvetica' },
  { id: 'times', name: 'Times New Roman' },
  { id: 'courier', name: 'Courier' },
];

// Sample quotation data generator
const generateSampleQuotation = (countryConfig: typeof COUNTRY_CONFIGS[0]) => ({
  quotationId: 'QA-TEST-001',
  quotationTitle: 'Interior Design Project',
  clientName: 'John Doe',
  clientAddress: '123 Test Street, Sample City, Country 12345',
  dateOfProposal: new Date().toLocaleDateString(),
  quotationValidTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
  projectDeadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString(),
  placeOfProject: 'Sample Location',
  warranty: '5',
  projectType: 'Residential',
  sections: [
    {
      title: 'Kitchen Cabinets',
      items: [
        {
          side: 'North',
          productName: 'Premium Modular Kitchen',
          productDetails: 'Marine plywood with laminate finish',
          widthFt: 12.5,
          heightFt: 8.0,
          sftArea: 100.0,
          ratePerSft: countryConfig.sampleAmounts[0] / 100,
          amount: countryConfig.sampleAmounts[0],
        },
        {
          side: 'East',
          productName: 'Upper Cabinets',
          productDetails: 'Soft-close hinges, glass panels',
          widthFt: 8.0,
          heightFt: 3.5,
          sftArea: 28.0,
          ratePerSft: countryConfig.sampleAmounts[1] / 28,
          amount: countryConfig.sampleAmounts[1],
        },
      ],
    },
    {
      title: 'Wardrobes',
      items: [
        {
          side: 'Master Bedroom',
          productName: 'Walk-in Wardrobe',
          productDetails: 'Full height with accessories',
          widthFt: 10.0,
          heightFt: 9.0,
          sftArea: 90.0,
          ratePerSft: countryConfig.sampleAmounts[2] / 90,
          amount: countryConfig.sampleAmounts[2],
        },
      ],
    },
  ],
  subtotal: countryConfig.sampleAmounts[0] + countryConfig.sampleAmounts[1] + countryConfig.sampleAmounts[2],
  gstEnabled: true,
  gstRate: countryConfig.taxRate,
  discount: countryConfig.sampleAmounts[3],
  grandTotal: (countryConfig.sampleAmounts[0] + countryConfig.sampleAmounts[1] + countryConfig.sampleAmounts[2]) * (1 + countryConfig.taxRate / 100) - countryConfig.sampleAmounts[3],
  companyName: 'QA Test Company',
  companyAddress: '456 Business Park, Commerce City',
  companyPhone: '+1 234 567 8900',
  companyEmail: 'qa@testcompany.com',
  gstin: countryConfig.code === 'IN' ? '29AABCU9603R1ZM' : countryConfig.code === 'GB' ? 'GB123456789' : '',
  localization: {
    currencyCode: countryConfig.currencyCode,
    currencySymbol: countryConfig.currencySymbol,
    locale: countryConfig.locale,
    taxLabel: countryConfig.taxLabel,
    taxRegistrationLabel: countryConfig.code === 'IN' ? 'GSTIN' : countryConfig.code === 'GB' ? 'VAT No' : 'Tax ID',
    areaUnit: 'Square Feet',
    areaUnitShort: 'Sq.Ft',
    countryCode: countryConfig.code,
  },
  paymentStages: [
    { stage: '1', milestone: 'Booking', percentage: 20 },
    { stage: '2', milestone: 'Material Order', percentage: 40 },
    { stage: '3', milestone: 'Installation', percentage: 30 },
    { stage: '4', milestone: 'Handover', percentage: 10 },
  ],
  termsConditions: [
    {
      id: '1',
      title: 'Payment Terms',
      points: ['Payment as per agreed milestones', 'Delayed payments attract interest'],
    },
  ],
});

// Sample invoice data generator
const generateSampleInvoice = (countryConfig: typeof COUNTRY_CONFIGS[0]) => ({
  invoiceNumber: 'INV-QA-001',
  invoiceDate: new Date().toLocaleDateString(),
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
  clientName: 'Jane Smith',
  clientAddress: '789 Invoice Lane, Billing City',
  projectName: 'Office Renovation',
  totalAmount: countryConfig.sampleAmounts[4],
  paidAmount: countryConfig.sampleAmounts[4] * 0.4,
  remainingAmount: countryConfig.sampleAmounts[4] * 0.6,
  status: 'partial',
  notes: 'Thank you for your business!',
  payments: [
    {
      amount: countryConfig.sampleAmounts[4] * 0.4,
      payment_date: new Date().toLocaleDateString(),
      payment_method: 'Bank Transfer',
      notes: 'First payment received',
    },
  ],
  profile: {
    company_name: 'QA Test Company',
    full_name: 'Test User',
    address: '456 Business Park',
    phone: '+1 234 567 8900',
    email: 'qa@testcompany.com',
    gstin: countryConfig.code === 'IN' ? '29AABCU9603R1ZM' : '',
    bank_name: 'Test Bank',
    bank_account_number: '1234567890',
    bank_ifsc_code: 'TEST0001234',
    bank_account_holder: 'QA Test Company',
    upi_id: 'qa@testbank',
  },
  localization: {
    currencyCode: countryConfig.currencyCode,
    currencySymbol: countryConfig.currencySymbol,
    locale: countryConfig.locale,
    taxLabel: countryConfig.taxLabel,
    taxRegistrationLabel: countryConfig.code === 'IN' ? 'GSTIN' : countryConfig.code === 'GB' ? 'VAT No' : 'Tax ID',
    countryCode: countryConfig.code,
  },
});

interface TestResult {
  country: string;
  font: string;
  type: 'quotation' | 'invoice';
  status: 'pending' | 'success' | 'error';
  error?: string;
  pdfBlob?: Blob;
}

export default function PDFPreviewQA() {
  const navigate = useNavigate();
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CONFIGS[0].code);
  const [selectedFont, setSelectedFont] = useState('helvetica');
  const [isGenerating, setIsGenerating] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [activeTab, setActiveTab] = useState('single');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const countryConfig = COUNTRY_CONFIGS.find(c => c.code === selectedCountry) || COUNTRY_CONFIGS[0];

  // Generate single PDF for preview
  const handleGenerateSinglePDF = useCallback(async (type: 'quotation' | 'invoice') => {
    setIsGenerating(true);
    try {
      let pdfDoc: any;
      
      const editorSettings = {
        theme: 'minimal-white',
        fontFamily: selectedFont,
        headingFont: selectedFont,
        bodyFont: selectedFont,
        logoPlacement: 'left' as const,
        headerInfoColumns: 2 as const,
        headerLayout: 'unified' as const,
        highlightAmounts: true,
        showBorders: true,
        compactMode: false,
        fontSize: 'medium' as const,
        tableStyle: 'bordered' as const,
        headerStyle: 'simple' as const,
        sectionStyle: 'standard' as const,
        summaryStyle: 'right' as const,
        pageMargins: 'normal' as const,
        showDecorations: false,
        decorationIntensity: 'medium' as const,
        showPageBorder: false,
        showCornerOrnaments: false,
        showSectionDividers: false,
        useBrandColors: false,
      };

      if (type === 'quotation') {
        const data = generateSampleQuotation(countryConfig);
        pdfDoc = await generateQuotationPDF({
          ...data,
          editorSettings,
        });
      } else {
        const data = generateSampleInvoice(countryConfig);
        pdfDoc = await generateInvoicePDF({
          ...data,
          editorSettings,
        });
      }

      const blob = pdfDoc.output('blob');

      // Display in iframe
      const url = URL.createObjectURL(blob);
      if (iframeRef.current) {
        iframeRef.current.src = url;
      }
    } catch (error) {
      console.error('PDF generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [countryConfig, selectedFont]);

  // Run full test suite across all countries and fonts
  const handleRunFullTestSuite = useCallback(async () => {
    setIsGenerating(true);
    const results: TestResult[] = [];

    for (const country of COUNTRY_CONFIGS) {
      for (const font of FONT_OPTIONS) {
        for (const type of ['quotation', 'invoice'] as const) {
          try {
            const editorSettings = {
              theme: 'minimal-white',
              fontFamily: font.id,
              headingFont: font.id,
              bodyFont: font.id,
              logoPlacement: 'left' as const,
              headerInfoColumns: 2 as const,
              headerLayout: 'unified' as const,
              highlightAmounts: true,
              showBorders: true,
              compactMode: false,
              fontSize: 'medium' as const,
              tableStyle: 'bordered' as const,
              headerStyle: 'simple' as const,
              sectionStyle: 'standard' as const,
              summaryStyle: 'right' as const,
              pageMargins: 'normal' as const,
              showDecorations: false,
              decorationIntensity: 'medium' as const,
              showPageBorder: false,
              showCornerOrnaments: false,
              showSectionDividers: false,
              useBrandColors: false,
            };

            let pdfDoc: any;
            
            if (type === 'quotation') {
              const data = generateSampleQuotation(country);
              pdfDoc = await generateQuotationPDF({
                ...data,
                editorSettings,
              });
            } else {
              const data = generateSampleInvoice(country);
              pdfDoc = await generateInvoicePDF({
                ...data,
                editorSettings,
              });
            }

            const blob = pdfDoc.output('blob');

            results.push({
              country: country.name,
              font: font.name,
              type,
              status: 'success',
              pdfBlob: blob,
            });
          } catch (error) {
            results.push({
              country: country.name,
              font: font.name,
              type,
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }
    }

    setTestResults(results);
    setIsGenerating(false);
  }, []);

  // Download a specific test result
  const handleDownloadResult = (result: TestResult) => {
    if (result.pdfBlob) {
      const url = URL.createObjectURL(result.pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${result.type}-${result.country}-${result.font}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const successCount = testResults.filter(r => r.status === 'success').length;
  const errorCount = testResults.filter(r => r.status === 'error').length;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">PDF Preview QA</h1>
              <p className="text-muted-foreground">
                Test PDF generation across multiple countries, currencies, and fonts
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="single">Single Preview</TabsTrigger>
            <TabsTrigger value="suite">Full Test Suite</TabsTrigger>
          </TabsList>

          {/* Single Preview Tab */}
          <TabsContent value="single" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuration</CardTitle>
                <CardDescription>Select country and font to test PDF generation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Country / Locale</label>
                    <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRY_CONFIGS.map(country => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name} ({country.currencyCode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Font</label>
                    <Select value={selectedFont} onValueChange={setSelectedFont}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_OPTIONS.map(font => (
                          <SelectItem key={font.id} value={font.id}>
                            {font.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Generate</label>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleGenerateSinglePDF('quotation')}
                        disabled={isGenerating}
                        className="flex-1"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Quotation
                      </Button>
                      <Button 
                        onClick={() => handleGenerateSinglePDF('invoice')}
                        disabled={isGenerating}
                        variant="secondary"
                        className="flex-1"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Invoice
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Info badges */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <Badge variant="outline">Currency: {countryConfig.currencyCode}</Badge>
                  <Badge variant="outline">Tax: {countryConfig.taxLabel} @ {countryConfig.taxRate}%</Badge>
                  <Badge variant="outline">Locale: {countryConfig.locale}</Badge>
                  <Badge variant="outline">Sample Total: {countryConfig.sampleAmounts[4].toLocaleString()}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* PDF Preview */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">PDF Preview</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="bg-muted/50 border-t">
                  <iframe
                    ref={iframeRef}
                    className="w-full h-[700px]"
                    title="PDF Preview"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Full Test Suite Tab */}
          <TabsContent value="suite" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Full Test Suite</CardTitle>
                    <CardDescription>
                      Run PDF generation across all {COUNTRY_CONFIGS.length} countries × {FONT_OPTIONS.length} fonts × 2 document types
                      = {COUNTRY_CONFIGS.length * FONT_OPTIONS.length * 2} total tests
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={handleRunFullTestSuite} 
                    disabled={isGenerating}
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Run All Tests
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              
              {testResults.length > 0 && (
                <CardContent>
                  {/* Summary */}
                  <div className="flex gap-4 mb-6">
                    <Badge variant="default" className="text-lg px-4 py-2">
                      <Check className="h-4 w-4 mr-2" />
                      {successCount} Passed
                    </Badge>
                    {errorCount > 0 && (
                      <Badge variant="destructive" className="text-lg px-4 py-2">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        {errorCount} Failed
                      </Badge>
                    )}
                  </div>

                  {/* Results Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 font-medium">Country</th>
                          <th className="text-left p-3 font-medium">Font</th>
                          <th className="text-left p-3 font-medium">Type</th>
                          <th className="text-center p-3 font-medium">Status</th>
                          <th className="text-right p-3 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {testResults.map((result, idx) => (
                          <tr key={idx} className="hover:bg-muted/50">
                            <td className="p-3">{result.country}</td>
                            <td className="p-3">{result.font}</td>
                            <td className="p-3 capitalize">{result.type}</td>
                            <td className="p-3 text-center">
                              {result.status === 'success' ? (
                                <Badge variant="default" className="bg-green-500">
                                  <Check className="h-3 w-3 mr-1" />
                                  Pass
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Fail
                                </Badge>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              {result.status === 'success' && result.pdfBlob && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleDownloadResult(result)}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </Button>
                              )}
                              {result.error && (
                                <span className="text-destructive text-xs">{result.error}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
