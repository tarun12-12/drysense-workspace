/*
  DrySense — ESP32 Climate Controller + Cloud Telemetry
  ─────────────────────────────────────────────────────────────
  One board does two jobs:

  1. LOCAL CONTROL (from the original controller sketch):
     • Fan 1 relay: ON when temperature ≥ 30 °C threshold
     • Bulb relay : inverse of Fan 1 (heater when fans idle)
     • Fan 2 relay: fixed duty cycle — 30 s ON / 15 s OFF
     • 16x2 I2C LCD (addr 0x27) shows temp + relay states

  2. CLOUD TELEMETRY (DrySense app):
     • Pushes DHT11 readings over WiFi every PUSH_INTERVAL_MS to the
       DrySense backend → MongoDB → the app's Sensors tab graph/history.

  All loops are non-blocking (millis() timers), so relay control keeps
  running even while the network is down.

  Arduino IDE setup:
    • Board      : "ESP32 Dev Module"
    • Libraries  : "DHT sensor library" (Adafruit) + "LiquidCrystal_I2C" (Frank de Brabander)
    • Fill in the WIFI / SERVER config block below.
*/

#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>

// ── CONFIG — edit these ──────────────────────────────────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_NAME";          // your 2.4 GHz WiFi network
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";       // your WiFi password
const char* SERVER_HOST   = "http://192.168.1.4:4000"; // backend: http://<PC-IP>:4000
const char* DEVICE_ID     = "esp32-01";                // unique id for this sensor
// ────────────────────────────────────────────────────────────────────────────

// ── Pin definitions (controller wiring) ──────────────────────────────────────
const int dhtPin        = 13;  // DHT11 data pin
const int fan1RelayPin  = 32;  // Fan 1 relay (temp controlled ≥ 30 °C)
const int fan2RelayPin  = 33;  // Fan 2 relay (timed cycle 30 s ON / 15 s OFF)
const int bulbRelayPin  = 25;  // Bulb relay (inverse of Fan 1)
const int statusLedPin  = 2;   // onboard LED: WiFi/HTTP status
#define DHTTYPE DHT11

// ── LCD / I2C ────────────────────────────────────────────────────────────────
// LCD address 0x27, 16 chars, 2 lines. I2C on custom pins (SDA=26, SCL=27).
LiquidCrystal_I2C lcd(0x27, 16, 2);

// ── Relay / threshold constants ──────────────────────────────────────────────
// Assuming active-LOW relays: HIGH = OFF, LOW = ON
const float tempThreshold = 30.0;

// Fan 2 timed cycle
const unsigned long fanOnDuration  = 30UL * 1000UL;  // 30 s ON
const unsigned long fanOffDuration = 15UL * 1000UL;  // 15 s OFF
unsigned long previousMillis = 0;
bool fan2State = false;                              // false = OFF, true = ON

// ── Cadences (ms) ────────────────────────────────────────────────────────────
const unsigned long SENSOR_INTERVAL_MS = 2000;   // read DHT11 every 2 s (DHT11 needs ~1 s between reads)
const unsigned long LCD_INTERVAL_MS    = 1000;   // refresh LCD every 1 s
const unsigned long PUSH_INTERVAL_MS   = 10000;  // push a reading to the backend every 10 s
const unsigned long WIFI_RETRY_MS      = 15000;  // attempt WiFi reconnects every 15 s

DHT dht(dhtPin, DHTTYPE);

// Latest good sensor values (persisted across failed reads so the push
// timer can still send a recent, sane reading). ctrlTempC is never
// NAN-cleared — relay control keeps its last-known temperature, matching
// the original sketch's behaviour on failed reads.
float lastTempC = NAN;      // good-for-display / push
float lastHum   = NAN;
float ctrlTempC = 0.0;      // last known-good temp driving the relays
bool  fan1Active = false;
unsigned long lastSensorRead = 0;
unsigned long lastLcdUpdate  = 0;
unsigned long lastPush       = 0;
unsigned long lastWifiTry    = 0;
bool lcdErrorShown = false;

// ── WiFi ─────────────────────────────────────────────────────────────────────
void connectWiFi() {
  Serial.printf("[wifi] connecting to \"%s\"", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  // Blocking here only happens at boot / after long outages; retries are
  // non-blocking from loop() afterwards.
  unsigned long started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < 10000) {
    delay(250);
    Serial.print('.');
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[wifi] connected — IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("[wifi] not connected — control logic keeps running");
  }
}

void wifiKeepAlive() {
  if (WiFi.status() != WL_CONNECTED && millis() - lastWifiTry >= WIFI_RETRY_MS) {
    lastWifiTry = millis();
    connectWiFi();
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

  http.setConnectTimeout(3000);  // never block the relay logic on the network
  http.setTimeout(3000);
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

// ── LCD helpers ──────────────────────────────────────────────────────────────
void showBootScreen(const char* line1, const char* line2, int delayMs) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1);
  lcd.setCursor(0, 1);
  lcd.print(line2);
  delay(delayMs);
  lcd.clear();
}

