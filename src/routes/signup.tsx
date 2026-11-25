import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CosmicAuthPage } from "@/components/CosmicAuthPage";
import {
  capturePendingUrlCoords,
  peekPendingUrlCoords,
  syncUrlCoords,
} from "@/utils/preciseLocation";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create Account — AgroSpace Nexus" },
      {
        name: "description",
        content: "Create an AgroSpace Nexus account and save your farm profile.",
      },
      { property: "og:title", content: "Create Account — AgroSpace Nexus" },
      {
        property: "og:description",
        content: "Create an AgroSpace Nexus account and save your farm profile.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignupRoute,
});

function SignupRoute() {
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
      initialMode="signup"
      onClose={goHomePreservingCoords}
      onSuccess={goHomePreservingCoords}
    />
  );
}
