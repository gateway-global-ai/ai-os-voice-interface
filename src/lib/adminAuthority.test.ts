import test from 'node:test';
import assert from 'node:assert/strict';
import {
  browserSupabaseKeyUsesServiceRole,
  decodeSupabaseJwtRole,
  describeAdminPrincipal,
  hasSupabaseAdminClaim,
} from './adminAuthority';

function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function makeJwt(payload: Record<string, unknown>): string {
  return `${toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${toBase64Url(JSON.stringify(payload))}.sig`;
}

test('decodeSupabaseJwtRole reads the role claim from a JWT payload', () => {
  assert.equal(decodeSupabaseJwtRole(makeJwt({ role: 'service_role' })), 'service_role');
  assert.equal(decodeSupabaseJwtRole(makeJwt({ role: 'anon' })), 'anon');
});

test('browserSupabaseKeyUsesServiceRole only flags service role keys', () => {
  assert.equal(browserSupabaseKeyUsesServiceRole(makeJwt({ role: 'service_role' })), true);
  assert.equal(browserSupabaseKeyUsesServiceRole(makeJwt({ role: 'anon' })), false);
  assert.equal(browserSupabaseKeyUsesServiceRole('not-a-jwt'), false);
});

test('hasSupabaseAdminClaim only trusts app_metadata.is_admin', () => {
  assert.equal(hasSupabaseAdminClaim({ app_metadata: { is_admin: true } }), true);
  assert.equal(hasSupabaseAdminClaim({ app_metadata: { is_admin: 'true' } }), true);
  assert.equal(hasSupabaseAdminClaim({ app_metadata: { role: 'admin' } }), false);
  assert.equal(hasSupabaseAdminClaim({ app_metadata: { is_admin: false } }), false);
});

test('describeAdminPrincipal prefers email, then phone, then user id', () => {
  assert.equal(
    describeAdminPrincipal({
      id: 'user-1',
      email: 'admin@example.com',
      phone: '+15551234567',
      app_metadata: {},
    }),
    'admin@example.com',
  );
  assert.equal(
    describeAdminPrincipal({
      id: 'user-2',
      email: null,
      phone: '+15551234567',
      app_metadata: {},
    }),
    '+15551234567',
  );
  assert.equal(
    describeAdminPrincipal({
      id: 'user-3',
      email: null,
      phone: null,
      app_metadata: {},
    }),
    'user user-3',
  );
});
