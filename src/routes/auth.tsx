import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { CosmicAuthPage } from "@/components/CosmicAuthPage";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In — AgroSpace Nexus" },
      {
        name: "description",
        content: "Sign in or create your AgroSpace Nexus account to see your farm's satellite insights.",
      },
      { property: "og:title", content: "Sign In — AgroSpace Nexus" },
      {
        property: "og:description",
        content: "Sign in or create your AgroSpace Nexus account to see your farm's satellite insights.",
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
  if (pathname === "/auth/callback") return <Outlet />;
  return (
    <CosmicAuthPage
      onSuccess={() => navigate({ to: "/", replace: true })}
      onClose={() => navigate({ to: "/" })}
    />
  );
}
