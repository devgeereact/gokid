// Time-of-day greeting, keyed to the device's LOCAL clock — so it reads correctly in whatever
// country/timezone the app runs in (the device already localises `new Date()`).
export function timeGreeting(date: Date = new Date()): string {
  const hour = date.getHours()
  if (hour < 12) return "Morning"
  if (hour < 17) return "Afternoon"
  return "Evening"
}
