"use client";

import type { ImgHTMLAttributes } from 'react';
import { useCompanyAssetUrl } from '@/hooks/useCompanyAssetUrl';

export function CompanyAssetImage({ src, ...props }: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { src?: string }) {
  const url = useCompanyAssetUrl(src);
  return <img {...props} src={url} />;
}
