import { Service as DatabaseService } from '@/types/database';
import { Service, ServiceType, MenuCategory, MenuItem, DrinkItem, OperatingHours, ContactInfo, SpaService } from '../types';
import { extractTextFromJson } from '@/lib/utils/json-text';

export function transformDatabaseServiceToGuestService(dbService: DatabaseService): Service | null {
  if (!dbService.active || dbService.is_deleted) {
    return null;
  }

  // Extract title (can be JSON or string)
  let title = '';
  if (typeof dbService.title === 'string') {
    title = dbService.title;
  } else if (dbService.title && typeof dbService.title === 'object') {
    title = extractTextFromJson(dbService.title, 'en');
  }

  // Extract description
  let description = '';
  if (typeof dbService.description === 'string') {
    description = dbService.description;
  } else if (dbService.description && typeof dbService.description === 'object') {
    description = extractTextFromJson(dbService.description, 'en');
  }

  // Map service_type to ServiceType
  const serviceTypeMap: Record<string, ServiceType> = {
    'restaurant': 'restaurant',
    'bar': 'bar',
    'spa': 'spa',
    'fitness': 'fitness',
    'gym': 'fitness',
    'pool': 'pool',
    'laundry': 'laundry',
    'concierge': 'concierge',
    'room_service': 'roomservice',
    'roomservice': 'roomservice',
    'additional': 'additional',
    'other': 'other',
  };

  const type: ServiceType = serviceTypeMap[dbService.service_type || 'other'] || 'other';

  // Parse operating hours
  let hours: OperatingHours = {};
  if (dbService.operating_hours && typeof dbService.operating_hours === 'object') {
    hours = dbService.operating_hours as OperatingHours;
  }

  // Parse contact info
  let contact: ContactInfo = {};
  if (dbService.contact_info && typeof dbService.contact_info === 'object') {
    const contactInfo = dbService.contact_info as any;
    // If it's an array, use the first contact (or merge all)
    if (Array.isArray(contactInfo) && contactInfo.length > 0) {
      // Use the first contact that has phone or email
      const firstContact = contactInfo.find((c: any) => c.phone || c.email) || contactInfo[0];
      contact = {
        phone: firstContact.phone || undefined,
        email: firstContact.email || undefined,
        extension: firstContact.extension || undefined,
      };
    } else if (!Array.isArray(contactInfo)) {
      // Single object format
      contact = contactInfo as ContactInfo;
    }
  }

  // Parse menu
  let menu: MenuCategory[] | undefined;
  let drinks: DrinkItem[] | undefined;
  let spaServices: SpaService[] | undefined;

  if (dbService.menu && typeof dbService.menu === 'object') {
    const menuData = dbService.menu as any;
    
    if (type === 'spa' && menuData.services) {
      // Spa services structure
      spaServices = (menuData.services || []).map((service: any, index: number) => ({
        id: service.id || `spa-${index}-${Math.random().toString(36).substr(2, 9)}`,
        name: service.name || '',
        description: service.description || '',
        price: typeof service.price === 'number' ? service.price : 0,
        duration: typeof service.duration === 'number' ? `${service.duration}` : (service.duration || '60'),
      }));
    } else if (type === 'bar' && menuData.drinks) {
      // Bar menu structure
      drinks = (menuData.drinks || []).map((drink: any) => ({
        id: drink.id || `drink-${Math.random()}`,
        name: drink.name || '',
        description: drink.description || '',
        price: typeof drink.price === 'number' ? drink.price : 0,
        image: drink.image || drink.photo || undefined,
        photo: drink.photo || drink.image || undefined,
        category: drink.category || '',
        ingredients: drink.ingredients || [],
      }));
    } else if ((type === 'restaurant' || type === 'roomservice') && menuData.categories && menuData.items) {
      // Restaurant/Room Service menu structure
      const categoriesMap = new Map<string, MenuCategory>();
      
      // Create categories
      (menuData.categories || []).forEach((cat: any) => {
        categoriesMap.set(cat.id || cat.name, {
          id: cat.id || cat.name,
          name: cat.name || '',
          items: [],
        });
      });

      // Add items to categories
      (menuData.items || []).forEach((item: any) => {
        const menuItem: MenuItem = {
          id: item.id || `item-${Math.random()}`,
          name: item.name || '',
          description: item.description || '',
          price: typeof item.price === 'number' ? item.price : 0,
          image: item.image || item.photo || undefined,
          photo: item.photo || item.image || undefined,
          category: item.category || '',
          dietary: item.dietary || item.dietary_info || [],
          dietary_info: item.dietary_info || item.dietary || [],
          cookingInstructions: item.cookingInstructions || item.cooking_instructions || [],
          cooking_instructions: item.cooking_instructions || item.cookingInstructions || [],
          ingredients: item.ingredients || [],
          allergens: item.allergens || [],
          preparation_time: item.preparation_time,
          calories: item.calories,
          spice_level: item.spice_level,
        };

        const categoryId = item.category || 'uncategorized';
        if (!categoriesMap.has(categoryId)) {
          categoriesMap.set(categoryId, {
            id: categoryId,
            name: categoryId,
            items: [],
          });
        }
        categoriesMap.get(categoryId)!.items.push(menuItem);
      });

      menu = Array.from(categoriesMap.values());
    }
  }

  // Get first photo as main image, or use photos array
  const image = dbService.photos && dbService.photos.length > 0 
    ? dbService.photos[0] 
    : undefined;

  // Extract settings (for background_image, equipment, rules, laundry services)
  let settings: any = undefined;
  let laundryServices: { name: string; price: number }[] | undefined;
  
  if (dbService.settings && typeof dbService.settings === 'object' && !Array.isArray(dbService.settings)) {
    settings = dbService.settings;
    
    // Extract laundry services if this is a laundry service
    if (type === 'laundry' && settings.services && Array.isArray(settings.services)) {
      laundryServices = settings.services.map((service: any) => ({
        name: service.name || '',
        price: typeof service.price === 'number' ? service.price : 0,
      }));
    }
  }

  return {
    id: dbService.id,
    type,
    title,
    description,
    hours,
    contact,
    image,
    photos: dbService.photos || undefined,
    menu,
    drinks,
    spaServices,
    laundryServices,
    settings, // Include settings for background_image access
    display_order: dbService.display_order ?? undefined,
  };
}

