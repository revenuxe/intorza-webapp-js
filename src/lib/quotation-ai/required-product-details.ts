/** Render requirements as quotation text, rather than instructions to the AI. */
export function requiredProductDetails(requirement: string, proposed = '') {
  const clean = requirement.replace(/^\s*User requirement:\s*/i, '')
    .replace(/\s+(?:as per|according to)\s+(?:the\s+)?(?:customer'?s?|user'?s?)\s+request\.?/gi, '')
    .replace(/\bshould be arranged in\b/gi, 'in')
    .replace(/\bshould be\b/gi, '')
    .replace(/\s+/g, ' ').trim();
  // Only reuse model specifications when the requirement is exclusively a
  // layout instruction. Material/brand/hardware requests remain authoritative.
  const shape = clean.match(/\b[ulg][- ]shaped\b/i)?.[0];
  const remainder = shape ? clean.replace(/\b[ulg][- ]shaped\b/gi, '')
    .replace(/\b(?:base|wall|tall|cabinets?|units?|kitchen|layout|design|arranged|in|a|an|the|with|for|should|be|required|requested)\b/gi, '')
    .replace(/[^a-z0-9]/gi, '') : clean;
  const layoutOnly = Boolean(shape && !remainder);
  const layout = shape ? `${shape[0].toUpperCase()}${shape.slice(1).toLowerCase()} layout` : '';
  const description = layoutOnly && proposed.trim() && !/^User requirement:/i.test(proposed.trim())
    ? (proposed.toLowerCase().includes(shape!.toLowerCase()) ? proposed : `${layout}. ${proposed}`)
    : clean;
  return { description: description.trim().slice(0, 1000), preserveSpecifications: layoutOnly };
}
