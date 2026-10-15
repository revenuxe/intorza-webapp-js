import { useEffect, useState } from 'react';
import { resolveCompanyAssetUrl } from '@/lib/company-assets';

export function useCompanyAssetUrl(value?: string | null) {
  const [resolved, setResolved] = useState<{ value: string; url: string }>();
  useEffect(() => {
    let active = true;
    const refresh = () => {
      if (!value) return;
      resolveCompanyAssetUrl(value).then(url => {
        if (active) setResolved({ value, url });
      }).catch(() => { if (active) setResolved(undefined); });
    };
    refresh();
    const timer = setInterval(refresh, 50 * 60 * 1000);
    return () => { active = false; clearInterval(timer); };
  }, [value]);
  return resolved?.value === value ? resolved.url : undefined;
}
