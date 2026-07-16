// Demo study material. Stands in for the Neon/Drizzle-backed content API (AGENTS.md) so the
// dashboard → set-detail → flashcard flow is fully testable today. When the API lands, this module
// is the single seam to swap: screens import `useStudySets` / `getStudySet`, not the data.
//
// Coverage: the UK National Curriculum from Reception to Year 6 — three subjects per year group,
// each a full set with flashcards and an MCQ quiz. `yearCode` ("Rec".."Y6") matches the codes the
// add-child screen and `Child.yearGroup` use, so the dashboard can filter sets to the active child's
// year with `getStudySetsForYear`.

export type Flashcard = {
  id: string
  question: string
  answer: string
}

/** Multiple-choice quiz question (design/GoKid-quiz-screen.png, screen 8). `answer` indexes `options`. */
export type QuizQuestion = {
  id: string
  prompt: string
  options: string[]
  /** Index into `options` of the correct answer. */
  answer: number
  /** Optional illustration shown above the prompt (e.g. base-10 blocks). */
  illustration?: number
}

/** Mastery split for the set-detail bar — three percentages that sum to 100. */
export type Mastery = {
  learning: number
  getting: number
  mastered: number
}

export type SetStatus = "getting" | "learning"

export type StudySet = {
  id: string
  title: string
  subject: string
  topic: string
  /** Display label, e.g. "Year 3" / "Reception". */
  yearGroup: string
  /** Filter code — one of "Rec","Y1".."Y6". Matches `Child.yearGroup`. */
  yearCode: string
  /** Long blurb for the set-detail screen. */
  description: string
  /** Small rounded thumbnail (lesson list). */
  thumb: number
  /** Large illustration (set-detail hero + flashcard face). */
  hero: number
  status: SetStatus
  statusLabel: string
  cardsTotal: number
  /** Cards already reviewed — drives the "Continue" progress bar. */
  cardsDone: number
  minutes: number
  mastery: Mastery
  cards: Flashcard[]
  /** Demo MCQ quiz — powers the set → quiz → results flow. */
  quiz: QuizQuestion[]
  /** Topics the child has mastered / should revisit — shown on the results screen. */
  mastered: string[]
  revisit: string[]
}

// Image registry. Demo sets reference a key, not a `require` path, so authoring content never has to
// juggle asset filenames — keys map to the real bundled art here, one place to retarget. Reuse is
// intentional: the demo has more subjects than it has illustrations.
const IMG = {
  maths: require("../../assets/images/gokid-prog-maths.png"),
  english: require("../../assets/images/gokid-prog-english.png"),
  science: require("../../assets/images/gokid-subject-skeleton.png"),
  geo: require("../../assets/images/gokid-subject-globe.png"),
  geo2: require("../../assets/images/gokid-subject-mountain.png"),
  astro: require("../../assets/images/gokid-prog-astro.png"),
  scales: require("../../assets/images/gokid-prog-scales.png"),
  cube: require("../../assets/images/gokid-cube-stack.png"),
  blocks: require("../../assets/images/gokid-quiz-blocks.png"),
  skeleton: require("../../assets/images/gokid-flashcard-skeleton.png"),
  placevalue: require("../../assets/images/gokid-set-placevalue-hero.png"),
} as const

type ImgKey = keyof typeof IMG

/** A study set as authored — image slots as registry keys, resolved to `require`d numbers below. */
type RawSet = Omit<StudySet, "thumb" | "hero"> & { thumbKey: ImgKey; heroKey: ImgKey }

function resolve({ thumbKey, heroKey, ...rest }: RawSet): StudySet {
  return { ...rest, thumb: IMG[thumbKey], hero: IMG[heroKey] }
}

