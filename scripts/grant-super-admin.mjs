#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { api, internal } from "../convex/_generated/api.js";

if (typeof globalThis.btoa === "undefined") {
  globalThis.btoa = (data) => Buffer.from(data, "binary").toString("base64");
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) {
      continue;
    }

    const index = line.indexOf("=");
    if (index === -1) {
      continue;
    }

    const key = line.slice(0, index).trim();
    if (!key || process.env[key]) {
      continue;
    }

    const rawValue = line.slice(index + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    process.env[key] = value;
  }
}

function normalizeEnvironment(value) {
  if (!value) {
    return undefined;
  }

  const normalized = String(value).toLowerCase();
  if (normalized === "prod") {
    return "production";
  }

  if (normalized === "dev") {
    return "development";
  }

  return normalized;
}

function loadEnvFiles(environment) {
  const root = process.cwd();
  const candidates = [];

  if (environment) {
    const envName = normalizeEnvironment(environment);
    if (envName === "production") {
      candidates.push(
        ".env.production.local",
        ".env.production",
      );
    } else if (envName === "development") {
      candidates.push(
        ".env.development.local",
        ".env.development",
      );
    } else {
      candidates.push(
        `.env.${envName}.local`,
        `.env.${envName}`,
      );
    }
  }

  candidates.push(".env.local", ".env");

  const seen = new Set();
  for (const candidate of candidates) {
    const resolved = path.resolve(root, candidate);
    if (seen.has(resolved)) {
      continue;
    }
    seen.add(resolved);
    loadEnvFile(resolved);
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "-prod" || arg === "--prod") {
      parsed.environment = "production";
      continue;
    }

    if (arg === "-dev" || arg === "--dev") {
      parsed.environment = "development";
      continue;
    }

    if (arg.startsWith("--env=")) {
      parsed.environment = arg.slice(6);
      continue;
    }

    if (arg === "--env" || arg === "-env") {
      parsed.environment = args[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      parsed[key] = value ?? true;
      continue;
    }
  }
  return parsed;
}

const parsedArgs = parseArgs();
const selectedEnvironment = normalizeEnvironment(parsedArgs.environment);
loadEnvFiles(selectedEnvironment);

async function main({ email, remove }) {
  if (selectedEnvironment) {
    console.log(`Using ${selectedEnvironment} environment variables`);
  }

  if (!email) {
    console.error(
      "Usage: node scripts/grant-super-admin.mjs --email=user@example.com [--remove] [--prod|--dev|--env=<name>]",
    );
    process.exit(1);
  }

  const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  const adminKey = process.env.CONVEX_ADMIN_KEY;

  if (!convexUrl) {
    console.error("Missing CONVEX_URL or NEXT_PUBLIC_CONVEX_URL environment variable.");
    process.exit(1);
  }

  if (!adminKey) {
    console.error("Missing CONVEX_ADMIN_KEY environment variable.");
    process.exit(1);
  }

  const client = new ConvexHttpClient(convexUrl, { skipConvexDeploymentUrlCheck: true });
  client.setAdminAuth(adminKey);

  const user = await client.query(api.auth.getUserByEmail, { email });

  if (!user) {
    console.error(`No user found with email ${email}`);
    process.exit(1);
  }

  await client.mutation(internal.admin.forceSetSuperRole, {
    targetUserId: user._id,
    superRole: remove ? undefined : "super_admin",
  });

  console.log(`${remove ? "Revoked" : "Granted"} super admin for ${email}`);
}

main(parsedArgs).catch((error) => {
  console.error("Failed to update super admin role:", error);
  process.exit(1);
});
