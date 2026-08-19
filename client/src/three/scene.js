import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

const CLASS_COLORS = {
  vanguard: 0xB26CFF,
  phasecaller: 0x4FE3C1,
  wraithhunter: 0xF4C868,
};

const KEYS = { w: false, a: false, s: false, d: false, q: false, e: false };
const MOVE_SPEED = 6;
const PORTAL_RADIUS = 3.2;

export function createRiftScene(container, { onPortalChange, onInteract } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07080d);
  scene.fog = new THREE.Fog(0x07080d, 25, 70);

  const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      200
  );

  camera.position.set(0, 6, 10);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  container.appendChild(renderer.domElement);

  // ---------- lighting ----------

  scene.add(
      new THREE.AmbientLight(0x8890c0, 0.65)
  );

  const key = new THREE.DirectionalLight(
      0xffffff,
      1.1
  );

  key.position.set(8, 14, 6);
  scene.add(key);

  const rim = new THREE.PointLight(
      0x4fe3c1,
      1.2,
      40
  );

  rim.position.set(-6, 4, -6);
  scene.add(rim);

  // ---------- deep-space backdrop ----------
  const starPositions = new Float32Array(1800);
  for (let i = 0; i < starPositions.length; i += 3) {
    const radius = 55 + Math.random() * 90;
    const theta = Math.random() * Math.PI * 2;
    const y = -10 + Math.random() * 85;
    starPositions[i] = Math.cos(theta) * radius;
    starPositions[i + 1] = y;
    starPositions[i + 2] = Math.sin(theta) * radius;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xbfd7ff, size: 0.22, sizeAttenuation: true })));

  const planet = new THREE.Mesh(
      new THREE.SphereGeometry(13, 40, 24),
      new THREE.MeshStandardMaterial({ color: 0x182b50, emissive: 0x071326, roughness: 0.82 })
  );
  planet.position.set(-42, 16, -64);
  scene.add(planet);

  function makeShuttle(index) {
    const shuttle = new THREE.Group();
    const hull = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.25, 1.35, 4, 10),
        new THREE.MeshStandardMaterial({ color: 0xa8b5c8, metalness: 0.8, roughness: 0.25 })
    );
    hull.rotation.z = Math.PI / 2;
    shuttle.add(hull);
    const wingMaterial = new THREE.MeshStandardMaterial({ color: 0x34425d, metalness: 0.7 });
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.06, 0.7), wingMaterial);
    shuttle.add(wing);
    const engine = new THREE.PointLight(index % 2 ? 0xb26cff : 0x4fe3c1, 2.5, 6);
    engine.position.x = -0.9;
    shuttle.add(engine);
    shuttle.userData = { radius: 34 + index * 8, speed: 0.035 + index * 0.008, phase: index * 2.1, height: 9 + index * 5 };
    scene.add(shuttle);
    return shuttle;
  }
  const shuttles = [0, 1, 2, 3].map(makeShuttle);

  // ---------- ground ----------

  const groundGeo = new THREE.CircleGeometry(
      30,
      64
  );

  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x0e1120,
    roughness: 0.95,
  });

  const ground = new THREE.Mesh(
      groundGeo,
      groundMat
  );

  ground.rotation.x = -Math.PI / 2;

  scene.add(ground);

  const grid = new THREE.GridHelper(
      60,
      60,
      0x272b41,
      0x1a1d2e
  );

  grid.position.y = 0.01;

  scene.add(grid);

  // Architectural language: a raised orbital concourse with luminous lane markings.
  const concourseMaterial = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.72, roughness: 0.32 });
  const trimMaterial = new THREE.MeshBasicMaterial({ color: 0x243f5f, transparent: true, opacity: 0.8 });
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.22, 18), concourseMaterial);
    deck.position.set(Math.sin(angle) * 13, 0, Math.cos(angle) * 13);
    deck.rotation.y = angle;
    scene.add(deck);
    const lane = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 16), trimMaterial);
    lane.position.copy(deck.position); lane.position.y = 0.13; lane.rotation.y = angle;
    scene.add(lane);
  }
  for (let i = 0; i < 12; i++) {
    const angle = i / 12 * Math.PI * 2;
    const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, 3.8, 8), concourseMaterial);
    pylon.position.set(Math.sin(angle) * 23, 1.8, Math.cos(angle) * 23);
    scene.add(pylon);
    const beacon = new THREE.PointLight(i % 3 === 0 ? 0xb26cff : 0x4fe3c1, 1.2, 7);
    beacon.position.set(pylon.position.x, 3.7, pylon.position.z);
    scene.add(beacon);
  }

  // ---------- Infini9 spawn dais ----------

  const dais = new THREE.Mesh(
      new THREE.CylinderGeometry(
          5.2,
          5.5,
          0.35,
          9
      ),
      new THREE.MeshStandardMaterial({
        color: 0x11172a,
        metalness: 0.65,
        roughness: 0.35,
      })
  );

  dais.position.y = -0.12;

  scene.add(dais);

  const nineRing = new THREE.Mesh(
      new THREE.TorusGeometry(
          3.25,
          0.055,
          8,
          72
      ),
      new THREE.MeshBasicMaterial({
        color: 0x4fe3c1,
        transparent: true,
        opacity: 0.75,
      })
  );

  nineRing.rotation.x = Math.PI / 2;
  nineRing.position.y = 0.075;

  scene.add(nineRing);

  const nodeGeometry =
      new THREE.OctahedronGeometry(0.13);

  const nodeMaterial =
      new THREE.MeshBasicMaterial({
        color: 0xb26cff,
      });

  for (let i = 0; i < 9; i++) {
    const angle =
        (i / 9) * Math.PI * 2;

    const node =
        new THREE.Mesh(
            nodeGeometry,
            nodeMaterial
        );

    node.position.set(
        Math.sin(angle) * 3.25,
        0.15,
        Math.cos(angle) * 3.25
    );

    scene.add(node);
  }

  const mark = makeLabel('∞ 9');

  mark.position.set(
      0,
      0.12,
      -0.15
  );

  mark.scale.set(
      2.4,
      0.6,
      1
  );

  mark.material.opacity = 0.48;
  mark.material.depthTest = true;
  mark.rotation.x = -Math.PI / 2;

  scene.add(mark);

  // ---------- portals ----------

  function makePortal(
      color,
      x,
      z
  ) {
    const group = new THREE.Group();

    const ringGeo =
        new THREE.TorusGeometry(
            1.7,
            0.14,
            16,
            48
        );

    const ringMat =
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.9,
          metalness: 0.3,
          roughness: 0.3,
        });

    const ring =
        new THREE.Mesh(
            ringGeo,
            ringMat
        );

    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.7;

    group.add(ring);

    const coreGeo =
        new THREE.CircleGeometry(
            1.5,
            32
        );

    const coreMat =
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.18,
          side: THREE.DoubleSide,
        });

    const core =
        new THREE.Mesh(
            coreGeo,
            coreMat
        );

    core.rotation.x = Math.PI / 2;
    core.position.y = 1.7;

    group.add(core);

    group.position.set(
        x,
        0,
        z
    );

    scene.add(group);

    return {
      group,
      ring,
    };
  }

  const portals = {
    solo: {
      ...makePortal(
          0x4fe3c1,
          -8,
          -6
      ),
      id: 'solo',
    },

    room: {
      ...makePortal(
          0xb26cff,
          8,
          -6
      ),
      id: 'room',
    },
    training: { ...makePortal(0xf4c868, -14, 9), id: 'training' },
    arcade: { ...makePortal(0x5a8cff, 14, 9), id: 'arcade' },
  };

  // ---------- local avatar ----------

  const loader = new GLTFLoader();

  const modelCache =
      new Map();

  function loadCharacter(model) {
    const safeModel =
        /^character-(female|male)-[a-f]$/.test(
            model || ''
        )
            ? model
            : 'character-female-a';

    if (
        !modelCache.has(
            safeModel
        )
    ) {
      modelCache.set(
          safeModel,
          loader.loadAsync(
              `/assets/characters/${safeModel}.glb`
          )
      );
    }

    return modelCache.get(
        safeModel
    );
  }

  function makeAvatar(
      colorHex,
      nameLabel,
      model,
      sigil = 'IX',
      hairColor = '#2B1A12',
      clothingColor = '#344D7A',
      level = 1
  ) {
    const group =
        new THREE.Group();

    const signal =
        new THREE.Mesh(
            new THREE.RingGeometry(
                0.52,
                0.62,
                24
            ),
            new THREE.MeshBasicMaterial({
              color: colorHex,
              transparent: true,
              opacity: 0.5,
              side: THREE.DoubleSide,
            })
        );

    signal.rotation.x =
        -Math.PI / 2;

    signal.position.y =
        0.035;

    group.add(signal);

    const personalMark = makeLabel(sigil);
    personalMark.position.set(0, 1.8, -0.35);
    personalMark.scale.set(0.7, 0.3, 1);
    personalMark.material.color.set(colorHex);
    group.add(personalMark);

    group.userData.motion =
        'idle';

    loadCharacter(model)
        .then((gltf) => {
          const body =
              cloneSkeleton(
                  gltf.scene
              );

          body.scale.setScalar(
              2.35
          );

          body.traverse(
              (object) => {
                if (
                    object.isMesh
                ) {
                  const isHead = object.name.toLowerCase().includes('head');
                  const paint = new THREE.Color(isHead ? hairColor : clothingColor);
                  const materials = Array.isArray(object.material) ? object.material : [object.material];
                  const painted = materials.map((material) => {
                    const clone = material.clone();
                    clone.color.copy(paint);
                    clone.metalness = isHead ? 0.05 : 0.28;
                    clone.roughness = isHead ? 0.72 : 0.46;
                    return clone;
                  });
                  object.material = Array.isArray(object.material) ? painted : painted[0];
                  object.castShadow =
                      true;

                  object.receiveShadow =
                      true;
                }
              }
          );

          group.add(body);

          const mixer =
              new THREE.AnimationMixer(
                  body
              );

          const actions =
              Object.fromEntries(
                  [
                    'idle',
                    'walk',
                    'sprint',
                  ].map(
                      (name) => {
                        const clip =
                            THREE.AnimationClip.findByName(
                                gltf.animations,
                                name
                            );

                        return [
                          name,
                          clip
                              ? mixer.clipAction(
                                  clip
                              )
                              : null,
                        ];
                      }
                  )
              );

          group.userData.mixer =
              mixer;

          group.userData.actions =
              actions;

          setAvatarMotion(
              group,
              group.userData.motion,
              true
          );
        })
        .catch(
            (error) => {
              console.error(
                  '[scene] unable to load character model',
                  error
              );
            }
        );

    if (nameLabel) {
      const name = makeLabel(nameLabel);
      name.position.y = 2.72;
      group.add(name);
      const levelLabel = makeLabel(`LV ${level}`);
      levelLabel.position.y = 2.36;
      levelLabel.scale.set(1.15, 0.3, 1);
      levelLabel.material.color.set(0x8b90ac);
      group.add(levelLabel);
    }

    return group;
  }

  function setAvatarMotion(
      group,
      motion,
      immediate = false
  ) {
    group.userData.motion =
        motion;

    const actions =
        group.userData.actions;

    if (!actions) {
      return;
    }

    const next =
        actions[motion] ||
        actions.idle;

    if (
        !next ||
        next ===
        group.userData.activeAction
    ) {
      return;
    }

    next
        .reset()
        .fadeIn(
            immediate
                ? 0
                : 0.18
        )
        .play();

    group.userData.activeAction
        ?.fadeOut(
            immediate
                ? 0
                : 0.18
        );

    group.userData.activeAction =
        next;
  }

  function makeLabel(text) {
    const canvas =
        document.createElement(
            'canvas'
        );

    canvas.width = 256;
    canvas.height = 64;

    const ctx =
        canvas.getContext(
            '2d'
        );

    ctx.font =
        '600 30px Space Grotesk, sans-serif';

    ctx.fillStyle =
        '#E9EAF4';

    ctx.textAlign =
        'center';

    ctx.fillText(
        text,
        128,
        44
    );

    const tex =
        new THREE.CanvasTexture(
            canvas
        );

    const mat =
        new THREE.SpriteMaterial({
          map: tex,
          transparent: true,
          depthTest: false,
        });

    const sprite =
        new THREE.Sprite(
            mat
        );

    sprite.scale.set(
        2.2,
        0.55,
        1
    );

    sprite.position.y =
        2.5;

    return sprite;
  }

  let localAvatar = null;
  let localColor = 0x4fe3c1;

  const local = {
    x: 0,
    z: 0,
    rotY: 0,
  };

  const velocity =
      new THREE.Vector2();
  let verticalVelocity = 0;
  let localY = 0;
  let jumpQueued = false;

  let activePortal =
      null;

  function setLocalPlayer({
                            callsign,
                            cls,
                            model,
                            accent,
                            sigil,
                            hairColor,
                            clothingColor,
                            level,
                          }) {
    if (localAvatar) {
      scene.remove(
          localAvatar
      );
    }

    localColor = new THREE.Color(accent || CLASS_COLORS[cls] || 0x4fe3c1).getHex();

    localAvatar =
        makeAvatar(
            localColor,
            callsign,
            model,
            sigil,
            hairColor,
            clothingColor,
            level
        );

    scene.add(
        localAvatar
    );
  }

  // ---------- remote avatars ----------

  const remotes =
      new Map();

  function syncRemotePlayers(
      list,
      selfCallsign
  ) {
    const seen =
        new Set();

    for (const p of list) {
      if (
          p.callsign ===
          selfCallsign
      ) {
        continue;
      }

      seen.add(
          p.callsign
      );

      let entry =
          remotes.get(
              p.callsign
          );

      const styleKey = [p.model, p.accent, p.sigil, p.hairColor, p.clothingColor, p.level].join('|');
      if (entry && entry.styleKey !== styleKey) {
        scene.remove(entry.group);
        remotes.delete(p.callsign);
        entry = null;
      }

      if (!entry) {
        const group =
            makeAvatar(
                new THREE.Color(p.accent || CLASS_COLORS[p.class] || 0xffffff).getHex(),
                p.callsign,
                p.model,
                p.sigil,
                p.hairColor,
                p.clothingColor,
                p.level
            );

        scene.add(group);

        entry = {
          group,

          target:
              new THREE.Vector3(
                  p.x,
                  0,
                  p.z
              ),

          lastX:
          p.x,

          lastZ:
          p.z,

          targetRotY:
              p.rotY || 0,

          movingUntil:
              0,
          styleKey,
        };

        remotes.set(
            p.callsign,
            entry
        );
      }

      const distanceMoved =
          Math.hypot(
              p.x -
              entry.lastX,
              p.z -
              entry.lastZ
          );

      if (
          distanceMoved >
          0.001
      ) {
        entry.movingUntil =
            performance.now() +
            180;
      }

      entry.target.set(
          p.x,
          0,
          p.z
      );

      entry.targetRotY =
          p.rotY || 0;

      entry.lastX =
          p.x;

      entry.lastZ =
          p.z;
    }

    for (
        const [
          callsign,
          entry,
        ] of remotes
        ) {
      if (
          !seen.has(
              callsign
          )
      ) {
        scene.remove(
            entry.group
        );

        remotes.delete(
            callsign
        );
      }
    }
  }

  // ---------- input ----------

  function onKeyDown(e) {
    if (!controlsEnabled || ['INPUT', 'TEXTAREA'].includes(e.target?.tagName) || e.target?.isContentEditable) return;
    const k =
        e.key.toLowerCase();

    if (k in KEYS) {
      KEYS[k] = true;
    }
    if (e.code === 'Space' && !e.repeat) {
      e.preventDefault();
      jumpQueued = true;
    }
    if (k === 'f' && !e.repeat && activePortal && ['training', 'arcade'].includes(activePortal)) {
      onInteract?.(activePortal);
    }
  }

  function onKeyUp(e) {
    const k =
        e.key.toLowerCase();

    if (k in KEYS) {
      KEYS[k] = false;
    }
  }

  window.addEventListener(
      'keydown',
      onKeyDown
  );

  window.addEventListener(
      'keyup',
      onKeyUp
  );

  let controlsEnabled = true;
  let dragging = false;
  let lastPointerX = 0;
  let cameraYaw = 0;
  let cameraPitch = 0.52;
  let cameraDistance = 10;

  function onPointerDown(event) {
    if (!controlsEnabled || event.button !== 0) return;
    dragging = true;
    lastPointerX = event.clientX;
    renderer.domElement.style.cursor = 'grabbing';
  }
  function onPointerMove(event) {
    if (!dragging || !controlsEnabled) return;
    cameraYaw -= (event.clientX - lastPointerX) * 0.006;
    cameraPitch = THREE.MathUtils.clamp(cameraPitch - event.movementY * 0.004, 0.22, 1.05);
    lastPointerX = event.clientX;
  }
  function onPointerUp() {
    dragging = false;
    renderer.domElement.style.cursor = controlsEnabled ? 'grab' : 'default';
  }
  function onWheel(event) {
    if (!controlsEnabled) return;
    cameraDistance = THREE.MathUtils.clamp(cameraDistance + event.deltaY * 0.01, 6, 16);
  }
  renderer.domElement.style.cursor = 'grab';
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('wheel', onWheel, { passive: true });

  function setControlsEnabled(enabled) {
    controlsEnabled = enabled;
    if (!enabled) Object.keys(KEYS).forEach((key) => { KEYS[key] = false; });
    if (!enabled) onPointerUp();
    renderer.domElement.style.cursor = enabled ? 'grab' : 'default';
  }

  // ---------- resize ----------

  function onResize() {
    camera.aspect =
        container.clientWidth /
        container.clientHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
        container.clientWidth,
        container.clientHeight
    );
  }

  window.addEventListener(
      'resize',
      onResize
  );

  // ---------- render loop ----------

  const clock =
      new THREE.Clock();

  let raf = null;
  let moveCallback =
      null;

  function onMove(fn) {
    moveCallback = fn;
  }

  function checkPortals() {
    let nearest =
        null;

    for (
        const key
        of Object.keys(
        portals
    )
        ) {
      const p =
          portals[key];

      const dx =
          local.x -
          p.group.position.x;

      const dz =
          local.z -
          p.group.position.z;

      const dist =
          Math.sqrt(
              dx * dx +
              dz * dz
          );

      if (
          dist <
          PORTAL_RADIUS
      ) {
        nearest = key;
      }
    }

    if (
        nearest !==
        activePortal
    ) {
      activePortal =
          nearest;

      onPortalChange?.(
          nearest
      );
    }
  }

  function tick() {
    raf =
        requestAnimationFrame(
            tick
        );

    const dt =
        Math.min(
            clock.getDelta(),
            0.1
        );

    const t =
        clock.getElapsedTime();

    nineRing.material.opacity =
        0.52 +
        Math.sin(
            t * 1.8
        ) *
        0.2;

    for (
        const key
        of Object.keys(
        portals
    )
        ) {
      portals[
          key
          ].ring.rotation.z =
          t * 0.6;
    }

    shuttles.forEach((shuttle) => {
      const flight = shuttle.userData;
      const angle = t * flight.speed + flight.phase;
      shuttle.position.set(Math.cos(angle) * flight.radius, flight.height + Math.sin(angle * 2) * 2, Math.sin(angle) * flight.radius - 18);
      shuttle.rotation.y = -angle;
    });

    if (localAvatar) {
      let dx = 0;
      let dz = 0;

      const forward =
          new THREE.Vector3(
              local.x -
              camera.position.x,
              0,
              local.z -
              camera.position.z
          ).normalize();

      const right =
          new THREE.Vector3(
              -forward.z,
              0,
              forward.x
          );

      const forwardInput =
          Number(KEYS.w) -
          Number(KEYS.s) +
          0.707 * (Number(KEYS.q) + Number(KEYS.e));

      const rightInput =
          Number(KEYS.d) -
          Number(KEYS.a) +
          0.707 * (Number(KEYS.e) - Number(KEYS.q));

      dx =
          forward.x *
          forwardInput +
          right.x *
          rightInput;

      dz =
          forward.z *
          forwardInput +
          right.z *
          rightInput;

      const len =
          Math.hypot(
              dx,
              dz
          );

      if (jumpQueued && localY <= 0.001) verticalVelocity = 6.4;
      jumpQueued = false;
      verticalVelocity -= 17 * dt;
      localY = Math.max(0, localY + verticalVelocity * dt);
      if (localY === 0) verticalVelocity = Math.max(0, verticalVelocity);

      const response =
          1 -
          Math.exp(
              -(
                  len > 0
                      ? 14
                      : 10
              ) *
              dt
          );

      if (len > 0) {
        dx /= len;
        dz /= len;

        velocity.lerp(
            new THREE.Vector2(
                dx *
                MOVE_SPEED,
                dz *
                MOVE_SPEED
            ),
            response
        );

        const desiredRotation =
            Math.atan2(
                dx,
                dz
            );

        local.rotY +=
            Math.atan2(
                Math.sin(
                    desiredRotation -
                    local.rotY
                ),
                Math.cos(
                    desiredRotation -
                    local.rotY
                )
            ) *
            response;
      } else {
        velocity.lerp(
            new THREE.Vector2(),
            response
        );
      }

      local.x =
          Math.max(
              -28,
              Math.min(
                  28,
                  local.x +
                  velocity.x *
                  dt
              )
          );

      local.z =
          Math.max(
              -28,
              Math.min(
                  28,
                  local.z +
                  velocity.y *
                  dt
              )
          );

      localAvatar.position.set(
          local.x,
          localY,
          local.z
      );

      localAvatar.rotation.y =
          local.rotY;

      const speed =
          velocity.length();

      setAvatarMotion(
          localAvatar,
          speed > 0.35
              ? 'walk'
              : 'idle'
      );

      localAvatar.userData.mixer
          ?.update(dt);

      if (
          speed >
          0.05
      ) {
        moveCallback?.({
          x: local.x,
          z: local.z,
          rotY:
          local.rotY,
        });
      }

      checkPortals();

      const horizontalDistance = Math.cos(cameraPitch) * cameraDistance;
      const camTarget = new THREE.Vector3(
          local.x + Math.sin(cameraYaw) * horizontalDistance,
          1.2 + Math.sin(cameraPitch) * cameraDistance,
          local.z + Math.cos(cameraYaw) * horizontalDistance
      );

      camera.position.lerp(
          camTarget,
          1 -
          Math.pow(
              0.001,
              dt
          )
      );

      camera.lookAt(
          local.x,
          1.2,
          local.z
      );
    }

    for (
        const entry
        of remotes.values()
        ) {
      entry.group.position.lerp(
          entry.target,
          1 -
          Math.exp(
              -12 * dt
          )
      );

      const delta =
          Math.atan2(
              Math.sin(
                  entry.targetRotY -
                  entry.group.rotation.y
              ),
              Math.cos(
                  entry.targetRotY -
                  entry.group.rotation.y
              )
          );

      entry.group.rotation.y +=
          delta *
          (
              1 -
              Math.exp(
                  -12 * dt
              )
          );

      setAvatarMotion(
          entry.group,
          performance.now() <
          entry.movingUntil
              ? 'walk'
              : 'idle'
      );

      entry.group.userData.mixer
          ?.update(dt);
    }

    renderer.render(
        scene,
        camera
    );
  }

  tick();

  function dispose() {
    cancelAnimationFrame(
        raf
    );

    window.removeEventListener(
        'keydown',
        onKeyDown
    );

    window.removeEventListener(
        'keyup',
        onKeyUp
    );

    window.removeEventListener(
      'resize',
      onResize
    );
    renderer.domElement.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    renderer.domElement.removeEventListener('wheel', onWheel);

    renderer.dispose();

    if (
        renderer.domElement
            .parentNode
    ) {
      renderer.domElement.parentNode.removeChild(
          renderer.domElement
      );
    }
  }

  return {
    setLocalPlayer,
    syncRemotePlayers,
    onMove,
    setControlsEnabled,
    dispose,
  };
}
