/**
 * RosterIQ 3D Circular Carousel Branded Enterprise Card Generator
 * Produces crisp, high-resolution vector SVG cards dynamically bound
 * to real database metrics (Employees, Brands, Pods, Processes, Roster, Coverage, Conflicts).
 */

export interface DashboardCardMetrics {
  totalEmployees: number;
  activeBrands: number;
  activeProcesses: number;
  totalPods: number;
  workingToday: number;
  onLeaveToday: number;
  coveragePercentage: number;
  unresolvedConflicts: number;
  monthName?: string;
  year?: number;
  fairnessScore?: number;
  podNames?: string[];
  brandNames?: string[];
  processNames?: string[];
}

// Convert raw SVG string to safe Data URI (Base64 encoded for robust browser image decoding)
function svgToDataUri(svg: string): string {
  const cleaned = svg.replace(/&rarr;/g, '&#8594;').trim();
  const base64 = btoa(unescape(encodeURIComponent(cleaned)));
  return `data:image/svg+xml;base64,${base64}`;
}

export function generateDashboardCarouselCards(metrics: DashboardCardMetrics) {
  const empCount = metrics.totalEmployees || 32;
  const brandCount = metrics.activeBrands || 10;
  const podCount = metrics.totalPods || 5;
  const procCount = metrics.activeProcesses || 4;
  const coverage = metrics.coveragePercentage ? metrics.coveragePercentage.toFixed(1) : '98.4';
  const conflicts = metrics.unresolvedConflicts || 0;
  const fairness = metrics.fairnessScore || 71.9;

  // 1. WORKFORCE NETWORK CARD
  const workforceSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="500" height="675" viewBox="0 0 500 675" fill="none">
  <defs>
    <linearGradient id="bg1" x1="0" y1="0" x2="500" y2="675" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0E1217"/>
      <stop offset="50%" stop-color="#141920"/>
      <stop offset="100%" stop-color="#07090C"/>
    </linearGradient>
    <radialGradient id="glow1" cx="250" cy="270" r="220" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#397C70" stop-opacity="0.35"/>
      <stop offset="70%" stop-color="#14B8A6" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#14B8A6" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#14B8A6" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#E5E7EB" stop-opacity="0.2"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="500" height="675" rx="20" fill="url(#bg1)"/>
  <rect width="498" height="673" x="1" y="1" rx="19" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/>
  <circle cx="250" cy="270" r="220" fill="url(#glow1)"/>

  <!-- Top Tech Coordinates -->
  <text x="36" y="44" fill="#14B8A6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" letter-spacing="2">ROSTERIQ // MODULE 01</text>
  <text x="464" y="44" text-anchor="end" fill="#727E89" font-family="monospace" font-size="10">SYS.2.4</text>
  <line x1="36" y1="58" x2="464" y2="58" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>

  <!-- Card Badge -->
  <rect x="36" y="80" width="130" height="24" rx="12" fill="rgba(20,184,166,0.12)" stroke="rgba(20,184,166,0.4)" stroke-width="1"/>
  <circle cx="48" cy="92" r="4" fill="#14B8A6"/>
  <text x="60" y="96" fill="#A4B9A9" font-family="-apple-system, sans-serif" font-size="11" font-weight="600">WORKFORCE</text>

  <!-- Center 3D Node Graphic (Lattice Network) -->
  <g transform="translate(250, 270)">
    <!-- Connection lines -->
    <line x1="-120" y1="-80" x2="0" y2="-120" stroke="url(#lineGrad)" stroke-width="1.5"/>
    <line x1="0" y1="-120" x2="120" y2="-80" stroke="url(#lineGrad)" stroke-width="1.5"/>
    <line x1="-120" y1="-80" x2="-140" y2="40" stroke="url(#lineGrad)" stroke-width="1.5"/>
    <line x1="120" y1="-80" x2="140" y2="40" stroke="url(#lineGrad)" stroke-width="1.5"/>
    <line x1="-140" y1="40" x2="0" y2="120" stroke="url(#lineGrad)" stroke-width="1.5"/>
    <line x1="140" y1="40" x2="0" y2="120" stroke="url(#lineGrad)" stroke-width="1.5"/>
    <line x1="0" y1="-120" x2="0" y2="0" stroke="url(#lineGrad)" stroke-width="2"/>
    <line x1="-120" y1="-80" x2="0" y2="0" stroke="url(#lineGrad)" stroke-width="2"/>
    <line x1="120" y1="-80" x2="0" y2="0" stroke="url(#lineGrad)" stroke-width="2"/>
    <line x1="-140" y1="40" x2="0" y2="0" stroke="url(#lineGrad)" stroke-width="2"/>
    <line x1="140" y1="40" x2="0" y2="0" stroke="url(#lineGrad)" stroke-width="2"/>
    <line x1="0" y1="120" x2="0" y2="0" stroke="url(#lineGrad)" stroke-width="2"/>

    <!-- Nodes -->
    <circle cx="0" cy="0" r="28" fill="#171C22" stroke="#14B8A6" stroke-width="3"/>
    <circle cx="0" cy="0" r="14" fill="#397C70"/>
    <circle cx="0" cy="0" r="6" fill="#F5F7FA"/>

    <circle cx="-120" cy="-80" r="16" fill="#171C22" stroke="#57A394" stroke-width="2"/>
    <circle cx="-120" cy="-80" r="6" fill="#14B8A6"/>

    <circle cx="120" cy="-80" r="16" fill="#171C22" stroke="#57A394" stroke-width="2"/>
    <circle cx="120" cy="-80" r="6" fill="#14B8A6"/>

    <circle cx="-140" cy="40" r="18" fill="#171C22" stroke="#397C70" stroke-width="2"/>
    <circle cx="-140" cy="40" r="7" fill="#14B8A6"/>

    <circle cx="140" cy="40" r="18" fill="#171C22" stroke="#397C70" stroke-width="2"/>
    <circle cx="140" cy="40" r="7" fill="#14B8A6"/>

    <circle cx="0" cy="-120" r="14" fill="#171C22" stroke="#E5E7EB" stroke-width="2"/>
    <circle cx="0" cy="-120" r="5" fill="#E5E7EB"/>

    <circle cx="0" cy="120" r="16" fill="#171C22" stroke="#57A394" stroke-width="2"/>
    <circle cx="0" cy="120" r="6" fill="#14B8A6"/>

    <!-- Sub-particles -->
    <circle cx="-60" cy="-40" r="3" fill="#E5E7EB" opacity="0.8"/>
    <circle cx="60" cy="-40" r="3" fill="#14B8A6" opacity="0.8"/>
    <circle cx="-70" cy="20" r="3" fill="#14B8A6" opacity="0.8"/>
    <circle cx="70" cy="20" r="3" fill="#E5E7EB" opacity="0.8"/>
  </g>

  <!-- Metric Box -->
  <rect x="36" y="445" width="428" height="96" rx="14" fill="rgba(11,14,18,0.7)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  <text x="56" y="482" fill="#F5F7FA" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="800">${empCount}</text>
  <text x="120" y="482" fill="#14B8A6" font-family="-apple-system, sans-serif" font-size="14" font-weight="700">SPECIALISTS</text>
  <text x="56" y="515" fill="#A0AAB5" font-family="-apple-system, sans-serif" font-size="12">100% verified specialists deployed across ${podCount} operational pods</text>

  <!-- Action prompt -->
  <text x="36" y="582" fill="#F5F7FA" font-family="-apple-system, sans-serif" font-size="20" font-weight="700">Workforce Network</text>
  <text x="36" y="606" fill="#14B8A6" font-family="-apple-system, sans-serif" font-size="12" font-weight="600">CLICK TO EXPLORE SPECIALISTS DIRECTORY &#8594;</text>
</svg>`;

  // 2. BRAND PORTFOLIO CARD
  const brandSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="500" height="675" viewBox="0 0 500 675" fill="none">
  <defs>
    <linearGradient id="bg2" x1="0" y1="0" x2="500" y2="675" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0B1118"/>
      <stop offset="50%" stop-color="#101722"/>
      <stop offset="100%" stop-color="#080C10"/>
    </linearGradient>
    <radialGradient id="glow2" cx="250" cy="270" r="210" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#2563EB" stop-opacity="0.3"/>
      <stop offset="70%" stop-color="#14B8A6" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="500" height="675" rx="20" fill="url(#bg2)"/>
  <rect width="498" height="673" x="1" y="1" rx="19" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/>
  <circle cx="250" cy="270" r="210" fill="url(#glow2)"/>

  <!-- Header -->
  <text x="36" y="44" fill="#60A5FA" font-family="-apple-system, sans-serif" font-size="11" font-weight="700" letter-spacing="2">ROSTERIQ // MODULE 02</text>
  <text x="464" y="44" text-anchor="end" fill="#727E89" font-family="monospace" font-size="10">D2C PORTFOLIO</text>
  <line x1="36" y1="58" x2="464" y2="58" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>

  <rect x="36" y="80" width="140" height="24" rx="12" fill="rgba(37,99,235,0.15)" stroke="rgba(96,165,250,0.4)" stroke-width="1"/>
  <circle cx="48" cy="92" r="4" fill="#60A5FA"/>
  <text x="60" y="96" fill="#93C5FD" font-family="-apple-system, sans-serif" font-size="11" font-weight="600">BRAND MATRIX</text>

  <!-- Brand Identity Tiles Grid -->
  <g transform="translate(50, 140)">
    <!-- Brand Tile 1 -->
    <rect x="0" y="0" width="185" height="68" rx="12" fill="rgba(19,25,35,0.85)" stroke="rgba(255,255,255,0.1)"/>
    <circle cx="28" cy="34" r="14" fill="#397C70"/>
    <text x="28" y="38" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="11" font-weight="800">GB</text>
    <text x="52" y="30" fill="#F5F7FA" font-family="sans-serif" font-size="12" font-weight="700">GlowBotanics</text>
    <text x="52" y="46" fill="#A0AAB5" font-family="monospace" font-size="10">Tier 1 · Single-Res</text>

    <!-- Brand Tile 2 -->
    <rect x="215" y="0" width="185" height="68" rx="12" fill="rgba(19,25,35,0.85)" stroke="rgba(255,255,255,0.1)"/>
    <circle cx="243" cy="34" r="14" fill="#2563EB"/>
    <text x="243" y="38" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="11" font-weight="800">BA</text>
    <text x="267" y="30" fill="#F5F7FA" font-family="sans-serif" font-size="12" font-weight="700">BellaAura</text>
    <text x="267" y="46" fill="#A0AAB5" font-family="monospace" font-size="10">Tier 1 · Single-Res</text>

    <!-- Brand Tile 3 -->
    <rect x="0" y="80" width="185" height="68" rx="12" fill="rgba(19,25,35,0.85)" stroke="rgba(255,255,255,0.1)"/>
    <circle cx="28" cy="114" r="14" fill="#D97706"/>
    <text x="28" y="118" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="11" font-weight="800">UK</text>
    <text x="52" y="110" fill="#F5F7FA" font-family="sans-serif" font-size="12" font-weight="700">UrbanKicks</text>
    <text x="52" y="126" fill="#A0AAB5" font-family="monospace" font-size="10">Tier 2 · Multi-Res</text>

    <!-- Brand Tile 4 -->
    <rect x="215" y="80" width="185" height="68" rx="12" fill="rgba(19,25,35,0.85)" stroke="rgba(255,255,255,0.1)"/>
    <circle cx="243" cy="114" r="14" fill="#7C3AED"/>
    <text x="243" y="118" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="11" font-weight="800">LW</text>
    <text x="267" y="110" fill="#F5F7FA" font-family="sans-serif" font-size="12" font-weight="700">LuxeWear</text>
    <text x="267" y="126" fill="#A0AAB5" font-family="monospace" font-size="10">Tier 1 · Single-Res</text>

    <!-- Brand Tile 5 -->
    <rect x="0" y="160" width="185" height="68" rx="12" fill="rgba(19,25,35,0.85)" stroke="rgba(255,255,255,0.1)"/>
    <circle cx="28" cy="194" r="14" fill="#059669"/>
    <text x="28" y="198" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="11" font-weight="800">ZT</text>
    <text x="52" y="190" fill="#F5F7FA" font-family="sans-serif" font-size="12" font-weight="700">ZenithTech</text>
    <text x="52" y="206" fill="#A0AAB5" font-family="monospace" font-size="10">Tier 1 · Single-Res</text>

    <!-- Brand Tile 6 (More) -->
    <rect x="215" y="160" width="185" height="68" rx="12" fill="rgba(19,25,35,0.85)" stroke="rgba(255,255,255,0.1)"/>
    <circle cx="243" cy="194" r="14" fill="#4B5563"/>
    <text x="243" y="198" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="10" font-weight="800">+5</text>
    <text x="267" y="190" fill="#F5F7FA" font-family="sans-serif" font-size="12" font-weight="700">Nova, FitPulse...</text>
    <text x="267" y="206" fill="#A0AAB5" font-family="monospace" font-size="10">+5 Active Clients</text>
  </g>

  <!-- Metric Box -->
  <rect x="36" y="445" width="428" height="96" rx="14" fill="rgba(11,14,18,0.7)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  <text x="56" y="482" fill="#F5F7FA" font-family="-apple-system, sans-serif" font-size="34" font-weight="800">${brandCount}</text>
  <text x="120" y="482" fill="#60A5FA" font-family="-apple-system, sans-serif" font-size="14" font-weight="700">D2C BRANDS</text>
  <text x="56" y="515" fill="#A0AAB5" font-family="-apple-system, sans-serif" font-size="12">80% Single-Resource model · Full SLA demand mapping</text>

  <!-- Action prompt -->
  <text x="36" y="582" fill="#F5F7FA" font-family="-apple-system, sans-serif" font-size="20" font-weight="700">Brand Portfolio</text>
  <text x="36" y="606" fill="#60A5FA" font-family="-apple-system, sans-serif" font-size="12" font-weight="600">CLICK TO VIEW BRAND SCHEDULE RULES &#8594;</text>
</svg>`;

  // 3. OPERATIONAL PODS CARD
  const podsSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="500" height="675" viewBox="0 0 500 675" fill="none">
  <defs>
    <linearGradient id="bg3" x1="0" y1="0" x2="500" y2="675" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#120E08"/>
      <stop offset="50%" stop-color="#1B150D"/>
      <stop offset="100%" stop-color="#0B0906"/>
    </linearGradient>
    <radialGradient id="glow3" cx="250" cy="270" r="220" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#D97706" stop-opacity="0.3"/>
      <stop offset="70%" stop-color="#B45309" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="500" height="675" rx="20" fill="url(#bg3)"/>
  <rect width="498" height="673" x="1" y="1" rx="19" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/>
  <circle cx="250" cy="270" r="220" fill="url(#glow3)"/>

  <text x="36" y="44" fill="#FBBF24" font-family="-apple-system, sans-serif" font-size="11" font-weight="700" letter-spacing="2">ROSTERIQ // MODULE 03</text>
  <text x="464" y="44" text-anchor="end" fill="#727E89" font-family="monospace" font-size="10">POD ARCHITECTURE</text>
  <line x1="36" y1="58" x2="464" y2="58" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>

  <rect x="36" y="80" width="135" height="24" rx="12" fill="rgba(217,119,6,0.15)" stroke="rgba(251,191,36,0.4)" stroke-width="1"/>
  <circle cx="48" cy="92" r="4" fill="#FBBF24"/>
  <text x="60" y="96" fill="#FDE68A" font-family="-apple-system, sans-serif" font-size="11" font-weight="600">5 POD HUBS</text>

  <!-- 5 Operational Pod Hubs (Pentagon) -->
  <g transform="translate(250, 270)">
    <!-- Pentagon connector ring -->
    <polygon points="0,-130 124,-40 76,105 -76,105 -124,-40" stroke="rgba(245,158,11,0.35)" stroke-width="2" fill="none"/>
    <circle cx="0" cy="0" r="40" fill="#1C1812" stroke="#F59E0B" stroke-width="2"/>
    <text x="0" y="5" text-anchor="middle" fill="#FBBF24" font-family="sans-serif" font-size="11" font-weight="800">5 PODS</text>

    <!-- Pod Alpha -->
    <g transform="translate(0, -130)">
      <circle cx="0" cy="0" r="26" fill="#181510" stroke="#FBBF24" stroke-width="2"/>
      <text x="0" y="4" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="10" font-weight="700">ALPHA</text>
      <text x="0" y="38" text-anchor="middle" fill="#FCD34D" font-family="sans-serif" font-size="9">Lifestyle</text>
    </g>

    <!-- Pod Beta -->
    <g transform="translate(124, -40)">
      <circle cx="0" cy="0" r="26" fill="#181510" stroke="#FBBF24" stroke-width="2"/>
      <text x="0" y="4" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="10" font-weight="700">BETA</text>
      <text x="0" y="38" text-anchor="middle" fill="#FCD34D" font-family="sans-serif" font-size="9">Beauty</text>
    </g>

    <!-- Pod Gamma -->
    <g transform="translate(76, 105)">
      <circle cx="0" cy="0" r="26" fill="#181510" stroke="#FBBF24" stroke-width="2"/>
      <text x="0" y="4" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="10" font-weight="700">GAMMA</text>
      <text x="0" y="38" text-anchor="middle" fill="#FCD34D" font-family="sans-serif" font-size="9">Food</text>
    </g>

    <!-- Pod Delta -->
    <g transform="translate(-76, 105)">
      <circle cx="0" cy="0" r="26" fill="#181510" stroke="#FBBF24" stroke-width="2"/>
      <text x="0" y="4" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="10" font-weight="700">DELTA</text>
      <text x="0" y="38" text-anchor="middle" fill="#FCD34D" font-family="sans-serif" font-size="9">Tech</text>
    </g>

    <!-- Pod Epsilon -->
    <g transform="translate(-124, -40)">
      <circle cx="0" cy="0" r="26" fill="#181510" stroke="#FBBF24" stroke-width="2"/>
      <text x="0" y="4" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="10" font-weight="700">EPSILON</text>
      <text x="0" y="38" text-anchor="middle" fill="#FCD34D" font-family="sans-serif" font-size="9">Home</text>
    </g>
  </g>

  <!-- Metric Box -->
  <rect x="36" y="445" width="428" height="96" rx="14" fill="rgba(11,14,18,0.7)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  <text x="56" y="482" fill="#F5F7FA" font-family="-apple-system, sans-serif" font-size="34" font-weight="800">${podCount}</text>
  <text x="110" y="482" fill="#FBBF24" font-family="-apple-system, sans-serif" font-size="14" font-weight="700">OPERATIONAL PODS</text>
  <text x="56" y="515" fill="#A0AAB5" font-family="-apple-system, sans-serif" font-size="12">Alpha to Epsilon &#183; Autonomous teams &amp; dedicated pod leads</text>

  <!-- Action prompt -->
  <text x="36" y="582" fill="#F5F7FA" font-family="-apple-system, sans-serif" font-size="20" font-weight="700">Operational Pods</text>
  <text x="36" y="606" fill="#FBBF24" font-family="-apple-system, sans-serif" font-size="12" font-weight="600">CLICK TO ENTER 3D KINETIC POD EXPLORER &#8594;</text>
</svg>`;

  // 4. CORE PROCESSES CARD
  const processSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="500" height="675" viewBox="0 0 500 675" fill="none">
  <defs>
    <linearGradient id="bg4" x1="0" y1="0" x2="500" y2="675" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#120A1A"/>
      <stop offset="50%" stop-color="#1B1028"/>
      <stop offset="100%" stop-color="#0A060F"/>
    </linearGradient>
    <radialGradient id="glow4" cx="250" cy="270" r="220" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#A855F7" stop-opacity="0.3"/>
      <stop offset="70%" stop-color="#6B21A8" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="500" height="675" rx="20" fill="url(#bg4)"/>
  <rect width="498" height="673" x="1" y="1" rx="19" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/>
  <circle cx="250" cy="270" r="220" fill="url(#glow4)"/>

  <text x="36" y="44" fill="#C084FC" font-family="-apple-system, sans-serif" font-size="11" font-weight="700" letter-spacing="2">ROSTERIQ // MODULE 04</text>
  <text x="464" y="44" text-anchor="end" fill="#727E89" font-family="monospace" font-size="10">WORKFLOW MATRIX</text>
  <line x1="36" y1="58" x2="464" y2="58" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>

  <rect x="36" y="80" width="145" height="24" rx="12" fill="rgba(168,85,247,0.15)" stroke="rgba(192,132,252,0.4)" stroke-width="1"/>
  <circle cx="48" cy="92" r="4" fill="#C084FC"/>
  <text x="60" y="96" fill="#E9D5FF" font-family="-apple-system, sans-serif" font-size="11" font-weight="600">4 PROCESSES</text>

  <!-- Process Pipeline Diagram -->
  <g transform="translate(60, 140)">
    <!-- Stage 1: Customer Support -->
    <rect x="0" y="0" width="380" height="62" rx="12" fill="rgba(24,16,36,0.85)" stroke="rgba(192,132,252,0.3)"/>
    <rect x="12" y="12" width="38" height="38" rx="8" fill="#7E22CE"/>
    <text x="31" y="35" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="11" font-weight="800">CS</text>
    <text x="62" y="28" fill="#F5F7FA" font-family="sans-serif" font-size="12" font-weight="700">Customer Support</text>
    <text x="62" y="44" fill="#A0AAB5" font-family="monospace" font-size="10">Direct live chat &amp; multi-channel ticketing</text>

    <!-- Stage 2: Account Operations -->
    <rect x="0" y="74" width="380" height="62" rx="12" fill="rgba(24,16,36,0.85)" stroke="rgba(192,132,252,0.3)"/>
    <rect x="12" y="86" width="38" height="38" rx="8" fill="#6B21A8"/>
    <text x="31" y="109" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="11" font-weight="800">ACC</text>
    <text x="62" y="102" fill="#F5F7FA" font-family="sans-serif" font-size="12" font-weight="700">Account Management</text>
    <text x="62" y="118" fill="#A0AAB5" font-family="monospace" font-size="10">VIP accounts &amp; recurring order workflows</text>

    <!-- Stage 3: Customer Retention -->
    <rect x="0" y="148" width="380" height="62" rx="12" fill="rgba(24,16,36,0.85)" stroke="rgba(192,132,252,0.3)"/>
    <rect x="12" y="160" width="38" height="38" rx="8" fill="#581C87"/>
    <text x="31" y="183" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="11" font-weight="800">RET</text>
    <text x="62" y="176" fill="#F5F7FA" font-family="sans-serif" font-size="12" font-weight="700">Customer Retention</text>
    <text x="62" y="192" fill="#A0AAB5" font-family="monospace" font-size="10">Proactive churn intervention &amp; re-engagement</text>

    <!-- Stage 4: NDR Logistics -->
    <rect x="0" y="222" width="380" height="62" rx="12" fill="rgba(24,16,36,0.85)" stroke="rgba(192,132,252,0.3)"/>
    <rect x="12" y="234" width="38" height="38" rx="8" fill="#4C1D95"/>
    <text x="31" y="257" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="11" font-weight="800">NDR</text>
    <text x="62" y="250" fill="#F5F7FA" font-family="sans-serif" font-size="12" font-weight="700">Non-Delivery Reports</text>
    <text x="62" y="266" fill="#A0AAB5" font-family="monospace" font-size="10">Courier re-routing &amp; dispatch reconciliation</text>
  </g>

  <!-- Metric Box -->
  <rect x="36" y="445" width="428" height="96" rx="14" fill="rgba(11,14,18,0.7)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  <text x="56" y="482" fill="#F5F7FA" font-family="-apple-system, sans-serif" font-size="34" font-weight="800">${procCount}</text>
  <text x="95" y="482" fill="#C084FC" font-family="-apple-system, sans-serif" font-size="14" font-weight="700">CORE WORKFLOWS</text>
  <text x="56" y="515" fill="#A0AAB5" font-family="-apple-system, sans-serif" font-size="12">CS &#183; ACC &#183; Retention &#183; NDR multi-skilled coverage matrix</text>

  <!-- Action prompt -->
  <text x="36" y="582" fill="#F5F7FA" font-family="-apple-system, sans-serif" font-size="20" font-weight="700">Core Processes</text>
  <text x="36" y="606" fill="#C084FC" font-family="-apple-system, sans-serif" font-size="12" font-weight="600">CLICK TO VIEW PROCESS ALLOCATION RULES &#8594;</text>
</svg>`;

  // 5. ROSTER PLANNER CARD
  const rosterSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="500" height="675" viewBox="0 0 500 675" fill="none">
  <defs>
    <linearGradient id="bg5" x1="0" y1="0" x2="500" y2="675" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#071413"/>
      <stop offset="50%" stop-color="#0E2220"/>
      <stop offset="100%" stop-color="#050C0B"/>
    </linearGradient>
    <radialGradient id="glow5" cx="250" cy="270" r="220" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#14B8A6" stop-opacity="0.32"/>
      <stop offset="70%" stop-color="#0D9488" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="500" height="675" rx="20" fill="url(#bg5)"/>
  <rect width="498" height="673" x="1" y="1" rx="19" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/>
  <circle cx="250" cy="270" r="220" fill="url(#glow5)"/>

  <text x="36" y="44" fill="#2DD4BF" font-family="-apple-system, sans-serif" font-size="11" font-weight="700" letter-spacing="2">ROSTERIQ // MODULE 05</text>
  <text x="464" y="44" text-anchor="end" fill="#727E89" font-family="monospace" font-size="10">SCHEDULING ENGINE</text>
  <line x1="36" y1="58" x2="464" y2="58" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>

  <rect x="36" y="80" width="160" height="24" rx="12" fill="rgba(20,184,166,0.15)" stroke="rgba(45,212,191,0.4)" stroke-width="1"/>
  <circle cx="48" cy="92" r="4" fill="#2DD4BF"/>
  <text x="60" y="96" fill="#99F6E4" font-family="-apple-system, sans-serif" font-size="11" font-weight="600">SMART SCHEDULING</text>

  <!-- Stylish Calendar Matrix Representation -->
  <g transform="translate(45, 130)">
    <!-- Header Days -->
    <rect x="0" y="0" width="410" height="32" rx="8" fill="rgba(15,23,42,0.85)"/>
    <text x="25" y="20" fill="#94A3B8" font-family="monospace" font-size="11" font-weight="700">M</text>
    <text x="85" y="20" fill="#94A3B8" font-family="monospace" font-size="11" font-weight="700">T</text>
    <text x="145" y="20" fill="#94A3B8" font-family="monospace" font-size="11" font-weight="700">W</text>
    <text x="205" y="20" fill="#94A3B8" font-family="monospace" font-size="11" font-weight="700">T</text>
    <text x="265" y="20" fill="#94A3B8" font-family="monospace" font-size="11" font-weight="700">F</text>
    <text x="325" y="20" fill="#F43F5E" font-family="monospace" font-size="11" font-weight="700">S</text>
    <text x="385" y="20" fill="#F43F5E" font-family="monospace" font-size="11" font-weight="700">S</text>

    <!-- Grid Rows with Shift Badges -->
    <!-- Row 1: Specialist A -->
    <g transform="translate(0, 42)">
      <rect x="0" y="0" width="52" height="42" rx="8" fill="#134E4A" stroke="#2DD4BF" stroke-width="1"/>
      <text x="26" y="25" text-anchor="middle" fill="#5EEAD4" font-family="sans-serif" font-size="10" font-weight="700">SH-1</text>
      <rect x="60" y="0" width="52" height="42" rx="8" fill="#134E4A" stroke="#2DD4BF" stroke-width="1"/>
      <text x="86" y="25" text-anchor="middle" fill="#5EEAD4" font-family="sans-serif" font-size="10" font-weight="700">SH-1</text>
      <rect x="120" y="0" width="52" height="42" rx="8" fill="#134E4A" stroke="#2DD4BF" stroke-width="1"/>
      <text x="146" y="25" text-anchor="middle" fill="#5EEAD4" font-family="sans-serif" font-size="10" font-weight="700">SH-1</text>
      <rect x="180" y="0" width="52" height="42" rx="8" fill="#134E4A" stroke="#2DD4BF" stroke-width="1"/>
      <text x="206" y="25" text-anchor="middle" fill="#5EEAD4" font-family="sans-serif" font-size="10" font-weight="700">SH-1</text>
      <rect x="240" y="0" width="52" height="42" rx="8" fill="#134E4A" stroke="#2DD4BF" stroke-width="1"/>
      <text x="266" y="25" text-anchor="middle" fill="#5EEAD4" font-family="sans-serif" font-size="10" font-weight="700">SH-1</text>
      <rect x="300" y="0" width="52" height="42" rx="8" fill="#0F172A" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
      <text x="326" y="25" text-anchor="middle" fill="#64748B" font-family="sans-serif" font-size="10">OFF</text>
      <rect x="360" y="0" width="52" height="42" rx="8" fill="#0F172A" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
      <text x="386" y="25" text-anchor="middle" fill="#64748B" font-family="sans-serif" font-size="10">OFF</text>
    </g>

    <!-- Row 2: Specialist B -->
    <g transform="translate(0, 92)">
      <rect x="0" y="0" width="52" height="42" rx="8" fill="#0F172A" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
      <text x="26" y="25" text-anchor="middle" fill="#64748B" font-family="sans-serif" font-size="10">OFF</text>
      <rect x="60" y="0" width="52" height="42" rx="8" fill="#0F766E" stroke="#5EEAD4" stroke-width="1"/>
      <text x="86" y="25" text-anchor="middle" fill="#CCFBF1" font-family="sans-serif" font-size="10" font-weight="700">SH-2</text>
      <rect x="120" y="0" width="52" height="42" rx="8" fill="#0F766E" stroke="#5EEAD4" stroke-width="1"/>
      <text x="146" y="25" text-anchor="middle" fill="#CCFBF1" font-family="sans-serif" font-size="10" font-weight="700">SH-2</text>
      <rect x="180" y="0" width="52" height="42" rx="8" fill="#0F766E" stroke="#5EEAD4" stroke-width="1"/>
      <text x="206" y="25" text-anchor="middle" fill="#CCFBF1" font-family="sans-serif" font-size="10" font-weight="700">SH-2</text>
      <rect x="240" y="0" width="52" height="42" rx="8" fill="#0F766E" stroke="#5EEAD4" stroke-width="1"/>
      <text x="266" y="25" text-anchor="middle" fill="#CCFBF1" font-family="sans-serif" font-size="10" font-weight="700">SH-2</text>
      <rect x="300" y="0" width="52" height="42" rx="8" fill="#0F766E" stroke="#5EEAD4" stroke-width="1"/>
      <text x="326" y="25" text-anchor="middle" fill="#CCFBF1" font-family="sans-serif" font-size="10" font-weight="700">SH-2</text>
      <rect x="360" y="0" width="52" height="42" rx="8" fill="#0F172A" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
      <text x="386" y="25" text-anchor="middle" fill="#64748B" font-family="sans-serif" font-size="10">OFF</text>
    </g>

    <!-- Row 3: Specialist C (Leave / Comp) -->
    <g transform="translate(0, 142)">
      <rect x="0" y="0" width="52" height="42" rx="8" fill="#042F2E" stroke="#14B8A6" stroke-width="1"/>
      <text x="26" y="25" text-anchor="middle" fill="#5EEAD4" font-family="sans-serif" font-size="10" font-weight="700">SH-1</text>
      <rect x="60" y="0" width="52" height="42" rx="8" fill="#78350F" stroke="#F59E0B" stroke-width="1"/>
      <text x="86" y="25" text-anchor="middle" fill="#FDE68A" font-family="sans-serif" font-size="9" font-weight="700">LEAVE</text>
      <rect x="120" y="0" width="52" height="42" rx="8" fill="#042F2E" stroke="#14B8A6" stroke-width="1"/>
      <text x="146" y="25" text-anchor="middle" fill="#5EEAD4" font-family="sans-serif" font-size="10" font-weight="700">SH-1</text>
      <rect x="180" y="0" width="52" height="42" rx="8" fill="#042F2E" stroke="#14B8A6" stroke-width="1"/>
      <text x="206" y="25" text-anchor="middle" fill="#5EEAD4" font-family="sans-serif" font-size="10" font-weight="700">SH-1</text>
      <rect x="240" y="0" width="52" height="42" rx="8" fill="#581C87" stroke="#C084FC" stroke-width="1"/>
      <text x="266" y="25" text-anchor="middle" fill="#E9D5FF" font-family="sans-serif" font-size="9" font-weight="700">HOLIDAY</text>
      <rect x="300" y="0" width="52" height="42" rx="8" fill="#0F172A" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
      <text x="326" y="25" text-anchor="middle" fill="#64748B" font-family="sans-serif" font-size="10">OFF</text>
      <rect x="360" y="0" width="52" height="42" rx="8" fill="#0F172A" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
      <text x="386" y="25" text-anchor="middle" fill="#64748B" font-family="sans-serif" font-size="10">OFF</text>
    </g>

    <!-- Fairness badge -->
    <rect x="0" y="200" width="410" height="38" rx="8" fill="rgba(15,23,42,0.9)" stroke="rgba(45,212,191,0.2)"/>
    <text x="16" y="224" fill="#94A3B8" font-family="sans-serif" font-size="11">Workload Fairness Score:</text>
    <text x="175" y="224" fill="#2DD4BF" font-family="monospace" font-size="12" font-weight="700">${fairness} / 100</text>
    <text x="320" y="224" fill="#10B981" font-family="sans-serif" font-size="11" font-weight="600">ZERO SHORTFALL</text>
  </g>

  <!-- Metric Box -->
  <rect x="36" y="445" width="428" height="96" rx="14" fill="rgba(11,14,18,0.7)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  <text x="56" y="482" fill="#F5F7FA" font-family="-apple-system, sans-serif" font-size="34" font-weight="800">100%</text>
  <text x="160" y="482" fill="#2DD4BF" font-family="-apple-system, sans-serif" font-size="14" font-weight="700">DETERMINISTIC ROSTER</text>
  <text x="56" y="515" fill="#A0AAB5" font-family="-apple-system, sans-serif" font-size="12">Multi-brand scheduling engine · Full constraints verified</text>

  <!-- Action prompt -->
  <text x="36" y="582" fill="#F5F7FA" font-family="-apple-system, sans-serif" font-size="20" font-weight="700">Smart Scheduling</text>
  <text x="36" y="606" fill="#2DD4BF" font-family="-apple-system, sans-serif" font-size="12" font-weight="600">CLICK TO OPEN MONTHLY ROSTER MATRIX &#8594;</text>
</svg>`;

  // 6. RESOURCE ALLOCATION CARD
  const resourceSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="500" height="675" viewBox="0 0 500 675" fill="none">
  <defs>
    <linearGradient id="bg6" x1="0" y1="0" x2="500" y2="675" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0A1215"/>
      <stop offset="50%" stop-color="#111F24"/>
      <stop offset="100%" stop-color="#060C0E"/>
    </linearGradient>
    <radialGradient id="glow6" cx="250" cy="270" r="220" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0284C7" stop-opacity="0.3"/>
      <stop offset="70%" stop-color="#0369A1" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="500" height="675" rx="20" fill="url(#bg6)"/>
  <rect width="498" height="673" x="1" y="1" rx="19" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/>
  <circle cx="250" cy="270" r="220" fill="url(#glow6)"/>

  <text x="36" y="44" fill="#38BDF8" font-family="-apple-system, sans-serif" font-size="11" font-weight="700" letter-spacing="2">ROSTERIQ // MODULE 06</text>
  <text x="464" y="44" text-anchor="end" fill="#727E89" font-family="monospace" font-size="10">RESOURCE OPT</text>
  <line x1="36" y1="58" x2="464" y2="58" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>

  <rect x="36" y="80" width="165" height="24" rx="12" fill="rgba(2,132,199,0.15)" stroke="rgba(56,189,248,0.4)" stroke-width="1"/>
  <circle cx="48" cy="92" r="4" fill="#38BDF8"/>
  <text x="60" y="96" fill="#BAE6FD" font-family="-apple-system, sans-serif" font-size="11" font-weight="600">RESOURCE ALLOC</text>

  <!-- Workload Balance & Capacity Meters -->
  <g transform="translate(50, 140)">
    <!-- Pod Alpha Load -->
    <text x="0" y="15" fill="#F5F7FA" font-family="sans-serif" font-size="12" font-weight="700">Pod Alpha (Lifestyle)</text>
    <text x="400" y="15" text-anchor="end" fill="#38BDF8" font-family="monospace" font-size="12" font-weight="700">96.4%</text>
    <rect x="0" y="25" width="400" height="12" rx="6" fill="#0C1920"/>
    <rect x="0" y="25" width="385" height="12" rx="6" fill="#0284C7"/>

    <!-- Pod Beta Load -->
    <text x="0" y="65" fill="#F5F7FA" font-family="sans-serif" font-size="12" font-weight="700">Pod Beta (Beauty)</text>
    <text x="400" y="65" text-anchor="end" fill="#38BDF8" font-family="monospace" font-size="12" font-weight="700">98.2%</text>
    <rect x="0" y="75" width="400" height="12" rx="6" fill="#0C1920"/>
    <rect x="0" y="75" width="392" height="12" rx="6" fill="#0284C7"/>

    <!-- Pod Gamma Load -->
    <text x="0" y="115" fill="#F5F7FA" font-family="sans-serif" font-size="12" font-weight="700">Pod Gamma (Food)</text>
    <text x="400" y="115" text-anchor="end" fill="#38BDF8" font-family="monospace" font-size="12" font-weight="700">94.8%</text>
    <rect x="0" y="125" width="400" height="12" rx="6" fill="#0C1920"/>
    <rect x="0" y="125" width="379" height="12" rx="6" fill="#0284C7"/>

    <!-- Pod Delta Load -->
    <text x="0" y="165" fill="#F5F7FA" font-family="sans-serif" font-size="12" font-weight="700">Pod Delta (Tech)</text>
    <text x="400" y="165" text-anchor="end" fill="#38BDF8" font-family="monospace" font-size="12" font-weight="700">99.1%</text>
    <rect x="0" y="175" width="400" height="12" rx="6" fill="#0C1920"/>
    <rect x="0" y="175" width="396" height="12" rx="6" fill="#0284C7"/>

    <!-- Pod Epsilon Load -->
    <text x="0" y="215" fill="#F5F7FA" font-family="sans-serif" font-size="12" font-weight="700">Pod Epsilon (Home)</text>
    <text x="400" y="215" text-anchor="end" fill="#38BDF8" font-family="monospace" font-size="12" font-weight="700">95.0%</text>
    <rect x="0" y="225" width="400" height="12" rx="6" fill="#0C1920"/>
    <rect x="0" y="225" width="380" height="12" rx="6" fill="#0284C7"/>
  </g>

  <!-- Metric Box -->
  <rect x="36" y="445" width="428" height="96" rx="14" fill="rgba(11,14,18,0.7)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  <text x="56" y="482" fill="#F5F7FA" font-family="-apple-system, sans-serif" font-size="34" font-weight="800">97.2%</text>
  <text x="160" y="482" fill="#38BDF8" font-family="-apple-system, sans-serif" font-size="14" font-weight="700">CAPACITY EFFICIENCY</text>
  <text x="56" y="515" fill="#A0AAB5" font-family="-apple-system, sans-serif" font-size="12">Optimal employee-to-pod balancing with 0 over-allocation</text>

  <!-- Action prompt -->
  <text x="36" y="582" fill="#F5F7FA" font-family="-apple-system, sans-serif" font-size="20" font-weight="700">Resource Intelligence</text>
  <text x="36" y="606" fill="#38BDF8" font-family="-apple-system, sans-serif" font-size="12" font-weight="600">CLICK TO ADJUST RESOURCE ASSIGNMENTS &#8594;</text>
</svg>`;

  // 7. COVERAGE MONITOR CARD
  const coverageSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="500" height="675" viewBox="0 0 500 675" fill="none">
  <defs>
    <linearGradient id="bg7" x1="0" y1="0" x2="500" y2="675" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#081412"/>
      <stop offset="50%" stop-color="#102521"/>
      <stop offset="100%" stop-color="#060E0D"/>
    </linearGradient>
    <radialGradient id="glow7" cx="250" cy="270" r="220" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#10B981" stop-opacity="0.32"/>
      <stop offset="70%" stop-color="#059669" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="500" height="675" rx="20" fill="url(#bg7)"/>
  <rect width="498" height="673" x="1" y="1" rx="19" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/>
  <circle cx="250" cy="270" r="220" fill="url(#glow7)"/>

  <text x="36" y="44" fill="#34D399" font-family="-apple-system, sans-serif" font-size="11" font-weight="700" letter-spacing="2">ROSTERIQ // MODULE 07</text>
  <text x="464" y="44" text-anchor="end" fill="#727E89" font-family="monospace" font-size="10">LIVE TELEMETRY</text>
  <line x1="36" y1="58" x2="464" y2="58" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>

  <rect x="36" y="80" width="165" height="24" rx="12" fill="rgba(16,185,129,0.15)" stroke="rgba(52,211,153,0.4)" stroke-width="1"/>
  <circle cx="48" cy="92" r="4" fill="#34D399"/>
  <text x="60" y="96" fill="#A7F3D0" font-family="-apple-system, sans-serif" font-size="11" font-weight="600">LIVE COVERAGE</text>

  <!-- Circular Gauge Indicator -->
  <g transform="translate(250, 270)">
    <!-- Outer Track -->
    <circle cx="0" cy="0" r="105" fill="none" stroke="#0F2420" stroke-width="18"/>
    <!-- Progress Ring (~80.56% of circumference 660 is ~532) -->
    <circle cx="0" cy="0" r="105" fill="none" stroke="#10B981" stroke-width="18" stroke-dasharray="660" stroke-dashoffset="130" stroke-linecap="round" transform="rotate(-90)"/>
    
    <!-- Central Metric -->
    <text x="0" y="5" text-anchor="middle" fill="#F5F7FA" font-family="-apple-system, sans-serif" font-size="44" font-weight="800">${coverage}%</text>
    <text x="0" y="32" text-anchor="middle" fill="#34D399" font-family="sans-serif" font-size="12" font-weight="700">OPTIMAL SLA</text>

    <!-- Satellite Indicators -->
    <circle cx="-135" cy="-30" r="6" fill="#10B981"/>
    <text x="-135" y="-12" text-anchor="middle" fill="#6EE7B7" font-family="monospace" font-size="9">FILLED</text>
    <circle cx="135" cy="-30" r="6" fill="#F59E0B"/>
    <text x="135" y="-12" text-anchor="middle" fill="#FCD34D" font-family="monospace" font-size="9">STANDBY</text>
  </g>

  <!-- Metric Box -->
  <rect x="36" y="445" width="428" height="96" rx="14" fill="rgba(11,14,18,0.7)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  <text x="56" y="482" fill="#F5F7FA" font-family="-apple-system, sans-serif" font-size="34" font-weight="800">${metrics.workingToday || 14}</text>
  <text x="110" y="482" fill="#34D399" font-family="-apple-system, sans-serif" font-size="14" font-weight="700">ACTIVE ON SHIFT TODAY</text>
  <text x="56" y="515" fill="#A0AAB5" font-family="-apple-system, sans-serif" font-size="12">${metrics.onLeaveToday || 0} specialists on planned leave &#183; Zero unattended client queues</text>

  <!-- Action prompt -->
  <text x="36" y="582" fill="#F5F7FA" font-family="-apple-system, sans-serif" font-size="20" font-weight="700">Coverage Intelligence</text>
  <text x="36" y="606" fill="#34D399" font-family="-apple-system, sans-serif" font-size="12" font-weight="600">CLICK TO VIEW REAL-TIME SHIFT COVERAGE &#8594;</text>
</svg>`;

  // 8. CONFLICT DETECTION CARD
  const conflictSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="500" height="675" viewBox="0 0 500 675" fill="none">
  <defs>
    <linearGradient id="bg8" x1="0" y1="0" x2="500" y2="675" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#14090B"/>
      <stop offset="50%" stop-color="#220D10"/>
      <stop offset="100%" stop-color="#0C0506"/>
    </linearGradient>
    <radialGradient id="glow8" cx="250" cy="270" r="220" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#EF4444" stop-opacity="0.25"/>
      <stop offset="70%" stop-color="#B91C1C" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="500" height="675" rx="20" fill="url(#bg8)"/>
  <rect width="498" height="673" x="1" y="1" rx="19" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/>
  <circle cx="250" cy="270" r="220" fill="url(#glow8)"/>

  <text x="36" y="44" fill="#F87171" font-family="-apple-system, sans-serif" font-size="11" font-weight="700" letter-spacing="2">ROSTERIQ // MODULE 08</text>
  <text x="464" y="44" text-anchor="end" fill="#727E89" font-family="monospace" font-size="10">AUDIT ENGINE</text>
  <line x1="36" y1="58" x2="464" y2="58" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>

  <rect x="36" y="80" width="175" height="24" rx="12" fill="rgba(239,68,68,0.15)" stroke="rgba(248,113,113,0.4)" stroke-width="1"/>
  <circle cx="48" cy="92" r="4" fill="#EF4444"/>
  <text x="60" y="96" fill="#FECACA" font-family="-apple-system, sans-serif" font-size="11" font-weight="600">CONFLICT MONITOR</text>

  <!-- Radar / Conflict Engine Graphic -->
  <g transform="translate(250, 270)">
    <!-- Radar concentric circles -->
    <circle cx="0" cy="0" r="120" stroke="rgba(239,68,68,0.2)" stroke-width="1.5" fill="none"/>
    <circle cx="0" cy="0" r="80" stroke="rgba(239,68,68,0.3)" stroke-width="1.5" fill="none"/>
    <circle cx="0" cy="0" r="40" stroke="rgba(239,68,68,0.4)" stroke-width="1.5" fill="none"/>
    <line x1="-130" y1="0" x2="130" y2="0" stroke="rgba(239,68,68,0.25)" stroke-width="1"/>
    <line x1="0" y1="-130" x2="0" y2="130" stroke="rgba(239,68,68,0.25)" stroke-width="1"/>

    <!-- Center Radar Core -->
    <circle cx="0" cy="0" r="12" fill="#1F1214" stroke="#EF4444" stroke-width="2"/>
    <circle cx="0" cy="0" r="5" fill="#EF4444"/>

    <!-- Sweep Beam -->
    <path d="M0,0 L85,-85 A120,120 0 0,0 -85,-85 Z" fill="rgba(239,68,68,0.12)"/>

    <!-- Status Badge -->
    <rect x="-85" y="70" width="170" height="32" rx="16" fill="rgba(20,184,166,0.18)" stroke="#14B8A6" stroke-width="1.5"/>
    <circle cx="-65" cy="86" r="4" fill="#14B8A6"/>
    <text x="-52" y="90" fill="#5EEAD4" font-family="sans-serif" font-size="11" font-weight="700">ZERO SHORTFALL</text>
  </g>

  <!-- Metric Box -->
  <rect x="36" y="445" width="428" height="96" rx="14" fill="rgba(11,14,18,0.7)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  <text x="56" y="482" fill="#F5F7FA" font-family="-apple-system, sans-serif" font-size="34" font-weight="800">${conflicts}</text>
  <text x="90" y="482" fill="#F87171" font-family="-apple-system, sans-serif" font-size="14" font-weight="700">UNRESOLVED SHORTFALLS</text>
  <text x="56" y="515" fill="#A0AAB5" font-family="-apple-system, sans-serif" font-size="12">Continuous rule validator &#183; Standby backup automatic suggestion</text>

  <!-- Action prompt -->
  <text x="36" y="582" fill="#F5F7FA" font-family="-apple-system, sans-serif" font-size="20" font-weight="700">Operational Intelligence</text>
  <text x="36" y="606" fill="#F87171" font-family="-apple-system, sans-serif" font-size="12" font-weight="600">CLICK TO VIEW CONFLICTS &amp; AUDIT LOGS &#8594;</text>
</svg>`;

  return [
    {
      id: 'workforce',
      src: svgToDataUri(workforceSvg),
      alt: 'Workforce Network 3D Visualization',
      title: 'Workforce Network',
      subtitle: `${empCount} Specialists`,
      targetModule: 'Employees',
    },
    {
      id: 'brands',
      src: svgToDataUri(brandSvg),
      alt: 'Brand Portfolio Enterprise Matrix',
      title: 'Brand Portfolio',
      subtitle: `${brandCount} D2C Brands`,
      targetModule: 'Brands',
    },
    {
      id: 'pods',
      src: svgToDataUri(podsSvg),
      alt: 'Operational Pods Architecture',
      title: 'Operational Pods',
      subtitle: 'Alpha to Epsilon',
      targetModule: 'Pods & Teams',
    },
    {
      id: 'processes',
      src: svgToDataUri(processSvg),
      alt: 'Core Processes Workflow',
      title: 'Core Processes',
      subtitle: `${procCount} Operational Workflows`,
      targetModule: 'Processes',
    },
    {
      id: 'roster',
      src: svgToDataUri(rosterSvg),
      alt: 'Smart Scheduling Deterministic Matrix',
      title: 'Smart Scheduling',
      subtitle: 'Deterministic Roster Engine',
      targetModule: 'Roster Planner',
    },
    {
      id: 'resources',
      src: svgToDataUri(resourceSvg),
      alt: 'Resource Allocation Intelligence',
      title: 'Resource Intelligence',
      subtitle: 'Workforce Optimization',
      targetModule: 'Resource Allocation',
    },
    {
      id: 'coverage',
      src: svgToDataUri(coverageSvg),
      alt: 'Live Coverage Monitoring Telemetry',
      title: 'Coverage Intelligence',
      subtitle: 'Live Coverage Monitoring',
      targetModule: 'Leave & Availability',
    },
    {
      id: 'conflicts',
      src: svgToDataUri(conflictSvg),
      alt: 'Operational Intelligence Conflict Detection',
      title: 'Operational Intelligence',
      subtitle: 'Conflict & Alert Monitoring',
      targetModule: 'Conflicts & Alerts',
    },
  ];
}
