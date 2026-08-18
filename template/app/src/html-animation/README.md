# AI Animation Studio

This module turns a user prompt into a saved, previewable HTML animation.

## Reliability flow

1. Create a `PENDING` record owned by the authenticated user.
2. Request a typed `{ title, html }` response from the OpenAI Responses API.
3. Validate that the result is a complete, self-contained CSS/SVG document.
4. If validation fails, send the exact issues through one repair attempt.
5. Fail closed after the repair, or inject a restrictive CSP and save the result.
6. Load history summaries separately from full HTML documents to keep list payloads small.

## Preview threat model

Model output is untrusted. The validator rejects scripts, inline event handlers,
external resources, nested browsing contexts, CSS imports, and navigation helpers.
Accepted documents receive a restrictive CSP and render in an iframe with an empty
`sandbox` permission set and `no-referrer` policy. The page also lets the user tear
down the iframe to stop an expensive animation.

The validator is intentionally defense in depth rather than a general-purpose HTML
sanitizer. Expanding the feature to arbitrary JavaScript animations would require a
separate execution origin and stronger runtime controls.
