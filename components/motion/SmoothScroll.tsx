"use client";

import Lenis from "lenis";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import gsap from "gsap";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

const floorPrefixes = ["/inventory/receive", "/production/operations/", "/quality/inspect/", "/quality", "/dispatch/", "/hr/attendance", "/scan", "/my-work"];
function tierFor(pathname: string): "T0" | "T1" | "T2" {
  if (floorPrefixes.some((prefix) => pathname.startsWith(prefix))) return "T0";
  if (pathname === "/" || pathname === "/login" || pathname.startsWith("/portal") || pathname.startsWith("/rolls/")) return "T2";
  if (pathname.startsWith("/orders/") && pathname.endsWith("/tracker")) return "T2";
  return "T1";
}

let activeLenis: Lenis | null = null;
export function getActiveLenis(): Lenis | null { return activeLenis; }

export function SmoothScroll({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  useEffect(() => {
    const tier = tierFor(pathname);
    let lenis: Lenis | null = null;
    let tick: ((time: number) => void) | null = null;

    const stop = () => {
      if (lenis && tick) {
        gsap.ticker.remove(tick);
        lenis.destroy();
      }
      if (activeLenis === lenis) activeLenis = null;
      lenis = null;
      tick = null;
      document.documentElement.classList.remove("lenis", "lenis-smooth");
    };

    const apply = () => {
      stop();
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduced";
      if (reduced || tier === "T0") return;
      gsap.registerPlugin(ScrollTrigger);
      lenis = new Lenis({ autoRaf: false, lerp: tier === "T2" ? 0.085 : 0.14, smoothWheel: true, syncTouch: false, anchors: true });
      activeLenis = lenis;
      lenis.on("scroll", ScrollTrigger.update);
      tick = (time: number) => lenis?.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      document.documentElement.classList.add("lenis", "lenis-smooth");
      lenis.scrollTo(0, { immediate: true });
      requestAnimationFrame(() => ScrollTrigger.refresh());
    };

    apply();
    window.addEventListener("loom-motion-change", apply);
    return () => {
      window.removeEventListener("loom-motion-change", apply);
      stop();
    };
  }, [pathname]);
  return <>{children}</>;
}
