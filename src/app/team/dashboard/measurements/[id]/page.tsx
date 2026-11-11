import View from '@/views/SiteMeasurementDetail';
import { TeamPortalGuard } from '@/components/TeamPortalGuard';

export default function Page() {
  return <TeamPortalGuard><View teamPortal /></TeamPortalGuard>;
}
