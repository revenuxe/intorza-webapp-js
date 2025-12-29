import jsPDF from 'jspdf';
import { PDFTheme, PDFEditorSettings, ThemeDecorations } from './pdfThemes';

type RGB = [number, number, number];

// Get decoration colors from theme
export const getDecorationColors = (theme: PDFTheme): { primary: RGB; secondary: RGB } => {
  return {
    primary: theme.colors.decorationPrimary || theme.colors.accent,
    secondary: theme.colors.decorationSecondary || theme.colors.secondary,
  };
};

// Get decoration intensity multiplier
const getIntensityMultiplier = (intensity: PDFEditorSettings['decorationIntensity']): number => {
  switch (intensity) {
    case 'subtle': return 0.6;
    case 'bold': return 1.4;
    default: return 1;
  }
};

// Draw page border with various styles
export const drawPageBorder = (
  doc: jsPDF,
  theme: PDFTheme,
  editorSettings: PDFEditorSettings
): void => {
  if (!editorSettings.showDecorations || !editorSettings.showPageBorder) return;
  
  const decorations = theme.decorations;
  const colors = getDecorationColors(theme);
  const intensity = getIntensityMultiplier(editorSettings.decorationIntensity);
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const inset = decorations.pageBorderInset;
  const borderWidth = decorations.borderWidth * intensity;
  
  doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.setLineWidth(borderWidth);
  
  switch (decorations.borderStyle) {
    case 'double':
      // Outer border
      doc.rect(inset, inset, pageWidth - (inset * 2), pageHeight - (inset * 2));
      // Inner border
      doc.setLineWidth(borderWidth * 0.5);
      doc.rect(inset + 3, inset + 3, pageWidth - (inset * 2) - 6, pageHeight - (inset * 2) - 6);
      break;
      
    case 'triple':
      // Three concentric borders
      doc.rect(inset, inset, pageWidth - (inset * 2), pageHeight - (inset * 2));
      doc.setLineWidth(borderWidth * 0.6);
      doc.rect(inset + 2, inset + 2, pageWidth - (inset * 2) - 4, pageHeight - (inset * 2) - 4);
      doc.setLineWidth(borderWidth * 0.3);
      doc.rect(inset + 5, inset + 5, pageWidth - (inset * 2) - 10, pageHeight - (inset * 2) - 10);
      break;
      
    case 'elegant':
      // Elegant border with corner accents
      doc.rect(inset, inset, pageWidth - (inset * 2), pageHeight - (inset * 2));
      // Inner decorative line
      doc.setLineWidth(borderWidth * 0.4);
      doc.setDrawColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      const elegantInner = 4;
      doc.line(inset + elegantInner + 10, inset + elegantInner, pageWidth - inset - elegantInner - 10, inset + elegantInner);
      doc.line(inset + elegantInner + 10, pageHeight - inset - elegantInner, pageWidth - inset - elegantInner - 10, pageHeight - inset - elegantInner);
      doc.line(inset + elegantInner, inset + elegantInner + 10, inset + elegantInner, pageHeight - inset - elegantInner - 10);
      doc.line(pageWidth - inset - elegantInner, inset + elegantInner + 10, pageWidth - inset - elegantInner, pageHeight - inset - elegantInner - 10);
      break;
      
    case 'chain':
      // Chain-like border pattern
      doc.rect(inset, inset, pageWidth - (inset * 2), pageHeight - (inset * 2));
      const chainSpacing = 6;
      doc.setLineWidth(borderWidth * 0.3);
      // Top chain
      for (let cx = inset + chainSpacing; cx < pageWidth - inset - chainSpacing; cx += chainSpacing) {
        doc.circle(cx, inset + 2, 1.2, 'S');
      }
      // Bottom chain
      for (let cx = inset + chainSpacing; cx < pageWidth - inset - chainSpacing; cx += chainSpacing) {
        doc.circle(cx, pageHeight - inset - 2, 1.2, 'S');
      }
      break;
      
    case 'zigzag':
      // Zigzag pattern border
      doc.rect(inset, inset, pageWidth - (inset * 2), pageHeight - (inset * 2));
      doc.setLineWidth(borderWidth * 0.4);
      const zigSpacing = 4;
      const zigHeight = 2;
      // Top zigzag
      let zigStart = inset + 5;
      while (zigStart < pageWidth - inset - 10) {
        doc.line(zigStart, inset + 3, zigStart + zigSpacing/2, inset + 3 + zigHeight);
        doc.line(zigStart + zigSpacing/2, inset + 3 + zigHeight, zigStart + zigSpacing, inset + 3);
        zigStart += zigSpacing;
      }
      break;
      
    case 'rope':
      // Rope-style twisted border
      doc.rect(inset, inset, pageWidth - (inset * 2), pageHeight - (inset * 2));
      doc.setLineWidth(borderWidth * 0.3);
      doc.setLineDashPattern([2, 2], 0);
      doc.rect(inset + 1.5, inset + 1.5, pageWidth - (inset * 2) - 3, pageHeight - (inset * 2) - 3);
      doc.setLineDashPattern([2, 2], 2);
      doc.rect(inset + 1.5, inset + 1.5, pageWidth - (inset * 2) - 3, pageHeight - (inset * 2) - 3);
      doc.setLineDashPattern([], 0);
      break;
      
    case 'dashed':
      doc.setLineDashPattern([4, 2], 0);
      doc.rect(inset, inset, pageWidth - (inset * 2), pageHeight - (inset * 2));
      doc.setLineDashPattern([], 0);
      break;
      
    case 'dotted':
      doc.setLineDashPattern([1, 1], 0);
      doc.rect(inset, inset, pageWidth - (inset * 2), pageHeight - (inset * 2));
      doc.setLineDashPattern([], 0);
      break;
      
    case 'ornate':
      // Main border
      doc.rect(inset, inset, pageWidth - (inset * 2), pageHeight - (inset * 2));
      // Decorative inner line
      doc.setLineWidth(borderWidth * 0.3);
      doc.setDrawColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      doc.rect(inset + 2, inset + 2, pageWidth - (inset * 2) - 4, pageHeight - (inset * 2) - 4);
      break;
      
    default: // solid
      doc.rect(inset, inset, pageWidth - (inset * 2), pageHeight - (inset * 2));
  }
};

