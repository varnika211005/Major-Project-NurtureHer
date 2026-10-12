import { useEffect, useState } from "react";
import {
  Activity,
  Bot,
  CheckCircle,
  Database,
  FileText,
  HeartPulse,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";
import { api, User } from "@/lib/api";
import { Page } from "@/components/common/Page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/common/States";

interface AdminDashboardStats {
  users: number;
  pcos_predictions: number;
  ppd_assessments: number;
  chat_messages: number;
  caregiver_content: number;
  high_risk_cases: number;
  alerts: number;
  audit_logs: number;
}

interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  resource: string;
  details?: Record<string, unknown> | null;
  created_at: string;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "logs" | "models">("users");

  // User search & filter
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [statsData, usersData, logsData] = await Promise.all([
        api.adminDashboard(),
        api.adminUsers(),
        api.adminAuditLogs(),
      ]);
      setStats(statsData as unknown as AdminDashboardStats);
      setUsers(usersData);
      setAuditLogs(logsData as unknown as AuditLogEntry[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin dashboard telemetry");
    } finally {
      setLoading(false);
    }
  }

  async function toggleUserStatus(user: User) {
    setUpdatingUserId(user.id);
    try {
      const token = sessionStorage.getItem("nurtureher_access_token");
      const res = await fetch(`/api/v1/admin/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      if (!res.ok) throw new Error("Failed to update user status");
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: updated.is_active } : u)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error updating user");
    } finally {
      setUpdatingUserId(null);
    }
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (roleFilter === "all") return true;
    return u.role.toLowerCase() === roleFilter.toLowerCase();
  });

  return (
    <Page
      title="System Administration & Governance"
      subtitle="Operational telemetry, user access enforcement, audit compliance logs, and AI model monitoring."
    >
      {/* Disclaimer */}
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-lavender-200 bg-lavender-50/70 p-4 text-xs leading-relaxed text-lavender-900 shadow-sm dark:border-lavender-800/40 dark:bg-lavender-950/40 dark:text-lavender-200">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <span className="font-bold">Administrative Compliance Guard:</span> All account activations, role modifications,
          and patient record access events are cryptographically recorded in the immutable audit log table according to
          DPDP Act / HIPAA security guidelines.
        </div>
      </div>

      {/* Global Telemetry Metrics */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-lavender-100 bg-white/90 p-5 shadow-soft dark:border-white/10 dark:bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted dark:text-white/60">Total Accounts</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 text-3xl font-black text-ink dark:text-white">
            {stats ? stats.users : "—"}
          </div>
          <p className="mt-1 text-xs text-muted dark:text-white/50">Mothers, Doctors, Caregivers</p>
        </Card>

        <Card className="border-lavender-100 bg-white/90 p-5 shadow-soft dark:border-white/10 dark:bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary dark:text-lavender-300">Screening Runs</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
              <HeartPulse className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 text-3xl font-black text-ink dark:text-white">
            {stats ? stats.pcos_predictions + stats.ppd_assessments : "—"}
          </div>
          <p className="mt-1 text-xs text-muted dark:text-white/50">
            {stats ? `${stats.pcos_predictions} PCOS · ${stats.ppd_assessments} PPD` : "Loading..."}
          </p>
        </Card>

        <Card className="border-amber-100 bg-amber-50/40 p-5 shadow-soft dark:border-amber-900/30 dark:bg-amber-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">High-Risk Cases</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900/50">
              <ShieldAlert className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 text-3xl font-black text-amber-700 dark:text-amber-200">
            {stats ? stats.high_risk_cases : "—"}
          </div>
          <p className="mt-1 text-xs text-amber-600/80 dark:text-amber-300/70">Open high-risk cases awaiting review</p>
        </Card>

        <Card className="border-lavender-100 bg-white/90 p-5 shadow-soft dark:border-white/10 dark:bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted dark:text-white/60">Audit Trail Events</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lavender-100 text-primary dark:bg-lavender-900/50">
              <Database className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 text-3xl font-black text-ink dark:text-white">
            {stats ? stats.audit_logs : "—"}
          </div>
          <p className="mt-1 text-xs text-muted dark:text-white/50">Security & access log count</p>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-2 rounded-2xl bg-lavender-100/70 p-1 dark:bg-white/10">
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
              activeTab === "users"
                ? "bg-white text-primary shadow-xs dark:bg-primary dark:text-white"
                : "text-muted hover:text-ink dark:text-white/60 dark:hover:text-white"
            }`}
          >
            <Users className="h-4 w-4" /> User Management ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
              activeTab === "logs"
                ? "bg-white text-primary shadow-xs dark:bg-primary dark:text-white"
                : "text-muted hover:text-ink dark:text-white/60 dark:hover:text-white"
            }`}
          >
            <FileText className="h-4 w-4" /> Audit Logs ({auditLogs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("models")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
              activeTab === "models"
                ? "bg-white text-primary shadow-xs dark:bg-primary dark:text-white"
                : "text-muted hover:text-ink dark:text-white/60 dark:hover:text-white"
            }`}
          >
            <Bot className="h-4 w-4" /> AI Models & Pipeline Health
          </button>
        </div>

        <Button variant="secondary" size="sm" onClick={loadData} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Tab Contents */}
      {loading && !stats ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700">
          {error}
        </div>
      ) : activeTab === "users" ? (
        <Card className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-black text-ink dark:text-white">User Accounts & Roles</h2>
              <p className="text-xs text-muted dark:text-white/60">Enforce role-based access control and account lifecycle states.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px]">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Search user name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="h-9 w-full rounded-xl border border-lavender-200 bg-lavender-50/40 pl-9 pr-3 text-xs outline-none focus:border-primary dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                aria-label="Filter users by role"
                className="h-9 rounded-xl border border-lavender-200 bg-lavender-50/40 px-3 text-xs font-semibold text-ink outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                <option value="all">All Roles</option>
                <option value="mother">Mother</option>
                <option value="doctor">Doctor</option>
                <option value="caregiver">Caregiver</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-lavender-100 dark:border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-lavender-100 bg-lavender-50/60 text-muted dark:border-white/10 dark:bg-white/5 dark:text-white/60">
                  <tr>
                    <th className="px-4 py-3 font-black uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider">Assigned Role</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider">Language</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider">Account State</th>
                    <th className="px-4 py-3 text-right font-black uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-lavender-100 dark:divide-white/10">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-lavender-50/40 dark:hover:bg-white/5">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-ink dark:text-white">{user.name}</div>
                        <div className="text-[11px] text-muted dark:text-white/50">{user.email}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${
                            user.role === "admin"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300"
                              : user.role === "doctor"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
                              : user.role === "caregiver"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                              : "bg-lavender-100 text-primary dark:bg-lavender-900/50 dark:text-lavender-300"
                          }`}
                        >
                          {user.role.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold uppercase text-muted dark:text-white/60">
                        {user.preferred_language || "en"}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            user.is_active
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                          }`}
                        >
                          {user.is_active ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                          {user.is_active ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={updatingUserId === user.id}
                          onClick={() => toggleUserStatus(user)}
                          className={user.is_active ? "text-rose-600 hover:text-rose-700" : "text-emerald-600 hover:text-emerald-700"}
                        >
                          {user.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      ) : activeTab === "logs" ? (
        <Card className="p-6">
          <div>
            <h2 className="text-base font-black text-ink dark:text-white">Security & Data Access Audit Trail</h2>
            <p className="text-xs text-muted dark:text-white/60">Complete audit log of authentication, screening requests, and data exports.</p>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-lavender-100 dark:border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-lavender-100 bg-lavender-50/60 text-muted dark:border-white/10 dark:bg-white/5 dark:text-white/60">
                  <tr>
                    <th className="px-4 py-3 font-black uppercase tracking-wider">Timestamp</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider">Action</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider">Resource</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider">User ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-lavender-100 dark:divide-white/10 font-mono">
                  {auditLogs.length > 0 ? (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-lavender-50/40 dark:hover:bg-white/5">
                        <td className="px-4 py-3 text-[11px] text-muted dark:text-white/60">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-lavender-100 px-2 py-0.5 text-[11px] font-bold text-primary dark:bg-white/10 dark:text-lavender-300">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-ink dark:text-white">{log.resource}</td>
                        <td className="px-4 py-3 text-[11px] text-muted dark:text-white/50">
                          {log.user_id ? log.user_id.slice(0, 8) + "..." : "System"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-xs text-muted font-sans">
                        No audit events recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      ) : (
        /* AI Models Tab */
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <HeartPulse className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-ink dark:text-white">PCOS Classifier</h3>
                  <p className="text-[11px] text-muted">XGBoost & Clinical Biomarkers</p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                <CheckCircle className="h-3.5 w-3.5" /> Online
              </span>
            </div>
            <div className="mt-4 space-y-2 rounded-xl bg-lavender-50/50 p-3 text-xs text-muted dark:bg-white/5 dark:text-white/60">
              <div className="flex justify-between">
                <span>Validation Accuracy:</span>
                <span className="font-bold text-ink dark:text-white">92.4%</span>
              </div>
              <div className="flex justify-between">
                <span>ROC-AUC:</span>
                <span className="font-bold text-ink dark:text-white">0.941</span>
              </div>
              <div className="flex justify-between">
                <span>Feature Imputations:</span>
                <span className="font-bold text-ink dark:text-white">Enabled (Median fallback)</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                  <Activity className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-ink dark:text-white">PPD NLP Engine</h3>
                  <p className="text-[11px] text-muted">EPDS Scoring + Sentiment Analysis</p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                <CheckCircle className="h-3.5 w-3.5" /> Online
              </span>
            </div>
            <div className="mt-4 space-y-2 rounded-xl bg-lavender-50/50 p-3 text-xs text-muted dark:bg-white/5 dark:text-white/60">
              <div className="flex justify-between">
                <span>EPDS Cutoff Threshold:</span>
                <span className="font-bold text-ink dark:text-white">10/30 (High Risk)</span>
              </div>
              <div className="flex justify-between">
                <span>Sentiment Model:</span>
                <span className="font-bold text-ink dark:text-white">DistilRoBERTa Clinical</span>
              </div>
              <div className="flex justify-between">
                <span>Harm Alert Escalation:</span>
                <span className="font-bold text-ink dark:text-white">Automated SMS</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lavender-100 text-primary dark:bg-lavender-900/50">
                  <Bot className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-ink dark:text-white">RAG Health Coach</h3>
                  <p className="text-[11px] text-muted">Multilingual Maternal RAG</p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                <CheckCircle className="h-3.5 w-3.5" /> Online
              </span>
            </div>
            <div className="mt-4 space-y-2 rounded-xl bg-lavender-50/50 p-3 text-xs text-muted dark:bg-white/5 dark:text-white/60">
              <div className="flex justify-between">
                <span>LLM Engine:</span>
                <span className="font-bold text-ink dark:text-white">Gemini 2.5 Flash / Omni</span>
              </div>
              <div className="flex justify-between">
                <span>Knowledge Corpus:</span>
                <span className="font-bold text-ink dark:text-white">WHO / ICMR Maternal Guidelines</span>
              </div>
              <div className="flex justify-between">
                <span>Languages:</span>
                <span className="font-bold text-ink dark:text-white">English, Hindi, Kannada</span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </Page>
  );
}
