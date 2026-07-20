import { relations } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

/**
 * Postgres schema (AGENTS.md — "Schema lives in src/db/schema.ts"). Modelled directly on the shapes
 * the client already uses so the migration is a lift, not a redesign: `children` mirrors
 * `lib/children.ts`'s `Child`, `reviews`/`sessions` mirror `lib/reviews.ts`, `study_sets`/`cards`/
 * `quiz_questions` mirror `lib/study.ts`, `certificates` mirrors `lib/rewards.ts`, and `subscriptions`
 * is the entitlement record the paywall needs but the app has never had.
 *
 * This runs SERVER-SIDE ONLY (route handlers / Inngest — AGENTS.md). It is imported by the API layer
 * and drizzle-kit, never by a screen, so nothing here reaches the Expo bundle.
 *
 * Nothing in the app imports this yet: it is the backend foundation. The client `lib/*` seams stay on
 * their demo data until a live database and API exist to point them at — flipping them before then
 * would break the running app.
 */

// --- Enums -----------------------------------------------------------------------------------------

/** Matches `Avatar["kind"]` in lib/children.ts. */
export const avatarKind = pgEnum("avatar_kind", ["preset", "emoji", "image"])
/** Matches `MixedQuestion["kind"]` in lib/study.ts. */
export const quizKind = pgEnum("quiz_kind", ["mcq", "multi", "fill", "order", "match"])
/**
 * Publication state of a question. AI-generated questions land as `draft` and are invisible to
 * children until a human moves them to `published`; `rejected` keeps a bad generation out of the
 * pool without deleting the evidence. The hand-authored seed is `published` from the start.
 */
export const questionStatus = pgEnum("question_status", ["draft", "published", "rejected"])
/** Matches `Rating` in lib/reviews.ts. */
export const rating = pgEnum("rating", ["tricky", "gotit"])
/** Matches `Certificate["tier"]` in lib/rewards.ts. */
export const certTier = pgEnum("cert_tier", ["Gold", "Silver", "Bronze"])
/** Entitlement state, driven by RevenueCat. `none` = free tier. */
export const subStatus = pgEnum("sub_status", ["none", "trialing", "active", "expired"])

// --- Content (shared across all users) -------------------------------------------------------------

/**
 * A single England National Curriculum objective — the topic skeleton questions are generated
 * against (Rec–Y6). These are *learning objectives* ("count to 100 forwards and backwards"), not
 * questions: they are the free, public part of the curriculum and the prompt spine for AI
 * generation. A generated question carries the `id` of the objective it was written to test, so the
 * pool for a topic can be grown objective-by-objective and coverage is auditable.
 */
export const curriculumObjectives = pgTable(
  "curriculum_objectives",
  {
    id: text("id").primaryKey(),
    subject: text("subject").notNull(),
    /** "Rec".."Y6" — matches children.yearCode. */
    yearCode: text("year_code").notNull(),
    topic: text("topic").notNull(),
    /** The NC reference where one exists (e.g. "Ma3/2.1a"); free-form otherwise. */
    code: text("code"),
    /** The objective text, verbatim from the published curriculum. */
    statement: text("statement").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("objectives_year_subject_idx").on(t.yearCode, t.subject),
    index("objectives_topic_idx").on(t.topic),
  ]
)

/** A study set. `id` keeps the current string ids ("place-value") so existing links stay valid. */
export const studySets = pgTable(
  "study_sets",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    subject: text("subject").notNull(),
    topic: text("topic").notNull(),
    /** "Rec".."Y6" — matches children.yearCode. */
    yearCode: text("year_code").notNull(),
    description: text("description").notNull(),
    minutes: integer("minutes").notNull().default(0),
    /** Topics the set attests / suggests revisiting — the results screen chips. */
    mastered: jsonb("mastered").$type<string[]>().notNull().default([]),
    revisit: jsonb("revisit").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("study_sets_year_idx").on(t.yearCode), index("study_sets_subject_idx").on(t.subject)]
)

