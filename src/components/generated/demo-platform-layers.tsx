import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Minus, Pause, Play, Plus, RotateCcw, Send, SkipBack, SkipForward } from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// WebGL 讀不到 CSS 變數：傳給 three 的顏色集中成檔內常數，逐一註明 trendlink-design token
const C = {
  plate: 0xe1e6ee, // --neutral-200
  plateEdge: 0xcbd3df, // --neutral-300
  ground: 0xe1e6ee, // --neutral-200
  uiBlock: 0x348bc9, // --sky-500
  svcBlock: 0x1f5aa6, // --blue-600
  dataBlock: 0x112f5d, // --blue-900
  blockEdge: 0xadc8e8, // --blue-200
  edge: 0x7ba6da, // --blue-300
  active: 0xed9b26, // --orange-400
  visited: 0xf6cd86, // --orange-200
} as const;

const H = 420;
const FRUSTUM = 12;
const ZOOM = { min: 0.8, max: 1.8, step: 0.2 };
const TARGET_Y = 3.2;
const TOTAL = 7;
const PLAY_MS = 1800;

type Layer = "ui" | "svc" | "data";
const LAYERS: { id: Layer; label: string; y: number; color: number }[] = [
  { id: "ui", label: "介面層", y: 6.4, color: C.uiBlock },
  { id: "svc", label: "服務層", y: 3.2, color: C.svcBlock },
  { id: "data", label: "資料層", y: 0, color: C.dataBlock },
];
const PLATE = { x: 6.4, y: 0.16, z: 3.6 };
const BLOCK = { x: 1.4, y: 0.7, z: 1.2 };

type Block = { id: string; label: string; layer: Layer; x: number; generic: string };
const BLOCKS: Block[] = [
  { id: "form", label: "請假表單", layer: "ui", x: -1.6, generic: "員工填寫並送出請假申請的畫面。" },
  { id: "app", label: "簽核 App", layer: "ui", x: 1.6, generic: "主管收通知、核准或退回的 App。" },
  { id: "rules", label: "假別規則", layer: "svc", x: -2.2, generic: "判斷假別是否可請、時數是否合規。" },
  { id: "flow", label: "簽核流程", layer: "svc", x: 0, generic: "建立簽核單並依序送給對應主管。" },
  { id: "notify", label: "通知", layer: "svc", x: 2.2, generic: "把待簽核提醒送給對應的人。" },
  { id: "emp", label: "員工資料", layer: "data", x: -1.6, generic: "員工基本資料、特休餘額與直屬主管。" },
  { id: "log", label: "假勤紀錄", layer: "data", x: 1.6, generic: "每一筆請假與簽核結果的紀錄。" },
];
const layerY = (l: Layer) => LAYERS.find((x) => x.id === l)!.y;
const blockCenterY = (b: Block) => layerY(b.layer) + 0.43;
const blockIndex = (id: string) => BLOCKS.findIndex((b) => b.id === id);

// 逐步路徑：第 n 步（1 起算）高亮的方塊與說明
const PATH: { id: string; text: string }[] = [
  { id: "form", text: "員工填寫特休 8 小時，按下送出。申請從最上層的介面出發。" },
  { id: "rules", text: "檢查假別與時數是否符合規定，例如特休可請、需事前申請。" },
  { id: "emp", text: "查詢特休餘額與直屬主管。服務層只讀自己需要的資料。" },
  { id: "flow", text: "餘額足夠，建立簽核單並指派給直屬主管。" },
  { id: "log", text: "寫入一筆「待簽核」的請假紀錄，之後核准才會正式扣假。" },
  { id: "notify", text: "產生待簽核提醒，準備送給直屬主管。" },
  { id: "app", text: "主管收到通知，可核准或退回。申請由這裡再回到簽核流程。" },
];
// 連線：[上游, 下游]；E1..E6 依序為第 2..7 步進入的連線，E7 不在路徑
const EDGES: [string, string][] = [
  ["form", "rules"],
  ["rules", "emp"],
  ["rules", "flow"],
  ["flow", "log"],
  ["flow", "notify"],
  ["notify", "app"],
  ["app", "flow"],
];

type Api = { apply: () => void; zoom: (d: number) => void; reset: () => void };

function edgeEnds(a: Block, b: Block): [THREE.Vector3, THREE.Vector3] {
  if (a.layer === b.layer) {
    const dir = b.x > a.x ? 1 : -1;
    const y = blockCenterY(a);
    return [new THREE.Vector3(a.x + (dir * BLOCK.x) / 2, y, 0.6), new THREE.Vector3(b.x - (dir * BLOCK.x) / 2, y, 0.6)];
  }
  // 跨層：上方方塊中心 -> 下方方塊頂面中心
  const upper = layerY(a.layer) > layerY(b.layer) ? a : b;
  const lower = upper === a ? b : a;
  const p1 = new THREE.Vector3(upper.x, blockCenterY(upper), 0.6);
  const p2 = new THREE.Vector3(lower.x, blockCenterY(lower) + BLOCK.y / 2, 0.6);
  return [p1, p2];
}

