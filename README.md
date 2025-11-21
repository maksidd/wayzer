# Wayzer

Wayzer is a full-stack web application designed to help people find travel companions and organize trips. Whether you're planning a weekend getaway, a hiking trip, or a city tour, Wayzer connects you with like-minded individuals.

## 🚀 Features

### Core Functionality
- **Trip Management**: Create, view, and join trips.
- **Search & Discovery**: Filter trips by city, type (hiking, biking, etc.), date, and more.
- **User Profiles**: Customizable profiles with avatars, bios, languages spoken, and photo galleries.
- **Interactive Maps**: View trip routes and locations on an interactive map.

### Social & Communication
- **Real-time Chat**: Built-in messaging system for private conversations and group chats for trips.
- **Comments**: Discuss trip details in the comment section.
- **Favorites**: Save trips you're interested in.
- **Trip Status**: Track your participation status (pending, approved).

### Technical Features
- **Authentication**: Secure user registration and login using JWT.
- **File Uploads**: Upload photos and avatars (stored in Cloudflare R2/S3).
- **Responsive Design**: Modern UI built with React and Tailwind CSS.
- **Internationalization**: Support for multiple languages.

## 🛠 Tech Stack

### Frontend
- **Framework**: React (Vite)
- **Styling**: Tailwind CSS, Radix UI, Shadcn UI
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Maps**: Leaflet / React-Leaflet
- **Forms**: React Hook Form + Zod

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Real-time**: WebSocket (ws)
- **Storage**: AWS SDK (Cloudflare R2 compatible)
- **Authentication**: Passport.js, JWT

## 📦 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd wayzer4
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Copy `example.env` to `.env` and fill in the required values:
   ```bash
   cp example.env .env
   ```
   Required variables include database credentials, admin setup, and storage configuration.

4. **Database Setup**
   Push the schema to the database:
   ```bash
   npm run db:push
   ```

5. **Run the Application**
   Start the development server (runs both client and server):
   ```bash
   npm run dev
   ```

## 📁 Project Structure

- `client/` - Frontend React application
  - `src/pages/` - Application routes/pages
  - `src/components/` - Reusable UI components
- `server/` - Backend Express application
  - `routes.ts` - API endpoints
  - `storage.ts` - Database access layer
- `shared/` - Shared types and schemas (Zod)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
