#!/usr/bin/env node

/**
 * Set Firebase custom claims for a Gymory user.
 *
 * Usage:
 *   node scripts/set-firebase-custom-claims.mjs --email admin@example.com --role admin
 *   node scripts/set-firebase-custom-claims.mjs --uid FIREBASE_UID --role user
 *   node scripts/set-firebase-custom-claims.mjs --email admin@example.com --admin true
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await loadEnvFiles([
  path.resolve(__dirname, "../.env.local"),
  path.resolve(__dirname, "../apps/web/.env.local"),
]);

const args = parseArgs(process.argv.slice(2));

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

async function main() {
  const uid = args.uid;
  const email = args.email;

  if (!uid && !email) {
    throw new Error("Pass either --uid <firebase_uid> or --email <email>");
  }

  const explicitAdmin = parseBoolean(args.admin);
  const role = normalizeRole(args.role);

  if (!role && explicitAdmin === null) {
    throw new Error("Pass --role admin|user or --admin true|false");
  }

  const auth = getAuth(getFirebaseAdminApp());
  const userRecord = uid
    ? await auth.getUser(uid)
    : await auth.getUserByEmail(String(email));

  const existingClaims = userRecord.customClaims ?? {};
  const nextClaims = {
    ...existingClaims,
    ...(role ? { role } : {}),
    ...(explicitAdmin !== null ? { admin: explicitAdmin } : {}),
  };

  await auth.setCustomUserClaims(userRecord.uid, nextClaims);

  console.log(
    JSON.stringify(
      {
        uid: userRecord.uid,
        email: userRecord.email,
        claims: nextClaims,
        reminder:
          "Claims updated. Ask the user to sign out and sign back in so the new session picks them up.",
      },
      null,
      2
    )
  );
}

function getFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY"
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") continue;
    if (!arg.startsWith("--")) continue;

    const key = arg.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      index += 1;
    }
  }

  return parsed;
}

function normalizeRole(value) {
  if (!value) return null;
  if (value === "admin" || value === "user") return value;
  throw new Error("Invalid --role value. Use admin or user.");
}

function parseBoolean(value) {
  if (value === undefined) return null;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  throw new Error("Invalid --admin value. Use true or false.");
}

async function loadEnvFiles(filePaths) {
  for (const filePath of filePaths) {
    let raw;
    try {
      raw = await readFile(filePath, "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }

    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) continue;

      const [, key, rawValue] = match;
      if (process.env[key] !== undefined) continue;

      process.env[key] = parseEnvValue(rawValue);
    }
  }
}

function parseEnvValue(value) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).replace(/\\n/g, "\n");
  }

  return trimmed;
}
