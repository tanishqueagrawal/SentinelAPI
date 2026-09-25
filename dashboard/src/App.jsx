import { useMemo, useState } from "react";
import jsPDF from "jspdf";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bug,
  ChevronRight,
  Clock3,
  FileBarChart,
  Globe2,
  LayoutDashboard,
  Menu,
  Play,
  Search,
  Server,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Upload,
  X,
  Zap
} from "lucide-react";

const API_BACKEND = "http://localhost:4000";

const TARGETS = [
  {
    id: "sandbox",
    name: "SentinelAPI Sandbox",
    url: "http://localhost:5000",
    mode: "Active",
    status: "Controlled"
  },
  {
    id: "petstore",
    name: "Swagger Petstore",
    url: "https://petstore3.swagger.io/api/v3",
    mode: "Passive",
    status: "Public Demo"
  },
  {
    id: "jsonplaceholder",
    name: "JSONPlaceholder",
    url: "https://jsonplaceholder.typicode.com",
    mode: "Passive",
    status: "Public Test"
  }
];

const EMPTY_HISTORY = [];

function App() {
  const [activePage, setActivePage] = useState("Overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [selectedTarget, setSelectedTarget] = useState(TARGETS[0]);
  const [findings, setFindings] = useState([]);
  const [scanInfo, setScanInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanError, setScanError] = useState("");
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [history, setHistory] = useState(EMPTY_HISTORY);

  const critical = findings.filter(
    (item) => item.severity === "CRITICAL"
  ).length;

  const high = findings.filter(
    (item) => item.severity === "HIGH"
  ).length;

  const medium = findings.filter(
    (item) => item.severity === "MEDIUM"
  ).length;

  const low = findings.filter(
    (item) => item.severity === "LOW"
  ).length;

  const score = Math.max(
  0,
  100 -
    critical * 20 -
    high * 10 -
    medium * 5 -
    low * 2
);

  const endpoints = scanInfo?.endpoints_scanned || 0;

  const runScan = async () => {
    setLoading(true);
    setScanError("");

    try {
      const response = await fetch(`${API_BACKEND}/api/scan`, {
        method: "POST",
headers: {
  "Content-Type": "application/json"
},
body: JSON.stringify({
  targetId: selectedTarget.id
})
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Scan failed");
      }

      const newFindings = data.report?.findings || [];

      setFindings(newFindings);
      setScanInfo(data.report);

      setHistory((previous) => [
        {
          id: Date.now(),
          target: selectedTarget.name,
          score: Math.max(
            0,
            100 -
              newFindings.filter((x) => x.severity === "CRITICAL").length *
                35 -
              newFindings.filter((x) => x.severity === "HIGH").length * 20
          ),
          findings: newFindings.length,
          date: new Date().toLocaleString()
        },
        ...previous
      ]);

      setActivePage("Overview");
    } catch (error) {
      console.error(error);

      setScanError(
        error.message || "Unable to connect to SentinelAPI backend"
      );
    } finally {
      setLoading(false);
    }
  };

  const navigation = [
    {
      name: "Overview",
      icon: LayoutDashboard
    },
    {
      name: "API Scanner",
      icon: Search
    },
    {
      name: "Endpoints",
      icon: Server
    },
    {
      name: "Vulnerabilities",
      icon: Bug
    },
    {
      name: "Reports",
      icon: FileBarChart
    },
    {
      name: "Scan History",
      icon: Clock3
    },
    {
      name: "Settings",
      icon: Settings
    }
  ];

  return (
    <div className="min-h-screen bg-[#070b14] text-white">
      {/* MOBILE OVERLAY */}

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}

      <aside
        className={`
          fixed left-0 top-0 z-40 h-screen w-64
          border-r border-slate-800/80
          bg-[#0a0f1c]
          transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        <div className="h-full flex flex-col">
          {/* BRAND */}

          <div className="px-5 py-6 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
                <ShieldCheck
                  size={23}
                  className="text-cyan-400"
                />
              </div>

              <div>
                <h1 className="font-bold text-lg tracking-tight">
                  SentinelAPI
                </h1>

                <p className="text-[10px] uppercase tracking-widest text-slate-500">
                  Security Platform
                </p>
              </div>
            </div>
          </div>

          {/* NAVIGATION */}

          <div className="flex-1 px-3 py-5">
            <p className="px-3 mb-3 text-[10px] uppercase tracking-widest text-slate-600">
              Platform
            </p>

            <nav className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = activePage === item.name;

                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      setActivePage(item.name);
                      setSidebarOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3
                      px-3 py-2.5 rounded-xl
                      text-sm transition
                      ${
                        active
                          ? "bg-cyan-400/10 text-cyan-300 border border-cyan-400/10"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                      }
                    `}
                  >
                    <Icon size={17} />

                    <span>{item.name}</span>

                    {active && (
                      <ChevronRight
                        size={15}
                        className="ml-auto"
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* SYSTEM STATUS */}

          <div className="p-4">
            <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />

                <span className="text-xs font-medium text-emerald-400">
                  Scanner Online
                </span>
              </div>

              <p className="text-[11px] text-slate-500 mt-2">
                Engine ready for security analysis
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN AREA */}

      <div className="lg:ml-64">
        {/* TOPBAR */}

        <header className="sticky top-0 z-20 h-16 border-b border-slate-800/80 bg-[#070b14]/90 backdrop-blur-xl">
          <div className="h-full px-5 lg:px-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-800"
              >
                <Menu size={20} />
              </button>

              <div>
                <p className="text-sm font-semibold">
                  {activePage}
                </p>

                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Zero-Trust API Security
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
                <Activity size={15} className="text-emerald-400" />
                All systems operational
              </div>

              <div className="w-8 h-8 rounded-lg bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
                <Shield size={16} className="text-cyan-400" />
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT */}

        <main className="p-5 lg:p-8 max-w-[1600px] mx-auto">
          {activePage === "Overview" && (
            <OverviewPage
              selectedTarget={selectedTarget}
              setSelectedTarget={setSelectedTarget}
              findings={findings}
              critical={critical}
              high={high}
              medium={medium}
              low={low}
              score={score}
              endpoints={endpoints}
              scanInfo={scanInfo}
              loading={loading}
              scanError={scanError}
              runScan={runScan}
              setSelectedFinding={setSelectedFinding}
              setActivePage={setActivePage}
            />
          )}

          {activePage === "API Scanner" && (
            <ScannerPage
              selectedTarget={selectedTarget}
              setSelectedTarget={setSelectedTarget}
              loading={loading}
              scanError={scanError}
              runScan={runScan}
            />
          )}

          {activePage === "Endpoints" && (
            <EndpointsPage
              scanInfo={scanInfo}
              findings={findings}
            />
          )}

          {activePage === "Vulnerabilities" && (
            <VulnerabilitiesPage
              findings={findings}
              setSelectedFinding={setSelectedFinding}
            />
          )}

          {activePage === "Reports" && (
            <ReportsPage
              findings={findings}
              score={score}
              scanInfo={scanInfo}
            />
          )}

          {activePage === "Scan History" && (
            <HistoryPage history={history} />
          )}

          {activePage === "Settings" && (
            <SettingsPage selectedTarget={selectedTarget} />
          )}
        </main>
      </div>

      {/* FINDING MODAL */}

      {selectedFinding && (
        <FindingModal
          finding={selectedFinding}
          onClose={() => setSelectedFinding(null)}
        />
      )}
    </div>
  );
}

