import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getTableByQRCode, createSession, type TableInfo } from "@/lib/api";
import { Loader2, Users, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/scan/$qrCode")({
  component: QRScanPage,
});

function QRScanPage() {
  const { qrCode } = Route.useParams();
  const navigate = useNavigate();
  const { t } = useT();
  const { clear: clearCart } = useCart();
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
          toast.success(t("scan.welcomeBack"));
          setTimeout(() => navigate({ to: "/" }), 1500);
        } else {
          // Table occupied by different user
          toast.error(t("scan.tableOccupied"));
        }
        setLoading(false);
      } else {
        // Check if user is switching tables or restaurants
        const oldTableData =
          localStorage.getItem("sessionData") || localStorage.getItem("pendingTableInfo");
        if (oldTableData) {
          try {
            const oldData = JSON.parse(oldTableData);
            const oldTableId = oldData.id || oldData.table_id;
            if (oldTableId && oldTableId !== table.id) {
              // Clear old session/cart when switching tables
              localStorage.removeItem("sessionToken");
              localStorage.removeItem("sessionData");
              localStorage.removeItem("pendingTableInfo");
              clearCart();
              toast.info(t("scan.switchedTable"));
            }
          } catch {}
        }

        // Table is available - show table info
        setLoading(false);
      }
    } catch (error: any) {
      console.error("Failed to load table:", error);
      toast.error(error.message || t("scan.failedToLoad"));
      setLoading(false);
    }
  };

  const handleStartSession = () => {
    if (!tableInfo) return;

    // Clear any stale session data before starting fresh
    localStorage.removeItem("sessionToken");
    localStorage.removeItem("sessionData");
    clearCart();

    // Store pending table info for later session creation
    localStorage.setItem("pendingTableInfo", JSON.stringify(tableInfo));
    toast.success(t("scan.tableSelected"));
    navigate({ to: "/" });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">{t("scan.loading")}</p>
        </div>
      </div>
    );
  }

  if (!tableInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="font-serif text-2xl text-foreground">{t("scan.notFound")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("scan.invalidQr")}</p>
        </div>
      </div>
    );
  }

  if (
    tableInfo.active_session &&
    tableInfo.active_session.session_token !== localStorage.getItem("sessionToken")
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-xl border border-border bg-card p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <Users className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="mt-4 font-serif text-2xl text-foreground">{t("scan.occupiedTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("scan.occupiedDesc", { number: tableInfo.table_number })}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("scan.customer", { name: tableInfo.active_session.customer_name })}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">{t("scan.chooseAnother")}</p>
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
            <h1 className="mt-4 font-serif text-3xl text-foreground">{t("scan.welcome")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{tableInfo.restaurant_name}</p>
          </div>

          <div className="mt-8 space-y-4 rounded-lg bg-muted p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("scan.tableNumber")}</span>
              <span className="font-serif text-lg text-foreground">{tableInfo.table_number}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("scan.location")}</span>
              <span className="text-sm text-foreground">{tableInfo.location}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("scan.capacity")}</span>
              <span className="text-sm text-foreground">
                {t("common.guests", { n: tableInfo.capacity })}
              </span>
            </div>
          </div>

          <button
            onClick={handleStartSession}
            className="mt-8 w-full rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02]"
          >
            {t("common.browseMenu")}
          </button>

          <p className="mt-4 text-center text-xs text-muted-foreground">{t("scan.namePrompt")}</p>
        </div>
      </div>
    </div>
  );
}
