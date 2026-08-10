// Standing freight rate applied to any shipment/container that hasn't had an
// explicit rate set — the business's normal per-CBM ocean freight charge.
// Overridden per container via the Admin Dashboard's "Freight / Clearing"
// input. Clearing has no such default: it varies too much to assume.
export const DEFAULT_FREIGHT_USD_PER_CBM = 200;
