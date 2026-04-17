import { AdminOrderBoard } from "@/components/admin-order-board";
import { requireAdmin } from "@/lib/auth";
import { getOrdersForAdmin } from "@/lib/orders";

export default async function AdminPage() {
  await requireAdmin();
  const orders = await getOrdersForAdmin();

  return <AdminOrderBoard initialOrders={orders} />;
}
