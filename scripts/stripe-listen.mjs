#!/usr/bin/env node
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CLI = process.env.STRIPE_CLI_PATH || "stripe";
const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".." );
const ENV_PATH = path.join(ROOT_DIR, ".env.local");

let storedWebhookSecret = null;

function fail(message) {
  console.error(`\u274c ${message}`);
  process.exit(1);
}

async function readEnvSecret() {
  if (!existsSync(ENV_PATH)) {
    fail(`.env.local not found at ${ENV_PATH}`);
  }

  const content = await readFile(ENV_PATH, "utf8");
  const line = content
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith("STRIPE_SECRET_KEY="));

  if (!line) {
    fail(`STRIPE_SECRET_KEY not set in ${ENV_PATH}`);
  }

  const rawValue = line.slice("STRIPE_SECRET_KEY=".length).trim();
  const unquoted = rawValue.replace(/^['"]|['"]$/g, "");
  if (!unquoted) {
    fail("STRIPE_SECRET_KEY resolved to an empty value");
  }

  return unquoted;
}

async function upsertWebhookSecret(secret) {
  if (!secret) return;
  if (storedWebhookSecret === secret) return;

  const content = await readFile(ENV_PATH, "utf8");
  const lines = content.split(/\r?\n/);
  let replaced = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim().startsWith("STRIPE_WEBHOOK_SECRET=")) {
      lines[i] = `STRIPE_WEBHOOK_SECRET=${secret}`;
      replaced = true;
      break;
    }
  }

  if (!replaced) {
    lines.push(`STRIPE_WEBHOOK_SECRET=${secret}`);
  }

  await writeFile(ENV_PATH, lines.join("\n"), "utf8");
  storedWebhookSecret = secret;
  console.log(`\nSaved STRIPE_WEBHOOK_SECRET to ${ENV_PATH}.\n`);
}

function ensureStripeCli() {
  const check = spawnSync(CLI, ["--help"], { stdio: "ignore" });
  if (check.status !== 0) {
    fail(
      `Stripe CLI not found. Install it via 'brew install stripe' or follow https://stripe.com/docs/stripe-cli. ` +
        `Tried command '${CLI}'.`
    );
  }
}

async function main() {
  ensureStripeCli();
  const secret = await readEnvSecret();

  console.log("Starting stripe listen using key from .env.local\n");
  const args = [
    "listen",
    "--skip-update",
    "--api-key",
    secret,
    "--events",
    "customer.subscription.created",
    "--events",
    "customer.subscription.updated",
    "--events",
    "customer.subscription.deleted",
    "--forward-to",
    "localhost:3000/api/webhooks/stripe",
  ];

  const child = spawn(CLI, args, {
    cwd: ROOT_DIR,
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      STRIPE_CLI_AUTO_CHECK_UPDATE: "false",
      STRIPE_CLI_TELEMETRY_OPTOUT: "1",
      STRIPE_CLI_COLOR: "never",
      STRIPE_CLI_INTERACTIVE: "false",
      STRIPE_CLI_SKIP_UPDATE_CHECK: "1",
    },
  });

  child.stdin?.write("\n");
  if (!process.stdin.destroyed) {
    process.stdin.pipe(child.stdin);
  }

  let combinedOutput = "";
  let searchBuffer = "";
  const handleChunk = (text, targetStream) => {
    targetStream.write(text);
    combinedOutput += text;
    searchBuffer += text;
    const match = searchBuffer.match(/Your webhook signing secret is\s+(whsec_[A-Za-z0-9]+)\b/);
    if (match) {
      searchBuffer = searchBuffer.slice(match.index + match[0].length);
      const secretValue = match[1];
      void upsertWebhookSecret(secretValue).catch((error) => {
        console.error(`\nFailed to persist STRIPE_WEBHOOK_SECRET: ${error instanceof Error ? error.message : String(error)}\n`);
      });
    }

    if (searchBuffer.length > 2048) {
      searchBuffer = searchBuffer.slice(-1024);
    }
  };

  child.stdout?.on("data", (chunk) => {
    handleChunk(chunk.toString(), process.stdout);
  });

  child.stderr?.on("data", (chunk) => {
    handleChunk(chunk.toString(), process.stderr);
  });

  child.on("exit", (code, signal) => {
    if (code !== 0 && /unknown flag: --skip-update/i.test(combinedOutput)) {
      console.log("Stripe CLI does not support --skip-update. Retrying without it...\n");
      process.env.STRIPE_LISTEN_NO_UPDATE_FLAG = "unsupported";
      reRunWithoutFlag(secret);
      return;
    }
    if (signal) {
      process.kill(process.pid, signal);
    } else {
      process.exit(code ?? 0);
    }
  });

  child.on("error", (error) => {
    fail(`Failed to launch Stripe CLI: ${error instanceof Error ? error.message : String(error)}`);
  });
}

function reRunWithoutFlag(secret) {
  const args = [
    "listen",
    "--api-key",
    secret,
    "--events",
    "customer.subscription.created",
    "--events",
    "customer.subscription.updated",
    "--events",
    "customer.subscription.deleted",
    "--forward-to",
    "localhost:3000/api/webhooks/stripe",
  ];

  const child = spawn(CLI, args, {
    cwd: ROOT_DIR,
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      STRIPE_CLI_AUTO_CHECK_UPDATE: "false",
      STRIPE_CLI_TELEMETRY_OPTOUT: "1",
      STRIPE_CLI_COLOR: "never",
      STRIPE_CLI_INTERACTIVE: "false",
      STRIPE_CLI_SKIP_UPDATE_CHECK: "1",
    },
  });

  child.stdin?.write("\n");

  let searchBuffer = "";
  const handleChunk = (text, targetStream) => {
    targetStream.write(text);
    searchBuffer += text;
    const match = searchBuffer.match(/Your webhook signing secret is\s+(whsec_[A-Za-z0-9]+)\b/);
    if (match) {
      searchBuffer = searchBuffer.slice(match.index + match[0].length);
      const secretValue = match[1];
      void upsertWebhookSecret(secretValue).catch((error) => {
        console.error(`\nFailed to persist STRIPE_WEBHOOK_SECRET: ${error instanceof Error ? error.message : String(error)}\n`);
      });
    }
    if (searchBuffer.length > 2048) {
      searchBuffer = searchBuffer.slice(-1024);
    }
  };

  child.stdout?.on("data", (chunk) => {
    handleChunk(chunk.toString(), process.stdout);
  });

  child.stderr?.on("data", (chunk) => {
    handleChunk(chunk.toString(), process.stderr);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
    } else {
      process.exit(code ?? 0);
    }
  });

  child.on("error", (error) => {
    fail(`Failed to launch Stripe CLI: ${error instanceof Error ? error.message : String(error)}`);
  });
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
