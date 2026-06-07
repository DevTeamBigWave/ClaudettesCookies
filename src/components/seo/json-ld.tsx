/**
 * Renders one or more schema.org objects as a JSON-LD <script>. Server-safe.
 * Pass a single schema object or an array; arrays are emitted as a @graph-free
 * list of separate scripts is unnecessary — a JSON array of nodes is valid.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      // Schema is built from our own data, not user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
