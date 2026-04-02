// Protected by middleware — requires session cookie
export default function AdminPage() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      {/* TODO: links to /admin/gyms, /admin/submissions */}
    </main>
  );
}
