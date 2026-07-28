import { describe, expect, it } from 'vitest';

import { contactToFormValues, EMPTY_CONTACT_FORM, normalizeContactForm } from './contact-form';

describe('normalizeContactForm', () => {
  it('returns null for blank or whitespace-only name', () => {
    expect(normalizeContactForm({ ...EMPTY_CONTACT_FORM, name: '' })).toBeNull();
    expect(normalizeContactForm({ ...EMPTY_CONTACT_FORM, name: '   ' })).toBeNull();
  });

  it('trims all values', () => {
    expect(
      normalizeContactForm({
        name: '  Alice  ',
        email: '  alice@example.com  ',
        organization: '  Acme  ',
        notes: '  Met at conference  ',
      })
    ).toEqual({
      name: 'Alice',
      email: 'alice@example.com',
      organization: 'Acme',
      notes: 'Met at conference',
    });
  });

  it('omits blank optional fields', () => {
    expect(
      normalizeContactForm({
        name: 'Bob',
        email: '  ',
        organization: '',
        notes: '   ',
      })
    ).toEqual({ name: 'Bob' });
  });
});

describe('contactToFormValues', () => {
  it('maps undefined optionals to empty strings', () => {
    expect(
      contactToFormValues({
        name: 'Carol',
      })
    ).toEqual({
      name: 'Carol',
      email: '',
      organization: '',
      notes: '',
    });
  });
});
