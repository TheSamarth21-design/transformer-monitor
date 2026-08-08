import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Cpu, Activity, RotateCcw } from "lucide-react";
import { useLiveReading } from "@/hooks/useSensorData";

export function DigitalTwin3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const liveReading = useLiveReading();

  const [selectedPart, setSelectedPart] = useState<{
    name: string;
    description: string;
    metrics: string;
    status: "normal" | "warning" | "critical";
  }>({
    name: "Transformer Main Core & Oil Tank",
    description: "Primary magnetic core housing and dielectric cooling oil reservoir.",
    metrics: `Temp: ${liveReading.temperature.toFixed(1)}°C | Health: ${liveReading.healthScore || 95}%`,
    status: liveReading.temperature > 60 ? "warning" : "normal",
  });

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight || 360;

    // 1. Scene, Camera, Renderer Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Dark slate background

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(5, 4, 7);
    camera.lookAt(0, 0.5, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    mountRef.current.innerHTML = "";
    mountRef.current.appendChild(renderer.domElement);

    // 2. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(6, 10, 8);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x38bdf8, 1.5, 10);
    pointLight.position.set(0, 3, 0);
    scene.add(pointLight);

    // 3. Grid Floor Platform
    const gridHelper = new THREE.GridHelper(10, 20, 0x0284c7, 0x334155);
    gridHelper.position.y = -1;
    scene.add(gridHelper);

    // 4. TRANSFORMER DIGITAL TWIN MESH GROUP
    const transformerGroup = new THREE.Group();

    // A. Main Transformer Tank
    const tempColor =
      liveReading.temperature > 70
        ? 0xef4444
        : liveReading.temperature > 55
        ? 0xf97316
        : 0x0284c7;

    const tankGeo = new THREE.BoxGeometry(2.4, 1.8, 1.6);
    const tankMat = new THREE.MeshStandardMaterial({
      color: tempColor,
      roughness: 0.3,
      metalness: 0.7,
    });
    const tankMesh = new THREE.Mesh(tankGeo, tankMat);
    tankMesh.position.y = 0;
    tankMesh.userData = {
      name: "Transformer Main Core & Oil Tank",
      description: "Primary magnetic core housing and dielectric cooling oil reservoir.",
      type: "tank",
    };
    transformerGroup.add(tankMesh);

    // B. High-Voltage Bushings (3 Top Conductors)
    const bushingMat = new THREE.MeshStandardMaterial({
      color: liveReading.voltage > 100 ? 0x38bdf8 : 0x64748b,
      roughness: 0.2,
      metalness: 0.8,
      emissive: liveReading.voltage > 100 ? 0x0284c7 : 0x000000,
      emissiveIntensity: 0.4,
    });

    for (let i = -0.7; i <= 0.7; i += 0.7) {
      const bushingGeo = new THREE.CylinderGeometry(0.12, 0.16, 1.0, 16);
      const bushingMesh = new THREE.Mesh(bushingGeo, bushingMat);
      bushingMesh.position.set(i, 1.4, 0);
      bushingMesh.userData = {
        name: `Primary HV Bushing (Phase ${i < 0 ? "A" : i === 0 ? "B" : "C"})`,
        description: "High-voltage ceramic insulator connecting grid input power.",
        type: "bushing",
      };
      transformerGroup.add(bushingMesh);

      // Top Terminal Caps
      const capGeo = new THREE.SphereGeometry(0.14, 16, 16);
      const capMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9 });
      const capMesh = new THREE.Mesh(capGeo, capMat);
      capMesh.position.set(i, 1.95, 0);
      transformerGroup.add(capMesh);
    }

    // C. Cooling Radiator Fins (Left & Right)
    const finMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6 });
    for (let side = -1.35; side <= 1.35; side += 2.7) {
      for (let z = -0.5; z <= 0.5; z += 0.35) {
        const finGeo = new THREE.BoxGeometry(0.1, 1.4, 0.2);
        const finMesh = new THREE.Mesh(finGeo, finMat);
        finMesh.position.set(side, 0, z);
        finMesh.userData = {
          name: "Cooling Radiator Fin Array",
          description: "Passive thermal dissipation radiator fins for cooling oil circulation.",
          type: "radiator",
        };
        transformerGroup.add(finMesh);
      }
    }

    // D. Conservator Tank (Oil Expansion Drum on Top)
    const drumGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.8, 16);
    drumGeo.rotateZ(Math.PI / 2);
    const drumMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7 });
    const drumMesh = new THREE.Mesh(drumGeo, drumMat);
    drumMesh.position.set(0, 1.3, -0.7);
    drumMesh.userData = {
      name: "Oil Conservator Drum",
      description: "Oil expansion vessel accommodating thermal volume fluctuations.",
      type: "conservator",
    };
    transformerGroup.add(drumMesh);

    // E. Protection Relay Contact Interlock Switch
    const relayColor = liveReading.relayState === "closed" ? 0x22c55e : 0xef4444;
    const relayGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const relayMat = new THREE.MeshStandardMaterial({
      color: relayColor,
      emissive: relayColor,
      emissiveIntensity: 0.5,
    });
    const relayMesh = new THREE.Mesh(relayGeo, relayMat);
    relayMesh.position.set(0, 0, 0.95);
    relayMesh.userData = {
      name: "Blynk Automated Protection Relay",
      description: "Automated circuit breaker interlock mechanism.",
      type: "relay",
    };
    transformerGroup.add(relayMesh);

    scene.add(transformerGroup);

    // 5. Interactive Raycasting Click/Tap Selector
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      if (!mountRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(transformerGroup.children);

      if (intersects.length > 0) {
        const target = intersects[0].object;
        if (target.userData && target.userData.name) {
          const type = target.userData.type;
          let metricsStr = "";
          let statusVal: "normal" | "warning" | "critical" = "normal";

          if (type === "tank") {
            metricsStr = `Core Temp: ${liveReading.temperature.toFixed(1)}°C | Health Index: ${liveReading.healthScore || 95}%`;
            statusVal = liveReading.temperature > 60 ? "warning" : "normal";
          } else if (type === "bushing") {
            metricsStr = `Line Voltage: ${liveReading.voltage.toFixed(1)}V | Load Current: ${liveReading.current.toFixed(1)}A`;
            statusVal = liveReading.current > 1.0 ? "warning" : "normal";
          } else if (type === "relay") {
            metricsStr = `Relay Interlock: ${liveReading.relayState?.toUpperCase() || "CLOSED"}`;
            statusVal = liveReading.relayState === "closed" ? "normal" : "critical";
          } else {
            metricsStr = `Humidity: ${liveReading.humidity.toFixed(1)}% | Signal: -52 dBm`;
          }

          setSelectedPart({
            name: target.userData.name,
            description: target.userData.description,
            metrics: metricsStr,
            status: statusVal,
          });
        }
      }
    };

    const domElement = mountRef.current;
    domElement.addEventListener("click", handlePointerDown);

    // 6. Animation Loop (Smooth 3D Rotation)
    let animationFrameId: number;
    let autoRotate = true;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (autoRotate) {
        transformerGroup.rotation.y += 0.005;
      }
      renderer.render(scene, camera);
    };
    animate();

    // Mouse drag rotation control
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      autoRotate = false;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      transformerGroup.rotation.y += deltaX * 0.008;
      transformerGroup.rotation.x += deltaY * 0.008;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    domElement.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      domElement.removeEventListener("click", handlePointerDown);
      domElement.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      renderer.dispose();
    };
  }, [liveReading.temperature, liveReading.voltage, liveReading.current, liveReading.relayState, liveReading.healthScore]);

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md flex flex-col gap-md shadow-sm">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-sm border-b border-outline-variant/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary-container/20 text-primary">
            <Cpu size={20} />
          </div>
          <div>
            <h2 className="text-headline-sm font-bold text-on-surface">
              Substation 3D Digital Twin Model
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              Interactive WebGL 3D physical telemetry twin & component inspector
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full flex items-center gap-1">
            <Activity size={13} className="animate-pulse" />
            <span>Live 3D Telemetry Synced</span>
          </span>
        </div>
      </div>

      {/* 3D WebGL Canvas Container */}
      <div className="relative w-full h-80 rounded-xl overflow-hidden bg-slate-950 border border-outline-variant/40 cursor-grab active:cursor-grabbing">
        
        {/* Mount Three.js Canvas */}
        <div ref={mountRef} className="w-full h-full" />

        {/* 3D Rotation Instructions */}
        <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-700/60 text-[11px] text-slate-300 font-mono flex items-center gap-1.5 backdrop-blur-xs pointer-events-none">
          <RotateCcw size={12} className="text-primary" />
          <span>Click & Drag to Rotate 3D Model | Click Component to Inspect</span>
        </div>

        {/* Floating Interactive HUD Component Detail Card */}
        <div className="absolute top-3 right-3 max-w-xs bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 shadow-xl backdrop-blur-md flex flex-col gap-1.5 text-xs text-white">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
            <span className="font-bold text-primary truncate">{selectedPart.name}</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                selectedPart.status === "critical"
                  ? "bg-error/20 text-error"
                  : selectedPart.status === "warning"
                  ? "bg-warning/20 text-warning"
                  : "bg-success/20 text-success"
              }`}
            >
              {selectedPart.status}
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-tight">{selectedPart.description}</p>
          <div className="pt-1 text-[11px] font-mono font-bold text-sky-400 border-t border-slate-800/60">
            {selectedPart.metrics}
          </div>
        </div>

      </div>

      {/* Live 3D Twin Legend Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-sm text-xs font-mono">
        <div className="p-2 rounded-lg bg-surface-container/30 border border-outline-variant/40 flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-sky-500 animate-pulse" />
          <div>
            <span className="text-on-surface-variant text-[11px] block">Primary Bushings</span>
            <span className="font-bold text-on-surface">{liveReading.voltage.toFixed(1)} V Active</span>
          </div>
        </div>

        <div className="p-2 rounded-lg bg-surface-container/30 border border-outline-variant/40 flex items-center gap-2">
          <div
            className={`h-3 w-3 rounded-full ${
              liveReading.temperature > 60 ? "bg-amber-500" : "bg-sky-500"
            }`}
          />
          <div>
            <span className="text-on-surface-variant text-[11px] block">Oil Core Tank</span>
            <span className="font-bold text-on-surface">{liveReading.temperature.toFixed(1)} °C</span>
          </div>
        </div>

        <div className="p-2 rounded-lg bg-surface-container/30 border border-outline-variant/40 flex items-center gap-2">
          <div
            className={`h-3 w-3 rounded-full ${
              liveReading.relayState === "closed" ? "bg-emerald-500" : "bg-red-500 animate-ping"
            }`}
          />
          <div>
            <span className="text-on-surface-variant text-[11px] block">Relay Interlock</span>
            <span className="font-bold text-on-surface">
              {liveReading.relayState?.toUpperCase() || "CLOSED"}
            </span>
          </div>
        </div>

        <div className="p-2 rounded-lg bg-surface-container/30 border border-outline-variant/40 flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-emerald-500" />
          <div>
            <span className="text-on-surface-variant text-[11px] block">Health Index</span>
            <span className="font-bold text-on-surface">{liveReading.healthScore || 95}% Nominal</span>
          </div>
        </div>
      </div>

    </div>
  );
}