/* =========================================================
   OVERVIEW
========================================================= */

function OverviewPage({
  selectedTarget,
  setSelectedTarget,
  findings,
  critical,
  high,
  medium,
  low,
  score,
  endpoints,
  scanInfo,
  loading,
  scanError,
  runScan,
  setSelectedFinding,
  setActivePage
}) {
  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="SECURITY OVERVIEW"
        title="API Security Command Center"
        description="Monitor your API attack surface, security findings and scan posture."
      />

      {/* TARGET BAR */}

      <div className="rounded-2xl border border-slate-800 bg-[#0c1220] p-5">
        <div className="flex flex-col xl:flex-row xl:items-end gap-4">
          <div className="flex-1">
            <label className="text-xs text-slate-500 uppercase tracking-wider">
              Target API
            </label>

            <select
              value={selectedTarget.id}
              onChange={(e) => {
                const target = TARGETS.find(
                  (item) => item.id === e.target.value
                );

                setSelectedTarget(target);
              }}
              className="mt-2 w-full bg-[#070b14] border border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-cyan-400"
            >
              {TARGETS.map((target) => (
                <option
                  key={target.id}
                  value={target.id}
                >
                  {target.name} — {target.mode} Scan
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <div className="text-xs text-slate-500 uppercase tracking-wider">
              API Endpoint
            </div>

            <div className="mt-2 px-4 py-3 rounded-xl bg-[#070b14] border border-slate-800 font-mono text-sm text-cyan-300 truncate">
              {selectedTarget.url}
            </div>
          </div>

          <button
            onClick={runScan}
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-cyan-400 text-slate-950 font-bold flex items-center justify-center gap-2 hover:bg-cyan-300 disabled:opacity-50"
          >
            <Play size={17} />

            {loading ? "Scanning..." : "Start Scan"}
          </button>
        </div>

        {scanError && (
          <div className="mt-4 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm">
            {scanError}
          </div>
        )}
      </div>

      {/* STATS */}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="Security Score"
          value={`${score}/100`}
          subtitle="Current posture"
          icon={ShieldCheck}
        />

        <MetricCard
          title="Endpoints"
          value={endpoints || "—"}
          subtitle="Analyzed"
          icon={Server}
        />

        <MetricCard
          title="Critical"
          value={critical}
          subtitle="Immediate attention"
          icon={ShieldAlert}
          danger
        />

        <MetricCard
          title="High Risk"
          value={high}
          subtitle={`${medium} medium · ${low} low`}
          icon={AlertTriangle}
          warning
        />
      </div>
      
      {/* SECURITY SCHEMES */}

      <SecuritySchemeCard
        schemes={scanInfo?.security_schemes || []}
      />

      {/* MAIN GRID */}

      <div className="grid xl:grid-cols-3 gap-5">
        {/* SCORE */}

        <div className="xl:col-span-1 rounded-2xl border border-slate-800 bg-[#0c1220] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Security Posture</p>
              <p className="text-xs text-slate-500 mt-1">
                Latest assessment
              </p>
            </div>

            <ShieldCheck className="text-cyan-400" />
          </div>

          <div className="flex items-center justify-center py-8">
            <div className="relative w-44 h-44 rounded-full border-[12px] border-slate-800 flex items-center justify-center">
              <div className="text-center">
                <p className="text-4xl font-bold">
                  {score}
                </p>

                <p className="text-xs text-slate-500">
                  / 100
                </p>
              </div>

              <div
                className="absolute inset-[-12px] rounded-full border-[12px] border-transparent border-t-cyan-400 border-r-cyan-400 rotate-[-25deg]"
              />
            </div>
          </div>

          <button
            onClick={() => setActivePage("Vulnerabilities")}
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm flex items-center justify-center gap-2"
          >
            View vulnerabilities
            <ChevronRight size={16} />
          </button>
        </div>

        {/* FINDINGS */}

        <div className="xl:col-span-2 rounded-2xl border border-slate-800 bg-[#0c1220] overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <p className="font-semibold">
                Recent Security Findings
              </p>

              <p className="text-xs text-slate-500 mt-1">
                Results from the latest scan
              </p>
            </div>

            <button
              onClick={() => setActivePage("Vulnerabilities")}
              className="text-xs text-cyan-400 hover:text-cyan-300"
            >
              View all
            </button>
          </div>

          {findings.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No scan results yet"
              description="Run a security scan to populate findings."
            />
          ) : (
            <div>
              {findings.slice(0, 5).map((finding) => (
                <FindingRow
                  key={finding.id}
                  finding={finding}
                  onClick={() => setSelectedFinding(finding)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SCANNER
========================================================= */

function ScannerPage({
  selectedTarget,
  setSelectedTarget,
  loading,
  scanError,
  runScan
}) {
  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="API SCANNER"
        title="Run a Security Assessment"
        description="Analyze an API against SentinelAPI's security checks."
      />

      <div className="grid xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 rounded-2xl border border-slate-800 bg-[#0c1220] p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-cyan-400/10">
              <Terminal className="text-cyan-400" />
            </div>

            <div>
              <h2 className="font-semibold">
                Scan Configuration
              </h2>

              <p className="text-xs text-slate-500">
                Configure your assessment target
              </p>
            </div>
          </div>

          <label className="text-xs text-slate-500 uppercase tracking-wider">
            Target
          </label>

          <select
            value={selectedTarget.id}
            onChange={(e) => {
              const target = TARGETS.find(
                (item) => item.id === e.target.value
              );

              setSelectedTarget(target);
            }}
            className="mt-2 w-full bg-[#070b14] border border-slate-700 rounded-xl px-4 py-3 text-sm"
          >
            {TARGETS.map((target) => (
              <option
                key={target.id}
                value={target.id}
              >
                {target.name}
              </option>
            ))}
          </select>

          <div className="mt-5 p-4 rounded-xl bg-[#070b14] border border-slate-800">
            <p className="text-xs text-slate-500">
              Target URL
            </p>

            <p className="font-mono text-sm text-cyan-300 mt-2 break-all">
              {selectedTarget.url}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-5">
            <ScanMode
              active={selectedTarget.mode === "Active"}
              title="Active Security Test"
              description="For controlled / authorized APIs"
            />

            <ScanMode
              active={selectedTarget.mode === "Passive"}
              title="Passive Analysis"
              description="Analyze API surface without attack traffic"
            />
          </div>

          <button
            onClick={runScan}
            disabled={loading}
            className="mt-6 w-full py-4 rounded-xl bg-cyan-400 text-slate-950 font-bold flex items-center justify-center gap-2 hover:bg-cyan-300 disabled:opacity-50"
          >
            <Zap size={18} />

            {loading
              ? "Security analysis running..."
              : "Start Security Scan"}
          </button>

          {scanError && (
            <div className="mt-4 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm">
              {scanError}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0c1220] p-6">
          <h2 className="font-semibold">
            Security Tests
          </h2>

          <div className="mt-5 space-y-3">
            {[
              "BOLA / IDOR",
              "Authentication",
              "Data Exposure",
              "Rate Limiting",
              "Security Configuration",
              "API Surface Analysis"
            ].map((test) => (
              <div
                key={test}
                className="flex items-center gap-3 p-3 rounded-xl bg-[#070b14]"
              >
                <div className="w-7 h-7 rounded-lg bg-cyan-400/10 flex items-center justify-center">
                  <ShieldCheck
                    size={15}
                    className="text-cyan-400"
                  />
                </div>

                <span className="text-sm text-slate-300">
                  {test}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   ENDPOINTS
========================================================= */
const SecuritySchemeCard = ({ schemes = [] }) => {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">
            Authentication & Security
          </h3>

          <p className="text-sm text-slate-400 mt-1">
            Security mechanisms documented in the OpenAPI specification
          </p>
        </div>

        <div className="px-3 py-1 rounded-full bg-cyan-400/10 text-cyan-300 text-xs font-bold">
          {schemes.length} scheme{schemes.length === 1 ? "" : "s"}
        </div>
      </div>

      {schemes.length === 0 ? (
        <div className="rounded-xl border border-yellow-400/10 bg-yellow-400/5 p-4">
          <p className="text-yellow-300 font-semibold">
            No security scheme documented
          </p>

          <p className="text-sm text-slate-400 mt-1">
            The OpenAPI specification does not define an authentication
            mechanism.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {schemes.map((scheme, index) => (
            <div
              key={`${scheme.name}-${index}`}
              className="rounded-xl border border-white/10 bg-black/20 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">
                  {scheme.name}
                </span>

                <span className="px-2 py-1 rounded-md bg-green-400/10 text-green-300 text-xs font-bold">
                  {scheme.type}
                </span>
              </div>

              {scheme.scheme && (
                <p className="text-sm text-slate-400 mt-3">
                  Scheme:{" "}
                  <span className="text-slate-200">
                    {scheme.scheme}
                  </span>
                </p>
              )}

              {scheme.in && (
                <p className="text-sm text-slate-400 mt-1">
                  Location:{" "}
                  <span className="text-slate-200">
                    {scheme.in}
                  </span>
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function EndpointsPage({ scanInfo, findings }) {
  const endpoints = useMemo(() => {
    if (scanInfo?.endpoints) {
      return scanInfo.endpoints;
    }

    return [
      ...new Set(
        findings.map((finding) => finding.endpoint)
      )
    ];
  }, [scanInfo, findings]);

  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="API SURFACE"
        title="Endpoints"
        description="Explore endpoints discovered during API analysis."
      />

      <div className="rounded-2xl border border-slate-800 bg-[#0c1220] overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-800">
          <p className="font-semibold">
            Discovered Endpoints
          </p>

          <p className="text-xs text-slate-500 mt-1">
            {endpoints.length} endpoint(s) currently visible
          </p>
        </div>

        {endpoints.length === 0 ? (
          <EmptyState
            icon={Globe2}
            title="No endpoints available"
            description="Run a scan to discover API endpoints."
          />
        ) : (
          <div>
            {endpoints.map((endpoint, index) => (
              <div
                key={`${endpoint}-${index}`}
                className="px-6 py-4 border-b border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <span className="px-2 py-1 rounded-md bg-cyan-400/10 text-cyan-300 text-xs font-bold">
  {endpoint.method || "GET"}
</span>

                  <span className="font-mono text-sm text-slate-300">
                    {typeof endpoint === "string"
                      ? endpoint
                      : endpoint.path || endpoint.url}
                  </span>
                </div>

                <span className="text-xs text-slate-600">
                  #{index + 1}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   VULNERABILITIES
========================================================= */

function VulnerabilitiesPage({
  findings,
  setSelectedFinding
}) {
  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="THREAT FINDINGS"
        title="Vulnerabilities"
        description="Security issues identified by the scanner."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MiniStat title="Critical" value={findings.filter((x) => x.severity === "CRITICAL").length} />
        <MiniStat title="High" value={findings.filter((x) => x.severity === "HIGH").length} />
        <MiniStat title="Medium" value={findings.filter((x) => x.severity === "MEDIUM").length} />
        <MiniStat title="Low" value={findings.filter((x) => x.severity === "LOW").length} />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-[#0c1220] overflow-hidden">
        {findings.length === 0 ? (
          <EmptyState
            icon={Bug}
            title="No vulnerabilities found"
            description="Run a scan to analyze the target API."
          />
        ) : (
          findings.map((finding) => (
            <FindingRow
              key={finding.id}
              finding={finding}
              onClick={() => setSelectedFinding(finding)}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* =========================================================
   REPORTS
========================================================= */

function ReportsPage({
  findings,
  score,
  scanInfo
}) {
    const downloadPDF = () => {
    if (!scanInfo) return;

    const doc = new jsPDF();

    const critical = findings.filter(
      (x) => x.severity === "CRITICAL"
    ).length;

    const high = findings.filter(
      (x) => x.severity === "HIGH"
    ).length;

    const medium = findings.filter(
      (x) => x.severity === "MEDIUM"
    ).length;

    const low = findings.filter(
      (x) => x.severity === "LOW"
    ).length;

    let y = 20;

    doc.setFontSize(20);
    doc.text("SentinelAPI Security Report", 20, y);

    y += 12;

    doc.setFontSize(10);
    doc.text(
      `Target: ${scanInfo.target || "Unknown"}`,
      20,
      y
    );

    y += 7;

    doc.text(
      `Mode: ${scanInfo.mode || "Unknown"}`,
      20,
      y
    );

    y += 7;

    doc.text(
      `Scan Time: ${
        scanInfo.timestamp
          ? new Date(scanInfo.timestamp).toLocaleString()
          : "Unknown"
      }`,
      20,
      y
    );

    y += 14;

    doc.setFontSize(14);
    doc.text(
      `Security Score: ${score}/100`,
      20,
      y
    );

    y += 12;

    doc.setFontSize(11);

    doc.text(`Critical: ${critical}`, 20, y);
    y += 7;

    doc.text(`High: ${high}`, 20, y);
    y += 7;

    doc.text(`Medium: ${medium}`, 20, y);
    y += 7;

    doc.text(`Low: ${low}`, 20, y);

    y += 15;

    doc.setFontSize(14);
    doc.text("Security Findings", 20, y);

    y += 10;

    doc.setFontSize(10);

    findings.forEach((finding, index) => {

      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      doc.text(
        `${index + 1}. ${
          finding.title ||
          finding.name ||
          "Security Finding"
        }`,
        20,
        y
      );

      y += 6;

      doc.text(
        `Severity: ${finding.severity || "Unknown"}`,
        25,
        y
      );

      y += 6;

      if (finding.endpoint) {
        doc.text(
          `Endpoint: ${finding.endpoint}`,
          25,
          y
        );

        y += 6;
      }

      if (finding.description) {
        const lines = doc.splitTextToSize(
          `Description: ${finding.description}`,
          165
        );

        doc.text(
          lines,
          25,
          y
        );

        y += lines.length * 5;
      }

      y += 6;
    });

    doc.save(
      "sentinelapi-security-report.pdf"
    );
  };

  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="SECURITY REPORTING"
        title="Reports"
        description="Review and export the latest security assessment."
      />

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-[#0c1220] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">
                Security Assessment
              </p>

              <p className="text-xs text-slate-500 mt-1">
                Latest generated report
              </p>
            </div>

            <FileBarChart className="text-cyan-400" />
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-7">
            <ReportMetric
              label="Score"
              value={`${score}/100`}
            />

            <ReportMetric
              label="Findings"
              value={findings.length}
            />

            <ReportMetric
              label="Endpoints"
              value={scanInfo?.endpoints_scanned || "—"}
            />
          </div>

          <div className="mt-6 flex gap-3">
            <button className="px-4 py-3 rounded-xl bg-cyan-400 text-slate-950 font-semibold text-sm">
              Export JSON
            </button>

            <button
  onClick={downloadPDF}
  disabled={!scanInfo}
  className="px-4 py-3 rounded-xl bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
>
  PDF Report
</button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0c1220] p-6">
          <p className="font-semibold">
            Risk Distribution
          </p>

          <div className="mt-6 space-y-4">
            <RiskBar
              label="Critical"
              count={findings.filter((x) => x.severity === "CRITICAL").length}
            />

            <RiskBar
              label="High"
              count={findings.filter((x) => x.severity === "HIGH").length}
            />

            <RiskBar
              label="Medium"
              count={findings.filter((x) => x.severity === "MEDIUM").length}
            />

            <RiskBar
              label="Low"
              count={findings.filter((x) => x.severity === "LOW").length}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   HISTORY
========================================================= */

function HistoryPage({ history }) {
  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="AUDIT TRAIL"
        title="Scan History"
        description="Track previous SentinelAPI security assessments."
      />

      <div className="rounded-2xl border border-slate-800 bg-[#0c1220] overflow-hidden">
        {history.length === 0 ? (
          <EmptyState
            icon={Clock3}
            title="No scan history"
            description="Completed scans will appear here."
          />
        ) : (
          history.map((scan) => (
            <div
              key={scan.id}
              className="px-6 py-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div>
                <p className="font-medium">
                  {scan.target}
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  {scan.date}
                </p>
              </div>

              <div className="flex items-center gap-6 text-sm">
                <span>
                  {scan.findings} findings
                </span>

                <span className="font-bold text-cyan-400">
                  {scan.score}/100
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* =========================================================
   SETTINGS
========================================================= */

function SettingsPage({ selectedTarget }) {
  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="CONFIGURATION"
        title="Settings"
        description="Configure scanner behaviour and API analysis."
      />

      <div className="max-w-3xl rounded-2xl border border-slate-800 bg-[#0c1220] p-6 space-y-6">
        <SettingRow
          title="Current Target"
          description="API selected for the current workspace"
          value={selectedTarget.name}
        />

        <SettingRow
          title="Scanner Backend"
          description="Local SentinelAPI scanning service"
          value="localhost:4000"
        />

        <SettingRow
          title="Security Engine"
          description="Python vulnerability analysis engine"
          value="Online"
        />

        <SettingRow
          title="Report Storage"
          description="Latest scanner report location"
          value="scan-report.json"
        />
      </div>
    </div>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function PageHeading({
  eyebrow,
  title,
  description
}) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.25em] text-cyan-400 font-bold">
        {eyebrow}
      </p>

      <h1 className="text-2xl lg:text-3xl font-bold mt-2">
        {title}
      </h1>

      <p className="text-sm text-slate-500 mt-2">
        {description}
      </p>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  danger,
  warning
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0c1220] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500">
            {title}
          </p>

          <p className="text-3xl font-bold mt-2">
            {value}
          </p>

          <p className="text-[11px] text-slate-600 mt-1">
            {subtitle}
          </p>
        </div>

        <div
          className={`p-2.5 rounded-xl ${
            danger
              ? "bg-red-500/10 text-red-400"
              : warning
              ? "bg-orange-500/10 text-orange-400"
              : "bg-cyan-400/10 text-cyan-400"
          }`}
        >
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
}

function MiniStat({ title, value }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-4">
      <p className="text-xs text-slate-500">
        {title}
      </p>

      <p className="text-2xl font-bold mt-1">
        {value}
      </p>
    </div>
  );
}

function FindingRow({ finding, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full px-6 py-5 border-b border-slate-800 hover:bg-slate-800/30 transition flex items-center justify-between text-left"
    >
      <div className="flex items-center gap-4 min-w-0">
        <SeverityBadge severity={finding.severity} />

        <div className="min-w-0">
          <p className="font-medium truncate">
            {finding.type}
          </p>

          <p className="font-mono text-xs text-slate-500 mt-1 truncate">
            {finding.endpoint}
          </p>
        </div>
      </div>

      <ChevronRight
        size={18}
        className="text-slate-600 flex-shrink-0"
      />
    </button>
  );
}

function SeverityBadge({ severity }) {
  const styles = {
    CRITICAL:
      "bg-red-500/10 text-red-400 border-red-500/20",
    HIGH:
      "bg-orange-500/10 text-orange-400 border-orange-500/20",
    MEDIUM:
      "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    LOW:
      "bg-blue-500/10 text-blue-400 border-blue-500/20"
  };

  return (
    <span
      className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold flex-shrink-0 ${
        styles[severity] ||
        "bg-slate-800 text-slate-400 border-slate-700"
      }`}
    >
      {severity || "INFO"}
    </span>
  );
}

function ScanMode({
  active,
  title,
  description
}) {
  return (
    <div
      className={`p-4 rounded-xl border ${
        active
          ? "border-cyan-400/30 bg-cyan-400/5"
          : "border-slate-800 bg-[#070b14]"
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            active
              ? "bg-cyan-400"
              : "bg-slate-600"
          }`}
        />

        <p className="text-sm font-medium">
          {title}
        </p>
      </div>

      <p className="text-xs text-slate-500 mt-2">
        {description}
      </p>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description
}) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto w-12 h-12 rounded-xl bg-slate-800/70 flex items-center justify-center">
        <Icon className="text-slate-500" />
      </div>

      <p className="mt-4 font-medium text-slate-300">
        {title}
      </p>

      <p className="text-xs text-slate-600 mt-1">
        {description}
      </p>
    </div>
  );
}

function ReportMetric({ label, value }) {
  return (
    <div className="rounded-xl bg-[#070b14] border border-slate-800 p-4">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="text-2xl font-bold mt-1">
        {value}
      </p>
    </div>
  );
}

function RiskBar({ label, count }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-2">
        <span className="text-slate-400">
          {label}
        </span>

        <span className="text-slate-300">
          {count}
        </span>
      </div>

      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-cyan-400 rounded-full"
          style={{
            width: `${Math.min(100, count * 20)}%`
          }}
        />
      </div>
    </div>
  );
}

function SettingRow({
  title,
  description,
  value
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800 last:border-0 last:pb-0">
      <div>
        <p className="text-sm font-medium">
          {title}
        </p>

        <p className="text-xs text-slate-500 mt-1">
          {description}
        </p>
      </div>

      <span className="px-3 py-2 rounded-lg bg-slate-800 text-xs text-cyan-300 font-mono">
        {value}
      </span>
    </div>
  );
}

/* =========================================================
   FINDING MODAL
========================================================= */

function FindingModal({
  finding,
  onClose
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-[#0c1220] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#0c1220]/95 backdrop-blur border-b border-slate-800 px-6 py-5 flex items-start justify-between">
          <div>
            <SeverityBadge severity={finding.severity} />

            <h2 className="text-xl font-bold mt-3">
              {finding.type}
            </h2>

            <p className="text-xs text-slate-500 font-mono mt-1">
              {finding.endpoint}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <Detail
            label="Evidence"
            value={finding.evidence}
          />

          <Detail
            label="Expected Response"
            value={finding.expected}
          />

          <Detail
            label="Actual Response"
            value={finding.actual}
          />

          <TextDetail
            label="What We Found"
            value={finding.description}
          />

          <TextDetail
            label="Recommended Solution"
            value={finding.recommendation}
          />

          <div className="rounded-xl border border-cyan-400/10 bg-cyan-400/5 p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck
                size={17}
                className="text-cyan-400"
              />

              <p className="font-semibold text-sm">
                Remediation Guidance
              </p>
            </div>

            <p className="text-sm text-slate-400 mt-3">
              Validate authentication and authorization
              server-side, restrict sensitive response
              fields, and add automated security tests
              covering this endpoint.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-600 mb-2">
        {label}
      </p>

      <div className="bg-[#070b14] border border-slate-800 rounded-xl px-4 py-3 font-mono text-xs text-cyan-300 break-all">
        {value || "Not provided"}
      </div>
    </div>
  );
}

function TextDetail({ label, value }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-600 mb-2">
        {label}
      </p>

      <p className="text-sm text-slate-300 leading-6">
        {value || "No description available."}
      </p>
    </div>
  );
}

export default App;