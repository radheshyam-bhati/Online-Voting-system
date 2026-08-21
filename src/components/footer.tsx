import Link from "next/link";

export function Footer({ isAdmin = false }: { isAdmin?: boolean }) {
  const currentYear = new Date().getFullYear();

  if (isAdmin) {
    return (
      <footer className="border-t border-border py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>&copy; {currentYear} Votara Admin. All rights reserved.</p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-border py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="font-heading text-lg font-semibold text-primary mb-3">Votara</h3>
            <p className="text-sm text-muted-foreground">
              Your college club&apos;s home online &mdash; events, announcements, members, and secure elections all in one place.
            </p>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-sm mb-3">Quick Links</h4>
            <nav className="space-y-2 text-sm">
              <Link href="/events" className="text-muted-foreground hover:text-foreground transition-colors">Events</Link>
              <Link href="/announcements" className="text-muted-foreground hover:text-foreground transition-colors">Announcements</Link>
              <Link href="/members" className="text-muted-foreground hover:text-foreground transition-colors">Members</Link>
              <Link href="/join" className="text-muted-foreground hover:text-foreground transition-colors">Join the Club</Link>
              <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">Log in</Link>
            </nav>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-sm mb-3">Contact</h4>
            <address className="not-italic text-sm text-muted-foreground space-y-1">
              <p>College Club Office</p>
              <p>Student Union Building</p>
              <p><a href="mailto:club@college.edu" className="hover:text-foreground transition-colors">club@college.edu</a></p>
            </address>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {currentYear} Votara. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}