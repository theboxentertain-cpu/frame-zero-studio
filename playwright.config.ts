import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:8080",
    launchOptions: {
      ...(process.env["CHROMIUM_PATH"] || existsSync("/usr/bin/chromium")
        ? { executablePath: process.env["CHROMIUM_PATH"] || "/usr/bin/chromium" }
        : {}),
      args: ["--no-sandbox"],
    },
    viewport: { width: 390, height: 844 },
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 8080",
    url: "http://127.0.0.1:8080",
    reuseExistingServer: !process.env["CI"],
    timeout: 60000,
  },
});
