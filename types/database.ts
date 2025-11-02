export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Hotel {
  id: string
  title: Json
  site: string
  email?: string | null
  logo_path?: string | null
  address?: string | null
  phone?: string | null
  active: boolean
  created_at: string
  updated_at?: string | null
}

export interface User {
  id: string
  name: Json
  email?: string | null
  email_verified_at?: string | null
  password?: string | null
  remember_token?: string | null
  utype_id: string
  role_id?: string | null
  active: number
  is_deleted: boolean
  created_at: string
  updated_at?: string | null
}

export interface HotelUser {
  id: string
  hotel_id: string
  user_id: string
  created_at: string
  is_deleted: boolean
}

export interface Product {
  id: string
  sort: number
  title: Json
  descr?: string | null
  price: number
  image: string
  ext_data?: Json | null
  active: number
  is_deleted: boolean
  created_at: string
  updated_at?: string | null
}

export interface Service {
  id: string
  hotel_id: string
  sub_id?: number | null
  title?: Json | null
  sort: number
  initiator_id?: number | null
  active: number
  is_deleted: boolean
  created_at: string
  updated_at?: string | null
}

export interface ServiceProduct {
  id: string
  service_id: string
  product_id: string
  created_at: string
  is_deleted: boolean
}

export type HotelInsert = Omit<Hotel, 'id' | 'created_at' | 'updated_at'> & {
  active?: boolean  // Make optional in insert since it has a default
}

export type UserInsert = 
  Omit<User, 'id' | 'created_at' | 'updated_at' | 'password' | 'remember_token' | 'is_deleted' | 'active'> & {
    is_deleted?: boolean  // Make optional since it has a default value in database
    active?: number  // Make optional since it has a default value
  }
export type ProductInsert = Omit<Product, 'id' | 'created_at' | 'updated_at'>
export type ServiceInsert = Omit<Service, 'id' | 'created_at' | 'updated_at'>

