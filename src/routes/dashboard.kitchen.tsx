import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/kitchen")({
  component: KitchenLayout,
});

function KitchenLayout() {
  return <Outlet />;
}
