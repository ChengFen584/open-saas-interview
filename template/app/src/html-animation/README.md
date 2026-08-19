# AI Animation Studio

This module turns an authenticated user's visual brief into a saved,
previewable HTML animation. Its scope is deliberately narrow: self-contained
HTML/CSS/SVG animations with no JavaScript or network access.

## Request lifecycle

```text
prompt -> PENDING record -> typed model output -> deterministic validation
                                      |                  |
                                      |                  +-> valid -> CSP -> COMPLETED
                                      |                  |
                                      |                  +-> invalid -> one repair -> validate
                                      |                                              |
                                      +---------------- provider/validation error ---+-> FAILED
```

The server action owns the state transition. A record is created before the
provider call so failed attempts remain observable, while only the owning user
can list or fetch it. History queries return summaries; the larger HTML payload
is loaded only when an item is selected.

## Reliability flow

1. Create a `PENDING` record owned by the authenticated user.
2. Request a typed `{ title, html }` response from the OpenAI Responses API.
3. Validate that the result is a complete, self-contained CSS/SVG document.
4. If validation fails, send the exact issues through one repair attempt.
5. Fail closed after the repair, or inject a restrictive CSP and save the result.
6. Load history summaries separately from full HTML documents to keep list payloads small.

Provider calls have a 90-second timeout and at most one SDK retry. Validation
repair is also capped at one attempt, which bounds latency and cost while still
recovering from a common malformed first draft. Errors stored for the user are
sanitized so provider details and credentials cannot leak through the API.

## Preview threat model

Model output is untrusted. The validator rejects scripts, inline event handlers,
external resources, nested browsing contexts, CSS imports, and navigation helpers.
Accepted documents receive a restrictive CSP and render in an iframe with an empty
`sandbox` permission set and `no-referrer` policy. The page also lets the user tear
down the iframe to stop an expensive animation.

The validator is intentionally defense in depth rather than a general-purpose HTML
sanitizer. Expanding the feature to arbitrary JavaScript animations would require a
separate execution origin and stronger runtime controls.

## Design tradeoffs

- **Structured output plus deterministic validation:** Zod-backed Structured
  Outputs make the provider contract predictable, but generated HTML is still
  treated as untrusted and checked independently.
- **Synchronous generation:** it keeps the one-day implementation easy to run
  and review. The persisted `PENDING`/`COMPLETED`/`FAILED` states preserve a
  clean migration path to a background job later.
- **One repair attempt:** repeated model self-repair could improve success rate,
  but would make latency and spend unbounded. One issue-guided repair gives a
  useful middle ground.
- **CSS/SVG only:** this excludes richer interactive animations in exchange for
  a materially smaller preview attack surface.
- **Regex-based allowlist:** it is intentionally limited to this constrained
  document format. It is backed by CSP and iframe sandboxing, and is not
  presented as a general HTML sanitizer.

## Verification

From `template/app`:

```bash
npm test
npx eslint src/html-animation
npx prettier --check src/html-animation
npx prisma validate
```

From `template/e2e-tests`:

```bash
npx playwright test --list
npx playwright test tests/htmlAnimationTests.spec.ts
```

The unit suite covers first-pass success, single repair, fail-closed behavior,
document limits, external resources, CSS escape obfuscation, and CSP placement.
The browser regression test proves that CSP blocks a loopback network request
even if a future validator regression lets an obfuscated CSS URL through.

## Known limitations and next steps

- A process crash can leave a record in `PENDING`; a background worker should
  reclaim stale records and add idempotency keys before this handles production
  traffic.
- The synchronous action is suitable for short animations, not long-running
  video rendering. That belongs in a queued job with progress and cancellation.
- Production rollout should add per-user quotas, rate limiting, token/cost logs,
  and provider request identifiers without storing prompt secrets in logs.
- Supporting JavaScript would require an isolated preview origin rather than
  relaxing the current sandbox.
