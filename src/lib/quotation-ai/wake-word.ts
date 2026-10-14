// Require a wake call rather than matching incidental words inside a sentence.
export function isOrzaWakeCall(text: string) {
  const normalized = text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{M}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  return /^(?:(?:hey|hello|okay|ok|हेलो|हे) )?(?:orza|or za|ओरज़ा|ओर्जा|ओरजा|ओरज़ा)(?: (?:resume|continue|start|suno|सुनो|चलो))?$/.test(normalized);
}
