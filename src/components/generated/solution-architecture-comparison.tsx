import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Users,
  UserCheck,
  Monitor,
  Server,
  Cpu,
  Database,
  HardDrive,
  Cloud,
  Plug,
  Workflow,
  GitBranch,
  PenLine,
  LayoutList,
  Package,
  X,
  Info,
  ArrowLeftRight,
  ArrowRight,
  DollarSign,
} from 'lucide-react';

type Plan = 'A' | 'B';

interface NodeInfo {
  id: string;
  title: string;
  description: string;
}

interface LineSpec {
  id: string;
  d: string;
  midX: number;
  midY: number;
  label: string;
  labelPosition?: { x: number; y: number };
}

interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  length: number;
  isHorizontal: boolean;
}

function parseSegments(d: string): Segment[] {
  // Parse SVG path supporting M, L, H (absolute horizontal), V (absolute vertical) commands
  const tokens = d.trim().split(/\s+/);
  const points: { x: number; y: number }[] = [];
  let i = 0;
  let curX = 0;
  let curY = 0;
  while (i < tokens.length) {
    const cmd = tokens[i];
    if (cmd === 'M' || cmd === 'L') {
      curX = parseFloat(tokens[i + 1]);
      curY = parseFloat(tokens[i + 2]);
      points.push({ x: curX, y: curY });
      i += 3;
    } else if (cmd === 'H') {
      // Absolute horizontal: only x changes
      curX = parseFloat(tokens[i + 1]);
      points.push({ x: curX, y: curY });
      i += 2;
    } else if (cmd === 'V') {
      // Absolute vertical: only y changes
      curY = parseFloat(tokens[i + 1]);
      points.push({ x: curX, y: curY });
      i += 2;
    } else {
      i++;
    }
  }
  const segs: Segment[] = [];
  for (let j = 0; j < points.length - 1; j++) {
    const p1 = points[j];
    const p2 = points[j + 1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    segs.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, length, isHorizontal: Math.abs(dx) >= Math.abs(dy) });
  }
  return segs;
}

const BADGE_END_SAFETY = 28; // px — badge distance from line segment endpoints
const BADGE_MIN_LINE_LEN_FOR_SAFETY = 76; // px — if segment shorter than this, skip safety and use geometric midpoint
const BADGE_MIN_SEGMENT_LEN = 60; // px — segments shorter than this are not candidate for badge placement

function getLabelPosition(d: string): { x: number; y: number } {
  const segs = parseSegments(d);
  if (segs.length === 0) return { x: 0, y: 0 };

  const totalLen = segs.reduce((s, seg) => s + seg.length, 0);

  // Step 1: prefer horizontal segments with sufficient length
  const horizontalCandidates = segs.filter((s) => s.isHorizontal && s.length >= BADGE_MIN_SEGMENT_LEN);

  let targetSeg: Segment;

  if (horizontalCandidates.length > 0) {
    // Step 2: among horizontal candidates, pick the longest
    targetSeg = horizontalCandidates.reduce((best, s) => (s.length > best.length ? s : best));
    // Place badge at geometric midpoint of that horizontal segment
    // y must equal the segment's y (horizontal segment: y1 === y2)
    const cx = (targetSeg.x1 + targetSeg.x2) / 2;
    const cy = targetSeg.y1; // horizontal segment: y is constant

    // Step 3: apply endpoint safety only if segment is long enough
    if (targetSeg.length >= BADGE_MIN_LINE_LEN_FOR_SAFETY) {
      const halfSafe = targetSeg.length / 2 - BADGE_END_SAFETY;
      const segMidX = cx;
      // Clamp x within [x_min + BADGE_END_SAFETY, x_max - BADGE_END_SAFETY]
      const xMin = Math.min(targetSeg.x1, targetSeg.x2) + BADGE_END_SAFETY;
      const xMax = Math.max(targetSeg.x1, targetSeg.x2) - BADGE_END_SAFETY;
      const clampedX = halfSafe > 0 ? Math.max(xMin, Math.min(xMax, segMidX)) : segMidX;
      return { x: clampedX, y: cy };
    }

    return { x: cx, y: cy };
  }

  // Step 4: no suitable horizontal segment — for a single-segment path (pure straight line),
  // always use the true geometric midpoint without any safety clamp.
  if (segs.length === 1) {
    return {
      x: (segs[0].x1 + segs[0].x2) / 2,
      y: (segs[0].y1 + segs[0].y2) / 2,
    };
  }

  // Step 5: multi-segment path with no good horizontal segment — use total path midpoint
  const half = totalLen / 2;
  let acc = 0;
  targetSeg = segs[0];
  let accBefore = 0;
  for (const seg of segs) {
    if (acc + seg.length >= half) {
      targetSeg = seg;
      accBefore = acc;
      break;
    }
    acc += seg.length;
    accBefore = acc;
  }

  const tAlong = totalLen > 0 ? (half - accBefore) / targetSeg.length : 0.5;
  const cx = targetSeg.x1 + (targetSeg.x2 - targetSeg.x1) * tAlong;
  const cy = targetSeg.y1 + (targetSeg.y2 - targetSeg.y1) * tAlong;

  return { x: cx, y: cy };
}

