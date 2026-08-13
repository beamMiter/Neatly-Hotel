"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CloseIcon } from "@/src/components/icons/CloseIcon";
import { MenuIcon } from "@/src/components/icons/MenuIcon";

const navLinks = [
  { href: "/about", label: "About Neatly" },
  { href: "/service-facilities", label: "Service & Facilities" },
  { href: "/rooms-suits", label: "Rooms & Suits" },
];

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="relative z-20 border-b border-brand-border bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
        <Link href="/" className="flex items-center" onClick={() => setIsMenuOpen(false)}>
          <Image
            src="/images/logo-neatly.png"
            alt="Neatly"
            width={167}
            height={45}
            priority
            className="h-6 w-auto sm:h-7"
          />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-brand-body transition-colors hover:text-brand-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/login"
          className="hidden text-sm font-semibold text-brand-primary hover:text-brand-primary-hover md:block"
        >
          Log in
        </Link>

        <button
          type="button"
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
          className="text-brand-ink md:hidden"
        >
          {isMenuOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>
      </div>

      {isMenuOpen && (
        <nav className="flex flex-col gap-1 border-t border-brand-border bg-white px-4 py-3 md:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMenuOpen(false)}
              className="rounded-md px-2 py-2 text-sm font-medium text-brand-body hover:bg-brand-surface"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setIsMenuOpen(false)}
            className="rounded-md px-2 py-2 text-sm font-semibold text-brand-primary hover:bg-brand-surface"
          >
            Log in
          </Link>
        </nav>
      )}
    </header>
  );
}
