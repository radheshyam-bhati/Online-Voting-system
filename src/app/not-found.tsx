import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background font-sans flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="font-heading text-9xl font-bold text-primary/20 mb-4">404</h1>
        <h2 className="font-heading text-3xl font-bold text-primary mb-4">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved or doesn&apos;t exist.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/">
            <Button size="lg" className="gap-2">
              <Home className="w-4 h-4" />
              Go Home
            </Button>
          </Link>
          <Link href="/events">
            <Button variant="outline" size="lg" className="gap-2">
              <Search className="w-4 h-4" />
              Browse Events
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}