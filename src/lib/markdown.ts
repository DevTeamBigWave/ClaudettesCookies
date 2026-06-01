/**
 * Tiny, dependency-free Markdown renderer for blog + email bodies.
 * Supports headings, bold/italic, links, and paragraphs — enough for our
 * editorial content without pulling in a full parser. HTML is escaped first so
 * authored content can't inject markup.
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
      const h = block.match(/^(#{1,3})\s+(.*)$/);
      if (h) {
        const level = h[1].length + 1; // # -> h2
        return `<h${level}>${inline(h[2])}</h${level}>`;
      }
      return `<p>${inline(block).replace(/\n/g, "<br/>")}</p>`;
    })
    .join("\n");
}
