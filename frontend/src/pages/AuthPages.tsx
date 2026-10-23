import { FormEvent, useEffect, useState } from "react";
import {
  AlertTriangle,
  Baby,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  HeartPulse,
  LogIn,
  Shield,
  Sparkles,
  Stethoscope,
  UserPlus,
} from "lucide-react";
import { Link } from "react-router-dom";
import { User, UserRole } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/useAuth";
import { useLanguage } from "@/context/useLanguage";
import "./AuthPages.css";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/common/FormField";
import { LanguageSelector } from "@/components/common/LanguageSelector";

const publicPortals = [
  { value: "mother", labelKey: "portalMother", Icon: Sparkles },
  { value: "doctor", labelKey: "portalDoctor", Icon: Stethoscope },
  { value: "caregiver", labelKey: "portalCaregiver", Icon: Baby },
] as const;

export function AuthPage({
  initialMode = "login",
  adminOnly = false,
}: {
  initialMode?: "login" | "register";
  adminOnly?: boolean;
} = {}) {
  const { signIn, signUp } = useAuth();
  const { t, language } = useLanguage();
  const [registering, setRegistering] = useState(initialMode === "register" && !adminOnly);

  // Initialize from query parameters if present
  const queryParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const roleParam = queryParams?.get("role");
  const initialRole: "mother" | "doctor" | "caregiver" =
    roleParam === "doctor" || roleParam === "caregiver" ? roleParam : "mother";

  const portalParam = queryParams?.get("portal") as UserRole | null;
  const initialPortal: UserRole = adminOnly
    ? "admin"
    : portalParam === "doctor" || portalParam === "caregiver" || portalParam === "admin"
    ? portalParam
    : "mother";

  // Common credentials state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Role selections
  const [role, setRole] = useState<"mother" | "doctor" | "caregiver">(initialRole);
  const [loginPortal, setLoginPortal] = useState<UserRole>(initialPortal);

  // Dynamic login identifier state
  const [loginDoctorId, setLoginDoctorId] = useState("");
  const [loginMedicalLicense, setLoginMedicalLicense] = useState("");
  const [loginMotherId, setLoginMotherId] = useState("");

  // Role-specific registration identifier state
  const [registerDoctorId, setRegisterDoctorId] = useState("");
  const [registerMedicalLicense, setRegisterMedicalLicense] = useState("");
  const [registerMotherId, setRegisterMotherId] = useState("");

  // Registration success state
  const [registeredUser, setRegisteredUser] = useState<User | null>(null);

  // Feedback states
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Paint the viewport background on <body> (which always spans at least the
  // visible viewport) so this section can stay content-height. Removed on
  // unmount so no other route is affected.
  useEffect(() => {
    document.body.classList.add("nh-auth-bg");
    return () => document.body.classList.remove("nh-auth-bg");
  }, []);

  function authErrorMessage(reason: unknown) {
    if (reason instanceof Error) {
      if (reason.message === "Doctor account pending verification") return t.auth.doctorPending;
      if (reason.message === "This account is not available for the selected portal") return t.auth.portalMismatch;
      return reason.message;
    }
    return t.auth.authError;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (registering) {
      // Validate common registration fields
      if (password !== confirmPassword) {
        setError(t.auth.passwordsDoNotMatch ?? "Passwords do not match.");
        return;
      }
      if (password.length < 8) {
        setError(t.auth.passwordMinLength ?? "Password must be at least 8 characters.");
        return;
      }
      if (!phone.trim() || !/^\+?[0-9\s-]{10,15}$/.test(phone.trim())) {
        setError("Please enter a valid phone number (10-15 digits).");
        return;
      }

      let parsedAge: number | undefined = undefined;
      if (role === "mother" || role === "doctor") {
        parsedAge = parseInt(age, 10);
        if (isNaN(parsedAge) || parsedAge < 14 || parsedAge > 120) {
          setError("Please enter a valid age.");
          return;
        }
      }

      // Role-specific required fields
      if (role === "mother" && !registerDoctorId.trim()) {
        setError("Doctor ID is required for mother registration.");
        return;
      }
      if (role === "doctor" && !registerMedicalLicense.trim()) {
        setError("Medical License / Registration Number is required for doctor registration.");
        return;
      }
      if (role === "caregiver" && !registerMotherId.trim()) {
        setError("Mother / Patient ID is required for caregiver registration.");
        return;
      }

      setSubmitting(true);
      try {
        const created = await signUp({
          name: name.trim(),
          email: email.trim(),
          password,
          confirm_password: confirmPassword,
          phone: phone.trim(),
          role,
          preferred_language: language,
          age: parsedAge,
          doctor_id: role === "mother" ? registerDoctorId.trim() : undefined,
          medical_license: role === "doctor" ? registerMedicalLicense.trim() : undefined,
          mother_id: role === "caregiver" ? registerMotherId.trim() : undefined,
        });
        if (created) {
          setRegisteredUser(created);
        }
      } catch (reason) {
        setError(authErrorMessage(reason));
      } finally {
        setSubmitting(false);
      }
    } else {
      // Login validation
      if (loginPortal === "mother" && !loginDoctorId.trim()) {
        setError("Doctor ID is required to sign in as a Mother.");
        return;
      }
      if (loginPortal === "doctor" && !loginMedicalLicense.trim()) {
        setError("Medical License / Registration Number is required to sign in as a Doctor.");
        return;
      }
      if (loginPortal === "caregiver" && !loginMotherId.trim()) {
        setError("Mother / Patient ID is required to sign in as a Caregiver.");
        return;
      }

      setSubmitting(true);
      try {
        await signIn(email.trim(), password, loginPortal, {
          doctor_id: loginPortal === "mother" ? loginDoctorId.trim() : undefined,
          medical_license: loginPortal === "doctor" ? loginMedicalLicense.trim() : undefined,
          mother_id: loginPortal === "caregiver" ? loginMotherId.trim() : undefined,
        });
      } catch (reason) {
        setError(authErrorMessage(reason));
      } finally {
        setSubmitting(false);
      }
    }
  }

  const renderPasswordToggle = (show: boolean, onToggle: () => void) => (
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      aria-label={show ? (t.auth.hidePassword ?? "Hide password") : (t.auth.showPassword ?? "Show password")}
      className="p-1 text-muted hover:text-ink focus:outline-none dark:hover:text-white"
    >
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );

  return (
    <div className="nh-auth flex">
      <div className="fixed right-4 top-4 z-20">
        <LanguageSelector />
      </div>

      <Card className="nh-auth-card w-full max-w-lg border-lavender-100 p-8 shadow-card dark:border-white/10">
        {/* Brand Header */}
        <div className="nh-auth-brand mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-glow">
            <HeartPulse className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-black text-ink dark:text-white">{t.common.appName}</p>
            <p className="text-xs text-muted dark:text-white/50">{t.common.tagline}</p>
          </div>
        </div>

        {registeredUser ? (
          /* Registration Success View */
          <div className="nh-auth-success space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-500/15 dark:text-emerald-200">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h2 className="text-base font-black text-ink dark:text-white">
                  {t.auth.regSuccessTitle ?? "Registration Successful"}
                </h2>
                <p className="text-xs text-muted dark:text-white/70">
                  Account for <span className="font-bold text-ink dark:text-white">{registeredUser.name}</span> ({registeredUser.email}) has been created.
                </p>
              </div>
            </div>

            {/* Generated ID highlight */}
            <div className="rounded-2xl border border-lavender-200 bg-surface/90 p-4 text-center dark:border-white/10 dark:bg-white/5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted dark:text-white/60">
                {t.auth.yourAssignedId ?? "Your Generated ID"}
              </p>
              <p className="mt-1 font-mono text-2xl font-black text-primary dark:text-lavender-100 selection:bg-primary/20">
                {registeredUser.custom_id || registeredUser.id}
              </p>
              <p className="mt-1 text-[11px] text-muted dark:text-white/50">
                Please save this identifier for your records and portal sign-in.
              </p>
            </div>

            {/* Role-specific notice */}
            {registeredUser.role === "doctor" && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-xs font-black">
                    {t.auth.verificationPending ?? "Verification Pending"}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-4 text-muted dark:text-white/70">
                    {t.auth.regSuccessDoctorPending ??
                      "Your doctor account has been registered and is pending verification. An administrator or clinical coordinator will review your medical credentials before login is permitted."}
                  </p>
                </div>
              </div>
            )}

            {registeredUser.role === "caregiver" && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-200">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-xs font-black">
                    {t.auth.consentPending ?? "Consent Pending"}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-4 text-muted dark:text-white/70">
                    {t.auth.regSuccessCaregiverPending ??
                      "Your caregiver account has been registered. Access to records remains pending until the mother grants consent in her portal."}
                  </p>
                </div>
              </div>
            )}

            {registeredUser.role === "mother" && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-primary/20 bg-primary/10 p-3.5 text-ink dark:border-primary/30 dark:bg-primary/15 dark:text-white">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-xs font-black">Account Active</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-muted dark:text-white/70">
                    {t.auth.regSuccessMother ??
                      "Your mother account has been registered successfully. Share your Mother ID with your family caregivers."}
                  </p>
                </div>
              </div>
            )}

            <Button
              className="mt-4 w-full"
              onClick={() => {
                const userRole = registeredUser.role;
                const userEmail = registeredUser.email;
                setRegisteredUser(null);
                setRegistering(false);
                setLoginPortal(userRole);
                setEmail(userEmail);
                setPassword("");
                setConfirmPassword("");
                setError("");
                if (userRole === "mother") setLoginDoctorId(registerDoctorId);
                if (userRole === "doctor") setLoginMedicalLicense(registerMedicalLicense);
                if (userRole === "caregiver") setLoginMotherId(registerMotherId);
              }}
            >
              <LogIn className="h-4 w-4" />
              {t.auth.proceedToSignIn ?? "Proceed to Sign In"}
            </Button>
          </div>
        ) : (
          <>
            <h1 className="nh-auth-title text-2xl font-black text-ink dark:text-white">
              {adminOnly ? t.auth.adminSignInTitle : registering ? t.auth.createAccount : t.auth.welcomeBack}
            </h1>
            <p className="nh-auth-subtitle mt-1 text-xs leading-5 text-muted dark:text-white/60">
              {adminOnly ? t.auth.adminSignInSubtitle : registering ? t.auth.signUpSubtitle : t.auth.signInSubtitle}
            </p>

            {!registering ? (
              adminOnly ? (
                <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-accent/30 bg-accent/10 p-3">
                  <Shield className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <div>
                    <p className="text-xs font-black text-ink dark:text-white">{t.auth.adminPortal}</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-muted dark:text-white/60">{t.auth.adminOnlyNote}</p>
                  </div>
                </div>
              ) : (
                <div className="mt-5">
                  <p className="mb-2 text-xs font-bold text-ink dark:text-white">{t.auth.portalLabel}</p>
                  <div role="group" aria-label={t.auth.portalLabel} className="grid grid-cols-3 gap-2">
                    {publicPortals.map((portal) => {
                      const PortalIcon = portal.Icon;
                      const active = loginPortal === portal.value;
                      return (
                        <button
                          key={portal.value}
                          type="button"
                          aria-pressed={active}
                          disabled={submitting}
                          onClick={() => {
                            setLoginPortal(portal.value);
                            setError("");
                          }}
                          className={cn(
                            "flex min-h-[62px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-2.5 text-[11px] font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                            active
                              ? "border-primary/50 bg-primary/10 text-primary shadow-soft dark:border-primary/40 dark:bg-primary/15"
                              : "border-lavender-200 bg-white/60 text-muted hover:border-primary/30 hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:text-white",
                          )}
                        >
                          <PortalIcon className="h-4 w-4" />
                          {t.auth[portal.labelKey]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )
            ) : null}

            {/* Credentials Form */}
            <form className="nh-auth-form mt-6 space-y-3.5" onSubmit={submit}>
              {registering ? (
                <>
                  <FormField
                    label={t.auth.fullName}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    minLength={2}
                    disabled={submitting}
                  />

                  <div>
                    <label htmlFor="register-role-select" className="mb-1 block text-xs font-bold text-ink dark:text-white">
                      {t.auth.roleLabel}
                    </label>
                    <select
                      id="register-role-select"
                      value={role}
                      onChange={(e) => {
                        setRole(e.target.value as "mother" | "doctor" | "caregiver");
                        setError("");
                      }}
                      disabled={submitting}
                      className="h-10 w-full rounded-2xl border border-lavender-200 bg-white/80 px-3 text-xs font-semibold text-ink outline-none transition focus:border-primary dark:border-white/10 dark:bg-white/10 dark:text-white"
                    >
                      <option value="mother">{t.auth.roleMother}</option>
                      <option value="doctor">{t.auth.roleDoctor ?? "Doctor (licensed clinical professional)"}</option>
                      <option value="caregiver">{t.auth.roleCaregiver}</option>
                    </select>
                    <p className="mt-1 text-[11px] leading-4 text-muted dark:text-white/60">
                      {role === "doctor"
                        ? (t.auth.doctorNotice ?? "Doctor accounts require administrative verification before portal login is enabled.")
                        : role === "caregiver"
                        ? (t.auth.caregiverNotice ?? "Caregiver access remains pending until the mother explicitly approves consent in her Care Circle.")
                        : t.auth.roleProvisioningNote}
                    </p>
                  </div>

                  {/* Age: Required for Mother and Doctor */}
                  {(role === "mother" || role === "doctor") && (
                    <FormField
                      label={t.auth.age ?? "Age"}
                      type="number"
                      value={age}
                      onChange={(event) => setAge(event.target.value)}
                      required
                      min={role === "doctor" ? 21 : 14}
                      max={100}
                      disabled={submitting}
                    />
                  )}
                </>
              ) : null}

              <FormField
                label={t.auth.email}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={submitting}
              />

              {registering ? (
                <FormField
                  label={t.auth.phoneNumber ?? "Phone Number"}
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+91 98765 43210"
                  required
                  disabled={submitting}
                />
              ) : null}

              <FormField
                label={t.auth.password}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                disabled={submitting}
                trailingAction={renderPasswordToggle(showPassword, () => setShowPassword(!showPassword))}
              />

              {registering ? (
                <>
                  <FormField
                    label={t.auth.confirmPassword ?? "Confirm Password"}
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    minLength={8}
                    disabled={submitting}
                    trailingAction={renderPasswordToggle(showConfirmPassword, () => setShowConfirmPassword(!showConfirmPassword))}
                  />

                  {/* Role-specific identifiers for registration */}
                  {role === "mother" && (
                    <FormField
                      label={t.auth.doctorId ?? "Doctor ID"}
                      value={registerDoctorId}
                      onChange={(event) => setRegisterDoctorId(event.target.value)}
                      placeholder={t.auth.doctorIdPlaceholder ?? "e.g. DOC-100001"}
                      hint="Required: ID of your registered doctor (e.g. DOC-100001)"
                      required
                      disabled={submitting}
                    />
                  )}

                  {role === "doctor" && (
                    <FormField
                      label={t.auth.medicalLicense ?? "Medical License / Registration Number"}
                      value={registerMedicalLicense}
                      onChange={(event) => setRegisterMedicalLicense(event.target.value)}
                      placeholder={t.auth.medicalLicensePlaceholder ?? "e.g. MCI-2024-98765"}
                      hint="Required: Unique official medical license or council registration"
                      required
                      disabled={submitting}
                    />
                  )}

                  {role === "caregiver" && (
                    <FormField
                      label={t.auth.motherId ?? "Mother / Patient ID"}
                      value={registerMotherId}
                      onChange={(event) => setRegisterMotherId(event.target.value)}
                      placeholder={t.auth.motherIdPlaceholder ?? "e.g. MTH-100001"}
                      hint="Required: Patient ID of the mother you are supporting (e.g. MTH-100001)"
                      required
                      disabled={submitting}
                    />
                  )}
                </>
              ) : null}

              {/* Dynamic Login Identifier Fields */}
              {!registering && !adminOnly && loginPortal === "mother" && (
                <FormField
                  label={t.auth.doctorId ?? "Doctor ID"}
                  value={loginDoctorId}
                  onChange={(event) => setLoginDoctorId(event.target.value)}
                  placeholder={t.auth.doctorIdPlaceholder ?? "e.g. DOC-100001"}
                  hint="Required: Enter your assigned Doctor ID (e.g. DOC-100001)"
                  required
                  disabled={submitting}
                />
              )}

              {!registering && !adminOnly && loginPortal === "doctor" && (
                <FormField
                  label={t.auth.medicalLicense ?? "Medical License / Registration Number"}
                  value={loginMedicalLicense}
                  onChange={(event) => setLoginMedicalLicense(event.target.value)}
                  placeholder={t.auth.medicalLicensePlaceholder ?? "e.g. MCI-2024-98765"}
                  hint="Required: Enter your registered medical license number"
                  required
                  disabled={submitting}
                />
              )}

              {!registering && !adminOnly && loginPortal === "caregiver" && (
                <FormField
                  label={t.auth.motherId ?? "Mother / Patient ID"}
                  value={loginMotherId}
                  onChange={(event) => setLoginMotherId(event.target.value)}
                  placeholder={t.auth.motherIdPlaceholder ?? "e.g. MTH-100001"}
                  hint="Required: Enter the Patient ID of the mother you are supporting"
                  required
                  disabled={submitting}
                />
              )}

              {error ? <p role="alert" className="text-xs font-bold text-danger">{error}</p> : null}

              <Button className="w-full" disabled={submitting}>
                {registering ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                {submitting ? t.auth.connecting : registering ? t.auth.createAccount : t.auth.signIn}
              </Button>
            </form>

            {adminOnly ? (
              <Link to="/login" className="mt-4 block w-full text-center text-xs font-bold text-primary hover:underline">
                {t.auth.backToPublicLogin}
              </Link>
            ) : (
              <button
                type="button"
                className="mt-4 w-full text-center text-xs font-bold text-primary hover:underline"
                onClick={() => {
                  setRegistering((value) => !value);
                  setError("");
                }}
              >
                {registering ? t.auth.alreadyHaveAccount : t.auth.newToNurtureHer}
              </button>
            )}
          </>
        )}
      </Card>
    </div>
  );
}