const NODE_DETAILS: Record<string, NodeInfo> = {
  webui: {
    id: 'webui',
    title: 'Web UI',
    description:
      '主系統後台提供客服與顧問師日常作業介面，包含數據分析 Dashboard（看板視圖）。由客服與顧問師透過瀏覽器以 HTTPS 存取。',
  },
  apiserver: {
    id: 'apiserver',
    title: 'API Server',
    description:
      '自建後端服務，提供 REST API 供前端與外部系統整合。包含客戶管理、合約管理、分析看板資料服務等核心業務模組。',
  },
  cloudsql: {
    id: 'cloudsql',
    title: 'PostgreSQL (Cloud SQL)',
    description:
      'GCP Cloud SQL 託管的 PostgreSQL 資料庫，儲存客戶、合約、業務流程等核心主資料。',
  },
  cloudstorage: {
    id: 'cloudstorage',
    title: '檔案儲存 (Cloud Storage)',
    description:
      'GCP Cloud Storage 儲存系統附件，包含合約 PDF、表單上傳檔（.xlsx / .png / .pdf）等二進位檔案。',
  },
  n8n: {
    id: 'n8n',
    title: 'n8n（官方訂閱）',
    description:
      '主系統透過 API 觸發 n8n workflow，n8n 透過 Webhook 回寫主系統。負責整合通知（Email / Slack 等）與自動化流程。',
  },
  ddqian: {
    id: 'ddqian',
    title: '點點簽',
    description:
      '電子簽名 SaaS。透過 API 建立合約與查詢簽署狀態，透過 Webhook 接收簽署完成事件並回寫主系統。',
  },
  bizform: {
    id: 'bizform',
    title: 'BizForm（方案 A）',
    description:
      '外部表單 SaaS，方案 A 專用。透過 Webhook 將表單交付資料回寫主系統，取代方案 B 中自建的業務流程管理模組。',
  },
  github: {
    id: 'github',
    title: 'GitHub Repo',
    description: '前後端各一個 Repo，使用 GitHub 進行版本控制與協作開發。',
  },
  githubactions: {
    id: 'githubactions',
    title: 'GitHub Actions',
    description:
      '自動化 CI/CD pipeline，負責測試、打包與部署至 GCP Compute Engine。',
  },
  user: {
    id: 'user',
    title: 'User',
    description: '客服 / 顧問師（內部）與客戶 / 渠道（外部）透過瀏覽器以 HTTPS 存取主系統後台。',
  },
  gcpcompute: {
    id: 'gcpcompute',
    title: 'GCP Compute Engine',
    description: 'GCP 虛擬機，容納 Docker 容器運行 Web UI 與 API Server。',
  },
  'contract-chip': {
    id: 'contract-chip',
    title: '合約管理',
    description: 'API Server 內的合約管理模組，與點點簽電子簽名 SaaS 透過 API 和 Webhook 雙向整合。',
  },
  'bizform-chip': {
    id: 'bizform-chip',
    title: '業務流程資料對接',
    description: '方案 A 中 API Server 內的業務流程資料對接模組，接收來自 BizForm SaaS 的 Webhook 推送。',
  },
};

