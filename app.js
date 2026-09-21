/**
 * ============================================================================
 * Seeed reTerminal E1001 E-Paper Screen - Analog Clock Engine
 * Version: 2026.09.21.17.36.00
 * Description: Renders a high-legibility analog clock optimized for the 
 *              Seeed Studio E1001 7.5" e-paper display (800x480 resolution).
 *              Synchronizes to minute boundaries and updates every 60 seconds.
 * ============================================================================
 */

// ============================================================================
// CONFIGURATION PARAMETERS (NO MAGIC NUMBERS)
// Default values are documented in comments for reference and modification.
// ============================================================================

// Global Pseudorandom Seed (Ensures deterministic visual texture & initial state)
const GLOBAL_SEED = 42; // Default: 42

// Display Canvas Dimensions
const CANVAS_WIDTH = 800; // Default: 800 (Seeed E1001 native width)
const CANVAS_HEIGHT = 480; // Default: 480 (Seeed E1001 native height)

// Center Coordinates
const CENTER_X = CANVAS_WIDTH / 2; // Default: 400 (Canvas horizontal center)
const CENTER_Y = CANVAS_HEIGHT / 2; // Default: 240 (Canvas vertical center)

// Dial Geometry
const CLOCK_RADIUS = 195; // Default: 195 (Outer radius of clock face)
const INNER_DIAL_RADIUS = 185; // Default: 185 (Inner bezel radius)
const DIAL_BORDER_WIDTH = 4; // Default: 4 (Main border thickness)
const SUB_BORDER_WIDTH = 1.5; // Default: 1.5 (Secondary decorative ring thickness)

// Clock Hands Dimensions
const HOUR_HAND_LENGTH = 105; // Default: 105 (Length of hour hand in px)
const HOUR_HAND_WIDTH = 7; // Default: 7 (Width of hour hand)
const MINUTE_HAND_LENGTH = 155; // Default: 155 (Length of minute hand in px)
const MINUTE_HAND_WIDTH = 4.5; // Default: 4.5 (Width of minute hand)
const HAND_TAIL_LENGTH = 24; // Default: 24 (Counterbalance tail length)
const CENTER_PIN_RADIUS = 6.5; // Default: 6.5 (Center cap circle radius)
const CENTER_PIN_INNER_RADIUS = 2.5; // Default: 2.5 (Center cap inner dot)

// Dial Markings
const HOUR_TICK_LENGTH = 16; // Default: 16 (Length of 12 hour ticks)
const HOUR_TICK_WIDTH = 3.5; // Default: 3.5 (Thickness of hour ticks)
const MINUTE_TICK_LENGTH = 7; // Default: 7 (Length of 60 minute ticks)
const MINUTE_TICK_WIDTH = 1.2; // Default: 1.2 (Thickness of minute ticks)
const NUMERAL_INSET = 34; // Default: 34 (Distance of hour numerals from outer rim)
const NUMERAL_FONT_SIZE = 22; // Default: 22 (Font size in px for numbers)

// Telemetry & Badge Layout
const BADGE_WIDTH = 120; // Default: 120 (Date badge pill width)
const BADGE_HEIGHT = 32; // Default: 32 (Date badge pill height)
const BADGE_OFFSET_Y = 65; // Default: 65 (Vertical offset below center)
const TEXT_FONT_FAMILY = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

// Refresh and Timing
const UPDATE_INTERVAL_SECONDS = 60; // Default: 60 (Update exactly every minute)
const SIMULATE_EPAPER_GRAIN = true; // Default: true (Subtle paper texture)
const GRAIN_DENSITY = 2400; // Default: 2400 (Number of subtle noise grain dots)
const GRAIN_ALPHA = 0.035; // Default: 0.035 (Opacity of paper texture)

// Active Palette Selection Index (0 to 4)
let activePaletteIndex = 0; // Default: 0 (Classic E-Ink Slate & Paper)
let backgroundPaletteColorIndex = 0; // Default: 0 (First color of palette as background)

