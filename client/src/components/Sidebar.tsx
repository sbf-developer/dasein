import { useCallback, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Target,
  CheckSquare,
  GitBranch,
  Sparkles,
  LogOut,
  Calendar,
  FolderUp,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import { SearchBar } from "@/components/SearchBar";

const nav = [
  { to: "/", icon: LayoutDashboard, label: "Home" },
  { to: "/calendar", icon: Calendar, label: "Calendar" },
  { to: "/notes", icon: FileText, label: "Notes" },
  { to: "/documents", icon: FolderUp, label: "Documents" },
  { to: "/goals", icon: Target, label: "Goals" },
  { to: "/actions", icon: CheckSquare, label: "Actions" },
  { to: "/graph", icon: GitBranch, label: "Graph" },
  { to: "/ai", icon: Sparkles, label: "AI" },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const { collapsed, effectiveWidth, setWidth, toggleCollapsed } = useSidebar();
  const dragging = useRef(false);
  const asideRef = useRef<HTMLElement>(null);

  const onResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (collapsed) return;
      e.preventDefault();
      dragging.current = true;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [collapsed]
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !asideRef.current) return;
      const rect = asideRef.current.getBoundingClientRect();
      setWidth(e.clientX - rect.left);
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [setWidth]);

  return (
    <aside
      ref={asideRef}
      style={{ width: effectiveWidth }}
      className="relative flex h-full shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-sidebar)] transition-[width] duration-300 ease-in-out"
    >
      {/* Header */}
      <div className={`flex items-center gap-2 px-3 pt-4 ${collapsed ? "flex-col pb-2" : "pb-3"}`}>
        {!collapsed && (
          <div className="min-w-0 flex-1 px-1">
            <h1 className="truncate text-base font-semibold tracking-tight">Episteme</h1>
            <p className="truncate text-xs text-[var(--color-text-tertiary)]">Personal ontology</p>
          </div>
        )}
        <button
          onClick={toggleCollapsed}
          className="shrink-0 rounded-[var(--radius-sm)] p-1.5 text-[var(--color-text-tertiary)] transition-colors hover:bg-white/60 hover:text-[var(--color-text)]"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeft size={18} strokeWidth={1.75} /> : <PanelLeftClose size={18} strokeWidth={1.75} />}
        </button>
      </div>

      {/* Search */}
      <div className={`px-3 ${collapsed ? "pb-2" : "pb-3"}`}>
        <SearchBar collapsed={collapsed} />
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-3">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center rounded-[var(--radius-sm)] text-sm transition-colors ${
                collapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2"
              } ${
                isActive
                  ? "bg-white font-medium text-[var(--color-text)] shadow-sm"
                  : "text-[var(--color-text-secondary)] hover:bg-white/60 hover:text-[var(--color-text)]"
              }`
            }
          >
            <Icon size={16} strokeWidth={1.75} className="shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-[var(--color-border)] p-3">
        <div
          className={`flex items-center rounded-[var(--radius-sm)] ${
            collapsed ? "flex-col gap-2 py-1" : "gap-2.5 px-3 py-2"
          }`}
        >
          {user?.image ? (
            <img src={user.image} alt="" className="h-7 w-7 shrink-0 rounded-full" title={collapsed ? user.name ?? undefined : undefined} />
          ) : (
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-border)] text-xs font-medium"
              title={collapsed ? user?.name ?? user?.email ?? undefined : undefined}
            >
              {user?.name?.[0] ?? user?.email?.[0] ?? "?"}
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.name ?? "User"}</p>
              <p className="truncate text-xs text-[var(--color-text-tertiary)]">{user?.email}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="shrink-0 rounded p-1.5 text-[var(--color-text-tertiary)] transition-colors hover:bg-white hover:text-[var(--color-text)]"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* Resize handle */}
      {!collapsed && (
        <div
          onMouseDown={onResizeStart}
          className="group absolute -right-px top-0 z-10 h-full w-1.5 cursor-col-resize"
        >
          <div className="mx-auto h-full w-px bg-transparent transition-colors group-hover:bg-[var(--color-accent)] group-active:bg-[var(--color-accent)]" />
        </div>
      )}
    </aside>
  );
}
