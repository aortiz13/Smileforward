# Blukastor - White Label Portal

This is the frontend application for the Blukastor platform, built with **Next.js 14**, **Tailwind CSS**, and **Supabase**.

## Project Structure
- `app/(admin)`: Admin Dashboard for managing tenants.
- `app/(portal)`: Client Portal with white-label support (`[domain]`).
- `lib/supabase`: Supabase Client/Server utilities.
- `middleware.ts`: Handles Auth & Custom Domain routing.

## Deployment on Vercel

### 1. Import Project
- Connect your GitHub repository to Vercel.
- Select the `blukastor` repo.

### 2. Configure Settings
- **Framework Preset**: Next.js
- **Root Directory**: `frontend` (Important!)

### 3. Environment Variables
Add these variables in the Vercel Project Settings:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL | `https://xyz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Public Anon Key | `eyJ...` |
| `NEXT_PUBLIC_ROOT_DOMAIN` | The main domain for rewriting | `portal.blukastor.com` |

### 4. Deploy
Click **Deploy**. Vercel will build the application and provide a URL.

## Local Development

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000).
