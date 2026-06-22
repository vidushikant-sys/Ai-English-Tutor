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
    topLip: THREE.Mesh | null;
    bottomLip: THREE.Mesh | null;
    leftEye: THREE.Group | null;
    rightEye: THREE.Group | null;
    leftEyelid: THREE.Mesh | null;
    rightEyelid: THREE.Mesh | null;
    hairBun: THREE.Mesh | null;
    leftEarring: THREE.Mesh | null;
    rightEarring: THREE.Mesh | null;
  }>({
    headGroup: null,
    topLip: null,
    bottomLip: null,
    leftEye: null,
    rightEye: null,
    leftEyelid: null,
    rightEyelid: null,
    hairBun: null,
    leftEarring: null,
    rightEarring: null,
  });

  // State values that can change inside the animation frame
  const animatedStateRef = useRef({
    isSpeaking,
    isListening,
    isProcessing,
    mouse: new THREE.Vector2(),
    targetMouse: new THREE.Vector2(),
    blinkTimer: 0,
    blinkDuration: 0.15,
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

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = null; // Transparent background to blend into the web page's smooth gradients

    // 2. Camera setup - tight portrait lens
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.15, 2.4);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // 4. Studio Lighting for realistic skin glow
    const ambientLight = new THREE.AmbientLight(0xfff3eb, 0.65);
    scene.add(ambientLight);

    // Main studio key light (creates elegant highlights)
    const keyLight = new THREE.DirectionalLight(0xfffaec, 1.4);
    keyLight.position.set(1.5, 2, 2.5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    // Soft warm fill light
    const fillLight = new THREE.DirectionalLight(0xffedd5, 0.7);
    fillLight.position.set(-2, -0.5, 1.5);
    scene.add(fillLight);

    // Blue/cyan secondary ambient back key
    const backRimLight = new THREE.DirectionalLight(0xdbeafe, 1.0);
    backRimLight.position.set(0, 1.5, -2);
    scene.add(backRimLight);

    // 5. Creating a Stunning Humanoid Female AI Tutor Avatar (Serena!)
    const avatarGroup = new THREE.Group();
    avatarGroup.position.set(0, -0.6, 0);
    scene.add(avatarGroup);

    // Beautiful realistic color materials
    const skinMaterial = new THREE.MeshStandardMaterial({
      color: 0xfdbca5, // Beautiful soft beachy shell pink skin tone
      roughness: 0.55,
      metalness: 0.02,
    });

    const hairMaterial = new THREE.MeshStandardMaterial({
      color: 0x241812, // Gorgeous rich brunette hair
      roughness: 0.8,
      metalness: 0.05,
    });

    const clothingBlue = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8, // Modern vivid royal blue tunic
      roughness: 0.6,
      metalness: 0.1,
    });

    const clothingWhite = new THREE.MeshStandardMaterial({
      color: 0xf8fafc, // Pristine white inner top collar
      roughness: 0.5,
    });

    const eyeWhiteMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
    });

    const irisMaterial = new THREE.MeshStandardMaterial({
      color: 0x2563eb, // Rich brilliant blue hazel sapphire iris
      roughness: 0.2,
      metalness: 0.35,
    });

    const pupilMaterial = new THREE.MeshStandardMaterial({
      color: 0x0c0f17, // Natural dark pupils
      roughness: 0.05,
    });

    const makeupCheekMaterial = new THREE.MeshBasicMaterial({
      color: 0xf43f5e, // Rosy peach blush
      transparent: true,
      opacity: 0.25,
    });

    const lipMaterial = new THREE.MeshStandardMaterial({
      color: 0xfa5272, // Stylish beautiful coral rose lips
      roughness: 0.22,
    });

    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Elegant gold earrings
      roughness: 0.18,
      metalness: 0.9,
    });

    // A. Elegant Shoulders & Neck
    const neckGeo = new THREE.CylinderGeometry(0.1, 0.115, 0.22, 16);
    const neckMesh = new THREE.Mesh(neckGeo, skinMaterial);
    neckMesh.position.set(0, 0.5, 0);
    avatarGroup.add(neckMesh);

    // Elegant Tunic Shoulders
    const collarGeo = new THREE.CylinderGeometry(0.24, 0.44, 0.45, 32);
    const collarMesh = new THREE.Mesh(collarGeo, clothingWhite);
    collarMesh.position.set(0, 0.22, 0);
    avatarGroup.add(collarMesh);

    const shouldersGeo = new THREE.CylinderGeometry(0.26, 0.47, 0.4, 32);
    const shouldersMesh = new THREE.Mesh(shouldersGeo, clothingBlue);
    shouldersMesh.position.set(0, 0.18, 0);
    shouldersMesh.scale.set(1.4, 1, 0.8); // Natural shoulder width proportion
    avatarGroup.add(shouldersMesh);

    // B. Head Group (Gaze Tracking & head sway)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.76, 0.02);
    avatarGroup.add(headGroup);
    meshesRef.current.headGroup = headGroup;

    // Face/Skull base structure
    const skullGeo = new THREE.SphereGeometry(0.33, 32, 32);
    skullGeo.scale(1, 1.25, 0.92); // Elegant oval feminine face shape
    const skullMesh = new THREE.Mesh(skullGeo, skinMaterial);
    // Face tilts very slightly forward naturally
    skullMesh.position.set(0, 0, 0);
    headGroup.add(skullMesh);

    // Soft Cheek Blush Highlights (spheres intersecting slightly)
    const leftBlushGeo = new THREE.SphereGeometry(0.08, 16, 16);
    leftBlushGeo.scale(1, 0.8, 0.4);
    const leftBlush = new THREE.Mesh(leftBlushGeo, makeupCheekMaterial);
    leftBlush.position.set(-0.16, -0.06, 0.24);
    headGroup.add(leftBlush);

    const rightBlushGeo = new THREE.SphereGeometry(0.08, 16, 16);
    rightBlushGeo.scale(1, 0.8, 0.4);
    const rightBlush = new THREE.Mesh(rightBlushGeo, makeupCheekMaterial);
    rightBlush.position.set(0.16, -0.06, 0.24);
    headGroup.add(rightBlush);

    // C. Natural Feminine Eye Assemblies (Left & Right)
    const eyeSocketGeo = new THREE.SphereGeometry(0.05, 16, 16);
    eyeSocketGeo.scale(1, 0.9, 0.55);

    // Left Eye Socket Group
    const leftEyeGroup = new THREE.Group();
    leftEyeGroup.position.set(-0.11, 0.06, 0.26);
    headGroup.add(leftEyeGroup);
    meshesRef.current.leftEye = leftEyeGroup;

    const leftGlobe = new THREE.Mesh(eyeSocketGeo, eyeWhiteMaterial);
    leftEyeGroup.add(leftGlobe);

    const leftIrisGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.015, 16);
    leftIrisGeo.rotateX(Math.PI / 2);
    const leftIris = new THREE.Mesh(leftIrisGeo, irisMaterial);
    leftIris.position.set(0, 0, 0.022);
    leftEyeGroup.add(leftIris);

    const leftPupilGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.017, 16);
    leftPupilGeo.rotateX(Math.PI / 2);
    const leftPupil = new THREE.Mesh(leftPupilGeo, pupilMaterial);
    leftPupil.position.set(0, 0, 0.024);
    leftEyeGroup.add(leftPupil);

    // Right Eye Socket Group
    const rightEyeGroup = new THREE.Group();
    rightEyeGroup.position.set(0.11, 0.06, 0.26);
    headGroup.add(rightEyeGroup);
    meshesRef.current.rightEye = rightEyeGroup;

    const rightGlobe = new THREE.Mesh(eyeSocketGeo, eyeWhiteMaterial);
    rightEyeGroup.add(rightGlobe);

    const rightIrisGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.015, 16);
    rightIrisGeo.rotateX(Math.PI / 2);
    const rightIris = new THREE.Mesh(rightIrisGeo, irisMaterial);
    rightIris.position.set(0, 0, 0.022);
    rightEyeGroup.add(rightIris);

    const rightPupilGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.017, 16);
    rightPupilGeo.rotateX(Math.PI / 2);
    const rightPupil = new THREE.Mesh(rightPupilGeo, pupilMaterial);
    rightPupil.position.set(0, 0, 0.024);
    rightEyeGroup.add(rightPupil);

    // D. Soft Eyelids for natural Blinking
    const leftEyelidGeo = new THREE.SphereGeometry(0.052, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    leftEyelidGeo.rotateX(-Math.PI / 2);
    const leftEyelid = new THREE.Mesh(leftEyelidGeo, skinMaterial);
    leftEyelid.position.set(-0.11, 0.075, 0.265);
    leftEyelid.scale.set(1.05, 0.1, 1.05); // Closed state changes scaling
    headGroup.add(leftEyelid);
    meshesRef.current.leftEyelid = leftEyelid;

    const rightEyelid = new THREE.Mesh(leftEyelidGeo, skinMaterial);
    rightEyelid.position.set(0.11, 0.075, 0.265);
    rightEyelid.scale.set(1.05, 0.1, 1.05);
    headGroup.add(rightEyelid);
    meshesRef.current.rightEyelid = rightEyelid;

    // E. Elegant Arched Eyebrows
    const browGeo = new THREE.BoxGeometry(0.09, 0.012, 0.01);
    const leftBrow = new THREE.Mesh(browGeo, hairMaterial);
    leftBrow.position.set(-0.11, 0.14, 0.29);
    leftBrow.rotation.z = -0.09;
    headGroup.add(leftBrow);

    const rightBrow = new THREE.Mesh(browGeo, hairMaterial);
    rightBrow.position.set(0.11, 0.14, 0.29);
    rightBrow.rotation.z = 0.09;
    headGroup.add(rightBrow);

    // F. Cute Natural Female Nose
    const noseGeo = new THREE.ConeGeometry(0.035, 0.09, 4);
    noseGeo.rotateX(-0.1); // natural nose bridge tilt
    const noseMesh = new THREE.Mesh(noseGeo, skinMaterial);
    noseMesh.position.set(0, -0.02, 0.315);
    noseMesh.scale.set(1, 1, 0.5);
    headGroup.add(noseMesh);

    // G. Lip-Synced Humanoid Soft Lips (Top & Bottom parted during speaking!)
    const lipTopGeo = new THREE.SphereGeometry(0.05, 16, 8);
    lipTopGeo.scale(1.4, 0.3, 0.4);
    const topLip = new THREE.Mesh(lipTopGeo, lipMaterial);
    topLip.position.set(0, -0.13, 0.3);
    headGroup.add(topLip);
    meshesRef.current.topLip = topLip;

    const lipBottomGeo = new THREE.SphereGeometry(0.045, 16, 8);
    lipBottomGeo.scale(1.3, 0.36, 0.45);
    const bottomLip = new THREE.Mesh(lipBottomGeo, lipMaterial);
    bottomLip.position.set(0, -0.155, 0.295);
    headGroup.add(bottomLip);
    meshesRef.current.bottomLip = bottomLip;

    // H. Beautiful Styled Hair (Elegant rich brunette up-bun with side curls!)
    const hairCapGeo = new THREE.SphereGeometry(0.355, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.72);
    hairCapGeo.scale(1, 1.05, 1.03);
    const hairCap = new THREE.Mesh(hairCapGeo, hairMaterial);
    hairCap.position.set(0, 0.1, -0.01);
    headGroup.add(hairCap);

    // Top Sweeping Bangs - framing her forehead beautifully!
    const hairBangLGeo = new THREE.SphereGeometry(0.14, 16, 16);
    hairBangLGeo.scale(1.4, 0.5, 0.6);
    const hairBangL = new THREE.Mesh(hairBangLGeo, hairMaterial);
    hairBangL.position.set(-0.13, 0.22, 0.22);
    hairBangL.rotation.set(0.2, 0.1, -0.32);
    headGroup.add(hairBangL);

    const hairBangRGeo = new THREE.SphereGeometry(0.14, 16, 16);
    hairBangRGeo.scale(1.4, 0.5, 0.6);
    const hairBangR = new THREE.Mesh(hairBangRGeo, hairMaterial);
    hairBangR.position.set(0.13, 0.22, 0.22);
    hairBangR.rotation.set(0.2, -0.1, 0.32);
    headGroup.add(hairBangR);

    // Side Curls falling near shoulders
    const curlLGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.4, 16);
    const curlL = new THREE.Mesh(curlLGeo, hairMaterial);
    curlL.position.set(-0.29, -0.1, 0.12);
    curlL.rotation.z = 0.12;
    headGroup.add(curlL);

    const curlRGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.4, 16);
    const curlR = new THREE.Mesh(curlRGeo, hairMaterial);
    curlR.position.set(0.29, -0.1, 0.12);
    curlR.rotation.z = -0.12;
    headGroup.add(curlR);

    // Elegant Hair Bun at the back for a classy teacher vibe!
    const bunGeo = new THREE.SphereGeometry(0.15, 24, 24);
    bunGeo.scale(1, 1, 0.8);
    const hairBun = new THREE.Mesh(bunGeo, hairMaterial);
    hairBun.position.set(0, 0.28, -0.25);
    headGroup.add(hairBun);
    meshesRef.current.hairBun = hairBun;

    // I. Elegant Gold Earrings
    const ringGeo = new THREE.TorusGeometry(0.04, 0.01, 8, 24);
    const earringL = new THREE.Mesh(ringGeo, goldMaterial);
    earringL.position.set(-0.31, -0.1, 0.06);
    earringL.rotation.y = Math.PI / 2;
    headGroup.add(earringL);
    meshesRef.current.leftEarring = earringL;

    const earringR = new THREE.Mesh(ringGeo, goldMaterial);
    earringR.position.set(0.31, -0.1, 0.06);
    earringR.rotation.y = Math.PI / 2;
    headGroup.add(earringR);
    meshesRef.current.rightEarring = earringR;

    // 6. Animation ticker clock
    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();
      const state = animatedStateRef.current;

      // Subtle breath flow
      const breathing = Math.sin(elapsedTime * 1.8) * 0.008;
      avatarGroup.position.y = -0.6 + breathing;
      avatarGroup.position.x = Math.sin(elapsedTime * 0.6) * 0.005;

      // Gaze/Mouse tracking
      state.mouse.x = THREE.MathUtils.lerp(state.mouse.x, state.targetMouse.x, 0.065);
      state.mouse.y = THREE.MathUtils.lerp(state.mouse.y, state.targetMouse.y, 0.065);

      if (headGroup) {
        // Soft head swaying
        headGroup.rotation.z = Math.sin(elapsedTime * 0.9) * 0.015;
        // Tilt head to look towards mouse cursor
        headGroup.rotation.y = state.mouse.x * 0.35;
        headGroup.rotation.x = state.mouse.y * 0.18 + 0.04; // natural forward gaze offset
      }

      // Eye movements matching head group with subtle offsets to feel extremely lifelike
      if (leftEyeGroup && rightEyeGroup) {
        leftEyeGroup.rotation.y = state.mouse.x * 0.15;
        leftEyeGroup.rotation.x = state.mouse.y * 0.1;

        rightEyeGroup.rotation.y = state.mouse.x * 0.15;
        rightEyeGroup.rotation.x = state.mouse.y * 0.1;
      }

      // Blinking simulator
      if (state.isBlinking) {
        state.blinkTimer += clock.getDelta();
        const progress = state.blinkTimer / state.blinkDuration;

        if (progress >= 1.0) {
          state.isBlinking = false;
          state.blinkTimer = 0;
          if (leftEyelid) leftEyelid.scale.y = 0.1;
          if (rightEyelid) rightEyelid.scale.y = 0.1;
        } else {
          // Half closed scale cycle
          const scaleCurve = progress < 0.5 ? 0.1 + (progress * 2 * 0.9) : 1.0 - ((progress - 0.5) * 2 * 0.9);
          const lidThicknessY = Math.min(1.0, Math.max(0.1, scaleCurve));
          if (leftEyelid) leftEyelid.scale.y = lidThicknessY;
          if (rightEyelid) rightEyelid.scale.y = lidThicknessY;
        }
      } else {
        // Idle eyelids resting open slightly (0.1 Y scale is fully retracted open)
        if (leftEyelid) leftEyelid.scale.y = 0.1;
        if (rightEyelid) rightEyelid.scale.y = 0.1;

        // Random trigger to blink (about once every 3-4 seconds)
        if (Math.random() < 0.006) {
          state.isBlinking = true;
          state.blinkTimer = 0;
        }
      }

      // Speech Lip Sync dynamic jaw/lip splitting!
      if (topLip && bottomLip) {
        if (state.isSpeaking) {
          // Speak phonetic vibration oscillators
          const wordOpening = Math.abs(
            Math.sin(elapsedTime * 15) * Math.cos(elapsedTime * 7) + 
            Math.sin(elapsedTime * 4.5) * 0.35
          );

          // Top Lip slides slightly up
          topLip.position.y = -0.13 + wordOpening * 0.018;
          // Bottom Lip slides down
          bottomLip.position.y = -0.155 - wordOpening * 0.038;
          // Narrow width slightly on phonetic vowels
          topLip.scale.x = 1.4 - wordOpening * 0.1;
          bottomLip.scale.x = 1.3 - wordOpening * 0.1;
        } else if (state.isProcessing) {
          // Gentle wiggle thinking lips
          topLip.position.y = -0.13;
          bottomLip.position.y = -0.155 + Math.sin(elapsedTime * 12) * 0.002;
          topLip.scale.x = 1.35;
          bottomLip.scale.x = 1.25;
        } else {
          // Restore quiet serene resting lips
          topLip.position.y = THREE.MathUtils.lerp(topLip.position.y, -0.13, 0.15);
          bottomLip.position.y = THREE.MathUtils.lerp(bottomLip.position.y, -0.155, 0.15);
          topLip.scale.x = THREE.MathUtils.lerp(topLip.scale.x, 1.4, 0.15);
          bottomLip.scale.x = THREE.MathUtils.lerp(bottomLip.scale.x, 1.3, 0.15);
        }
      }

      // Elegant hair / earring physics wiggle
      if (hairBun) {
        hairBun.rotation.x = Math.sin(elapsedTime * 2.2) * 0.04;
      }
      if (earringL && earringR) {
        earringL.rotation.z = Math.sin(elapsedTime * 4) * 0.08;
        earringR.rotation.z = Math.cos(elapsedTime * 4) * 0.08;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Canvas Resize observer handler
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

    // cleanup webgl scenes to avoid web memory leak
    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      container.removeChild(renderer.domElement);
      renderer.dispose();

      neckGeo.dispose();
      collarGeo.dispose();
      shouldersGeo.dispose();
      skullGeo.dispose();
      leftBlushGeo.dispose();
      rightBlushGeo.dispose();
      eyeSocketGeo.dispose();
      leftIrisGeo.dispose();
      leftPupilGeo.dispose();
      rightIrisGeo.dispose();
      rightPupilGeo.dispose();
      leftEyelidGeo.dispose();
      browGeo.dispose();
      noseGeo.dispose();
      lipTopGeo.dispose();
      lipBottomGeo.dispose();
      hairCapGeo.dispose();
      hairBangLGeo.dispose();
      hairBangRGeo.dispose();
      curlLGeo.dispose();
      curlRGeo.dispose();
      bunGeo.dispose();
      ringGeo.dispose();

      skinMaterial.dispose();
      hairMaterial.dispose();
      clothingBlue.dispose();
      clothingWhite.dispose();
      eyeWhiteMaterial.dispose();
      irisMaterial.dispose();
      pupilMaterial.dispose();
      makeupCheekMaterial.dispose();
      lipMaterial.dispose();
      goldMaterial.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      id="serena-humanoid-avatar-container"
      className="w-full h-full relative overflow-hidden flex items-center justify-center cursor-pointer select-none bg-radial from-blue-50/50 via-white/80 to-blue-50/20"
      title="Serena reacts and gazes at your mouse movements!"
    >
      {/* Absolute indicator badge */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 bg-white/95 backdrop-blur-md text-[10px] font-bold text-slate-500 rounded-full shadow-xs border border-slate-100 uppercase tracking-widest pointer-events-none select-none">
        <span className={`w-1.5 h-1.5 rounded-full ${
          isSpeaking 
            ? "bg-rose-500 animate-pulse" 
            : isListening 
            ? "bg-green-500 animate-ping" 
            : isProcessing 
            ? "bg-blue-500 animate-spin" 
            : "bg-slate-300"
        }`} />
        {isSpeaking ? "Speaking" : isListening ? "Listening" : isProcessing ? "Thinking" : "Online"}
      </div>
    </div>
  );
}
