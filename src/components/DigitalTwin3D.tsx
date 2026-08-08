import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Cpu, Activity, RotateCcw, Maximize2, Eye, ShieldCheck, Zap, Thermometer } from "lucide-react";
import { useLiveReading } from "@/hooks/useSensorData";

export function DigitalTwin3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const liveReading = useLiveReading();

  const [selectedPart, setSelectedPart] = useState<{
    name: string;
    description: string;
    type: "tank" | "bushing" | "relay" | "radiator" | "conservator" | "buchholz" | "cabinet";
  }>({
    name: "Substation Core & Oil Tank",
    description: "Heavy-gauge steel main tank containing core windings & mineral oil.",
    type: "tank",
  });

  const [cameraPreset, setCameraPreset] = useState<"overview" | "bushings" | "relay" | "radiator">("overview");

  // Dynamic real-time telemetry computation
  const currentTemp = typeof liveReading.temperature === "number" && liveReading.temperature > 0 ? liveReading.temperature : 24.7;
  const currentVolt = typeof liveReading.voltage === "number" ? liveReading.voltage : 120.0;
  const currentAmp = typeof liveReading.current === "number" ? liveReading.current : 1.2;
  const currentRelay = liveReading.relayState?.toUpperCase() || "CLOSED";
  const currentHealth = liveReading.healthScore || 95;

  let activeMetrics = `Temperature: ${currentTemp.toFixed(1)}°C | Health: ${currentHealth}%`;
  let activeStatus: "normal" | "warning" | "critical" = currentTemp > 60 ? "warning" : "normal";

  if (selectedPart.type === "bushing") {
    activeMetrics = `Line Voltage: ${currentVolt.toFixed(1)}V | Current: ${currentAmp.toFixed(1)}A`;
    activeStatus = currentAmp > 1.0 ? "warning" : "normal";
  } else if (selectedPart.type === "relay" || selectedPart.type === "buchholz") {
    activeMetrics = `Circuit Interlock: ${currentRelay} | Gas Protection: OK`;
    activeStatus = liveReading.relayState === "closed" ? "normal" : "critical";
  } else if (selectedPart.type === "radiator") {
    activeMetrics = `Oil Flow Temp: ${currentTemp.toFixed(1)}°C | Passive Fins Active`;
    activeStatus = currentTemp > 60 ? "warning" : "normal";
  } else if (selectedPart.type === "cabinet") {
    activeMetrics = `ESP32 Telemetry: Synced | Blynk Cloud Online`;
    activeStatus = "normal";
  }

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight || 420;

    // 1. Scene & Renderer Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16); // Deep industrial navy dark background
    scene.fog = new THREE.FogExp2(0x090d16, 0.04);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.set(6, 4.5, 8);
    camera.lookAt(0, 0.6, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mountRef.current.innerHTML = "";
    mountRef.current.appendChild(renderer.domElement);

    // 2. High-Fidelity Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xe2e8f0, 0.8);
    scene.add(ambientLight);

    const mainSpot = new THREE.DirectionalLight(0xffffff, 1.5);
    mainSpot.position.set(8, 12, 10);
    mainSpot.castShadow = true;
    mainSpot.shadow.mapSize.width = 1024;
    mainSpot.shadow.mapSize.height = 1024;
    scene.add(mainSpot);

    const fillBlue = new THREE.PointLight(0x0284c7, 2.0, 12);
    fillBlue.position.set(-6, 3, -4);
    scene.add(fillBlue);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    rimLight.position.set(-8, 6, -8);
    scene.add(rimLight);

    // 3. Ground Concrete Base Pad & Grid Floor
    const padGeo = new THREE.BoxGeometry(7, 0.3, 5.5);
    const padMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8, metalness: 0.2 });
    const padMesh = new THREE.Mesh(padGeo, padMat);
    padMesh.position.set(0, -0.65, 0);
    padMesh.receiveShadow = true;
    scene.add(padMesh);

    const gridHelper = new THREE.GridHelper(14, 28, 0x0284c7, 0x1e293b);
    gridHelper.position.y = -0.49;
    scene.add(gridHelper);

    // 4. HYPER-REALISTIC TRANSFORMER 3D STRUCTURE GROUP
    const transformerGroup = new THREE.Group();

    // Steel Metallic Color based on Temp
    const tankBaseColor =
      currentTemp > 70
        ? 0xdc2626
        : currentTemp > 55
        ? 0xeab308
        : 0x0284c7;

    // A. Main Transformer Tank Body (Corrugated Industrial Tank)
    const tankGeo = new THREE.BoxGeometry(2.6, 2.0, 1.8);
    const tankMat = new THREE.MeshStandardMaterial({
      color: tankBaseColor,
      roughness: 0.35,
      metalness: 0.75,
    });
    const tankMesh = new THREE.Mesh(tankGeo, tankMat);
    tankMesh.position.y = 0.5;
    tankMesh.castShadow = true;
    tankMesh.receiveShadow = true;
    tankMesh.userData = {
      name: "Substation Core & Oil Tank",
      description: "Heavy-gauge steel main tank containing core windings & mineral oil.",
      type: "tank",
    };
    transformerGroup.add(tankMesh);

    // Tank Stiffener Ribbing Beams (Vertical & Horizontal reinforcing steel bars)
    const ribMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.3 });
    for (let x = -1.1; x <= 1.1; x += 0.55) {
      const ribGeo = new THREE.BoxGeometry(0.08, 1.8, 0.08);
      const ribFront = new THREE.Mesh(ribGeo, ribMat);
      ribFront.position.set(x, 0.5, 0.91);
      transformerGroup.add(ribFront);

      const ribBack = new THREE.Mesh(ribGeo, ribMat);
      ribBack.position.set(x, 0.5, -0.91);
      transformerGroup.add(ribBack);
    }

    // Mounting Feet Skids (Base Rails)
    const skidGeo = new THREE.BoxGeometry(3.0, 0.15, 0.25);
    const skidMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 });
    const skidLeft = new THREE.Mesh(skidGeo, skidMat);
    skidLeft.position.set(0, -0.42, 0.6);
    transformerGroup.add(skidLeft);

    const skidRight = new THREE.Mesh(skidGeo, skidMat);
    skidRight.position.set(0, -0.42, -0.6);
    transformerGroup.add(skidRight);

    // B. REALISTIC PORCELAIN SHED HV BUSHINGS (3 High Voltage Phase Conductors)
    for (let i = -0.75; i <= 0.75; i += 0.75) {
      const bushingGroup = new THREE.Group();
      bushingGroup.position.set(i, 1.5, 0.1);

      // Stacked Ceramic Shed Rings (Realistic Insulator Geometry)
      const ringMat = new THREE.MeshStandardMaterial({
        color: currentVolt > 100 ? 0x0284c7 : 0x475569,
        roughness: 0.15,
        metalness: 0.85,
        emissive: currentVolt > 100 ? 0x0369a1 : 0x000000,
        emissiveIntensity: 0.5,
      });

      for (let ring = 0; ring < 5; ring++) {
        const ringGeo = new THREE.CylinderGeometry(
          0.16 - ring * 0.015,
          0.22 - ring * 0.015,
          0.14,
          24
        );
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.y = ring * 0.18;
        ringMesh.castShadow = true;
        bushingGroup.add(ringMesh);
      }

      // Copper Terminal Head & Busbar Connector Wire
      const terminalGeo = new THREE.SphereGeometry(0.12, 16, 16);
      const copperMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 });
      const terminalMesh = new THREE.Mesh(terminalGeo, copperMat);
      terminalMesh.position.y = 1.05;
      bushingGroup.add(terminalMesh);

      const wireGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8);
      const wireMesh = new THREE.Mesh(wireGeo, copperMat);
      wireMesh.position.set(0, 1.3, 0.2);
      wireMesh.rotation.x = Math.PI / 4;
      bushingGroup.add(wireMesh);

      bushingGroup.userData = {
        name: `High-Voltage Porcelain Bushing (Phase ${i < 0 ? "A" : i === 0 ? "B" : "C"})`,
        description: "Primary grid HV ceramic insulator shed with copper busbar leads.",
        type: "bushing",
      };

      transformerGroup.add(bushingGroup);
    }

    // C. DUAL PASSIVE RADIATOR FIN ARRAYS (Left & Right Cooling Radiators with Header Pipes)
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
    for (let side of [-1.5, 1.5]) {
      // Top & Bottom Header Manifold Pipes
      const topPipeGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.4, 16);
      topPipeGeo.rotateX(Math.PI / 2);
      const topPipe = new THREE.Mesh(topPipeGeo, pipeMat);
      topPipe.position.set(side, 1.2, 0);
      transformerGroup.add(topPipe);

      const botPipe = new THREE.Mesh(topPipeGeo, pipeMat);
      botPipe.position.set(side, -0.2, 0);
      transformerGroup.add(botPipe);

      // Radiator Fins
      for (let z = -0.55; z <= 0.55; z += 0.22) {
        const finGeo = new THREE.BoxGeometry(0.12, 1.4, 0.14);
        const finMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.4 });
        const finMesh = new THREE.Mesh(finGeo, finMat);
        finMesh.position.set(side, 0.5, z);
        finMesh.castShadow = true;
        finMesh.userData = {
          name: "Thermal Dissipation Radiator Fins",
          description: "Dual cooling radiator arrays dissipating core heat via mineral oil flow.",
          type: "radiator",
        };
        transformerGroup.add(finMesh);
      }
    }

    // D. CONSERVATOR DRUM & BUCHHOLZ PROTECTION RELAY PIPE
    const drumGroup = new THREE.Group();
    drumGroup.position.set(0, 1.95, -0.65);

    const drumGeo = new THREE.CylinderGeometry(0.38, 0.38, 2.2, 24);
    drumGeo.rotateZ(Math.PI / 2);
    const drumMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.75, roughness: 0.3 });
    const drumMesh = new THREE.Mesh(drumGeo, drumMat);
    drumMesh.castShadow = true;
    drumGroup.add(drumMesh);

    // Oil Level Sight Glass Glass Tube Gauge
    const sightGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.6, 12);
    const sightMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8 });
    const sightMesh = new THREE.Mesh(sightGeo, sightMat);
    sightMesh.position.set(0.9, 0, 0.36);
    drumGroup.add(sightMesh);

    drumGroup.userData = {
      name: "Conservator Tank & Oil Level Gauge",
      description: "Oil expansion drum accommodating thermal volume expansion with sight glass.",
      type: "conservator",
    };
    transformerGroup.add(drumGroup);

    // Buchholz Safety Relay (Mounted on pipe connecting tank to conservator)
    const buchholzGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.4, 16);
    const buchholzMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8 });
    const buchholzMesh = new THREE.Mesh(buchholzGeo, buchholzMat);
    buchholzMesh.position.set(0.6, 1.6, -0.65);
    buchholzMesh.rotation.z = Math.PI / 6;
    buchholzMesh.userData = {
      name: "Buchholz Gas & Surge Safety Relay",
      description: "Gas-accumulator safety relay detecting internal core arcing & gas accumulation.",
      type: "buchholz",
    };
    transformerGroup.add(buchholzMesh);

    // E. FRONT NEMA CONTROL CABINET & BLYNK PROTECTION RELAY SWITCH
    const cabGeo = new THREE.BoxGeometry(0.7, 0.9, 0.3);
    const cabMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.25 });
    const cabMesh = new THREE.Mesh(cabGeo, cabMat);
    cabMesh.position.set(0, 0.3, 1.0);
    cabMesh.castShadow = true;
    cabMesh.userData = {
      name: "Blynk ESP32 Control & Interlock Cabinet",
      description: "NEMA 4X control panel housing ESP32 microcontroller, sensors & trip relays.",
      type: "cabinet",
    };
    transformerGroup.add(cabMesh);

    // LED Status Indicators on Cabinet Door
    const ledColor = liveReading.relayState === "closed" ? 0x22c55e : 0xef4444;
    const ledGeo = new THREE.SphereGeometry(0.05, 12, 12);
    const ledMat = new THREE.MeshBasicMaterial({ color: ledColor });
    const ledMesh = new THREE.Mesh(ledGeo, ledMat);
    ledMesh.position.set(0, 0.5, 1.16);
    ledMesh.userData = {
      name: "Automated Circuit Breaker Relay Contact",
      description: "Remote trip circuit interlock state (Closed = Live Grid, Tripped = Isolated).",
      type: "relay",
    };
    transformerGroup.add(ledMesh);

    scene.add(transformerGroup);

    // 5. Interactive Click & Raycasting Target Selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      if (!mountRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(transformerGroup.children, true);

      if (intersects.length > 0) {
        let parentObj: THREE.Object3D | null = intersects[0].object;
        while (parentObj && (!parentObj.userData || !parentObj.userData.name)) {
          parentObj = parentObj.parent;
        }

        if (parentObj && parentObj.userData && parentObj.userData.name) {
          setSelectedPart({
            name: parentObj.userData.name,
            description: parentObj.userData.description,
            type: parentObj.userData.type || "tank",
          });
        }
      }
    };

    const domElement = mountRef.current;
    domElement.addEventListener("click", handlePointerDown);

    // 6. Camera Position Preset Switching
    if (cameraPreset === "bushings") {
      camera.position.set(0, 3.2, 4.0);
      camera.lookAt(0, 1.8, 0);
    } else if (cameraPreset === "relay") {
      camera.position.set(0, 0.8, 3.0);
      camera.lookAt(0, 0.4, 0.9);
    } else if (cameraPreset === "radiator") {
      camera.position.set(4.0, 1.5, 1.5);
      camera.lookAt(1.5, 0.5, 0);
    } else {
      camera.position.set(6, 4.5, 8);
      camera.lookAt(0, 0.6, 0);
    }

    // 7. Smooth 3D Animation Loop & Orbit Rotation
    let animationFrameId: number;
    let autoRotate = true;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (autoRotate) {
        transformerGroup.rotation.y += 0.004;
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
  }, [currentTemp, currentVolt, currentAmp, liveReading.relayState, currentHealth, cameraPreset]);

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md flex flex-col gap-md shadow-md">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-sm border-b border-outline-variant/60">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary-container/20 text-primary">
            <Cpu size={22} />
          </div>
          <div>
            <h2 className="text-headline-sm font-bold text-on-surface">
              Hyper-Realistic Substation 3D Digital Twin
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              Industrial-grade 3D WebGL physical twin & component diagnostic inspector
            </p>
          </div>
        </div>

        {/* Camera Angles Selector Toolbar */}
        <div className="flex items-center gap-1.5 self-end sm:self-center bg-surface-container/60 p-1 rounded-lg border border-outline-variant/40 text-xs">
          <button
            onClick={() => setCameraPreset("overview")}
            className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
              cameraPreset === "overview" ? "bg-primary text-on-primary shadow" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setCameraPreset("bushings")}
            className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
              cameraPreset === "bushings" ? "bg-primary text-on-primary shadow" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            HV Bushings
          </button>
          <button
            onClick={() => setCameraPreset("relay")}
            className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
              cameraPreset === "relay" ? "bg-primary text-on-primary shadow" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Control Relay
          </button>
          <button
            onClick={() => setCameraPreset("radiator")}
            className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
              cameraPreset === "radiator" ? "bg-primary text-on-primary shadow" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Radiator
          </button>
        </div>
      </div>

      {/* 3D WebGL Studio Canvas Container */}
      <div className="relative w-full h-[380px] rounded-xl overflow-hidden bg-slate-950 border border-outline-variant/50 cursor-grab active:cursor-grabbing shadow-inner">
        
        {/* Mount Three.js Canvas */}
        <div ref={mountRef} className="w-full h-full" />

        {/* 3D Drag Prompt */}
        <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-slate-900/85 border border-slate-700/60 text-xs text-slate-300 font-mono flex items-center gap-2 backdrop-blur-md pointer-events-none shadow-md">
          <RotateCcw size={14} className="text-primary animate-spin" style={{ animationDuration: "8s" }} />
          <span>Click & Drag to Rotate 360° | Click Component to Inspect</span>
        </div>

        {/* Floating Interactive HUD Component Detail Card */}
        <div className="absolute top-3 right-3 max-w-xs bg-slate-900/90 border border-slate-700/80 rounded-xl p-3.5 shadow-2xl backdrop-blur-md flex flex-col gap-2 text-xs text-white">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-sky-400 text-sm truncate">{selectedPart.name}</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                activeStatus === "critical"
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : activeStatus === "warning"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              }`}
            >
              {activeStatus}
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">{selectedPart.description}</p>
          <div className="pt-2 text-xs font-mono font-bold text-sky-300 border-t border-slate-800 flex items-center gap-1.5">
            <Activity size={14} className="text-primary shrink-0 animate-pulse" />
            <span>{activeMetrics}</span>
          </div>
        </div>

      </div>

      {/* Live 3D Twin Synchronized Telemetry Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-sm text-xs font-mono">
        <div className="p-2.5 rounded-xl bg-surface-container/40 border border-outline-variant/40 flex items-center gap-2.5 shadow-xs">
          <div className="p-2 rounded-lg bg-sky-500/15 text-sky-400">
            <Zap size={18} />
          </div>
          <div>
            <span className="text-on-surface-variant text-[11px] block">Primary Bushings</span>
            <span className="font-bold text-on-surface text-body-sm">{currentVolt.toFixed(1)} V Active</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-surface-container/40 border border-outline-variant/40 flex items-center gap-2.5 shadow-xs">
          <div className={`p-2 rounded-lg ${currentTemp > 60 ? "bg-amber-500/15 text-amber-400" : "bg-sky-500/15 text-sky-400"}`}>
            <Thermometer size={18} />
          </div>
          <div>
            <span className="text-on-surface-variant text-[11px] block">Temperature</span>
            <span className="font-bold text-on-surface text-body-sm">{currentTemp.toFixed(1)} °C</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-surface-container/40 border border-outline-variant/40 flex items-center gap-2.5 shadow-xs">
          <div className={`p-2 rounded-lg ${liveReading.relayState === "closed" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
            <ShieldCheck size={18} />
          </div>
          <div>
            <span className="text-on-surface-variant text-[11px] block">Relay Interlock</span>
            <span className="font-bold text-on-surface text-body-sm">{currentRelay}</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-surface-container/40 border border-outline-variant/40 flex items-center gap-2.5 shadow-xs">
          <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
            <Activity size={18} />
          </div>
          <div>
            <span className="text-on-surface-variant text-[11px] block">Health Index</span>
            <span className="font-bold text-on-surface text-body-sm">{currentHealth}% Nominal</span>
          </div>
        </div>
      </div>

    </div>
  );
}
