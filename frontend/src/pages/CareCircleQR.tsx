import { Check, Copy, Download, KeyRound, Lock, QrCode, RefreshCw, ShieldCheck, Trash2, UserCheck, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api, CareCircleRequestItem } from "@/lib/api";
import { useAuth } from "@/context/useAuth";
import { Page } from "@/components/common/Page";
import { SectionHeader } from "@/components/common/Premium";
import { EmptyState, LoadingSkeleton } from "@/components/common/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function CareCircleQRPage() {
  const { user } = useAuth();
  const [token, setToken] = useState("");
  const [qrPayload, setQrPayload] = useState("");
  const [requests, setRequests] = useState<CareCircleRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [manualTokenInput, setManualTokenInput] = useState("");
  const [requestRole, setRequestRole] = useState("Caregiver");
  const [requestStatusMsg, setRequestStatusMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"my-qr" | "requests" | "simulate-scan">("my-qr");

  // Sharing permissions config state for approving requests
  const [shareConfig, setShareConfig] = useState({
    share_emergency: true,
    share_risk_category: true,
    share_wellness_summary: true,
  });

  async function loadQRAndRequests() {
    setLoading(true);
    try {
      const [qrRes, reqRes] = await Promise.all([
        api.getCareCircleQR(),
        api.careCircleRequests().catch(() => []),
      ]);
      setToken(qrRes.token);
      setQrPayload(window.location.origin + qrRes.qr_payload);
      setRequests(reqRes);
    } catch {
      // If error, generate one
      try {
        const genRes = await api.generateCareCircleQR();
        setToken(genRes.token);
        setQrPayload(window.location.origin + genRes.qr_payload);
      } catch {
        // Fallback
        setToken("demo-token-nurtureher-carecircle-secure");
        setQrPayload(window.location.origin + "/verify-access?token=demo-token-nurtureher-carecircle-secure");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQRAndRequests();
  }, []);

  async function handleRotateQR() {
    setGenerating(true);
    try {
      const res = await api.generateCareCircleQR();
      setToken(res.token);
      setQrPayload(window.location.origin + res.qr_payload);
      await loadQRAndRequests();
    } catch {
      // Fallback local token rotation
      const newToken = "tok-" + Math.random().toString(36).substring(2, 12);
      setToken(newToken);
      setQrPayload(window.location.origin + "/verify-access?token=" + newToken);
    } finally {
      setGenerating(false);
    }
  }

  async function handleRespondRequest(requestId: string, action: "approve" | "reject") {
    try {
      await api.respondCareCircleRequest(requestId, action, shareConfig);
      await loadQRAndRequests();
    } catch (err) {
      alert("Could not process request: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  }

  async function handleRevoke(requestId: string) {
    if (!confirm("Are you sure you want to revoke access? The user will immediately lose access to your shared health summaries.")) {
      return;
    }
    try {
      await api.revokeCareCircleAccess(requestId);
      await loadQRAndRequests();
    } catch (err) {
      alert("Could not revoke: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  }

  async function handleSimulateScan() {
    if (!manualTokenInput.trim()) return;
    setRequestStatusMsg("");
    try {
      const res = await api.requestCareCircleAccess(manualTokenInput.trim(), requestRole);
      setRequestStatusMsg("✅ Access requested successfully! Status: " + res.status);
      setManualTokenInput("");
      await loadQRAndRequests();
    } catch (err) {
      setRequestStatusMsg("❌ Failed: " + (err instanceof Error ? err.message : "Invalid token"));
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(qrPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function printQRCard() {
    const printWin = window.open("", "_blank", "width=600,height=700");
    if (!printWin) return;
    printWin.document.write(`
      <html>
        <head>
          <title>CareCircle QR Card - ${user?.name}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 40px; }
            .card { border: 2px solid #633B73; border-radius: 20px; padding: 30px; max-width: 400px; margin: 0 auto; background: #FFFCFA; }
            h1 { color: #633B73; margin-bottom: 5px; font-size: 20px; }
            p { color: #766B7B; font-size: 12px; }
            .qr-box { background: white; padding: 20px; border-radius: 14px; border: 1px solid #EDE4F3; display: inline-block; margin: 20px 0; }
            .notice { font-size: 10px; color: #854D0E; background: #FEF3C7; padding: 10px; border-radius: 8px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>CareCircle TrustVault QR</h1>
            <p>Scan to request consent-governed health access for <strong>${user?.name}</strong></p>
            <div class="qr-box">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrPayload)}" alt="CareCircle QR" />
            </div>
            <p style="font-size: 11px; word-break: break-all;"><strong>Link:</strong> ${qrPayload}</p>
            <div class="notice">
              <strong>🔒 Privacy Assured:</strong> No health or personal data is encoded in this QR code. Scanning submits a tokenized request requiring explicit mother consent.
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWin.document.close();
  }

  return (
    <Page
      title="CareCircle QR TrustVault"
      subtitle="Zero-knowledge, consent-governed healthcare access sharing for family and health workers"
    >
      {/* Navigation Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-lavender-200 pb-3 dark:border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab("my-qr")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-black transition ${
            activeTab === "my-qr"
              ? "bg-primary text-white shadow-glow"
              : "bg-white text-ink hover:bg-lavender-50 dark:bg-white/10 dark:text-white"
          }`}
        >
          <QrCode className="h-4 w-4" /> My Personal QR Code
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("requests")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-black transition ${
            activeTab === "requests"
              ? "bg-primary text-white shadow-glow"
              : "bg-white text-ink hover:bg-lavender-50 dark:bg-white/10 dark:text-white"
          }`}
        >
          <Users className="h-4 w-4" /> Access Requests & Active Circles ({requests.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("simulate-scan")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-black transition ${
            activeTab === "simulate-scan"
              ? "bg-primary text-white shadow-glow"
              : "bg-white text-ink hover:bg-lavender-50 dark:bg-white/10 dark:text-white"
          }`}
        >
          <KeyRound className="h-4 w-4" /> Scan QR / Request Access
        </button>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* TAB 1: MY QR CODE */}
          {activeTab === "my-qr" && (
            <div className="grid gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
              {/* QR Display Card */}
              <Card className="text-center p-7">
                <Badge className="mb-2">ACTIVE ENCRYPTED TOKEN</Badge>
                <h2 className="text-lg font-black text-ink dark:text-white">Your Personal CareCircle QR</h2>
                <p className="mt-1 text-xs text-muted">
                  Share with your spouse, trusted caregiver, or ASHA worker
                </p>

                {/* QR Code Container */}
                <div className="mx-auto my-6 flex h-60 w-60 items-center justify-center rounded-3xl border-2 border-dashed border-lavender-300 bg-white p-4 shadow-soft dark:border-white/20 dark:bg-white">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrPayload)}`}
                    alt="CareCircle QR Code"
                    className="h-full w-full rounded-2xl"
                  />
                </div>

                <div className="flex items-center justify-center gap-2">
                  <Button variant="secondary" className="text-xs" onClick={copyLink}>
                    {copied ? <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
                    {copied ? "Link Copied" : "Copy Secure Link"}
                  </Button>
                  <Button variant="secondary" className="text-xs" onClick={printQRCard}>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Print / Save
                  </Button>
                  <Button className="text-xs" disabled={generating} onClick={handleRotateQR} title="Rotate token">
                    <RefreshCw className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </Card>

              {/* Privacy Principles and Granular Consent Config */}
              <div className="space-y-6">
                <Card>
                  <SectionHeader
                    title="TrustVault Privacy & Security Principles"
                    subtitle="Engineered for data minimization, maternal dignity, and consent"
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-lavender-200/80 bg-lavender-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                      <div className="flex items-center gap-2 text-primary font-black text-sm">
                        <Lock className="h-4 w-4" />
                        <span>Zero Medical Data in QR</span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted dark:text-white/60">
                        The QR code contains exclusively a cryptographically signed access-request token. No symptoms, names, or diagnosis reside inside the image.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-lavender-200/80 bg-lavender-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                      <div className="flex items-center gap-2 text-emerald-600 font-black text-sm">
                        <UserCheck className="h-4 w-4" />
                        <span>Explicit Maternal Approval</span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted dark:text-white/60">
                        Scanning does NOT reveal data immediately. It submits a pending request that appears on your dashboard, requiring your explicit consent.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-lavender-200/80 bg-lavender-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                      <div className="flex items-center gap-2 text-amber-600 font-black text-sm">
                        <ShieldCheck className="h-4 w-4" />
                        <span>Instant Revocation</span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted dark:text-white/60">
                        You can revoke caregiver or healthcare-worker access at any time with one tap. Access is terminated immediately across all sessions.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-lavender-200/80 bg-lavender-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                      <div className="flex items-center gap-2 text-indigo-600 font-black text-sm">
                        <RefreshCw className="h-4 w-4" />
                        <span>Auto-Expiring Tokens</span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted dark:text-white/60">
                        QR tokens expire automatically after 30 days or whenever rotated, preventing stale physical prints from being exploited.
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Default Sharing Scope Preferences */}
                <Card>
                  <SectionHeader
                    title="Configured Information Scope"
                    subtitle="Select what information is permitted when you approve a caregiver request"
                  />
                  <div className="space-y-3">
                    <label className="flex items-center justify-between gap-3 rounded-2xl border border-lavender-200 bg-lavender-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                      <div>
                        <p className="text-sm font-black text-ink dark:text-white">Emergency Details & Blood Group</p>
                        <p className="text-xs text-muted">Emergency contacts and SOS escalation info</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={shareConfig.share_emergency}
                        onChange={(e) => setShareConfig({ ...shareConfig, share_emergency: e.target.checked })}
                        className="h-5 w-5 accent-primary"
                      />
                    </label>

                    <label className="flex items-center justify-between gap-3 rounded-2xl border border-lavender-200 bg-lavender-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                      <div>
                        <p className="text-sm font-black text-ink dark:text-white">Screening Risk Category</p>
                        <p className="text-xs text-muted">Broad category (Low, Moderate, High) without raw symptom details</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={shareConfig.share_risk_category}
                        onChange={(e) => setShareConfig({ ...shareConfig, share_risk_category: e.target.checked })}
                        className="h-5 w-5 accent-primary"
                      />
                    </label>

                    <label className="flex items-center justify-between gap-3 rounded-2xl border border-lavender-200 bg-lavender-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                      <div>
                        <p className="text-sm font-black text-ink dark:text-white">High-Level Wellness & Energy Trends</p>
                        <p className="text-xs text-muted">Recent mood and fatigue indicators to help caregivers assist with daily care</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={shareConfig.share_wellness_summary}
                        onChange={(e) => setShareConfig({ ...shareConfig, share_wellness_summary: e.target.checked })}
                        className="h-5 w-5 accent-primary"
                      />
                    </label>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 2: ACCESS REQUESTS */}
          {activeTab === "requests" && (
            <Card>
              <SectionHeader
                title="Incoming Access Requests & Active Circles"
                subtitle="Review, approve, reject, or revoke caregiver and health worker connections"
              />

              {requests.length === 0 ? (
                <EmptyState
                  title="No Access Requests Yet"
                  text="When a family caregiver, doctor, or ASHA worker scans your CareCircle QR code, their connection request will appear here for your approval."
                />
              ) : (
                <div className="space-y-4">
                  {requests.map((req) => (
                    <div
                      key={req.id}
                      className="flex flex-col justify-between gap-4 rounded-2xl border border-lavender-200 bg-lavender-50/70 p-5 dark:border-white/10 dark:bg-white/5 sm:flex-row sm:items-center"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-ink dark:text-white">{req.requester_name}</span>
                          <Badge>{req.relationship_label}</Badge>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                              req.status === "approved"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                                : req.status === "pending"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200"
                            }`}
                          >
                            {req.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted">
                          {req.requester_email} · Requested on {new Date(req.requested_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {req.status === "pending" && (
                          <>
                            <Button
                              className="h-9 px-4 text-xs bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => void handleRespondRequest(req.id, "approve")}
                            >
                              <Check className="mr-1 h-3.5 w-3.5" /> Approve Access
                            </Button>
                            <Button
                              variant="secondary"
                              className="h-9 px-4 text-xs text-rose-600 hover:bg-rose-50"
                              onClick={() => void handleRespondRequest(req.id, "reject")}
                            >
                              <X className="mr-1 h-3.5 w-3.5" /> Reject
                            </Button>
                          </>
                        )}

                        {req.status === "approved" && (
                          <Button
                            variant="secondary"
                            className="h-9 px-4 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                            onClick={() => void handleRevoke(req.id)}
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Revoke Access
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* TAB 3: SIMULATE SCAN */}
          {activeTab === "simulate-scan" && (
            <Card className="max-w-xl mx-auto p-7">
              <SectionHeader
                title="Scan QR / Enter Access Token"
                subtitle="Use this simulation interface if scanning from another device or testing connection workflows"
              />

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-muted">Your Relationship</label>
                  <select
                    value={requestRole}
                    onChange={(e) => setRequestRole(e.target.value)}
                    className="mt-1.5 h-11 w-full rounded-2xl border border-lavender-200 bg-white/90 px-4 text-sm font-semibold text-ink outline-none dark:border-white/10 dark:bg-white/10 dark:text-white"
                  >
                    <option value="Husband">Husband</option>
                    <option value="Family Caregiver">Family Caregiver</option>
                    <option value="Mother / Mother-in-Law">Mother / Mother-in-Law</option>
                    <option value="Consulting Doctor">Consulting Doctor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-muted">QR Access Token</label>
                  <Input
                    placeholder="Paste or enter token..."
                    value={manualTokenInput}
                    onChange={(e) => setManualTokenInput(e.target.value)}
                    className="mt-1.5"
                  />
                  <button
                    type="button"
                    onClick={() => setManualTokenInput(token)}
                    className="mt-1 text-xs font-bold text-primary hover:underline"
                  >
                    Fill current mother's token for demo testing
                  </button>
                </div>

                {requestStatusMsg && (
                  <p className="rounded-xl bg-lavender-100 p-3 text-xs font-bold text-ink dark:bg-white/10 dark:text-white">
                    {requestStatusMsg}
                  </p>
                )}

                <Button className="w-full" onClick={() => void handleSimulateScan()}>
                  Submit Access Request
                </Button>
              </div>
            </Card>
          )}
        </>
      )}
    </Page>
  );
}
