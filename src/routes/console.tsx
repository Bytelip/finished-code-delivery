import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/console")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
  component: ConsoleRedirect,
});

function ConsoleRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    void navigate({ to: "/", replace: true });
  }, [navigate]);
  return null;
}
