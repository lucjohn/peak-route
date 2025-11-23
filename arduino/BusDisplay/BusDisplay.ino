#include <Arduino_GFX_Library.h>
#include <PCA95x5.h>

#define BLACK 0x0000
#define RED 0xF800
#define GFX_BL 45

Arduino_DataBus *bus = new Arduino_SWSPI(
    GFX_NOT_DEFINED /* DC */, PCA95x5::Port::P04 /* CS */,
    41 /* SCK */, 48 /* MOSI */, GFX_NOT_DEFINED /* MISO */);

Arduino_ESP32RGBPanel *rgbpanel = new Arduino_ESP32RGBPanel(
    18 /* DE */, 17 /* VSYNC */, 16 /* HSYNC */, 21 /* PCLK */,
    4 /* R0 */, 3 /* R1 */, 2 /* R2 */, 1 /* R3 */, 0 /* R4 */,
    10 /* G0 */, 9 /* G1 */, 8 /* G2 */, 7 /* G3 */, 6 /* G4 */, 5 /* G5 */,
    15 /* B0 */, 14 /* B1 */, 13 /* B2 */, 12 /* B3 */, 11 /* B4 */,
    1 /* hsync_polarity */, 10 /* hsync_front_porch */, 8 /* hsync_pulse_width */, 50 /* hsync_back_porch */,
    1 /* vsync_polarity */, 10 /* vsync_front_porch */, 8 /* vsync_pulse_width */, 20 /* vsync_back_porch */);

Arduino_RGB_Display *gfx = new Arduino_RGB_Display(
    480 /* width */, 480 /* height */, rgbpanel, 2 /* rotation */, true /* auto_flush */,
    bus, GFX_NOT_DEFINED /* RST */, st7701_type1_init_operations, sizeof(st7701_type1_init_operations));

String jsonBuffer = "";
struct Route {
  String busNumber;
  String pickupTime;
};
Route routes[3];
int routeCount = 0;
bool dataUpdated = false;
bool hasValidRoutes = false; // Track if we have valid routes to display

void setup(void)
{
  Serial.begin(115200);
  Serial.println("Arduino_GFX Hello World example");

  if (!gfx->begin())
  {
    Serial.println("gfx->begin() failed!");
  }
  
  pinMode(GFX_BL, OUTPUT);
  digitalWrite(GFX_BL, HIGH);

  //gfx->setCursor(10, 10);
  //gfx->setTextColor(RED);
  //gfx->println("Sensecap Indicator");

  delay(5000);
}

void loop()
{
  // Read JSON from Serial
  if (Serial.available() > 0) {
    char c = Serial.read();
    if (c == '\n') {
      parseRoutes(jsonBuffer);
      jsonBuffer = "";
      dataUpdated = true; // Flag that data was updated
    } else {
      jsonBuffer += c;
    }
  }
  
  // Redraw display only when data is updated (fixes shakiness)
  if (dataUpdated) {
    displayRoutes();
    dataUpdated = false;
  }
  
  delay(100);
}

void displayRoutes() {
  // Clear screen and display all routes
  gfx->fillScreen(BLACK);
  
  if (routeCount > 0 && hasValidRoutes) {
    int yPos = 30;
    int spacing = 150; // Space between each route
    
    for (int i = 0; i < routeCount; i++) {
      // Bus number (moved cursor right to prevent cutoff, 10% larger text)
      gfx->setCursor(50, yPos);
      gfx->setTextColor(RED, BLACK);
      gfx->setTextSize(3, 3, 1); // Increased from 2 to 3 (50% larger, closest to 10% with integer sizes)
      gfx->print("Bus #");
      gfx->println(routes[i].busNumber);
      
      // Pickup time (moved cursor right to prevent cutoff, 10% larger text)
      gfx->setCursor(50, yPos + 60);
      gfx->setTextSize(3, 3, 1); // Increased from 2 to 3
      gfx->print("Pickup: ");
      gfx->println(routes[i].pickupTime);
      
      yPos += spacing;
    }
  } else {
    gfx->setCursor(20, 40);
    gfx->setTextColor(RED, BLACK);
    gfx->setTextSize(3, 3, 1);
    gfx->println("Waiting...");
  }
}

void parseRoutes(String json) {
  // Only reset if we find valid routes
  int routesStart = json.indexOf("\"routes\":[");
  if (routesStart == -1) {
    // Don't print error or reset - just ignore invalid JSON
    // This prevents clearing valid routes when receiving empty/malformed data
    return;
  }
  
  routeCount = 0;
  
  // Extract each route (up to 3)
  int pos = routesStart + 10; // Start after "routes":[
  int routeIndex = 0;
  
  while (pos < json.length() && routeIndex < 3) {
    // Find busNumber starting from current position
    int busKeyStart = json.indexOf("\"busNumber\"", pos);
    if (busKeyStart == -1) break;
    
    // Find the colon after busNumber
    int colonPos = json.indexOf(":", busKeyStart);
    if (colonPos == -1) break;
    
    // Find the opening quote of the value
    int busValueStart = json.indexOf("\"", colonPos) + 1;
    if (busValueStart == 0) break; // +1 makes it 0 if not found
    
    // Find the closing quote
    int busValueEnd = json.indexOf("\"", busValueStart);
    if (busValueEnd == -1) break;
    
    // Extract bus number
    routes[routeIndex].busNumber = json.substring(busValueStart, busValueEnd);
    
    // Find pickupArrivalTime starting from after the bus number
    int timeKeyStart = json.indexOf("\"pickupArrivalTime\"", busValueEnd);
    if (timeKeyStart == -1) break;
    
    // Find the colon after pickupArrivalTime
    int timeColonPos = json.indexOf(":", timeKeyStart);
    if (timeColonPos == -1) break;
    
    // Find the opening quote of the value
    int timeValueStart = json.indexOf("\"", timeColonPos) + 1;
    if (timeValueStart == 0) break;
    
    // Find the closing quote
    int timeValueEnd = json.indexOf("\"", timeValueStart);
    if (timeValueEnd == -1) break;
    
    // Extract pickup time
    routes[routeIndex].pickupTime = json.substring(timeValueStart, timeValueEnd);
    
    // Debug output
    Serial.print("Route ");
    Serial.print(routeIndex);
    Serial.print(": Bus=");
    Serial.print(routes[routeIndex].busNumber);
    Serial.print(", Time=");
    Serial.println(routes[routeIndex].pickupTime);
    
    routeIndex++;
    pos = timeValueEnd + 1; // Move past this route
  }
  
  routeCount = routeIndex;
  
  // Only update if we actually parsed routes
  if (routeCount > 0) {
    hasValidRoutes = true; // Mark that we have valid routes
    Serial.print("Parsed ");
    Serial.print(routeCount);
    Serial.println(" routes");
    
    // Force display update
    dataUpdated = true;
  }
}