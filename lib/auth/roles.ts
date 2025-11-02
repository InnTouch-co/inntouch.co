/**
 * Role-based access control utilities
 */

export type Permission = 
  | 'all'
  | 'hotel'
  | 'users'
  | 'rooms'
  | 'bookings'
  | 'inventory'
  | 'content'
  | 'notifications'
  | 'view'
  | 'guests'

export interface UserPermissions {
  [key: string]: boolean | UserPermissions
}

export const ROLE_PERMISSIONS: Record<string, UserPermissions> = {
  super_admin: {
    all: true,
  },
  hotel_admin: {
    hotel: true,
    users: true,
    rooms: true,
    bookings: true,
    inventory: true,
    content: true,
    notifications: true,
  },
  front_desk: {
    bookings: true,
    guests: true,
    view: true,
    rooms: true, // View only
  },
  housekeeping: {
    rooms: true,
    inventory: true,
    view: true,
  },
  maintenance: {
    rooms: true,
    inventory: true,
    view: true,
  },
  staff: {
    view: true,
  },
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(
  userRole: string | undefined,
  permission: Permission
): boolean {
  if (!userRole) return false
  
  const rolePerms = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.staff
  
  // If has 'all' permission, grant access
  if (rolePerms.all === true) return true
  
  // Check specific permission
  return rolePerms[permission] === true
}

/**
 * Check if user can access a route
 */
export function canAccessRoute(userRole: string | undefined, route: string): boolean {
  // Map routes to required permissions
  const routePermissions: Record<string, Permission> = {
    '/': 'view',
    '/dashboard': 'view',
    '/hotels': 'hotel',
    '/users': 'users',
    '/rooms': 'rooms',
    '/bookings': 'bookings',
    '/inventory': 'inventory',
    '/content': 'content',
    '/notifications': 'notifications',
    '/services': 'hotel',
    '/products': 'hotel',
  }
  
  const requiredPermission = routePermissions[route] || 'view'
  return hasPermission(userRole, requiredPermission)
}

/**
 * Get user role display name
 */
export function getRoleDisplayName(roleId: string): string {
  const roleNames: Record<string, string> = {
    super_admin: 'Super Admin',
    hotel_admin: 'Hotel Admin',
    front_desk: 'Front Desk',
    housekeeping: 'Housekeeping',
    maintenance: 'Maintenance',
    staff: 'Staff',
  }
  
  return roleNames[roleId] || roleId
}

