import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CosmicAuthPage } from "@/components/CosmicAuthPage";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create Account — AgroSpace Nexus" },
      { name: "description", content: "Create an AgroSpace Nexus account and save your farm profile." },
      { property: "og:title", content: "Create Account — AgroSpace Nexus" },
      { property: "og:description", content: "Create an AgroSpace Nexus account and save your farm profile." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignupRoute,
});

function SignupRoute() {
  const navigate = useNavigate();
  return (
    <CosmicAuthPage
      initialMode="signup"
      onClose={() => navigate({ to: "/" })}
      onSuccess={() => navigate({ to: "/", replace: true })}
    />
  );
}