// Draw corner ornaments
export const drawCornerOrnaments = (
  doc: jsPDF,
  theme: PDFTheme,
  editorSettings: PDFEditorSettings
): void => {
  if (!editorSettings.showDecorations || !editorSettings.showCornerOrnaments) return;
  if (!theme.decorations.showCornerOrnaments) return;
  
  const decorations = theme.decorations;
  const colors = getDecorationColors(theme);
  const intensity = getIntensityMultiplier(editorSettings.decorationIntensity);
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const inset = decorations.pageBorderInset + 2;
  const size = 12 * intensity;
  const lineWidth = 0.8 * intensity;
  
  doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.setLineWidth(lineWidth);
  
  const drawCorner = (x: number, y: number, flipX: boolean, flipY: boolean) => {
    const dx = flipX ? -1 : 1;
    const dy = flipY ? -1 : 1;
    
    switch (decorations.cornerStyle) {
      case 'floral':
        // Curved floral corner with petals
        doc.line(x, y, x + (size * dx), y);
        doc.line(x, y, x, y + (size * dy));
        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.circle(x + (4 * dx), y + (4 * dy), 1.5, 'F');
        doc.circle(x + (8 * dx), y + (2 * dy), 1, 'F');
        doc.circle(x + (2 * dx), y + (8 * dy), 1, 'F');
        doc.circle(x + (6 * dx), y + (6 * dy), 0.8, 'F');
        break;
        
      case 'flourish':
        // Elegant flourish with curves
        doc.line(x, y, x + (size * dx), y);
        doc.line(x, y, x, y + (size * dy));
        doc.setLineWidth(lineWidth * 0.7);
        doc.line(x + (size * dx), y, x + (size * dx) - (3 * dx), y + (3 * dy));
        doc.line(x, y + (size * dy), x + (3 * dx), y + (size * dy) - (3 * dy));
        // Add spiral curl
        doc.circle(x + (size * dx) - (2 * dx), y + (2 * dy), 1.5, 'S');
        break;
        
      case 'decorative':
        // Geometric decorative corner
        doc.line(x, y, x + (size * dx), y);
        doc.line(x, y, x, y + (size * dy));
        const diamondX = x + (6 * dx);
        const diamondY = y + (6 * dy);
        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.triangle(diamondX, diamondY - 2, diamondX + 2, diamondY, diamondX, diamondY + 2, 'F');
        break;
        
      case 'art-deco':
        // Art Deco geometric corner
        doc.line(x, y, x + (size * 1.5 * dx), y);
        doc.line(x, y, x, y + (size * 1.5 * dy));
        // Stepped lines
        doc.line(x + (4 * dx), y + (4 * dy), x + (size * dx), y + (4 * dy));
        doc.line(x + (4 * dx), y + (4 * dy), x + (4 * dx), y + (size * dy));
        doc.line(x + (7 * dx), y + (7 * dy), x + (size * dx), y + (7 * dy));
        break;
        
      case 'celtic':
        // Celtic knot-inspired corner
        doc.setLineWidth(lineWidth * 0.6);
        // Interlocking pattern
        doc.line(x, y, x + (size * dx), y);
        doc.line(x, y, x, y + (size * dy));
        doc.circle(x + (5 * dx), y + (5 * dy), 3, 'S');
        doc.circle(x + (5 * dx), y + (5 * dy), 1.5, 'S');
        break;
        
      case 'indian':
        // Traditional Indian corner motif
        doc.line(x, y, x + (size * dx), y);
        doc.line(x, y, x, y + (size * dy));
        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        // Paisley-inspired curves
        doc.ellipse(x + (5 * dx), y + (3 * dy), 3, 1.5, 'F');
        doc.ellipse(x + (3 * dx), y + (5 * dy), 1.5, 3, 'F');
        doc.circle(x + (7 * dx), y + (7 * dy), 1.2, 'F');
        break;
        
      case 'baroque':
        // Ornate baroque corner
        doc.line(x, y, x + (size * 1.2 * dx), y);
        doc.line(x, y, x, y + (size * 1.2 * dy));
        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        // Scroll shapes
        doc.ellipse(x + (4 * dx), y + (2 * dy), 2, 1, 'F');
        doc.ellipse(x + (2 * dx), y + (4 * dy), 1, 2, 'F');
        doc.circle(x + (6 * dx), y + (6 * dy), 1.5, 'F');
        doc.circle(x + (8 * dx), y + (4 * dy), 0.8, 'F');
        doc.circle(x + (4 * dx), y + (8 * dy), 0.8, 'F');
        break;
        
      case 'leaf':
        // Leaf-shaped corner decoration
        doc.line(x, y, x + (size * dx), y);
        doc.line(x, y, x, y + (size * dy));
        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.ellipse(x + (6 * dx), y + (3 * dy), 4, 1.5, 'F');
        doc.ellipse(x + (3 * dx), y + (6 * dy), 1.5, 4, 'F');
        // Leaf veins
        doc.setLineWidth(lineWidth * 0.3);
        doc.line(x + (4 * dx), y + (3 * dy), x + (8 * dx), y + (3 * dy));
        break;
        
      case 'scroll':
        // Elegant scroll corner
        doc.line(x, y, x + (size * 1.3 * dx), y);
        doc.line(x, y, x, y + (size * 1.3 * dy));
        doc.setLineWidth(lineWidth * 0.5);
        // Spiral scrolls
        doc.circle(x + (size * dx), y + (3 * dy), 2, 'S');
        doc.circle(x + (3 * dx), y + (size * dy), 2, 'S');
        break;
        
      case 'rounded':
        doc.line(x + (3 * dx), y, x + (size * dx), y);
        doc.line(x, y + (3 * dy), x, y + (size * dy));
        doc.setLineWidth(lineWidth);
        break;
        
      case 'simple':
        doc.line(x, y, x + (size * dx), y);
        doc.line(x, y, x, y + (size * dy));
        break;
        
      default:
        break;
    }
  };
  
  // Draw all four corners
  drawCorner(inset, inset, false, false); // Top-left
  drawCorner(pageWidth - inset, inset, true, false); // Top-right
  drawCorner(inset, pageHeight - inset, false, true); // Bottom-left
  drawCorner(pageWidth - inset, pageHeight - inset, true, true); // Bottom-right
};

