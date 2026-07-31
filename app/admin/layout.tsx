import AdminNav from "@/components/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />
      <main className="max-w-6xl mx-auto px-3 py-4">{children}</main>
    </div>
  );
}