const PLAN_DESCRIPTION: Record<Plan, string> = {
  A: '方案 A：透過外部 BizForm SaaS 處理業務流程表單，降低自建成本',
  B: '方案 B：自建完整業務流程模組（派案 / 諮詢 / 報價 / 執案），掌控度更高',
};

function GcpBadge({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 bg-[var(--blue-50)] border border-[var(--blue-200)] text-[var(--blue-700)] rounded-md px-2 py-1 text-xs font-semibold">
      <Icon size={12} />
      {label}
    </span>
  );
}

function PaidBadge({ absolute }: { absolute?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 bg-[var(--orange-50)] border border-[var(--orange-300)] text-[var(--orange-700)] rounded-md px-2 py-0.5 text-[10px] font-semibold${
        absolute ? ' absolute top-3 right-3 z-10' : ''
      }`}
    >
      <DollarSign size={10} />
      需付費
    </span>
  );
}

function DockerBadge() {
  return (
    <span className="inline-flex items-center gap-1 bg-[var(--neutral-50)] border border-[var(--neutral-300)] text-[var(--neutral-700)] rounded-md px-2 py-1 text-xs font-semibold">
      <Package size={12} />
      Docker
    </span>
  );
}

function SaasBadge({
  label,
  bidirectional,
}: {
  label: string;
  bidirectional: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1 bg-[var(--orange-50)] border border-[var(--orange-200)] text-[var(--orange-700)] rounded-md px-2 py-0.5 text-[10px] font-semibold absolute top-3 left-3 z-10">
      {bidirectional ? <ArrowLeftRight size={10} /> : <ArrowRight size={10} />}
      {label}
    </span>
  );
}

function NodeCard({
  id,
  icon: Icon,
  logoColor,
  title,
  subtitle,
  selectedNode,
  onSelect,
  children,
  saasBadge,
  paid,
  equalHeight,
  nodeRef,
}: {
  id: string;
  icon: React.ElementType;
  logoColor: string;
  title: string;
  subtitle: string | React.ReactNode;
  selectedNode: string | null;
  onSelect: (id: string | null) => void;
  children?: React.ReactNode;
  saasBadge?: React.ReactNode;
  paid?: boolean;
  equalHeight?: boolean;
  nodeRef?: React.RefObject<HTMLDivElement>;
}) {
  const isSelected = selectedNode === id;
  return (
    <div ref={nodeRef} className={`relative${equalHeight ? ' h-full' : ''}`}>
      {saasBadge}
      {paid && <PaidBadge absolute />}
      <div
        className={`rounded-md border bg-white cursor-pointer transition-all${equalHeight ? ' h-full' : ''} ${
          isSelected
            ? 'border-[var(--orange-400)] ring-2 ring-[var(--orange-400)] ring-offset-1'
            : 'border-[var(--neutral-200)] hover:border-[var(--blue-300)]'
        }`}
        onClick={() => onSelect(isSelected ? null : id)}
      >
        <div className={`flex items-start gap-3 px-3 pb-3 ${saasBadge ? 'pt-[46px]' : 'pt-3'}`}>
          <div className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center ${logoColor}`}>
            <Icon size={16} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-[var(--neutral-800)]">{title}</div>
            <div className="text-xs text-[var(--neutral-500)] mt-0.5 leading-relaxed">{subtitle}</div>
          </div>
        </div>
        {children && <div className="px-3 pb-3">{children}</div>}
      </div>
    </div>
  );
}

function BigCardHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded-md bg-[var(--neutral-200)] flex items-center justify-center">
        <Icon size={14} className="text-[var(--neutral-600)]" />
      </div>
      <span className="text-sm font-bold text-[var(--neutral-700)]">{title}</span>
      {subtitle && <span className="text-xs text-[var(--neutral-400)]">{subtitle}</span>}
    </div>
  );
}