// Draw section divider
export const drawSectionDivider = (
  doc: jsPDF,
  theme: PDFTheme,
  editorSettings: PDFEditorSettings,
  y: number,
  margin: number
): number => {
  if (!editorSettings.showDecorations || !editorSettings.showSectionDividers) return y;
  if (!theme.decorations.showSectionDividers) return y;
  
  const decorations = theme.decorations;
  const colors = getDecorationColors(theme);
  const intensity = getIntensityMultiplier(editorSettings.decorationIntensity);
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - (margin * 2);
  const centerX = pageWidth / 2;
  const lineWidth = 0.3 * intensity;
  
  doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.setLineWidth(lineWidth);
  
  switch (decorations.dividerStyle) {
    case 'dots':
      // Dotted line with center accent
      const dotSpacing = 4;
      for (let dx = margin; dx < pageWidth - margin; dx += dotSpacing) {
        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.circle(dx, y, 0.5, 'F');
      }
      break;
      
    case 'wave':
      // Wavy line
      doc.setLineDashPattern([3, 1.5], 0);
      doc.line(margin, y, pageWidth - margin, y);
      doc.setLineDashPattern([], 0);
      break;
      
    case 'diamonds':
      // Line with diamond center
      const diamondSize = 2.5 * intensity;
      doc.line(margin, y, centerX - 8, y);
      doc.line(centerX + 8, y, pageWidth - margin, y);
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.triangle(centerX, y - diamondSize, centerX + diamondSize, y, centerX, y + diamondSize, 'F');
      doc.triangle(centerX, y - diamondSize, centerX - diamondSize, y, centerX, y + diamondSize, 'F');
      break;
      
    case 'hearts':
      // Line with heart center
      doc.line(margin, y, centerX - 10, y);
      doc.line(centerX + 10, y, pageWidth - margin, y);
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.circle(centerX - 2, y - 1, 2, 'F');
      doc.circle(centerX + 2, y - 1, 2, 'F');
      doc.triangle(centerX - 4, y, centerX + 4, y, centerX, y + 4, 'F');
      break;
      
    case 'leaves':
      // Line with leaf accents
      doc.line(margin, y, centerX - 12, y);
      doc.line(centerX + 12, y, pageWidth - margin, y);
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.ellipse(centerX - 6, y, 4, 1.5, 'F');
      doc.ellipse(centerX + 6, y, 4, 1.5, 'F');
      break;
      
    case 'stars':
      // Line with star center
      doc.line(margin, y, centerX - 8, y);
      doc.line(centerX + 8, y, pageWidth - margin, y);
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      const starSize = 3 * intensity;
      drawStar(doc, centerX, y, starSize, 5);
      break;
      
    case 'arrows':
      // Line with arrow accents
      const arrowSize = 3 * intensity;
      doc.line(margin + arrowSize, y, centerX - arrowSize, y);
      doc.line(centerX + arrowSize, y, pageWidth - margin - arrowSize, y);
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.triangle(margin, y, margin + arrowSize, y - 2, margin + arrowSize, y + 2, 'F');
      doc.triangle(pageWidth - margin, y, pageWidth - margin - arrowSize, y - 2, pageWidth - margin - arrowSize, y + 2, 'F');
      break;
      
    case 'paisley':
      // Paisley-inspired center divider
      doc.line(margin, y, centerX - 15, y);
      doc.line(centerX + 15, y, pageWidth - margin, y);
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      // Paisley teardrop shape
      doc.ellipse(centerX, y, 6, 2, 'F');
      doc.circle(centerX - 4, y, 1.5, 'F');
      doc.circle(centerX + 4, y, 1.5, 'F');
      break;
      
    case 'lotus':
      // Lotus flower center divider
      doc.line(margin, y, centerX - 18, y);
      doc.line(centerX + 18, y, pageWidth - margin, y);
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      // Central circle
      doc.circle(centerX, y, 2, 'F');
      // Petals
      doc.ellipse(centerX - 7, y, 4, 1.5, 'F');
      doc.ellipse(centerX + 7, y, 4, 1.5, 'F');
      doc.ellipse(centerX - 4, y - 2, 3, 1, 'F');
      doc.ellipse(centerX + 4, y - 2, 3, 1, 'F');
      break;
      
    case 'geometric':
      // Geometric pattern divider
      doc.line(margin, y, centerX - 20, y);
      doc.line(centerX + 20, y, pageWidth - margin, y);
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      // Geometric shapes
      doc.rect(centerX - 16, y - 2, 4, 4, 'F');
      doc.triangle(centerX - 4, y - 3, centerX + 4, y - 3, centerX, y + 3, 'F');
      doc.rect(centerX + 12, y - 2, 4, 4, 'F');
      break;
      
    case 'swirl':
      // Swirl pattern divider
      doc.line(margin, y, centerX - 12, y);
      doc.line(centerX + 12, y, pageWidth - margin, y);
      doc.setLineWidth(lineWidth * 0.6);
      // Swirl shapes
      doc.circle(centerX - 6, y, 3, 'S');
      doc.circle(centerX + 6, y, 3, 'S');
      doc.circle(centerX, y, 2, 'F');
      break;
      
    case 'chain':
      // Chain link pattern
      const chainSpacing = 8;
      doc.setLineWidth(lineWidth * 0.5);
      for (let cx = margin + 4; cx < pageWidth - margin - 4; cx += chainSpacing) {
        doc.ellipse(cx, y, 3, 1.5, 'S');
      }
      break;
      
    case 'fleur-de-lis':
      // Fleur-de-lis center divider
      doc.line(margin, y, centerX - 12, y);
      doc.line(centerX + 12, y, pageWidth - margin, y);
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      // Simplified fleur-de-lis
      doc.ellipse(centerX, y - 3, 2, 4, 'F');
      doc.ellipse(centerX - 5, y, 3, 2, 'F');
      doc.ellipse(centerX + 5, y, 3, 2, 'F');
      break;
      
    default: // line
      doc.line(margin, y, pageWidth - margin, y);
  }
  
  return y + 6; // Return new y position after divider
};

