export type Role = 'super_admin' | 'admin' | 'staff' | 'client';

export type AccountStatus = 'approved' | 'pending' | 'suspended';

export interface User {
  id: string;
  email?: string;
  role: Role;
  phone_number: string;
  shipping_mark: string;
  is_verified: boolean;
  account_status?: AccountStatus;
  created_at?: number;
  updated_at?: number;
  last_modified_by?: string;
  last_modified_by_email?: string;
}

export type ShipmentStatus = 
  | 'received_china'
  | 'shipped'
  | 'in_transit_sea'
  | 'in_transit_air'
  | 'arrived_lagos'
  | 'customs_clearing'
  | 'cleared'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'delivered';

export interface Container {
  id: string;
  container_number: string;
  origin_office: string;
  departure_date: string;
  created_at: number;
}

export interface Shipment {
  id: string;
  tracking_id: string;
  client_id?: string;
  container_id: string;
  shipping_mark: string;
  phone_number: string;
  ctn: number;
  cbm: number;
  freight_usd_per_cbm?: number;
  clearing_naira_per_cbm?: number;
  status: ShipmentStatus;
  created_at: number;
  updated_at: number;
  last_modified_by?: string;
  last_modified_by_email?: string;
  last_modified_by_role?: string;
  last_modified_action?: string;
}

export interface TrackingUpdate {
  id: string;
  shipment_id: string;
  status: ShipmentStatus;
  note: string;
  created_at: number;
  modified_by?: string;
  modified_by_email?: string;
}

export interface PricingSettings {
  exchangeRateUsdNgn: number;
  seaFreightRateUsd: number;
  seaClearingRateNgn: number;
  airFreightRateUsd: number;
  airClearingRateNgn: number;
  updated_at?: number;
  last_modified_by?: string;
  last_modified_by_email?: string;
}
