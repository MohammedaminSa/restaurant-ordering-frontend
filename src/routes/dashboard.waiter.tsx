import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/waiter")({
  component: WaiterLayout,
});

function WaiterLayout() {
  return <Outlet />;
}
