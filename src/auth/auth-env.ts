export const REQUIRED_AUTH_ENV_KEYS = [
  'OAUTH_REDIRECT_URL',
  'KAKAO_CLIENT_ID',
  'KAKAO_CLIENT_SECRET',
  'KAKAO_REDIRECT_URI',
] as const;

export function assertRequiredAuthEnv(
  env: Record<string, string | undefined>,
  isProduction: boolean,
): void {
  if (!isProduction) return;

  const missing = REQUIRED_AUTH_ENV_KEYS.filter((key) => {
    const value = env[key];
    return typeof value !== 'string' || value.trim().length === 0;
  });

  if (missing.length > 0) {
    throw new Error(
      `[AuthModule] Missing required environment variables in production: ${missing.join(', ')}`,
    );
  }
}
