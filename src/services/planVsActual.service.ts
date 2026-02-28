// /src/services/planVsActual.service.ts
import { api } from "@/src/services/http.client";

/**
 * Backend contract (LOCKED):
 * GET /api/workout/weeks/:weekKey/plan-vs-actual
 */
export async function getPlanVsActual(weekKey: string): Promise<unknown> {
    const res = await api.get(`/workout/weeks/${encodeURIComponent(weekKey)}/plan-vs-actual`);
    return res.data;
}