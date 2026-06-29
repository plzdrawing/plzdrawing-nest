export const DEFAULT_CORS_ORIGINS = [
  'http://localhost:3000',
  'https://plzdrawing.o-r.kr',
];

export function parseCorsOrigins(
  value: string | undefined,
  defaultOrigins: readonly string[] = DEFAULT_CORS_ORIGINS,
): string[] {
  const origins = (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (origins.length === 0) {
    return [...defaultOrigins];
  }

  return [...new Set(origins)];
}
