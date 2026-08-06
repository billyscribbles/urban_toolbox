# Domain migration — GoDaddy → Railway

How to move `urbantoolboxes.com.au` off the GoDaddy Websites + Marketing site and
onto the Railway app, **on the same domain, without breaking email.**

This is the infrastructure half of go-live. The SEO half — redirects,
prerendering, sitemap, Search Console — is in
**[seo-migration.md](./seo-migration.md)**, and this document links to it rather
than repeating it.

Everything below was verified against the live domain and the live Railway
project on **2026-07-31**. Re-check the DNS snapshot before you start if
significant time has passed.

---

## The one-paragraph version

The domain stays registered at GoDaddy. DNS hosting moves to Cloudflare (free),
because GoDaddy's DNS **cannot** point a root domain at Railway. Email is
Microsoft 365 and must be carried across record-for-record or it dies with the
website. The nameserver move and the actual site cutover are done as **two
separate steps on different days**, so the risky part (nameservers, slow,
hard to reverse) happens while the site is still the old one, and the visible
part (the flip to Railway, fast, instantly reversible) is a single record
change.

---

## Blockers — resolve all three before cutover day

### 🔴 Gate 0 — the Railway build is currently broken

**Every deploy since the SEO commit has failed.** The last successful deploy is
`2234264` from 2026-07-31 00:58 UTC; `716007c` and all three commits after it
failed. The live Railway app is therefore a **stale build**, and cutting over to
it today would ship the pre-SEO site:

| Check                         | Live Railway app now   | Expected after a good deploy |
| ----------------------------- | ---------------------- | ---------------------------- |
| `sitemap.xml` URL count       | 18                     | 122                          |
| `/toolboxes` prerendered HTML | no (SPA shell)         | yes, real product content    |
| `/nope`                       | `200` (soft 404)       | `404`                        |
| `/ute-accesories?gclid=TEST`  | 301, **query dropped** | 301, query preserved         |

**Cause.** The build dies in `scripts/prerender.mjs`:

```
Error: Failed to launch the browser process: Code: 1
Command '/usr/bin/chromium-browser' requires the chromium snap to be installed.
```

`nixpacks.toml` sets `PUPPETEER_EXECUTABLE_PATH` under `[variables]`, but that
value is **not reaching the build step** — if it were, `findChrome()`
(`scripts/prerender.mjs:66`) would have returned it immediately instead of
probing the fallback list. It fell through to `/usr/bin/chromium-browser`, which
exists on the image only as a **snap wrapper stub**. `findChrome()` tests with
`existsSync()`, so the stub passes the check and then fails to launch.

**Fix (do this first, it is independent of everything else):**

1. Set `PUPPETEER_EXECUTABLE_PATH` as a **Railway service variable** (not just in
   `nixpacks.toml`) so it definitely reaches `yarn build` —
   `/nix/var/nix/profiles/default/bin/chromium`.
2. Redeploy and confirm the build log reaches `122 routes + 404.html written`.
3. If it still fails, the nix `chromium` package isn't landing in the image at
   all. Confirm the builder is actually Nixpacks (`railway.json` says
   `NIXPACKS`) — a service switched to Railpack ignores `nixpacks.toml`
   entirely, which would explain both symptoms at once.

Hardening worth doing while you're in there: make `findChrome()` skip a
candidate that exists but can't launch, so a stub can never win the probe again.

> Do **not** work around this with `SKIP_PRERENDER=1`. Shipping an unprerendered
> SPA over a server-rendered GoDaddy site is the single most reliable way to lose
> the rankings this whole migration exists to protect.

### 🔴 Gate 1 — GoDaddy DNS cannot point the apex at Railway

Railway routes custom domains by **CNAME**, and for a root/apex domain it
supports only CNAME flattening or a dynamic ALIAS record. **GoDaddy supports
neither** — its DNS editor won't even let you create a CNAME on `@`.

Railway publishes no stable IPs for the edge, so "just resolve the CNAME and put
those IPs in an A record" is not an option — they change and the site goes down
without warning.

**Therefore DNS hosting must move to a provider that flattens.** Cloudflare's
free tier does, and is the recommended path below. The domain **registration
stays at GoDaddy** — only the nameservers change.

### 🔴 Gate 2 — email is Microsoft 365 and will break if you get this wrong

`urbantoolboxes.com.au` receives mail via Microsoft 365, provisioned **through
GoDaddy** (the `NETORGFT15701378.onmicrosoft.com` TXT record is a
GoDaddy-brokered M365 tenant). Moving nameservers without carrying these records
across means **mail stops being delivered** — silently, and with bounces the
sender sees but you don't.

Copy every mail record verbatim. See the snapshot below.

---

## Current DNS snapshot — recorded 2026-07-31

Nameservers: `ns39.domaincontrol.com`, `ns40.domaincontrol.com` (GoDaddy).
TTLs are 3600s (1 hour) throughout.

