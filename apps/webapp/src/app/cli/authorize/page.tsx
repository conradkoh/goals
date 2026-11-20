'use client';

import { Suspense } from 'react';

import { SearchParamsErrorHandler } from '@/components/SearchParamsErrorHandler';
import { CliAuthorizeLoading } from '@/modules/cli/authorize/CliAuthorizeLoading';
import { CliAuthorizePage } from '@/modules/cli/authorize/CliAuthorizePage';

/**
 * Route entry for `/cli/authorize?request=<id>`.
 *
 * `CliAuthorizePage` reads `useSearchParams`, so it must sit under a Suspense boundary; the
 * fallback is the same loading screen the auth gate shows.
 */
export default function CliAuthorizeRoute() {
  return (
    <Suspense fallback={<CliAuthorizeLoading />}>
      <SearchParamsErrorHandler />
      <CliAuthorizePage />
    </Suspense>
  );
}
