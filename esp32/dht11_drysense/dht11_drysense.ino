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
const char* WIFI_SSID     = "YOUR_WIFI_NAME";       // your 2.4 GHz WiFi network
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";       // your WiFi password
const char* SERVER_HOST   = "http://<PC-IP>:4000"; // backend: http://<PC-IP>:4000
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
// Relay polarity: true  = LOW signal turns the relay ON (most blue Songle
//                        modules, define as-is if fans are inverted)
//                 false = HIGH signal turns the relay ON (some modules)
#define RELAY_ACTIVE_LOW true

void relayWrite(int pin, bool on) {
  digitalWrite(pin, on ? (RELAY_ACTIVE_LOW ? LOW : HIGH) : (RELAY_ACTIVE_LOW ? HIGH : LOW));
}

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
const unsigned long COMMAND_POLL_MS    = 5000;   // poll Start/Stop command from the backend every 5 s
const unsigned long PUSH_INTERVAL_MS   = 10000;  // push a reading to the backend every 10 s
const unsigned long WIFI_RETRY_MS      = 15000;  // attempt WiFi reconnects every 15 s

DHT dht(dhtPin, DHTTYPE);

// Session gate: the control loop + telemetry only run while a session is
// active in the DrySense app (start/stopped via the Start/Stop buttons).
bool sessionRunning = false;
String sessionProduct = "";
unsigned long lastCommandPoll = 0;

// Latest good sensor values (persisted across failed reads so the push
// timer can still send a recent, sane reading). ctrlTempC is never
// NAN-cleared — relay control keeps its last-known temperature, matching
// the original sketch's behaviour on failed reads.
float lastTempC = NAN;      // good-for-display / push
float lastHum   = NAN;
float ctrlTempC = 0.0;      // last known-good temp driving the relays
bool  fan1Active = false;
bool  readingReady = false; // true once a fresh read arrived this session
unsigned long lastSensorRead = 0;
unsigned long lastLcdUpdate  = 0;
unsigned long lastPush       = 0;
unsigned long lastWifiTry    = 0;
bool lcdErrorShown = false;

// ── LED helpers (1 blink = one event) ────────────────────────────────────────
void blink(int times, int onMs = 120) {
  for (int i = 0; i < times; i++) {
    digitalWrite(statusLedPin, HIGH);
    delay(onMs);
    digitalWrite(statusLedPin, LOW);
    delay(onMs);
  }
}

