# ESP32 climate controller + DHT11 telemetry

Firmware for the DrySense dehydrator. One ESP32 does two jobs:

**Local control** (runs even without WiFi):
- **Fan 1** relay ON when temperature ≥ 30 °C, **bulb** relay inverse (heater while fans idle)
- **Fan 2** relay on a fixed duty cycle: 30 s ON / 15 s OFF
- 16×2 I²C LCD shows temperature + live relay states

**Cloud telemetry** (DrySense app):
- Pushes temperature & humidity to the backend every 10 seconds
- Data flow: `DHT11 → ESP32 → POST /api/sensor/data → MongoDB → Sensors tab graph/history`

All timing is non-blocking (`millis()` timers), so relay control and the LCD keep
running even when the network is down.

## Wiring (DHT11 and relays → ESP32)

| Device            | ESP32 pin |
|-------------------|-----------|
| DHT11 VCC         | 3V3       |
| DHT11 DATA (S)    | GPIO 13   |
| DHT11 GND         | GND       |
| Fan 1 relay IN    | GPIO 32   |
| Fan 2 relay IN    | GPIO 33   |
| Bulb relay IN     | GPIO 25   |
| LCD SDA           | GPIO 26   |
| LCD SCL           | GPIO 27   |

- Relays are assumed **active-LOW** (HIGH = OFF): adjust `digitalWrite()` polarity
  in the sketch if your relay module is active-HIGH.
- Use a 4.7 kΩ–10 kΩ pull-up between DHT11 DATA and VCC if your breakout doesn't
  already have one (most 3-pin modules do).
- WiFi must be a **2.4 GHz** network — ESP32 does not support 5 GHz.
- LCD I²C address assumed `0x27`; run an I2C scanner if nothing shows.

## Build & flash (Arduino IDE)

1. Boards Manager: install **esp32** by Espressif, select **ESP32 Dev Module**.
2. Library Manager: install **DHT sensor library** (Adafruit, accepts installing
   `Adafruit Unified Sensor`) and **LiquidCrystal_I2C** (Frank de Brabander).
3. Open `dht11_drysense/dht11_drysense.ino` and edit the CONFIG block:
   - `WIFI_SSID` / `WIFI_PASSWORD` — your network
   - `SERVER_HOST` — `http://<IP-of-the-machine-running-the-backend>:4000`
     (find it with `ipconfig` on Windows)
   - `DEVICE_ID` — short unique id, default `esp32-01`; the app's Sensors tab
     reads data for this id (it auto-detects devices that report data).
4. Plug the ESP32 in (USB), pick the COM port, hit **Upload**.
5. Serial Monitor at **115200 baud** shows WiFi status, every pushed reading and
   errors. The onboard LED (GPIO 2) is solid while readings reach the backend.

## Backend requirements

The backend must have `backend/.env` configured with `MONGO_URL` and started with
`npm run backend` from the workspace root (or `node server.js` in `backend/`).

Sensor data lives in the `sensor_readings` collection; one document per reading:

```json
{ "deviceId": "esp32-01", "temperature": 28.6, "humidity": 68.3, "recordedAt": "2026-10-24T02:11:47.523Z" }
```
