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
      className="p-8 pt-5 hover:shadow-elevated transition-shadow duration-300 animate-fade-in border-border bg-card text-2xl"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-center justify-between relative">
        <div>
          <h3 className="text-xl font-semibold text-foreground">
            Route {index + 1}
          </h3>
          {isFastest && (
            <Badge className="bg-transit-accent text-accent-foreground hover:bg-transit-accent/90 px-3 py-1 text-lg my-3">
              Earliest
            </Badge>
          )}
        </div>
        <div className="text-right">
          <div className="text-5xl mt-12 font-bold text-transit">
            {route.pickupArrivalTime}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-4 text-base">
          <Bus className="h-6 w-6 text-transit flex-shrink-0" />
          <div>
            <div className="text-muted-foreground text-sm">Bus Number</div>
            <div className="font-medium text-foreground text-lg">
              {route.busNumber ?? "Direct route"}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
