/**
 * Tiny, dependency-free Markdown renderer for blog + email bodies.
 * Supports headings, bold/italic, links, bullet/numbered lists, and paragraphs —
 * enough for our editorial content without pulling in a full parser. HTML is
 * escaped first so authored content can't inject markup.
 */
function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inline(s: string) {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
}

export function renderMarkdown(md: string): string {
  const blocks = md.trim().split(/\n{2,}/);
  return blocks
    .map((block) => {
      const lines = block.split("\n");

      // Heading: a standalone `#`/`##`/`###` line.
      const h = lines.length === 1 ? block.match(/^(#{1,3})\s+(.*)$/) : null;
      if (h) {
        const level = h[1].length + 1; // # -> h2
        return `<h${level}>${inline(h[2])}</h${level}>`;
      }

      // Unordered list: every line is a `-` or `*` bullet.
      if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
        const items = lines.map((l) => `<li>${inline(l.replace(/^\s*[-*]\s+/, ""))}</li>`).join("");
        return `<ul>${items}</ul>`;
      }

      // Ordered list: every line is `1.`, `2.`, …
      if (lines.every((l) => /^\s*\d+\.\s+/.test(l))) {
        const items = lines.map((l) => `<li>${inline(l.replace(/^\s*\d+\.\s+/, ""))}</li>`).join("");
        return `<ol>${items}</ol>`;
      }

      return `<p>${inline(block).replace(/\n/g, "<br/>")}</p>`;
    })
    .join("\n");
}
