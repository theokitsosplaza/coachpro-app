import { verifyCoachSession } from '@/lib/dal';
import { SettingsClient } from './SettingsClient';

export default async function SettingsPage() {
  const coach = await verifyCoachSession();

  return (
    <SettingsClient
      initialProfile={{
        name:         coach.name         ?? '',
        email:        coach.email,
        businessName: coach.businessName ?? '',
        website:      coach.website      ?? '',
      }}
    />
  );
}
