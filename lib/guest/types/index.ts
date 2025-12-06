export type ServiceType = 
  | 'restaurant' 
  | 'bar' 
  | 'spa' 
  | 'fitness' 
  | 'pool' 
  | 'laundry' 
  | 'concierge' 
  | 'roomservice' 
  | 'additional' 
  | 'other';

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface OperatingHours {
  [key: string]: { open: string; close: string } | null;
}

export interface ContactInfo {
  phone?: string;
  email?: string;
  extension?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  photo?: string; // Alternative field name from database
  dietary?: string[];
  dietary_info?: string[]; // Alternative field name
  category: string;
  cookingInstructions?: string[];
  cooking_instructions?: string[]; // Alternative field name
  ingredients?: string[];
  allergens?: string[];
  preparation_time?: string;
  calories?: number;
  spice_level?: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

export interface DrinkItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  photo?: string;
  category?: string;
  ingredients?: string[];
}

export interface Service {
  id: string;
  type: ServiceType;
  title: string;
  description: string;
  hours: OperatingHours;
  contact: ContactInfo;
  image?: string;
  photos?: string[];
  menu?: MenuCategory[];
  drinks?: DrinkItem[]; // For bar services
  spaServices?: SpaService[];
  fitnessClasses?: FitnessClass[];
  poolInfo?: {
    temperature: string;
    rules: string[];
  };
  laundryServices?: {
    name: string;
    price: number;
  }[];
  settings?: {
    background_image?: string;
    [key: string]: any;
  };
  display_order?: number;
}

export interface SpaService {
  id: string;
  name: string;
  description: string;
  duration: string;
  price: number;
  image?: string;
}

export interface FitnessClass {
  id: string;
  name: string;
  time: string;
  instructor: string;
  day: DayOfWeek;
}

export interface CartItem {
  menuItem: MenuItem | DrinkItem;
  quantity: number;
  specialInstructions?: string;
  serviceType?: string; // Service type this item came from (restaurant, bar, etc.)
  serviceId?: string; // Service ID for menu item-specific discounts
}

export interface Order {
  id: string;
  roomNumber: string;
  guestName: string;
  items: CartItem[];
  total: number;
  timestamp: Date;
  status: 'pending' | 'confirmed' | 'preparing' | 'delivered';
  specialInstructions?: string;
}

export interface Booking {
  id: string;
  serviceId: string;
  serviceName: string;
  guestName: string;
  roomNumber: string;
  date: string;
  time: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

export interface HotelConfig {
  id: string;
  name: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  heroImage?: string;
  welcomeMessage: string;
  services: Service[];
}

