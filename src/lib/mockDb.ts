import { Shipment, TrackingUpdate, ShipmentStatus } from "../types";
import type { ManifestShipment } from "../utils/manifestParser";

const INITIAL_SHIPMENTS: Shipment[] = [
  {
    id: "mock-s1",
    tracking_id: "DDL-2026-88001",
    container_id: "CON-NGA-091",
    shipping_mark: "tosHo",
    phone_number: "2347037739313",
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
    shipping_mark: "BIGFISH",
    phone_number: "8033245670",
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
    shipping_mark: "GOLDEN",
    phone_number: "8123456789",
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

export function importMockManifest(rows: ManifestShipment[]) {
  const shipments = getMockShipments();
  const updates = getMockUpdates();
  let count = 0;

  for (const row of rows) {
    const containerId = row.container_id;
    const trackingId = `DDL-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const shipmentId = `mock-s-${Math.random().toString(36).substr(2, 9)}`;

    const newShipment: Shipment = {
      ...row,
      id: shipmentId,
      tracking_id: trackingId,
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

export function updateMockShipmentPhone(shipmentId: string, phoneNumber: string) {
  const shipments = getMockShipments();
  const index = shipments.findIndex((s) => s.id === shipmentId);
  if (index !== -1) {
    shipments[index].phone_number = phoneNumber.trim();
    shipments[index].updated_at = Date.now();
    saveMockShipments(shipments);
  }
}

export function createMockShipment(input: {
  container_id: string;
  shipping_mark: string;
  phone_number: string;
  ctn: number;
  cbm: number;
  freight_usd_per_cbm?: number;
  clearing_naira_per_cbm?: number;
  status?: ShipmentStatus;
}): Shipment {
  const shipments = getMockShipments();
  const updates = getMockUpdates();
  const trackingId = `DDL-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  const shipmentId = `mock-s-${Math.random().toString(36).slice(2, 11)}`;
  const status: ShipmentStatus = input.status || "received_china";

  const newShipment: Shipment = {
    id: shipmentId,
    tracking_id: trackingId,
    container_id: input.container_id.trim() || "CON-UNK",
    shipping_mark: input.shipping_mark.trim() || "UNMARKED",
    phone_number: input.phone_number.trim(),
    ctn: Number(input.ctn) || 1,
    cbm: Number(input.cbm) || 0.1,
    ...(input.freight_usd_per_cbm ? { freight_usd_per_cbm: Number(input.freight_usd_per_cbm) } : {}),
    ...(input.clearing_naira_per_cbm ? { clearing_naira_per_cbm: Number(input.clearing_naira_per_cbm) } : {}),
    status,
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  const newUpdate: TrackingUpdate = {
    id: `mock-u-${Math.random().toString(36).slice(2, 11)}`,
    shipment_id: shipmentId,
    status,
    note: `Shipment manually created for container ${newShipment.container_id}`,
    created_at: Date.now(),
  };

  shipments.unshift(newShipment);
  updates.unshift(newUpdate);
  saveMockShipments(shipments);
  saveMockUpdates(updates);
  return newShipment;
}