// Helper to draw a simple star shape
const drawStar = (doc: jsPDF, cx: number, cy: number, radius: number, points: number) => {
  const innerRadius = radius * 0.4;
  const angleStep = Math.PI / points;
  
  doc.setFillColor(0, 0, 0); // Will be overwritten by caller
  
  // Draw star using lines (simplified)
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? radius : innerRadius;
    const angle = i * angleStep - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    
    if (i === 0) {
      doc.circle(x, y, 0.3, 'F');
    }
  }
  // Simplified: just draw a circle for now as jsPDF doesn't have native star
  doc.circle(cx, cy, radius * 0.6, 'F');
};

// Draw header decoration
export const drawHeaderDecoration = (
  doc: jsPDF,
  theme: PDFTheme,
  editorSettings: PDFEditorSettings,
  y: number,
  margin: number,
  headerWidth: number
): void => {
  if (!editorSettings.showDecorations) return;
  if (theme.decorations.headerDecoration === 'none') return;
  
  const decorations = theme.decorations;
  const colors = getDecorationColors(theme);
  const intensity = getIntensityMultiplier(editorSettings.decorationIntensity);
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.setLineWidth(0.5 * intensity);
  
  switch (decorations.headerDecoration) {
    case 'underline':
      doc.line(margin, y, margin + headerWidth, y);
      break;
      
    case 'box':
      doc.rect(margin - 2, y - 8, headerWidth + 4, 10);
      break;
      
    case 'banner':
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.rect(margin - 4, y - 6, headerWidth + 8, 8, 'F');
      break;
      
    case 'ribbon':
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      const ribbonWidth = headerWidth + 16;
      doc.rect(margin - 8, y - 5, ribbonWidth, 6, 'F');
      doc.setFillColor(255, 255, 255);
      doc.triangle(margin - 8, y - 5, margin - 4, y - 2, margin - 8, y + 1, 'F');
      doc.triangle(margin + ribbonWidth - 8, y - 5, margin + ribbonWidth - 12, y - 2, margin + ribbonWidth - 8, y + 1, 'F');
      break;
      
    case 'ornamental':
      doc.line(margin, y, margin + headerWidth, y);
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.circle(margin - 1, y, 1.2, 'F');
      doc.circle(margin + headerWidth + 1, y, 1.2, 'F');
      break;
      
    case 'gradient-bar':
      // Gradient bar effect using multiple thin lines
      for (let i = 0; i < 4; i++) {
        const alpha = 1 - (i * 0.25);
        const gradColor: RGB = [
          Math.round(colors.primary[0] + (255 - colors.primary[0]) * (1 - alpha)),
          Math.round(colors.primary[1] + (255 - colors.primary[1]) * (1 - alpha)),
          Math.round(colors.primary[2] + (255 - colors.primary[2]) * (1 - alpha)),
        ];
        doc.setFillColor(gradColor[0], gradColor[1], gradColor[2]);
        doc.rect(margin, y - 6 + i, headerWidth, 1.5, 'F');
      }
      break;
      
    case 'double-line':
      doc.line(margin, y - 2, margin + headerWidth, y - 2);
      doc.setLineWidth(0.3 * intensity);
      doc.line(margin, y, margin + headerWidth, y);
      break;
      
    case 'bracket':
      // Bracket style header decoration
      doc.line(margin - 4, y - 8, margin - 4, y + 2);
      doc.line(margin - 4, y - 8, margin + 2, y - 8);
      doc.line(margin + headerWidth + 4, y - 8, margin + headerWidth + 4, y + 2);
      doc.line(margin + headerWidth + 4, y - 8, margin + headerWidth - 2, y - 8);
      break;
      
    case 'scroll':
      // Scroll style with curls
      doc.line(margin, y, margin + headerWidth, y);
      doc.setLineWidth(0.4 * intensity);
      doc.circle(margin - 3, y, 2, 'S');
      doc.circle(margin + headerWidth + 3, y, 2, 'S');
      break;
  }
};