// ============================================================================
// 5 ADOBE KULER INSPIRED COLOR PALETTES
// Curated palettes providing high contrast for e-ink and vibrant preview modes.
// ============================================================================
const COLOR_PALETTES = [
  {
    // Palette 0: Classic E-Ink Slate & Paper (Ideal for physical 4-level grayscale e-paper)
    name: "Classic E-Ink Slate & Paper",
    background: "#F7F8F5", // E-paper warm white
    dialBackground: "#FFFFFF", // Pure white dial
    primaryText: "#111417", // Deep ink black
    secondaryText: "#4A5568", // Dark slate gray
    accentColor: "#2D3748", // Contrast charcoal
    border: "#1A202C" // Ink outline
  },
  {
    // Palette 1: Bauhaus Modernist (Adobe Kuler: Bauhaus Contrast)
    name: "Bauhaus Modernist",
    background: "#ECE9E1", // Bone cream
    dialBackground: "#F5F3ED", // Light parchment
    primaryText: "#18181A", // Bauhaus black
    secondaryText: "#3C4048", // Slate neutral
    accentColor: "#C93B2B", // Bauhaus vermilion red
    border: "#18181A" // Dark black border
  },
  {
    // Palette 2: Nord Timeless (Adobe Kuler: Arctic Frost & Polar Night)
    name: "Nord Timeless",
    background: "#2E3440", // Polar night dark slate
    dialBackground: "#3B4252", // Polar night deep gray
    primaryText: "#ECEFF4", // Snow storm crisp white
    secondaryText: "#D8DEE9", // Frost light gray
    accentColor: "#88C0D0", // Frost ice blue
    border: "#4C566A" // Polar storm outline
  },
  {
    // Palette 3: Vintage Watchmaker (Adobe Kuler: Horology Heritage)
    name: "Vintage Watchmaker",
    background: "#F4EFE6", // Aged ivory parchment
    dialBackground: "#FCF9F2", // Clean watch dial
    primaryText: "#23201C", // Vintage ink
    secondaryText: "#6E6259", // Warm sepia
    accentColor: "#8C6D46", // Horology antique brass
    border: "#3B332B" // Dark walnut
  },
  {
    // Palette 4: Sandstorm Minimalist (Adobe Kuler: Desert Solitude)
    name: "Sandstorm Minimalist",
    background: "#E8E2D5", // Desert sand
    dialBackground: "#F2ECE0", // Sunlit dune
    primaryText: "#2C2621", // Obsidian
    secondaryText: "#706456", // Earth brown
    accentColor: "#B86B35", // Terracotta
    border: "#3F3730" // Deep earth
  }
];

// ============================================================================
// DETERMINISTIC SEEDED PSEUDORANDOM GENERATOR (Rule 4)
// ============================================================================
function createSeededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
const seededRandom = createSeededRandom(GLOBAL_SEED);

// Generate static grain noise coordinates using seed
const grainPoints = [];
for (let i = 0; i < GRAIN_DENSITY; i++) {
  grainPoints.push({
    x: Math.floor(seededRandom() * CANVAS_WIDTH),
    y: Math.floor(seededRandom() * CANVAS_HEIGHT),
    size: seededRandom() > 0.85 ? 1.5 : 1.0
  });
}

