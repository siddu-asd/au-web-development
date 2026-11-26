"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const transitionEvent = "projecthub:page-transition";

export function startPageTransition(destination: string) {
  if (typeof window === "undefined") return;
  const target = new URL(destination, window.location.href);
  if (target.origin === window.location.origin && target.pathname === window.location.pathname) return;
  window.dispatchEvent(new CustomEvent(transitionEvent, { detail: target.pathname }));
}

function RouteChangeObserver({ onPathnameChange }: { onPathnameChange: (pathname: string) => void }) {
  const pathname = usePathname();

  useEffect(() => {
    onPathnameChange(pathname);
  }, [onPathnameChange, pathname]);

  return null;
}

export function PageTransitionLoader() {
  const [visible, setVisible] = useState(false);
  const currentPathname = useRef<string | null>(null);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTransition = useCallback(() => {
    if (safetyTimer.current) clearTimeout(safetyTimer.current);
    safetyTimer.current = null;
    if (routeTimer.current) clearTimeout(routeTimer.current);
    routeTimer.current = null;
    setVisible(false);
  }, []);

  const beginTransition = useCallback((targetPathname: string, force = false) => {
    if (targetPathname === currentPathname.current && !force) return;
    setVisible(true);
    if (safetyTimer.current) clearTimeout(safetyTimer.current);
    safetyTimer.current = setTimeout(clearTransition, 12000);
  }, [clearTransition]);

  const handlePathnameChange = useCallback((pathname: string) => {
    if (currentPathname.current === null) {
      currentPathname.current = pathname;
      return;
    }
    if (currentPathname.current === pathname) return;
    currentPathname.current = pathname;
    if (routeTimer.current) clearTimeout(routeTimer.current);
    routeTimer.current = setTimeout(clearTransition, 220);
  }, [clearTransition]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target || link.hasAttribute("download")) return;

      const target = new URL(link.href, window.location.href);
      if (target.origin !== window.location.origin || target.pathname === currentPathname.current) return;
      beginTransition(target.pathname);
    }

    document.addEventListener("click", handleClick, true);
    const handlePopState = () => {
      const targetPathname = window.location.pathname;
      if (targetPathname !== currentPathname.current) beginTransition(targetPathname, true);
    };
    const handleProgrammaticTransition = (event: Event) => {
      if (event instanceof CustomEvent && typeof event.detail === "string") {
        beginTransition(event.detail);
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener(transitionEvent, handleProgrammaticTransition);
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener(transitionEvent, handleProgrammaticTransition);
    };
  }, [beginTransition]);

  return (
    <>
      <Suspense fallback={null}>
        <RouteChangeObserver onPathnameChange={handlePathnameChange} />
      </Suspense>
      {visible ? (
        <div className="portal-transition-overlay" role="status" aria-live="polite" aria-label="Loading page">
          <div className="portal-loader-orbit" aria-hidden="true">
            <span />
            <span />
            <span />
            <i />
          </div>
          <p className="portal-loader-brand">ProjectHub</p>
          <p className="portal-loader-caption">Preparing your workspace</p>
        </div>
      ) : null}
    </>
  );
}
