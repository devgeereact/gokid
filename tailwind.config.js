const { colors } = require("./src/design/tokens")

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // 01. COLOURS
      colors,

      // 02. TYPOGRAPHY — families
      // Design system: SF Pro Rounded for headings, SF Pro Text for body.
      fontFamily: {
        // SF Pro Text is the system face, so "System" is it. There is no resolvable
        // family name for SF Pro Rounded — see components/rounded-heading.tsx.
        text: ["System"],
      },

      // 03. SPACING SYSTEM (8PT GRID)
      //
      // Declared in px on purpose. NativeWind's `rem` is 14 on native, not the 16 that
      // Tailwind's default rem-based scale assumes, so `h-14` would silently render at
      // 49pt instead of 56 and `px-12` at 42 instead of 48. Pinning px makes the design
      // system's grid mean what it says.
      spacing: {
        // Learning Calendar year grid. 31 day-swatches across one card row leave no room for the
        // grid's 4pt step — 2pt is the widest gutter that still fits a 31-day month. INFERRED;
        // below the design system's smallest step, and used nowhere else.
        0.5: "2px",
        1: "4px",
        2: "8px",
        3: "12px",
        4: "16px",
        5: "20px",
        6: "24px",
        7: "28px",
        8: "32px",
        9: "36px",
        10: "40px",
        11: "44px",
        12: "48px",
        14: "56px",
        16: "64px",
        20: "80px",
        24: "96px",
        28: "112px",
        // Clearance for the iOS 26 native floating tab bar (Study · Progress · Parent).
        //
        // Only a tab's *root* screen (study/index, progress/index) gets UIKit's automatic scroll
        // inset; screens pushed onto a tab's own Stack (session, set-result, achievements, the
        // pushed progress screens) do not, so they must pad their own scroll content past the bar
        // or its last row clips behind the floating pill when scrolled to the bottom. `pb-28`
        // (112px) was the hand-guessed value and measured ~one text line short on iPhone 17 /
        // iOS 26.5 — the clipping seen in the smoke test. 140px (= 35 × 4px, staying on the same
        // numeric 4pt step the rest of this scale uses) clears the pill plus the home-indicator
        // inset with headroom. Every pushed (tabs) screen uses `pb-35` so this is one value to tune.
        35: "140px",
        // Add-a-child fields. Text input measures 52pt tall on the reference; not on the
        // 8pt grid (48/56 bracket it), so pinned as an inferred step.
        13: "52px",
        // Children-manager rows. A 44pt avatar plus 14pt of breathing room top and bottom —
        // taller than the 56pt account rows on design/GoKid-parentcontent-screen.png because
        // those carry a 24pt symbol, not a face. Inferred; no reference covers this screen.
        18: "72px",
        // Who's-studying avatar disc. Fills the 166pt card with 23pt of wash above and below.
        // Inferred: the reference bleeds its art off the card edge and so sets no disc size.
        30: "120px",
      },

      // 02. TYPOGRAPHY — size / line-height pairs
      fontSize: {
        h1: ["34px", "40px"],
        h2: ["28px", "34px"],
        h3: ["22px", "28px"],
        "body-lg": ["17px", "24px"],
        body: ["15px", "22px"],
        caption: ["13px", "18px"],

        // Auth screen. The hero headline is H1's size at SF Pro Rounded's natural leading —
        // a point off the system's 34/40, and the tightest that does not shear the descenders
        // off the last line. The subtitle has no design-system equivalent; 21/25 is measured
        // off design/GoKid-auth-screen.png.
        display: ["34px", "41px"],
        subtitle: ["21px", "25px"],
        legal: ["15px", "18px"],

        // Add-a-child form field value (the "Rufus" input, "Add child" button label).
        // Measured ~20/24 off design/GoKid-addchild-screen.png — inferred; the system's
        // Body Large (17/24) is too small and H3 (22/28) too large.
        field: ["20px", "24px"],

        // Stat-tile label ("Time spent", "Cards studied", …). Measured ~11/14 off
        // design/GoKid-sectionsummary-screen.png — below the design system's Caption (13/18),
        // which is the smallest step it defines. Inferred: at 13px the two-word labels wrap and
        // the tile values stop baseline-aligning across the row.
        tile: ["11px", "14px"],

        // Emoji avatar glyph, sized to fill the add-a-child ring (~160pt) with padding.
        // Inferred — no design-system equivalent for an emoji face.
        avatar: ["64px", "72px"],
        // The rest of the emoji-glyph ladder. ChildAvatar measures its disc and picks the step
        // that leaves the glyph ~60-70% of the disc's width — an emoji is text, so unlike the
        // preset art it cannot scale with its container. Inferred, same as `avatar` above.
        "avatar-md": ["44px", "48px"],
      },

      // 02. TYPOGRAPHY — tracking
      // Certificate Earned eyebrow ("CERTIFICATE OF ACHIEVEMENT") and seal ribbon ("GOLD"). INFERRED:
      // the design system sets no letter-spacing, but the certificate on
      // design/GoKid-congratulations-screen.png letterspaces its "WELL DONE!" caps. These are the two
      // steps that reproduce it — wider on the long eyebrow, tighter inside the ribbon pill.
      letterSpacing: {
        eyebrow: "2px",
        ribbon: "1px",
      },

      // 04. RADIUS
      borderRadius: {
        // Learning Calendar heat swatches — the year grid's 8pt day cells and the legend's 12pt
        // chips. INFERRED: the design system's smallest radius is `sm` (8px), which on a 12pt box
        // is a circle. 3px keeps them reading as squares at that size.
        xs: "3px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "26px",
        "2xl": "28px",
        // Auth buttons. Corner profile in the mock fits a ~20.7px circular radius;
        // none of the design-system chips match.
        button: "20px",
        // Who's-studying child / add-child cards. ~20px corner measured off
        // design/GoKid-whoisstudying-screen.png — inferred; between the system's lg (16)
        // and xl (26).
        card: "20px",
      },

      // 04. ELEVATION (iOS style soft shadows)
      boxShadow: {
        subtle: "0 1px 2px rgba(28,27,26,0.05)",
        elevated: "0 4px 12px rgba(28,27,26,0.08)",
        floating: "0 12px 24px rgba(28,27,26,0.12)",
      },

      // Brand artwork intrinsic sizes, measured from design/GoKid-splash-screen.png
      width: {
        wordmark: "297px",
        lion: "303px",
        // Add-a-child avatar. Cropped square (fox circle + camera badge) measures ~160pt
        // on design/GoKid-addchild-screen.png.
        avatar: "160px",
        // Study dashboard "Continue" card cube illustration — cropped 352×283 off the
        // reference; sits ~132pt wide on the card (inferred).
        cube: "132px",
      },
      height: {
        wordmark: "104px",
        lion: "318px",
        avatar: "160px",
        // Who's-studying cards. Each child / add-child tile measures ~166pt tall on
        // design/GoKid-whoisstudying-screen.png — inferred (off the 8pt grid).
        card: "166px",
        // Study dashboard cube illustration height (keeps the 346×277 crop's aspect).
        cube: "106px",
      },

      // Auth hero illustration, cropped full-bleed from design/GoKid-auth-screen.png
      aspectRatio: {
        hero: "853 / 590",
      },
    },
  },
  plugins: [],
}
