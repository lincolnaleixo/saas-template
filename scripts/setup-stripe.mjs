#!/usr/bin/env node
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const WORKING_DIR = process.cwd();
const ENV_PATH = path.join(WORKING_DIR, ".env.local");
const ENV_FALLBACK_PATH = path.join(WORKING_DIR, ".env");
const STRIPE_CLI = process.env.STRIPE_CLI_PATH || "stripe";

const plans = [
  {
    planId: "pro",
    name: "Pro",
    description: "Advanced features for growing teams",
    unitAmount: 4900,
    currency: "usd",
    interval: "month",
  },
  {
    planId: "ultra",
    name: "Ultra",
    description: "Everything unlocked for enterprise teams",
    unitAmount: 9900,
    currency: "usd",
    interval: "month",
  },
];

function fail(message) {
  console.error(`\u274c ${message}`);
  process.exit(1);
}

function warn(message) {
  console.warn(`\u26a0\ufe0f ${message}`);
}

function info(message) {
  console.log(`\ud83d\udcc4 ${message}`);
}

function runStripe(args, errorMessage, apiKey) {
  const result = spawnSync(STRIPE_CLI, ["--api-key", apiKey, ...args], {
    cwd: WORKING_DIR,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    const stdout = result.stdout?.trim();
    const output = stderr || stdout;
    if (output?.includes("You are not logged in")) {
      fail(`${errorMessage}. The Stripe CLI is not authenticated. Run 'stripe login' and try again.`);
    }
    fail(`${errorMessage}.${output ? `\nCLI output: ${output}` : ""}`);
  }

  const stdout = (result.stdout || "").trim();
  if (!stdout) {
    fail(`${errorMessage}. CLI returned no output.`);
  }

  const jsonStart = stdout.indexOf("{");
  const jsonEnd = stdout.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
    return stdout;
  }

  const jsonSlice = stdout.slice(jsonStart, jsonEnd + 1);

  try {
    return JSON.parse(jsonSlice);
  } catch (error) {
    fail(`${errorMessage}. Failed to parse Stripe CLI output. ${error instanceof Error ? error.message : String(error)}\nOutput: ${stdout}`);
  }
}

async function readEnvFile() {
  if (existsSync(ENV_PATH)) {
    info(`Using environment file at ${ENV_PATH}`);
    const content = await readFile(ENV_PATH, "utf8");
    return { path: ENV_PATH, content };
  }

  if (existsSync(ENV_FALLBACK_PATH)) {
    warn(`Could not find .env.local, falling back to ${ENV_FALLBACK_PATH}.`);
    const content = await readFile(ENV_FALLBACK_PATH, "utf8");
    return { path: ENV_FALLBACK_PATH, content };
  }

  fail("No .env.local or .env file found. Create one before running this script.");
}

function parseEnv(content) {
  const lines = content.split(/\r?\n/);
  const map = new Map();

  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const [key, ...rest] = line.split("=");
    if (!key) continue;
    map.set(key.trim(), rest.join("=").trim());
  }

  return { lines, map };
}

function updateEnvLines(lines, updates) {
  const result = [...lines];

  for (const [key, value] of Object.entries(updates)) {
    let updated = false;
    for (let i = 0; i < result.length; i += 1) {
      const line = result[i];
      if (line.startsWith("#") || !line.includes("=")) continue;
      if (line.startsWith(`${key}=`)) {
        result[i] = `${key}=${value}`;
        updated = true;
        break;
      }
    }
    if (!updated) {
      result.push(`${key}=${value}`);
    }
  }

  return result.join("\n");
}

function ensureSecretKey(envMap) {
  const secret = envMap.get("STRIPE_SECRET_KEY");
  if (!secret) {
    fail("Missing STRIPE_SECRET_KEY in your environment file. Visit https://dashboard.stripe.com/test/apikeys and add it before running this script.");
  }
  info("Found STRIPE_SECRET_KEY in environment file.");
  return secret;
}

