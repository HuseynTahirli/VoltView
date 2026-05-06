# VoltView Multi-Device Architecture Guide

This guide outlines the necessary changes to transition VoltView from a single-device system to a multi-tenant, multi-device architecture, allowing different users to connect their own hardware.

## 1. Database Changes
To support multiple devices, the database needs to map readings to specific hardware and hardware to specific users.

* **New `devices` Table:**
  * `id` (UUID, primary key)
  * `device_key` (String, unique - typically the MAC address)
  * `user_id` (UUID, foreign key to users table)
  * `name` (String, e.g., "Main Panel")
* **Update `readings` Table:**
  * Add a `device_id` column (UUID, foreign key to devices table) so every reading is explicitly linked to a piece of hardware.

## 2. Backend API Changes (`server.js`)
* **Data Ingestion (`POST /api/data`):**
  * Extract the `device_key` from the incoming JSON.
  * Look up the `device_id` in the `devices` table using that key.
  * Insert the new reading into the `readings` table alongside the `device_id`.
* **Data Fetching (`GET /api/latest` & `GET /api/history`):**
  * Validate the user's JWT token.
  * Only return readings where the `device_id` belongs to the logged-in `user_id`.

## 3. Frontend & Auth Changes
* Remove the global `DEVICE_PIN` implementation.
* Add a "My Devices" settings page where users can input their physical device's `device_key` (MAC address) to link it to their account.
* Data on the dashboard should automatically filter based on the user's registered devices.

## 4. Hardware (Arduino / ESP32) Changes
The C++ code on the microcontroller must be updated to include a unique identifier in every HTTP POST request.

### Recommended Approach: Use ESP32 MAC Address
Instead of hardcoding a unique key per board, use the ESP32's built-in, permanently unique MAC address. This allows you to flash the exact same code to every board you manufacture.

```cpp
#include <WiFi.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>

// Automatically gets a unique string like "24:6F:28:AB:CD:EF"
String getDeviceKey() {
  return WiFi.macAddress(); 
}

void sendDataToServer(float v, float c, float p, float e, float f, float pf) {
  // 1. Create JSON document
  StaticJsonDocument<200> doc;
  
  // 2. Add the unique device key to the payload
  doc["device_key"] = getDeviceKey(); 
  
  // 3. Add the sensor readings
  doc["voltage"] = v;
  doc["current"] = c;
  doc["power"] = p;
  doc["energy"] = e;
  doc["frequency"] = f;
  doc["pf"] = pf;

  // 4. Serialize JSON into a string
  String requestBody;
  serializeJson(doc, requestBody);

  // 5. Send via HTTP POST
  HTTPClient http;
  http.begin("http://dashboard.gannonknight.xyz/api/data"); // Your backend URL
  http.addHeader("Content-Type", "application/json");
  
  int httpResponseCode = http.POST(requestBody);
  
  if (httpResponseCode > 0) {
    Serial.printf("Data sent successfully. Response code: %d\n", httpResponseCode);
  } else {
    Serial.printf("Error sending data: %s\n", http.errorToString(httpResponseCode).c_str());
  }
  
  http.end();
}
```
