import { verifyCoachSession } from '@/lib/dal';
import { parseCoachQuestions } from '@/lib/questionnaire';
import { mergeCoachConfig } from '@/lib/coach-config';
import { SettingsClient } from './SettingsClient';

export default async function SettingsPage() {
  const coach = await verifyCoachSession();

  return (
    <SettingsClient
      isAdmin={coach.isAdmin}
      initialQuestions={parseCoachQuestions(coach.questionnaire)}
      initialConfig={mergeCoachConfig(coach.config)}
      initialProfile={{
        name:         coach.name         ?? '',
        email:        coach.email,
        businessName: coach.businessName ?? '',
        website:      coach.website      ?? '',
      }}
    />
  );
}
