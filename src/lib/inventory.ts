import { directusReleaseInventory } from "@/lib/directus-server";

/** Compatibility release for checkout holds created before paid-only inventory. */
export function releaseInventory(
  outwardRunId: number | null,
  returnRunId: number | null,
  seats: number,
): Promise<boolean> {
  const runIds = [outwardRunId, returnRunId].filter((id): id is number => id !== null);
  return directusReleaseInventory(runIds, seats);
}
