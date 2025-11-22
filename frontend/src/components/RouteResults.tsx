import { TransitRoute } from "@/types/route";
import { RouteCard } from "./RouteCard";
import { Bus } from "lucide-react";

interface RouteResultsProps {
  routes: TransitRoute[];
}

export function RouteResults({ routes }: RouteResultsProps) {
  if (routes.length === 0) {
    return (
      <div className="text-center py-16 animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <Bus className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          No bus routes found
        </h3>
        <p className="text-muted-foreground">
          Try different addresses or check if transit is available in your area.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-2xl font-bold text-foreground mb-6">
        Available Routes
      </h2>
      {routes.map((route, index) => (
        <RouteCard
          key={index}
          route={route}
          index={index}
          isFastest={index === 0}
        />
      ))}
    </div>
  );
}
