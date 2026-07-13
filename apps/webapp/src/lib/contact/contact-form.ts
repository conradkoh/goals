export type ContactFormValues = {
  name: string;
  email: string;
  organization: string;
  notes: string;
};

export type ContactInput = {
  name: string;
  email?: string;
  organization?: string;
  notes?: string;
};

export type UpdateContactInput = {
  name: string;
  email?: string | null;
  organization?: string | null;
  notes?: string | null;
};

export const EMPTY_CONTACT_FORM: ContactFormValues = {
  name: '',
  email: '',
  organization: '',
  notes: '',
};

export function contactToFormValues(contact: {
  name: string;
  email?: string;
  organization?: string;
  notes?: string;
}): ContactFormValues {
  return {
    name: contact.name,
    email: contact.email ?? '',
    organization: contact.organization ?? '',
    notes: contact.notes ?? '',
  };
}

// fallow-ignore-next-line complexity
export function normalizeContactForm(values: ContactFormValues): ContactInput | null {
  const trimmedName = values.name.trim();
  if (!trimmedName) return null;

  const result: ContactInput = { name: trimmedName };
  const email = values.email.trim();
  const organization = values.organization.trim();
  const notes = values.notes.trim();

  if (email) result.email = email;
  if (organization) result.organization = organization;
  if (notes) result.notes = notes;

  return result;
}

// fallow-ignore-next-line complexity
export function normalizeContactFormForUpdate(
  values: ContactFormValues
): UpdateContactInput | null {
  const normalized = normalizeContactForm(values);
  if (!normalized) return null;

  return {
    name: normalized.name,
    email: values.email.trim() ? values.email.trim() : null,
    organization: values.organization.trim() ? values.organization.trim() : null,
    notes: values.notes.trim() ? values.notes.trim() : null,
  };
}
