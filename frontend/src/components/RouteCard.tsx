import { TransitRoute } from "@/types/route";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bus, Clock } from "lucide-react";

interface RouteCardProps {
  route: TransitRoute;
  index: number;
  isFastest: boolean;
}

export function RouteCard({ route, index, isFastest }: RouteCardProps) {
  return (
    <Card
      className="p-6 hover:shadow-elevated transition-shadow duration-300 animate-fade-in border-border bg-card"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Route {index + 1}
          </h3>
          {isFastest && (
            <Badge className="mt-2 bg-transit-accent text-accent-foreground hover:bg-transit-accent/90">
              Fastest
            </Badge>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-transit">
            {route.durationMin}
          </div>
          <div className="text-sm text-muted-foreground">minutes</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <Bus className="h-4 w-4 text-transit flex-shrink-0" />
          <div>
            <div className="text-muted-foreground">Bus Number</div>
            <div className="font-medium text-foreground">
              {route.busNumber ?? "Direct route"}
            </div>
          </div>
        </div>

        {route.pickupArrivalTime && (
          <div className="flex items-center gap-3 text-sm">
            <Clock className="h-4 w-4 text-transit flex-shrink-0" />
            <div>
              <div className="text-muted-foreground">Pickup Time</div>
              <div className="font-medium text-foreground">
                {route.pickupArrivalTime}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