| Type  | Name           | Value                                                 | Purpose                            |
| ----- | -------------- | ----------------------------------------------------- | ---------------------------------- |
| A     | `@`            | `76.223.105.230`                                      | Old GoDaddy site — **replace**     |
| A     | `@`            | `13.248.243.5`                                        | Old GoDaddy site — **replace**     |
| CNAME | `www`          | `urbantoolboxes.com.au`                               | **replace**                        |
| MX    | `@`            | `0 urbantoolboxes-com-au.mail.protection.outlook.com` | 🔒 **M365 mail — carry verbatim**  |
| TXT   | `@`            | `NETORGFT15701378.onmicrosoft.com`                    | 🔒 M365 domain verification        |
| TXT   | `@`            | `v=spf1 include:secureserver.net -all`                | 🔒 SPF — carry verbatim, see below |
| CNAME | `autodiscover` | `autodiscover.outlook.com`                            | 🔒 Outlook client autoconfig       |
| CNAME | `lyncdiscover` | `webdir.online.lync.com`                              | 🔒 Teams / Skype                   |
| CNAME | `sip`          | `sipdir.online.lync.com`                              | 🔒 Teams / Skype                   |
| CNAME | `email`        | `email.secureserver.net`                              | GoDaddy email marketing            |

No AAAA records. No DMARC record exists.

**Two observations, neither of which you should act on during the migration:**

- The SPF record authorises `secureserver.net` (GoDaddy) while mail is delivered
  to Outlook. If anything sends via M365 directly, SPF is already misaligned —
  that's a pre-existing condition, not something the migration causes. Copy it
  **exactly as-is**; fix it as a separate task afterwards so that if mail breaks
  you know it wasn't the DNS move.
- Adding DMARC is worth doing eventually. Not now — one change at a time.

---

## Phase 1 — Prepare (T-3 days)

- [ ] Clear **Gate 0**. Railway builds green and the deploy log shows
      `122 routes + 404.html written`.
- [ ] Confirm the Railway service variables are all present (verified set on
      2026-07-31): `VITE_SITE_URL=https://urbantoolboxes.com.au`,
      `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_FORMSPREE_ID`,
      `VITE_GA_ID`, `VITE_GTM_ID`, and `PORT=4173`.
- [ ] Run the full verification suite from
      [seo-migration.md](./seo-migration.md) against
      `https://urbantoolbox-production.up.railway.app` — every legacy redirect,
      the 404 behaviour, the sitemap count, the prerendered HTML. **Fix
      everything here, not after cutover.**
