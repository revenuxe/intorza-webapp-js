/**
 * Generates the INTORZA product / tech-stack architecture diagram as a
 * self-contained SVG string (no external fonts or images), so it can be
 * previewed inline and exported as SVG or PNG.
 */

const W = 1680;
const H = 1120;

const C = {
  bg: "#0E1116",
  grid: "#171C24",
  panel: "#151A21",
  panelAlt: "#1B2husk",
  stroke: "#2A323D",
  text: "#F2F5F9",
  muted: "#93A0B1",
  accent: "#E2A33C",
  accent2: "#5B9DF9",
  green: "#4FC08D",
  purple: "#A78BFA",
  pink: "#F2789F",
};

type Box = {
  x: number; y: number; w: number; h: number;
  title: string; subtitle?: string; color: string;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function lane(x: number, y: number, w: number, h: number, label: string, color: string) {
  return `
  <g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="22" fill="${C.panel}" stroke="${C.stroke}" stroke-width="1.5"/>
    <rect x="${x}" y="${y}" width="6" height="${h}" rx="3" fill="${color}"/>
    <text x="${x + 24}" y="${y + 34}" fill="${color}" font-size="17" font-weight="700" letter-spacing="1.6">${esc(label.toUpperCase())}</text>
  </g>`;
}

function chip(b: Box) {
  return `
  <g>
    <rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="14" fill="#1C222B" stroke="${b.color}" stroke-opacity="0.55" stroke-width="1.5"/>
    <circle cx="${b.x + 18}" cy="${b.y + 22}" r="5" fill="${b.color}"/>
    <text x="${b.x + 34}" y="${b.y + 27}" fill="${C.text}" font-size="16" font-weight="650">${esc(b.title)}</text>
    ${b.subtitle
      ? `<text x="${b.x + 18}" y="${b.y + 50}" fill="${C.muted}" font-size="13">${esc(b.subtitle)}</text>`
      : ""}
  </g>`;
}

function arrow(x1: number, y1: number, x2: number, y2: number, label?: string, color = C.stroke) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const path =
    Math.abs(x1 - x2) < 2
      ? `M ${x1} ${y1} L ${x2} ${y2}`
      : `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
  return `
  <g>
    <path d="${path}" fill="none" stroke="${color}" stroke-width="2" marker-end="url(#arrowhead)" stroke-opacity="0.9"/>
    ${label ? `<rect x="${mx - label.length * 4 - 10}" y="${my - 13}" width="${label.length * 8 + 20}" height="24" rx="12" fill="${C.bg}" stroke="${C.stroke}"/>
    <text x="${mx}" y="${my + 4}" fill="${C.muted}" font-size="12.5" text-anchor="middle">${esc(label)}</text>` : ""}
  </g>`;
}

export function buildTechStackSVG(): string {
  const cols = (n: number, i: number, x: number, w: number, gap = 18) => {
    const cw = (w - gap * (n - 1)) / n;
    return { x: x + i * (cw + gap), w: cw };
  };

  // ---- Lane geometry
  const LX = 60;
  const LW = W - 120;
  const inner = LX + 24;
  const innerW = LW - 48;

  const lanes = [
    { y: 150, h: 178, label: "Clients / Devices", color: C.accent },
    { y: 352, h: 214, label: "Frontend application (React SPA + PWA)", color: C.accent2 },
    { y: 590, h: 212, label: "Backend — Supabase (single source of truth)", color: C.green },
    { y: 826, h: 152, label: "Hosting, delivery & third-party services", color: C.purple },
  ];

  let s = "";
  lanes.forEach((l) => (s += lane(LX, l.y, LW, l.h, l.label, l.color)));

  // Lane 1 — clients
  const l1 = [
    ["Mobile browser (primary)", "Designers on site — mobile-first UI"],
    ["Desktop browser", "Quotation & PDF editing"],
    ["Installable PWA", "vite-plugin-pwa, offline shell"],
    ["Team / Admin consoles", "/team, /admin routes"],
  ];
  l1.forEach((b, i) => {
    const { x, w } = cols(4, i, inner, innerW);
    s += chip({ x, y: 208, w, h: 74, title: b[0], subtitle: b[1], color: C.accent });
  });

  // Lane 2 — frontend
  const l2a = [
    ["React 18 + TypeScript 5", "Vite 5 build, SWC"],
    ["Tailwind CSS 3 + shadcn/ui", "Radix primitives, design tokens"],
    ["React Router 6", "Route-level code split"],
    ["TanStack Query + Context", "Auth, Subscription, Localization"],
  ];
  l2a.forEach((b, i) => {
    const { x, w } = cols(4, i, inner, innerW);
    s += chip({ x, y: 400, w, h: 74, title: b[0], subtitle: b[1], color: C.accent2 });
  });
  const l2b = [
    ["Quotations & Invoices", "Sections, items, sq-ft pricing"],
    ["PDF engine (client-side)", "jsPDF + autotable, pdf.js preview"],
    ["Site measurement & Gallery", "Rooms, photos, tagging"],
    ["Team, Tasks & My Library", "Attendance, templates, items"],
  ];
  l2b.forEach((b, i) => {
    const { x, w } = cols(4, i, inner, innerW);
    s += chip({ x, y: 486, w, h: 66, title: b[0], subtitle: b[1], color: C.accent2 });
  });

  // Lane 3 — backend
  const l3 = [
    ["Supabase Auth", "Email/password, JWT sessions, roles"],
    ["Postgres + Row Level Security", "user_id scoping, user_roles + has_role()"],
    ["Storage buckets", "company-logos, gallery-images, room-photos"],
    ["Edge Functions (Deno)", "razorpay-*, subscription-status, team auth"],
  ];
  l3.forEach((b, i) => {
    const { x, w } = cols(4, i, inner, innerW);
    s += chip({ x, y: 640, w, h: 78, title: b[0], subtitle: b[1], color: C.green });
  });

  // Data model strip
  s += `
  <rect x="${inner}" y="${734}" width="${innerW}" height="48" rx="12" fill="#12171E" stroke="${C.stroke}"/>
  <text x="${inner + 18}" y="${764}" fill="${C.muted}" font-size="13.5">Core tables: profiles · quotations → quotation_sections → quotation_items · invoices → payments · clients · tasks · team_members · team_member_requests · attendance · site_measurement_projects → rooms → room_photos · gallery_images · *_templates · user_roles · feedback</text>`;

  // Lane 4 — hosting / services
  const l4 = [
    ["Lovable hosting + CDN", "Preview & published app"],
    ["AWS Amplify (alt deploy)", "amplify.yml, SPA rewrites"],
    ["Razorpay", "Pro subscription checkout & webhooks"],
    ["Signed URLs / CDN assets", "Private buckets, 1-year signed links"],
  ];
  l4.forEach((b, i) => {
    const { x, w } = cols(4, i, inner, innerW);
    s += chip({ x, y: 874, w, h: 78, title: b[0], subtitle: b[1], color: C.purple });
  });

  // Arrows between lanes
  s += arrow(W / 2 - 280, 328, W / 2 - 280, 352, "HTTPS", C.accent);
  s += arrow(W / 2 + 280, 566, W / 2 + 280, 590, "supabase-js (REST / Auth / Storage)", C.green);
  s += arrow(W / 2 - 280, 802, W / 2 - 280, 826, "deploy / webhooks", C.purple);

  // Header + footer
  const header = `
  <text x="${LX}" y="72" fill="${C.text}" font-size="38" font-weight="800" letter-spacing="-0.5">INTORZA — Product &amp; Tech Stack</text>
  <text x="${LX}" y="104" fill="${C.muted}" font-size="16">Mobile-first SaaS for interior designers: quotations → PDFs → invoices → payments. Client-rendered SPA on a Supabase backend.</text>
  <text x="${W - LX}" y="72" fill="${C.accent}" font-size="15" font-weight="700" text-anchor="end">Architecture overview</text>
  <text x="${W - LX}" y="98" fill="${C.muted}" font-size="13" text-anchor="end">Generated ${new Date().toISOString().slice(0, 10)}</text>`;

  const footer = `
  <text x="${LX}" y="${H - 42}" fill="${C.muted}" font-size="13.5">Flow: designer signs in → builds a quotation (sections, items, sq-ft rates, tax applied on confirm) → PDF generated in the browser → shared/accepted → converted to an invoice → payments tracked. All reads/writes go through supabase-js with RLS; files land in Supabase Storage; Pro billing runs through Razorpay edge functions.</text>
  <text x="${W - LX}" y="${H - 42}" fill="${C.stroke}" font-size="13" text-anchor="end">intorza.com</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Manrope, 'Segoe UI', Helvetica, Arial, sans-serif">
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
      <path d="M0,0 L10,4 L0,8 z" fill="${C.stroke}"/>
    </marker>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0 L0 0 0 40" fill="none" stroke="${C.grid}" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  ${header}
  ${s}
  ${footer}
</svg>`;
}

export function downloadTechStackSVG(filename = "intorza-tech-stack.svg") {
  const blob = new Blob([buildTechStackSVG()], { type: "image/svg+xml;charset=utf-8" });
  triggerDownload(URL.createObjectURL(blob), filename);
}

export async function downloadTechStackPNG(filename = "intorza-tech-stack.png", scale = 2) {
  const svg = buildTechStackSVG();
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not render the diagram image"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available in this browser");
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/png");
    triggerDownload(dataUrl, filename);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
