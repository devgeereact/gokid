import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  DAY_MS,
  dueCardCountAt,
  dueDateFor,
  dueLabelAt,
  INTERVALS_DAYS,
  masterySplit,
  MAX_BOX,
  mergeProgress,
  minutesTodayAt,
  nextDueLabelAt,
  recentActivityAt,
  type ReviewCard,
  schedule,
  type SessionRecord,
} from "../review-schedule"

/**
 * The spaced-repetition engine decides when every card comes back, and every mastery figure, "cards
 * due" count and progress bar in the app is derived from it. An off-by-one here is invisible on
 * screen — the app still renders a plausible number — and wrong for months.
 *
 * `now` is pinned to a fixed instant rather than `Date.now()`: the interesting cases are boundaries
 * (a card falling due at exactly this millisecond, a session recorded one millisecond before
 * midnight), and a boundary test that reads the wall clock passes or fails depending on when it runs.
 */
const NOW = Date.UTC(2026, 0, 15, 12, 0, 0)

const card = (over: Partial<ReviewCard> = {}): ReviewCard => ({
  setId: "s1",
  cardId: "c1",
  box: 0,
  dueAt: NOW,
  lastRating: "gotit",
  lastReviewedAt: NOW,
  ...over,
})

const session = (over: Partial<SessionRecord> = {}): SessionRecord => ({
  id: "sess-1",
  setId: "s1",
  setTitle: "Fronted adverbials",
  subject: "English",
  at: NOW,
  cardsReviewed: 5,
  minutes: 4,
  ...over,
})

describe("schedule", () => {
  it("puts a card never seen before into box 1 on a recall", () => {
    assert.equal(schedule(undefined, "gotit"), 1)
  })

  it("leaves a card never seen before in box 0 on a miss", () => {
    assert.equal(schedule(undefined, "tricky"), 0)
  })

  it("promotes one box per recall, all the way up the ladder", () => {
    let box = 0
    const seen: number[] = []
    for (let i = 0; i < 6; i++) {
      box = schedule(card({ box }), "gotit")
      seen.push(box)
    }
    // Six recalls, five boxes: the last one has nowhere further to go.
    assert.deepEqual(seen, [1, 2, 3, 4, MAX_BOX, MAX_BOX])
  })

  it("drops a card to box 0 on a miss, however well it was known", () => {
    for (let box = 0; box <= MAX_BOX; box++) {
      assert.equal(schedule(card({ box }), "tricky"), 0, `box ${box}`)
    }
  })
})

describe("dueDateFor", () => {
  it("uses the published interval ladder, exactly", () => {
    assert.deepEqual(
      INTERVALS_DAYS.map((_, box) => dueDateFor(box, NOW) - NOW),
      INTERVALS_DAYS.map((days) => days * DAY_MS)
    )
  })

  it("clamps a box outside the ladder instead of producing a NaN due date", () => {
    // A NaN `dueAt` compares false against every clock reading, so the card would never come back:
    // silently lost, with nothing on screen to show for it.
    assert.equal(dueDateFor(MAX_BOX + 3, NOW), NOW + INTERVALS_DAYS[MAX_BOX] * DAY_MS)
    assert.equal(dueDateFor(-2, NOW), NOW + INTERVALS_DAYS[0] * DAY_MS)
  })
})

describe("dueLabelAt", () => {
  it("says a card already due is ready now", () => {
    assert.equal(dueLabelAt(NOW - DAY_MS, NOW), "Ready now")
    assert.equal(dueLabelAt(NOW, NOW), "Ready now")
  })

  it("rounds up, so any part of tomorrow reads as Tomorrow", () => {
    assert.equal(dueLabelAt(NOW + 1, NOW), "Tomorrow")
    assert.equal(dueLabelAt(NOW + DAY_MS, NOW), "Tomorrow")
  })

  it("counts whole days beyond that", () => {
    assert.equal(dueLabelAt(NOW + DAY_MS + 1, NOW), "In 2 days")
    assert.equal(dueLabelAt(NOW + 5 * DAY_MS, NOW), "In 5 days")
    assert.equal(dueLabelAt(NOW + 90 * DAY_MS, NOW), "In 90 days")
  })
})

describe("nextDueLabelAt", () => {
  it("promises the interval the rating actually earns", () => {
    // This is the contract the Answer Result ring makes to the child, and it must be the same
    // arithmetic `rateCard` writes — not a second, parallel description of it.
    assert.equal(nextDueLabelAt(undefined, "gotit", NOW), "In 5 days")
    assert.equal(nextDueLabelAt(undefined, "tricky", NOW), "Tomorrow")
    assert.equal(nextDueLabelAt(card({ box: 3 }), "gotit", NOW), "In 90 days")
    assert.equal(nextDueLabelAt(card({ box: 4 }), "tricky", NOW), "Tomorrow")
  })
})

