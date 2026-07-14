'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { useDeviceScreenInfo } from '@/hooks/useDeviceScreenInfo';
import {
  buildDashboardViewHref,
  getLegacyViewModeRedirectHref,
} from '@/lib/dashboard/dashboardUrlParams';

const DashboardRedirectPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isMobile } = useDeviceScreenInfo();

  useEffect(() => {
    const legacy = getLegacyViewModeRedirectHref(searchParams);
    if (legacy) {
      router.replace(legacy);
      return;
    }

    const defaultViewMode = isMobile ? 'focused' : 'quarterly';
    router.replace(buildDashboardViewHref(defaultViewMode));
  }, [router, searchParams, isMobile]);

  return null;
};

export default DashboardRedirectPage;
