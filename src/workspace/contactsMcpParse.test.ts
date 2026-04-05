/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseContactsListMcpText } from './contactsMcpParse';

describe('parseContactsListMcpText', () => {
  it('parses blocks, summary, and next page token', () => {
    const text = `Contacts for user@example.com (2 of 99):

Contact ID: c111
Name: Alpha Example
Email: alpha@example.com
Phone: 555-0100

Contact ID: c222
Name: Beta Example
Organization: at Acme

Next page token: page_token_xyz
`;
    const r = parseContactsListMcpText(text);
    assert.equal(r.summaryLine, 'Contacts for user@example.com (2 of 99):');
    assert.equal(r.nextPageToken, 'page_token_xyz');
    assert.equal(r.contacts.length, 2);
    assert.equal(r.contacts[0].contactId, 'c111');
    assert.equal(r.contacts[0].name, 'Alpha Example');
    assert.equal(r.contacts[0].email, 'alpha@example.com');
    assert.equal(r.contacts[0].phone, '555-0100');
    assert.equal(r.contacts[1].organization, 'at Acme');
  });

  it('handles contact without Name line', () => {
    const text = `Contact ID: c333
Phone: 111
`;
    const r = parseContactsListMcpText(text);
    assert.equal(r.contacts.length, 1);
    assert.equal(r.contacts[0].contactId, 'c333');
    assert.equal(r.contacts[0].name, null);
    assert.equal(r.contacts[0].phone, '111');
  });
});
