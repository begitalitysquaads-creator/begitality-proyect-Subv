import { AppSidebar } from "@/components/ui/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans selection:bg-blue-100">
      <AppSidebar />
      <main className="flex-1 ml-64 p-12 min-h-screen">{children}</main>
    </div>
  );
}