// The original hand-built Year 3 sets. Kept verbatim (they carry the quiz illustrations); the raw
// authoring form starts at RAW_EXTRA.
const CORE_SETS: StudySet[] = [
  {
    id: "place-value",
    title: "Place Value to 1,000",
    subject: "Maths",
    topic: "Number and place value",
    yearGroup: "Year 3",
    yearCode: "Y3",
    description:
      "Year 3 • Maths • Number and place value — recognise the place value of each digit in a three-digit number.",
    thumb: require("../../assets/images/gokid-subject-globe.png"),
    hero: require("../../assets/images/gokid-set-placevalue-hero.png"),
    status: "getting",
    statusLabel: "Getting it",
    cardsTotal: 20,
    cardsDone: 12,
    minutes: 15,
    mastery: { learning: 25, getting: 45, mastered: 30 },
    cards: [
      { id: "pv1", question: "In 452, what is the value of the 4?", answer: "400 — four hundreds." },
      { id: "pv2", question: "What is the value of the 7 in 379?", answer: "70 — seven tens." },
      { id: "pv3", question: "How many hundreds are in 1,000?", answer: "10 hundreds." },
      { id: "pv4", question: "Write 600 + 30 + 8 as one number.", answer: "638." },
      { id: "pv5", question: "Which is larger: 405 or 450?", answer: "450 — the tens digit is bigger." },
      { id: "pv6", question: "What is 10 more than 291?", answer: "301." },
    ],
    mastered: ["Place value", "Hundreds", "Number bonds"],
    revisit: ["Estimating", "Compare numbers"],
    quiz: [
      { id: "pvq1", prompt: "What is the value of the 4 in 452?", options: ["4", "40", "400", "4,000"], answer: 2, illustration: require("../../assets/images/gokid-quiz-blocks.png") },
      { id: "pvq2", prompt: "Which number is 100 more than 342?", options: ["432", "442", "352", "242"], answer: 1, illustration: require("../../assets/images/gokid-quiz-blocks.png") },
      { id: "pvq3", prompt: "Write 600 + 30 + 8 as one number.", options: ["6,308", "638", "683", "68"], answer: 1 },
      { id: "pvq4", prompt: "Which is larger?", options: ["405", "450", "Equal", "None"], answer: 1 },
      { id: "pvq5", prompt: "How many hundreds are in 1,000?", options: ["1", "10", "100", "1,000"], answer: 1 },
      { id: "pvq6", prompt: "What is 10 more than 291?", options: ["281", "292", "301", "391"], answer: 2 },
    ],
  },
  {
    id: "capital-cities",
    title: "Capital Cities of Europe",
    subject: "Geography",
    topic: "Europe",
    yearGroup: "Year 3",
    yearCode: "Y3",
    description:
      "Year 3 • Geography • Europe — match European countries to their capital cities and locate them on a map.",
    thumb: require("../../assets/images/gokid-subject-mountain.png"),
    hero: require("../../assets/images/gokid-subject-mountain.png"),
    status: "learning",
    statusLabel: "Learning",
    cardsTotal: 15,
    cardsDone: 4,
    minutes: 12,
    mastery: { learning: 55, getting: 30, mastered: 15 },
    cards: [
      { id: "cc1", question: "What is the capital of France?", answer: "Paris." },
      { id: "cc2", question: "What is the capital of Spain?", answer: "Madrid." },
      { id: "cc3", question: "What is the capital of Italy?", answer: "Rome." },
      { id: "cc4", question: "What is the capital of Germany?", answer: "Berlin." },
      { id: "cc5", question: "What is the capital of Portugal?", answer: "Lisbon." },
    ],
    mastered: ["France", "Spain", "Italy"],
    revisit: ["Scandinavia", "The Balkans"],
    quiz: [
      { id: "ccq1", prompt: "What is the capital of France?", options: ["Lyon", "Paris", "Nice", "Marseille"], answer: 1 },
      { id: "ccq2", prompt: "What is the capital of Spain?", options: ["Madrid", "Barcelona", "Seville", "Valencia"], answer: 0 },
      { id: "ccq3", prompt: "What is the capital of Italy?", options: ["Milan", "Naples", "Rome", "Turin"], answer: 2 },
      { id: "ccq4", prompt: "What is the capital of Germany?", options: ["Munich", "Hamburg", "Berlin", "Cologne"], answer: 2 },
      { id: "ccq5", prompt: "What is the capital of Portugal?", options: ["Porto", "Lisbon", "Faro", "Braga"], answer: 1 },
    ],
  },
  {
    id: "human-skeleton",
    title: "The Human Skeleton",
    subject: "Science",
    topic: "Humans",
    yearGroup: "Year 3",
    yearCode: "Y3",
    description:
      "Year 3 • Science • Humans — name the main bones of the body and explain what the skeleton does.",
    thumb: require("../../assets/images/gokid-subject-skeleton.png"),
    hero: require("../../assets/images/gokid-flashcard-skeleton.png"),
    status: "getting",
    statusLabel: "Getting it",
    cardsTotal: 20,
    cardsDone: 7,
    minutes: 15,
    mastery: { learning: 30, getting: 50, mastered: 20 },
    cards: [
      { id: "hs1", question: "What protects your heart and lungs?", answer: "The rib cage." },
      { id: "hs2", question: "What is the medical name for the skull?", answer: "The cranium." },
      { id: "hs3", question: "What is the longest bone in your body?", answer: "The femur (thigh bone)." },
      { id: "hs4", question: "What does the skeleton give your body?", answer: "Shape, support and protection." },
      { id: "hs5", question: "What is your backbone also called?", answer: "The spine (vertebral column)." },
    ],
    mastered: ["Rib cage", "Skull", "The femur"],
    revisit: ["Joints", "Muscles"],
    quiz: [
      { id: "hsq1", prompt: "What protects your heart and lungs?", options: ["The skull", "The rib cage", "The spine", "The pelvis"], answer: 1 },
      { id: "hsq2", prompt: "What is the medical name for the skull?", options: ["Cranium", "Femur", "Sternum", "Patella"], answer: 0 },
      { id: "hsq3", prompt: "What is the longest bone in your body?", options: ["Tibia", "Humerus", "Femur", "Radius"], answer: 2 },
      { id: "hsq4", prompt: "What is your backbone also called?", options: ["The cranium", "The spine", "The rib cage", "The pelvis"], answer: 1 },
    ],
  },
]