function makeCylinder(p1: THREE.Vector3, p2: THREE.Vector3, color: number): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(0.03, 0.03, len, 8);
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color }));
  mesh.position.copy(p1).add(p2).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return mesh;
}

export default function DemoPlatformLayers() {
  const hostRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const layerLabelRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const api = useRef<Api | null>(null);
  const stateRef = useRef<{ step: number; picked: string | null }>({ step: 0, picked: null });
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const reduce = useReducedMotion();

  useEffect(() => {
    const host = hostRef.current;
    const gl = glRef.current;
    if (!host || !gl) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      setWebgl(false);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    gl.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    camera.position.set(10, 10 + TARGET_Y, 10);
    camera.lookAt(0, TARGET_Y, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, C.ground, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(4, 14, 6);
    scene.add(sun);

    // 三層板子
    LAYERS.forEach((l) => {
      const geo = new THREE.BoxGeometry(PLATE.x, PLATE.y, PLATE.z);
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshLambertMaterial({ color: C.plate, transparent: true, opacity: 0.7, depthWrite: false }),
      );
      mesh.position.set(0, l.y, 0);
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: C.plateEdge })));
      scene.add(mesh);
    });

    // 元件方塊
    const baseColor = (b: Block) => LAYERS.find((l) => l.id === b.layer)!.color;
    const meshes = BLOCKS.map((b, i) => {
      const geo = new THREE.BoxGeometry(BLOCK.x, BLOCK.y, BLOCK.z);
      const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: baseColor(b) }));
      mesh.position.set(b.x, blockCenterY(b), 0.6);
      mesh.userData.index = i;
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: C.blockEdge })));
      scene.add(mesh);
      return mesh;
    });

    // 連線
    const edgeMeshes = EDGES.map(([from, to]) => {
      const [p1, p2] = edgeEnds(BLOCKS[blockIndex(from)], BLOCKS[blockIndex(to)]);
      const m = makeCylinder(p1, p2, C.edge);
      scene.add(m);
      return m;
    });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, TARGET_Y, 0);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minPolarAngle = THREE.MathUtils.degToRad(20);
    controls.maxPolarAngle = THREE.MathUtils.degToRad(70);
    controls.enableDamping = !reduce;
    controls.update();
    controls.saveState();

    let raf = 0;
    let visible = true;
    const v = new THREE.Vector3();
    const place = (el: HTMLSpanElement | null, x: number, y: number, z: number, w: number, offset: string) => {
      if (!el) return;
      v.set(x, y, z).project(camera);
      el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * H}px) ${offset}`;
      el.style.opacity = "1";
    };
    const frame = () => {
      raf = 0;
      const moving = controls.update();
      renderer.render(scene, camera);
      const w = host.clientWidth;
      BLOCKS.forEach((b, i) => place(labelRefs.current[i], b.x, blockCenterY(b) + BLOCK.y / 2 + 0.05, 0.6, w, "translate(-50%, -120%)"));
      LAYERS.forEach((l, i) => place(layerLabelRefs.current[i], -3.0, l.y + 0.1, 1.8, w, "translate(-50%, -50%)"));
      if (moving && !reduce) invalidate();
    };
    const invalidate = () => {
      if (!raf && visible) raf = requestAnimationFrame(frame);
    };
    controls.addEventListener("change", invalidate);

    const resize = () => {
      const w = host.clientWidth;
      const aspect = w / H;
      renderer.setSize(w, H);
      camera.left = (-FRUSTUM * aspect) / 2;
      camera.right = (FRUSTUM * aspect) / 2;
      camera.top = FRUSTUM / 2;
      camera.bottom = -FRUSTUM / 2;
      camera.updateProjectionMatrix();
      invalidate();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) invalidate();
    });
    io.observe(host);

    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) return;
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(meshes, false)[0];
      if (hit) {
        setPlaying(false);
        setStep(0);
        setPicked(BLOCKS[hit.object.userData.index as number].id);
      }
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);

    api.current = {
      apply: () => {
        const { step: s, picked: p } = stateRef.current;
        const activeId = p ?? (s >= 1 ? PATH[s - 1].id : null);
        const visitedIds = new Set<string>(p ? [] : PATH.slice(0, Math.max(0, s - 1)).map((x) => x.id));
        meshes.forEach((m, i) => {
          const b = BLOCKS[i];
          const color = b.id === activeId ? C.active : visitedIds.has(b.id) ? C.visited : baseColor(b);
          (m.material as THREE.MeshLambertMaterial).color.setHex(color);
        });
        edgeMeshes.forEach((m, i) => {
          // E(i+1) 於第 i+2 步進入
          const enterStep = i + 2;
          let color: number = C.edge;
          if (!p && i < 6) {
            if (s === enterStep) color = C.active;
            else if (s > enterStep) color = C.visited;
          }
          (m.material as THREE.MeshLambertMaterial).color.setHex(color);
        });
        invalidate();
      },
      zoom: (d) => {
        camera.zoom = THREE.MathUtils.clamp(camera.zoom + d, ZOOM.min, ZOOM.max);
        camera.updateProjectionMatrix();
        invalidate();
      },
      reset: () => {
        controls.reset();
        invalidate();
      },
    };
    api.current.apply();

    return () => {
      api.current = null;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      controls.removeEventListener("change", invalidate);
      controls.dispose();
      scene.traverse((o) => {
        if (!(o instanceof THREE.Mesh || o instanceof THREE.LineSegments)) return;
        o.geometry.dispose();
        const mats: THREE.Material[] = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => {
          Object.values(m).forEach((val) => val instanceof THREE.Texture && val.dispose());
          m.dispose();
        });
      });
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [reduce]);

  useEffect(() => {
    stateRef.current = { step, picked };
    api.current?.apply();
  }, [step, picked]);

  // 播放：每 1800ms 前進一步，到第 7 步停止、不循環
  useEffect(() => {
    if (!playing) return;
    if (step >= TOTAL) {
      setPlaying(false);
      return;
    }
    const t = window.setTimeout(() => setStep((s) => Math.min(TOTAL, s + 1)), PLAY_MS);
    return () => window.clearTimeout(t);
  }, [playing, step]);

  const goStep = (n: number) => {
    setPicked(null);
    setStep(Math.max(0, Math.min(TOTAL, n)));
  };
  const submit = () => {
    setPlaying(false);
    goStep(1);
  };
  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    setPicked(null);
    if (step === 0 || step >= TOTAL) setStep(1);
    setPlaying(true);
  };

  const activeId = picked ?? (step >= 1 ? PATH[step - 1].id : null);
  const activeBlock = activeId ? BLOCKS[blockIndex(activeId)] : null;

  const btn =
    "inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500";
  const labelBase =
    "pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium opacity-0";

  return (
    <div className="not-prose space-y-3">
      <div
        ref={hostRef}
        role="img"
        aria-label="請假系統三層架構的等角立體圖：最上層介面有請假表單與簽核 App，中層服務有假別規則、簽核流程與通知，最下層資料有員工資料與假勤紀錄；請求由表單往下經過假別規則、員工資料、簽核流程、假勤紀錄，再由通知回到簽核 App。"
        className="relative w-full overflow-hidden"
        style={{ height: H }}
      >
        <div ref={glRef} aria-hidden="true" className="absolute inset-0 cursor-grab active:cursor-grabbing" />
        {BLOCKS.map((b, i) => (
          <span
            key={b.id}
            ref={(el) => {
              labelRefs.current[i] = el;
            }}
            aria-hidden="true"
            className={`${labelBase} ${b.id === activeId ? "bg-orange-50 text-orange-700" : "bg-white/90 text-neutral-700"}`}
          >
            {b.label}
          </span>
        ))}
        {LAYERS.map((l, i) => (
          <span
            key={l.id}
            ref={(el) => {
              layerLabelRefs.current[i] = el;
            }}
            aria-hidden="true"
            className={`${labelBase} bg-white/90 text-neutral-700`}
          >
            {l.label}
          </span>
        ))}
      </div>
      {!webgl && <p className="text-sm text-neutral-500">此裝置無法顯示 3D，可用下方按鈕逐步瀏覽。</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={submit}
          className="inline-flex items-center gap-1.5 rounded-full bg-orange-400 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
        >
          <Send size={16} aria-hidden="true" />
          送出一筆請假申請
        </button>
        <div aria-live="polite" className="min-h-10 min-w-0 flex-1 text-sm text-neutral-700">
          {picked && activeBlock ? (
            <p>
              <span className="font-semibold text-neutral-900">{activeBlock.label}</span>：{activeBlock.generic}
            </p>
          ) : step >= 1 && activeBlock ? (
            <p>
              <span className="font-semibold text-neutral-900">{activeBlock.label}</span>：{PATH[step - 1].text}
              <span className="ml-2 text-xs text-neutral-500">
                第 {step} / {TOTAL} 步
              </span>
            </p>
          ) : (
            <p>按「送出一筆請假申請」，逐步看一筆申請經過哪些元件；也可以直接點方塊。</p>
          )}
        </div>
      </div>
      <div role="group" aria-label="檢視控制" className="flex items-center gap-0.5">
        <button type="button" className={btn} aria-label="上一步" onClick={() => { setPlaying(false); goStep(step - 1); }}>
          <SkipBack size={16} />
        </button>
        <button type="button" className={btn} aria-label={playing ? "暫停" : "播放"} onClick={togglePlay}>
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button type="button" className={btn} aria-label="下一步" onClick={() => { setPlaying(false); goStep(step + 1); }}>
          <SkipForward size={16} />
        </button>
        <button type="button" className={btn} aria-label="縮小" onClick={() => api.current?.zoom(-ZOOM.step)}>
          <Minus size={16} />
        </button>
        <button type="button" className={btn} aria-label="放大" onClick={() => api.current?.zoom(ZOOM.step)}>
          <Plus size={16} />
        </button>
        <button type="button" className={btn} aria-label="重設視角" onClick={() => api.current?.reset()}>
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
}