- [ ] Decide the `www` strategy and ship it (see
      [The `www` question](#the-www-question) — it needs a small code change).
- [ ] Confirm which Railway plan the project is on. Apex + `www` is **two**
      custom domains; Hobby allows exactly 2 per service, Trial allows 1.

## Phase 2 — Move DNS to Cloudflare (T-2 days) — _site does not change_

The trick here: set Cloudflare up so it serves **exactly what GoDaddy serves
today**, including the old site's A records. Then switch nameservers. Visitors
see no change, mail keeps flowing, and you've de-risked the slow, hard-to-revert
step while nothing is riding on it.

- [ ] Create a free Cloudflare account and add `urbantoolboxes.com.au`.
- [ ] Cloudflare will scan and import the existing records. **Do not trust the
      scan.** Check every row in the snapshot table above is present, especially
      all four 🔒 mail records and both TXT values.
- [ ] Leave the apex A records pointing at `76.223.105.230` / `13.248.243.5` for
      now. Set every record to **DNS only (grey cloud)**.
- [ ] Set the apex and `www` TTLs to **Auto / 5 min**, so the Phase 3 flip is
      near-instant.
- [ ] In GoDaddy: **Domain Portfolio → urbantoolboxes.com.au → Nameservers →
      Change → I'll use my own nameservers**, and enter the two Cloudflare
      nameservers Cloudflare gave you.
- [ ] Wait for Cloudflare to report the zone **Active** (usually under an hour,
      but allow up to 48).
- [ ] Verify nothing moved (commands below).
- [ ] **Send a test email to and from a company mailbox.** Do not proceed until
      mail is confirmed working on Cloudflare DNS.

```bash
dig +short NS urbantoolboxes.com.au                # expect the Cloudflare pair
dig +short MX urbantoolboxes.com.au                # expect ...mail.protection.outlook.com
curl -sI https://urbantoolboxes.com.au/ | head -1  # still the old site, 200
```

## Phase 3 — The cutover (T-0) — _this is the only visible step_

Everything up to here is reversible in seconds and invisible to visitors. This is
the flip.

- [ ] In Railway → service `urban_toolbox` → **Settings → Networking → Custom
      Domain**, add `urbantoolboxes.com.au`. Railway returns a **CNAME target**
      and a **TXT verification record** — you need **both**; with only the CNAME
      the domain returns 404.
- [ ] ⚠️ **Set the target port to `4173`.** The app binds `PORT=4173`; a custom
      domain left on the default port serves `502 Application failed to respond`
      even though the deploy is healthy and the logs look clean. (This has bitten
      this project before.)
- [ ] Repeat for `www.urbantoolboxes.com.au` if you chose the two-domain option
      below.
- [ ] In Cloudflare, **delete the two apex A records** and add: - `CNAME @ → <railway-target>.up.railway.app` (DNS only / grey cloud —
      Cloudflare flattens this at the root automatically) - the `TXT` verification record exactly as Railway gave it - `CNAME www → <railway-target>.up.railway.app` (DNS only)
- [ ] Wait for Railway to show a green check on both domains, and for the SSL
      certificate to issue (usually a few minutes).
- [ ] Run the live-domain verification block in
      [seo-migration.md § 3](./seo-migration.md#3-verify-on-the-live-domain).
      All of it.

## Phase 4 — Immediately after

- [ ] `https://` is live and `http://` 301s to it.
- [ ] `www` 301s to the apex (see below) — both hostnames must not serve the site.
- [ ] Submit the quote form and confirm the Formspree email arrives.
- [ ] Send another test email in and out. Mail is the thing you'll notice last
      and regret most.
- [ ] Work through [seo-migration.md § 4](./seo-migration.md#4-google) — Search
      Console sitemap submission, URL Inspection, Business Profile, Ads
      conversion check.

## Phase 5 — Decommission (T+2 weeks, not before)

- [ ] Cancel the GoDaddy **Websites + Marketing** plan only.
- [ ] 🔒 **Do not cancel the Microsoft 365 plan.** It is billed through the same
      GoDaddy account and cancelling it destroys the mailboxes.
- [ ] 🔒 If GoDaddy offers to "remove associated DNS records" when you delete the
      site, **decline**. DNS is no longer served from there, but there's no
      upside to letting it touch anything.
- [ ] Keep the domain registration and auto-renew at GoDaddy.

---

## The `www` question

Today GoDaddy serves the `www` → apex 301 at its edge (`www` is a CNAME to the
apex, and the redirect happens in HTTP, not DNS). **That redirect is GoDaddy's,
and you lose it the moment you cut over.** If nothing replaces it, both
hostnames serve the full site and the ranking equity splits across two origins.

`server.js` currently has no host-based handling at all — it canonicalises the
trailing slash and serves the legacy 301 map, but never looks at the `Host`
header. So this needs a decision:

**Recommended — add `www` as a second Railway custom domain and 301 in
`server.js`.** It keeps the rule in code next to the trailing-slash
canonicalisation it's a sibling of, it's covered by the existing contract test
suite, and it avoids putting a proxy in front of Railway. Costs one extra
Railway custom domain.

```js
// In the createServer handler, before the trailing-slash rule.
// Behind Railway's edge the original protocol/host arrive as forwarded headers.
const host = req.headers['x-forwarded-host'] || req.headers.host || ''
if (host.startsWith('www.')) {
  return send(res, 301, null, {
    Location: `https://${host.slice(4)}${rawPath}${query}`,
  })
}
```

**Alternative — a Cloudflare Redirect Rule.** No code change, but it requires
turning on Cloudflare's proxy (orange cloud) for `www`, which means also setting
SSL/TLS mode to **Full** to avoid a redirect loop with Railway. More moving
parts in the hot path for a rule that's four lines of JavaScript.

Either way, verify after cutover:

```bash
curl -sI https://www.urbantoolboxes.com.au/toolboxes | head -3
# expect: 301 → https://urbantoolboxes.com.au/toolboxes
```

---

## Rollback

Rollback cost depends entirely on which phase you're in — which is the reason
they're split.

| Phase                 | To undo                                                            | Time to take effect |
| --------------------- | ------------------------------------------------------------------ | ------------------- |
| Phase 2 (nameservers) | Point nameservers back to `ns39`/`ns40.domaincontrol.com`          | up to 48 h          |
| Phase 3 (the flip)    | In Cloudflare, restore the two apex A records and delete the CNAME | ~5 min (low TTL)    |

The apex A record values to restore are `76.223.105.230` and `13.248.243.5`.
**Write them somewhere outside this repo before you start** — if the GoDaddy
site has been torn down you cannot look them up again.

Phase 3 is the one you'd actually use, and it's cheap: the old GoDaddy site keeps
serving on those IPs until you cancel the plan in Phase 5, which is exactly why
Phase 5 waits two weeks.

---

## What not to do

- **Don't hardcode Railway's IPs in A records.** They aren't stable. This is the
  tempting shortcut that avoids the Cloudflare move, and it will take the site
  down at a time of Railway's choosing.
- **Don't change nameservers before the mail records are verified in Cloudflare.**
- **Don't cancel anything at GoDaddy before Phase 5**, and never the M365 plan.
- **Don't do Phase 2 and Phase 3 on the same day.** The whole point is that
  nameserver propagation is slow and unobservable, so it should be finished and
  confirmed before anything user-visible changes.
- **Don't cut over on a Friday**, or the day before anyone's away. Phase 3 is
  minutes of work but the tail of a migration is where the surprises live.
- **Don't use Search Console's Change of Address tool.** The domain isn't
  changing; it's for domain moves only.
- **Don't fix the SPF record, add DMARC, or tidy any other DNS record during the
  migration.** One change at a time, so a broken thing has one possible cause.