// ── WiFi ─────────────────────────────────────────────────────────────────────
void connectWiFi() {
  Serial.printf("[wifi] connecting to \"%s\"", WIFI_SSID);

  // Reset any half-finished connection state first. Without this, repeated
  // begin() calls while the station is still "connecting" are rejected with
  // "wifi:sta is connecting, cannot set config" and never complete.
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.disconnect(false);
  delay(200);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  // Blocking here only happens at boot / after long outages; retries are
  // non-blocking from loop() afterwards.
  unsigned long started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < 12000) {
    delay(250);
    Serial.print('.');
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[wifi] connected — IP: %s\n", WiFi.localIP().toString().c_str());
    lastWifiTry = millis();
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

// ── Poll the Start/Stop command from the backend ─────────────────────────────
// GET /api/device/command → { "running": true|false, "product": "..." }
void pollCommand() {
  if (WiFi.status() != WL_CONNECTED) return;
  // First poll fires immediately after boot; afterwards every COMMAND_POLL_MS
  if (lastCommandPoll != 0 && millis() - lastCommandPoll < COMMAND_POLL_MS) return;
  lastCommandPoll = millis();

  HTTPClient http;
  http.setConnectTimeout(3000);
  http.setTimeout(3000);
  http.begin(String(SERVER_HOST) + "/api/device/command");
  int code = http.GET();
  String body = (code >= 200 && code < 300) ? http.getString() : "";
  http.end();

  if (code < 200 || code >= 300) {
    Serial.printf("[cmd] poll failed — HTTP %d (control state kept)\n", code);
    return;  // failed polls never change the running state
  }

  // Lightweight parse (avoids a JSON library dependency)
  bool runningNow = body.indexOf("\"running\":true") >= 0;
  String productNow = "";
  if (runningNow) {
    int p = body.indexOf("\"product\":\"");
    if (p >= 0) {
      int s = p + 11;
      productNow = body.substring(s, body.indexOf('"', s));
    }
  }

  if (runningNow != sessionRunning) {
    sessionRunning = runningNow;
    sessionProduct = productNow;
    if (sessionRunning) {
      // Start pressed: read + push immediately, begin fan-2 cycle fresh
      previousMillis = millis();
      lastSensorRead = 0;
      lastLcdUpdate = 0;
      lastPush = 0;
      readingReady = false;
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print(sessionProduct.length() ? String("Dry: ") + sessionProduct : String("Drying started"));
      lcd.setCursor(0, 1);
      lcd.print("Running...");
      Serial.println("[cmd] START received — control loop running");
      blink(1);
    } else {
      // Stop pressed: everything off, fan-2 cycle reset
      fan2State = false;
      previousMillis = millis();
      relayWrite(fan1RelayPin, false);    // Fan 1 OFF
      relayWrite(fan2RelayPin, false);    // Fan 2 OFF
      relayWrite(bulbRelayPin, false);    // Bulb OFF
      digitalWrite(statusLedPin, LOW);
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("System Stopped");
      lcd.setCursor(0, 1);
      lcd.print("Start in app");
      Serial.println("[cmd] STOP received — relays off, telemetry paused");
      blink(1);
    }
  } else if (sessionRunning && productNow != sessionProduct && productNow.length()) {
    sessionProduct = productNow;
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

  // Relays — start everything OFF
  pinMode(fan1RelayPin, OUTPUT);
  pinMode(fan2RelayPin, OUTPUT);
  pinMode(bulbRelayPin, OUTPUT);
  relayWrite(fan1RelayPin, false);
  relayWrite(fan2RelayPin, false);
  relayWrite(bulbRelayPin, false);
  pinMode(statusLedPin, OUTPUT);

  // I2C with custom SDA (26) / SCL (27) pins
  Wire.begin(26, 27);

  lcd.init();
  lcd.backlight();
  dht.begin();

  showBootScreen("Climate Monitor", "System Ready", 2000);

  // Relay self-test: each relay clicks ON for 1.5 s, in order. Watch/hear this
  // to verify wiring. If a fan spins here but never during a session, it's the
  // polarity: set RELAY_ACTIVE_LOW to false. If it doesn't click even here,
  // check relay VCC/JD-VCC/GND wiring.
  relayWrite(fan1RelayPin, true);  showBootScreen("Self-test", "Fan 1 clicks", 1500);
  relayWrite(fan1RelayPin, false);
  relayWrite(fan2RelayPin, true);  showBootScreen("", "Fan 2 clicks now", 1500);
  relayWrite(fan2RelayPin, false);
  relayWrite(bulbRelayPin, true);  showBootScreen("", "Bulb clicks now", 1500);
  relayWrite(bulbRelayPin, false);
  lcd.clear();

  connectWiFi();
  showBootScreen("WiFi OK", WiFi.localIP().toString().c_str(), 1500);
}

void loop() {
  const unsigned long currentMillis = millis();

  wifiKeepAlive();
  pollCommand();

  // ── SESSION GATE: everything below only runs while session is active ──────
  if (!sessionRunning) {
    delay(10);   // stopped: relays are OFF (forced at STOP transition)
    return;
  }

  // ── FAN 2 TIMED LOGIC (30 s ON / 15 s OFF) ────────────────────────────────
  if (fan2State) {
    if (currentMillis - previousMillis >= fanOnDuration) {
      fan2State = false;
      previousMillis = currentMillis;
      relayWrite(fan2RelayPin, false);           // Fan 2 OFF
    }
  } else {
    if (currentMillis - previousMillis >= fanOffDuration) {
      fan2State = true;
      previousMillis = currentMillis;
      relayWrite(fan2RelayPin, true);            // Fan 2 ON
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
      readingReady = true;
      Serial.printf("[dht] T: %.1f°C  H: %.1f%%  F1: %s  Bulb: %s  F2: %s\n",
                    tempC, hum,
                    tempC >= tempThreshold ? "ON" : "OFF",
                    tempC >= tempThreshold ? "OFF" : "ON",
                    fan2State ? "ON" : "OFF");
    }

    // ── FAN 1 / BULB LOCK-STEP LOGIC (threshold 30 °C) ──────────────────────
    fan1Active = (ctrlTempC >= tempThreshold);
    if (fan1Active) {
      relayWrite(fan1RelayPin, true);              // Fan 1 ON
      relayWrite(bulbRelayPin, false);             // Bulb OFF (inverse)
    } else {
      relayWrite(fan1RelayPin, false);             // Fan 1 OFF
      relayWrite(bulbRelayPin, true);              // Bulb ON (inverse)
    }
  }

  // ── LCD REFRESH ───────────────────────────────────────────────────────────
  if (currentMillis - lastLcdUpdate >= LCD_INTERVAL_MS) {
    lastLcdUpdate = currentMillis;
    renderLcd(lastTempC, fan1Active);
  }

  // ── CLOUD PUSH (every 10 s with the latest good reading) ───────────────────
  if (readingReady && currentMillis - lastPush >= PUSH_INTERVAL_MS) {
    lastPush = currentMillis;
    bool ok = postReading(lastTempC, lastHum);
    digitalWrite(statusLedPin, ok ? HIGH : LOW);  // LED solid = backend reachable
  }

  delay(10);  // small idle slice; all timing is millis()-based
}
