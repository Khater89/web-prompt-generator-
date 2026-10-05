# Project Forge — PRD and section prompts

Arabic/English project studio. Enter a project name and description; shape pages,
components, functionality, design and deployment preferences. Export **one PRD**
with **one implementation prompt inside each section**, without a second global
prompt containing a duplicate PRD. Edits in the document are copied/exported exactly.

## Supabase backend

The `supabase/` folder contains a self-contained `ai-assist/index.ts` Edge Function suitable for the Supabase Dashboard editor or CLI, shared research/validation source modules, durable SQL request quotas, configuration and Arabic setup instructions. Follow `supabase/README.md`. In the frontend, open backend settings and enter your Supabase Project URL and publishable/anon key. OpenAI secrets stay in Supabase. No Windows launcher or local Node server is required for the hosted Supabase option.

The function is prepared, not deployed to an account. Real OpenAI inference, Deno deployment and the PostgreSQL migration have not been tested here. Backend/transport tests use controlled responses.

## What works now

The deployed static site supports manual configuration, a local initial proposal,
editable pages, previews and unified PRD exports. Manual mode uses local rules,
not AI or web research. The UI explicitly announces the connection status.

## Prepared Auto research service

`POST /api/research` performs two server-side Responses API requests:

1. A required `web_search` call searches for real similar products and official
   stack/component release documentation. Completed tool calls and at least two
   actual retrieved sources are required.
2. Strict structured analysis fills the entire studio, including screens,
   users, inputs, outcomes, workflow, design, requirements, languages, frontend,
   backend and deployment. Similar products/components refer to validated source
   IDs from step 1. Sources are displayed as clickable links and exported in PRD.

Technology selection is not limited to the dropdown options. An appropriate
C#/ASP.NET Core, Python/FastAPI/Django, JavaScript/TypeScript, PHP, mobile or other
stack can be proposed. An explicit framework preference takes precedence.
Latest stable versions are researched per run, not hardcoded. An unverified
component version stays blank. The model's interpretation still needs review;
retrieved-source validation does not independently certify a claim's accuracy.

There is no fake local fallback behind Auto. Failed, canceled, malformed or
ungrounded research never replaces previous fields. Scope edits invalidate old
model assumptions; the document uses current selections and asks for fresh
research before treating the previous technical proposal as current.

**The AI service is not active on the published site.** No Supabase project or server-side AI
credential/model is configured. Real provider inference has not been tested.
The server integration and its failure paths have been tested with controlled
upstream fixtures. No credential belongs in the browser, ZIP or repository.

## Local manual version

Open the ZIP's root `index.html`, or serve `public/` with a static web server.
Only manual configuration and PRD export work without the API server.

## Local server version (developer setup)

Requires Node.js 20+ and a server-side OpenAI credential with a model supporting
web search and structured outputs. Create `.env` from `.env.example` privately.
This file is ignored. Do not paste secrets into the project description.

```bash
FORGE_BUILD_DIR=./dist-worker node scripts/build-worker.mjs
node --env-file=.env scripts/serve.mjs
```

Open http://127.0.0.1:3000. Missing configuration returns an honest inactive
status. Research uses two paid model requests; configure budgets on the service.
The bundled in-memory throttle (12 requests/10 minutes per IP) is best effort;
production operators should use durable rate limits and appropriate access control.
The local server binds to loopback only.

## Sites builds

The existing public Site identity and audience are preserved.

```bash
node scripts/build-static.mjs
FORGE_BUILD_DIR=./dist-worker node scripts/build-worker.mjs
```

The published artifact is the static build. The optional Worker build embeds all
six frontend assets and uses its own Worker manifest. Activate it only after
server-side service configuration and a real inference test. Local `.env` files
are not automatically uploaded to Sites.

## Validation

```bash
FORGE_BUILD_DIR=./dist-worker node scripts/build-worker.mjs
node --test tests/engine.test.cjs tests/studio.test.cjs tests/ui.test.cjs tests/worker.test.mjs tests/research.test.mjs
```

Covers domain inference, manual overrides, one prompt per PRD section,
copy/export, real-search requirements, source grounding, Python/C# selections,
unconfigured service, secret exclusion, errors and cancellation. UI tests use
an action-level synthetic DOM; they are not real-browser or visual validation.
