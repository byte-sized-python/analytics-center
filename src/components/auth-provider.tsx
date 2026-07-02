"use client";

import { Auth0Provider } from "@auth0/auth0-react";
import { ReactNode } from "react";

const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!domain || !clientId) {
    console.error("Auth0 environment variables are not configured");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Auth0 configuration missing. Please check environment variables.</div>
      </div>
    );
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: typeof window !== "undefined" ? window.location.origin : "",
      }}
    >
      {children}
    </Auth0Provider>
  );
}
