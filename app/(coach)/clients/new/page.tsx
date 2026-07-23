import { AddClientForm } from "./AddClientForm";
import { verifyCoachSession } from "@/lib/dal";
import { mergeCoachConfig } from "@/lib/coach-config";

export default async function AddClientPage() {
  const coach = await verifyCoachSession();
  // The coach's default language pre-selects the picker for NEW clients only
  // (the edit form uses the client's own stored language).
  const { defaultClientLanguage } = mergeCoachConfig(coach.config);
  return <AddClientForm defaultLanguage={defaultClientLanguage} />;
}
