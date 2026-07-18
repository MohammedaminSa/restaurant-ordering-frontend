import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/cashier")({
  component: CashierLayout,
});

function CashierLayout() {
  return <Outlet />;
}
