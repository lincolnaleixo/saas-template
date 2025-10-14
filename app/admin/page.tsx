import AppLayout from "../(app)/layout";
import AdminView from "./view";

// Force dynamic rendering for admin page
export const dynamic = 'force-dynamic';

export default function AdminPage() {
  return (
    <AppLayout>
      <AdminView />
    </AppLayout>
  );
}
