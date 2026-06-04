import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[...Array(3)].map((_, idx) => (
        <Card key={idx} className="bg-card/40 border border-border/60 backdrop-blur-xs shadow-md transition-all duration-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 bg-muted/50 animate-pulse" />
              <Skeleton className="h-5 w-5 rounded bg-muted/50 animate-pulse" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2 bg-muted/50 animate-pulse" />
            <Skeleton className="h-3 w-32 bg-muted/50 animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
