import express from "express";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();
app.use(express.json());

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
function formatTimeHHMM(isoTime) {
  if (!isoTime) return null;
  const date = new Date(isoTime); // parse ISO string
  
  // Extract hours/minutes and pad with zeros
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

async function computeTransitRoutes(origin, destination) {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error("GOOGLE_MAPS_API_KEY not set in environment");
  }

  const baseUrl = "https://routes.googleapis.com/directions/v2:computeRoutes";

  const originLatLng = parseLatLng(origin);
  const destLatLng = parseLatLng(destination);

  // Create body for POST request (Routes API)
  const body = {
    origin: {
      location: { latLng: originLatLng }
    },
    destination: {
      location: { latLng: destLatLng }
    },
    travelMode: "TRANSIT",
    computeAlternativeRoutes: true,
    transitPreferences: {
      allowedTravelModes: ["BUS"]
    }
  };

  // Field mask: only request needed fields
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
    // total travel duration of entire route
    const durationSec = route.duration
      ? parseInt(route.duration.replace("s", ""), 10)
      : Number.POSITIVE_INFINITY;

    const busNumbers = [];
    let firstBusPickupArrivalTime = null; // first bus time at pickup stop

    (route.legs || []).forEach(leg => {
      (leg.steps || []).forEach(step => {
        const td = step.transitDetails;
        if (!td) return;

        // Extract bus number(s)
        if (td.transitLine) {
          const shortName =
            td.transitLine.nameShort ||
            td.transitLine.name ||
            null;

          if (shortName && !busNumbers.includes(shortName)) {
            if (busNumbers.length === 0) busNumbers.push(shortName);

          }
        }

        // FIRST transit step => pickup stop bus arrival/departure time
        if (!firstBusPickupArrivalTime && td.stopDetails?.departureTime) {
          firstBusPickupArrivalTime = td.stopDetails.departureTime;
        }
      });
    });

    return {
      durationSec,
      busNumbers,
      pickupArrivalTime: firstBusPickupArrivalTime
    };
  });

  // sort fastest first
  mapped.sort((a, b) => a.durationSec - b.durationSec);

  return mapped;
}

// GET /api/routes?origin=lat,lng&destination=lat,lng&buses=1,2
app.get("/api/routes", async (req, res) => {
  const { origin, destination, buses } = req.query;
  if (!origin || !destination) {
    return res.status(400).json({ error: "origin and destination required" });
  }

  try {
    const routes = await computeTransitRoutes(origin, destination);

    // optional filter by bus numbers
    let filtered = routes;
    if (buses) {
      const wanted = buses.split(",").map(s => s.trim());
      filtered = routes.filter(r =>
        r.busNumbers.some(bn => wanted.includes(String(bn)))
      );
    }

    // keep only routes that actually have buses
    const busOnly = filtered.filter(r => r.busNumbers.length > 0);

    // top 3 fastest bus routes with pickup arrival time
    const top3 = busOnly.slice(0, 3).map(r => ({
      durationSec: r.durationSec,
      durationMin: Math.round(r.durationSec / 60),
      busNumbers: r.busNumbers,
      pickupArrivalTime: formatTimeHHMM(r.pickupArrivalTime)
    }));

    return res.json({ count: top3.length, routes: top3 });
  } catch (err) {
    console.error(err.message || err);
    return res.status(500).json({ error: err.message || "internal error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
