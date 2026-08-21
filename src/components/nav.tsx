"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, Users, Calendar, Bell, Vote, ArrowRight } from "lucide-react";
import { useState } from "react";

interface NavProps {
  isAdmin?: boolean;
}

export function Nav({ isAdmin }: NavProps) {
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/events", label: "Events", icon: Calendar },
    { href: "/announcements", label: "Announcements", icon: Bell },
    { href: "/members", label: "Members", icon: Users },
  ];

  return (
    <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="font-heading text-2xl font-bold text-primary flex items-center gap-2">
          Votara
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:items-center md:gap-6">
          <div className="flex items-center gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          </div>

          {status === "loading" ? (
            <div className="h-8 w-8 animate-pulse bg-muted rounded-full" />
          ) : session ? (
            <div className="flex items-center gap-4">
              {status === "authenticated" && (
                <>
                  <Link
                    href="/elections"
                    className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    <Vote className="w-4 h-4" />
                    Elections
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent/80 transition-colors"
                    >
                      <Users className="w-4 h-4" />
                      Admin
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex items-center gap-1.5"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </Button>
                </>
              )}
            </div>
          ) : (
            <Link href="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
          )}
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border py-4 px-4 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 text-base font-medium text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </Link>
          ))}
          <div className="border-t border-border pt-3 space-y-2">
            {status === "authenticated" && (
              <>
                <Link
                  href="/elections"
                  className="flex items-center gap-3 text-base font-medium text-primary hover:text-primary/80 px-3 py-2 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Vote className="w-5 h-5" />
                  Elections
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-3 text-base font-medium text-accent hover:text-accent/80 px-3 py-2 rounded-lg transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Users className="w-5 h-5" />
                    Admin
                  </Link>
                )}
                <Button
                  variant="ghost"
                  className="w-full justify-start flex items-center gap-3 text-base font-medium text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg transition-colors"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </Button>
              </>
            )}
            {status === "unauthenticated" && (
              <Link
                href="/login"
                className="block text-center"
              >
                <Button className="w-full justify-center gap-2" size="lg">
                  Log in
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}