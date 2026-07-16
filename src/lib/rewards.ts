// Demo rewards data. Stands in for the Neon/Drizzle-backed rewards API (AGENTS.md) so the
// congratulations → certificate flow is fully testable today. Screens import `getCertificate`,
// not the data, so this module is the single seam to swap when the API lands.
//
// A certificate is keyed by study-set id: finishing a set earns the certificate for that set.
// `src/lib/study.ts` owns the set itself (title / subject / year group); this module only carries
// what the certificate adds on top — the award line, the objectives it attests, the stats it was
// earned with, and the issue date.

import { getStudySet } from "./study"

export type CertificateObjective = {
  /** National Curriculum objective the child demonstrated. */
  title: string
  /** Where it sits in the curriculum, e.g. "Number and place value". */
  strand: string
}

export type CertificateStat = {
  label: string
  value: string
}

export type Certificate = {
  /** Study-set id this certificate was earned for. */
  setId: string
  /** Award line under the child's name, e.g. "Place Value to 1,000". */
  award: string
  /** Human award tier shown on the seal ribbon. */
  tier: "Gold" | "Silver" | "Bronze"
  /** Issue date, pre-formatted for display (no Date maths in a demo seam). */
  issued: string
  /** Certificate reference printed under the rule — stands in for a signed API id. */
  reference: string
  objectives: CertificateObjective[]
  stats: CertificateStat[]
  /** Encouragement line on the closing banner. */
  encouragement: string
}

/**
 * Demo certificates. One per study set that the flow can reach today; `getCertificate` derives a
 * sensible fallback for any other set so no completed set can dead-end on a missing certificate.
 */
const CERTIFICATES: Record<string, Certificate> = {
  "place-value": {
    setId: "place-value",
    award: "Place Value to 1,000",
    tier: "Gold",
    issued: "16 July 2026",
    reference: "GK-2026-0716-PV1000",
    objectives: [
      { title: "Recognise the place value of each digit in a three-digit number", strand: "Number and place value" },
      { title: "Compare and order numbers up to 1,000", strand: "Number and place value" },
      { title: "Read and write numbers up to 1,000 in numerals and in words", strand: "Number and place value" },
      { title: "Add and subtract numbers mentally within 1,000", strand: "Addition and subtraction" },
    ],
    stats: [
      { label: "Accuracy", value: "90%" },
      { label: "Cards studied", value: "20" },
      { label: "Time spent", value: "24m" },
      { label: "Points earned", value: "120" },
    ],
    encouragement: "You stuck with it and it paid off. Print this one and put it on the fridge!",
  },
}

/** The certificate for a completed set. Falls back to a derived one for sets without demo copy. */
export function getCertificate(setId: string): Certificate | undefined {
  const known = CERTIFICATES[setId]
  if (known) return known

  const set = getStudySet(setId)
  if (!set) return undefined

  return {
    setId: set.id,
    award: set.title,
    tier: "Gold",
    issued: "16 July 2026",
    reference: `GK-2026-0716-${set.id.slice(0, 8).toUpperCase()}`,
    objectives: set.mastered.map((title) => ({ title, strand: set.topic })),
    stats: [
      { label: "Accuracy", value: "90%" },
      { label: "Cards studied", value: String(set.cardsTotal) },
      { label: "Time spent", value: `${set.minutes}m` },
      { label: "Points earned", value: "120" },
    ],
    encouragement: "You stuck with it and it paid off. Print this one and put it on the fridge!",
  }
}
