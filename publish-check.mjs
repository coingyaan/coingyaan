#!/usr/bin/env node
/* CoinGyaan publishing safety gate.
   Run this in the repo (cgv3) BEFORE `git commit`. It compares the article,
   category, tag and author sets in the working assets/js/news-data.js against
   the last committed version (git HEAD). Publishing must be ADDITIVE:
     - articles may increase by one (new article) or stay the same (edit)
     - categories, tags and authors may grow, never shrink
   If anything would be REMOVED, it prints what and exits non-zero so you STOP
   and investigate instead of committing content loss.

   Usage (in cgv3, after robocopy, before commit):
       node publish-check.mjs
   Exit 0 = safe to commit.  Exit 1 = BLOCKED, do not commit. */

import fs from "fs";
import { execSync } from "child_process";

function loadData(code) {
  const module = { exports: {} };
  const window = {};
  const fn = new Function("module", "window", code + "\nreturn (module.exports && module.exports.NEWS_ARTICLES) ? module.exports : window;");
  return fn(module, window);
}

function sset(arr) { return new Set((arr || []).map((t) => (t && t.slug) ? t.slug : t)); }
function originals(d) { return (d.NEWS_ARTICLES || []).filter((a) => a.type === "original"); }

let curCode, prevCode;
try { curCode = fs.readFileSync("assets/js/news-data.js", "utf8"); }
catch { console.error("publish-check: cannot read assets/js/news-data.js from here. Run it in the repo root."); process.exit(2); }
try { prevCode = execSync("git show HEAD:assets/js/news-data.js", { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }); }
catch { console.log("publish-check: no previous news-data.js at HEAD (first commit). Skipping."); process.exit(0); }

const cur = loadData(curCode), prev = loadData(prevCode);
const beforeArts = originals(prev), afterArts = originals(cur);
const beforeSlugs = new Set(beforeArts.map((a) => a.slug));
const afterSlugs = new Set(afterArts.map((a) => a.slug));
const removedArticles = [...beforeSlugs].filter((s) => !afterSlugs.has(s));
const addedArticles = [...afterSlugs].filter((s) => !beforeSlugs.has(s));

const removedCats = [...sset(prev.NEWS_CATEGORIES)].filter((s) => !sset(cur.NEWS_CATEGORIES).has(s));
const removedTags = [...sset(prev.NEWS_TAGS)].filter((s) => !sset(cur.NEWS_TAGS).has(s));
const removedAuthors = Object.keys(prev.NEWS_AUTHORS || {}).filter((k) => !(k in (cur.NEWS_AUTHORS || {})));

console.log("CoinGyaan publish-check");
console.log("  articles:   " + beforeArts.length + " -> " + afterArts.length + (addedArticles.length ? "  (added: " + addedArticles.join(", ") + ")" : ""));
console.log("  categories: " + sset(prev.NEWS_CATEGORIES).size + " -> " + sset(cur.NEWS_CATEGORIES).size);
console.log("  tags:       " + sset(prev.NEWS_TAGS).size + " -> " + sset(cur.NEWS_TAGS).size);
console.log("  authors:    " + Object.keys(prev.NEWS_AUTHORS || {}).length + " -> " + Object.keys(cur.NEWS_AUTHORS || {}).length);

let blocked = false;
function flag(label, arr) { if (arr.length) { blocked = true; console.error("  REMOVED " + label + ": " + arr.join(", ")); } }
flag("articles", removedArticles);
flag("categories", removedCats);
flag("tags", removedTags);
flag("authors", removedAuthors);

if (blocked) {
  console.error("\n\u274C PUBLISH BLOCKED: the change above would REMOVE published content.");
  console.error("   Do NOT commit. Reconcile assets/js/news-data.js with the repo and restore the missing entries first.");
  process.exit(1);
}
if (afterArts.length > beforeArts.length + 1) {
  console.log("\n\u2139 Note: article count grew by more than one. Fine if intentional (bulk add).");
}
console.log("\n\u2705 Publish safe: additive only. OK to commit.");
process.exit(0);
