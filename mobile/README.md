# EmergencyAI Mobile Client

Cross-platform Expo React Native client supporting Patient/Reporter and Ambulance Driver roles, integrated with real-time location coordinate updates, FastAPI AI Severity predictions, and Medical ID QR scanning.

## Tech Stack
- **Framework**: Expo SDK 52 (React Native)
- **Navigation**: Expo Router v4
- **State Management**: Zustand
- **Real-Time Sockets**: Socket.IO Client
- **Map / Geolocation**: `react-native-maps`, `expo-location`
- **Triage QR Scanner**: `expo-camera`, `react-native-qrcode-svg`
- **Aesthetics**: Harmony dark mode with red glow themes, custom alert overlays

## Getting Started

### 1. Install Dependencies
Ensure you have Node 18+ and install packages:
```bash
cd mobile
npm install
```

### 2. Start the App
Run Expo start:
```bash
npm start
```

Press `a` for Android emulator or `i` for iOS simulator.

### 3. Setup Emulator Routing
- **Android Emulator**: Connecting to the local Node backend via `http://10.0.2.2:5000` is automatically pre-configured.
- **iOS Simulator / Physical Device**: Pre-configured to point to `localhost:5000`. If using a physical device, update the IP address inside `services/api.ts` and `services/socket.ts` to your machine's local LAN IP (e.g., `http://192.168.1.50:5000`).

## Key Features Built
1. **SOS Dashboard**: Animated pulsing button that captures coordinates, reverse geocodes the address, and asks for details to query FastAPI.
2. **AI Triage Overlay**: Instant glassmorphic prediction details (severity level, confidence, and action items).
3. **Live GPS Tracker**: Shows en-route ambulance icon moving dynamically using real-time socket coordinate changes.
4. **First Aid Audio Hub**: Voice guides for CPR, burns, and other emergencies (uses browser/system speech synthesis).
5. **Medical QR Generator**: Encodes blood group, allergies, and contact records into standard QR matrices.
6. **Paramedic scanner**: Utilizes the device camera to decode QR medical profiles in the field with mock testing shortcuts.
