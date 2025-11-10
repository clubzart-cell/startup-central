import { Card, CardContent, CardHeader } from "./card";
import { Skeleton } from "./skeleton";

export const SkeletonCard = () => (
  <Card className="gradient-card">
    <CardHeader>
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2 mt-2" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6 mt-2" />
      <Skeleton className="h-4 w-4/6 mt-2" />
    </CardContent>
  </Card>
);

export const SkeletonStats = () => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
    {[...Array(5)].map((_, i) => (
      <Card key={i} className="gradient-card">
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16" />
        </CardContent>
      </Card>
    ))}
  </div>
);

export const SkeletonTaskColumn = () => (
  <div className="space-y-3">
    <Skeleton className="h-6 w-24" />
    <SkeletonCard />
    <SkeletonCard />
  </div>
);
