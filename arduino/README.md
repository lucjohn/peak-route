# Arduino Integration for Peak Route

This folder contains Arduino code to display bus routes from the backend on an Arduino display.

## Setup Options

### Option 1: Serial Communication (Recommended for Testing)

**Hardware:**
- Any Arduino (Uno, Nano, etc.)
- USB cable
- Optional: LCD/OLED display

**Steps:**

1. **Install dependencies:**
   ```bash
   cd arduino
   npm install serialport @serialport/parser-readline
   ```

2. **Upload Arduino sketch:**
   - Open `peak_route_display.ino` in Arduino IDE
   - Select your board and port
   - Upload the sketch

3. **Send routes to Arduino:**
   ```bash
   node send_routes.js
   ```

4. **Auto-send when new routes are found:**
   ```bash
   node send_routes.js --watch
   ```

### Option 2: WiFi (ESP32/ESP8266)

If you have an ESP32 or ESP8266, you can connect directly to your backend API.

**Hardware:**
- ESP32 or ESP8266
- Display (LCD/OLED)

**Steps:**

1. Modify the Arduino sketch to include WiFi and HTTP client libraries
2. Connect to your WiFi network
3. Make HTTP requests to `http://localhost:3001/api/routes` (or your server IP)

### Option 3: SD Card

**Hardware:**
- Arduino with SD card shield/module
- SD card

**Steps:**

1. Copy the latest routes JSON file to the SD card
2. Modify Arduino code to read from SD card
3. Parse and display the routes

## Display Options

The sketch supports multiple display types. Uncomment the one you're using in `peak_route_display.ino`:

- **USE_SERIAL** - For testing, displays on Serial Monitor
- **USE_LCD** - For I2C LCD displays (16x2)
- **USE_OLED** - For SSD1306 OLED displays (128x64)

## Route Data Format

The Arduino receives JSON in this format:
```json
{
  "routes": [
    {
      "busNumber": "31",
      "pickupArrivalTime": "09:31"
    },
    {
      "busNumber": "09",
      "pickupArrivalTime": "09:42"
    }
  ]
}
```

## Troubleshooting

**Arduino not found:**
- Check USB connection
- Verify COM port in Device Manager (Windows) or `/dev/tty*` (Linux/Mac)
- Edit `send_routes.js` and manually set the port path

**No data received:**
- Check baud rate matches (9600)
- Verify Arduino sketch is uploaded correctly
- Check Serial Monitor to see if Arduino is receiving data

**Display not working:**
- Verify display connections (I2C address, wiring)
- Check if correct display type is uncommented in sketch
- Test with USE_SERIAL first to verify data parsing works

