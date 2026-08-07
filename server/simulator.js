import http from "node:http";

const BACKEND_URL = "http://localhost:5000/api/telemetry";

let currentReading = {
  voltage: 231,
  current: 42,
  temperature: 58,
  humidity: 46,
};

function randomWalk(base, spread) {
  return +(base + (Math.random() - 0.5) * spread).toFixed(1);
}

function sendTelemetry() {
  currentReading = {
    voltage: randomWalk(currentReading.voltage, 2),
    current: randomWalk(currentReading.current, 3),
    temperature: Math.min(95, randomWalk(currentReading.temperature, 1.5)),
    humidity: randomWalk(currentReading.humidity, 2),
    timestamp: new Date().toISOString(),
  };

  const payload = JSON.stringify(currentReading);

  const req = http.request(
    BACKEND_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    },
    (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.protectionResult?.trippedNow) {
            console.log(`⚡ [SIMULATOR] TRIP DETECTED! Reason: ${parsed.protectionResult.tripReason}`);
          } else {
            console.log(
              `[SIMULATOR -> API] Sent Telemetry: V=${currentReading.voltage}V, I=${currentReading.current}A, Temp=${currentReading.temperature}°C, Humidity=${currentReading.humidity}%`
            );
          }
        } catch {
          // Ignore
        }
      });
    }
  );

  req.on("error", (err) => {
    console.error("[SIMULATOR] Error posting telemetry:", err.message);
  });

  req.write(payload);
  req.end();
}

console.log("=================================================");
console.log(" Starting IoT Hardware Telemetry Simulator");
console.log(" Sending sensor readings to backend every 2s...");
console.log("=================================================");

setInterval(sendTelemetry, 2000);
