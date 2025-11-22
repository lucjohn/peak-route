# PeakRoute - Transit Route Finder

Find the fastest bus routes between two addresses with a beautiful, modern interface.

## Project info

**URL**: https://lovable.dev/projects/00c7ed14-7fac-4012-8a2e-ac3505165d86

## Features

- 🚌 Find top 3 fastest bus routes
- 📍 Address-based search with geocoding
- ⚡ Real-time route information
- 📱 Fully responsive design
- 🎨 Modern transit-themed UI
- ⏱️ Displays duration, bus numbers, and pickup times

## Setup Instructions

### Prerequisites

- Node.js & npm installed ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- Backend API running (see backend setup below)

### Frontend Setup

1. Clone the repository:
```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

2. Install dependencies:
```sh
npm install
```

3. Create environment file:
```sh
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
# Backend API URL
VITE_API_BASE_URL=http://localhost:3001

# Optional: Add Google Maps API key for geocoding
# VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
```

5. Start the development server:
```sh
npm run dev
```

The app will be available at `http://localhost:8080`

### Backend Setup

The backend API is provided in the uploaded `server.js` file. To run it:

1. Ensure you have the backend files in a separate directory
2. Install backend dependencies (if not already done)
3. Set `GOOGLE_MAPS_API_KEY` in your backend `.env` file
4. Start the backend server (default port: 3001)

### Adding Google Geocoding

Currently, the app uses mock geocoding. To add real geocoding:

1. Get a Google Maps API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the **Geocoding API** or **Places API**
3. Add the key to your `.env` file
4. Update `src/api/peakroute.ts` to use the Google Geocoding API

Example implementation:
```typescript
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.status === 'OK' && data.results.length > 0) {
    const location = data.results[0].geometry.location;
    return { lat: location.lat, lng: location.lng };
  }
  
  throw new Error('Unable to geocode address');
}
```

## Architecture

```
src/
├── components/
│   ├── AddressInput.tsx      # Address input with icons
│   ├── RouteCard.tsx          # Individual route display
│   ├── RouteResults.tsx       # Results container
│   └── LoadingSkeleton.tsx    # Loading state
├── pages/
│   └── Index.tsx              # Main page
├── api/
│   └── peakroute.ts           # API utilities
└── types/
    └── route.ts               # TypeScript types
```

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/00c7ed14-7fac-4012-8a2e-ac3505165d86) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/00c7ed14-7fac-4012-8a2e-ac3505165d86) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
