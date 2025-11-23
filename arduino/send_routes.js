/**
 * Node.js script to send latest routes JSON to Arduino via Serial
 * 
 * Usage:
 *   1. Upload peak_route_display.ino to your Arduino
 *   2. Connect Arduino via USB
 *   3. Run: node send_routes.js
 * 
 * Requirements:
 *   npm install serialport
 */

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const fs = require('fs');
const path = require('path');

// Path to routes folder
const ROUTES_DIR = path.join(__dirname, '..', 'backend', 'routes');

// Arduino port - hardcoded to COM10
const ARDUINO_PORT = 'COM10';

// Find the most recent routes file
function getLatestRoutesFile() {
  const files = fs.readdirSync(ROUTES_DIR)
    .filter(file => file.startsWith('routes_') && file.endsWith('.json'))
    .map(file => ({
      name: file,
      path: path.join(ROUTES_DIR, file),
      time: fs.statSync(path.join(ROUTES_DIR, file)).mtime
    }))
    .sort((a, b) => b.time - a.time);
  
  return files.length > 0 ? files[0].path : null;
}


async function sendRoutesToArduino() {
  try {
    // Get latest routes file
    const routesFile = getLatestRoutesFile();
    if (!routesFile) {
      console.error('No routes files found in', ROUTES_DIR);
      process.exit(1);
    }
    
    console.log('Reading routes from:', routesFile);
    const routesData = JSON.parse(fs.readFileSync(routesFile, 'utf8'));
    
    // Extract just the routes array for simpler parsing on Arduino
    const routesJson = JSON.stringify(routesData);
    console.log('Routes data:', routesJson);
    
    // Use COM10 - hardcoded
    const portPath = ARDUINO_PORT;
    console.log('Connecting to Arduino on', ARDUINO_PORT);
    
    // Open serial port (baud rate must match Arduino Serial.begin(115200) in BusDisplay.ino)
    const port = new SerialPort({ path: portPath, baudRate: 115200 });
    
    // Handle port errors
    port.on('error', (err) => {
      console.error('Serial port error:', err.message);
      if (err.message.includes('121') || err.message.includes('timeout')) {
        console.error('\n⚠️  Port is likely in use by another program!');
        console.error('   Close Arduino IDE Serial Monitor if it\'s open.');
        console.error('   Or close any other programs using COM4');
      }
      process.exit(1);
    });
    
    // Wait for port to open
    await new Promise((resolve, reject) => {
      port.on('open', () => {
        console.log('✓ Port opened successfully');
        resolve();
      });
      port.on('error', reject);
    });
    
    const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
    
    // Listen for Arduino messages
    parser.on('data', (data) => {
      console.log('Arduino:', data.toString().trim());
    });
    
    // Wait a bit for connection, then send data
    setTimeout(() => {
      console.log('Sending routes to Arduino...');
      port.write(routesJson + '\n');
      console.log('✓ Routes sent! Check your Arduino display.');
      
      // Keep connection open to see Arduino responses
      setTimeout(() => {
        console.log('\nPress Ctrl+C to exit (or leave running for watch mode)');
      }, 1000);
    }, 2000);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Keep port connection open for watch mode
let watchPort = null;
let watchParser = null;

// Send routes using existing connection (for watch mode)
async function sendRoutesToExistingConnection(port, parser) {
  try {
    const routesFile = getLatestRoutesFile();
    if (!routesFile) {
      console.error('No routes files found in', ROUTES_DIR);
      return;
    }
    
    console.log('Reading routes from:', routesFile);
    const routesData = JSON.parse(fs.readFileSync(routesFile, 'utf8'));
    const routesJson = JSON.stringify(routesData);
    
    console.log('Sending routes to Arduino...');
    port.write(routesJson + '\n');
    console.log('✓ Routes sent! Check your Arduino display.');
  } catch (error) {
    console.error('Error sending routes:', error.message);
  }
}

// Watch for new route files and auto-send
async function watchAndSend() {
  console.log('Setting up watch mode...');
  
  // Open connection once and keep it open
  try {
    console.log('Connecting to Arduino on', ARDUINO_PORT);
    watchPort = new SerialPort({ path: ARDUINO_PORT, baudRate: 115200 });
    
    watchPort.on('error', (err) => {
      console.error('Serial port error:', err.message);
      if (err.message.includes('121') || err.message.includes('timeout')) {
        console.error('\n⚠️  Port is likely in use by another program!');
        console.error('   Close Arduino IDE Serial Monitor if it\'s open.');
      }
    });
    
    await new Promise((resolve, reject) => {
      watchPort.on('open', () => {
        console.log('✓ Port opened successfully');
        resolve();
      });
      watchPort.on('error', reject);
    });
    
    watchParser = watchPort.pipe(new ReadlineParser({ delimiter: '\n' }));
    watchParser.on('data', (data) => {
      // Only log if it's not sensor noise
      const msg = data.toString().trim();
      if (msg && !msg.includes('start measure') && !msg.includes('GET DATA') && !msg.includes('sensor') && !msg.includes('grove adc')) {
        console.log('Arduino:', msg);
      }
    });
    
    // Send initial routes
    await sendRoutesToExistingConnection(watchPort, watchParser);
    
    // Watch for new files
    fs.watch(ROUTES_DIR, (eventType, filename) => {
      if (filename && filename.startsWith('routes_') && filename.endsWith('.json')) {
        console.log('\n🔄 New routes file detected:', filename);
        setTimeout(() => sendRoutesToExistingConnection(watchPort, watchParser), 500);
      }
    });
    
    console.log('✓ Watching for new route files...');
    console.log('Press Ctrl+C to exit');
    
  } catch (error) {
    console.error('Error setting up watch mode:', error.message);
    process.exit(1);
  }
}

// Run
if (require.main === module) {
  const watchMode = process.argv.includes('--watch');
  
  if (watchMode) {
    watchAndSend();
  } else {
    sendRoutesToArduino();
  }
}

module.exports = { sendRoutesToArduino, getLatestRoutesFile };

