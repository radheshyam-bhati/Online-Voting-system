import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="font-heading text-3xl">403</CardTitle>
          <CardDescription className="text-lg">Access Denied</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            You don&apos;t have permission to access this page.
          </p>
          <Link href="/">
            <Button variant="default">Go Home</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}