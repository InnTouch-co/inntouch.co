import type { Json } from './database'

export interface Role {
  id: string
  name: string
  description?: string | null
  permissions: Json
  created_at: string
}

export interface Room {
  id: string
  hotel_id: string
  room_number: string
  room_type: Json
  floor?: number | null
  capacity: number
  status: string
  amenities?: Json | null
  price_per_night?: number | null
  bed_type?: string | null
  images?: string[] | null
  is_deleted: boolean
  created_at: string
  updated_at?: string | null
}

export interface Booking {
  id: string
  hotel_id: string
  room_id?: string | null
  guest_name: string
  guest_email?: string | null
  guest_phone?: string | null
  check_in_date: string
  check_out_date: string
  status: string
  total_amount: number
  payment_status: string
  special_requests?: string | null
  created_by?: string | null
  created_at: string
  updated_at?: string | null
  is_deleted: boolean
}

export interface Inventory {
  id: string
  hotel_id: string
  name: Json
  category?: string | null
  quantity: number
  unit: string
  min_stock_level: number
  supplier?: string | null
  cost_per_unit?: number | null
  location?: string | null
  is_deleted: boolean
  created_at: string
  updated_at?: string | null
}

export interface InventoryTransaction {
  id: string
  inventory_id: string
  transaction_type: string
  quantity: number
  notes?: string | null
  performed_by?: string | null
  created_at: string
}

export interface Notification {
  id: string
  hotel_id?: string | null
  title: Json
  message: Json
  type: string
  target_audience?: string | null
  priority: string
  is_read: boolean
  read_by: string[]
  expires_at?: string | null
  created_by?: string | null
  created_at: string
  is_deleted: boolean
}

export interface Content {
  id: string
  hotel_id?: string | null
  title: Json
  content_type: string
  content_data: Json
  version: number
  is_active: boolean
  tags?: string[] | null
  created_by?: string | null
  created_at: string
  updated_at?: string | null
  is_deleted: boolean
}

export interface ContentVersion {
  id: string
  content_id: string
  version: number
  content_data: Json
  change_notes?: string | null
  created_by?: string | null
  created_at: string
}

// Insert types
export type RoomInsert = Omit<Room, 'id' | 'created_at' | 'updated_at'>
export type BookingInsert = Omit<Booking, 'id' | 'created_at' | 'updated_at'>
export type InventoryInsert = Omit<Inventory, 'id' | 'created_at' | 'updated_at'>
export type NotificationInsert = Omit<Notification, 'id' | 'created_at' | 'read_by' | 'is_read'>
export type ContentInsert = Omit<Content, 'id' | 'created_at' | 'updated_at' | 'version'>

