import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AddressInput } from "@/components/AddressInput";
import { TimeInput } from "@/components/TimeInput";
import { RouteResults } from "@/components/RouteResults";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ArrowLeftRight, Search } from "lucide-react";
import { geocodeAddress, fetchRoutes } from "@/api/peakroute";
import { TransitRoute } from "@/types/route";
import { useToast } from "@/hooks/use-toast";

export default function Index() {
  const [startAddress, setStartAddress] = useState("");
  const [destAddress, setDestAddress] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [routes, setRoutes] = useState<TransitRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();

  const handleSwapAddresses = () => {
    const temp = startAddress;
    setStartAddress(destAddress);
    setDestAddress(temp);
  };

  const handleFindRoutes = async () => {
    // Validation
    if (!startAddress.trim() || !destAddress.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter both start and destination addresses.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setShowResults(false);

    try {
      // Step 1: Geocode addresses
      // NOTE: Using mock geocoding. Replace with actual Google Geocoding API
      const originCoords = await geocodeAddress(startAddress);
      const destCoords = await geocodeAddress(destAddress);

      // Step 2: Fetch routes from backend
      const origin = `${originCoords.lat},${originCoords.lng}`;
      const destination = `${destCoords.lat},${destCoords.lng}`;
      
      const fetchedRoutes = await fetchRoutes(origin, destination, arrivalTime || undefined);
      
      setRoutes(fetchedRoutes);
      setShowResults(true);

      if (fetchedRoutes.length > 0) {
        toast({
          title: "Routes found!",
          description: `Found ${fetchedRoutes.length} available routes.`,
        });
      }
    } catch (error) {
      console.error("Error finding routes:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to find routes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8 md:py-16">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-transit to-transit-accent bg-clip-text text-transparent mb-3">
            PeakRoute
          </h1>
          <p className="text-muted-foreground text-lg">
            Find the fastest bus route, instantly.
          </p>
        </div>

        {/* Search Card */}
        <Card className="p-6 md:p-8 mb-8 shadow-elevated animate-slide-in">
          <div className="space-y-4">
            <AddressInput
              value={startAddress}
              onChange={setStartAddress}
              placeholder="Enter start address"
              type="start"
            />

            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSwapAddresses}
                className="rounded-full hover:bg-secondary"
              >
                <ArrowLeftRight className="h-5 w-5" />
              </Button>
            </div>

            <AddressInput
              value={destAddress}
              onChange={setDestAddress}
              placeholder="Enter destination"
              type="destination"
            />

            <div className="pt-2">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Arrival Time (optional)
              </label>
              <TimeInput
                value={arrivalTime}
                onChange={setArrivalTime}
              />
            </div>

            <Button
              onClick={handleFindRoutes}
              disabled={loading}
              className="w-full h-12 text-base bg-transit hover:bg-transit/90 text-primary-foreground"
            >
              {loading ? (
                "Searching..."
              ) : (
                <>
                  <Search className="mr-2 h-5 w-5" />
                  Find Routes
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Results Section */}
        {loading && <LoadingSkeleton />}
        {showResults && !loading && <RouteResults routes={routes} />}
      </div>
    </div>
  );
}
