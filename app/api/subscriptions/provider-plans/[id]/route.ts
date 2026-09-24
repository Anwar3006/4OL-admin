import { updateProviderPlan } from "@/features/subscriptions/api/provider-plans";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return updateProviderPlan(request, id);
}
