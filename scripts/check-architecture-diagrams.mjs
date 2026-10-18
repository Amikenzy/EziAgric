#!/usr/bin/env node
/**
 * Architecture diagrams as code (#275).
 *
 * Validates the Mermaid diagrams under `docs/architecture` and the committed
 * previews next to them:
 *
 *   1. every ```mermaid block parses as a supported diagram type and is
 *      syntactically balanced (quotes, brackets, no tabs, non-empty),
 *   2. every diagram has a committed preview under `docs/architecture/rendered`,
 *      and every label quoted in the Mermaid source still appears in that
 *      preview — a renamed node without a re-render fails the build,
 *   3. every committed preview is referenced by a document (no orphans),
 *   4. all relative links between the architecture documents resolve.
 *
 * Run `node scripts/check-architecture-diagrams.mjs` (default, no network) or
 * `node scripts/check-architecture-diagrams.mjs --render` to regenerate the
 * previews with `@mermaid-js/mermaid-cli`. Rendering needs headless Chromium,
 * so it is a local, opt-in step; CI runs the check only.
 */

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join, relative, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ARCH_DIR = join(ROOT, 'docs', 'architecture');
const RENDERED_DIR = join(ARCH_DIR, 'rendered');
const RENDER = process.argv.includes('--render');

const MERMAID_RE = /```mermaid\r?\n([\s\S]*?)```/g;
const IMAGE_RE = /!\[[^\]]*\]\(([^)\s]+)\)/g;
const LINK_RE = /\[[^\]]*\]\(([^)\s]+)\)/g;
const HEADERS = ['flowchart', 'graph', 'sequenceDiagram'];
const failures = [];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (full === RENDERED_DIR) continue;
      walk(full, out);
    } else if (entry.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

/** Quoted labels are the contract between a diagram and its rendered preview. */
function labelsOf(source) {
  return [...source.matchAll(/"([^"]+)"/g)].map((m) => m[1].trim()).filter(Boolean);
}

function checkSyntax(doc, source, index) {
  const where = `${doc} diagram ${index + 1}`;
  const header = source.trim().split(/\r?\n/, 1)[0].trim();
  if (!HEADERS.some((h) => header.startsWith(h))) {
    failures.push(`${where}: unsupported diagram type, expected one of ${HEADERS.join(', ')} (got "${header}")`);
    return;
  }
  if (source.includes('\t')) failures.push(`${where}: tab characters are not valid Mermaid indentation`);
  const quotes = (source.match(/"/g) || []).length;
  if (quotes % 2 !== 0) failures.push(`${where}: unbalanced double quotes`);
  for (const [open, close, name] of [['[', ']', 'brackets'], ['(', ')', 'parentheses'], ['{', '}', 'braces']]) {
    const opens = (source.match(new RegExp(`\\${open}`, 'g')) || []).length;
    const closes = (source.match(new RegExp(`\\${close}`, 'g')) || []).length;
    if (opens !== closes) failures.push(`${where}: unbalanced ${name}`);
  }
  const labels = labelsOf(source);
  if (labels.length === 0) failures.push(`${where}: no quoted labels — label the nodes so the preview can be checked`);
  if (/\b(TODO|TBD|FIXME)\b/.test(source)) failures.push(`${where}: placeholder text left in the diagram`);
  return labels;
}

function relLinkTargets(doc, contents) {
  const targets = [];
  for (const match of contents.matchAll(LINK_RE)) {
    const target = match[1];
    if (/^(https?:|mailto:|#)/i.test(target)) continue;
    targets.push(target.split('#')[0]);
  }
  return targets.filter(Boolean).map((t) => ({ target: t, abs: resolve(dirname(doc), t) }));
}

function main() {
  if (!existsSync(ARCH_DIR)) {
    failures.push('docs/architecture does not exist');
  }

  const docs = existsSync(ARCH_DIR) ? walk(ARCH_DIR) : [];
  const referencedPreviews = new Set();
  let diagrams = 0;

  for (const doc of docs) {
    const rel = relative(ROOT, doc);
    const contents = readFileSync(doc, 'utf8');

    for (const { target, abs } of relLinkTargets(doc, contents)) {
      if (!existsSync(abs)) failures.push(`${rel}: link target does not exist: ${target}`);
    }

    const blocks = [...contents.matchAll(MERMAID_RE)].map((m) => m[1]);
    const previews = [...contents.matchAll(IMAGE_RE)].map((m) => resolve(dirname(doc), m[1]));
    if (blocks.length === 0) {
      failures.push(`${rel}: no \`\`\`mermaid diagram found`);
      continue;
    }
    if (previews.length < blocks.length) {
      failures.push(`${rel}: ${blocks.length} diagram(s) but only ${previews.length} committed preview(s)`);
      continue;
    }

    blocks.forEach((source, index) => {
      diagrams += 1;
      const labels = checkSyntax(rel, source, index);
      const preview = previews[index];
      const previewName = relative(ROOT, preview);
      if (!existsSync(preview)) {
        failures.push(`${rel}: preview not committed: ${previewName}`);
        return;
      }
      const svg = readFileSync(preview, 'utf8');
      if (!svg.trimStart().startsWith('<svg')) failures.push(`${previewName}: preview is not an SVG file`);
      if (!svg.includes('</svg>')) failures.push(`${previewName}: preview SVG is truncated`);
      for (const label of labels || []) {
        if (!svg.includes(label)) {
          failures.push(
            `${previewName}: stale render — label "${label}" from ${rel} is missing. ` +
              `Re-run: node scripts/check-architecture-diagrams.mjs --render`,
          );
        }
      }
      referencedPreviews.add(preview);
    });
  }

  if (existsSync(RENDERED_DIR)) {
    for (const entry of readdirSync(RENDERED_DIR)) {
      if (!entry.endsWith('.svg')) continue;
      const full = join(RENDERED_DIR, entry);
      if (!referencedPreviews.has(full)) failures.push(`docs/architecture/rendered/${entry}: preview is not referenced by any document`);
      if (statSync(full).size === 0) failures.push(`docs/architecture/rendered/${entry}: preview is empty`);
    }
  }

  if (failures.length > 0) {
    console.error('Architecture diagram check failed:\n');
    for (const failure of failures) console.error(`  - ${failure}`);
    console.error(`\n${failures.length} problem(s). Diagrams are documented in docs/architecture/README.md.`);
    process.exit(1);
  }
  console.log(`Architecture diagrams OK: ${diagrams} diagram(s) across ${docs.length} document(s).`);
}

/** Regenerate previews with mermaid-cli (local only; needs Chromium). */
function renderAll() {
  const work = mkdtempSync(join(tmpdir(), 'arch-diagrams-'));
  for (const doc of walk(ARCH_DIR)) {
    const contents = readFileSync(doc, 'utf8');
    const blocks = [...contents.matchAll(MERMAID_RE)].map((m) => m[1]);
    const previews = [...contents.matchAll(IMAGE_RE)].map((m) => resolve(dirname(doc), m[1]));
    blocks.forEach((source, index) => {
      const input = join(work, `d${index}.mmd`);
      writeFileSync(input, source);
      execFileSync('npx', ['-y', '@mermaid-js/mermaid-cli', '-i', input, '-o', previews[index], '-b', 'transparent'], {
        stdio: 'inherit',
      });
      console.log(`rendered ${relative(ROOT, previews[index])}`);
    });
  }
}

if (RENDER) {
  renderAll();
  console.log('Previews regenerated. Review the diff before committing.');
} else {
  main();
}
