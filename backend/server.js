import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import cors from "cors";

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

async function computeTransitRoutes(origin, destination, arrivalTimeHHMM) {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error("GOOGLE_MAPS_API_KEY not set in environment");
  }

  const baseUrl = "https://routes.googleapis.com/directions/v2:computeRoutes";

  const originLatLng = parseLatLng(origin);
  const destLatLng = parseLatLng(destination);

  // Convert HH:MM → ISO datetime
  const arrivalTimeIso = hhmmToIsoToday(arrivalTimeHHMM);

  // Build Google request body
  const body = {
    origin: { location: { latLng: originLatLng } },
    destination: { location: { latLng: destLatLng } },
    travelMode: "TRANSIT",
    computeAlternativeRoutes: true,
    transitPreferences: { allowedTravelModes: ["BUS"] },
    ...(arrivalTimeIso ? { arrivalTime: arrivalTimeIso } : {})
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

  const googleRoutes = res.data.routes || [];

  const mapped = googleRoutes.map(route => {
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

    return {
      durationSec,
      busNumber,
      pickupArrivalTime: firstBusPickupArrivalTime
    };
  });

  mapped.reverse((a, b) => a.pickupArrivalTime - b.pickupArrivalTime);
  return mapped;
}

// GET /api/routes?origin=lat,lng&destination=lat,lng&arrivalTime=HH:MM
app.get("/api/routes", async (req, res) => {
  const { origin, destination, arrivalTime } = req.query;

  if (!origin || !destination) {
    return res.status(400).json({ error: "origin and destination required" });
  }

  try {
    const routes = await computeTransitRoutes(origin, destination, arrivalTime);

    // only routes with actual bus
    const busRoutes = routes.filter(r => r.busNumber);

    const top3 = busRoutes.slice(0, 3).map(r => ({
      durationMin: Math.round(r.durationSec / 60),
      busNumber: r.busNumber,
      pickupArrivalTime: formatTimeHHMM(r.pickupArrivalTime)
    }));

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
 