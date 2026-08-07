import { Shipment, TrackingUpdate, ShipmentStatus } from "../types";

const INITIAL_SHIPMENTS: Shipment[] = [
  {
    id: "mock-s1",
    tracking_id: "DDL-2026-88001",
    container_id: "CON-NGA-091",
    shipping_mark: "MUMMY E.",
    phone_number: "7037739313",
    ctn: 5,
    cbm: 1.2,
    status: "received_china",
    created_at: Date.now() - 3 * 24 * 60 * 60 * 1000,
    updated_at: Date.now() - 3 * 24 * 60 * 60 * 1000,
  },
  {
    id: "mock-s2",
    tracking_id: "DDL-2026-88002",
    container_id: "CON-NGA-091",
    shipping_mark: "MAYOWA",
    phone_number: "8130864548",
    ctn: 12,
    cbm: 3.5,
    status: "in_transit_sea",
    created_at: Date.now() - 10 * 24 * 60 * 60 * 1000,
    updated_at: Date.now() - 2 * 24 * 60 * 60 * 1000,
  },
  {
    id: "mock-s3",
    tracking_id: "DDL-2026-88003",
    container_id: "CON-NGA-089",
    shipping_mark: "TEGA",
    phone_number: "9050866966",
    ctn: 3,
    cbm: 0.8,
    status: "cleared",
    created_at: Date.now() - 15 * 24 * 60 * 60 * 1000,
    updated_at: Date.now() - 1 * 24 * 60 * 60 * 1000,
  }
];

const INITIAL_UPDATES: TrackingUpdate[] = [
  {
    id: "mock-u1",
    shipment_id: "mock-s1",
    status: "received_china",
    note: "Cargo received and cataloged at Guangzhou warehouse.",
    created_at: Date.now() - 3 * 24 * 60 * 60 * 1000,
  },
  {
    id: "mock-u2",
    shipment_id: "mock-s2",
    status: "received_china",
    note: "Cargo received at Guangzhou warehouse.",
    created_at: Date.now() - 10 * 24 * 60 * 60 * 1000,
  },
  {
    id: "mock-u3",
    shipment_id: "mock-s2",
    status: "shipped",
    note: "Container loaded and sealed.",
    created_at: Date.now() - 8 * 24 * 60 * 60 * 1000,
  },
  {
    id: "mock-u4",
    shipment_id: "mock-s2",
    status: "in_transit_sea",
    note: "Vessel departed Guangzhou port.",
    created_at: Date.now() - 2 * 24 * 60 * 60 * 1000,
  },
  {
    id: "mock-u5",
    shipment_id: "mock-s3",
    status: "received_china",
    note: "Cargo received in Guangzhou warehouse.",
    created_at: Date.now() - 15 * 24 * 60 * 60 * 1000,
  },
  {
    id: "mock-u6",
    shipment_id: "mock-s3",
    status: "shipped",
    note: "Container loaded and departed.",
    created_at: Date.now() - 12 * 24 * 60 * 60 * 1000,
  },
  {
    id: "mock-u7",
    shipment_id: "mock-s3",
    status: "arrived_lagos",
    note: "Container arrived at Apapa Port, Lagos.",
    created_at: Date.now() - 4 * 24 * 60 * 60 * 1000,
  },
  {
    id: "mock-u8",
    shipment_id: "mock-s3",
    status: "cleared",
    note: "Customs clearing complete, moved to warehouse.",
    created_at: Date.now() - 1 * 24 * 60 * 60 * 1000,
  }
];

// LocalStorage helpers
export function getMockShipments(): Shipment[] {
  const saved = localStorage.getItem("ddl_mock_shipments");
  if (!saved) {
    localStorage.setItem("ddl_mock_shipments", JSON.stringify(INITIAL_SHIPMENTS));
    return INITIAL_SHIPMENTS;
  }
  return JSON.parse(saved);
}

export function getMockUpdates(): TrackingUpdate[] {
  const saved = localStorage.getItem("ddl_mock_updates");
  if (!saved) {
    localStorage.setItem("ddl_mock_updates", JSON.stringify(INITIAL_UPDATES));
    return INITIAL_UPDATES;
  }
  return JSON.parse(saved);
}

export function saveMockShipments(shipments: Shipment[]) {
  localStorage.setItem("ddl_mock_shipments", JSON.stringify(shipments));
}

export function saveMockUpdates(updates: TrackingUpdate[]) {
  localStorage.setItem("ddl_mock_updates", JSON.stringify(updates));
}

export function updateMockShipmentStatus(shipmentId: string, status: ShipmentStatus) {
  const shipments = getMockShipments();
  const index = shipments.findIndex(s => s.id === shipmentId);
  if (index !== -1) {
    shipments[index].status = status;
    shipments[index].updated_at = Date.now();
    saveMockShipments(shipments);

    // Add new tracking update
    const updates = getMockUpdates();
    const newUpdate: TrackingUpdate = {
      id: `mock-u-${Math.random().toString(36).substr(2, 9)}`,
      shipment_id: shipmentId,
      status: status,
      note: `Status updated to ${status.replace(/_/g, " ").toUpperCase()} by Administrator.`,
      created_at: Date.now(),
    };
    updates.unshift(newUpdate);
    saveMockUpdates(updates);
  }
}

export function updateMockContainerRate(
  containerId: string,
  field: "freight_usd_per_cbm" | "clearing_naira_per_cbm",
  value: number
) {
  const shipments = getMockShipments();
  let changed = false;
  shipments.forEach(s => {
    if (s.container_id === containerId) {
      s[field] = value;
      s.updated_at = Date.now();
      changed = true;
    }
  });
  if (changed) saveMockShipments(shipments);
}

export function importMockManifest(rows: any[]) {
  const shipments = getMockShipments();
  const updates = getMockUpdates();
  let count = 0;

  for (const row of rows) {
    const containerId = row.container_number || "CON-UNK";
    const trackingId = `DDL-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const shipmentId = `mock-s-${Math.random().toString(36).substr(2, 9)}`;

    const newShipment: Shipment = {
      id: shipmentId,
      tracking_id: trackingId,
      container_id: containerId,
      shipping_mark: row.shipping_mark || "UNMARKED",
      phone_number: row.phone_number || "",
      ctn: parseInt(row.ctn) || 1,
      cbm: parseFloat(row.cbm) || 0.1,
      status: "received_china",
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    const newUpdate: TrackingUpdate = {
      id: `mock-u-${Math.random().toString(36).substr(2, 9)}`,
      shipment_id: shipmentId,
      status: "received_china",
      note: `Manifest imported for container ${containerId}`,
      created_at: Date.now()
    };

    shipments.unshift(newShipment);
    updates.unshift(newUpdate);
    count++;
  }

  saveMockShipments(shipments);
  saveMockUpdates(updates);
  return count;
}
