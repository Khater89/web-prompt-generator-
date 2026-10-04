# Project Forge — Prompt Studio

Arabic RTL web tool for shaping a website or mobile application and generating a complete build prompt and PRD for an external AI builder.

## Current published experience

- Free-form idea in ordinary language; no JSON, API configuration, or technical interview.
- Auto suggests project type, pages/components, visual style, platform and capabilities using local patterns. **This is rule-based, not live LLM inference.** Original description is preserved verbatim in the generated specification.
- Manual controls for pages, order, components, features, theme, layout, accent, spacing, motion, language and platform. Optional domain rules, references and technical constraints are expandable.
- Live schematic preview; it is a layout illustration, not the final generated application.
- Editable build prompt and PRD; copy and download each, and regenerate the build prompt from edited PRD.
- Runs entirely in the browser. No server requests, secrets, uploaded idea data, or cross-device persistence. Download outputs to retain them.

## Validation and build

```
node --test tests/engine.test.cjs tests/studio.test.cjs tests/ui.test.cjs
node scripts/build-static.mjs
```

Static Sites deployment uses `.openai/hosting.json`, `static.directory: dist`. The saved artifact is built from the exact pushed source commit. Site access remains owner-private.

## Prepared optional AI server

`server/`, `scripts/build-worker.mjs`, `tests/worker.test.mjs` preserve a separately prepared discovery/blueprint API. It is **not included in the current static deployment** and the studio UI does not call it. No real model inference or connected-key test has been performed. Activating it requires server-side key/model configuration and a separate reviewed integration. Its older server-only test suite expects a Worker build and is not part of current static validation.

## Verification limits

Engine and synthetic DOM interaction tests cover meaningful data/configuration flows and export/copy handling; they are not a real-browser or visual audit. Responsive styles and keyboard-friendly native controls are implemented. Production deployment status is verified through Sites.
