# Artifact helpers — live-dashboard generation

Load this reference when building a live-dashboard artifact (via `create_artifact`)
in any of the analysis skills (checkout-analysis, product-analysis, segment-analysis).
It centralizes the response-parsing helpers and the platform-API notes that apply to
all three.

## Platform APIs

Two Cowork-internal APIs are used in the generated artifact HTML:

- **`window.cowork.callMcpTool(toolName, args)`** — calls an MCP tool from artifact JS.
  Not a standard browser API; injected by Cowork's artifact runtime.
- **`window.cowork.askClaude(prompt, tools)`** — calls Claude inline from artifact JS.
  Not a standard browser API; injected by Cowork's artifact runtime.

If either is renamed or moved to a sub-namespace, every live dashboard generated
before the change will break silently on open — it shows an empty report with no
visible error. The call sites are in the artifact HTML itself; searching saved
artifacts for `callMcpTool` and `askClaude` is how to find them all.

## `records(res)` — extract rows from a `callMcpTool` response

Navigates the Noibu GraphQL response envelope to reach the records array.
The path `obj.data.domain.explorationsQueryV2.records` reflects the current Noibu
API version (`V2`). If the Noibu API advances to a new version, this path will stop
returning data and must be updated **here** and in any artifacts already saved to
users' workspaces — those artifacts bake in the path at generation time.

```js
function records(res) {
  try {
    let obj = res;
    if (typeof res === "string") obj = JSON.parse(res);
    if (obj && obj.content) {
      const text = Array.isArray(obj.content)
        ? obj.content[0].text : obj.content;
      obj = typeof text === "string" ? JSON.parse(text) : text;
    }
    return obj.data.domain.explorationsQueryV2.records;
  } catch(e) { return []; }
}
```

## `parseClaudeText(res)` — unwrap an `askClaude` response to a string

`window.cowork.askClaude()` returns a response object, not a plain string.
Always pass the result through this function before inserting into the DOM —
setting `element.textContent = res` directly will render `[object Object]`.

```js
function parseClaudeText(res) {
  if (!res) return '';
  if (typeof res === 'string') return res;
  if (Array.isArray(res.content) && res.content[0]?.text) return res.content[0].text;
  if (typeof res.content === 'string') return res.content;
  if (typeof res.text === 'string') return res.text;
  if (typeof res.message === 'string') return res.message;
  return '';
}
```