/** A flashcard belonging to a set. `cardsTotal` is derived from the count of these — never stored. */
export const cards = pgTable(
  "cards",
  {
    id: text("id").primaryKey(),
    setId: text("set_id")
      .notNull()
      .references(() => studySets.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    /** Order within the set. */
    position: integer("position").notNull().default(0),
  },
  (t) => [index("cards_set_idx").on(t.setId)]
)

/**
 * A quiz question. The type-specific fields (options/answer, answers, accept, items, pairs) vary by
 * `kind`, so they live in one `payload` JSONB shaped exactly like `MixedQuestion`'s per-kind extras —
 * the API validates it against that union on the way in.
 */
export const quizQuestions = pgTable(
  "quiz_questions",
  {
    id: text("id").primaryKey(),
    setId: text("set_id")
      .notNull()
      .references(() => studySets.id, { onDelete: "cascade" }),
    kind: quizKind("kind").notNull(),
    prompt: text("prompt").notNull(),
    explanation: text("explanation"),
    topic: text("topic"),
    /** Per-kind answer data — see MixedQuestion in lib/study.ts. */
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    /** True for the richer `mixedQuiz`; false for a plain study-session MCQ. Keeps the two apart the
     *  way the client does (a session must never receive a non-MCQ question). */
    mixed: boolean("mixed").notNull().default(false),
    position: integer("position").notNull().default(0),
    /**
     * Publication state. Defaults to `published` so the existing hand-authored seed keeps serving
     * unchanged; the AI generator writes `draft` explicitly, so nothing generated reaches a child
     * before review. The serving endpoint filters on this.
     */
    status: questionStatus("status").notNull().default("published"),
    /** The curriculum objective this question was generated to test. Null for the legacy seed. */
    objectiveId: text("objective_id").references(() => curriculumObjectives.id, {
      onDelete: "set null",
    }),
    /** 1 (easiest) .. 3 (hardest). Lets a session mix difficulty rather than serve one band. */
    difficulty: integer("difficulty").notNull().default(1),
    /** How the question entered the pool — "seed" for the hand-authored set, "ai" for generated. */
    source: text("source").notNull().default("seed"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("quiz_set_idx").on(t.setId),
    // The serving query is "published questions for this set" — a partial-ish composite keeps it fast
    // as the generated pool grows into the thousands.
    index("quiz_set_status_idx").on(t.setId, t.status),
    index("quiz_objective_idx").on(t.objectiveId),
  ]
)

// --- Per-family data -------------------------------------------------------------------------------

/**
 * A child profile, owned by a Clerk parent user. Replaces the Clerk `unsafeMetadata` store the app
 * uses today; `clerkUserId` is the parent, indexed because every list is "this parent's children".
 */
export const children = pgTable(
  "children",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").notNull(),
    /**
     * The id this child has on the device — children are created client-side into Clerk
     * `unsafeMetadata` and carry a locally generated id (see lib/children.ts). Progress sync needs a
     * stable way to say "this device's child Jacob is that row", and re-keying the whole app onto
     * server uuids would mean migrating live profiles for no user-visible gain. Unique per parent, so
     * a lookup by (clerkUserId, clientId) is also the authorisation check: a parent can only ever
     * reach their own children, whatever id they send.
     */
    clientId: text("client_id"),
    name: text("name").notNull(),
    /** "Rec".."Y6". */
    yearCode: text("year_code").notNull(),
    birthMonth: text("birth_month").notNull(),
    birthYear: text("birth_year").notNull(),
    avatarKind: avatarKind("avatar_kind").notNull().default("preset"),
    /** Preset name, emoji, or image URL depending on `avatarKind`. */
    avatarValue: text("avatar_value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("children_parent_idx").on(t.clerkUserId),
    uniqueIndex("children_parent_client_idx").on(t.clerkUserId, t.clientId),
  ]
)

/**
 * Spaced-repetition state — one row per (child, card). Mirrors `ReviewCard` in lib/reviews.ts; the
 * Leitner box + due date are exactly what the client computes today, moved server-side so a child's
 * schedule follows them across devices.
 */
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    setId: text("set_id").notNull(),
    cardId: text("card_id").notNull(),
    /** Index into the interval ladder [1,5,12,30,90] days. */
    box: integer("box").notNull().default(0),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    lastRating: rating("last_rating").notNull(),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // One SRS row per card per child — the client keys on `${setId}:${cardId}`.
    uniqueIndex("reviews_child_card_idx").on(t.childId, t.setId, t.cardId),
    // "Coming back soon" queries sort a child's cards by due date.
    index("reviews_due_idx").on(t.childId, t.dueAt),
  ]
)

/**
 * One row per (child, question) the moment it is served — the no-repeat ledger.
 *
 * The product rule is "a child must not see the same question twice within 12 hours", so that a
 * right answer means recall, not memory of the last screen. The serving endpoint writes an
 * impression as it hands a question out, and excludes any question whose most recent impression for
 * this child is under 12h old. When the whole eligible pool has been seen inside the window it
 * re-serves the *oldest-seen* question rather than blocking practice (product decision), so this is
 * an upsert keyed on (child, question): one row per pairing, `servedAt` bumped on each serve.
 */
export const questionImpressions = pgTable(
  "question_impressions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => quizQuestions.id, { onDelete: "cascade" }),
    setId: text("set_id").notNull(),
    servedAt: timestamp("served_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Upsert target: at most one impression row per (child, question).
    uniqueIndex("impressions_child_question_idx").on(t.childId, t.questionId),
    // The serving query filters "this child's impressions in this set, newest first".
    index("impressions_child_set_served_idx").on(t.childId, t.setId, t.servedAt),
  ]
)

