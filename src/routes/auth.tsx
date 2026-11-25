import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { CosmicAuthPage } from "@/components/CosmicAuthPage";
import {
  capturePendingUrlCoords,
  peekPendingUrlCoords,
  syncUrlCoords,
} from "@/utils/preciseLocation";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In — AgroSpace Nexus" },
      {
        name: "description",
        content:
          "Sign in or create your AgroSpace Nexus account to see your farm's satellite insights.",
      },
      { property: "og:title", content: "Sign In — AgroSpace Nexus" },
      {
        property: "og:description",
        content:
          "Sign in or create your AgroSpace Nexus account to see your farm's satellite insights.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthRouteComponent,
});

function AuthRouteComponent() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  useEffect(() => {
    capturePendingUrlCoords();
  }, []);
  if (pathname.replace(/\/+$/, "").endsWith("/auth/callback")) return <Outlet />;
  const goHomePreservingCoords = () => {
    const pending = peekPendingUrlCoords();
    void navigate({ to: "/", replace: true }).then(() => {
      if (pending) syncUrlCoords(pending.lat, pending.lon);
    });
  };
  return <CosmicAuthPage onSuccess={goHomePreservingCoords} onClose={goHomePreservingCoords} />;
}
