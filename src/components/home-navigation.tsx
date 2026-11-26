"use client";

import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";

const links = [
  { label: "Capabilities", href: "#features" },
  { label: "Workflow", href: "#workflow" },
  { label: "Security", href: "#security" },
];

export function HomeNavigation() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return (
    <header className="home-nav-wrap">
      <nav className="home-nav" aria-label="Main navigation">
        <Logo tone="inverse"/>
        <div className="home-nav-links">
          {links.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}
        </div>
        <div className="home-nav-actions">
          <Link href="/login" className="home-sign-in">Sign in <ArrowRight size={14}/></Link>
          <button
            type="button"
            className="home-menu-toggle"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            aria-controls="home-mobile-menu"
          >
            {menuOpen ? <X size={19}/> : <Menu size={19}/>}
          </button>
        </div>
      </nav>
      <div id="home-mobile-menu" className={`home-mobile-menu${menuOpen ? " home-mobile-menu-open" : ""}`} inert={!menuOpen}>
        {links.map((link, index) => (
          <a key={link.href} href={link.href} style={{ transitionDelay: menuOpen ? `${index * 45}ms` : "0ms" }} onClick={() => setMenuOpen(false)}>
            <span>0{index + 1}</span>{link.label}<ArrowRight size={15}/>
          </a>
        ))}
        <Link href="/register" onClick={() => setMenuOpen(false)}><span>↗</span>Create your account<ArrowRight size={15}/></Link>
      </div>
    </header>
  );
}