/** A finished study/quiz session — the study-history rows. Mirrors `SessionRecord`. */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /**
     * The id this session has on the device. Client sessions are created offline with locally
     * generated ids (`lib/reviews.ts`), which are not UUIDs — inserting one into the `id` column
     * fails outright, so sync needs its own key. This is also the deduplication key: replaying a
     * batch after a dropped connection must not insert the same study session twice, which would
     * silently inflate every time figure in the Progress section.
     */
    clientId: text("client_id"),
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    setId: text("set_id").notNull(),
    setTitle: text("set_title").notNull(),
    subject: text("subject").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    cardsReviewed: integer("cards_reviewed").notNull().default(0),
    minutes: integer("minutes").notNull().default(0),
    /** Present when the session ended in a quiz. */
    score: integer("score"),
    scoreTotal: integer("score_total"),
  },
  (t) => [
    index("sessions_child_at_idx").on(t.childId, t.at),
    uniqueIndex("sessions_child_client_idx").on(t.childId, t.clientId),
  ]
)

/** A certificate earned by finishing a set. Mirrors `Certificate`; `issuedAt` is the real earn time
 *  (the client showing "today" was a stand-in for this). */
export const certificates = pgTable(
  "certificates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    setId: text("set_id").notNull(),
    tier: certTier("tier").notNull().default("Gold"),
    reference: text("reference").notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("certificates_child_set_idx").on(t.childId, t.setId)]
)

/**
 * Subscription entitlement, keyed by the Clerk parent user. Written by a RevenueCat webhook; read by
 * the API to decide `isPro`. This is the record the paywall has always implied and never had — no
 * feature is truly gated until this drives access.
 */
export const subscriptions = pgTable("subscriptions", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  status: subStatus("status").notNull().default("none"),
  /** e.g. "monthly" / "annual" — null on the free tier. */
  plan: text("plan"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  /** RevenueCat app-user id, for reconciliation. */
  revenuecatId: text("revenuecat_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// --- Relations (for the query API) -----------------------------------------------------------------

/**
 * A report that a card is wrong (design/gokid-screens.md §5 → "Report Incorrect Card").
 *
 * This matters more here than in most apps: a flashcard that teaches a child the wrong answer does
 * real damage, and reinforces it on the spaced-repetition schedule until someone catches it. The
 * reporting path has to reach a human, so reports land in the database rather than only in Sentry.
 *
 * Deliberately stores no child identifier. Knowing *who* reported a card adds nothing to fixing it,
 * and the whole point of this app's data posture is not to collect what it does not need. `setId` is
 * kept alongside `cardId` so a report is still triageable if the card is later deleted.
 */
export const cardReports = pgTable(
  "card_reports",
  {
    id: text("id").primaryKey(),
    cardId: text("card_id").notNull(),
    setId: text("set_id").notNull(),
    /** One of the offered reasons — free text is not accepted from a child-facing screen. */
    reason: text("reason").notNull(),
    /** Optional detail, typed by a parent or older child. Length-capped by the API route. */
    detail: text("detail"),
    /** "open" until someone triages it. */
    status: text("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("card_reports_status_idx").on(t.status), index("card_reports_card_idx").on(t.cardId)]
)

export const studySetsRelations = relations(studySets, ({ many }) => ({
  cards: many(cards),
  quizQuestions: many(quizQuestions),
}))

export const cardsRelations = relations(cards, ({ one }) => ({
  set: one(studySets, { fields: [cards.setId], references: [studySets.id] }),
}))

export const quizQuestionsRelations = relations(quizQuestions, ({ one, many }) => ({
  set: one(studySets, { fields: [quizQuestions.setId], references: [studySets.id] }),
  objective: one(curriculumObjectives, {
    fields: [quizQuestions.objectiveId],
    references: [curriculumObjectives.id],
  }),
  impressions: many(questionImpressions),
}))

export const curriculumObjectivesRelations = relations(curriculumObjectives, ({ many }) => ({
  questions: many(quizQuestions),
}))

export const questionImpressionsRelations = relations(questionImpressions, ({ one }) => ({
  child: one(children, { fields: [questionImpressions.childId], references: [children.id] }),
  question: one(quizQuestions, {
    fields: [questionImpressions.questionId],
    references: [quizQuestions.id],
  }),
}))

export const childrenRelations = relations(children, ({ many }) => ({
  reviews: many(reviews),
  sessions: many(sessions),
  certificates: many(certificates),
  impressions: many(questionImpressions),
}))

export const reviewsRelations = relations(reviews, ({ one }) => ({
  child: one(children, { fields: [reviews.childId], references: [children.id] }),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  child: one(children, { fields: [sessions.childId], references: [children.id] }),
}))

export const certificatesRelations = relations(certificates, ({ one }) => ({
  child: one(children, { fields: [certificates.childId], references: [children.id] }),
}))
