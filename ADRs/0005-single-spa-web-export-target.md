# 0005. Single SPA Web Export Target

**Status**: Accepted  
**Date**: 2026-10-08  

## Context

Expo Router v4 provides two deployment output modes for web builds configured via `app.json`:

1. **Static Rendering (`web.output: "static"`)**:
   Pre-renders each route into static HTML at build time using Node.js, and hydrates the DOM when the browser loads the client JavaScript bundle.
2. **Single Page Application (`web.output: "single"`)**:
   Generates a single `index.html` entrypoint shell that boots the JavaScript bundle in the browser and delegates all rendering, routing, and lifecycle management exclusively to the client runtime.

When evaluating `"static"` pre-rendering for Fokus, major architectural conflicts occurred:
- **Hydration Mismatches**: Fokus is an offline-first client application where state (tasks, active timer segments, custom durations, and history) is loaded asynchronously from client storage (`AsyncStorage` backed by `localStorage` on web). The build-time server environment has no access to client storage and renders with default empty states. When the browser mounts the application, React detects conflicting DOM trees between the server-rendered HTML and the client-hydrated UI, throwing fatal hydration warnings (`Text content does not match server-rendered HTML`).
- **Unnecessary SEO Overhead**: Fokus is a private, personal productivity utility. There are no public landing articles or blog posts requiring search engine indexing of private task lists.
- **Codebase Complexity**: Supporting static pre-rendering requires wrapping client-dependent components in defensive mounting checks (`useEffect` mount guards or dynamic imports), cluttering component code.

## Decision

We decided to configure the web output target explicitly as a Single Page Application (`"single"`) in `app.json`:

```json
{
  "expo": {
    "web": {
      "output": "single",
      "bundler": "metro"
    }
  }
}
```

## Consequences

### Positive
- **Elimination of Hydration Errors**: Because the browser renders the initial DOM from scratch after loading the bundle, hydration mismatch errors are completely eliminated.
- **Simpler Component Architecture**: UI components do not need conditional SSR-detection branches (`typeof window !== "undefined"` or two-pass rendering checks).
- **Consistent Execution Model**: The web execution model behaves identically to native mobile runtimes, where state initialization occurs strictly on the client.
- **Streamlined Web Export**: `npx expo export -p web` generates clean static assets deployable to any static hosting platform (Vercel, GitHub Pages, Netlify, Cloudflare Pages) without server runtimes.

### Negative
- **Zero Pre-rendered HTML**: Web crawlers that do not execute client-side JavaScript receive an empty root div shell (considered completely acceptable for a private productivity application).
- **Time to First Meaningful Paint**: Users on web must download the JavaScript bundle before the initial UI renders.
