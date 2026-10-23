import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

/**
 * Emits `/sw-precache.js` into the build output with a versioned list of every
 * static asset produced by the build. The hand-written service worker
 * (`public/sw.js`) imports this file so it can cache the app shell without a
 * runtime dependency on a workbox package.
 */
function nurtureherPwaPrecache(): Plugin {
  return {
    name: "nurtureher-pwa-precache",
    apply: "build",
    generateBundle(_options, bundle) {
      const version = process.env.VITE_BUILD_VERSION || Date.now().toString(36);
      const assets = Object.keys(bundle).map((file) => `/${file.replace(/\\/g, "/")}`);
      const precache = Array.from(new Set(["/", "/index.html", "/manifest.webmanifest", ...assets]));
      const contents = [
        `self.__NH_BUILD_VERSION__ = ${JSON.stringify(version)};`,
        `self.__NH_PRECACHE__ = ${JSON.stringify(precache)};`,
        "",
      ].join("\n");
      this.emitFile({ type: "asset", fileName: "sw-precache.js", source: contents });
    },
  };
}

export default defineConfig({
  plugins: [react(), nurtureherPwaPrecache()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
