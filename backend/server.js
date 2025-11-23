import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import cors from "cors"
import fs from "node:fs/promises";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

function formatTimeHHMM(isoTime) {
  if (!isoTime) return null;
  const date = new Date(isoTime);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

// helper: "lat,lng" -> {latitude, longitude}
function parseLatLng(str) {
  const [latStr, lngStr] = str.split(",").map(s => s.trim());
  const latitude = Number(latStr);
  const longitude = Number(lngStr);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error(`Invalid lat,lng: "${str}"`);
  }
  return { latitude, longitude };
}

// convert "HH:MM" → ISO datetime for *today* in server timezone
function hhmmToIsoToday(hhmm) {
  if (!hhmm) return null;

  const match = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null; // invalid format

  const [_, hh, mm] = match;
  const now = new Date();

  const date = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    Number(hh),
    Number(mm),
    0,
    0
  );

  return date.toISOString();
}

// Helper function to make Google Routes API call with a departure time
async function makeGoogleRoutesRequest(originLatLng, destLatLng, departureTimeIso) {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error("GOOGLE_MAPS_API_KEY not set in environment");
  }

  const baseUrl = "https://routes.googleapis.com/directions/v2:computeRoutes";

  // Build Google request body - TRANSIT mode only accepts departureTime, not arrivalTime
  const body = {
    origin: { location: { latLng: originLatLng } },
    destination: { location: { latLng: destLatLng } },
    travelMode: "TRANSIT",
    computeAlternativeRoutes: true,
    transitPreferences: { allowedTravelModes: ["BUS"] },
    ...(departureTimeIso ? { departureTime: departureTimeIso } : {})
  };

  const fieldMask = [
    "routes.duration",
    "routes.legs.steps.travelMode",
    "routes.legs.steps.transitDetails"
  ].join(",");

  const res = await axios.post(baseUrl, body, {
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
      "X-Goog-FieldMask": fieldMask
    }
  });

  return res.data.routes || [];
}

// Helper function to extract route details from Google API response
function extractRouteDetails(googleRoutes) {
  return googleRoutes.map(route => {
    const durationSec = route.duration
      ? parseInt(route.duration.replace("s", ""), 10)
      : Number.POSITIVE_INFINITY;

    let busNumber = null;
    let firstBusPickupArrivalTime = null;
    

    (route.legs || []).forEach(leg => {
      (leg.steps || []).forEach(step => {
        const td = step.transitDetails;
        if (!td) return;

        // Get first bus number only
    
        if (!busNumber && td.transitLine) {
          busNumber =
            td.transitLine.nameShort ||
            td.transitLine.name ||
            null;
        }

        
        if (!firstBusPickupArrivalTime && td.stopDetails?.departureTime) {
          
          firstBusPickupArrivalTime = td.stopDetails.departureTime;
        }
      });
    });

    // Calculate arrival time at destination: departure time + duration
    let arrivalTimeAtDestination = null;
    if (firstBusPickupArrivalTime && durationSec !== Number.POSITIVE_INFINITY) {
      const depDate = new Date(firstBusPickupArrivalTime);
      arrivalTimeAtDestination = new Date(depDate.getTime() + durationSec * 1000).toISOString();
    }

    return {
      busNumber,
      pickupArrivalTime: firstBusPickupArrivalTime,
      arrivalTimeAtDestination
    };
  });
}

