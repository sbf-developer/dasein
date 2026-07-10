import { Outlet, Navigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { SidebarProvider, useSidebar } from "@/context/SidebarContext";
import { Sidebar } from "@/components/Sidebar";

function LayoutShell() {
  const { openMobile } = useSidebar();

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 md:hidden">
        <button
          type="button"
          onClick={openMobile}
          aria-label="Open menu"
          className="rounded-[var(--radius-sm)] p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-border-subtle)]"
        >
          <Menu size={20} strokeWidth={1.75} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold tracking-tight">Episteme</h1>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <SidebarProvider>
      <LayoutShell />
    </SidebarProvider>
  );
}
