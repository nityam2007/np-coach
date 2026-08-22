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

export type InventoryReservationResult =
  | { ok: true; reservation: InventoryReservation }
  | { ok: false; reason: "capacity" | "unavailable" };

/** Reserve both legs atomically through Directus, the only database client. */
export async function reserveInventory(
  outward: RunRequest,
  inbound: RunRequest | null,
  seats: number,
): Promise<InventoryReservationResult> {
  if (!Number.isInteger(seats) || seats < 1) return { ok: false, reason: "unavailable" };

  const result = await directusReserveInventory(inbound ? [outward, inbound] : [outward], seats);
  if (!result.ok) return result;
  if (result.runIds.length !== (inbound ? 2 : 1)) return { ok: false, reason: "unavailable" };

  return {
    ok: true,
    reservation: {
      outwardRunId: result.runIds[0],
      returnRunId: result.runIds[1] ?? null,
    },
  };
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