async function computeTransitRoutes(origin, destination, arrivalTimeHHMM) {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error("GOOGLE_MAPS_API_KEY not set in environment");
  }

  const originLatLng = parseLatLng(origin);
  const destLatLng = parseLatLng(destination);

  const currentTime = new Date();

  // Sort routes based on whether arrival time is specified
  if (arrivalTimeHHMM) {
    // When arrival time is specified, get 3 routes with arrival times closest to target
    const targetArrivalTime = new Date(hhmmToIsoToday(arrivalTimeHHMM)).getTime();
    
    console.log(`\n=== Finding routes with target arrival time: ${formatTimeHHMM(new Date(targetArrivalTime))} ===`);
    
    // Make multiple API calls at strategic departure times to get all buses in the time window
    // We'll make 3 calls: now, ~30 min before target, and ~60 min before target
    const allRoutes = [];
    const departureTimes = [
      currentTime, // Now
      new Date(targetArrivalTime - 30 * 60 * 1000), // ~30 min before target
      new Date(targetArrivalTime - 60 * 60 * 1000), // ~60 min before target
    ].filter(dt => dt > currentTime && dt < targetArrivalTime); // Only future times before target
    
    console.log('Making multiple API calls at strategic times to get all buses...');
    
    for (const departureTime of departureTimes) {
      try {
        const routes = await makeGoogleRoutesRequest(originLatLng, destLatLng, departureTime.toISOString());
        const mapped = extractRouteDetails(routes);
        
        // Filter out routes where the bus has already departed
        const futureRoutes = mapped.filter(route => {
          if (!route.busNumber || !route.pickupArrivalTime) return false;
          const busDepartureTime = new Date(route.pickupArrivalTime);
          return busDepartureTime > currentTime;
        });
        
        allRoutes.push(...futureRoutes);
        console.log(`Request at ${formatTimeHHMM(departureTime)}: Found ${futureRoutes.length} routes`);
      } catch (err) {
        console.error(`Error fetching routes for departure time ${formatTimeHHMM(departureTime)}:`, err.message);
      }
    }
    
    // Deduplicate routes (same bus number + same departure time = same route)
    const routeMap = new Map();
    allRoutes.forEach(route => {
      const key = `${route.busNumber}-${route.pickupArrivalTime}`;
      if (!routeMap.has(key)) {
        routeMap.set(key, route);
      }
    });
    
    const futureRoutes = Array.from(routeMap.values());
    
    console.log(`Found ${futureRoutes.length} unique future routes from all API calls`);
    
    // Calculate absolute difference from target arrival time for each route
    const routesWithDiffs = futureRoutes
      .filter(route => route.arrivalTimeAtDestination)
      .map(route => {
        const routeArrivalTime = new Date(route.arrivalTimeAtDestination).getTime();
        const diff = Math.abs(routeArrivalTime - targetArrivalTime);
        return { route, diff, arrivalTime: routeArrivalTime };
      })
      .sort((a, b) => a.diff - b.diff); // Sort by closest to target
    
    // Get top 3 closest routes
    const top3Routes = routesWithDiffs.slice(0, 3).map(r => r.route);
    
    // Sort by arrival time to ensure chronological order
    top3Routes.sort((a, b) => {
      if (!a.arrivalTimeAtDestination) return 1;
      if (!b.arrivalTimeAtDestination) return -1;
      return new Date(a.arrivalTimeAtDestination) - new Date(b.arrivalTimeAtDestination);
    });
    
    // Log the final 3 selected routes
    console.log('\n=== Final 3 Selected Routes (closest to target arrival time) ===');
    top3Routes.forEach((route, idx) => {
      const routeArrivalTime = new Date(route.arrivalTimeAtDestination).getTime();
      const diffMinutes = Math.abs(routeArrivalTime - targetArrivalTime) / (1000 * 60);
      console.log(`Route ${idx + 1}:`, {
        busNumber: route.busNumber,
        departFromStop: route.pickupArrivalTime ? formatTimeHHMM(route.pickupArrivalTime) : 'N/A',
        arriveAtDestination: route.arrivalTimeAtDestination ? formatTimeHHMM(route.arrivalTimeAtDestination) : 'N/A',
        diffFromTarget: `${diffMinutes.toFixed(1)} min`,
        targetArrivalTime: formatTimeHHMM(new Date(targetArrivalTime))
      });
    });
    console.log('===================================\n');
    
    return top3Routes;
  } else {
    // No arrival time: get the 3 soonest departing routes
    console.log('\n=== Finding routes with no arrival time specified (soonest departures) ===');
    
    const departureTimeNow = currentTime.toISOString();
    const routes = await makeGoogleRoutesRequest(originLatLng, destLatLng, departureTimeNow);
    const mapped = extractRouteDetails(routes);
    
    // Filter out routes where the bus has already departed
    const futureRoutes = mapped.filter(route => {
      if (!route.busNumber || !route.pickupArrivalTime) return false;
      const busDepartureTime = new Date(route.pickupArrivalTime);
      return busDepartureTime > currentTime;
    });
    
    // Sort by soonest departure time
    futureRoutes.sort((a, b) => {
      if (!a.pickupArrivalTime) return 1;
      if (!b.pickupArrivalTime) return -1;
      return new Date(a.pickupArrivalTime) - new Date(b.pickupArrivalTime);
    });
    
    // Log all routes when no arrival time specified
    console.log('\n=== All Available Routes ===');
    futureRoutes.forEach((route, idx) => {
      console.log(`Route ${idx + 1}:`, {
        busNumber: route.busNumber,
        departFromStop: route.pickupArrivalTime ? formatTimeHHMM(route.pickupArrivalTime) : 'N/A',
        arriveAtDestination: route.arrivalTimeAtDestination ? formatTimeHHMM(route.arrivalTimeAtDestination) : 'N/A'
      });
    });
    
    const finalRoutes = futureRoutes.slice(0, 3);
    
    // Log the final 3 selected routes
    console.log('\n=== Final 3 Selected Routes (soonest departures) ===');
    finalRoutes.forEach((route, idx) => {
      console.log(`Route ${idx + 1}:`, {
        busNumber: route.busNumber,
        departFromStop: route.pickupArrivalTime ? formatTimeHHMM(route.pickupArrivalTime) : 'N/A',
        arriveAtDestination: route.arrivalTimeAtDestination ? formatTimeHHMM(route.arrivalTimeAtDestination) : 'N/A'
      });
    });
    console.log('===================================\n');
    
    return finalRoutes;
  }
}

