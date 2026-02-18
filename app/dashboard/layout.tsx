import { AppSidebar } from "@/components/ui/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans selection:bg-blue-100">
      <AppSidebar />
      <main className="flex-1 ml-64 p-3 min-h-screen">
        <div className="rounded-3xl overflow-hidden min-h-[calc(100vh-1.5rem)] p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
