import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getTableByQRCode, createSession, type TableInfo } from "@/lib/api";
import { Loader2, Users, MapPin } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/scan/$qrCode")({
  component: QRScanPage,
});

function QRScanPage() {
  const { qrCode } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);
  const [showCustomerForm, setShowCustomerForm] = useState(false);

  useEffect(() => {
    loadTableInfo();
  }, [qrCode]);

  const loadTableInfo = async () => {
    try {
      const response = await getTableByQRCode(qrCode);
      const table = response.data;
      setTableInfo(table);

      // Check if table has active session
      const existingSessionToken = localStorage.getItem("sessionToken");
      
      if (table.active_session) {
        // Table is occupied by another session
        if (existingSessionToken === table.active_session.session_token) {
          // User is rejoining their own session
          toast.success("Welcome back to your table!");
          setTimeout(() => navigate({ to: "/" }), 1500);
        } else {
          // Table occupied by different user
          toast.error("This table is currently occupied");
        }
        setLoading(false);
      } else {
        // Check if user is switching tables
        if (existingSessionToken) {
          const savedTableData = localStorage.getItem("sessionData");
          if (savedTableData) {
            const oldSession = JSON.parse(savedTableData);
            if (oldSession.table_id !== table.id) {
              // Clear old session/cart when switching tables
              localStorage.removeItem("sessionToken");
              localStorage.removeItem("sessionData");
              localStorage.removeItem("pendingTableInfo");
              localStorage.removeItem("bistro-cart-v1");
              toast.info("Switched to a new table");
            }
          }
        }

        // Table is available - show table info
        setLoading(false);
      }
    } catch (error: any) {
      console.error("Failed to load table:", error);
      toast.error(error.message || "Failed to load table information");
      setLoading(false);
    }
  };

  const handleStartSession = () => {
    if (!tableInfo) return;
    
    // Store pending table info for later session creation
    localStorage.setItem("pendingTableInfo", JSON.stringify(tableInfo));
    toast.success("Table selected! Browse the menu to start ordering.");
    navigate({ to: "/" });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Loading table information...</p>
        </div>
      </div>
    );
  }

  if (!tableInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="font-serif text-2xl text-foreground">Table Not Found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This QR code is invalid or the table has been removed.
          </p>
        </div>
      </div>
    );
  }

  if (tableInfo.active_session && tableInfo.active_session.session_token !== localStorage.getItem("sessionToken")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-xl border border-border bg-card p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <Users className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="mt-4 font-serif text-2xl text-foreground">Table Currently Occupied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Table {tableInfo.table_number} is being used by another customer.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Customer: {tableInfo.active_session.customer_name}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            Please choose a different table or wait until this session ends.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-border bg-card p-8">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <MapPin className="h-8 w-8 text-primary" />
            </div>
            <h1 className="mt-4 font-serif text-3xl text-foreground">Welcome!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {tableInfo.restaurant_name}
            </p>
          </div>

          <div className="mt-8 space-y-4 rounded-lg bg-muted p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Table Number</span>
              <span className="font-serif text-lg text-foreground">{tableInfo.table_number}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Location</span>
              <span className="text-sm text-foreground">{tableInfo.location}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Capacity</span>
              <span className="text-sm text-foreground">{tableInfo.capacity} guests</span>
            </div>
          </div>

          <button
            onClick={handleStartSession}
            className="mt-8 w-full rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02]"
          >
            Browse Menu
          </button>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            You'll be asked for your name when placing your first order
          </p>
        </div>
      </div>
    </div>
  );
}
