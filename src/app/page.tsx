"use client";

import { useEffect, useState } from "react";
import CommandCenter from "@/components/command-center";
import SetupNotice from "@/components/setup-notice";
import { ProtectedRoute } from "@/components/protected-route";

export const dynamic = "force-dynamic";

function Content() {
  const [data, setData] = useState<{ sites: any[]; initialView: any; error: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/analytics");
        const result = await res.json();
        setData(result);
      } catch (error) {
        setData({ sites: [], initialView: null, error: "Failed to load data" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!data) return null;

  const { sites, initialView, error } = data;

  if (error) return <SetupNotice message={error} />;
  if (!sites.length || !initialView) {
    return <SetupNotice message="No Vercel projects were found for this token/team. Create a project on Vercel, then reload." />;
  }
  const defaultSite = sites.find((s) => s.name === "byte-sized-python") ?? sites[0];
  return <CommandCenter sites={sites} initialSiteId={defaultSite.id} initialRange="30d" initialView={initialView} />;
}

export default function Home() {
  return (
    <ProtectedRoute>
      <Content />
    </ProtectedRoute>
  );
}
