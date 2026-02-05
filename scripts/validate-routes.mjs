#!/usr/bin/env node

/**
 * Route Validation Script
 *
 * Scans all Link components in the codebase and validates that their href
 * destinations exist as actual routes in the app directory.
 *
 * Usage: node scripts/validate-routes.mjs
 *
 * Exit codes:
 *   0 - All routes are valid
 *   1 - Broken routes found
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  dim: '\x1b[2m',
};

/**
 * Recursively get all files matching extensions
 */
function getAllFiles(dir, extensions, files = []) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip node_modules and hidden directories
      if (item !== 'node_modules' && !item.startsWith('.')) {
        getAllFiles(fullPath, extensions, files);
      }
    } else if (extensions.some(ext => item.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Get all valid routes from app directory
 */
function getValidRoutes(appDir) {
  const routes = new Set(['/']);

  function scanDir(dir, routePath = '') {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip private folders (starting with _) and route groups (in parentheses)
        if (item.startsWith('_') || item.startsWith('(')) {
          scanDir(fullPath, routePath);
        } else {
          // Handle dynamic routes [param]
          const routeSegment = item.startsWith('[') ? item : item;
          scanDir(fullPath, `${routePath}/${routeSegment}`);
        }
      } else if (item === 'page.tsx' || item === 'page.ts' || item === 'page.js') {
        // This directory is a valid route
        routes.add(routePath || '/');
      }
    }
  }

  scanDir(appDir);
  return routes;
}

/**
 * Get all static files from public directory
 */
function getStaticFiles(publicDir) {
  const files = new Set();

  if (!fs.existsSync(publicDir)) {
    return files;
  }

  function scanDir(dir, urlPath = '') {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDir(fullPath, `${urlPath}/${item}`);
      } else {
        files.add(`${urlPath}/${item}`);
      }
    }
  }

  scanDir(publicDir);
  return files;
}

/**
 * Extract href values from Link components in a file
 */
function extractLinkHrefs(content, filePath) {
  const links = [];

  // Match href={`...`} or href="..." patterns
  const patterns = [
    // Template literal: href={`/path/${var}/etc`}
    /href=\{`([^`]+)`\}/g,
    // String literal: href="/path"
    /href="([^"]+)"/g,
    // Single quotes: href='/path'
    /href='([^']+)'/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const href = match[1];
      // Skip external URLs and anchors
      if (href.startsWith('/') && !href.startsWith('//')) {
        // Find line number
        const beforeMatch = content.substring(0, match.index);
        const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;

        links.push({
          href,
          file: filePath,
          line: lineNumber,
        });
      }
    }
  }

  return links;
}

/**
 * Normalize a route pattern for comparison
 * Converts /plans/123/edit to /plans/[planId]/edit
 */
function normalizeRoute(route, validRoutes) {
  // Direct match
  if (validRoutes.has(route)) {
    return { normalized: route, valid: true };
  }

  // Try to match dynamic routes
  const segments = route.split('/').filter(Boolean);

  for (const validRoute of validRoutes) {
    const validSegments = validRoute.split('/').filter(Boolean);

    if (segments.length !== validSegments.length) continue;

    let matches = true;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const validSeg = validSegments[i];

      // Dynamic segment matches anything
      if (validSeg.startsWith('[') && validSeg.endsWith(']')) {
        continue;
      }

      if (seg !== validSeg) {
        matches = false;
        break;
      }
    }

    if (matches) {
      return { normalized: validRoute, valid: true };
    }
  }

  return { normalized: route, valid: false };
}

/**
 * Check if a route pattern could be valid (has template variables)
 */
function hasTemplateVariable(href) {
  return href.includes('${');
}

/**
 * Main validation function
 */
function validateRoutes() {
  console.log(`${colors.blue}Route Validation Script${colors.reset}\n`);

  const srcDir = path.join(projectRoot, 'src');
  const appDir = path.join(srcDir, 'app');
  const publicDir = path.join(projectRoot, 'public');

  if (!fs.existsSync(appDir)) {
    console.error(`${colors.red}Error: app directory not found at ${appDir}${colors.reset}`);
    process.exit(1);
  }

  // Get all valid routes
  console.log(`${colors.dim}Scanning app directory for routes...${colors.reset}`);
  const validRoutes = getValidRoutes(appDir);
  console.log(`${colors.green}Found ${validRoutes.size} valid routes${colors.reset}`);

  // Get all static files
  console.log(`${colors.dim}Scanning public directory for static files...${colors.reset}`);
  const staticFiles = getStaticFiles(publicDir);
  console.log(`${colors.green}Found ${staticFiles.size} static files${colors.reset}`);

  // List routes for reference
  console.log(`\n${colors.dim}Valid routes:${colors.reset}`);
  for (const route of [...validRoutes].sort()) {
    console.log(`  ${route}`);
  }

  // Get all source files
  console.log(`\n${colors.dim}Scanning source files for Link components...${colors.reset}`);
  const sourceFiles = getAllFiles(srcDir, ['.tsx', '.ts', '.jsx', '.js']);

  // Extract all links
  const allLinks = [];
  for (const file of sourceFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const links = extractLinkHrefs(content, file);
    allLinks.push(...links);
  }

  console.log(`${colors.green}Found ${allLinks.length} internal links${colors.reset}\n`);

  // Validate each link
  const brokenLinks = [];
  const validatedLinks = [];
  const templateLinks = []; // Links with template variables
  const staticLinks = []; // Links to static files

  for (const link of allLinks) {
    // Check if it's a static file link
    if (staticFiles.has(link.href)) {
      staticLinks.push({ ...link, type: 'static' });
      continue;
    }

    if (hasTemplateVariable(link.href)) {
      // Extract the static pattern for validation
      const pattern = link.href.replace(/\$\{[^}]+\}/g, '[param]');
      const result = normalizeRoute(pattern, validRoutes);

      if (result.valid) {
        templateLinks.push({ ...link, pattern, matchedRoute: result.normalized });
      } else {
        brokenLinks.push({ ...link, pattern, reason: 'No matching dynamic route' });
      }
    } else {
      const result = normalizeRoute(link.href, validRoutes);
      if (result.valid) {
        validatedLinks.push({ ...link, matchedRoute: result.normalized });
      } else {
        brokenLinks.push({ ...link, reason: 'Route does not exist' });
      }
    }
  }

  // Report results
  if (brokenLinks.length === 0) {
    console.log(`${colors.green}All routes are valid!${colors.reset}`);
    console.log(`  ${colors.dim}Route links: ${validatedLinks.length}${colors.reset}`);
    console.log(`  ${colors.dim}Dynamic links: ${templateLinks.length}${colors.reset}`);
    console.log(`  ${colors.dim}Static file links: ${staticLinks.length}${colors.reset}`);
    return 0;
  }

  console.log(`${colors.red}Found ${brokenLinks.length} broken link(s):${colors.reset}\n`);

  for (const link of brokenLinks) {
    const relativePath = path.relative(projectRoot, link.file);
    console.log(`${colors.red}  href="${link.href}"${colors.reset}`);
    console.log(`    ${colors.dim}File: ${relativePath}:${link.line}${colors.reset}`);
    console.log(`    ${colors.yellow}Reason: ${link.reason}${colors.reset}`);
    if (link.pattern) {
      console.log(`    ${colors.dim}Pattern: ${link.pattern}${colors.reset}`);
    }
    console.log();
  }

  console.log(`${colors.yellow}Tip: Ensure the destination route has a page.tsx file${colors.reset}`);

  return 1;
}

// Run validation
const exitCode = validateRoutes();
process.exit(exitCode);
