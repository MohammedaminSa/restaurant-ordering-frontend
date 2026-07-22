import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/dashboard/waiter/")({
  component: WaiterIndex,
});

function WaiterIndex() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: "/dashboard/waiter/orders", replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
