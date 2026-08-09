import { Calendar } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <AppHeader activePage="today" />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-8 py-7">
        <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
          <div className="border-b border-border pb-5">
            <div className="mb-1.5 flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="size-3.5" />
              <div className="h-3 w-40 animate-pulse rounded-sm bg-muted" />
            </div>
            <div className="h-8 w-56 animate-pulse rounded-sm bg-muted" />
          </div>

          <div className="grid grid-cols-3 items-start gap-4">
            {Array.from({ length: 3 }, (_, index) => (
              <Card key={index} className="h-80 animate-pulse gap-0 py-0">
                <CardHeader className="border-b border-border/80 bg-muted/15 px-5 py-4">
                  <div className="h-5 w-36 rounded-sm bg-muted" />
                  <div className="h-4 w-44 rounded-sm bg-muted" />
                </CardHeader>
                <CardContent className="space-y-4 px-5 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-9 rounded-sm bg-muted" />
                    <div className="h-9 rounded-sm bg-muted" />
                  </div>
                  <div className="h-24 rounded-sm bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
          <span className="sr-only">Loading today&apos;s sessions</span>
        </div>
      </main>
    </div>
  );
}
