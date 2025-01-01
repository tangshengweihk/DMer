export function setCacheControl(headers: Headers) {
  headers.set(
    "Cache-Control",
    "public, max-age=60, s-maxage=60, stale-while-revalidate=300"
  );
} 