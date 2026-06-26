import { spawn } from "node:child_process";

const port = process.env.E2E_PORT || "5290";
const baseUrl = `http://127.0.0.1:${port}/everything-university/`;

function run(command, args, options = {}) {
  return spawn(command, args, {
    stdio: options.stdio ?? "inherit",
    shell: false,
    env: { ...process.env, ...(options.env ?? {}) },
  });
}

async function waitForServer(url, timeoutMs = 60_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status >= 200 && response.status < 500) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

const server = run("npx", ["vite", "--host", "127.0.0.1", "--port", port], {
  stdio: ["ignore", "pipe", "pipe"],
});

server.stdout.on("data", (chunk) => process.stdout.write(`[vite] ${chunk}`));
server.stderr.on("data", (chunk) => process.stderr.write(`[vite] ${chunk}`));

let exitCode = 1;
try {
  await waitForServer(baseUrl);
  const test = run("npx", ["playwright", "test"], {
    env: { E2E_BASE_URL: baseUrl },
  });
  exitCode = await new Promise((resolve) => {
    test.on("exit", (code) => resolve(code ?? 1));
  });
} finally {
  server.kill("SIGTERM");
}

process.exit(exitCode);
