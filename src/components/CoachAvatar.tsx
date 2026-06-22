import { useEffect, useRef } from "react";
import * as THREE from "three";

interface CoachAvatarProps {
  isSpeaking: boolean;
  isListening: boolean;
  isProcessing: boolean;
}

export default function CoachAvatar({
  isSpeaking,
  isListening,
  isProcessing,
}: CoachAvatarProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  // Keep references to animate meshes inside the render loop
  const meshesRef = useRef<{
    headGroup: THREE.Group | null;
    mouth: THREE.Mesh | null;
    leftEye: THREE.Mesh | null;
    rightEye: THREE.Mesh | null;
    statusLight: THREE.Mesh | null;
    leftEarcupGlow: THREE.Mesh | null;
    rightEarcupGlow: THREE.Mesh | null;
  }>({
    headGroup: null,
    mouth: null,
    leftEye: null,
    rightEye: null,
    statusLight: null,
    leftEarcupGlow: null,
    rightEarcupGlow: null,
  });

  // State values that can change inside the animation frame
  const animatedStateRef = useRef({
    isSpeaking,
    isListening,
    isProcessing,
    mouse: new THREE.Vector2(),
    targetMouse: new THREE.Vector2(),
    blinkTimer: 0,
    blinkDuration: 0.12,
    isBlinking: false,
  });

  // Sync props to ref to avoid re-triggering Three.js render loops
  useEffect(() => {
    animatedStateRef.current.isSpeaking = isSpeaking;
    animatedStateRef.current.isListening = isListening;
    animatedStateRef.current.isProcessing = isProcessing;
  }, [isSpeaking, isListening, isProcessing]);

  // Track user mouse position relative to container
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!mountRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      // Normalize mouse coordinates (-1 to +1)
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      // Clamp to screen limits to keep character gazing forward naturally
      animatedStateRef.current.targetMouse.set(
        Math.max(-0.6, Math.min(0.6, x)),
        Math.max(-0.4, Math.min(0.4, y))
      );
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = null; // Transparent background to blend into the web page's smooth gradients

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.2, 3.2);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    // Main studio light (creates elegant highlights)
    const dirLight1 = new THREE.DirectionalLight(0xf0f7ff, 1.2);
    dirLight1.position.set(2, 4, 3);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    // Soft colored accent light (blue/cyan) from the opposite side
    const dirLight2 = new THREE.DirectionalLight(0x4488ff, 1.5);
    dirLight2.position.set(-3, -1, 2);
    scene.add(dirLight2);

    // Subtle edge back light for futuristic rim-glow
    const rimLight = new THREE.DirectionalLight(0xffffff, 1.0);
    rimLight.position.set(0, 2, -3);
    scene.add(rimLight);

    // 5. Creating a High-Quality Robot/Humanoid Coach Avatar!
    const avatarGroup = new THREE.Group();
    avatarGroup.position.set(0, -0.65, 0);
    scene.add(avatarGroup);

    // Materials helper
    const sleekWhiteMetal = new THREE.MeshStandardMaterial({
      color: 0xf3f4f6,
      roughness: 0.15,
      metalness: 0.85,
    });

    const softNavyCore = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.2,
    });

    const neonBlueGlow = new THREE.MeshStandardMaterial({
      color: 0x00d2ff,
      emissive: 0x00a2ff,
      emissiveIntensity: 1.5,
      roughness: 0.1,
    });

    const futuristicGoldAccent = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.2,
      metalness: 0.9,
    });

    const standardDarkGlass = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.1,
      metalness: 0.9,
    });

    // A. Torso / Neck Base
    const torsoGeo = new THREE.CylinderGeometry(0.35, 0.5, 0.8, 32);
    const torsoMesh = new THREE.Mesh(torsoGeo, softNavyCore);
    torsoMesh.position.set(0, 0.2, 0);
    avatarGroup.add(torsoMesh);

    // Tech lines on the body
    const badgeGeo = new THREE.BoxGeometry(0.25, 0.12, 0.05);
    const badgeMesh = new THREE.Mesh(badgeGeo, coreStatusLightMaterial(0x00d2ff));
    badgeMesh.position.set(0, 0.35, 0.34);
    avatarGroup.add(badgeMesh);

    // Neck joint cylindrical connecting rod
    const neckGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.25, 16);
    const neckMesh = new THREE.Mesh(neckGeo, sleekWhiteMetal);
    neckMesh.position.set(0, 0.65, 0);
    avatarGroup.add(neckMesh);

    // Status collar disk
    const collarGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.05, 16);
    const collarMesh = new THREE.Mesh(collarGeo, futuristicGoldAccent);
    collarMesh.position.set(0, 0.58, 0);
    avatarGroup.add(collarMesh);

    // B. Head Group (so we can rotate it together and perform gaze tracking)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.95, 0);
    avatarGroup.add(headGroup);
    meshesRef.current.headGroup = headGroup;

    // Head Base: sleek humanoid stylized face capsule/sphere
    const skullGeo = new THREE.SphereGeometry(0.38, 32, 32);
    // Stretch vertically for natural cranium proportions
    skullGeo.scale(1, 1.15, 0.95);
    const skullMesh = new THREE.Mesh(skullGeo, sleekWhiteMetal);
    headGroup.add(skullMesh);

    // Side headphone bands
    const headbandGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 24, 1, true);
    headbandGeo.rotateZ(Math.PI / 2);
    headbandGeo.scale(1, 1, 1.1);
    const headband = new THREE.Mesh(headbandGeo, softNavyCore);
    headbackAccents(headband);
    headGroup.add(headband);

    // Earcup Left
    const earcupLeftGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.08, 16);
    earcupLeftGeo.rotateZ(Math.PI / 2);
    const earcupLeft = new THREE.Mesh(earcupLeftGeo, futuristicGoldAccent);
    earcupLeft.position.set(-0.39, 0, 0);
    headGroup.add(earcupLeft);

    const leftGlowGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.03, 16);
    leftGlowGeo.rotateZ(Math.PI / 2);
    const leftGlow = new THREE.Mesh(leftGlowGeo, neonBlueGlow);
    leftGlow.position.set(-0.44, 0, 0);
    headGroup.add(leftGlow);
    meshesRef.current.leftEarcupGlow = leftGlow;

    // Earcup Right
    const earcupRightGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.08, 16);
    earcupRightGeo.rotateZ(Math.PI / 2);
    const earcupRight = new THREE.Mesh(earcupRightGeo, futuristicGoldAccent);
    earcupRight.position.set(0.39, 0, 0);
    headGroup.add(earcupRight);

    const rightGlowGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.03, 16);
    rightGlowGeo.rotateZ(Math.PI / 2);
    const rightGlow = new THREE.Mesh(rightGlowGeo, neonBlueGlow);
    rightGlow.position.set(0.44, 0, 0);
    headGroup.add(rightGlow);
    meshesRef.current.rightEarcupGlow = rightGlow;

    // C. Face visor plate (gives the elegant humanoid robot character aesthetic)
    const visorGeo = new THREE.SphereGeometry(0.32, 16, 16, 0, Math.PI * 2, 0.3, Math.PI * 0.4);
    visorGeo.scale(1, 0.8, 1.05);
    const visorMesh = new THREE.Mesh(visorGeo, standardDarkGlass);
    visorMesh.position.set(0, 0.05, 0.06);
    headGroup.add(visorMesh);

    // D. Friendly cybernetic glowing blue eyes
    const eyeGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.02, 16);
    eyeGeo.rotateX(Math.PI / 2);

    const leftEye = new THREE.Mesh(eyeGeo, neonBlueGlow);
    leftEye.position.set(-0.13, 0.08, 0.35);
    headGroup.add(leftEye);
    meshesRef.current.leftEye = leftEye;

    const rightEye = new THREE.Mesh(eyeGeo, neonBlueGlow);
    rightEye.position.set(0.13, 0.08, 0.35);
    headGroup.add(rightEye);
    meshesRef.current.rightEye = rightEye;

    // Glowing friendly eyebrows for expressive tutor moods
    const browGeo = new THREE.BoxGeometry(0.08, 0.015, 0.01);
    const leftBrow = new THREE.Mesh(browGeo, softNavyCore);
    leftBrow.position.set(-0.13, 0.16, 0.35);
    leftBrow.rotation.z = 0.06;
    headGroup.add(leftBrow);

    const rightBrow = new THREE.Mesh(browGeo, softNavyCore);
    rightBrow.position.set(0.13, 0.16, 0.35);
    rightBrow.rotation.z = -0.06;
    headGroup.add(rightBrow);

    // E. Mouth (a segmented capsule bar representing speech lines - PERFECT for mouth scale lipsync animations!)
    const mouthGeo = new THREE.BoxGeometry(0.15, 0.018, 0.03);
    const mouthMesh = new THREE.Mesh(mouthGeo, neonBlueGlow);
    mouthMesh.position.set(0, -0.15, 0.34);
    headGroup.add(mouthMesh);
    meshesRef.current.mouth = mouthMesh;

    // Helper functions
    function coreStatusLightMaterial(colorVal: number) {
      return new THREE.MeshStandardMaterial({
        color: colorVal,
        emissive: colorVal,
        emissiveIntensity: 1.0,
      });
    }

    function headbackAccents(band: THREE.Mesh) {
      band.position.set(0, 0, -0.05);
    }

    // 6. Animation clock
    const clock = new THREE.Clock();

    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();
      const state = animatedStateRef.current;

      // Subtle Idle breathing and oscillation of the entire humanoid character
      const breathing = Math.sin(elapsedTime * 2.2) * 0.015;
      avatarGroup.position.y = -0.65 + breathing;
      
      // Gentle head swaying
      if (headGroup) {
        headGroup.rotation.z = Math.sin(elapsedTime * 1.1) * 0.012;
        headGroup.rotation.y = Math.cos(elapsedTime * 0.7) * 0.02;
        
        // E. Smooth Eye/Gaze Tracking of the User mouse
        // Gently lerp current mouse target vector for laggy/natural flesh focus
        state.mouse.x = THREE.MathUtils.lerp(state.mouse.x, state.targetMouse.x, 0.08);
        state.mouse.y = THREE.MathUtils.lerp(state.mouse.y, state.targetMouse.y, 0.08);

        // Tilt the head toward user's gaze target
        headGroup.rotation.y += state.mouse.x * 0.32;
        headGroup.rotation.x = state.mouse.y * 0.22;
      }

      // F. Smooth Blinking Simulation
      if (state.isBlinking) {
        state.blinkTimer += clock.getDelta(); // delta
        const progress = state.blinkTimer / state.blinkDuration;
        if (progress >= 1.0) {
          state.isBlinking = false;
          state.blinkTimer = 0;
          if (meshesRef.current.leftEye) meshesRef.current.leftEye.scale.y = 1;
          if (meshesRef.current.rightEye) meshesRef.current.rightEye.scale.y = 1;
        } else {
          // Half closed scale
          const scale = progress < 0.5 ? 1 - (progress * 2) : (progress - 0.5) * 2;
          const eyeScale = Math.max(0.08, scale);
          if (meshesRef.current.leftEye) meshesRef.current.leftEye.scale.y = eyeScale;
          if (meshesRef.current.rightEye) meshesRef.current.rightEye.scale.y = eyeScale;
        }
      } else {
        // Randomly trigger blink every 3-5 seconds
        if (Math.random() < 0.007) {
          state.isBlinking = true;
          state.blinkTimer = 0;
        }
      }

      // G. Lip-Sync & Speaking Animation Loop
      if (meshesRef.current.mouth) {
        if (state.isSpeaking) {
          // Dynamic phonetic animation combined using multi-frequency oscillators
          const syllableShape = Math.abs(
            Math.sin(elapsedTime * 18) * Math.cos(elapsedTime * 8) + 
            Math.sin(elapsedTime * 5.5) * 0.4
          );
          // Scale vertical height of the neon speaker mouth representing speaking state
          meshesRef.current.mouth.scale.y = 1.0 + syllableShape * 4.5;
          meshesRef.current.mouth.scale.x = 0.95 + Math.sin(elapsedTime * 11) * 0.15;
          
          // Boost glowing intensity of the eyes & headset during speech
          if (meshesRef.current.leftEye) (meshesRef.current.leftEye.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.0 + Math.sin(elapsedTime * 20) * 0.3;
          if (meshesRef.current.rightEye) (meshesRef.current.rightEye.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.0 + Math.sin(elapsedTime * 20) * 0.3;
        } else if (state.isProcessing) {
          // Let mouth stay as a small thinking dot pulsing
          meshesRef.current.mouth.scale.y = 0.8;
          meshesRef.current.mouth.scale.x = 0.3 + Math.abs(Math.sin(elapsedTime * 8) * 0.4);
          
          if (meshesRef.current.leftEye) (meshesRef.current.leftEye.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.0;
          if (meshesRef.current.rightEye) (meshesRef.current.rightEye.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.0;
        } else {
          // Restore mouth back to normal passive line
          meshesRef.current.mouth.scale.y = THREE.MathUtils.lerp(meshesRef.current.mouth.scale.y, 1.0, 0.2);
          meshesRef.current.mouth.scale.x = THREE.MathUtils.lerp(meshesRef.current.mouth.scale.x, 1.0, 0.2);
          
          if (meshesRef.current.leftEye) (meshesRef.current.leftEye.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2;
          if (meshesRef.current.rightEye) (meshesRef.current.rightEye.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2;
        }
      }

      // H. Emissive color updates during user dictation / speech listening
      if (meshesRef.current.leftEarcupGlow && meshesRef.current.rightEarcupGlow) {
        if (state.isListening) {
          // Change glows to warm green pulse showing Cody is recording/listening
          const pulse = 1.5 + Math.sin(elapsedTime * 12) * 0.5;
          const greenHex = new THREE.Color(0x22c55e);
          (meshesRef.current.leftEarcupGlow.material as THREE.MeshStandardMaterial).emissive = greenHex;
          (meshesRef.current.leftEarcupGlow.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse;
          (meshesRef.current.rightEarcupGlow.material as THREE.MeshStandardMaterial).emissive = greenHex;
          (meshesRef.current.rightEarcupGlow.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse;
        } else if (state.isProcessing) {
          // Yellow pulsing for processing
          const pulse = 1.2 + Math.sin(elapsedTime * 15) * 0.4;
          const goldHex = new THREE.Color(0xeab308);
          (meshesRef.current.leftEarcupGlow.material as THREE.MeshStandardMaterial).emissive = goldHex;
          (meshesRef.current.leftEarcupGlow.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse;
          (meshesRef.current.rightEarcupGlow.material as THREE.MeshStandardMaterial).emissive = goldHex;
          (meshesRef.current.rightEarcupGlow.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse;
        } else {
          // Classic Neon Blue static-glow when waiting
          const blueHex = new THREE.Color(0x00d2ff);
          const baseEmIntensity = 1.3 + Math.sin(elapsedTime * 1.5) * 0.2;
          (meshesRef.current.leftEarcupGlow.material as THREE.MeshStandardMaterial).emissive = blueHex;
          (meshesRef.current.leftEarcupGlow.material as THREE.MeshStandardMaterial).emissiveIntensity = baseEmIntensity;
          (meshesRef.current.rightEarcupGlow.material as THREE.MeshStandardMaterial).emissive = blueHex;
          (meshesRef.current.rightEarcupGlow.material as THREE.MeshStandardMaterial).emissiveIntensity = baseEmIntensity;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Responsive Canvas Resizing behavior
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;

      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    // Clean up ThreeJS scenes to prevent GPU leaks
    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      container.removeChild(renderer.domElement);
      renderer.dispose();
      
      // Clear geometries & material leaks
      torsoGeo.dispose();
      neckGeo.dispose();
      collarGeo.dispose();
      skullGeo.dispose();
      headbandGeo.dispose();
      earcupLeftGeo.dispose();
      earcupRightGeo.dispose();
      leftGlowGeo.dispose();
      rightGlowGeo.dispose();
      visorGeo.dispose();
      eyeGeo.dispose();
      browGeo.dispose();
      mouthGeo.dispose();
      badgeGeo.dispose();

      sleekWhiteMetal.dispose();
      softNavyCore.dispose();
      neonBlueGlow.dispose();
      futuristicGoldAccent.dispose();
      standardDarkGlass.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      id="coach-avatar-canvas-container"
      className="w-full h-full relative overflow-hidden flex items-center justify-center cursor-pointer"
      title="Cody tracks your mouse movement!"
    >
      {/* Decorative cyber backdrop grid pattern using tailwind utility classes */}
      <div className="absolute inset-0 bg-radial from-slate-900/10 via-slate-900/60 to-slate-950 pointer-events-none rounded-3xl border border-white/5 opacity-80" />
      
      {/* Visual floating tags */}
      <div className="absolute top-4 left-4 flex gap-2 pointer-events-none select-none">
        <div className={`px-2.5 py-1 text-[10px] font-mono rounded-full border flex items-center gap-1.5 transition-all duration-300 ${
          isListening 
            ? "bg-green-500/15 text-green-400 border-green-500/30 font-bold" 
            : isProcessing 
            ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
            : isSpeaking
            ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
            : "bg-white/5 text-slate-400 border-white/10"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            isListening 
              ? "bg-green-400 animate-ping" 
              : isProcessing 
              ? "bg-amber-400 animate-pulse"
              : isSpeaking
              ? "bg-sky-400"
              : "bg-slate-400"
          }`} />
          {isListening ? "LISTENING" : isProcessing ? "ANALYZING" : isSpeaking ? "TALKING" : "COACH IDLE"}
        </div>
      </div>
    </div>
  );
}