function Chip({
  label,
  chipId,
  selectedNode,
  onSelect,
}: {
  label: string;
  chipId?: string;
  selectedNode?: string | null;
  onSelect?: (id: string | null) => void;
}) {
  if (!chipId || !onSelect) {
    return (
      <span className="bg-[var(--blue-50)] border border-[var(--blue-200)] text-[var(--blue-700)] rounded-md px-2 py-0.5 text-xs">
        {label}
      </span>
    );
  }

  const isSelected = selectedNode === chipId;

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        onSelect(isSelected ? null : chipId);
      }}
      className={`rounded-md px-2 py-0.5 text-xs cursor-pointer transition-all ${
        isSelected
          ? 'bg-[var(--orange-50)] border border-[var(--orange-400)] text-[var(--orange-700)] ring-1 ring-[var(--orange-400)]'
          : 'bg-[var(--blue-50)] border border-[var(--blue-200)] text-[var(--blue-700)] hover:border-[var(--orange-300)]'
      }`}
    >
      {label}
    </span>
  );
}

export default function SolutionArchitectureComparison() {
  const [plan, setPlan] = useState<Plan>('A');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [lines, setLines] = useState<LineSpec[]>([]);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  const selectedInfo = selectedNode ? NODE_DETAILS[selectedNode] : null;

  const hasSaasNode = (id: string) =>
    ['n8n', 'ddqian', 'bizform'].includes(id);

  // Refs for measured elements
  const containerRef = useRef<HTMLDivElement>(null);
  const userBarRef = useRef<HTMLDivElement>(null);
  const webuiRef = useRef<HTMLDivElement>(null);
  const apiserverRef = useRef<HTMLDivElement>(null);
  const cloudsqlGroupRef = useRef<HTMLDivElement>(null);
  const cloudstorageGroupRef = useRef<HTMLDivElement>(null);
  const githubRef = useRef<HTMLDivElement>(null);
  const githubactionsRef = useRef<HTMLDivElement>(null);

  const computeLines = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    if (cRect.width === 0) return;

    const rel = (el: HTMLElement | null) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        top: r.top - cRect.top,
        bottom: r.bottom - cRect.top,
        left: r.left - cRect.left,
        right: r.right - cRect.left,
        width: r.width,
        height: r.height,
        midX: r.left - cRect.left + r.width / 2,
        midY: r.top - cRect.top + r.height / 2,
      };
    };

    const user = rel(userBarRef.current);
    const webui = rel(webuiRef.current);
    const apiserver = rel(apiserverRef.current);
    const cloudsqlGroup = rel(cloudsqlGroupRef.current);
    const cloudstorageGroup = rel(cloudstorageGroupRef.current);
    const github = rel(githubRef.current);
    const githubactions = rel(githubactionsRef.current);

    if (!user || !webui || !apiserver || !cloudsqlGroup || !cloudstorageGroup || !github || !githubactions) return;

    const newLines: LineSpec[] = [];

    // Line 1: User bar bottom -> Web UI top (HTTPS)
    {
      const x = webui.midX;
      const y1 = user.bottom;
      const y2 = webui.top;
      const d = `M ${x} ${y1} L ${x} ${y2}`;
      const pos = getLabelPosition(d);
      newLines.push({ id: 'line1', d, midX: pos.x, midY: pos.y, label: 'HTTPS' });
    }

    // Line 2: Web UI bottom -> API Server top (HTTPS / RESTful API)
    {
      const x = webui.midX;
      const y1 = webui.bottom;
      const y2 = apiserver.top;
      const d = `M ${x} ${y1} L ${x} ${y2}`;
      const pos = getLabelPosition(d);
      newLines.push({ id: 'line2', d, midX: pos.x, midY: pos.y, label: 'HTTPS / RESTful API' });
    }

    // Line 3: API Server bottom -> Cloud SQL group top (TCP) — elbow
    // fromX offset is set wide enough so the horizontal segment spans a meaningful distance
    {
      const fromX = apiserver.midX - 60;
      const fromY = apiserver.bottom;
      const toX = cloudsqlGroup.left + cloudsqlGroup.width * 0.40;
      const toY = cloudsqlGroup.top;
      // Place elbowY at 60% of the gap so horizontal segment has room
      const elbowY = fromY + (toY - fromY) * 0.6;
      const d = `M ${fromX} ${fromY} L ${fromX} ${elbowY} L ${toX} ${elbowY} L ${toX} ${toY}`;
      // Directly compute label position from the same elbowY to avoid parseSegments drift
      const labelPosition = { x: (fromX + toX) / 2, y: elbowY };
      newLines.push({ id: 'line3', d, midX: labelPosition.x, midY: labelPosition.y, label: 'TCP', labelPosition });
    }

    // Line 4: API Server bottom -> Cloud Storage group top (HTTPS GCS SDK) — elbow
    {
      const fromX = apiserver.midX + 60;
      const fromY = apiserver.bottom;
      const toX = cloudstorageGroup.left + cloudstorageGroup.width * 0.60;
      const toY = cloudstorageGroup.top;
      const elbowY = fromY + (toY - fromY) * 0.6;
      const d = `M ${fromX} ${fromY} L ${fromX} ${elbowY} L ${toX} ${elbowY} L ${toX} ${toY}`;
      // Directly compute label position from the same elbowY to avoid parseSegments drift
      const labelPosition = { x: (fromX + toX) / 2, y: elbowY };
      newLines.push({ id: 'line4', d, midX: labelPosition.x, midY: labelPosition.y, label: 'HTTPS (GCS SDK)', labelPosition });
    }

    setLines(newLines);
    setContainerSize({ w: cRect.width, h: cRect.height });
  }, []);

  useEffect(() => {
    // Delay to ensure layout has settled
    const timer = setTimeout(computeLines, 50);
    return () => clearTimeout(timer);
  }, [computeLines, plan]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      computeLines();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [computeLines]);

  return (
    <div ref={containerRef} className="not-prose max-w-5xl mx-auto space-y-4 relative">
      {/* SVG overlay for connection lines */}
      {lines.length > 0 && (
        <svg
          className="pointer-events-none absolute inset-0 z-20 !mt-0"
          width={containerSize.w}
          height={containerSize.h}
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          <defs>
            <marker
              id="arrow-blue"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L0,6 L8,3 z" fill="var(--blue-500)" />
            </marker>
          </defs>
          {lines.map((line) => (
            <path
              key={line.id}
              d={line.d}
              stroke="var(--blue-500)"
              strokeWidth="1.5"
              fill="none"
              strokeDasharray="4 3"
              markerEnd="url(#arrow-blue)"
            />
          ))}
        </svg>
      )}

      {/* Pill labels overlay */}
      {lines.length > 0 && (
        <div className="pointer-events-none absolute inset-0 z-30 !mt-0" style={{ position: 'absolute', top: 0, left: 0 }}>
          {lines.map((line) => {
            const pos = line.labelPosition ?? { x: line.midX, y: line.midY };
            return (
            <div
              key={`pill-${line.id}`}
              style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <span className="bg-white border border-[var(--blue-200)] rounded-md px-2 py-0.5 text-[10px] font-semibold text-[var(--blue-700)] whitespace-nowrap block">
                {line.label}
              </span>
            </div>
            );
          })}
        </div>
      )}

      {/* Toggle — two-row layout */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1 p-1 bg-[var(--neutral-100)] rounded-full self-start">
          {(['A', 'B'] as Plan[]).map((p) => (
            <button
              key={p}
              onClick={() => setPlan(p)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                plan === p
                  ? 'bg-[var(--blue-700)] text-white'
                  : 'text-[var(--neutral-600)] hover:text-[var(--neutral-800)]'
              }`}
            >
              {p === 'A' ? '[A] ' : ''}方案 {p}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--blue-50)] border border-[var(--blue-200)] text-[var(--blue-700)]">
          <Info size={14} className="flex-shrink-0" />
          <span className="text-sm leading-relaxed">{PLAN_DESCRIPTION[plan]}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--orange-50)] border border-[var(--orange-200)] text-[var(--orange-700)]">
          <Info size={14} className="flex-shrink-0" />
          <span className="text-xs leading-relaxed">點擊節點卡片或 chip 可在底部顯示詳細說明</span>
        </div>
      </div>

      {/* Main layout */}
      <div className="space-y-4">
        {/* User bar */}
        <div
          ref={userBarRef}
          className="flex items-center gap-4 px-4 py-2.5 bg-white border border-[var(--neutral-200)] rounded-md"
        >
          <div className="flex items-center gap-2 text-sm text-[var(--neutral-600)]">
            <Users size={16} className="text-[var(--blue-500)]" />
            <span>客服 / 顧問師</span>
          </div>
          <div className="w-px h-4 bg-[var(--neutral-300)]" />
          <div className="flex items-center gap-2 text-sm text-[var(--neutral-600)]">
            <UserCheck size={16} className="text-[var(--blue-400)]" />
            <span>客戶 / 渠道</span>
          </div>
        </div>

        {/* GCP Deployment big card */}
        <div className="bg-[var(--neutral-50)] border border-[var(--neutral-200)] rounded-md p-4 space-y-3">
          <BigCardHeader icon={Cloud} title="Deployment (GCP)" />

          {/* GCP Compute Engine sub-group */}
          <div className="border border-dashed border-[var(--blue-400)] bg-white rounded-md p-3 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <GcpBadge icon={Cpu} label="GCP Compute Engine" />
              <PaidBadge />
            </div>

            {/* Docker sub-frame */}
            <div className="border border-dashed border-[var(--neutral-400)] bg-white rounded-md p-3 space-y-3">
              <DockerBadge />
              <div className="flex flex-col gap-20">
                <NodeCard
                  id="webui"
                  nodeRef={webuiRef}
                  icon={Monitor}
                  logoColor="bg-[var(--blue-500)]"
                  title="Web UI"
                  subtitle={
                    <span>
                      主系統後台（客服 / 顧問師作業）
                      <br />
                      數據分析 Dashboard（看板視圖）
                    </span>
                  }
                  selectedNode={selectedNode}
                  onSelect={setSelectedNode}
                />
                <NodeCard
                  id="apiserver"
                  nodeRef={apiserverRef}
                  icon={Server}
                  logoColor="bg-[var(--blue-700)]"
                  title="API Server"
                  subtitle="自建後端服務，REST API"
                  selectedNode={selectedNode}
                  onSelect={setSelectedNode}
                >
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Chip label="客戶管理 (CRM)" />
                    <Chip
                      label="合約管理"
                      chipId="contract-chip"
                      selectedNode={selectedNode}
                      onSelect={setSelectedNode}
                    />
                    <Chip label="分析看板資料服務" />
                    {plan === 'B' && (
                      <>
                        <Chip label="派案管理" />
                        <Chip label="諮詢管理" />
                        <Chip label="報價管理" />
                        <Chip label="執案管理" />
                      </>
                    )}
                    {plan === 'A' && (
                      <Chip
                        label="業務流程資料對接"
                        chipId="bizform-chip"
                        selectedNode={selectedNode}
                        onSelect={setSelectedNode}
                      />
                    )}
                  </div>
                </NodeCard>
              </div>
            </div>
          </div>

          {/* Cloud SQL + Cloud Storage row — extra top gap for elbow lines */}
          <div className="pt-16 grid grid-cols-1 sm:grid-cols-2 gap-3 auto-rows-fr">
            <div
              ref={cloudsqlGroupRef}
              className="border border-dashed border-[var(--blue-400)] bg-white rounded-md p-3 space-y-2 h-full flex flex-col"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <GcpBadge icon={Database} label="GCP Cloud SQL" />
                <PaidBadge />
              </div>
              <div className="relative flex-1 h-full">
                <NodeCard
                  id="cloudsql"
                  icon={Database}
                  logoColor="bg-[var(--blue-800)]"
                  title="PostgreSQL"
                  subtitle="客戶 / 合約 / 業務流程主資料庫"
                  selectedNode={selectedNode}
                  onSelect={setSelectedNode}
                  equalHeight={true}
                />
              </div>
            </div>
            <div
              ref={cloudstorageGroupRef}
              className="border border-dashed border-[var(--blue-400)] bg-white rounded-md p-3 space-y-2 h-full flex flex-col"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <GcpBadge icon={HardDrive} label="GCP Cloud Storage" />
                <PaidBadge />
              </div>
              <div className="relative flex-1 h-full">
                <NodeCard
                  id="cloudstorage"
                  icon={HardDrive}
                  logoColor="bg-[var(--neutral-500)]"
                  title="檔案儲存"
                  subtitle="附件 / 合約 PDF / 表單上傳檔 (.xlsx / .png / .pdf)"
                  selectedNode={selectedNode}
                  onSelect={setSelectedNode}
                  equalHeight={true}
                />
              </div>
            </div>
          </div>
        </div>

        {/* External SaaS big card */}
        <div className="bg-[var(--neutral-50)] border border-[var(--neutral-200)] rounded-md p-4 space-y-3">
          <BigCardHeader icon={Plug} title="External SaaS" subtitle="訂閱服務" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 auto-rows-fr">
            <NodeCard
              id="n8n"
              icon={Workflow}
              logoColor="bg-[var(--orange-400)]"
              title="n8n（官方訂閱）"
              subtitle={
                <span>
                  主系統透過 API 觸發 workflow
                  <br />
                  Webhook 回寫主系統
                  <br />
                  整合通知（Email / Slack 等）
                </span>
              }
              selectedNode={selectedNode}
              onSelect={setSelectedNode}
              equalHeight={true}
              saasBadge={
                <SaasBadge label="API + Webhook &lt;&gt; API Server" bidirectional={true} />
              }
            />
            <NodeCard
              id="ddqian"
              icon={PenLine}
              logoColor="bg-[var(--orange-500)]"
              title="點點簽"
              paid={true}
              subtitle={
                <span>
                  API（合約建立 / 查詢）
                  <br />
                  Webhook（簽署完成事件回寫）
                </span>
              }
              selectedNode={selectedNode}
              onSelect={setSelectedNode}
              equalHeight={true}
              saasBadge={
                <SaasBadge label="API + Webhook &lt;&gt; 合約管理" bidirectional={true} />
              }
            />
            <div
              className={`transition-opacity duration-200 h-full ${plan === 'A' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              style={{ minHeight: '6rem' }}
            >
              {plan === 'A' && (
                <NodeCard
                  id="bizform"
                  icon={LayoutList}
                  logoColor="bg-[var(--neutral-500)]"
                  title="[A] BizForm"
                  paid={true}
                  subtitle="Webhook（表單交付資料回寫）"
                  selectedNode={selectedNode}
                  onSelect={setSelectedNode}
                  equalHeight={true}
                  saasBadge={
                    <SaasBadge label="Webhook &gt; 業務流程資料對接" bidirectional={false} />
                  }
                />
              )}
            </div>
          </div>
        </div>

        {/* CI/CD big card */}
        <div className="bg-[var(--neutral-50)] border border-[var(--neutral-200)] rounded-md p-4 space-y-3">
          <BigCardHeader icon={GitBranch} title="CI/CD" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <NodeCard
              id="github"
              nodeRef={githubRef}
              icon={GitBranch}
              logoColor="bg-[var(--neutral-700)]"
              title="GitHub Repo"
              subtitle="前後端各一個 Repo"
              selectedNode={selectedNode}
              onSelect={setSelectedNode}
            />
            <NodeCard
              id="githubactions"
              nodeRef={githubactionsRef}
              icon={Workflow}
              logoColor="bg-[var(--blue-700)]"
              title="GitHub Actions"
              subtitle="自動測試 / 打包 / 部署"
              selectedNode={selectedNode}
              onSelect={setSelectedNode}
            />
          </div>
        </div>

        {/* Detail panel */}
        {selectedInfo && (
          <div
            className={`border rounded-md p-4 relative transition-colors ${
              hasSaasNode(selectedNode ?? '')
                ? 'border-[var(--orange-300)] bg-[var(--orange-50)]'
                : 'border-[var(--blue-200)] bg-[var(--blue-50)]'
            }`}
          >
            <button
              onClick={() => setSelectedNode(null)}
              className="absolute top-3 right-3 text-[var(--neutral-400)] hover:text-[var(--neutral-700)] transition-colors"
              aria-label="close"
            >
              <X size={16} />
            </button>
            <div className={`text-sm font-bold mb-1 ${
              hasSaasNode(selectedNode ?? '')
                ? 'text-[var(--orange-700)]'
                : 'text-[var(--blue-700)]'
            }`}>
              {selectedInfo.title}
            </div>
            <p className="text-sm text-[var(--neutral-600)] leading-relaxed">
              {selectedInfo.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
