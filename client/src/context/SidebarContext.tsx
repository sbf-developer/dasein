import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const MIN_WIDTH = 180;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 224;
const COLLAPSED_WIDTH = 52;
const MOBILE_BREAKPOINT = "(max-width: 767px)";

type SidebarContextType = {
  width: number;
  collapsed: boolean;
  effectiveWidth: number;
  isMobile: boolean;
  mobileOpen: boolean;
  setWidth: (w: number) => void;
  toggleCollapsed: () => void;
  openMobile: () => void;
  closeMobile: () => void;
  minWidth: number;
  maxWidth: number;
  collapsedWidth: number;
};

const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [width, setWidthState] = useState(() => {
    const saved = localStorage.getItem("sidebar-width");
    const parsed = saved ? Number(saved) : DEFAULT_WIDTH;
    if (!Number.isFinite(parsed)) return DEFAULT_WIDTH;
    return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, parsed));
  });
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sidebar-collapsed") === "true"
  );

  useEffect(() => {
    if (!isMobile) setMobileOpen(false);
  }, [isMobile]);

  useEffect(() => {
    document.body.style.overflow = isMobile && mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, mobileOpen]);

  const setWidth = useCallback((w: number) => {
    const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, w));
    setWidthState(clamped);
    localStorage.setItem("sidebar-width", String(clamped));
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }, []);

  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const effectiveWidth = isMobile ? 0 : collapsed ? COLLAPSED_WIDTH : width;

  return (
    <SidebarContext.Provider
      value={{
        width,
        collapsed,
        effectiveWidth,
        isMobile,
        mobileOpen,
        setWidth,
        toggleCollapsed,
        openMobile,
        closeMobile,
        minWidth: MIN_WIDTH,
        maxWidth: MAX_WIDTH,
        collapsedWidth: COLLAPSED_WIDTH,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}
