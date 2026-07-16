// Single source of truth for design tokens.
//
// tailwind.config.js consumes this so `className` utilities exist, and TypeScript
// consumes it for the handful of native props that take a colour value rather than a
// style (expo-symbols `tintColor`, expo-image placeholders, …). Never inline a hex.

/** 01. COLOURS — design/GoKid-design-system.png */
const colors = {
  primary: "#0E7C7B",
  accent: "#F5A524",
  success: "#3BAA6D",
  error: "#E8695E",
  ink: "#1C1B1A",
  "text-secondary": "#6E6A65",
  border: "#E6E2DD",
  background: "#FBF9F6",
  white: "#FFFFFF",
  subject: {
    maths: "#E6F3FF",
    english: "#FFECE2",
    science: "#E8F7EE",
    geography: "#E6E4F8",
    history: "#FFF3DA",
  },
  // Who's-studying child cards — softer tints than the subject swatches above.
  // Sampled from design/GoKid-whoisstudying-screen.png (the design system PNG does not
  // define these): each child card carries a pale wash behind the animal illustration,
  // and the "Add a child" tile has a mint plus-disc inside a muted-teal dashed border.
  card: {
    // Matched to the sampled edge of the cropped animal art so the tile wash seams into
    // the illustration with no visible boundary.
    amara: "#EFECF5", // lavender wash (Amara / elephant)
    rufus: "#FEF2DF", // cream wash (Rufus / fox)
    add: "#E5ECE7", // mint plus-disc
    dash: "#CFDDDD", // dashed border stroke
  },
  // Study dashboard (design/GoKid-studydashboard-screen.png, screen 5). Sampled from the
  // reference — the design-system PNG doesn't define these.
  study: {
    wash: "#DBEDE9", // "Continue" card mint wash (a soft top→bottom gradient in the ref; flattened)
    teal: "#017880", // "Carry on" button + progress fill (deeper than primary #0E7C7B)
    track: "#A9D2CD", // progress-bar track on the mint card
    lesson: "#FFFFFF", // "Ready for you" lesson card fill (white on the cream page)
  },
  // Lesson status pills — "Getting it" (green) / "Learning" (amber). Sampled off the
  // reference; near the design system's success/accent but not identical.
  status: {
    getting: "#55A158",
    learning: "#F79D0E",
  },
  // Quiz question (design/GoKid-quiz-screen.png, screen 8). Sampled off the reference —
  // not in the design-system PNG.
  quiz: {
    card: "#FCF4E7", // base-10 blocks illustration peach wash
    option: "#FEFDF9", // idle answer card fill (near-white on the cream page)
    "option-sel": "#EEF6F1", // selected answer mint wash
    chip: "#EDE9E4", // idle A/B/C/D letter disc
  },
  // Offline / sync hero sky (design/GoKid-offlinesync-screen.png, screen 14). Sampled.
  offline: {
    sky: "#E5F3F9",
  },
  // Parent-content curriculum badges (design/GoKid-parentcontent-screen.png, screen 12). Sampled —
  // pale fills with a saturated ink, distinct from the study status pills.
  badge: {
    strong: "#CDE9D1",
    "strong-ink": "#2E7D45",
    practice: "#F6D79A",
    "practice-ink": "#863A04",
  },
  // Gamification / stats surfaces — study session, answer result, set results, session summary,
  // achievements, progress overview and subject progress (design screens 15–23). Sampled off those
  // references; the design-system PNG predates them, so these are inferred. Solid tints + matching
  // pale "-wash" tile fills; difficulty maps to easy=success, medium=accent, hard=error (reused).
  gamify: {
    purple: "#8B5CF6",
    "purple-wash": "#EDE9FE",
    blue: "#3B82F6",
    "blue-wash": "#DBEAFE",
    flame: "#F97316",
    "flame-wash": "#FFEDD5",
    green: "#3BAA6D",
    "green-wash": "#DCFCE7",
    "amber-wash": "#FEF3C7",
    "red-wash": "#FEE2E2",
    // Neutral stat-tile fill + progress-track grey used across the dashboards.
    tile: "#F5F7F5",
    track: "#EDEBE7",
  },
}

module.exports = { colors }
