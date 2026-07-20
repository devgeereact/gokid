/**
 * The printable certificate (design/gokid-screens.md §9 → "Printable Certificate").
 *
 * `expo-print` renders HTML, so this builds a single self-contained page: no external stylesheet, no
 * webfont, no image request. A printer or PDF export that silently drops a missing asset would
 * produce a certificate with a hole where the seal should be, and the child would be the one holding
 * it — so nothing here depends on the network.
 *
 * Colours mirror `design/tokens.js` (the cert palette on the certificate screen). They are literals
 * rather than token imports because this string is handed to a print engine, not to NativeWind.
 *
 * Everything interpolated is escaped: a child's name is parent-entered text going into markup.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function certificateHtml({
  name,
  award,
  subject,
  yearGroup,
  setTitle,
  issued,
}: {
  name: string
  award: string
  subject: string
  yearGroup: string
  setTitle: string
  issued: string
}): string {
  const e = escapeHtml
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>GoKid certificate — ${e(name)}</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #FBF9F6;
    color: #1C1B1A;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet {
    height: 100vh;
    padding: 34px;
    display: flex;
  }
  .frame {
    flex: 1;
    border: 6px solid #D8B45A;
    border-radius: 18px;
    background: #FFFDF7;
    padding: 40px 56px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
  .brand { font-size: 20px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #0E7C7B; }
  .kicker { margin-top: 26px; font-size: 15px; letter-spacing: .18em; text-transform: uppercase; color: #6E6A65; }
  .name { margin: 12px 0 0; font-size: 54px; font-weight: 800; line-height: 1.1; }
  .rule { width: 220px; height: 2px; background: #D8B45A; margin: 22px 0; }
  .award { font-size: 26px; font-weight: 700; margin: 0; }
  .detail { margin-top: 10px; font-size: 17px; color: #6E6A65; }
  .footer { margin-top: auto; padding-top: 26px; display: flex; gap: 46px; font-size: 13px; color: #6E6A65; }
  .footer strong { display: block; color: #1C1B1A; font-size: 15px; margin-top: 3px; }
</style>
</head>
<body>
  <div class="sheet">
    <div class="frame">
      <div class="brand">GoKid</div>
      <div class="kicker">Certificate of achievement</div>
      <h1 class="name">${e(name)}</h1>
      <div class="rule"></div>
      <p class="award">${e(award)}</p>
      <p class="detail">${e(setTitle)} — ${e(yearGroup)} ${e(subject)}</p>
      <div class="footer">
        <div>Awarded<strong>${e(issued)}</strong></div>
        <div>Curriculum<strong>UK National Curriculum</strong></div>
      </div>
    </div>
  </div>
</body>
</html>`
}
