import {
  directusReleaseInventory,
  directusReserveInventory,
  type AtomicInventoryRun,
} from "@/lib/directus-server";

interface RunRequest extends AtomicInventoryRun {}

export interface InventoryReservation {
  outwardRunId: number;
  returnRunId: number | null;
}

/** Reserve both legs atomically through Directus, the only database client. */
export async function reserveInventory(
  outward: RunRequest,
  inbound: RunRequest | null,
  seats: number,
): Promise<InventoryReservation | null> {
  if (!Number.isInteger(seats) || seats < 1) return null;
  const runIds = await directusReserveInventory(inbound ? [outward, inbound] : [outward], seats);
  if (!runIds || runIds.length !== (inbound ? 2 : 1)) return null;
  return { outwardRunId: runIds[0], returnRunId: runIds[1] ?? null };
}

/** The booking row claims release first, preventing a retry from double-releasing. */
export function releaseInventory(
  outwardRunId: number | null,
  returnRunId: number | null,
  seats: number,
): Promise<boolean> {
  const runIds = [outwardRunId, returnRunId].filter((id): id is number => id !== null);
  return directusReleaseInventory(runIds, seats);
}
