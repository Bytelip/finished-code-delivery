import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CosmicAuthPage } from "@/components/CosmicAuthPage";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — AgroSpace Nexus" },
      { name: "description", content: "Sign in to AgroSpace Nexus to see your farm's satellite insights." },
      { property: "og:title", content: "Sign In — AgroSpace Nexus" },
      { property: "og:description", content: "Sign in to AgroSpace Nexus to see your farm's satellite insights." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginRoute,
});

function LoginRoute() {
  const navigate = useNavigate();
  return (
    <CosmicAuthPage
      initialMode="signin"
      onClose={() => navigate({ to: "/" })}
      onSuccess={() => navigate({ to: "/", replace: true })}
    />
  );
}
