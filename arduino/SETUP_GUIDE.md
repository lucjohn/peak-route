# Arduino Integration Setup Guide

## How It All Works Together

### Overview
Your system has **3 separate parts** that work together:

1. **Backend Server** (`backend/server.js`) - Saves route JSON files
2. **Node.js Bridge** (`arduino/send_routes.js`) - Sends data to Arduino
3. **Arduino Code** (`arduino/BusDisplay/BusDisplay.ino`) - Displays routes on screen

### The Flow

```
User searches for routes
    ↓
Backend finds routes → Saves JSON to backend/routes/routes_[timestamp].json
    ↓
send_routes.js detects new file → Reads JSON → Sends via Serial/USB
    ↓
Arduino receives JSON → Parses it → Displays on screen
```

## Step-by-Step Setup

### Step 1: Install Dependencies
```bash
cd arduino
npm install
```
This installs `serialport` and `@serialport/parser-readline` needed to communicate with Arduino.

### Step 2: Upload Arduino Code (One-Time Setup)

1. **Open Arduino IDE**
2. **Open** `arduino/BusDisplay/BusDisplay.ino`
3. **Select your board:**
   - Tools → Board → ESP32 Dev Module (or your specific ESP32 board)
4. **Select the port:**
   - Tools → Port → COM3 (or whatever port your ESP32 is on)
5. **Upload the code:**
   - Click the Upload button (→)
   - Wait for "Done uploading"

**Important:** The Arduino code stays on the device. You only need to upload it once (unless you change the code).

### Step 3: Keep Arduino Connected
- Leave the Arduino connected via USB
- The code is now running on the Arduino, waiting for data

### Step 4: Run the Bridge Script

**Option A: Send once (for testing)**
```bash
cd arduino
node send_routes.js
```

**Option B: Auto-update mode (recommended)**
```bash
cd arduino
node send_routes.js --watch
```

## How send_routes.js Updates Arduino

### What It Does:

1. **Finds Latest Routes File**
   - Scans `backend/routes/` folder
   - Sorts files by modification time
   - Gets the most recent `routes_*.json` file

2. **Connects to Arduino**
   - Scans for available COM ports
   - Finds your Arduino (ESP32) port
   - Opens Serial connection at 115200 baud

3. **Sends Data**
   - Reads the JSON file
   - Sends it as a string over Serial/USB
   - Arduino receives it character by character

4. **Watch Mode (--watch)**
   - Monitors `backend/routes/` folder for new files
   - When backend saves a new route file → automatically sends it
   - Keeps running until you press Ctrl+C

### How Arduino Receives It:

1. **Arduino's `loop()` function** constantly checks `Serial.available()`
2. **Reads characters** one by one into `jsonBuffer`
3. **When it sees `\n`** (newline) → knows message is complete
4. **Calls `parseRoutes()`** to extract bus number and time
5. **Displays on screen** using your RGB display code

## Arduino IDE vs Node.js Script

### Arduino IDE's Role:
- **Compiles** your `.ino` code
- **Uploads** the compiled code to Arduino's flash memory
- **One-time setup** - code stays on Arduino even after unplugging
- **Not needed** for daily use after initial upload

### Node.js Script's Role:
- **Sends data** (route JSON) to already-running Arduino
- **Runs on your computer** (not on Arduino)
- **Needs to run** every time you want to update the display
- **Communicates via Serial/USB** - same cable Arduino IDE uses

## Troubleshooting

### "Module not found" error
```bash
cd arduino
npm install
```

### "Arduino port not found"
- Make sure Arduino is connected via USB
- Check Device Manager (Windows) to see COM port
- You can manually set the port in `send_routes.js`:
  ```javascript
  const portPath = "COM3"; // Change to your port
  ```

### Arduino not receiving data
- Check baud rate matches (115200 in both Arduino code and send_routes.js)
- Make sure Arduino code is uploaded and running
- Check Serial Monitor in Arduino IDE to see if Arduino is receiving data

### Display not updating
- Make sure `send_routes.js --watch` is running
- Check that backend is actually saving new route files
- Verify JSON format matches what Arduino expects

## Daily Workflow

1. **Start backend server:**
   ```bash
   cd backend
   npm start
   ```

2. **Start Arduino bridge (in separate terminal):**
   ```bash
   cd arduino
   node send_routes.js --watch
   ```

3. **Use your app** - when routes are found, they automatically appear on Arduino display!

The Arduino code runs independently - you don't need Arduino IDE open after the initial upload.

