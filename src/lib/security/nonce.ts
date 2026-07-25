import { headers } from 'next/headers';

const noncePattern = /^[A-Za-z0-9+/_-]{20,128}={0,2}$/;

export async function getCspNonce(): Promise<string | undefined> {
  const nonce = (await headers()).get('x-nonce')?.trim();
  return nonce && noncePattern.test(nonce) ? nonce : undefined;
}
