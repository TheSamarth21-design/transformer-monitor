# Transformer Monitor

Real-time transformer condition monitoring app: Voltage, Current, Temperature,
Humidity, Location, automatic tripping Relay, and Alerts — driven by an
ESP32 sensor node. Built with React 19 + Vite + TypeScript + Tailwind CSS,
using the design tokens from your Stitch mockups (light + dark mode).

## Run it

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173). Everything works
immediately with mock data — no backend required to try the UI.

```bash
npm run build      # production build -> dist/
npm run preview    # preview the production build locally
```

## What's already wired up

- **Routing** — `/`, `/live-monitoring`, `/relay-control`, `/analytics`,
  `/location`, `/alerts`, `/reports`, `/settings`, `/login`, `/sign-up`
- **Light/dark theme** — toggle in the top bar, persists in localStorage,
  uses the exact color tokens from your Stitch export (`src/index.css`)
- **Sidebar + top bar layout** shared across all authenticated pages
- **Charts** — Recharts, used on the Analytics page
- **Mock data layer** — `src/hooks/useSensorData.ts` generates realistic
  fake readings so every screen is fully functional right now

## Connecting real hardware and services

Everything fake lives in **one file**: `src/hooks/useSensorData.ts`. Each
exported hook (`useLiveReading`, `useDevice`, `useRelayStatus`,
`useRelayEvents`, `useAlerts`, `useHistory`) returns the same shape the
pages already expect — swap the implementation, not the pages.

### 1. ESP32 → Blynk Cloud → live readings

```ts
// replace the body of useLiveReading()
useEffect(() => {
  const id = setInterval(async () => {
    const res = await fetch(
      `https://blynk.cloud/external/api/get?token=${BLYNK_TOKEN}&v0&v1&v2&v3`
    );
    const [voltage, current, temperature, humidity] = await res.json();
    setReading({ voltage, current, temperature, humidity, timestamp: new Date().toISOString() });
  }, 2000);
  return () => clearInterval(id);
}, []);
```

Put your Blynk auth token in a `.env` file (never commit it):
```
VITE_BLYNK_TOKEN=your_token_here
```
and read it with `import.meta.env.VITE_BLYNK_TOKEN`.

### 2. Firebase — alerts, maintenance logs, history, auth

```bash
npm install firebase
```

Create `src/lib/firebase.ts`:
```ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  // ...rest of your Firebase config
});

export const db = getFirestore(app);
export const auth = getAuth(app);
```

Then in `useAlerts()`, replace the static array with a Firestore listener:
```ts
import { onSnapshot, collection, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useAlerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  useEffect(() => {
    const q = query(collection(db, "alerts"), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snap) => {
      setAlerts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AlertItem)));
    });
  }, []);
  return alerts;
}
```

Wire real login into `src/pages/Login.tsx` and `SignUp.tsx` with
`signInWithEmailAndPassword` / `createUserWithEmailAndPassword` from
`firebase/auth`, and gate the routes in `App.tsx` behind an auth check once
that's in place.

### 3. Google Maps — Location page

In `src/pages/Location.tsx`, replace the placeholder grid `div` with:
```tsx
<iframe
  className="w-full h-full"
  loading="lazy"
  src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&q=${device.lat},${device.lng}`}
/>
```

### 4. Relay control commands

`src/pages/RelayControl.tsx` currently only has UI state for the auto-trip
switch. To actually send a manual trip/reset command to the ESP32, call the
Blynk write endpoint from the button's `onClick`:
```ts
await fetch(`https://blynk.cloud/external/api/update?token=${BLYNK_TOKEN}&v4=1`);
```
(pick whichever virtual pin your ESP32 firmware listens on for the relay
command).

## Project structure

```
src/
  components/     Sidebar, Topbar, StatusBadge, MetricTile
  layouts/        AppLayout (sidebar + topbar + page outlet)
  pages/          One file per screen
  hooks/          useTheme, useSensorData (mock data / real API layer)
  lib/            types.ts (domain model), utils.ts (cn helper)
  index.css       Design tokens (light + dark CSS variables)
tailwind.config.js  Maps Tailwind color classes to the CSS variables above
```

## Design tokens

Colors, type scale, spacing, and radii all come directly from your Stitch
export's `DESIGN.md` files ("Industrial Precision Management"). If you
export more screens from Stitch later and want to add a new page, reuse the
existing `MetricTile`, `StatusBadge`, and table patterns already in
`src/pages/*` rather than pasting Stitch's raw HTML — that's what keeps
every screen visually consistent.