describe("masterySplit", () => {
  it("buckets boxes 0-1 learning, 2-3 getting, 4+ mastered", () => {
    const cards = [0, 1, 2, 3, 4].map((box) => card({ cardId: `c${box}`, box }))
    const split = masterySplit(cards)
    assert.equal(split.learning, 2)
    assert.equal(split.getting, 2)
    assert.equal(split.mastered, 1)
    assert.equal(split.total, 5)
    assert.equal(split.pctLearning, 40)
    assert.equal(split.pctGetting, 40)
    assert.equal(split.pctMastered, 20)
  })

  it("reports zeroes rather than dividing by zero when nothing is rated", () => {
    const split = masterySplit([])
    assert.deepEqual(split, {
      learning: 0,
      getting: 0,
      mastered: 0,
      total: 0,
      pctLearning: 0,
      pctGetting: 0,
      pctMastered: 0,
    })
  })
})

describe("dueCardCountAt", () => {
  it("counts a card due at exactly this instant", () => {
    const cards = [
      card({ cardId: "past", dueAt: NOW - 1 }),
      card({ cardId: "now", dueAt: NOW }),
      card({ cardId: "future", dueAt: NOW + 1 }),
    ]
    assert.equal(dueCardCountAt(cards, NOW), 2)
  })
})

describe("minutesTodayAt", () => {
  it("sums only sessions on the calendar day containing now", () => {
    const midnight = new Date(NOW)
    midnight.setHours(0, 0, 0, 0)
    const sessions = [
      session({ id: "yesterday", at: midnight.getTime() - 1, minutes: 30 }),
      session({ id: "midnight", at: midnight.getTime(), minutes: 3 }),
      session({ id: "now", at: NOW, minutes: 7 }),
    ]
    assert.equal(minutesTodayAt(sessions, NOW), 10)
  })

  it("is zero with no sessions", () => {
    assert.equal(minutesTodayAt([], NOW), 0)
  })
})

describe("recentActivityAt", () => {
  it("returns `count` days, oldest first, with today last", () => {
    const days = recentActivityAt([], NOW)
    assert.equal(days.length, 7)
    assert.equal(days.filter((d) => d.isToday).length, 1)
    assert.equal(days[6].isToday, true)
  })

  it("flags the days a session landed on and no others", () => {
    const today = new Date(NOW)
    const twoDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2, 9).getTime()
    const days = recentActivityAt([session({ at: twoDaysAgo })], NOW)
    assert.deepEqual(
      days.map((d) => d.done),
      [false, false, false, false, true, false, false]
    )
  })
})

describe("mergeProgress", () => {
  const local = {
    cards: {
      "s1:kept": card({ cardId: "kept", box: 3, lastReviewedAt: NOW }),
      "s1:stale": card({ cardId: "stale", box: 1, lastReviewedAt: NOW - DAY_MS }),
    },
    sessions: [session({ id: "local-1", at: NOW })],
  }

  it("keeps whichever side reviewed the card more recently", () => {
    const merged = mergeProgress(
      local,
      [
        card({ cardId: "kept", box: 0, lastReviewedAt: NOW - DAY_MS }),
        card({ cardId: "stale", box: 4, lastReviewedAt: NOW }),
      ],
      []
    )
    // The phone's newer rating survives a tablet syncing yesterday's work…
    assert.equal(merged.cards["s1:kept"].box, 3)
    // …and the server's newer rating overwrites a local record that has not moved since.
    assert.equal(merged.cards["s1:stale"].box, 4)
  })

  it("adds a card the local record has never seen", () => {
    const merged = mergeProgress(local, [card({ cardId: "new", box: 2 })], [])
    assert.equal(merged.cards["s1:new"].box, 2)
    assert.equal(Object.keys(merged.cards).length, 3)
  })

  it("unions sessions by id, so a re-sync cannot inflate study time", () => {
    const merged = mergeProgress(
      local,
      [],
      [session({ id: "local-1", at: NOW, minutes: 999 }), session({ id: "remote-1", at: NOW - DAY_MS })]
    )
    assert.equal(merged.sessions.length, 2)
    // The duplicate is dropped, not merged — the local copy stands.
    assert.equal(merged.sessions.find((s) => s.id === "local-1")?.minutes, 4)
  })

  it("returns sessions newest first", () => {
    const merged = mergeProgress(local, [], [session({ id: "older", at: NOW - DAY_MS })])
    assert.deepEqual(
      merged.sessions.map((s) => s.id),
      ["local-1", "older"]
    )
  })

  it("does not mutate the record it was given", () => {
    const before = JSON.stringify(local)
    mergeProgress(local, [card({ cardId: "new" })], [session({ id: "remote-1" })])
    assert.equal(JSON.stringify(local), before)
  })
})