// GET /api/routes?origin=lat,lng&destination=lat,lng&arrivalTime=HH:MM
app.get("/api/routes", async (req, res) => {
  console.log("=== /api/routes REQUEST RECEIVED ===");
  const { origin, destination, arrivalTime } = req.query;
  console.log("Query params:", { origin, destination, arrivalTime });

  if (!origin || !destination) {
    return res.status(400).json({ error: "origin and destination required" });
  }

  try {
    console.log("Calling computeTransitRoutes...");
    const routes = await computeTransitRoutes(origin, destination, arrivalTime);
    console.log(`Got ${routes.length} routes from computeTransitRoutes`);

    // only routes with actual bus
    const busRoutes = routes.filter(r => r.busNumber);
    console.log(`Filtered to ${busRoutes.length} bus routes`);

    const top3 = busRoutes.slice(0, 3).map(r => ({
      busNumber: r.busNumber,
      pickupArrivalTime: formatTimeHHMM(r.pickupArrivalTime)
    }));
    
    // Save routes to file - using synchronous methods for reliability
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const routesDir = path.join(__dirname, "routes");
    
    // Create directory if it doesn't exist (synchronous)
    if (!existsSync(routesDir)) {
      mkdirSync(routesDir, { recursive: true });
    }
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `routes_${timestamp}.json`;
    const filePath = path.join(routesDir, filename);
    
    // Prepare data to save
    const dataToSave = {
      origin,
      destination,
      arrivalTime: arrivalTime || null,
      generatedAt: new Date().toISOString(),
      routes: top3
    };
    
    // Write file synchronously
    writeFileSync(filePath, JSON.stringify(dataToSave, null, 2), "utf8");
    console.log(`[ROUTES SAVED] ${filePath}`);

    return res.json({ count: top3.length, routes: top3 });
  } catch (err) {
    console.error(err.message || err);
    return res.status(500).json({ error: err.message || "internal error" });
  }
});

app.get("/api/autocomplete", async (req, res) => {
  const { input } = req.query;
  if (!input) return res.status(400).json({ error: "input required" });

  try {
    const url =
      "https://maps.googleapis.com/maps/api/place/autocomplete/json";

    const params = new URLSearchParams({
      input,
      key: GOOGLE_MAPS_API_KEY,
      components: "country:ca", // Optional: limit to Canada
      types: "geocode"          // addresses & places
    });

    const response = await axios.get(`${url}?${params}`);

    res.json(response.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "autocomplete failed" });
  }
});

// Geocoding: convert full address → lat/lng
app.get("/api/geocode", async (req, res) => {
  const { address } = req.query;
  if (!address) return res.status(400).json({ error: "address required" });

  try {
    const url = "https://maps.googleapis.com/maps/api/geocode/json";
    const params = new URLSearchParams({
      address,
      key: GOOGLE_MAPS_API_KEY
    });

    const googleRes = await axios.get(`${url}?${params}`);
    const result = googleRes.data.results?.[0];

    if (!result) {
      return res.status(404).json({ error: "No geocoding results found" });
    }

    const { lat, lng } = result.geometry.location;

    return res.json({ lat, lng });
  } catch (err) {
    console.error("Geocoding error:", err.message);
    return res.status(500).json({ error: "Geocoding failed" });
  }
});



const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
