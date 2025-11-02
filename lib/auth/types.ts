/**
 * Shared authentication types
 */

import type { User } from '@/types/database'

export interface AuthUser extends User {
  role_id?: string | null
}


