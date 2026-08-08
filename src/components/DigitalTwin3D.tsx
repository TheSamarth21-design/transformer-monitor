import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Cpu, Activity, RotateCcw, Zap, Thermometer, ShieldCheck, Sun, Moon, Sparkles, Layers } from "lucide-react";
import { useLiveReading } from "@/hooks/useSensorData";

export function DigitalTwin3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const liveReading = useLiveReading();

  const [selectedPart, setSelectedPart] = useState<{
    name: string;
    description: string;
    type: "tank" | "bushing" | "relay" | "radiator" | "conservator" | "buchholz" | "cabinet" | "gantry" | "tapchanger" | "grounding";
  }>({
    name: "Substation Core & Oil Tank Assembly",
    description: "Heavy-gauge corrugated steel main tank housing high-permeability silicon steel core & mineral dielectric oil.",
    type: "tank",
  });

  const [cameraPreset, setCameraPreset] = useState<"overview" | "bushings" | "relay" | "gantry" | "radiator">("overview");
  const [isNightLighting, setIsNightLighting] = useState(true);

  // Dynamic live telemetry readings
  const currentTemp = typeof liveReading.temperature === "number" && liveReading.temperature > 0 ? liveReading.temperature : 24.7;
  const currentVolt = typeof liveReading.voltage === "number" ? liveReading.voltage : 120.0;
  const currentAmp = typeof liveReading.current === "number" ? liveReading.current : 1.2;
  const currentRelay = liveReading.relayState?.toUpperCase() || "CLOSED";
  const currentHealth = liveReading.healthScore || 95;

  let activeMetrics = `Temperature: ${currentTemp.toFixed(1)}°C | Health: ${currentHealth}%`;
  let activeStatus: "normal" | "warning" | "critical" = currentTemp > 60 ? "warning" : "normal";

  if (selectedPart.type === "bushing") {
    activeMetrics = `Line Voltage: ${currentVolt.toFixed(1)}V | Load Current: ${currentAmp.toFixed(1)}A`;
    activeStatus = currentAmp > 1.0 ? "warning" : "normal";
  } else if (selectedPart.type === "relay" || selectedPart.type === "buchholz") {
    activeMetrics = `Circuit Interlock: ${currentRelay} | Gas Protection: Nominal`;
    activeStatus = liveReading.relayState === "closed" ? "normal" : "critical";
  } else if (selectedPart.type === "gantry") {
    activeMetrics = `Grid Frequency: 50.0 Hz | Phase Balance: 99.8%`;
    activeStatus = "normal";
  } else if (selectedPart.type === "tapchanger") {
    activeMetrics = `Tap Position: Step +2 (Nominal 11kV/415V)`;
    activeStatus = "normal";
  } else if (selectedPart.type === "grounding") {
    activeMetrics = `Earth Loop Resistance: 0.12 Ω | Grounding Integrity: OK`;
    activeStatus = "normal";
  }

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight || 440;

    // 1. Scene, Fog & Camera Setup
    const scene = new THREE.Scene();
    const bgColor = isNightLighting ? 0x060913 : 0x0f172a;
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.FogExp2(bgColor, 0.035);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(7, 5, 9);
    camera.lookAt(0, 0.7, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mountRef.current.innerHTML = "";
    mountRef.current.appendChild(renderer.domElement);

    // 2. Realistic Substation Floodlight & Ambient Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, isNightLighting ? 0.4 : 0.9);
    scene.add(ambientLight);

    // Sun / Main Overhead Industrial Light
    const mainSun = new THREE.DirectionalLight(0xffffff, isNightLighting ? 0.8 : 1.6);
    mainSun.position.set(10, 16, 12);
    mainSun.castShadow = true;
    mainSun.shadow.mapSize.width = 2048;
    mainSun.shadow.mapSize.height = 2048;
    scene.add(mainSun);

    // Substation Night Floodlights (Cyan & Amber Security Floodlights)
    if (isNightLighting) {
      const floodCyan = new THREE.PointLight(0x0284c7, 3.5, 14);
      floodCyan.position.set(-6, 5, 6);
      scene.add(floodCyan);

      const floodAmber = new THREE.PointLight(0xf59e0b, 2.5, 12);
      floodAmber.position.set(6, 4, -5);
      scene.add(floodAmber);
    }

    // 3. Ground Substation Pad, Crushed Gravel Bed & Fence Rails
    const padGeo = new THREE.BoxGeometry(10, 0.4, 8);
    const padMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.95, metalness: 0.1 });
    const padMesh = new THREE.Mesh(padGeo, padMat);
    padMesh.position.set(0, -0.7, 0);
    padMesh.receiveShadow = true;
    scene.add(padMesh);

    const gridHelper = new THREE.GridHelper(16, 32, 0x0284c7, 0x1e293b);
    gridHelper.position.y = -0.49;
    scene.add(gridHelper);

    // 4. HYPER-REALISTIC TRANSFORMER 3D DIGITAL TWIN GROUP
    const transformerGroup = new THREE.Group();

    const tankBaseColor =
      currentTemp > 70
        ? 0xdc2626
        : currentTemp > 55
        ? 0xf59e0b
        : 0x0284c7;

    // A. CORRUGATED INDUSTRIAL TANK BODY & FLANGES
    const tankGeo = new THREE.BoxGeometry(2.8, 2.2, 2.0);
    const tankMat = new THREE.MeshStandardMaterial({
      color: tankBaseColor,
      roughness: 0.3,
      metalness: 0.8,
    });
    const tankMesh = new THREE.Mesh(tankGeo, tankMat);
    tankMesh.position.y = 0.6;
    tankMesh.castShadow = true;
    tankMesh.receiveShadow = true;
    tankMesh.userData = {
      name: "Substation Core & Oil Tank Assembly",
      description: "Heavy-gauge corrugated steel main tank housing high-permeability silicon steel core & mineral dielectric oil.",
      type: "tank",
    };
    transformerGroup.add(tankMesh);

    // Tank Top Lid Flange Plate with Heavy Bolts
    const lidGeo = new THREE.BoxGeometry(3.0, 0.1, 2.2);
    const lidMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.2 });
    const lidMesh = new THREE.Mesh(lidGeo, lidMat);
    lidMesh.position.set(0, 1.75, 0);
    lidMesh.castShadow = true;
    transformerGroup.add(lidMesh);

    // Flange Bolts around Lid Boundary
    const boltGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.12, 8);
    const boltMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.95 });
    for (let x = -1.4; x <= 1.4; x += 0.4) {
      for (let z of [-1.02, 1.02]) {
        const bolt = new THREE.Mesh(boltGeo, boltMat);
        bolt.position.set(x, 1.82, z);
        transformerGroup.add(bolt);
      }
    }

    // Base Support Steel Skids (I-Beams)
    const skidGeo = new THREE.BoxGeometry(3.2, 0.2, 0.3);
    const skidMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 });
    for (let z of [-0.7, 0.7]) {
      const skid = new THREE.Mesh(skidGeo, skidMat);
      skid.position.set(0, -0.4, z);
      transformerGroup.add(skid);
    }

    // B. SUBSTATION GANTRY TOWER & HIGH-VOLTAGE POWER TRANSMISSION LINES
    const gantryGroup = new THREE.Group();
    gantryGroup.position.set(0, 0, -2.2);

    // Lattice Steel Trusses
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.3 });
    for (let x of [-1.6, 1.6]) {
      const pillarGeo = new THREE.CylinderGeometry(0.06, 0.08, 4.5, 12);
      const pillar = new THREE.Mesh(pillarGeo, trussMat);
      pillar.position.set(x, 1.75, 0);
      gantryGroup.add(pillar);
    }
    const crossBeamGeo = new THREE.BoxGeometry(3.6, 0.12, 0.12);
    const crossBeam = new THREE.Mesh(crossBeamGeo, trussMat);
    crossBeam.position.set(0, 3.8, 0);
    gantryGroup.add(crossBeam);

    gantryGroup.userData = {
      name: "Substation Steel Gantry Tower & Grid Feeder Lines",
      description: "Galvanized steel overhead structural gantry carrying high-voltage feeder transmission lines from regional grid.",
      type: "gantry",
    };
    transformerGroup.add(gantryGroup);

    // C. REALISTIC HIGH-VOLTAGE PORCELAIN SHED BUSHINGS & POWER LINES
    const sparkParticlesGroup = new THREE.Group();

    for (let i = -0.85; i <= 0.85; i += 0.85) {
      const bushingGroup = new THREE.Group();
      bushingGroup.position.set(i, 1.8, 0.1);

      // Deep Ribbed Glazed Ceramic Insulator Shed Rings
      const ringMat = new THREE.MeshStandardMaterial({
        color: currentVolt > 100 ? 0x0284c7 : 0x475569,
        roughness: 0.12,
        metalness: 0.88,
        emissive: currentVolt > 100 ? 0x0369a1 : 0x000000,
        emissiveIntensity: 0.6,
      });

      for (let ring = 0; ring < 6; ring++) {
        const ringGeo = new THREE.CylinderGeometry(
          0.16 - ring * 0.012,
          0.24 - ring * 0.012,
          0.13,
          24
        );
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.y = ring * 0.16;
        ringMesh.castShadow = true;
        bushingGroup.add(ringMesh);
      }

      // Copper Terminal Head Stud
      const terminalGeo = new THREE.SphereGeometry(0.13, 16, 16);
      const copperMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.95, roughness: 0.15 });
      const terminalMesh = new THREE.Mesh(terminalGeo, copperMat);
      terminalMesh.position.y = 1.08;
      bushingGroup.add(terminalMesh);

      // Drooping Overhead Transmission Wire Cable (Catenary Line to Gantry)
      const lineCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(i, 2.88, 0.1),
        new THREE.Vector3(i * 1.1, 3.2, -1.0),
        new THREE.Vector3(i * 1.2, 3.8, -2.2)
      );
      const lineGeo = new THREE.TubeGeometry(lineCurve, 20, 0.025, 8, false);
      const lineMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9 });
      const lineMesh = new THREE.Mesh(lineGeo, lineMat);
      transformerGroup.add(lineMesh);

      // Electric Arc Aura Glow Particle around Terminals
      if (currentVolt > 100) {
        const auraGeo = new THREE.SphereGeometry(0.28, 16, 16);
        const auraMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.25,
        });
        const auraMesh = new THREE.Mesh(auraGeo, auraMat);
        auraMesh.position.y = 1.08;
        bushingGroup.add(auraMesh);
      }

      bushingGroup.userData = {
        name: `High-Voltage Porcelain Bushing (Phase ${i < 0 ? "A" : i === 0 ? "B" : "C"})`,
        description: "Primary 11kV ceramic insulator shed with copper busbar leads.",
        type: "bushing",
      };

      transformerGroup.add(bushingGroup);
    }

    // D. DUAL RADIATOR FINS & HOT OIL CIRCULATION HEADERS
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85 });
    for (let side of [-1.6, 1.6]) {
      const topPipeGeo = new THREE.CylinderGeometry(0.09, 0.09, 1.6, 16);
      topPipeGeo.rotateX(Math.PI / 2);
      const topPipe = new THREE.Mesh(topPipeGeo, pipeMat);
      topPipe.position.set(side, 1.4, 0);
      transformerGroup.add(topPipe);

      const botPipe = new THREE.Mesh(topPipeGeo, pipeMat);
      botPipe.position.set(side, -0.1, 0);
      transformerGroup.add(botPipe);

      for (let z = -0.65; z <= 0.65; z += 0.22) {
        const finGeo = new THREE.BoxGeometry(0.14, 1.5, 0.16);
        const finMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.75, roughness: 0.35 });
        const finMesh = new THREE.Mesh(finGeo, finMat);
        finMesh.position.set(side, 0.65, z);
        finMesh.castShadow = true;
        finMesh.userData = {
          name: "Dual Cooling Radiator Assemblies",
          description: "Multi-fin passive cooling radiator arrays dissipating core thermal losses.",
          type: "radiator",
        };
        transformerGroup.add(finMesh);
      }
    }

    // E. CONSERVATOR DRUM, BUCHHOLZ RELAY & SIGHT GLASS GAUGE
    const drumGroup = new THREE.Group();
    drumGroup.position.set(0, 2.15, -0.75);

    const drumGeo = new THREE.CylinderGeometry(0.42, 0.42, 2.4, 24);
    drumGeo.rotateZ(Math.PI / 2);
    const drumMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.25 });
    const drumMesh = new THREE.Mesh(drumGeo, drumMat);
    drumMesh.castShadow = true;
    drumGroup.add(drumMesh);

    // Glass Tube Oil Gauge
    const sightGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.7, 12);
    const sightMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 });
    const sightMesh = new THREE.Mesh(sightGeo, sightMat);
    sightMesh.position.set(1.0, 0, 0.4);
    drumGroup.add(sightMesh);

    drumGroup.userData = {
      name: "Conservator Tank & Oil Level Gauge",
      description: "Oil expansion drum accommodating thermal expansion with oil sight glass.",
      type: "conservator",
    };
    transformerGroup.add(drumGroup);

    // Buchholz Safety Relay
    const buchholzGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.45, 16);
    const buchholzMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85 });
    const buchholzMesh = new THREE.Mesh(buchholzGeo, buchholzMat);
    buchholzMesh.position.set(0.7, 1.75, -0.75);
    buchholzMesh.rotation.z = Math.PI / 6;
    buchholzMesh.userData = {
      name: "Buchholz Gas & Surge Safety Relay",
      description: "Gas-accumulator safety relay detecting internal arc gas generation & oil surges.",
      type: "buchholz",
    };
    transformerGroup.add(buchholzMesh);

    // F. OFF-LOAD TAP CHANGER (OLTC) WHEEL & NEUTRAL GROUNDING STRAP
    const tapGroup = new THREE.Group();
    tapGroup.position.set(-1.42, 0.8, 0.4);
    const tapWheelGeo = new THREE.TorusGeometry(0.2, 0.04, 12, 24);
    const tapMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9 });
    const tapWheel = new THREE.Mesh(tapWheelGeo, tapMat);
    tapWheel.rotation.y = Math.PI / 2;
    tapGroup.add(tapWheel);
    tapGroup.userData = {
      name: "Off-Load Tap Changer (OLTC) Switch",
      description: "Manual voltage regulation tap selector switch for secondary distribution adjustment.",
      type: "tapchanger",
    };
    transformerGroup.add(tapGroup);

    // Heavy Copper Grounding Earth Strap to Base Pad
    const groundCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.35, 0.2, 0.9),
      new THREE.Vector3(1.45, -0.2, 0.9),
      new THREE.Vector3(1.45, -0.65, 1.2),
    ]);
    const groundGeo = new THREE.TubeGeometry(groundCurve, 12, 0.04, 8, false);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.95 });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.userData = {
      name: "Substation Copper Grounding Earth Strap",
      description: "Solid copper grounding conductor bonding main tank directly to earth grid.",
      type: "grounding",
    };
    transformerGroup.add(groundMesh);

    // G. FRONT WEATHERPROOF NEMA CABINET & BLYNK PROTECTION RELAY
    const cabGeo = new THREE.BoxGeometry(0.85, 1.0, 0.35);
    const cabMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.2 });
    const cabMesh = new THREE.Mesh(cabGeo, cabMat);
    cabMesh.position.set(0, 0.4, 1.12);
    cabMesh.castShadow = true;
    cabMesh.userData = {
      name: "Blynk ESP32 Microcontroller & Relay Cabinet",
      description: "NEMA 4X control panel housing ESP32 microcontroller, sensors & trip relays.",
      type: "cabinet",
    };
    transformerGroup.add(cabMesh);

    // LED Status Lamp
    const ledColor = liveReading.relayState === "closed" ? 0x22c55e : 0xef4444;
    const ledGeo = new THREE.SphereGeometry(0.06, 12, 12);
    const ledMat = new THREE.MeshBasicMaterial({ color: ledColor });
    const ledMesh = new THREE.Mesh(ledGeo, ledMat);
    ledMesh.position.set(0, 0.65, 1.3);
    ledMesh.userData = {
      name: "Automated Circuit Breaker Relay Contact",
      description: "Remote trip circuit interlock state (Closed = Live Grid, Tripped = Isolated).",
      type: "relay",
    };
    transformerGroup.add(ledMesh);

    scene.add(transformerGroup);

    // 5. Raycasting Click Selection
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
      camera.position.set(0, 3.6, 4.2);
      camera.lookAt(0, 2.0, 0);
    } else if (cameraPreset === "relay") {
      camera.position.set(0, 0.9, 3.2);
      camera.lookAt(0, 0.4, 1.0);
    } else if (cameraPreset === "gantry") {
      camera.position.set(0, 4.2, 7.5);
      camera.lookAt(0, 2.5, -1.0);
    } else if (cameraPreset === "radiator") {
      camera.position.set(4.5, 1.8, 1.8);
      camera.lookAt(1.5, 0.6, 0);
    } else {
      camera.position.set(7, 5, 9);
      camera.lookAt(0, 0.7, 0);
    }

    // 7. Smooth 3D Animation Loop & Orbit Control
    let animationFrameId: number;
    let autoRotate = true;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (autoRotate) {
        transformerGroup.rotation.y += 0.003;
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
  }, [currentTemp, currentVolt, currentAmp, liveReading.relayState, currentHealth, cameraPreset, isNightLighting]);

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md flex flex-col gap-md shadow-lg">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-sm border-b border-outline-variant/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary-container/20 text-primary">
            <Cpu size={24} />
          </div>
          <div>
            <h2 className="text-headline-sm font-bold text-on-surface">
              Photo-Realistic 3D Substation Digital Twin
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              Commercial-grade WebGL CAD model & real-time telemetry component inspector
            </p>
          </div>
        </div>

        {/* Controls Toolbar: Camera Angles & Lighting Mode */}
        <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
          
          {/* Day / Night Substation Floodlights Toggle */}
          <button
            onClick={() => setIsNightLighting(!isNightLighting)}
            className="p-1.5 rounded-lg bg-surface-container/60 border border-outline-variant/40 text-on-surface-variant hover:text-on-surface transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
            title="Toggle Substation Lighting Mode"
          >
            {isNightLighting ? (
              <>
                <Moon size={14} className="text-sky-400" />
                <span>Night Lights</span>
              </>
            ) : (
              <>
                <Sun size={14} className="text-amber-400" />
                <span>Daylight</span>
              </>
            )}
          </button>

          {/* Camera Angles Selector Toolbar */}
          <div className="flex items-center gap-1 bg-surface-container/60 p-1 rounded-lg border border-outline-variant/40 text-xs">
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
              onClick={() => setCameraPreset("gantry")}
              className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                cameraPreset === "gantry" ? "bg-primary text-on-primary shadow" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Grid Gantry
            </button>
            <button
              onClick={() => setCameraPreset("relay")}
              className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                cameraPreset === "relay" ? "bg-primary text-on-primary shadow" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Control Panel
            </button>
          </div>

        </div>
      </div>

      {/* 3D WebGL Studio Canvas Container */}
      <div className="relative w-full h-[420px] rounded-xl overflow-hidden bg-slate-950 border border-outline-variant/50 cursor-grab active:cursor-grabbing shadow-2xl">
        
        {/* Mount Three.js Canvas */}
        <div ref={mountRef} className="w-full h-full" />

        {/* 3D Drag Prompt */}
        <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-slate-900/85 border border-slate-700/60 text-xs text-slate-300 font-mono flex items-center gap-2 backdrop-blur-md pointer-events-none shadow-md">
          <RotateCcw size={14} className="text-primary animate-spin" style={{ animationDuration: "8s" }} />
          <span>Click & Drag to Rotate 360° | Click Any Component to Inspect</span>
        </div>

        {/* Floating Interactive HUD Component Detail Card (Dynamically updated with live temperature!) */}
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
