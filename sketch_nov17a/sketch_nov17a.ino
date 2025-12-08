#include <WiFi.h>
#include <HTTPClient.h>

const int sensorPin = 34;

// ======== WIFI DETAILS ========
const char* ssid = "iPhone";
const char* password = "123456789";

// ======== SERVER URL ========
String serverURL = "http://172.20.10.9:4000/api/esp32";

// ======== SENSOR SETTINGS ========
int samples = 200;
float calibrationFactor = 0.012;

void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }

  Serial.println("\nWiFi connected!");
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());
}

float readCurrent() {
  long total = 0;

  for (int i = 0; i < samples; i++) {
    total += analogRead(sensorPin);
    delay(2);
  }

  float avg = total / samples;

  // fix small negative drift
  float diff = avg - 2000;
  if (diff < 0) diff = 0;

  float amps = diff * calibrationFactor;
  return amps;
}

void sendToServer(float current) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected");
    return;
  }

  HTTPClient http;
  http.begin(serverURL);
  http.addHeader("Content-Type", "application/json");

  String json = "{ \"current\": " + String(current, 2) + " }";

  Serial.print("Sending: ");
  Serial.println(json);

  int code = http.POST(json);

  // FIXED: Only show error if POST fails
  if (code == 200 || code == 201) {
    Serial.print("Server Response: ");
    Serial.println(http.getString());
  } else {
    Serial.print("HTTP POST Failed, Error Code: ");
    Serial.println(code);
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(2000);

  pinMode(sensorPin, INPUT);
  connectWiFi();
}

void loop() {
  float amps = readCurrent();

  Serial.print("Current: ");
  Serial.print(amps);
  Serial.println(" A");

  sendToServer(amps);

  delay(5000);
}
