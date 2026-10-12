/**
 * NurtureHer landing page sections, part 2 (demo through overlays).
 * Markup and styling reproduce the approved design reference; all copy
 * arrives localized via props from LandingPage.
 */
import { Link } from "react-router-dom";
import { HERO_IMAGE, ICON_PATHS, sx, type IconName } from "./landingContent";
import { Icon, type Headline } from "./LandingSections";

function SectionHeadCenter({ headline, eyebrow }: { headline: Headline; eyebrow: string }) {
  return (
    <>
      <div className="eyebrow" style={sx(headline.eye)}>
        {eyebrow}
      </div>
      <h2 className="disp h2">
        <span style={{ display: "block" }}>
          {headline.l1.map((word, i) => (
            <span key={i} style={sx(word.style)}>
              {word.w}
            </span>
          ))}
        </span>
        <span style={{ display: "block" }}>
          {headline.l2.map((word, i) => (
            <span key={i} style={sx(word.style)}>
              {word.w}
            </span>
          ))}
        </span>
      </h2>
    </>
  );
}

/* ================= LIVE DEMO ================= */

export interface DemoTab {
  label: string;
  on: boolean;
  pick: () => void;
  style: string;
}

export interface QuizOption {
  label: string;
  on: boolean;
  pick: () => void;
  style: string;
}

export interface QuizQuestion {
  q: string;
  opts: QuizOption[];
}

export interface DemoRun {
  n: number;
  label: string;
  score: number;
}

interface DemoProps {
  headline: Headline;
  eyebrow: string;
  lead: string;
  revealStyle: string;
  demoTabs: DemoTab[];
  demoTab: number;
  howTitle: string;
  howP1: string;
  howP2: string;
  howSample: string;
  runsTitle: string;
  runsEmptyText: string;
  guideTitle: string;
  guideP1: string;
  guideP2: string;
  weeklyCheck: string;
  gentleLabel: string;
  reflectionLabel: string;
  quiz: QuizQuestion[];
  runLabel: string;
  resetLabel: string;
  consoleLabel: string;
  demoOut: { title: string; body: string };
  runs: DemoRun[];
  runsEmpty: boolean;
  onRun: () => void;
  onReset: () => void;
  assistShow: boolean;
  assistTitle: string;
  assistBody: string;
  dismissLabel: string;
  acceptLabel: string;
  onAssistDismiss: () => void;
  onAssistAccept: () => void;
}

