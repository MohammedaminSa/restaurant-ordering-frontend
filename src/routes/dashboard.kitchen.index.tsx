import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/kitchen/")({
  component: () => <Navigate to="/dashboard/kitchen/orders" replace />,
});
