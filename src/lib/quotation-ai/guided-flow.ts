import { applyOperations, reviewDraft, type Operation, type VoiceDraft } from './domain';
import { isEnglishScript } from './english-output';

export type GuidedStep = 'clientName' | 'projectTitle' | 'clientAddress' | 'placeOfProject' | 'projectType' | 'sectionChoice' | 'sectionName' | 'productName' | 'productDetails' | 'side' | 'measurementMode' | 'widthFt' | 'heightFt' | 'sftArea' | 'ratePerSft' | 'addItem' | 'addSection' | 'gstEnabled' | 'gstRate' | 'discountMode' | 'discountPercentage' | 'socialMediaDiscountRate' | 'review';
export type GuidedState = { step: GuidedStep; sectionId?: string; itemId?: string };
type Prompt = { label: string; english: string; hindi: string; optional?: boolean; numeric?: boolean; choices?: { value: string; label: string }[] };
const yesNo = [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }];
export const guidedPrompts: Record<GuidedStep, Prompt> = {
  clientName: { label: 'Customer name', english: 'Please type the customer name here.', hindi: 'अब यहाँ ग्राहक का नाम टाइप कीजिए।' },
  projectTitle: { label: 'Quotation title', english: 'What should we call this quotation?', hindi: 'इस कोटेशन का नाम टाइप कीजिए।' },
  clientAddress: { label: 'Customer address', english: 'Enter the customer address, or skip.', hindi: 'ग्राहक का पता टाइप कीजिए, या स्किप कीजिए।', optional: true },
  placeOfProject: { label: 'Project location', english: 'Where is the project located?', hindi: 'काम कहाँ होना है? जगह का नाम टाइप कीजिए।', optional: true },
  projectType: { label: 'Project type', english: 'Enter the project type, for example residential.', hindi: 'प्रोजेक्ट का प्रकार टाइप कीजिए, जैसे रेजिडेंशियल।', optional: true },
  sectionChoice: { label: 'Choose a section', english: 'Choose an existing section or create a new one.', hindi: 'एक सेक्शन चुनिए, या नया सेक्शन बनाइए।' },
  sectionName: { label: 'Section name', english: 'Type the section name, for example Bedroom.', hindi: 'सेक्शन का नाम टाइप कीजिए, जैसे बेडरूम।' },
  productName: { label: 'Product name', english: 'Type the product or work item name.', hindi: 'अब प्रोडक्ट या काम का नाम टाइप कीजिए।' },
  productDetails: { label: 'Product details', english: 'Enter material, finish or other product details, or skip.', hindi: 'मटेरियल और फिनिश की जानकारी टाइप कीजिए, या स्किप कीजिए।', optional: true },
  side: { label: 'Side / position', english: 'Enter the side or position, or skip.', hindi: 'साइड या जगह की जानकारी टाइप कीजिए, या स्किप कीजिए।', optional: true },
  measurementMode: { label: 'Measurement method', english: 'Will you enter width and height, or the area directly?', hindi: 'चौड़ाई और ऊँचाई डालनी है, या सीधे वर्ग फुट में एरिया?', choices: [{ value: 'dimensions', label: 'Width × height (feet)' }, { value: 'direct_area', label: 'Area (sq ft)' }] },
  widthFt: { label: 'Width (feet)', english: 'Enter the width in feet. Six feet six inches is 6.5 feet.', hindi: 'चौड़ाई फीट में टाइप कीजिए। छह फीट छह इंच के लिए छह दशमलव पाँच डालिए।', numeric: true },
  heightFt: { label: 'Height (feet)', english: 'Enter the height in feet.', hindi: 'ऊँचाई फीट में टाइप कीजिए।', numeric: true },
  sftArea: { label: 'Billable area (sq ft)', english: 'Enter the item area in square feet.', hindi: 'इस आइटम का एरिया वर्ग फुट में टाइप कीजिए।', numeric: true },
  ratePerSft: { label: 'Rate per sq ft', english: 'Enter the price per square foot, not the total price.', hindi: 'प्रति वर्ग फुट का रेट टाइप कीजिए, कुल कीमत नहीं।', numeric: true },
  addItem: { label: 'Another item?', english: 'Would you like another item in this section?', hindi: 'क्या इस सेक्शन में एक और आइटम जोड़ना है?', choices: yesNo },
  addSection: { label: 'Another section?', english: 'Would you like to add another section?', hindi: 'क्या एक और सेक्शन जोड़ना है?', choices: yesNo },
  gstEnabled: { label: 'Apply GST?', english: 'Should GST be included?', hindi: 'क्या जी एस टी जोड़ना है?', choices: yesNo },
  gstRate: { label: 'GST (%)', english: 'Enter the GST percentage.', hindi: 'जी एस टी कितने प्रतिशत रखना है? टाइप कीजिए।', numeric: true },
  discountMode: { label: 'Discount type', english: 'Choose no discount, a standard discount, or a social media discount.', hindi: 'डिस्काउंट चुनिए: नहीं, सामान्य डिस्काउंट, या सोशल मीडिया डिस्काउंट।', choices: [{ value: 'none', label: 'No discount' }, { value: 'standard', label: 'Standard discount' }, { value: 'social', label: 'Social media discount' }] },
  discountPercentage: { label: 'Discount (%)', english: 'How much discount, as a percentage?', hindi: 'कितने प्रतिशत डिस्काउंट देना है? टाइप कीजिए।', numeric: true },
  socialMediaDiscountRate: { label: 'Social media discount (%)', english: 'Enter the social media discount percentage.', hindi: 'सोशल मीडिया डिस्काउंट कितने प्रतिशत देना है? टाइप कीजिए।', numeric: true },
  review: { label: 'Review quotation', english: 'Your quotation details are ready. Review the fields, apply pricing, and check terms before saving.', hindi: 'कोटेशन की जानकारी तैयार है। नीचे जानकारी और शर्तें जाँचिए, प्राइसिंग लागू कीजिए, फिर सेव कीजिए।' },
};
const projectSteps = ['clientName', 'projectTitle', 'clientAddress', 'placeOfProject', 'projectType'] as const;
export function guidedDefault(state: GuidedState, draft: VoiceDraft): string {
  const english = (value: string) => isEnglishScript(value) ? value : '';
  if (projectSteps.some(step => step === state.step)) return english(draft.project[state.step as typeof projectSteps[number]]);
  if (state.step === 'sectionName' && state.sectionId) return english(draft.sections.find(section => section.id === state.sectionId)?.title || '');
  const item = draft.sections.flatMap(section => section.items).find(item => item.id === state.itemId);
  if (item && state.step in item) return english(String(item[state.step as keyof typeof item] ?? ''));
  if (state.step === 'gstRate' || state.step === 'discountPercentage' || state.step === 'socialMediaDiscountRate') return String(draft.pricing[state.step]);
  return '';
}
function repairMissingItem(draft: VoiceDraft): GuidedState | null {
  for (const section of draft.sections) {
    if (!isEnglishScript(section.title)) return { step: 'sectionName', sectionId: section.id };
    for (const item of section.items) {
    const context = { sectionId: section.id, itemId: item.id };
    if (!item.productName.trim() || !isEnglishScript(item.productName)) return { ...context, step: 'productName' };
    if (!isEnglishScript(item.productDetails)) return { ...context, step: 'productDetails' };
    if (!isEnglishScript(item.side)) return { ...context, step: 'side' };
    if (item.measurementMode === 'dimensions') {
      if (item.widthFt == null) return { ...context, step: 'widthFt' };
      if (item.heightFt == null) return { ...context, step: 'heightFt' };
    } else if (item.sftArea == null) return { ...context, step: 'sftArea' };
    if (item.ratePerSft == null) return { ...context, step: 'ratePerSft' };
    }
  }
  return null;
}
export function advanceGuided(state: GuidedState, before: VoiceDraft, answer: string, makeId?: () => string) {
  const step = state.step; const prompt = guidedPrompts[step]; const value = answer.trim();
  if (step === 'review') return { state, draft: before, changed: false };
  if (!prompt.optional && !value) throw new Error(`Enter ${prompt.label.toLowerCase()} to continue.`);
  if (!isEnglishScript(value)) throw new Error('Type quotation text in English letters, even when the spoken language is Hindi.');
  if (prompt.choices && !prompt.choices.some(choice => choice.value === value)) throw new Error('Choose one of the displayed options.');
  const operations: Operation[] = []; let next: GuidedState = { ...state };
  const move = (step: GuidedStep) => { next.step = step; };
  const itemField = (fields: Record<string, unknown>) => operations.push({ type: 'update_item', itemId: state.itemId!, fields } as Operation);
  const price = (fields: Record<string, unknown>) => operations.push({ type: 'propose_pricing', fields } as Operation);
  if (projectSteps.some(field => field === step)) {
    operations.push({ type: 'update_project', fields: { [step]: value } });
    const index = projectSteps.indexOf(step as typeof projectSteps[number]);
    move(projectSteps[index + 1] || 'sectionChoice');
  } else if (step === 'sectionChoice') {
    if (value === 'new') { next = { step: 'sectionName' }; }
    else if (before.sections.some(section => section.id === value && section.title.trim())) next = { step: 'productName', sectionId: value };
    else throw new Error('Choose an existing section or create a new one.');
  } else if (step === 'sectionName') {
    const empty = state.sectionId ? before.sections.find(section => section.id === state.sectionId) : before.sections.find(section => !section.title.trim() && !section.items.length);
    operations.push(empty ? { type: 'update_section', sectionId: empty.id, title: value } : { type: 'add_section', title: value });
    next = { step: state.sectionId ? 'addSection' : 'productName', sectionId: empty?.id };
  } else if (step === 'productName') {
    if (state.itemId) itemField({ productName: value });
    else operations.push({ type: 'add_item', sectionId: state.sectionId!, fields: { productName: value, productDetails: '', side: '', measurementMode: 'dimensions', widthFt: null, heightFt: null, sftArea: null, ratePerSft: null } });
    move('productDetails');
  } else if (step === 'productDetails' || step === 'side') { itemField({ [step]: value }); move(step === 'productDetails' ? 'side' : 'measurementMode'); }
  else if (step === 'measurementMode') {
    if (value !== 'dimensions' && value !== 'direct_area') throw new Error('Choose a measurement method.');
    itemField({ measurementMode: value }); move(value === 'dimensions' ? 'widthFt' : 'sftArea');
  } else if (prompt.numeric) {
    const clean = value.replace(/,/g, '');
    if (!/^(?:\d+\.?\d*|\.\d+)$/.test(clean)) throw new Error('Enter a valid number, using decimals where needed.');
    const number = Number(clean); if (!Number.isFinite(number)) throw new Error('Enter a finite number.');
    if (step === 'gstRate' || step === 'discountPercentage' || step === 'socialMediaDiscountRate') {
      if (number < 0 || number > 100) throw new Error('Percentage must be between 0 and 100.');
      price({ [step]: number }); move(step === 'gstRate' ? 'discountMode' : 'review');
    } else {
      if (number < 0 || (step !== 'ratePerSft' && number === 0)) throw new Error('Measurements must be greater than zero.');
      itemField({ [step]: number }); move(step === 'widthFt' ? 'heightFt' : step === 'ratePerSft' ? 'addItem' : 'ratePerSft');
    }
  } else if (step === 'addItem') next = value === 'yes' ? { step: 'productName', sectionId: state.sectionId } : { step: 'addSection' };
  else if (step === 'addSection') next = value === 'yes' ? { step: 'sectionChoice' } : repairMissingItem(before) || { step: before.sections.some(section => section.items.length) ? 'gstEnabled' : 'sectionChoice' };
  else if (step === 'gstEnabled') { price({ gstEnabled: value === 'yes' }); move(value === 'yes' ? 'gstRate' : 'discountMode'); }
  else if (step === 'discountMode') {
    if (!['none', 'standard', 'social'].includes(value)) throw new Error('Choose a discount type.');
    price({ enableSocialMediaDiscount: value === 'social', ...(value === 'none' ? { discountPercentage: 0 } : {}) });
    move(value === 'standard' ? 'discountPercentage' : value === 'social' ? 'socialMediaDiscountRate' : 'review');
  }
  const draft = operations.length ? applyOperations(before, operations, makeId) : before;
  if (step === 'sectionName' && !next.sectionId) next.sectionId = draft.sections.at(-1)!.id;
  if (step === 'productName' && !next.itemId) next.itemId = draft.sections.find(section => section.id === next.sectionId)!.items.at(-1)!.id;
  if (next.step === 'review' && reviewDraft(draft).missing.length) throw new Error('Some required details are still missing. Review the fields before finishing.');
  return { state: next, draft, changed: operations.length > 0 };
}
