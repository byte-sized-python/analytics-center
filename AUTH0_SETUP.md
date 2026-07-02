# Auth0 Setup Instructions

## Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
NEXT_PUBLIC_AUTH0_DOMAIN=your-domain.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your-client-id
```

## Getting Auth0 Credentials

1. Go to [Auth0 Dashboard](https://manage.auth0.com/)
2. Create a new application (Single Page Application)
3. Copy the **Domain** and **Client ID** from your application settings
4. Add `http://localhost:3000` to **Allowed Callback URLs**, **Allowed Logout URLs**, and **Allowed Web Origins**
5. For production, add your production domain to these same fields

## How It Works

- The app now requires authentication to access any page
- Unauthenticated users are redirected to Auth0 login
- Once authenticated, users can access the analytics dashboard
- The `AuthProvider` wraps the entire app in `layout.tsx`
- The `ProtectedRoute` component ensures only authenticated users see content
