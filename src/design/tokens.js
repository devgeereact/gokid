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
    // INFERRED — the design system tints five subjects; the Subject Hub (design/gokid-screens.md
    // §4) needs ten. Mixed to the same recipe as the five above (very pale, ~L*95, warm-leaning)
    // and hue-separated from them so no two subject hubs read as the same colour.
    computing: "#E4F1F2",
    art: "#FBE8F0",
    music: "#F1E9FB",
    languages: "#E9F2E4",
    re: "#FDECE6",
  },
  // Subject Hub accents — the saturated ink that pairs with each `subject.*` wash above (strand
  // icon tint, ring stroke, "Explore" chevrons). INFERRED: the design system defines the washes
  // only, so each of these is the same hue pushed to ~L*45 for AA text contrast on white.
  "subject-ink": {
    maths: "#1F6FB2",
    english: "#B4552A",
    science: "#2E7D45",
    geography: "#5B4FBE",
    history: "#8A6212",
    computing: "#0E7C7B",
    art: "#B03D74",
    music: "#7048B6",
    languages: "#4F7A32",
    re: "#C2593A",
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
    // Per-child washes. The reference only draws two children, so it only defines two tints
    // (amara/rufus above) — a third child would repeat a wash. These extend that idea to seven,
    // one per year group, so no two cards collide on a full Reception→Year 6 household.
    // INFERRED: `lavender` and `cream` are the two sampled tints re-used under neutral names;
    // the other five are hand-mixed to the same recipe (very pale, warm-leaning, ~L*94 so the
    // ink and secondary text keep their contrast on the cream #FBF9F6 page).
    wash: {
      lavender: "#EFECF5",
      cream: "#FEF2DF",
      mint: "#E4F1E9",
      sky: "#E6F0FA",
      blush: "#FBEAEA",
      peach: "#FDEDE1",
      sage: "#ECF1E6",
    },
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
  // Certificate Earned (design/gokid-screens.md §9). INFERRED — no mockup covers this screen. The
  // only certificate artwork in the design set is the "WELL DONE!" card the child holds on
  // design/GoKid-congratulations-screen.png; `paper`, `frame`, `rule` and `seal` are sampled off
  // that card (warm ivory sheet, gold rosette ribbon), and `ink` is the design system's amber
  // (`accent`) pushed to ~L*40 so the "Certificate of Achievement" eyebrow keeps AA on the paper.
  cert: {
    paper: "#FFFDF6",
    frame: "#E7C77A",
    rule: "#F0E2C2",
    seal: "#F5A524",
    ink: "#8A6212",
  },
  // Learning Calendar heat ramp (design/gokid-screens.md §8). INFERRED — no mockup covers this
  // screen, and the design system defines no sequential scale. Five steps interpolated between the
  // dashboards' rest grey (`gamify.track`) and the study teal (`study.teal`) already used for every
  // progress fill, so a heavier day reads as "more of the same teal" rather than a new hue. Steps
  // are spaced on lightness, not evenly on the hex, so 1→2 and 3→4 are equally legible.
  calendar: {
    heat0: "#EDEBE7",
    heat1: "#CFE6E3",
    heat2: "#94C9C4",
    heat3: "#4EA39F",
    heat4: "#017880",
  },
}

module.exports = { colors }