// Reception → Year 6 (excluding the Year 3 core above). Authored against the schema in
// scratchpad/curriculum-schema.md; image slots are registry keys resolved by `resolve`.
const RAW_EXTRA: RawSet[] = [
  // ---- Reception ----
  {
    id: "rec-numbers-to-10",
    title: "Numbers to 10",
    subject: "Maths",
    topic: "Number and place value",
    yearGroup: "Reception",
    yearCode: "Rec",
    description: "Reception • Maths • Number and place value — count and name numbers from 0 to 10.",
    thumbKey: "maths",
    heroKey: "placevalue",
    status: "getting",
    statusLabel: "Getting it",
    cardsTotal: 15,
    cardsDone: 6,
    minutes: 10,
    mastery: { learning: 40, getting: 40, mastered: 20 },
    cards: [
      { id: "rec-num-c1", question: "How many fingers are on one hand?", answer: "5" },
      { id: "rec-num-c2", question: "What number comes after 3?", answer: "4" },
      { id: "rec-num-c3", question: "What number comes before 2?", answer: "1" },
      { id: "rec-num-c4", question: "Count the dots: • • . How many?", answer: "2" },
      { id: "rec-num-c5", question: "Which number is bigger, 5 or 8?", answer: "8" },
      { id: "rec-num-c6", question: "How many toes are on two feet?", answer: "10" },
    ],
    quiz: [
      { id: "rec-num-q1", prompt: "How many dots? • •", options: ["1", "2", "3", "4"], answer: 1 },
      { id: "rec-num-q2", prompt: "What number comes after 6?", options: ["5", "6", "7", "8"], answer: 2 },
      { id: "rec-num-q3", prompt: "Which one is the number zero?", options: ["0", "1", "2", "3"], answer: 0 },
      { id: "rec-num-q4", prompt: "Count: 1, 2, 3, 4. How many?", options: ["3", "4", "5", "6"], answer: 1 },
      { id: "rec-num-q5", prompt: "What number comes before 10?", options: ["8", "9", "10", "11"], answer: 1 },
    ],
    mastered: ["Count to 5", "Say numbers 0 to 10", "Know 5 fingers on a hand"],
    revisit: ["Numbers after 7", "Which number is bigger"],
  },
  {
    id: "rec-letter-sounds",
    title: "Letter sounds (phonics)",
    subject: "English",
    topic: "Phonics",
    yearGroup: "Reception",
    yearCode: "Rec",
    description: "Reception • English • Phonics — hear and say the sound each letter makes.",
    thumbKey: "english",
    heroKey: "english",
    status: "learning",
    statusLabel: "Learning",
    cardsTotal: 16,
    cardsDone: 4,
    minutes: 9,
    mastery: { learning: 50, getting: 30, mastered: 20 },
    cards: [
      { id: "rec-let-c1", question: "What sound does the letter 's' make?", answer: "sss, like a snake" },
      { id: "rec-let-c2", question: "What is the first sound in 'cat'?", answer: "c, kuh" },
      { id: "rec-let-c3", question: "What sound does 'a' make in 'apple'?", answer: "a, ah" },
      { id: "rec-let-c4", question: "What is the first sound in 'dog'?", answer: "d, duh" },
      { id: "rec-let-c5", question: "What sound does the letter 'm' make?", answer: "mmm" },
      { id: "rec-let-c6", question: "What is the first sound in 'sun'?", answer: "s, sss" },
    ],
    quiz: [
      { id: "rec-let-q1", prompt: "Which word starts with the 'b' sound?", options: ["ball", "cat", "dog", "sun"], answer: 0 },
      { id: "rec-let-q2", prompt: "What is the first sound in 'fish'?", options: ["f", "i", "s", "h"], answer: 0 },
      { id: "rec-let-q3", prompt: "Which letter makes the 'mmm' sound?", options: ["s", "m", "t", "p"], answer: 1 },
      { id: "rec-let-q4", prompt: "Which word starts with the 't' sound?", options: ["apple", "tap", "sun", "dog"], answer: 1 },
      { id: "rec-let-q5", prompt: "Which letter hisses like a snake, 'sss'?", options: ["m", "s", "d", "a"], answer: 1 },
    ],
    mastered: ["Says the 's' sound", "Hears first sounds in words", "Knows 'm' says mmm"],
    revisit: ["Sound for the letter 'a'", "First sound in 'fish'"],
  },
  {
    id: "rec-plants-animals",
    title: "Plants and animals",
    subject: "Science",
    topic: "Living things",
    yearGroup: "Reception",
    yearCode: "Rec",
    description: "Reception • Science • Living things — name common plants and animals and spot what is alive.",
    thumbKey: "science",
    heroKey: "skeleton",
    status: "getting",
    statusLabel: "Getting it",
    cardsTotal: 14,
    cardsDone: 7,
    minutes: 11,
    mastery: { learning: 30, getting: 45, mastered: 25 },
    cards: [
      { id: "rec-pla-c1", question: "What do we call a baby dog?", answer: "A puppy" },
      { id: "rec-pla-c2", question: "Where do fish live?", answer: "In water" },
      { id: "rec-pla-c3", question: "What do plants need to grow?", answer: "Water and sunlight" },
      { id: "rec-pla-c4", question: "What do we call a baby cat?", answer: "A kitten" },
      { id: "rec-pla-c5", question: "Which part of a plant is under the ground?", answer: "The roots" },
      { id: "rec-pla-c6", question: "Is a tree a plant or an animal?", answer: "A plant" },
    ],
    quiz: [
      { id: "rec-pla-q1", prompt: "Which one is an animal?", options: ["Rose", "Dog", "Tree", "Grass"], answer: 1 },
      { id: "rec-pla-q2", prompt: "What do plants need to grow?", options: ["Water and sun", "Toys", "Shoes", "Cars"], answer: 0 },
      { id: "rec-pla-q3", prompt: "Where does a fish live?", options: ["In a tree", "In water", "In the sky", "In a car"], answer: 1 },
      { id: "rec-pla-q4", prompt: "Which one is a plant?", options: ["Cat", "Bird", "Flower", "Fish"], answer: 2 },
      { id: "rec-pla-q5", prompt: "What do we call a baby cow?", options: ["Puppy", "Calf", "Kitten", "Chick"], answer: 1 },
    ],
    mastered: ["Names common animals", "Knows plants need water", "Baby animal names"],
    revisit: ["Parts of a plant", "Sorting plants and animals"],
  },
  // ---- Year 1 ----
  {
    id: "y1-add-subtract-20",
    title: "Addition and Subtraction to 20",
    subject: "Maths",
    topic: "Addition and subtraction",
    yearGroup: "Year 1",
    yearCode: "Y1",
    description: "Year 1 • Maths • Addition and subtraction — adding and taking away numbers within 20 using number bonds.",
    thumbKey: "maths",
    heroKey: "placevalue",
    status: "learning",
    statusLabel: "Learning",
    cardsTotal: 16,
    cardsDone: 6,
    minutes: 12,
    mastery: { learning: 50, getting: 30, mastered: 20 },
    cards: [
      { id: "y1-add-c1", question: "What is 7 + 5?", answer: "12" },
      { id: "y1-add-c2", question: "What is 14 - 6?", answer: "8" },
      { id: "y1-add-c3", question: "What two numbers make a bond to 10 with 3?", answer: "3 and 7" },
      { id: "y1-add-c4", question: "What is 9 + 9?", answer: "18" },
      { id: "y1-add-c5", question: "What is 20 - 4?", answer: "16" },
      { id: "y1-add-c6", question: "What sign means 'add'?", answer: "The plus sign (+)" },
    ],
    quiz: [
      { id: "y1-add-q1", prompt: "What is 8 + 6?", options: ["12", "13", "14", "15"], answer: 2 },
      { id: "y1-add-q2", prompt: "What is 15 - 7?", options: ["6", "7", "8", "9"], answer: 2 },
      { id: "y1-add-q3", prompt: "Which pair are a number bond to 10?", options: ["4 and 5", "6 and 4", "3 and 8", "2 and 9"], answer: 1 },
      { id: "y1-add-q4", prompt: "What is 11 + 4?", options: ["14", "15", "16", "17"], answer: 1 },
      { id: "y1-add-q5", prompt: "What is 20 - 10?", options: ["5", "10", "15", "20"], answer: 1 },
    ],
    mastered: ["Number bonds to 10", "Adding one more", "Counting on to add"],
    revisit: ["Subtracting across ten", "Adding two larger numbers"],
  },
  {
    id: "y1-common-words",
    title: "Common Exception Words",
    subject: "English",
    topic: "Word reading",
    yearGroup: "Year 1",
    yearCode: "Y1",
    description: "Year 1 • English • Word reading — reading and spelling tricky words that do not follow usual phonics rules.",
    thumbKey: "english",
    heroKey: "english",
    status: "getting",
    statusLabel: "Getting it",
    cardsTotal: 14,
    cardsDone: 3,
    minutes: 10,
    mastery: { learning: 60, getting: 25, mastered: 15 },
    cards: [
      { id: "y1-cw-c1", question: "How do you spell the word that means the opposite of 'yes'?", answer: "no" },
      { id: "y1-cw-c2", question: "How do you spell the word that sounds like 'sed'?", answer: "said" },
      { id: "y1-cw-c3", question: "How do you spell the tricky word 'they'?", answer: "t-h-e-y" },
      { id: "y1-cw-c4", question: "How do you spell the tricky word 'friend'?", answer: "f-r-i-e-n-d" },
      { id: "y1-cw-c5", question: "How do you spell the number word after zero, which sounds like 'wun'?", answer: "one" },
      { id: "y1-cw-c6", question: "How do you spell the word for asking about a place, which sounds like 'wear'?", answer: "where" },
    ],
    quiz: [
      { id: "y1-cw-q1", prompt: "Which is the correct spelling?", options: ["sed", "said", "sayd", "sedd"], answer: 1 },
      { id: "y1-cw-q2", prompt: "Which word is spelled correctly?", options: ["frend", "freind", "friend", "freend"], answer: 2 },
      { id: "y1-cw-q3", prompt: "Which is the correct spelling for the number after zero?", options: ["wun", "one", "won", "onne"], answer: 1 },
      { id: "y1-cw-q4", prompt: "Which word is a tricky common exception word?", options: ["cat", "the", "sit", "pin"], answer: 1 },
      { id: "y1-cw-q5", prompt: "Which is spelled correctly?", options: ["ther", "there", "thair", "theer"], answer: 1 },
    ],
    mastered: ["Reading 'the'", "Reading 'I'", "Reading 'he' and 'she'"],
    revisit: ["Spelling 'friend'", "Spelling 'said'"],
  },
  {
    id: "y1-seasons-weather",
    title: "Seasons and Weather",
    subject: "Science",
    topic: "Seasonal changes",
    yearGroup: "Year 1",
    yearCode: "Y1",
    description: "Year 1 • Science • Seasonal changes — observing the four seasons and everyday weather across the year.",
    thumbKey: "science",
    heroKey: "astro",
    status: "learning",
    statusLabel: "Learning",
    cardsTotal: 15,
    cardsDone: 5,
    minutes: 11,
    mastery: { learning: 45, getting: 35, mastered: 20 },
    cards: [
      { id: "y1-sea-c1", question: "How many seasons are there in a year?", answer: "Four" },
      { id: "y1-sea-c2", question: "Which season is the coldest, when it can snow?", answer: "Winter" },
      { id: "y1-sea-c3", question: "In which season do leaves fall from the trees?", answer: "Autumn" },
      { id: "y1-sea-c4", question: "Which season comes after spring?", answer: "Summer" },
      { id: "y1-sea-c5", question: "What do we call frozen rain that falls in winter?", answer: "Snow" },
      { id: "y1-sea-c6", question: "Which season is usually the warmest, with long sunny days?", answer: "Summer" },
    ],
    quiz: [
      { id: "y1-sea-q1", prompt: "How many seasons are there in a year?", options: ["Two", "Three", "Four", "Five"], answer: 2 },
      { id: "y1-sea-q2", prompt: "In which season do flowers begin to grow and lambs are born?", options: ["Spring", "Summer", "Autumn", "Winter"], answer: 0 },
      { id: "y1-sea-q3", prompt: "Which season is the coldest?", options: ["Spring", "Summer", "Autumn", "Winter"], answer: 3 },
      { id: "y1-sea-q4", prompt: "What should you wear on a rainy day?", options: ["Sun hat", "Waterproof coat", "Swimsuit", "Sunglasses"], answer: 1 },
      { id: "y1-sea-q5", prompt: "Which season comes just before winter?", options: ["Spring", "Summer", "Autumn", "None of these"], answer: 2 },
    ],
    mastered: ["Naming the four seasons", "Winter is cold", "Summer is warm"],
    revisit: ["Ordering the seasons", "Matching weather to the season"],
  },
  // ---- Year 2 ----
  {
    id: "y2-times-tables",
    title: "2, 5 and 10 Times Tables",
    subject: "Maths",
    topic: "Multiplication and division",
    yearGroup: "Year 2",
    yearCode: "Y2",
    description: "Year 2 • Maths • Multiplication and division — count in 2s, 5s and 10s and recall the tables.",
    thumbKey: "maths",
    heroKey: "placevalue",
    status: "learning",
    statusLabel: "Learning",
    cardsTotal: 16,
    cardsDone: 6,
    minutes: 12,
    mastery: { learning: 50, getting: 30, mastered: 20 },
    cards: [
      { id: "y2-tt-c1", question: "What is 2 × 5?", answer: "10" },
      { id: "y2-tt-c2", question: "Count in 5s: 5, 10, 15, … what number comes next?", answer: "20" },
      { id: "y2-tt-c3", question: "What is 10 × 3?", answer: "30" },
      { id: "y2-tt-c4", question: "What is 2 × 8?", answer: "16" },
      { id: "y2-tt-c5", question: "What is 5 × 4?", answer: "20" },
      { id: "y2-tt-c6", question: "How many 10s make 50?", answer: "5" },
    ],
    quiz: [
      { id: "y2-tt-q1", prompt: "What is 5 × 2?", options: ["7", "10", "12", "25"], answer: 1 },
      { id: "y2-tt-q2", prompt: "Count in 10s. What comes after 30?", options: ["31", "35", "40", "50"], answer: 2 },
      { id: "y2-tt-q3", prompt: "What is 2 × 6?", options: ["8", "10", "12", "16"], answer: 2 },
      { id: "y2-tt-q4", prompt: "What is 10 × 5?", options: ["15", "50", "55", "100"], answer: 1 },
      { id: "y2-tt-q5", prompt: "What is 5 × 3?", options: ["8", "15", "20", "35"], answer: 1 },
    ],
    mastered: ["Counting in 10s", "The 2 times table up to 2 × 5", "Recognising equal groups"],
    revisit: ["The 5 times table beyond 5 × 5", "Mixed 2, 5 and 10 questions"],
  },
  {
    id: "y2-word-classes",
    title: "Nouns, Verbs and Adjectives",
    subject: "English",
    topic: "Grammar and punctuation",
    yearGroup: "Year 2",
    yearCode: "Y2",
    description: "Year 2 • English • Grammar and punctuation — spot nouns, verbs and adjectives in sentences.",
    thumbKey: "english",
    heroKey: "english",
    status: "getting",
    statusLabel: "Getting it",
    cardsTotal: 14,
    cardsDone: 3,
    minutes: 10,
    mastery: { learning: 40, getting: 40, mastered: 20 },
    cards: [
      { id: "y2-wc-c1", question: "What is a noun?", answer: "A word for a person, place or thing, like 'dog' or 'school'." },
      { id: "y2-wc-c2", question: "What is a verb?", answer: "An action or doing word, like 'run' or 'jump'." },
      { id: "y2-wc-c3", question: "What is an adjective?", answer: "A word that describes a noun, like 'happy' or 'red'." },
      { id: "y2-wc-c4", question: "In 'The fluffy cat slept', which word is the adjective?", answer: "fluffy" },
      { id: "y2-wc-c5", question: "In 'She kicks the ball', which word is the verb?", answer: "kicks" },
      { id: "y2-wc-c6", question: "Is 'London' a noun, a verb or an adjective?", answer: "A noun — it is the name of a place." },
    ],
    quiz: [
      { id: "y2-wc-q1", prompt: "Which word is a noun?", options: ["quickly", "table", "jump", "shiny"], answer: 1 },
      { id: "y2-wc-q2", prompt: "Which word is a verb?", options: ["swim", "blue", "chair", "soft"], answer: 0 },
      { id: "y2-wc-q3", prompt: "Which word is an adjective?", options: ["run", "happy", "dog", "sing"], answer: 1 },
      { id: "y2-wc-q4", prompt: "In 'The big dog barks', which word is the adjective?", options: ["The", "big", "dog", "barks"], answer: 1 },
      { id: "y2-wc-q5", prompt: "In 'Birds fly high', which word is the verb?", options: ["Birds", "fly", "high", "the"], answer: 1 },
    ],
    mastered: ["Spotting nouns for things", "Naming action verbs", "Finding describing adjectives"],
    revisit: ["Adjectives placed before nouns", "Telling verbs and nouns apart"],
  },
  {
    id: "y2-habitats",
    title: "Living Things and Their Habitats",
    subject: "Science",
    topic: "Living things and their habitats",
    yearGroup: "Year 2",
    yearCode: "Y2",
    description: "Year 2 • Science • Living things and their habitats — how animals and plants suit where they live.",
    thumbKey: "science",
    heroKey: "skeleton",
    status: "learning",
    statusLabel: "Learning",
    cardsTotal: 15,
    cardsDone: 5,
    minutes: 11,
    mastery: { learning: 45, getting: 35, mastered: 20 },
    cards: [
      { id: "y2-hab-c1", question: "What is a habitat?", answer: "The natural home of an animal or plant." },
      { id: "y2-hab-c2", question: "Name a habitat where a fish lives.", answer: "In water — a pond, river or the sea." },
      { id: "y2-hab-c3", question: "What three things does a habitat give the animals that live there?", answer: "Food, water and shelter." },
      { id: "y2-hab-c4", question: "What is a micro-habitat? Give an example.", answer: "A very small habitat, like under a log or a stone." },
      { id: "y2-hab-c5", question: "Is a rock living, dead, or has it never been alive?", answer: "It has never been alive — it is not living." },
      { id: "y2-hab-c6", question: "Why does a polar bear have thick fur?", answer: "To keep it warm in its cold, icy habitat." },
    ],
    quiz: [
      { id: "y2-hab-q1", prompt: "Which animal lives in a pond habitat?", options: ["Camel", "Frog", "Polar bear", "Lion"], answer: 1 },
      { id: "y2-hab-q2", prompt: "What is a habitat?", options: ["A type of food", "The home of a living thing", "A kind of weather", "A baby animal"], answer: 1 },
      { id: "y2-hab-q3", prompt: "Which of these has never been alive?", options: ["A tree", "A rock", "A worm", "A daisy"], answer: 1 },
      { id: "y2-hab-q4", prompt: "A camel is best suited to which habitat?", options: ["The hot desert", "The cold Arctic", "The deep sea", "A rainforest river"], answer: 0 },
      { id: "y2-hab-q5", prompt: "What do all habitats give living things?", options: ["Toys", "Food and shelter", "Money", "Cars"], answer: 1 },
    ],
    mastered: ["Naming common habitats", "Knowing a habitat gives food and shelter", "Sorting living and non-living things"],
    revisit: ["Micro-habitats like under logs", "How animals suit their habitat"],
  },
  // ---- Year 4 ----
  {
    id: "y4-mult-div",
    title: "Multiplication and Division",
    subject: "Maths",
    topic: "Multiplication and division",
    yearGroup: "Year 4",
    yearCode: "Y4",
    description: "Year 4 • Maths • Multiplication and division — recall times tables to 12 and use formal written methods.",
    thumbKey: "maths",
    heroKey: "placevalue",
    status: "learning",
    statusLabel: "Learning",
    cardsTotal: 16,
    cardsDone: 6,
    minutes: 12,
    mastery: { learning: 40, getting: 35, mastered: 25 },
    cards: [
      { id: "y4-md-c1", question: "What is 7 × 8?", answer: "56" },
      { id: "y4-md-c2", question: "What is 9 × 6?", answer: "54" },
      { id: "y4-md-c3", question: "What is 12 × 12?", answer: "144" },
      { id: "y4-md-c4", question: "What is 63 ÷ 9?", answer: "7" },
      { id: "y4-md-c5", question: "In the written method, what is 24 × 3?", answer: "72" },
      { id: "y4-md-c6", question: "What is 96 ÷ 8?", answer: "12" },
    ],
    quiz: [
      { id: "y4-md-q1", prompt: "What is 6 × 7?", options: ["42", "36", "48", "13"], answer: 0 },
      { id: "y4-md-q2", prompt: "What is 8 × 4?", options: ["24", "32", "28", "36"], answer: 1 },
      { id: "y4-md-q3", prompt: "What is 56 ÷ 8?", options: ["6", "8", "7", "9"], answer: 2 },
      { id: "y4-md-q4", prompt: "What is 12 × 3?", options: ["36", "33", "39", "24"], answer: 0 },
      { id: "y4-md-q5", prompt: "What is 72 ÷ 9?", options: ["7", "9", "8", "6"], answer: 2 },
    ],
    mastered: ["2 times table", "5 times table", "10 times table"],
    revisit: ["7 times table", "Short division with remainders"],
  },
  {
    id: "y4-fronted-adverbials",
    title: "Fronted Adverbials and Punctuation",
    subject: "English",
    topic: "Fronted adverbials and punctuation",
    yearGroup: "Year 4",
    yearCode: "Y4",
    description: "Year 4 • English • Fronted adverbials and punctuation — open sentences with adverbials and use a comma after them.",
    thumbKey: "english",
    heroKey: "english",
    status: "getting",
    statusLabel: "Getting it",
    cardsTotal: 14,
    cardsDone: 3,
    minutes: 10,
    mastery: { learning: 50, getting: 30, mastered: 20 },
    cards: [
      { id: "y4-fa-c1", question: "What is a fronted adverbial?", answer: "A word or phrase at the start of a sentence that tells you how, when or where something happens." },
      { id: "y4-fa-c2", question: "What punctuation mark comes after a fronted adverbial?", answer: "A comma." },
      { id: "y4-fa-c3", question: "Add the missing punctuation: 'Later that day we went home.'", answer: "Later that day, we went home." },
      { id: "y4-fa-c4", question: "Name a fronted adverbial of place.", answer: "For example: 'In the garden,' or 'Under the bridge,'." },
      { id: "y4-fa-c5", question: "Turn this into a fronted adverbial sentence: 'She sang happily.'", answer: "Happily, she sang." },
      { id: "y4-fa-c6", question: "Does a fronted adverbial come at the start or end of a sentence?", answer: "At the start of the sentence." },
    ],
    quiz: [
      { id: "y4-fa-q1", prompt: "Which part is the fronted adverbial in 'After lunch, we played outside.'?", options: ["After lunch,", "played", "we", "outside"], answer: 0 },
      { id: "y4-fa-q2", prompt: "What punctuation should follow a fronted adverbial?", options: ["A comma", "A full stop", "A question mark", "An apostrophe"], answer: 0 },
      { id: "y4-fa-q3", prompt: "Which sentence is punctuated correctly?", options: ["Quietly, the cat crept upstairs.", "Quietly the cat crept upstairs.", "The cat, crept upstairs quietly.", "The cat crept, upstairs quietly."], answer: 0 },
      { id: "y4-fa-q4", prompt: "What does a fronted adverbial usually tell you?", options: ["How, when or where something happens", "Who owns something", "The name of a person", "How many there are"], answer: 0 },
      { id: "y4-fa-q5", prompt: "Which word is an adverbial of time?", options: ["Yesterday", "Happily", "Loudly", "Carefully"], answer: 0 },
    ],
    mastered: ["Spotting adverbs", "Using capital letters", "Ending sentences with full stops"],
    revisit: ["Comma after the adverbial", "Adverbials of place"],
  },
  {
    id: "y4-states-of-matter",
    title: "States of Matter",
    subject: "Science",
    topic: "States of matter",
    yearGroup: "Year 4",
    yearCode: "Y4",
    description: "Year 4 • Science • States of matter — compare solids, liquids and gases and explain evaporation.",
    thumbKey: "science",
    heroKey: "astro",
    status: "learning",
    statusLabel: "Learning",
    cardsTotal: 18,
    cardsDone: 9,
    minutes: 14,
    mastery: { learning: 30, getting: 40, mastered: 30 },
    cards: [
      { id: "y4-sm-c1", question: "What are the three states of matter?", answer: "Solids, liquids and gases." },
      { id: "y4-sm-c2", question: "What is evaporation?", answer: "When a liquid heats up and turns into a gas." },
      { id: "y4-sm-c3", question: "At what temperature does water freeze?", answer: "0 degrees Celsius." },
      { id: "y4-sm-c4", question: "What is it called when a gas cools and turns into a liquid?", answer: "Condensation." },
      { id: "y4-sm-c5", question: "Why can a liquid be poured but a solid cannot?", answer: "A liquid can flow and change shape, while a solid keeps its own fixed shape." },
      { id: "y4-sm-c6", question: "What happens to a solid, like ice, when it is heated?", answer: "It melts and turns into a liquid." },
    ],
    quiz: [
      { id: "y4-sm-q1", prompt: "Which of these is a solid?", options: ["Ice", "Water", "Steam", "Air"], answer: 0 },
      { id: "y4-sm-q2", prompt: "What happens to a liquid when it evaporates?", options: ["It turns into a gas", "It turns into a solid", "It freezes", "It stays the same"], answer: 0 },
      { id: "y4-sm-q3", prompt: "At what temperature does water freeze?", options: ["0°C", "100°C", "50°C", "10°C"], answer: 0 },
      { id: "y4-sm-q4", prompt: "What is it called when a gas turns into a liquid?", options: ["Condensation", "Evaporation", "Melting", "Freezing"], answer: 0 },
      { id: "y4-sm-q5", prompt: "Which process turns a solid into a liquid?", options: ["Melting", "Freezing", "Evaporation", "Condensation"], answer: 0 },
    ],
    mastered: ["Naming solids, liquids and gases", "Water freezes at 0°C", "Melting ice"],
    revisit: ["Evaporation and the water cycle", "Condensation"],
  },
  // ---- Year 5 ----
  {
    id: "y5-fractions",
    title: "Fractions",
    subject: "Maths",
    topic: "Fractions",
    yearGroup: "Year 5",
    yearCode: "Y5",
    description: "Year 5 • Maths • Fractions — equivalent fractions and adding and subtracting fractions.",
    thumbKey: "maths",
    heroKey: "placevalue",
    status: "learning",
    statusLabel: "Learning",
    cardsTotal: 16,
    cardsDone: 6,
    minutes: 12,
    mastery: { learning: 40, getting: 35, mastered: 25 },
    cards: [
      { id: "y5-fr-c1", question: "What is an equivalent fraction?", answer: "A fraction that has the same value as another, such as 1/2 and 2/4." },
      { id: "y5-fr-c2", question: "How do you make an equivalent fraction?", answer: "Multiply or divide the numerator and denominator by the same number." },
      { id: "y5-fr-c3", question: "What is 1/2 written with a denominator of 10?", answer: "5/10, because 1×5=5 and 2×5=10." },
      { id: "y5-fr-c4", question: "How do you add fractions with the same denominator?", answer: "Add the numerators and keep the denominator the same, so 1/5 + 2/5 = 3/5." },
      { id: "y5-fr-c5", question: "What is 3/4 − 1/4?", answer: "2/4, which simplifies to 1/2." },
      { id: "y5-fr-c6", question: "What must you do before adding fractions with different denominators?", answer: "Change them so they share a common denominator." },
    ],
    quiz: [
      { id: "y5-fr-q1", prompt: "Which fraction is equivalent to 1/2?", options: ["2/4", "1/3", "2/3", "3/4"], answer: 0 },
      { id: "y5-fr-q2", prompt: "What is 2/7 + 3/7?", options: ["5/14", "6/7", "5/7", "1/7"], answer: 2 },
      { id: "y5-fr-q3", prompt: "What is 5/6 − 2/6?", options: ["3/6", "7/6", "3/12", "2/6"], answer: 0 },
      { id: "y5-fr-q4", prompt: "Which fraction is equivalent to 3/9?", options: ["1/2", "1/3", "2/3", "3/6"], answer: 1 },
      { id: "y5-fr-q5", prompt: "To add 1/2 + 1/4, which common denominator works?", options: ["2", "3", "4", "5"], answer: 2 },
    ],
    mastered: ["Recognising equivalent fractions", "Adding fractions with the same denominator", "Subtracting fractions with the same denominator"],
    revisit: ["Finding a common denominator", "Simplifying fractions to their lowest terms"],
  },
  {
    id: "y5-rivers-mountains",
    title: "Rivers and Mountains",
    subject: "Geography",
    topic: "Rivers and mountains",
    yearGroup: "Year 5",
    yearCode: "Y5",
    description: "Year 5 • Geography • Rivers and mountains — how rivers flow to the sea and how mountains are formed.",
    thumbKey: "geo",
    heroKey: "geo2",
    status: "getting",
    statusLabel: "Getting it",
    cardsTotal: 14,
    cardsDone: 4,
    minutes: 10,
    mastery: { learning: 30, getting: 45, mastered: 25 },
    cards: [
      { id: "y5-rm-c1", question: "Where does a river begin?", answer: "At its source, which is often high up in hills or mountains." },
      { id: "y5-rm-c2", question: "What is the mouth of a river?", answer: "The place where a river flows into the sea, a lake, or another river." },
      { id: "y5-rm-c3", question: "What is a tributary?", answer: "A smaller river or stream that flows into a larger river." },
      { id: "y5-rm-c4", question: "How are many mountains formed?", answer: "When tectonic plates push together, the land is forced upwards into folds." },
      { id: "y5-rm-c5", question: "What is the highest mountain in the world?", answer: "Mount Everest, in the Himalayas." },
      { id: "y5-rm-c6", question: "What is erosion in a river?", answer: "When flowing water wears away rock and soil along the river's banks and bed." },
    ],
    quiz: [
      { id: "y5-rm-q1", prompt: "What is the start of a river called?", options: ["Mouth", "Source", "Bank", "Meander"], answer: 1 },
      { id: "y5-rm-q2", prompt: "A smaller stream that joins a river is called a...", options: ["Tributary", "Delta", "Estuary", "Valley"], answer: 0 },
      { id: "y5-rm-q3", prompt: "Which is the highest mountain on Earth?", options: ["Ben Nevis", "Snowdon", "Mount Everest", "Mont Blanc"], answer: 2 },
      { id: "y5-rm-q4", prompt: "Where does a river usually end its journey?", options: ["At the source", "At a mountain top", "At the mouth", "At a tributary"], answer: 2 },
      { id: "y5-rm-q5", prompt: "Mountains often form when tectonic plates...", options: ["Pull apart", "Push together", "Stay completely still", "Melt away"], answer: 1 },
    ],
    mastered: ["Naming the source and mouth of a river", "Identifying tributaries", "Knowing Mount Everest is the highest mountain"],
    revisit: ["Explaining how mountains are formed", "Understanding how rivers cause erosion"],
  },
  {
    id: "y5-earth-space",
    title: "Earth and Space",
    subject: "Science",
    topic: "Earth and space",
    yearGroup: "Year 5",
    yearCode: "Y5",
    description: "Year 5 • Science • Earth and space — the solar system and why we have day and night.",
    thumbKey: "science",
    heroKey: "astro",
    status: "learning",
    statusLabel: "Learning",
    cardsTotal: 18,
    cardsDone: 9,
    minutes: 14,
    mastery: { learning: 35, getting: 30, mastered: 35 },
    cards: [
      { id: "y5-es-c1", question: "How many planets are in our solar system?", answer: "Eight planets orbit the Sun." },
      { id: "y5-es-c2", question: "What is at the centre of our solar system?", answer: "The Sun, a star that all the planets orbit around." },
      { id: "y5-es-c3", question: "Why do we have day and night?", answer: "The Earth spins on its axis, so one side faces the Sun (day) while the other faces away (night)." },
      { id: "y5-es-c4", question: "How long does the Earth take to spin around once?", answer: "About 24 hours, which is one day." },
      { id: "y5-es-c5", question: "What orbits the Earth?", answer: "The Moon orbits the Earth." },
      { id: "y5-es-c6", question: "What shape are the Sun, Earth and Moon?", answer: "They are approximately spherical, like balls." },
    ],
    quiz: [
      { id: "y5-es-q1", prompt: "How many planets orbit our Sun?", options: ["Seven", "Eight", "Nine", "Ten"], answer: 1 },
      { id: "y5-es-q2", prompt: "What causes day and night?", options: ["The Sun moving around the Earth", "The Earth spinning on its axis", "The Moon blocking the Sun", "Clouds covering the Sun"], answer: 1 },
      { id: "y5-es-q3", prompt: "What is at the centre of the solar system?", options: ["The Earth", "The Moon", "The Sun", "Mars"], answer: 2 },
      { id: "y5-es-q4", prompt: "How long does one full spin of the Earth take?", options: ["1 hour", "12 hours", "24 hours", "365 days"], answer: 2 },
      { id: "y5-es-q5", prompt: "Which object orbits the Earth?", options: ["The Sun", "The Moon", "Mars", "Jupiter"], answer: 1 },
    ],
    mastered: ["Knowing the Sun is at the centre of the solar system", "Understanding that Earth spins to make day and night", "Naming the Moon as Earth's satellite"],
    revisit: ["Ordering the eight planets from the Sun", "Explaining the length of a day"],
  },
  // ---- Year 6 ----
  {
    id: "y6-ratio-proportion",
    title: "Ratio and Proportion",
    subject: "Maths",
    topic: "Ratio and proportion",
    yearGroup: "Year 6",
    yearCode: "Y6",
    description: "Year 6 • Maths • Ratio and proportion — simplify ratios, share amounts and scale quantities up and down.",
    thumbKey: "maths",
    heroKey: "placevalue",
    status: "learning",
    statusLabel: "Learning",
    cardsTotal: 16,
    cardsDone: 6,
    minutes: 12,
    mastery: { learning: 50, getting: 30, mastered: 20 },
    cards: [
      { id: "y6-rp-c1", question: "What does the ratio 2:3 mean?", answer: "For every 2 of the first quantity there are 3 of the second quantity." },
      { id: "y6-rp-c2", question: "Simplify the ratio 10:15.", answer: "2:3 — divide both parts by their common factor, 5." },
      { id: "y6-rp-c3", question: "In a class the ratio of boys to girls is 3:2. If there are 15 boys, how many girls are there?", answer: "10 girls — 15 ÷ 3 = 5, then 5 × 2 = 10." },
      { id: "y6-rp-c4", question: "What is a proportion?", answer: "A statement that two ratios are equal, for example 1:2 is the same proportion as 3:6." },
      { id: "y6-rp-c5", question: "A recipe for 4 people uses 200 g of rice. How much rice is needed for 6 people?", answer: "300 g — 200 ÷ 4 = 50 g per person, then 50 × 6 = 300 g." },
      { id: "y6-rp-c6", question: "How do you find 25% of 80?", answer: "25% is one quarter, so 80 ÷ 4 = 20." },
    ],
    quiz: [
      { id: "y6-rp-q1", prompt: "Simplify the ratio 6:9.", options: ["2:3", "3:2", "6:9", "1:2"], answer: 0 },
      { id: "y6-rp-q2", prompt: "The ratio of red to blue counters is 5:3. There are 15 red counters. How many blue counters are there?", options: ["6", "9", "25", "3"], answer: 1 },
      { id: "y6-rp-q3", prompt: "What is 20% of 150?", options: ["30", "20", "15", "300"], answer: 0 },
      { id: "y6-rp-q4", prompt: "A map scale is 1 cm to 5 km. How far in real life is a distance of 4 cm on the map?", options: ["9 km", "20 km", "1.25 km", "45 km"], answer: 1 },
      { id: "y6-rp-q5", prompt: "Two quantities are in proportion when...", options: ["their difference stays the same", "one is always bigger than the other", "their ratio stays the same", "they are both even numbers"], answer: 2 },
    ],
    mastered: ["Simplifying ratios by dividing both parts", "Sharing an amount in a given ratio", "Finding simple percentages of amounts"],
    revisit: ["Scaling recipes up and down", "Using scale factors on maps and drawings"],
  },
  {
    id: "y6-grammar-clauses",
    title: "Clauses and Punctuation",
    subject: "English",
    topic: "Grammar: clauses and punctuation",
    yearGroup: "Year 6",
    yearCode: "Y6",
    description: "Year 6 • English • Grammar: clauses and punctuation — spot main, subordinate and relative clauses and punctuate them for SATs.",
    thumbKey: "english",
    heroKey: "english",
    status: "getting",
    statusLabel: "Getting it",
    cardsTotal: 14,
    cardsDone: 4,
    minutes: 10,
    mastery: { learning: 40, getting: 45, mastered: 15 },
    cards: [
      { id: "y6-gc-c1", question: "What is a main (independent) clause?", answer: "A group of words with a subject and a verb that makes complete sense on its own, e.g. 'The dog barked.'" },
      { id: "y6-gc-c2", question: "What is a subordinate clause?", answer: "A clause that adds extra information but cannot stand alone as a sentence, e.g. 'because it was hungry'." },
      { id: "y6-gc-c3", question: "What is a relative clause?", answer: "A subordinate clause that describes a noun, usually starting with who, which, that, whose or where." },
      { id: "y6-gc-c4", question: "How do you punctuate a relative clause dropped into the middle of a sentence?", answer: "Use a pair of commas, e.g. 'My uncle, who lives in Leeds, is a chef.'" },
      { id: "y6-gc-c5", question: "What is a subordinating conjunction? Give two examples.", answer: "A word that starts a subordinate clause, such as because, although, when, if or while." },
      { id: "y6-gc-c6", question: "When can you use a semi-colon?", answer: "To join two closely related main clauses without a conjunction, e.g. 'It was late; we went home.'" },
    ],
    quiz: [
      { id: "y6-gc-q1", prompt: "Which sentence contains a relative clause?", options: ["The cat slept all day.", "The book, which was old, fell apart.", "She ran quickly to school.", "We ate our lunch outside."], answer: 1 },
      { id: "y6-gc-q2", prompt: "Which word is a subordinating conjunction?", options: ["and", "but", "although", "or"], answer: 2 },
      { id: "y6-gc-q3", prompt: "Which punctuation mark correctly joins two main clauses without a conjunction?", options: ["a comma", "a semi-colon", "a hyphen", "a bracket"], answer: 1 },
      { id: "y6-gc-q4", prompt: "In 'We stayed inside because it was raining', what type of clause is 'because it was raining'?", options: ["main clause", "subordinate clause", "relative clause", "noun phrase"], answer: 1 },
      { id: "y6-gc-q5", prompt: "Which sentence uses commas correctly around the relative clause?", options: ["My sister who is ten, likes art.", "My sister, who is ten likes art.", "My sister, who is ten, likes art.", "My sister who is ten likes art."], answer: 2 },
    ],
    mastered: ["Telling main clauses from subordinate clauses", "Identifying relative clauses and relative pronouns", "Using commas to mark clauses within a sentence"],
    revisit: ["Using semi-colons to link main clauses", "Choosing the right subordinating conjunction"],
  },
  {
    id: "y6-evolution",
    title: "Evolution and Inheritance",
    subject: "Science",
    topic: "Evolution and inheritance",
    yearGroup: "Year 6",
    yearCode: "Y6",
    description: "Year 6 • Science • Evolution and inheritance — how offspring inherit traits, adapt to habitats and change over generations.",
    thumbKey: "science",
    heroKey: "skeleton",
    status: "learning",
    statusLabel: "Learning",
    cardsTotal: 15,
    cardsDone: 9,
    minutes: 11,
    mastery: { learning: 55, getting: 25, mastered: 20 },
    cards: [
      { id: "y6-ev-c1", question: "What is inheritance?", answer: "The passing on of characteristics from parents to their offspring, such as eye colour or fur colour." },
      { id: "y6-ev-c2", question: "What is an adaptation?", answer: "A feature that helps a living thing survive in its environment, e.g. a polar bear's thick fur keeps it warm." },
      { id: "y6-ev-c3", question: "What is evolution?", answer: "The slow change in a species over many generations as better-adapted individuals survive and reproduce." },
      { id: "y6-ev-c4", question: "How do fossils give evidence for evolution?", answer: "They show what living things were like millions of years ago and how species have changed over time." },
      { id: "y6-ev-c5", question: "Why do offspring usually vary from their parents?", answer: "They inherit a mix of characteristics from both parents, so they are not identical to either one." },
      { id: "y6-ev-c6", question: "Who developed the theory of evolution by natural selection?", answer: "Charles Darwin, after studying animals such as the finches on the Galápagos Islands." },
    ],
    quiz: [
      { id: "y6-ev-q1", prompt: "What does 'inheritance' mean in science?", options: ["Getting money from family", "Passing characteristics from parents to offspring", "Changing your environment", "Learning a new skill"], answer: 1 },
      { id: "y6-ev-q2", prompt: "Which of these is an example of an adaptation?", options: ["A cactus's spines that reduce water loss", "A dog being trained to sit", "A tree losing a branch in a storm", "A rock rolling downhill"], answer: 0 },
      { id: "y6-ev-q3", prompt: "Fossils are best described as...", options: ["living animals today", "the remains or traces of things that lived long ago", "rocks with no history", "modern animal bones"], answer: 1 },
      { id: "y6-ev-q4", prompt: "Evolution takes place...", options: ["in a single day", "over many generations", "only in plants", "only inside a zoo"], answer: 1 },
      { id: "y6-ev-q5", prompt: "Which scientist is famous for the theory of evolution by natural selection?", options: ["Isaac Newton", "Charles Darwin", "Marie Curie", "Albert Einstein"], answer: 1 },
    ],
    mastered: ["Explaining how characteristics are inherited from parents", "Recognising adaptations that help survival", "Understanding how fossils provide evidence for evolution"],
    revisit: ["Linking adaptation to evolution over time", "Explaining why offspring vary from their parents"],
  },
]

export const STUDY_SETS: StudySet[] = [...CORE_SETS, ...RAW_EXTRA.map(resolve)]

export function getStudySet(id: string | undefined): StudySet | undefined {
  return STUDY_SETS.find((s) => s.id === id)
}

/** Sets for a child's year, by `yearCode` ("Rec".."Y6"). Empty array if the year has no demo content. */
export function getStudySetsForYear(yearCode: string | undefined): StudySet[] {
  if (!yearCode) return []
  return STUDY_SETS.filter((s) => s.yearCode === yearCode)
}

/** The set the "Continue" card resumes — the one with cards in progress. */
export const CONTINUE_SET = STUDY_SETS[0]
