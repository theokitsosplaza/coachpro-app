import { AddClientForm } from "./AddClientForm";
import { verifyCoachSession } from "@/lib/dal";

export default async function AddClientPage() {
  await verifyCoachSession();
  return <AddClientForm />;
}