// Draw footer decoration
export const drawFooterDecoration = (
  doc: jsPDF,
  theme: PDFTheme,
  editorSettings: PDFEditorSettings,
  y: number,
  margin: number,
  pageNumber: number,
  totalPages: number
): void => {
  if (!editorSettings.showDecorations) return;
  if (!theme.decorations.showFooterDecoration) return;
  
  const decorations = theme.decorations;
  const colors = getDecorationColors(theme);
  const intensity = getIntensityMultiplier(editorSettings.decorationIntensity);
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;
  
  doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.setLineWidth(0.3 * intensity);
  
  switch (decorations.footerStyle) {
    case 'centered':
      // Line with page number in center
      doc.line(margin, y, centerX - 15, y);
      doc.line(centerX + 15, y, pageWidth - margin, y);
      break;
      
    case 'ornamental':
      // Decorative footer with accents
      doc.line(margin + 10, y, centerX - 20, y);
      doc.line(centerX + 20, y, pageWidth - margin - 10, y);
      // Decorative elements
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.circle(margin + 5, y, 1.5, 'F');
      doc.circle(pageWidth - margin - 5, y, 1.5, 'F');
      break;
      
    default: // minimal
      // Just a simple line
      doc.setLineWidth(0.2);
      doc.line(margin, y, pageWidth - margin, y);
  }
};

