import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CosmicAuthPage } from "@/components/CosmicAuthPage";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create Account — AgroSpace Nexus" }] }),
  component: SignupRoute,
});

function SignupRoute() {
  const navigate = useNavigate();
  return <CosmicAuthPage initialMode="signup" onClose={() => navigate({ to: "/" })} />;
}
