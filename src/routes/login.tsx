import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CosmicAuthPage } from "@/components/CosmicAuthPage";
import {
  capturePendingUrlCoords,
  peekPendingUrlCoords,
  syncUrlCoords,
} from "@/utils/preciseLocation";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — AgroSpace Nexus" },
      {
        name: "description",
        content: "Sign in to AgroSpace Nexus to see your farm's satellite insights.",
      },
      { property: "og:title", content: "Sign In — AgroSpace Nexus" },
      {
        property: "og:description",
        content: "Sign in to AgroSpace Nexus to see your farm's satellite insights.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginRoute,
});

function LoginRoute() {
  const navigate = useNavigate();
  useEffect(() => {
    capturePendingUrlCoords();
  }, []);
  const goHomePreservingCoords = () => {
    const pending = peekPendingUrlCoords();
    void navigate({ to: "/", replace: true }).then(() => {
      if (pending) syncUrlCoords(pending.lat, pending.lon);
    });
  };
  return (
    <CosmicAuthPage
      initialMode="signin"
      onClose={goHomePreservingCoords}
      onSuccess={goHomePreservingCoords}
    />
  );
}
