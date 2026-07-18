import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/cart";
import {
  ClipboardList,
  Loader2,
  Eye,
  Users,
  Clock,
  UtensilsCrossed,
  AlertCircle,
} from "lucide-react";
import { getActiveSessions, getSessionBill } from "@/lib/api";

export const Route = createFileRoute("/dashboard/cashier/orders")({
  component: CashierOrders,
});

function CashierOrders() {
  const user = useAuthStore((s) => s.user);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [billData, setBillData] = useState<any>(null);

  const { data: sessionsData, isLoading, isError } = useQuery({
    queryKey: ["cashier-active-sessions", user?.restaurant_id],
    queryFn: () => getActiveSessions(user?.restaurant_id),
    enabled: !!user,
  });

  const sessions = (sessionsData?.data || []) as any[];

  const handleViewBill = async (session: any) => {
    setSelectedSession(session);
    try {
      const response = await getSessionBill(session.session_token);
      if (response.success) {
        setBillData(response.data);
      }
    } catch (error) {
      setBillData(null);
    }
  };

  const getSessionDuration = (startedAt: string): string => {
    const minutes = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-foreground">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View and manage active session bills
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Active Sessions
              </CardTitle>
              <CardDescription>
                {sessions.length} active dining sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isError ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                  <p className="text-lg font-medium text-foreground">Failed to load</p>
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No active orders</p>
                  <p className="text-sm">All tables are currently free</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Table</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session.session_token}>
                        <TableCell className="font-medium">Table {session.table_number}</TableCell>
                        <TableCell>{session.customer_name || "Guest"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {getSessionDuration(session.started_at)}
                        </TableCell>
                        <TableCell>{session.order_count || 0}</TableCell>
                        <TableCell>{fmt(parseFloat(session.total_bill || "0"))}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">Active</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewBill(session)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View Bill
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5" />
                Bill Details
              </CardTitle>
              <CardDescription>
                {selectedSession ? `Table ${selectedSession.table_number}` : "Select a session"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedSession ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Eye className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Select a session</p>
                  <p className="text-sm">Click "View Bill" to see details</p>
                </div>
              ) : !billData ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="rounded-full bg-accent/10 p-2">
                      <Users className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium">{billData.session.customer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Table {billData.session.table_number}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {billData.orders?.map((order: any) => (
                      <div key={order.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Order #{order.order_number}</span>
                          <Badge variant="outline" className="text-xs">{order.status}</Badge>
                        </div>
                        {order.items?.map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between text-sm py-1">
                            <span>{item.quantity}x {item.item_name || item.menu_item_name}</span>
                            <span className="text-muted-foreground">{fmt(parseFloat(item.total_price))}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{fmt(parseFloat(billData.bill.subtotal))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span>{fmt(parseFloat(billData.bill.tax_amount))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Service Charge</span>
                      <span>{fmt(parseFloat(billData.bill.service_charge))}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-1 mt-1">
                      <span>Total</span>
                      <span>{fmt(parseFloat(billData.bill.total_amount))}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