// ============================================================================
// CANVAS RENDERING ENGINE
// ============================================================================
const canvas = document.getElementById('clockCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

/**
 * Gets the current active color palette with safety clamping
 */
function getActivePalette() {
  const index = Math.max(0, Math.min(activePaletteIndex, COLOR_PALETTES.length - 1));
  return COLOR_PALETTES[index];
}

/**
 * Renders the full analog clock screen at 800x480 resolution
 */
function renderClockScreen() {
  if (!ctx) return;
  const palette = getActivePalette();
  const now = new Date();

  // 1. Clear & Draw Canvas Background
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 2. Render Seeded E-Paper Texture
  if (SIMULATE_EPAPER_GRAIN) {
    ctx.fillStyle = palette.primaryText;
    ctx.globalAlpha = GRAIN_ALPHA;
    for (let i = 0; i < grainPoints.length; i++) {
      const pt = grainPoints[i];
      ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
    }
    ctx.globalAlpha = 1.0;
  }

  // 3. Draw Outer Bezel / Dial Shadow & Background
  ctx.save();
  ctx.beginPath();
  ctx.arc(CENTER_X, CENTER_Y, CLOCK_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = palette.dialBackground;
  ctx.fill();
  ctx.lineWidth = DIAL_BORDER_WIDTH;
  ctx.strokeStyle = palette.border;
  ctx.stroke();

  // Inner decorative concentric ring
  ctx.beginPath();
  ctx.arc(CENTER_X, CENTER_Y, INNER_DIAL_RADIUS, 0, Math.PI * 2);
  ctx.lineWidth = SUB_BORDER_WIDTH;
  ctx.strokeStyle = palette.secondaryText;
  ctx.stroke();
  ctx.restore();

  // 4. Draw Dial Hour and Minute Ticks
  ctx.save();
  ctx.translate(CENTER_X, CENTER_Y);

  for (let i = 0; i < 60; i++) {
    const angle = (i * Math.PI) / 30;
    const isHour = i % 5 === 0;
    const tickLen = isHour ? HOUR_TICK_LENGTH : MINUTE_TICK_LENGTH;
    const tickWidth = isHour ? HOUR_TICK_WIDTH : MINUTE_TICK_WIDTH;

    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, -INNER_DIAL_RADIUS);
    ctx.lineTo(0, -INNER_DIAL_RADIUS + tickLen);
    ctx.lineWidth = tickWidth;
    ctx.strokeStyle = isHour ? palette.primaryText : palette.secondaryText;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();
  }

  // 5. Draw Dial Hour Numerals (12, 3, 6, 9 stylized or all 12)
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${NUMERAL_FONT_SIZE}px ${TEXT_FONT_FAMILY}`;
  ctx.fillStyle = palette.primaryText;

  for (let num = 1; num <= 12; num++) {
    const angle = (num * Math.PI) / 6;
    const numeralRadius = INNER_DIAL_RADIUS - NUMERAL_INSET;
    const x = numeralRadius * Math.sin(angle);
    const y = -numeralRadius * Math.cos(angle);
    ctx.fillText(num.toString(), x, y);
  }
  ctx.restore();

  // 6. Draw Centered Date Ribbon & Info Widget
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const dayName = days[now.getDay()];
  const monthName = months[now.getMonth()];
  const dayDate = now.getDate();
  const dateString = `${dayName}  •  ${monthName} ${dayDate}`;

  ctx.save();
  const badgeX = CENTER_X - BADGE_WIDTH / 2;
  const badgeY = CENTER_Y + BADGE_OFFSET_Y;

  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, BADGE_WIDTH, BADGE_HEIGHT, BADGE_HEIGHT / 2);
  ctx.fillStyle = palette.background;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = palette.secondaryText;
  ctx.stroke();

  ctx.font = `700 13px ${TEXT_FONT_FAMILY}`;
  ctx.fillStyle = palette.primaryText;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(dateString, CENTER_X, badgeY + BADGE_HEIGHT / 2 + 1);
  ctx.restore();

  // 7. Draw Telemetry Badges (E-Paper Ambient Frame Accents)
  drawTelemetryAccents(palette, now);

  // 8. Calculate Angles for Hour & Minute Hands
  const hours = now.getHours() % 12;
  const minutes = now.getMinutes();
  
  // Hour hand angle includes minute progression
  const hourAngle = ((hours + minutes / 60) * Math.PI) / 6;
  // Minute hand angle is aligned to exact minute
  const minuteAngle = (minutes * Math.PI) / 30;

  // 9. Draw Hour Hand
  ctx.save();
  ctx.translate(CENTER_X, CENTER_Y);
  ctx.rotate(hourAngle);
  ctx.beginPath();
  ctx.moveTo(0, HAND_TAIL_LENGTH);
  ctx.lineTo(0, -HOUR_HAND_LENGTH);
  ctx.lineWidth = HOUR_HAND_WIDTH;
  ctx.strokeStyle = palette.primaryText;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();

  // 10. Draw Minute Hand (with accent tip)
  ctx.save();
  ctx.translate(CENTER_X, CENTER_Y);
  ctx.rotate(minuteAngle);
  ctx.beginPath();
  ctx.moveTo(0, HAND_TAIL_LENGTH);
  ctx.lineTo(0, -MINUTE_HAND_LENGTH);
  ctx.lineWidth = MINUTE_HAND_WIDTH;
  ctx.strokeStyle = palette.primaryText;
  ctx.lineCap = "round";
  ctx.stroke();

  // Minute Hand Accent Pip
  ctx.beginPath();
  ctx.arc(0, -MINUTE_HAND_LENGTH + 12, 3, 0, Math.PI * 2);
  ctx.fillStyle = palette.accentColor;
  ctx.fill();
  ctx.restore();

  // 11. Draw Center Pin / Hub Cap
  ctx.save();
  ctx.translate(CENTER_X, CENTER_Y);
  ctx.beginPath();
  ctx.arc(0, 0, CENTER_PIN_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = palette.primaryText;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, CENTER_PIN_INNER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = palette.accentColor;
  ctx.fill();
  ctx.restore();

  // Update DOM time display label
  updateDomTelemetry(now);
}

/**
 * Draws contextual telemetry widgets (Resolution, Battery, Timezone)
 */
function drawTelemetryAccents(palette, now) {
  ctx.save();
  ctx.font = `500 12px ${TEXT_FONT_FAMILY}`;
  ctx.fillStyle = palette.secondaryText;

  // Left Telemetry: Seeed reTerminal E1001 Model ID & Resolution
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("SEEED reTerminal E1001", 34, 30);
  ctx.fillText("800 × 480  •  7.5″ E-INK", 34, 48);

  // Right Telemetry: Timezone & Minute Sync Indicator
  const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone || "LOCAL";
  ctx.textAlign = "right";
  ctx.fillText(`TZ: ${tzName}`, CANVAS_WIDTH - 34, 30);
  
  // Power & Refresh Status
  ctx.fillText("REFRESH: 1 MIN  •  100% PWR", CANVAS_WIDTH - 34, 48);

  // Subtle bottom status bar
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.font = `400 11px ${TEXT_FONT_FAMILY}`;
  ctx.fillText("Continuous Low-Power Clock  •  Mascot: ChronoOwl", CENTER_X, CANVAS_HEIGHT - 20);
  ctx.restore();
}

/**
 * Synchronizes updates to trigger immediately upon the change of each minute (:00s)
 */
let minuteTimerId = null;
function scheduleMinuteBoundarySync() {
  if (minuteTimerId) clearTimeout(minuteTimerId);

  const now = new Date();
  const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 50;

  minuteTimerId = setTimeout(() => {
    renderClockScreen();
    // Subsequent updates run every 60 seconds
    setInterval(renderClockScreen, UPDATE_INTERVAL_SECONDS * 1000);
  }, msUntilNextMinute);
}

/**
 * Updates UI textual telemetry in the browser shell
 */
function updateDomTelemetry(now) {
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const liveTimeEl = document.getElementById('liveTimeText');
  if (liveTimeEl) liveTimeEl.textContent = timeStr;
  
  const paletteNameEl = document.getElementById('activePaletteName');
  if (paletteNameEl) paletteNameEl.textContent = getActivePalette().name;
}

// ============================================================================
// UI CONTROLS & EXPORT HELPERS
// ============================================================================
function setPalette(index) {
  activePaletteIndex = parseInt(index, 10) || 0;
  renderClockScreen();
}

function exportCanvasImage() {
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = `seeed_e1001_clock_${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function dismissOnboarding() {
  const modal = document.getElementById('onboardingModal');
  if (modal) modal.style.display = 'none';
}

function openOnboarding() {
  const modal = document.getElementById('onboardingModal');
  if (modal) modal.style.display = 'flex';
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  renderClockScreen();
  scheduleMinuteBoundarySync();

  // Palette selector dropdown / buttons
  const paletteSelector = document.getElementById('paletteSelect');
  if (paletteSelector) {
    paletteSelector.addEventListener('change', (e) => {
      setPalette(e.target.value);
    });
  }

  // Export button
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) exportBtn.addEventListener('click', exportCanvasImage);

  // Manual refresh sync button
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      renderClockScreen();
    });
  }
});
