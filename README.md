# QR Scan Menu - Admin Dashboard

A full-stack Next.js application with Supabase backend for managing hotels, users, services, and products for a QR code menu scanning system.

## Features

- 🏨 **Hotels Management** - Create, read, update, and delete hotels
- 👥 **Users Management** - Manage system users
- ⚙️ **Services Management** - Organize services by hotel
- 📦 **Products Management** - Manage menu items with prices, images, and descriptions
- 🔗 **Relationships** - Link hotels to users, services to hotels, and products to services

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Database**: PostgreSQL via Supabase

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account and project

### Installation

1. Clone or navigate to the project directory:
```bash
cd inntouch-co
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `.env.local.example` to `.env.local`
   - Fill in your Supabase credentials:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```
   - You can find these in your Supabase project settings under API

4. Set up the database:
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run the SQL migration file located at `supabase/migrations/001_initial_schema.sql`
   - This will create all necessary tables

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
inntouch-co/
├── app/                    # Next.js app router pages
│   ├── page.tsx           # Dashboard home page
│   ├── hotels/            # Hotels management page
│   ├── users/             # Users management page
│   ├── services/          # Services management page
│   └── products/          # Products management page
├── components/            # React components
│   ├── ui/               # Reusable UI components (Button, Card, Input, Modal)
│   ├── hotels/           # Hotel-related components
│   ├── users/            # User-related components
│   ├── services/         # Service-related components
│   ├── products/         # Product-related components
│   └── layout/           # Layout components (Navigation)
├── lib/                  # Utility functions
│   ├── supabase/         # Supabase client configuration
│   └── database/         # Database query functions
├── types/                # TypeScript type definitions
└── supabase/             # Database migrations
    └── migrations/       # SQL migration files
```

## Database Schema

The application uses the following main tables:
- `hotels` - Hotel information
- `users` - System users
- `hotel_users` - Many-to-many relationship between hotels and users
- `products` - Product/menu items
- `services` - Services offered by hotels
- `service_products` - Many-to-many relationship between services and products

## Usage

1. **Hotels**: Start by creating hotels in the system
2. **Users**: Create users and optionally assign them to hotels
3. **Products**: Add products/menu items with prices and images
4. **Services**: Create services for hotels and link products to them

## Notes

- JSON fields (title, name, ext_data) expect JSON format: `{"en": "English text"}`
- Soft deletes are used (is_deleted flag) to preserve data integrity
- The schema references `user_types` and `sections` tables that should exist in your database

## Development

To build for production:
```bash
npm run build
npm start
```

## License

This project is private and proprietary.
