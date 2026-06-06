/**
 * Regenerates recorded acceptance HTML snapshots for CI.
 * Run: node scripts/generate-acceptance-fixtures.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REDDIT_COMMENT_COUNT = 48;

function buildRedditThreadHtml(commentCount) {
    const commentHtml = Array.from({ length: commentCount }, (_, index) => {
        const number = index + 1;
        const id = `comment-${String(number).padStart(3, '0')}`;
        return (
            `<shreddit-comment class="comment" data-testid="comment" data-thing-id="t1_${String(number).padStart(4, '0')}" id="t1_${String(number).padStart(4, '0')}" data-comment-index="${number}">` +
            `<div slot="text">` +
            `<p data-fixture-unit="${id}">` +
            `Synthetic comment ${number} on a popular thread about engineering practices, ` +
            `written to resemble forum replies loaded progressively in a virtualized feed ` +
            `without relying on brittle site-specific identifiers or adapter heuristics.` +
            `</p></div></shreddit-comment>`
        );
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>Acceptance — reddit thread snapshot</title></head>
<body>
  <main id="thread">
    <article class="post" data-testid="post-container">
      <p data-fixture-unit="post-body">
        Original post body asking for experiences with large comment threads and how teams
        validate discovery pipelines before shipping browser extensions to production users.
      </p>
    </article>
    <div id="comments">${commentHtml}</div>
  </main>
</body>
</html>`;
}

const acceptanceDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../tests/fixtures/acceptance'
);

const redditPath = path.join(acceptanceDir, 'reddit-thread.html');
fs.writeFileSync(redditPath, buildRedditThreadHtml(REDDIT_COMMENT_COUNT), 'utf-8');
console.log(`Wrote ${redditPath} (${REDDIT_COMMENT_COUNT} comments)`);
