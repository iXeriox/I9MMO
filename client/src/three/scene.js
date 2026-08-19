import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

const CLASS_COLORS = {
  vanguard: 0xB26CFF,
  phasecaller: 0x4FE3C1,
  wraithhunter: 0xF4C868,
};

const KEYS = { w: false, a: false, s: false, d: false };
const MOVE_SPEED = 6;
const PORTAL_RADIUS = 3.2;

export function createRiftScene(container, { onPortalChange } = {}) {
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
      model
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
      group.add(
          makeLabel(
              nameLabel
          )
      );
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

  let activePortal =
      null;

  function setLocalPlayer({
                            callsign,
                            cls,
                            model,
                          }) {
    if (localAvatar) {
      scene.remove(
          localAvatar
      );
    }

    localColor =
        CLASS_COLORS[cls] ||
        0x4fe3c1;

    localAvatar =
        makeAvatar(
            localColor,
            callsign,
            model
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

      if (!entry) {
        const group =
            makeAvatar(
                CLASS_COLORS[p.class] ||
                0xffffff,
                p.callsign,
                p.model
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
    const k =
        e.key.toLowerCase();

    if (k in KEYS) {
      KEYS[k] = true;
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
          Number(KEYS.s);

      const rightInput =
          Number(KEYS.d) -
          Number(KEYS.a);

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
          0,
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

      const camTarget =
          new THREE.Vector3(
              local.x -
              Math.sin(
                  local.rotY
              ) *
              8,
              6,
              local.z -
              Math.cos(
                  local.rotY
              ) *
              8
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
    dispose,
  };
}