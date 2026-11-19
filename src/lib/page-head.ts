/** Per-page head metadata for signed-in FinWise pages. */
export function pageHead(title: string, description: string) {
  const full = `${title} — FinWise 2.0`;
  return {
    meta: [
      { title: full },
      { name: "description", content: description },
      { property: "og:title", content: full },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  };
}