// Draw watermark pattern (subtle background)
export const drawWatermark = (
  doc: jsPDF,
  theme: PDFTheme,
  editorSettings: PDFEditorSettings
): void => {
  if (!editorSettings.showDecorations) return;
  if (!theme.decorations.showWatermark) return;
  if (theme.decorations.watermarkStyle === 'none') return;
  
  const colors = getDecorationColors(theme);
  const opacity = theme.decorations.watermarkOpacity;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Set very light color for watermark
  const watermarkColor: RGB = [
    Math.round(colors.primary[0] + (255 - colors.primary[0]) * (1 - opacity * 3)),
    Math.round(colors.primary[1] + (255 - colors.primary[1]) * (1 - opacity * 3)),
    Math.round(colors.primary[2] + (255 - colors.primary[2]) * (1 - opacity * 3)),
  ];
  
  doc.setDrawColor(watermarkColor[0], watermarkColor[1], watermarkColor[2]);
  doc.setFillColor(watermarkColor[0], watermarkColor[1], watermarkColor[2]);
  doc.setLineWidth(0.1);
  
  switch (theme.decorations.watermarkStyle) {
    case 'pattern':
      // Subtle diagonal lines pattern
      const spacing = 30;
      for (let wx = -pageHeight; wx < pageWidth + pageHeight; wx += spacing) {
        doc.line(wx, 0, wx + pageHeight, pageHeight);
      }
      break;
      
    case 'subtle':
      // Very subtle corner decorations
      const cornerSize = 40;
      doc.setLineWidth(0.2);
      doc.line(20, 20, 20 + cornerSize, 20);
      doc.line(20, 20, 20, 20 + cornerSize);
      doc.line(pageWidth - 20, pageHeight - 20, pageWidth - 20 - cornerSize, pageHeight - 20);
      doc.line(pageWidth - 20, pageHeight - 20, pageWidth - 20, pageHeight - 20 - cornerSize);
      break;
      
    case 'mandala':
      // Subtle mandala pattern in center
      const centerX = pageWidth / 2;
      const centerY = pageHeight / 2;
      doc.setLineWidth(0.15);
      for (let r = 20; r < 80; r += 15) {
        doc.circle(centerX, centerY, r, 'S');
      }
      // Radial lines
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
        doc.line(
          centerX + Math.cos(angle) * 20,
          centerY + Math.sin(angle) * 20,
          centerX + Math.cos(angle) * 75,
          centerY + Math.sin(angle) * 75
        );
      }
      break;
      
    case 'geometric':
      // Subtle geometric grid pattern
      const gridSpacing = 25;
      doc.setLineWidth(0.1);
      for (let gx = 0; gx < pageWidth; gx += gridSpacing) {
        for (let gy = 0; gy < pageHeight; gy += gridSpacing) {
          doc.rect(gx, gy, gridSpacing * 0.3, gridSpacing * 0.3, 'S');
        }
      }
      break;
      
    case 'floral-pattern':
      // Subtle floral pattern
      const floralSpacing = 40;
      doc.setLineWidth(0.15);
      for (let fx = floralSpacing; fx < pageWidth; fx += floralSpacing) {
        for (let fy = floralSpacing; fy < pageHeight; fy += floralSpacing) {
          // Small flower shape
          doc.circle(fx, fy, 1.5, 'S');
          doc.ellipse(fx - 3, fy, 2, 0.8, 'S');
          doc.ellipse(fx + 3, fy, 2, 0.8, 'S');
          doc.ellipse(fx, fy - 3, 0.8, 2, 'S');
          doc.ellipse(fx, fy + 3, 0.8, 2, 'S');
        }
      }
      break;
      
    case 'damask':
      // Damask-style repeating pattern
      const damaskSpacing = 35;
      doc.setLineWidth(0.12);
      for (let dx = damaskSpacing / 2; dx < pageWidth; dx += damaskSpacing) {
        for (let dy = damaskSpacing / 2; dy < pageHeight; dy += damaskSpacing) {
          // Diamond shape
          doc.line(dx, dy - 4, dx + 4, dy);
          doc.line(dx + 4, dy, dx, dy + 4);
          doc.line(dx, dy + 4, dx - 4, dy);
          doc.line(dx - 4, dy, dx, dy - 4);
          // Center dot
          doc.circle(dx, dy, 0.8, 'F');
        }
      }
      break;
  }
};

// Main function to draw all decorations
export const drawAllDecorations = (
  doc: jsPDF,
  theme: PDFTheme,
  editorSettings: PDFEditorSettings,
  pageNumber: number = 1,
  totalPages: number = 1
): void => {
  // Draw in order: watermark (background), border, corners
  drawWatermark(doc, theme, editorSettings);
  drawPageBorder(doc, theme, editorSettings);
  drawCornerOrnaments(doc, theme, editorSettings);
};
