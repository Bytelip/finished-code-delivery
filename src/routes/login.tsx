import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CosmicAuthPage } from "@/components/CosmicAuthPage";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign In — AgroSpace Nexus" }] }),
  component: LoginRoute,
});

function LoginRoute() {
  const navigate = useNavigate();
  return <CosmicAuthPage initialMode="signin" onClose={() => navigate({ to: "/" })} />;
}
