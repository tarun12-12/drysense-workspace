# ESP32 + DHT11 sensor node

Firmware for the DrySense dehydrator: an ESP32 reads temperature & humidity from a
DHT11 sensor and pushes them over WiFi to the backend every 10 seconds.

Data flow:  `DHT11 → ESP32 → POST /api/sensor/data → MongoDB → DrySense app (Sensors tab)`

## Wiring (DHT11 → ESP32)

| DHT11 pin | ESP32 pin                        |
|-----------|----------------------------------|
| VCC (+)   | 3V3                              |
| DATA (S)  | GPIO 4 (any free GPIO works)     |
| GND (–)   | GND                              |

• Use a 4.7 kΩ–10 kΩ pull-up resistor between DATA and VCC if your DHT11 breakout
  doesn't already have one (most 3-pin modules do).
• WiFi must be a **2.4 GHz** network — ESP32 does not support 5 GHz.

## Build & flash (Arduino IDE)

1. Install the **esp32** board package (Boards Manager → `esp32` by Espressif).
2. Select the board: **ESP32 Dev Module**.
3. Library Manager: install **DHT sensor library** (Adafruit) — accept installing
   `Adafruit Unified Sensor` when prompted.
4. Open `dht11_drysense/dht11_drysense.ino` and edit the CONFIG block:
   - `WIFI_SSID` / `WIFI_PASSWORD` — your network
   - `SERVER_HOST` — `http://<IP-of-the-machine-running-the-backend>:4000`
     (find it with `ipconfig` on Windows; the phone/app and ESP32 don't need to
      be on the same subnet, only the ESP32 must be able to reach the backend)
   - `DEVICE_ID` — any short unique id, default `esp32-01`. The app's Sensors
     tab reads data for this id.
5. Plug the ESP32 in (USB), pick the COM port, hit **Upload**.
6. Serial Monitor at **115200 baud** shows: WiFi status, each pushed reading, and
   errors. The onboard LED is solid while readings reach the backend.

## Backend requirements

The backend must have `backend/.env` configured with `MONGO_URL` and be started
with `npm run backend` from the workspace root (or `node server.js` in `backend/`).

Sensor data lives in the `sensor_readings` collection; one document per reading:

```json
{ "deviceId": "esp32-01", "temperature": 28.6, "humidity": 68.3, "recordedAt": "2026-10-24T02:11:47.523Z" }
```
