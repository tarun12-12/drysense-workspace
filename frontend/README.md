# DrySense — Cross-Platform Smart Solar Dehydrator

Cross-platform application built with **React Native** and **Expo (SDK 58)**, designed to run simultaneously as:
- **📱 Mobile App via Expo Go** (iOS & Android)
- **💻 Desktop & Mobile Web App** (React Native for Web)

---

## 🚀 How to Run

### 1. Run the Web App in your browser
From the root workspace directory or `frontend`:
```bash
npm run web
```
This opens the web app at `http://localhost:8081` in your browser.

### 2. Run on Mobile with Expo Go (iOS & Android)
Start the Expo development server:
```bash
npm start
```
1. Install **Expo Go** from the App Store (iOS) or Google Play Store (Android).
2. Scan the QR code displayed in the terminal:
   - **Android**: Scan with the Expo Go app.
   - **iOS**: Scan with the default Camera app and tap the Expo prompt.
3. Both your computer and phone should be on the same Wi-Fi network.

### 3. Run the Backend API Server
In a separate terminal:
```bash
npm run backend
```
Or:
```bash
cd backend
node server.js
```
The backend listens on `http://localhost:4000`.

---

## ⚙️ Connecting Expo Go on a Physical Phone to the Backend
When running inside **Expo Go** on a physical phone, `localhost` points to the phone itself.
To connect to your computer's backend:
1. Find your computer's local IP address (e.g. `192.168.1.100` via `ipconfig`).
2. In the DrySense app, go to the **Settings** tab.
3. Enter `http://192.168.1.100:4000/api` in the **Backend Server Connection** field.
4. Tap **Save & Ping**!
*(Note: If the backend is not reachable, the app automatically runs in interactive offline demo mode with complete simulation support!)*

---

## 🌟 Features Included

- **Unified Bottom Navigation Bar**: Consistent navigation across both Mobile (touch-optimized) and Web.
- **Dashboard**: Live chamber thermodynamic overview, 4 primary metric cards, real-time drying timer & progress bar, quick action controls, mini trend charts, recent history list.
- **New Drying Wizard**: Agricultural product presets (Mango, Banana, Turmeric, Groundnut, Rice, Wheat), moisture setpoints, batch weight, mass loss & duration calculation.
- **Live Monitoring**: Real-time sensor feed, continuous solar simulation toggle, manual sensor injection modal, pause/resume/stop/complete controls.
- **Process Analytics**: Multi-series SVG telemetry chart (Moisture, Temperature, Humidity, Biomass Weight), safe target baseline, latent heat calculation, CSV export.
- **Drying History**: Filterable batch logs, search by product or batch ID, detailed telemetry dossier modal.
- **Hardware Settings & Calibration**: Tare load cell calibration, temperature & humidity sensor offsets, polling rate adjustment, high-temp safety alarm.
