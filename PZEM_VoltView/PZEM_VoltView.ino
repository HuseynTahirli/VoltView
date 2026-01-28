#include <PZEM004Tv30.h>
#include <WiFi.h>
#include <HTTPClient.h>

// ======== PZEM-004T SENSOR PINS ========
#define PZEM_RX_PIN 16  // ESP32 RX (Connect to PZEM TX)
#define PZEM_TX_PIN 17  // ESP32 TX (Connect to PZEM RX)

// ======== WIFI DETAILS ========
const char* ssid = "iPhone";
const char* password = "123456789";

// ======== SERVER URL ========
// NOTE: Update this IP address if your computer's IP changes
String serverURL = "http://172.20.10.9:4000/api/esp32";

// ======== READING INTERVAL ========
const int readingInterval = 5000; // 5 seconds between readings

// Initialize the PZEM sensor using Hardware Serial2
PZEM004Tv30 pzem(Serial2, PZEM_RX_PIN, PZEM_TX_PIN);

void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }

  Serial.println("\n✓ WiFi connected!");
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());
}

void sendToServer(float voltage, float current, float power, float energy, float frequency, float pf) {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠ WiFi disconnected - attempting to reconnect...");
    connectWiFi();
    return;
  }

  HTTPClient http;
  http.begin(serverURL);
  http.addHeader("Content-Type", "application/json");

  // Create JSON payload with all PZEM readings
  String json = "{";
  json += "\"voltage\":" + String(voltage, 2) + ",";
  json += "\"current\":" + String(current, 3) + ",";
  json += "\"power\":" + String(power, 2) + ",";
  json += "\"energy\":" + String(energy, 3) + ",";
  json += "\"frequency\":" + String(frequency, 1) + ",";
  json += "\"pf\":" + String(pf, 2);
  json += "}";

  Serial.print("📤 Sending: ");
  Serial.println(json);

  int code = http.POST(json);

  if (code == 200 || code == 201) {
    Serial.print("✓ Server Response: ");
    Serial.println(http.getString());
  } else {
    Serial.print("✗ HTTP POST Failed, Error Code: ");
    Serial.println(code);
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("========================================");
  Serial.println("  PZEM-004T V3.0 VoltView Integration");
  Serial.println("========================================");
  
  // Connect to WiFi
  connectWiFi();
  
  // Optional: Uncomment to reset the energy counter
  // pzem.resetEnergy();
  
  Serial.println("\n🔄 Starting sensor readings...\n");
}

void loop() {
  // Read all data from the PZEM sensor
  float voltage   = pzem.voltage();
  float current   = pzem.current();
  float power     = pzem.power();
  float energy    = pzem.energy();
  float frequency = pzem.frequency();
  float pf        = pzem.pf();

  // Check for sensor communication errors
  if (isnan(voltage)) {
    Serial.println("✗ Error reading voltage - Check PZEM connection");
  } else if (isnan(current)) {
    Serial.println("✗ Error reading current - Check PZEM connection");
  } else if (isnan(power)) {
    Serial.println("✗ Error reading power - Check PZEM connection");
  } else if (isnan(energy)) {
    Serial.println("✗ Error reading energy - Check PZEM connection");
  } else if (isnan(frequency)) {
    Serial.println("✗ Error reading frequency - Check PZEM connection");
  } else if (isnan(pf)) {
    Serial.println("✗ Error reading power factor - Check PZEM connection");
  } else {
    // All readings successful - print to Serial Monitor
    Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    Serial.print("Voltage:      "); Serial.print(voltage);   Serial.println(" V");
    Serial.print("Current:      "); Serial.print(current);   Serial.println(" A");
    Serial.print("Power:        "); Serial.print(power);     Serial.println(" W");
    Serial.print("Energy:       "); Serial.print(energy, 3); Serial.println(" kWh");
    Serial.print("Frequency:    "); Serial.print(frequency); Serial.println(" Hz");
    Serial.print("Power Factor: "); Serial.println(pf);
    Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    // Send data to backend server
    sendToServer(voltage, current, power, energy, frequency, pf);
  }

  Serial.println();
  delay(readingInterval);
}