export function Demo(props: DemoProps) {
  const {
    headline, eyebrow, lead, revealStyle, demoTabs, demoTab,
    howTitle, howP1, howP2, howSample, runsTitle, runsEmptyText,
    guideTitle, guideP1, guideP2, weeklyCheck, gentleLabel, reflectionLabel,
    quiz, runLabel, resetLabel, consoleLabel, demoOut, runs, runsEmpty,
    onRun, onReset, assistShow, assistTitle, assistBody, dismissLabel, acceptLabel,
    onAssistDismiss, onAssistAccept,
  } = props;
  return (
    <section id="demo" className="sec" style={sx(revealStyle)}>
      <div className="wrap">
        <div style={{ maxWidth: 720 }}>
          <SectionHeadCenter headline={headline} eyebrow={eyebrow} />
          <p className="lead" style={sx(headline.lead)}>
            {lead}
          </p>
        </div>

        <div className="card" style={{ position: "relative", marginTop: 32, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: "1px solid var(--line)", background: "var(--lav2)" }}>
            <span className="disp" style={{ fontWeight: 700, fontSize: 18 }}>
              {weeklyCheck}
            </span>
            <span className="pill" style={{ background: "var(--blush)", borderColor: "var(--blush)" }}>
              {gentleLabel}
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 340px", minWidth: 0, borderRight: "1px solid var(--line)", padding: "22px 24px" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {demoTabs.map((dt) => (
                  <button key={dt.label} type="button" onClick={dt.pick} aria-pressed={dt.on} style={sx(dt.style)}>
                    {dt.label}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 20, minHeight: 250, fontSize: 15, lineHeight: 1.65, color: "var(--muted)" }}>
                {demoTab === 0 ? (
                  <div>
                    <div className="disp" style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>
                      {howTitle}
                    </div>
                    <p style={{ margin: "10px 0 0" }}>{howP1}</p>
                    <p style={{ margin: "14px 0 0" }}>{howP2}</p>
                    <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 16, background: "var(--lav2)", color: "var(--ink)", fontSize: 14 }}>
                      {howSample}
                    </div>
                  </div>
                ) : null}
                {demoTab === 1 ? (
                  <div>
                    <div className="disp" style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>
                      {runsTitle}
                    </div>
                    {runsEmpty ? <p style={{ margin: "10px 0 0" }}>{runsEmptyText}</p> : null}
                    {runs.map((rn) => (
                      <div key={rn.n} style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "center", padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 14, color: "var(--ink)" }}>
                        <span className="disp" style={{ fontWeight: 700, color: "var(--roseDeep)" }}>
                          #{rn.n}
                        </span>
                        <span style={{ flex: 1, fontWeight: 600 }}>{rn.label}</span>
                        <span style={{ fontSize: 13, color: "var(--muted)" }}>{rn.score} / 6</span>
                      </div>
                    ))}
                  </div>
                ) : null}
                {demoTab === 2 ? (
                  <div>
                    <div className="disp" style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>
                      {guideTitle}
                    </div>
                    <p style={{ margin: "10px 0 0" }}>{guideP1}</p>
                    <p style={{ margin: "14px 0 0" }}>{guideP2}</p>
                  </div>
                ) : null}
              </div>
            </div>

            <div style={{ flex: "1.3 1 420px", minWidth: 0, padding: "22px 24px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--roseDeep)" }}>
                {reflectionLabel}
              </div>
              {quiz.map((qq) => (
                <div key={qq.q} style={{ marginTop: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{qq.q}</div>
                  <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {qq.opts.map((op) => (
                      <button key={op.label} type="button" onClick={op.pick} aria-pressed={op.on} style={sx(op.style)}>
                        {op.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 22, display: "flex", gap: 10 }}>
                <button type="button" className="btn btn-dark" onClick={onRun} style={{ height: 46, padding: "0 24px", fontSize: 15 }}>
                  {runLabel}
                </button>
                <button type="button" className="btn btn-ghost" onClick={onReset} style={{ height: 46, padding: "0 22px", fontSize: 15 }}>
                  {resetLabel}
                </button>
              </div>
              <div aria-live="polite" style={{ marginTop: 20, padding: "18px 20px", borderRadius: 20, background: "var(--bg2)", border: "1px solid var(--line)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" }}>
                  {consoleLabel}
                </div>
                <div className="disp" style={{ marginTop: 6, fontSize: 20, fontWeight: 700 }}>
                  {demoOut.title}
                </div>
                <div style={{ marginTop: 6, fontSize: 15, lineHeight: 1.6, color: "var(--muted)" }}>{demoOut.body}</div>
              </div>
            </div>
          </div>

          {assistShow ? (
            <div role="dialog" aria-label={assistTitle} style={{ position: "absolute", right: 20, bottom: 20, zIndex: 3, maxWidth: 290, padding: "16px 18px", borderRadius: 20, background: "var(--surface)", color: "var(--ink)", border: "1px solid var(--line)", boxShadow: "0 24px 40px -20px rgba(58,39,80,0.6)" }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{assistTitle}</div>
              <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.5 }}>{assistBody}</div>
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={onAssistDismiss}
                  style={{ height: 36, padding: "0 16px", borderRadius: 999, border: "1.5px solid var(--line)", background: "transparent", color: "var(--ink)", fontWeight: 600, fontSize: 13 }}
                >
                  {dismissLabel}
                </button>
                <button
                  type="button"
                  onClick={onAssistAccept}
                  style={{ height: 36, padding: "0 16px", borderRadius: 999, border: 0, background: "#F3C6C0", color: "#3A2750", fontWeight: 700, fontSize: 13 }}
                >
                  {acceptLabel}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* ================= GUIDES ================= */

export interface GuideTabButton {
  num: string;
  title: string;
  on: boolean;
  select: () => void;
  style: string;
}

export interface GuideModule {
  num: string;
  text: string;
}

export function Guides({
  headline,
  eyebrow,
  lead,
  revealStyle,
  guideTabs,
  guideCur,
  exploreLabel,
  getSummaryLabel,
  onSummary,
}: {
  headline: Headline;
  eyebrow: string;
  lead: string;
  revealStyle: string;
  guideTabs: GuideTabButton[];
  guideCur: { tag: string; title: string; summary: string; mods: GuideModule[] };
  exploreLabel: string;
  getSummaryLabel: string;
  onSummary: () => void;
}) {
  return (
    <section id="guides" className="sec" style={sx(revealStyle)}>
      <div className="wrap">
        <div style={{ maxWidth: 720 }}>
          <SectionHeadCenter headline={headline} eyebrow={eyebrow} />
          <p className="lead" style={sx(headline.lead)}>
            {lead}
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 32, marginTop: 40, alignItems: "stretch" }}>
          <div style={{ flex: "1 1 300px", maxWidth: 380, display: "flex", flexDirection: "column", gap: 12, margin: "0 auto" }}>
            {guideTabs.map((g) => (
              <button key={g.num} type="button" onClick={g.select} aria-pressed={g.on} style={sx(g.style)}>
                <span className="disp" style={{ fontSize: 26, fontWeight: 700, color: "var(--roseDeep)" }}>
                  {g.num}
                </span>
                <span style={{ textAlign: "left", fontSize: 18, fontWeight: 700 }}>{g.title}</span>
              </button>
            ))}
          </div>
          <div className="card" style={{ flex: "2 1 460px", minWidth: 0, padding: 40 }}>
            <span className="pill" style={{ background: "var(--blush)", borderColor: "var(--blush)" }}>
              {guideCur.tag}
            </span>
            <h3 className="disp" style={{ margin: "16px 0 12px", fontSize: "clamp(28px,3.4vw,40px)", lineHeight: "var(--lh1)", fontWeight: 700, letterSpacing: "-0.01em" }}>
              {guideCur.title}
            </h3>
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.65, color: "var(--muted)" }}>{guideCur.summary}</p>
            <div style={{ marginTop: 28, display: "flex", flexWrap: "wrap", gap: 12 }}>
              {guideCur.mods.map((md) => (
                <div key={md.num} style={{ flex: "1 1 240px", display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", border: "1px solid var(--line)", borderRadius: 18 }}>
                  <span className="disp" style={{ fontWeight: 700, color: "var(--roseDeep)" }}>
                    {md.num}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{md.text}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 32, display: "flex", flexWrap: "wrap", gap: 14 }}>
              <Link className="btn btn-dark" to="/register">
                {exploreLabel}
              </Link>
              <button type="button" className="btn btn-ghost" onClick={onSummary}>
                {getSummaryLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================= NOTES / VOICES ================= */

export interface VoiceButton {
  icon: IconName;
  d: string;
  aria: string;
  on: boolean;
  pick: () => void;
  style: string;
}

export function Voices({
  headline,
  eyebrow,
  revealStyle,
  voiceBtns,
  voiceQuote,
  voiceNote,
}: {
  headline: Headline;
  eyebrow: string;
  revealStyle: string;
  voiceBtns: VoiceButton[];
  voiceQuote: string;
  voiceNote: string;
}) {
  return (
    <section id="voices" className="sec" style={sx(revealStyle)}>
      <div className="wrap" style={{ textAlign: "center" }}>
        <SectionHeadCenter headline={headline} eyebrow={eyebrow} />
        <div style={{ marginTop: 32, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 14 }}>
          {voiceBtns.map((vb) => (
            <button key={vb.aria} type="button" onClick={vb.pick} aria-label={vb.aria} aria-pressed={vb.on} style={sx(vb.style)}>
              <Icon d={ICON_PATHS[vb.icon]} />
            </button>
          ))}
        </div>
        <div className="card" style={{ maxWidth: 860, margin: "28px auto 0", padding: "48px 40px", background: "linear-gradient(135deg,var(--blush),var(--lav))" }}>
          <div className="disp" aria-hidden="true" style={{ fontSize: 96, lineHeight: 0.6, color: "var(--roseDeep)" }}>
            “
          </div>
          <p className="disp" aria-live="polite" style={{ margin: "8px 0 0", fontSize: "clamp(26px,3.6vw,40px)", lineHeight: 1.25, fontWeight: 600, letterSpacing: "-0.01em" }}>
            {voiceQuote}
          </p>
          <div style={{ marginTop: 24, fontSize: 15, fontWeight: 700, color: "var(--roseDeep)" }}>{voiceNote}</div>
        </div>
      </div>
    </section>
  );
}

/* ================= FAQ ================= */

export interface FaqTabButton {
  label: string;
  on: boolean;
  pick: () => void;
  style: string;
}

export interface FaqItem {
  q: string;
  a: string;
  open: boolean;
  toggle: () => void;
  iconStyle: string;
}

export function Faq({
  headline,
  eyebrow,
  revealStyle,
  faqTabs,
  faqItems,
}: {
  headline: Headline;
  eyebrow: string;
  revealStyle: string;
  faqTabs: FaqTabButton[];
  faqItems: FaqItem[];
}) {
  return (
    <section id="faq" className="sec" style={sx(revealStyle)}>
      <div className="wrap" style={{ maxWidth: 900 }}>
        <div style={{ textAlign: "center" }}>
          <SectionHeadCenter headline={headline} eyebrow={eyebrow} />
          <div style={{ marginTop: 28, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 10 }}>
            {faqTabs.map((ft) => (
              <button key={ft.label} type="button" onClick={ft.pick} aria-pressed={ft.on} style={sx(ft.style)}>
                {ft.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 14 }}>
          {faqItems.map((fq) => (
            <div key={fq.q} className="card" style={{ borderRadius: 24, overflow: "hidden" }}>
              <button
                type="button"
                onClick={fq.toggle}
                aria-expanded={fq.open}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 16, padding: "22px 26px", border: 0, background: "transparent", color: "var(--ink)", textAlign: "left" }}
              >
                <span className="disp" style={{ flex: 1, fontSize: 20, fontWeight: 600, lineHeight: 1.3 }}>
                  {fq.q}
                </span>
                <span style={sx(fq.iconStyle)}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </button>
              {fq.open ? (
                <div style={{ padding: "0 26px 24px", fontSize: 16, lineHeight: 1.7, color: "var(--muted)" }}>{fq.a}</div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================= FINAL CTA ================= */

export function FinalCta({
  headline,
  lead,
  revealStyle,
  getStartedLabel,
  talkLabel,
  onTalk,
}: {
  headline: Headline;
  lead: string;
  revealStyle: string;
  getStartedLabel: string;
  talkLabel: string;
  onTalk: () => void;
}) {
  return (
    <section id="cta" className="sec" style={sx(revealStyle)}>
      <div className="wrap">
        <div style={{ position: "relative", overflow: "hidden", borderRadius: 44, padding: "72px 32px", textAlign: "center", background: "linear-gradient(120deg,var(--blush),var(--lav))", color: "var(--ink)" }}>
          <div aria-hidden="true" style={{ position: "absolute", left: "50%", bottom: -220, width: 820, height: 410, marginLeft: -410, borderRadius: "0 0 999px 999px / 0 0 100% 100%", background: "var(--veil)" }} />
          <div aria-hidden="true" style={{ position: "absolute", left: "50%", bottom: -220, width: 520, height: 260, marginLeft: -260, borderRadius: "0 0 999px 999px / 0 0 100% 100%", background: "var(--veil)" }} />
          <div style={{ position: "relative" }}>
            <h2 className="disp" style={{ margin: 0, fontSize: "clamp(36px,5.4vw,68px)", lineHeight: "var(--lh0)", fontWeight: 700, letterSpacing: "-0.02em" }}>
              <span style={{ display: "block" }}>
                {headline.l1.map((word, i) => (
                  <span key={i} style={sx(word.style)}>
                    {word.w}
                  </span>
                ))}
              </span>
              <span style={{ display: "block" }}>
                {headline.l2.map((word, i) => (
                  <span key={i} style={sx(word.style)}>
                    {word.w}
                  </span>
                ))}
              </span>
            </h2>
            <p style={sx(headline.leadFull)}>{lead}</p>
            <div style={{ marginTop: 28, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14 }}>
              <Link className="btn btn-dark" to="/register">
                {getStartedLabel}
              </Link>
              <button type="button" className="btn btn-ghost" onClick={onTalk}>
                {talkLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================= FOOTER ================= */

export function SiteFooter({
  footTag,
  exploreLabel,
  accountLabel,
  contactLabel,
  navLinks,
  contactLines,
  copyright,
}: {
  footTag: string;
  exploreLabel: string;
  accountLabel: string;
  contactLabel: string;
  navLinks: { label: string; href: string }[];
  contactLines: string[];
  copyright: string;
}) {
  return (
    <footer style={{ background: "var(--foot)", color: "#F6EEFF" }}>
      <div className="wrap" style={{ paddingTop: 56, paddingBottom: 32 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 48, justifyContent: "space-between" }}>
          <div style={{ flex: "1 1 300px", maxWidth: 380 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img src={HERO_IMAGE} alt="" width={56} height={56} style={{ display: "block", width: 56, height: 56, borderRadius: "50%" }} />
              <span className="disp" style={{ fontSize: 28, fontWeight: 700 }}>
                NurtureHer
              </span>
            </div>
            <p style={{ margin: "18px 0 0", fontSize: 15, lineHeight: 1.65, color: "#D8C9EE" }}>
              {footTag}
            </p>
          </div>
          <div style={{ flex: "0 1 160px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F3C6C0" }}>
              {exploreLabel}
            </div>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10, fontSize: 15 }}>
              {navLinks.map((n) => (
                <a key={n.href} href={n.href}>
                  {n.label}
                </a>
              ))}
            </div>
          </div>
          <div style={{ flex: "0 1 160px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F3C6C0" }}>
              {accountLabel}
            </div>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10, fontSize: 15 }}>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </div>
          </div>
          <div style={{ flex: "0 1 220px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F3C6C0" }}>
              {contactLabel}
            </div>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10, fontSize: 15 }}>
              {contactLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid rgba(246,238,255,0.18)", fontSize: 14, lineHeight: 1.6, color: "#D8C9EE" }}>
          {copyright}
        </div>
      </div>
    </footer>
  );
}

/* ================= OVERLAYS ================= */

export function ChatButton({ onTalk, label }: { onTalk: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onTalk}
      aria-label={label}
      style={{ position: "fixed", right: 24, bottom: 24, zIndex: 70, width: 60, height: 60, padding: 0, border: 0, borderRadius: "50%", background: "linear-gradient(135deg,#F3C6C0,#D9A09B 50%,#B9A5EC)", color: "#3A2750", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 20px 36px -12px rgba(154,85,96,0.7)" }}
    >
      <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 5h16v11H9l-5 4z" />
      </svg>
    </button>
  );
}

export interface OverlayMenuLink {
  num: string;
  label: string;
  href: string;
}

export function MenuOverlay({
  menuStyle,
  brandWord,
  brandAccent,
  closeLabel,
  closeWord,
  onClose,
  menuLinks,
  loginLabel,
  registerLabel,
}: {
  menuStyle: string;
  brandWord: string;
  brandAccent: string;
  closeLabel: string;
  closeWord: string;
  onClose: () => void;
  menuLinks: OverlayMenuLink[];
  loginLabel: string;
  registerLabel: string;
}) {
  return (
    <div style={sx(menuStyle)}>
      <div className="wrap" style={{ display: "flex", alignItems: "center", height: 76 }}>
        <span className="disp" style={{ fontSize: 24, fontWeight: 700 }}>
          {brandWord}
          <span style={{ color: "var(--roseDeep)" }}>{brandAccent}</span>
        </span>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onClose}
          aria-label={closeLabel}
          style={{ marginLeft: "auto", height: 44, padding: "0 16px", fontSize: 13, letterSpacing: "0.12em" }}
        >
          <span>{closeWord}</span>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <div className="wrap" style={{ paddingTop: 32, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, paddingBottom: 16 }}>
          <Link className="btn btn-ghost" to="/login" style={{ height: 44, fontSize: 15 }}>
            {loginLabel}
          </Link>
          <Link className="btn btn-dark" to="/register" style={{ height: 44, fontSize: 15 }}>
            {registerLabel}
          </Link>
        </div>
        {menuLinks.map((ml) => (
          <a
            key={ml.num}
            href={ml.href}
            onClick={onClose}
            style={{ display: "flex", alignItems: "baseline", gap: 20, padding: "12px 0", borderBottom: "1px solid var(--line)" }}
          >
            <span className="disp" style={{ fontSize: 18, fontWeight: 700, color: "var(--roseDeep)" }}>
              {ml.num}
            </span>
            <span className="disp" style={{ fontSize: "clamp(34px,6vw,64px)", fontWeight: 700, letterSpacing: "-0.02em" }}>
              {ml.label}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

export interface TalkModalContent {
  title: string;
  sub: string;
  btn: string;
}

export function TalkModal({
  modalStyle,
  modalTitle,
  isLetter,
  isForm,
  formDone,
  letterEye,
  letterTitle,
  letterBody,
  approachLabel,
  approachValue,
  guidanceLabel,
  guidanceValue,
  statusLabel,
  statusValue,
  closeBtnLabel,
  closeAriaLabel,
  thanksTitle,
  thanksBody,
  content,
  fullNameLabel,
  namePh,
  emailLabel,
  phoneLabel,
  optionalLabel,
  prefContactLabel,
  prefOpts,
  onClose,
  onSubmit,
}: {
  modalStyle: string;
  modalTitle: string;
  isLetter: boolean;
  isForm: boolean;
  formDone: boolean;
  letterEye: string;
  letterTitle: string;
  letterBody: string;
  approachLabel: string;
  approachValue: string;
  guidanceLabel: string;
  guidanceValue: string;
  statusLabel: string;
  statusValue: string;
  closeBtnLabel: string;
  closeAriaLabel: string;
  thanksTitle: string;
  thanksBody: string;
  content: TalkModalContent;
  fullNameLabel: string;
  namePh: string;
  emailLabel: string;
  phoneLabel: string;
  optionalLabel: string;
  prefContactLabel: string;
  prefOpts: string[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div style={sx(modalStyle)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={modalTitle}
        style={{ position: "relative", width: "min(520px,100%)", maxHeight: "92%", overflow: "auto", background: "var(--surface)", borderRadius: 32, padding: "36px 32px", boxShadow: "0 40px 80px -30px rgba(58,39,80,0.6)" }}
      >
        <button
          type="button"
          className="wbtn"
          onClick={onClose}
          aria-label={closeAriaLabel}
          style={{ position: "absolute", right: 18, top: 18, width: 36, height: 36, background: "var(--lav2)" }}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        {isLetter ? (
          <div>
            <div className="eyebrow">{letterEye}</div>
            <h3 className="disp" style={{ margin: "12px 0 0", fontSize: 34, lineHeight: "var(--lh1)", fontWeight: 700 }}>
              {letterTitle}
            </h3>
            <p style={{ margin: "16px 0 0", fontSize: 16, lineHeight: 1.7, color: "var(--muted)" }}>
              {letterBody}
            </p>
            <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderRadius: 14, background: "var(--bg2)" }}>
                <span style={{ color: "var(--muted)" }}>{approachLabel}</span>
                <span style={{ fontWeight: 700 }}>{approachValue}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderRadius: 14, background: "var(--bg2)" }}>
                <span style={{ color: "var(--muted)" }}>{guidanceLabel}</span>
                <span style={{ fontWeight: 700 }}>{guidanceValue}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderRadius: 14, background: "var(--lav2)" }}>
                <span style={{ color: "var(--muted)" }}>{statusLabel}</span>
                <span style={{ fontWeight: 700 }}>{statusValue}</span>
              </div>
            </div>
            <button type="button" className="btn btn-dark" onClick={onClose} style={{ marginTop: 26 }}>
              {closeBtnLabel}
            </button>
          </div>
        ) : null}

        {isForm ? (
          <div>
            {formDone ? (
              <div>
                <h3 className="disp" style={{ margin: 0, fontSize: 32, lineHeight: "var(--lh1)", fontWeight: 700 }}>
                  {thanksTitle}
                </h3>
                <p style={{ margin: "14px 0 0", fontSize: 16, lineHeight: 1.7, color: "var(--muted)" }}>
                  {thanksBody}
                </p>
                <button type="button" className="btn btn-dark" onClick={onClose} style={{ marginTop: 24 }}>
                  {closeBtnLabel}
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit}>
                <h3 className="disp" style={{ margin: 0, fontSize: 32, lineHeight: "var(--lh1)", fontWeight: 700 }}>
                  {content.title}
                </h3>
                <p style={{ margin: "12px 0 22px", fontSize: 15, lineHeight: 1.6, color: "var(--muted)" }}>{content.sub}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label htmlFor="f-name" style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 700 }}>
                      {fullNameLabel}
                    </label>
                    <input id="f-name" className="inp" type="text" required placeholder={namePh} />
                  </div>
                  <div>
                    <label htmlFor="f-email" style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 700 }}>
                      {emailLabel}
                    </label>
                    <input id="f-email" className="inp" type="email" required placeholder="you@example.com" />
                  </div>
                  <div>
                    <label htmlFor="f-phone" style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 700 }}>
                      {phoneLabel}
                    </label>
                    <input id="f-phone" className="inp" type="tel" placeholder={optionalLabel} />
                  </div>
                  <div>
                    <label htmlFor="f-pref" style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 700 }}>
                      {prefContactLabel}
                    </label>
                    <select id="f-pref" className="inp" defaultValue={prefOpts[0]}>
                      {prefOpts.map((opt) => (
                        <option key={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn btn-dark" style={{ marginTop: 24, width: "100%", justifyContent: "center" }}>
                  {content.btn}
                </button>
              </form>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
