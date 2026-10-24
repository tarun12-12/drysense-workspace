/*
  DrySense — ESP32 + DHT11 sensor node
  ─────────────────────────────────────────────────────────────
  Reads temperature & humidity from a DHT11 sensor and pushes
  readings to the DrySense backend every SEND_INTERVAL_MS.

  Stored under:  POST {SERVER_HOST}/api/sensor/data
                 { "deviceId": "...", "temperature": 28.6, "humidity": 68.3 }

  Arduino IDE setup:
    • Board      : "ESP32 Dev Module" (via the esp32 boards package)
    • Libraries  : "DHT sensor library" by Adafruit (+ Adafruit Unified Sensor)
    • Fill in the three CONFIG values below.
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

// ── CONFIG — edit these ──────────────────────────────────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_NAME";          // your 2.4 GHz WiFi network
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";       // your WiFi password
const char* SERVER_HOST   = "http://192.168.1.4:4000"; // backend: http://<PC-IP>:4000
const char* DEVICE_ID     = "esp32-01";                // unique id for this sensor
// ────────────────────────────────────────────────────────────────────────────

// ── Pin & timing configuration ───────────────────────────────────────────────
#define DHT_PIN           4        // DHT11 data pin (any GPIO works)
#define DHT_TYPE          DHT11
#define STATUS_LED        2        // onboard LED on most ESP32 dev boards
#define SEND_INTERVAL_MS  10000UL  // push a reading every 10 s
#define WIFI_TIMEOUT_MS   20000UL  // give up connecting after 20 s, then retry

DHT dht(DHT_PIN, DHT_TYPE);
unsigned long lastSend = 0;

// ── LED helpers (1 blink = one failed step) ─────────────────────────────────
void blink(int times, int onMs = 120) {
  for (int i = 0; i < times; i++) {
    digitalWrite(STATUS_LED, HIGH);
    delay(onMs);
    digitalWrite(STATUS_LED, LOW);
    delay(onMs);
  }
}

// ── WiFi ─────────────────────────────────────────────────────────────────────
void connectWiFi() {
  Serial.printf("[wifi] connecting to \"%s\"", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < WIFI_TIMEOUT_MS) {
    delay(250);
    Serial.print('.');
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[wifi] connected — IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("[wifi] could not connect — will retry before next send");
  }
}

// ── Push a single reading to the backend ─────────────────────────────────────
bool postReading(float temperature, float humidity) {
  HTTPClient http;
  String url = String(SERVER_HOST) + "/api/sensor/data";

  String payload = "{";
  payload += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  payload += "\"temperature\":" + String(temperature, 1) + ",";
  payload += "\"humidity\":" + String(humidity, 1);
  payload += "}";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(payload);
  http.end();

  if (code >= 200 && code < 300) {
    Serial.printf("[send] ok (%d) — %.1f°C  %.1f%%\n", code, temperature, humidity);
    return true;
  }
  Serial.printf("[send] failed — HTTP %d\n", code);
  return false;
}

// ── Setup / loop ─────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  pinMode(STATUS_LED, OUTPUT);
  dht.begin();

  connectWiFi();
  // 2 quick blinks on boot = device is up
  blink(2);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();

  if (millis() - lastSend >= SEND_INTERVAL_MS) {
    lastSend = millis();

    // DHT11 needs ~1 s between reads; NaN means a failed read — retry once
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();
    if (isnan(temperature) || isnan(humidity)) {
      delay(1500);
      temperature = dht.readTemperature();
      humidity = dht.readHumidity();
    }

    if (isnan(temperature) || isnan(humidity)) {
      // 3 blinks at send-time = sensor read failure (wiring / pin issue)
      blink(3);
      Serial.println("[dht] read failed — check the sensor wiring");
    } else {
      bool ok = postReading(temperature, humidity);
      digitalWrite(STATUS_LED, ok ? HIGH : LOW);  // LED solid=online, off=send failing
    }
  }

  delay(100);
}
