#!/usr/bin/env node
/**
 * Lighthouse Performance Audit Script
 *
 * Usage: node scripts/lighthouse-audit.mjs [url]
 *
 * Requires: npm install -g lighthouse
 * Or run via npx: npx lighthouse http://localhost:3000 --output=json
 *
 * Target scores (from docs/session_state.md):
 * - Performance: ≥90
 * - Accessibility: ≥90
 * - Best Practices: ≥90
 * - SEO: ≥80
 */

import { spawn } from "child_process";
import { writeFileSync, mkdirSync, existsSync } from "fs";

const DEFAULT_URL = "http://localhost:3000";
const OUTPUT_DIR = "tests/performance/lighthouse-reports";

const TARGETS = {
  performance: 90,
  accessibility: 90,
  "best-practices": 90,
  seo: 80,
};

const ROUTES_TO_TEST = [
  "/",
  "/plans",
  "/workout",
  "/progress",
  "/settings",
];

async function runLighthouse(url) {
  return new Promise((resolve, reject) => {
    const args = [
      url,
      "--output=json",
      "--output-path=stdout",
      "--chrome-flags=--headless",
      "--only-categories=performance,accessibility,best-practices,seo",
      "--throttling-method=simulate",
      "--preset=mobile",
    ];

    const lighthouse = spawn("npx", ["lighthouse", ...args], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    lighthouse.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    lighthouse.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    lighthouse.on("close", (code) => {
      if (code !== 0) {
        console.error("Lighthouse stderr:", stderr);
        reject(new Error(`Lighthouse exited with code ${code}`));
        return;
      }

      try {
        // Find JSON in output (lighthouse outputs progress to stdout too)
        const jsonStart = stdout.indexOf("{");
        const jsonStr = stdout.slice(jsonStart);
        const result = JSON.parse(jsonStr);
        resolve(result);
      } catch (e) {
        reject(new Error(`Failed to parse Lighthouse output: ${e.message}`));
      }
    });
  });
}

function extractScores(result) {
  const categories = result.categories;
  return {
    performance: Math.round(categories.performance.score * 100),
    accessibility: Math.round(categories.accessibility.score * 100),
    "best-practices": Math.round(categories["best-practices"].score * 100),
    seo: Math.round(categories.seo.score * 100),
  };
}

function formatScore(score, target) {
  const passed = score >= target;
  const symbol = passed ? "✅" : "❌";
  return `${symbol} ${score} (target: ${target})`;
}

async function auditRoute(baseUrl, route) {
  const url = `${baseUrl}${route}`;
  console.log(`\n📊 Auditing: ${url}`);
  console.log("─".repeat(40));

  try {
    const result = await runLighthouse(url);
    const scores = extractScores(result);

    let allPassed = true;
    for (const [category, score] of Object.entries(scores)) {
      const target = TARGETS[category];
      const passed = score >= target;
      if (!passed) allPassed = false;
      console.log(`  ${category}: ${formatScore(score, target)}`);
    }

    return { route, scores, passed: allPassed, result };
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return { route, error: error.message, passed: false };
  }
}

async function main() {
  const baseUrl = process.argv[2] || DEFAULT_URL;

  console.log("🏋️ Workout Tracker - Lighthouse Performance Audit");
  console.log("═".repeat(50));
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Targets: Performance≥${TARGETS.performance}, A11y≥${TARGETS.accessibility}`);

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const results = [];
  let overallPassed = true;

  for (const route of ROUTES_TO_TEST) {
    const result = await auditRoute(baseUrl, route);
    results.push(result);
    if (!result.passed) overallPassed = false;
  }

  // Summary
  console.log("\n" + "═".repeat(50));
  console.log("📋 SUMMARY");
  console.log("─".repeat(50));

  for (const result of results) {
    if (result.error) {
      console.log(`  ${result.route}: ❌ Error`);
    } else {
      const status = result.passed ? "✅ PASS" : "❌ FAIL";
      console.log(`  ${result.route}: ${status} (Perf: ${result.scores.performance})`);
    }
  }

  console.log("─".repeat(50));
  console.log(overallPassed ? "✅ All audits passed!" : "❌ Some audits failed");

  // Save summary report
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = `${OUTPUT_DIR}/audit-${timestamp}.json`;

  const summary = {
    timestamp: new Date().toISOString(),
    baseUrl,
    targets: TARGETS,
    overallPassed,
    results: results.map((r) => ({
      route: r.route,
      passed: r.passed,
      scores: r.scores,
      error: r.error,
    })),
  };

  writeFileSync(reportPath, JSON.stringify(summary, null, 2));
  console.log(`\n📄 Report saved to: ${reportPath}`);

  process.exit(overallPassed ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
