import { Service, ServiceType } from '../types';
import { 
  UtensilsCrossed, 
  Wine, 
  Sparkles, 
  Dumbbell, 
  Waves, 
  Shirt, 
  Headphones, 
  Coffee,
  Plus,
  MoreHorizontal
} from 'lucide-react';

export const serviceGradients: Record<ServiceType, string> = {
  restaurant: 'from-orange-500/20 to-amber-500/20',
  bar: 'from-purple-500/20 to-indigo-500/20',
  spa: 'from-pink-500/20 to-rose-500/20',
  fitness: 'from-red-500/20 to-orange-500/20',
  pool: 'from-blue-500/20 to-cyan-500/20',
  laundry: 'from-cyan-500/20 to-teal-500/20',
  concierge: 'from-indigo-500/20 to-blue-500/20',
  roomservice: 'from-yellow-500/20 to-amber-500/20',
  additional: 'from-gray-500/20 to-slate-500/20',
  other: 'from-slate-500/20 to-gray-500/20',
};

export const serviceBorderColors: Record<ServiceType, string> = {
  restaurant: 'border-orange-500/30',
  bar: 'border-purple-500/30',
  spa: 'border-pink-500/30',
  fitness: 'border-red-500/30',
  pool: 'border-blue-500/30',
  laundry: 'border-cyan-500/30',
  concierge: 'border-indigo-500/30',
  roomservice: 'border-yellow-500/30',
  additional: 'border-gray-500/30',
  other: 'border-slate-500/30',
};

export const serviceAccentColors: Record<ServiceType, string> = {
  restaurant: 'text-orange-600',
  bar: 'text-purple-600',
  spa: 'text-pink-600',
  fitness: 'text-red-600',
  pool: 'text-blue-600',
  laundry: 'text-cyan-600',
  concierge: 'text-indigo-600',
  roomservice: 'text-yellow-600',
  additional: 'text-gray-600',
  other: 'text-slate-600',
};

export function getServiceIcon(type: ServiceType) {
  const iconMap: Record<ServiceType, typeof UtensilsCrossed> = {
    restaurant: UtensilsCrossed,
    bar: Wine,
    spa: Sparkles,
    fitness: Dumbbell,
    pool: Waves,
    laundry: Shirt,
    concierge: Headphones,
    roomservice: Coffee,
    additional: Plus,
    other: MoreHorizontal,
  };
  return iconMap[type] || MoreHorizontal;
}

export function isServiceOpen(service: Service): boolean {
  if (!service.hours || Object.keys(service.hours).length === 0) {
    return true; // If no hours specified, assume always open
  }

  const now = new Date();
  const dayIndex = now.getDay(); // 0-6, where 0 is Sunday
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const currentDay = days[dayIndex];
  const dayMap: Record<string, string> = {
    sun: 'sunday',
    mon: 'monday',
    tue: 'tuesday',
    wed: 'wednesday',
    thu: 'thursday',
    fri: 'friday',
    sat: 'saturday',
  };
  
  const dayName = dayMap[currentDay] || 'monday';
  const todayHours = service.hours[dayName];
  
  if (!todayHours) return false;
  
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const [openHour, openMin] = todayHours.open.split(':').map(Number);
  const [closeHour, closeMin] = todayHours.close.split(':').map(Number);
  
  const openTime = openHour * 60 + openMin;
  const closeTime = closeHour * 60 + closeMin;
  
  return currentTime >= openTime && currentTime <= closeTime;
}

export function getTodayHours(service: Service): string {
  if (!service.hours || Object.keys(service.hours).length === 0) {
    return 'Always open';
  }

  const now = new Date();
  const dayIndex = now.getDay();
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const currentDay = days[dayIndex];
  const dayMap: Record<string, string> = {
    sun: 'sunday',
    mon: 'monday',
    tue: 'tuesday',
    wed: 'wednesday',
    thu: 'thursday',
    fri: 'friday',
    sat: 'saturday',
  };
  
  const dayName = dayMap[currentDay] || 'monday';
  const todayHours = service.hours[dayName];
  
  if (!todayHours) return 'Closed today';
  
  return `${formatTime(todayHours.open)} - ${formatTime(todayHours.close)}`;
}

export function formatTime(time: string): string {
  const [hour, minute] = time.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
}

export function calculateTotal(cartItems: Array<{ menuItem: { price: number }; quantity: number }>): number {
  return cartItems.reduce((total, item) => {
    return total + (item.menuItem.price * item.quantity);
  }, 0);
}

export function getServiceStatus(service: Service): 'open' | 'closed' | 'closing-soon' {
  if (!isServiceOpen(service)) {
    return 'closed';
  }

  // Check if closing within 30 minutes
  const now = new Date();
  const dayIndex = now.getDay();
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const currentDay = days[dayIndex];
  const dayMap: Record<string, string> = {
    sun: 'sunday',
    mon: 'monday',
    tue: 'tuesday',
    wed: 'wednesday',
    thu: 'thursday',
    fri: 'friday',
    sat: 'saturday',
  };
  
  const dayName = dayMap[currentDay] || 'monday';
  const todayHours = service.hours[dayName];
  
  if (!todayHours) return 'closed';
  
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const [closeHour, closeMin] = todayHours.close.split(':').map(Number);
  const closeTime = closeHour * 60 + closeMin;
  const minutesUntilClose = closeTime - currentTime;
  
  if (minutesUntilClose <= 30 && minutesUntilClose > 0) {
    return 'closing-soon';
  }
  
  return 'open';
}