void renderLcd(float tempC, bool fan1Active) {
  if (!isnan(tempC)) {
    // Line 1: Temp & Fan 1 Status
    lcd.setCursor(0, 0);
    lcd.print("T:");
    lcd.print(tempC, 1);
    lcd.print((char)223);  // °
    lcd.print("C F1:");
    lcd.print(fan1Active ? "ON " : "OFF");

    // Line 2: Fan 2 & Bulb Status
    lcd.setCursor(0, 1);
    lcd.print("F2:");
    lcd.print(fan2State ? "ON " : "OFF");
    lcd.print(" Bulb:");
    lcd.print(fan1Active ? "OFF" : "ON ");
    lcdErrorShown = false;
  } else if (!lcdErrorShown) {
    // Only paint the error screen once per failure streak (no LCD flicker)
    lcd.setCursor(0, 0);
    lcd.print("Sensor Error!   ");
    lcd.setCursor(0, 1);
    lcd.print("Check Wiring    ");
    lcdErrorShown = true;
    return;  // cursor is at line 1 end; nothing more to draw
  }

  // Trailing overwrite in case a previous longer message remains
  lcd.setCursor(15, 0);
  lcd.print(' ');
  lcd.setCursor(15, 1);
  lcd.print(' ');
}

// ── Setup / loop ─────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);

  // Relays — start everything OFF (active-LOW)
  pinMode(fan1RelayPin, OUTPUT);
  pinMode(fan2RelayPin, OUTPUT);
  pinMode(bulbRelayPin, OUTPUT);
  digitalWrite(fan1RelayPin, HIGH);
  digitalWrite(fan2RelayPin, HIGH);
  digitalWrite(bulbRelayPin, HIGH);
  pinMode(statusLedPin, OUTPUT);

  // I2C with custom SDA (26) / SCL (27) pins
  Wire.begin(26, 27);

  lcd.init();
  lcd.backlight();
  dht.begin();

  showBootScreen("Climate Monitor", "System Ready", 2000);

  connectWiFi();
  showBootScreen("WiFi OK", WiFi.localIP().toString().c_str(), 1500);
}

void loop() {
  const unsigned long currentMillis = millis();

  wifiKeepAlive();

  // ── FAN 2 TIMED LOGIC (30 s ON / 15 s OFF) ────────────────────────────────
  if (fan2State) {
    if (currentMillis - previousMillis >= fanOnDuration) {
      fan2State = false;
      previousMillis = currentMillis;
      digitalWrite(fan2RelayPin, HIGH);          // Fan 2 OFF (active-LOW)
    }
  } else {
    if (currentMillis - previousMillis >= fanOffDuration) {
      fan2State = true;
      previousMillis = currentMillis;
      digitalWrite(fan2RelayPin, LOW);           // Fan 2 ON (active-LOW)
    }
  }

  // ── SENSOR READING ────────────────────────────────────────────────────────
  if (currentMillis - lastSensorRead >= SENSOR_INTERVAL_MS) {
    lastSensorRead = currentMillis;

    // DHT11 needs ~1 s between reads; NaN means a failed read — retry once
    float tempC = dht.readTemperature();
    float hum = dht.readHumidity();
    if (isnan(tempC) || isnan(hum)) {
      delay(1500);
      tempC = dht.readTemperature();
      hum = dht.readHumidity();
    }

    if (isnan(tempC) || isnan(hum)) {
      Serial.println("[dht] read failed — LCD shows error, relays keep last state");
      lastTempC = NAN;
      lastHum = NAN;
    } else {
      ctrlTempC = tempC;  // control keeps the last known-good temperature
      lastTempC = tempC;
      lastHum = hum;
      Serial.printf("[dht] T: %.1f°C  H: %.1f%%  F1: %s  Bulb: %s  F2: %s\n",
                    tempC, hum,
                    tempC >= tempThreshold ? "ON" : "OFF",
                    tempC >= tempThreshold ? "OFF" : "ON",
                    fan2State ? "ON" : "OFF");
    }

    // ── FAN 1 / BULB LOCK-STEP LOGIC (threshold 30 °C) ──────────────────────
    fan1Active = (ctrlTempC >= tempThreshold);
    if (fan1Active) {
      digitalWrite(fan1RelayPin, LOW);           // Fan 1 ON
      digitalWrite(bulbRelayPin, HIGH);          // Bulb OFF (inverse)
    } else {
      digitalWrite(fan1RelayPin, HIGH);          // Fan 1 OFF
      digitalWrite(bulbRelayPin, LOW);           // Bulb ON (inverse)
    }
  }

  // ── LCD REFRESH ───────────────────────────────────────────────────────────
  if (currentMillis - lastLcdUpdate >= LCD_INTERVAL_MS) {
    lastLcdUpdate = currentMillis;
    renderLcd(lastTempC, fan1Active);
  }

  // ── CLOUD PUSH (every 10 s with the latest good reading) ───────────────────
  if (!isnan(lastTempC) && !isnan(lastHum) && currentMillis - lastPush >= PUSH_INTERVAL_MS) {
    lastPush = currentMillis;
    bool ok = postReading(lastTempC, lastHum);
    digitalWrite(statusLedPin, ok ? HIGH : LOW);  // LED solid = backend reachable
  }

  delay(10);  // small idle slice; all timing is millis()-based
}