function ensureStripeCliAvailable() {
  const check = spawnSync(STRIPE_CLI, ["--help"], { encoding: "utf8" });
  if (check.status !== 0) {
    const output = (check.stderr || check.stdout || "").trim();
    fail(`Stripe CLI not found. Install it first: https://stripe.com/docs/stripe-cli (looked for command '${STRIPE_CLI}').${output ? `\nCLI output: ${output}` : ""}`);
  }
  info(`Stripe CLI detected: ${(spawnSync(STRIPE_CLI, ["version"], { encoding: "utf8" }).stdout || "").trim()}`);
}

function findExistingProduct(planId, apiKey) {
  const list = runStripe(["products", "list", "--limit", "100"], "Failed to list Stripe products", apiKey);
  const products = Array.isArray(list?.data) ? list.data : [];
  return products.find((product) => product.metadata?.planId === planId);
}

function createProduct(plan, apiKey) {
  info(`Creating product for plan '${plan.planId}'`);
  const productResult = runStripe(
    [
      "products",
      "create",
      "-d",
      `name=${plan.name}`,
      "-d",
      `description=${plan.description}`,
      "-d",
      "type=service",
      "-d",
      `metadata[planId]=${plan.planId}`,
    ],
    `Failed to create product for plan '${plan.planId}'`,
    apiKey
  );
  if (typeof productResult === "string") {
    fail(`Failed to create product for plan '${plan.planId}'. Received unexpected output: ${productResult}`);
  }

  return productResult;
}

function findExistingPrice(plan, productId, apiKey) {
  const list = runStripe(
    ["prices", "list", "--product", productId, "--limit", "100"],
    `Failed to list prices for product ${productId}`,
    apiKey
  );
  const prices = Array.isArray(list?.data) ? list.data : [];
  return prices.find((price) => {
    return (
      price.metadata?.planId === plan.planId &&
      price.currency === plan.currency &&
      price.unit_amount === plan.unitAmount &&
      price.recurring?.interval === plan.interval
    );
  });
}

function createPrice(plan, productId, apiKey) {
  info(`Creating price for plan '${plan.planId}'`);
  const priceResult = runStripe(
    [
      "prices",
      "create",
      "-d",
      `product=${productId}`,
      "-d",
      `unit_amount=${plan.unitAmount}`,
      "-d",
      `currency=${plan.currency}`,
      "-d",
      `recurring[interval]=${plan.interval}`,
      "-d",
      `metadata[planId]=${plan.planId}`,
    ],
    `Failed to create price for plan '${plan.planId}'`,
    apiKey
  );

  if (typeof priceResult === "string") {
    fail(`Failed to create price for plan '${plan.planId}'. Output: ${priceResult}`);
  }

  return priceResult;
}

(async () => {
  ensureStripeCliAvailable();

  const { path: envPath, content } = await readEnvFile();
  const { lines, map } = parseEnv(content);

  const apiKey = ensureSecretKey(map);

  const results = {};

  for (const plan of plans) {
    let product = findExistingProduct(plan.planId, apiKey);
    if (product) {
      info(`Found existing product for plan '${plan.planId}': ${product.id}`);
    } else {
      product = createProduct(plan, apiKey);
      info(`Created product ${product.id} for plan '${plan.planId}'.`);
    }

    let price = findExistingPrice(plan, product.id, apiKey);
    if (price) {
      info(`Found existing price for plan '${plan.planId}': ${price.id}`);
    } else {
      price = createPrice(plan, product.id, apiKey);
      info(`Created price ${price.id} for plan '${plan.planId}'.`);
    }

    results[plan.planId] = {
      productId: product.id,
      priceId: price.id,
    };
  }

  const updates = {
    NEXT_PUBLIC_STRIPE_PRICE_PRO: results.pro.priceId,
    NEXT_PUBLIC_STRIPE_PRICE_ULTRA: results.ultra.priceId,
  };

  const updatedContent = updateEnvLines(lines, updates);
  await writeFile(envPath, updatedContent, "utf8");

  info(`Updated ${envPath} with latest Stripe price IDs.`);
  console.log("\nStripe resources:");
  for (const plan of plans) {
    const result = results[plan.planId];
    console.log(`- ${plan.planId}: product ${result.productId}, price ${result.priceId}`);
  }

  console.log("\nAll done! If you need the publishable key, grab it at https://dashboard.stripe.com/test/apikeys and add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY manually.");
})();
