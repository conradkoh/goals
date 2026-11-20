import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Authorize CLI · Goals',
  robots: { index: false, follow: false },
};

/** Metadata-only layout for the CLI approval route. */
export default function CliAuthorizeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
