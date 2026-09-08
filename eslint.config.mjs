import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  // Keep the starter on the flat config export that actually runs under the pinned ESLint/Next toolchain.
  ...nextCoreWebVitals,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    // The player intentionally uses the "latest ref" pattern: imperative
    // callbacks (YouTube iframe events, media-session handlers, keyboard
    // shortcuts) are registered once and must read the freshest queue/volume/
    // handler values without re-subscribing on every render. The new
    // react-hooks compiler rules flag that pattern, but rewriting it would
    // reintroduce stale-closure playback bugs, so it is allowed here only.
    files: ["src/components/player-context.tsx"],
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-render": "off",
      "react-hooks/preserve-manual-memoization": "off",
      // Volume / device id / video-panel state are hydrated from localStorage
      // in an effect on purpose — reading them during render would break SSR.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    // Artwork is remote/generated (YouTube thumbnails), so the plain <img>
    // element is deliberate — next/image would add an optimizer hop for
    // images we already size and cache ourselves.
    files: ["src/components/ui.tsx"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
]);
