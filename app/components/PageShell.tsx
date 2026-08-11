"use client";
import { usePathname } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import Header from "./Header";
import Footer from "./Footer";
import Banner from "./Banner";
import PageTransition from "./PageTransition";

type PageShellProps = {
  children: React.ReactNode;
};

// Shared layout wrapper to keep header/footer and background consistent.
export default function PageShell({ children }: PageShellProps) {
  const pathname = usePathname();
  const [bannerVisible, setBannerVisible] = useState(true);
  const [updatingBanner, setUpdatingBanner] = useState(false);
  const [bannerUpdateError, setBannerUpdateError] = useState("");
  const [actionsRequireLogin, setActionsRequireLogin] = useState(true);
  const [updatingActionPermission, setUpdatingActionPermission] = useState(false);
  const [actionPermissionError, setActionPermissionError] = useState("");
  const [position, setPosition] = useState({ x: 12, y: 12 });
  const [actionButtonPosition, setActionButtonPosition] = useState({ x: 12, y: 72 });
  const bannerButtonRef = useRef<HTMLButtonElement | null>(null);
  const actionButtonRef = useRef<HTMLButtonElement | null>(null);
  const bannerVisibilityVersionRef = useRef(0);
  const bannerDragRef = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    didDrag: boolean;
  }>({ pointerId: null, startX: 0, startY: 0, offsetX: 0, offsetY: 0, didDrag: false });
  const actionButtonDragRef = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    didDrag: boolean;
  }>({ pointerId: null, startX: 0, startY: 0, offsetX: 0, offsetY: 0, didDrag: false });
  const isDashboardRoute = (pathname === "/dashboard" || pathname?.startsWith("/dashboard/")) ?? false;
  const isCommercialAdminRoute =
    isDashboardRoute || pathname === "/admin" || pathname?.startsWith("/admin/");

  useEffect(() => {
    let active = true;

    const loadBannerVisibility = async () => {
      const requestVersion = bannerVisibilityVersionRef.current;
      try {
        const response = await fetch("/api/site-settings/banner", { cache: "no-store" });
        const data = (await response.json()) as { visible?: unknown };
        if (
          active &&
          requestVersion === bannerVisibilityVersionRef.current &&
          response.ok &&
          typeof data.visible === "boolean"
        ) {
          setBannerVisible(data.visible);
        }
      } catch {
        // Keep the default banner state if the setting cannot be loaded.
      }
    };

    void loadBannerVisibility();
    const refreshId = window.setInterval(() => void loadBannerVisibility(), 30_000);

    return () => {
      active = false;
      window.clearInterval(refreshId);
    };
  }, []);

  useEffect(() => {
    if (!isCommercialAdminRoute) return;

    let active = true;
    const loadActionPermission = async () => {
      try {
        const response = await fetch("/api/site-settings/commercial-actions", { cache: "no-store" });
        const data = (await response.json()) as { requireLogin?: unknown };
        if (active && response.ok && typeof data.requireLogin === "boolean") {
          setActionsRequireLogin(data.requireLogin);
        }
      } catch {
        // Keep login required if the setting cannot be loaded.
      }
    };

    void loadActionPermission();
    return () => {
      active = false;
    };
  }, [isCommercialAdminRoute]);

  const toggleBannerVisibility = async () => {
    if (updatingBanner) return;

    const previousVisible = bannerVisible;
    const nextVisible = !bannerVisible;
    const updateVersion = ++bannerVisibilityVersionRef.current;
    setBannerVisible(nextVisible);
    setBannerUpdateError("");
    setUpdatingBanner(true);
    try {
      const response = await fetch("/api/site-settings/banner", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible: nextVisible }),
      });
      const data = (await response.json().catch(() => null)) as { visible?: unknown } | null;
      if (!response.ok || typeof data?.visible !== "boolean") {
        throw new Error("Unable to save banner visibility.");
      }
      if (updateVersion === bannerVisibilityVersionRef.current) {
        setBannerVisible(data.visible);
      }
    } catch {
      if (updateVersion === bannerVisibilityVersionRef.current) {
        setBannerVisible(previousVisible);
        setBannerUpdateError("Could not save the banner setting. Make sure the site settings SQL has been run.");
      }
    } finally {
      if (updateVersion === bannerVisibilityVersionRef.current) {
        setUpdatingBanner(false);
      }
    }
  };

  const toggleActionPermission = async () => {
    if (updatingActionPermission) return;

    const previousRequireLogin = actionsRequireLogin;
    const nextRequireLogin = !actionsRequireLogin;
    setActionsRequireLogin(nextRequireLogin);
    setActionPermissionError("");
    setUpdatingActionPermission(true);
    try {
      const response = await fetch("/api/site-settings/commercial-actions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requireLogin: nextRequireLogin }),
      });
      const data = (await response.json().catch(() => null)) as { requireLogin?: unknown } | null;
      if (!response.ok || typeof data?.requireLogin !== "boolean") {
        throw new Error("Unable to save action permission.");
      }
      setActionsRequireLogin(data.requireLogin);
    } catch {
      setActionsRequireLogin(previousRequireLogin);
      setActionPermissionError("Could not save the permission setting. Make sure the site settings SQL has been run.");
    } finally {
      setUpdatingActionPermission(false);
    }
  };

  return (
    <div className="relative isolate min-h-screen text-[var(--md-text)] px-3 sm:px-6 md:px-12 py-6 sm:py-8 md:py-12 selection:bg-violet-500/30 flex flex-col items-center overflow-x-clip">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[rgba(124,131,255,0.18)] blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-80 w-80 rounded-full bg-[rgba(255,120,120,0.16)] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-[rgba(88,211,204,0.12)] blur-3xl" />
      </div>
      <div className="pointer-events-none absolute inset-0 z-0 hidden sm:block backdrop-blur-[6px]" />

      {isDashboardRoute && (
        <div
          className="fixed z-[60]"
          style={{ left: position.x, top: position.y }}
        >
          <button
            ref={bannerButtonRef}
            type="button"
            onClick={(event) => {
              if (bannerDragRef.current.didDrag) {
                event.preventDefault();
                event.stopPropagation();
                bannerDragRef.current.didDrag = false;
                return;
              }
              void toggleBannerVisibility();
            }}
            onPointerDown={(event) => {
              if (event.pointerType === "mouse" && event.button !== 0) return;

              bannerDragRef.current = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                offsetX: event.clientX - position.x,
                offsetY: event.clientY - position.y,
                didDrag: false,
              };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const drag = bannerDragRef.current;
              if (drag.pointerId !== event.pointerId) return;

              const movedFarEnough = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 6;
              if (!drag.didDrag && !movedFarEnough) return;

              drag.didDrag = true;
              const bounds = bannerButtonRef.current?.getBoundingClientRect();
              const buttonWidth = bounds?.width ?? 220;
              const buttonHeight = bounds?.height ?? 48;
              setPosition({
                x: Math.max(8, Math.min(window.innerWidth - buttonWidth - 8, event.clientX - drag.offsetX)),
                y: Math.max(8, Math.min(window.innerHeight - buttonHeight - 8, event.clientY - drag.offsetY)),
              });
            }}
            onPointerUp={(event) => {
              if (bannerDragRef.current.pointerId !== event.pointerId) return;
              bannerDragRef.current.pointerId = null;
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
            }}
            onPointerCancel={() => {
              bannerDragRef.current.pointerId = null;
            }}
            disabled={updatingBanner}
            className="flex touch-none select-none cursor-grab items-center gap-2 rounded-full border border-white/20 bg-slate-950/85 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-100 shadow-[0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-[0_10px_30px_rgba(0,0,0,0.34)] active:cursor-grabbing disabled:cursor-wait disabled:opacity-60"
          >
            <span className={`h-2.5 w-2.5 rounded-full ${bannerVisible ? "bg-emerald-400" : "bg-amber-400"}`} />
            {updatingBanner ? "Saving..." : bannerVisible ? "Hide Banner" : "Show Banner"}
          </button>
          {bannerUpdateError ? (
            <p role="alert" className="mt-2 max-w-64 text-xs text-red-300">
              {bannerUpdateError}
            </p>
          ) : null}
        </div>
      )}

      {isCommercialAdminRoute && (
        <div
          className="fixed z-[60]"
          style={{ left: actionButtonPosition.x, top: actionButtonPosition.y }}
        >
          <button
            ref={actionButtonRef}
            type="button"
            onClick={(event) => {
              if (actionButtonDragRef.current.didDrag) {
                event.preventDefault();
                event.stopPropagation();
                actionButtonDragRef.current.didDrag = false;
                return;
              }
              void toggleActionPermission();
            }}
            onPointerDown={(event) => {
              if (event.pointerType === "mouse" && event.button !== 0) return;

              actionButtonDragRef.current = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                offsetX: event.clientX - actionButtonPosition.x,
                offsetY: event.clientY - actionButtonPosition.y,
                didDrag: false,
              };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const drag = actionButtonDragRef.current;
              if (drag.pointerId !== event.pointerId) return;

              const movedFarEnough = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 6;
              if (!drag.didDrag && !movedFarEnough) return;

              drag.didDrag = true;
              const bounds = actionButtonRef.current?.getBoundingClientRect();
              const buttonWidth = bounds?.width ?? 220;
              const buttonHeight = bounds?.height ?? 48;
              setActionButtonPosition({
                x: Math.max(8, Math.min(window.innerWidth - buttonWidth - 8, event.clientX - drag.offsetX)),
                y: Math.max(8, Math.min(window.innerHeight - buttonHeight - 8, event.clientY - drag.offsetY)),
              });
            }}
            onPointerUp={(event) => {
              if (actionButtonDragRef.current.pointerId !== event.pointerId) return;
              actionButtonDragRef.current.pointerId = null;
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
            }}
            onPointerCancel={() => {
              actionButtonDragRef.current.pointerId = null;
            }}
            disabled={updatingActionPermission}
            className="flex touch-none select-none cursor-grab items-center gap-2 rounded-full border border-white/20 bg-slate-950/85 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-100 shadow-[0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-[0_10px_30px_rgba(0,0,0,0.34)] active:cursor-grabbing disabled:cursor-wait disabled:opacity-60"
            title={actionsRequireLogin ? "Allow downloads and prompt copies without login" : "Require login for downloads and prompt copies"}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${actionsRequireLogin ? "bg-amber-400" : "bg-emerald-400"}`} />
            {updatingActionPermission
              ? "Saving..."
              : actionsRequireLogin
                ? "Require Login"
                : "Allow Direct Actions"}
          </button>
          {actionPermissionError ? (
            <p role="alert" className="mt-2 max-w-64 text-xs text-red-300">
              {actionPermissionError}
            </p>
          ) : null}
        </div>
      )}

      <div className="relative z-10 max-w-6xl mx-auto w-full flex-1 flex flex-col items-stretch">
        <Header />
        <PageTransition>{children}</PageTransition>
      </div>
      <span className="h-10 sm:h-16 w-full"></span>
      <Banner visible={bannerVisible} />

      <div className="relative z-10 w-full">
        <Footer />
      </div>
    </div>
  );
}
