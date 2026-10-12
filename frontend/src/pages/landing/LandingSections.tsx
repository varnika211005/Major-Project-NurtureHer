/**
 * NurtureHer landing page sections, part 1 (header through platform).
 * Markup and styling reproduce the approved design reference; all copy
 * arrives localized via props from LandingPage.
 */
import { Link } from "react-router-dom";
import { HERO_IMAGE, ICON_PATHS, sx, type IconName, type LandingLang } from "./landingContent";

export interface HeadWord {
  w: string;
  style: string;
}

export interface Headline {
  eye: string;
  l1: HeadWord[];
  l2: HeadWord[];
  lead: string;
  leadFull: string;
}

export function Icon({ d, size = 26 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

function WordLine({ words }: { words: HeadWord[] }) {
  return (
    <span style={{ display: "block" }}>
      {words.map((word, i) => (
        <span key={i} style={sx(word.style)}>
          {word.w}
        </span>
      ))}
    </span>
  );
}

function SectionHead({ headline, eyebrow }: { headline: Headline; eyebrow: string }) {
  return (
    <>
      <div className="eyebrow" style={sx(headline.eye)}>
        {eyebrow}
      </div>
      <h2 className="disp h2">
        <WordLine words={headline.l1} />
        <WordLine words={headline.l2} />
      </h2>
    </>
  );
}

/* ================= HEADER ================= */

export interface HeaderLangOpt {
  code: LandingLang;
  native: string;
  eng: string;
  on: boolean;
}

interface SiteHeaderProps {
  headerStyle: string;
  nav: { label: string; href: string }[];
  loginLabel: string;
  registerLabel: string;
  menuLabel: string;
  menuOpenLabel: string;
  themeLabel: string;
  langLabel: string;
  langCode: string;
  langOpen: boolean;
  langOpts: HeaderLangOpt[];
  isDark: boolean;
  onMenu: () => void;
  onToggleTheme: () => void;
  onToggleLang: () => void;
  onPickLang: (code: LandingLang) => void;
}

export function SiteHeader(props: SiteHeaderProps) {
  const {
    headerStyle, nav, loginLabel, registerLabel, menuLabel, menuOpenLabel,
    themeLabel, langLabel, langCode, langOpen, langOpts, isDark,
    onMenu, onToggleTheme, onToggleLang, onPickLang,
  } = props;
  return (
    <header style={sx(headerStyle)}>
      <div className="wrap" style={{ display: "flex", alignItems: "center", gap: 20, height: 76 }}>
        <a href="#top" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src={HERO_IMAGE}
            alt="NurtureHer emblem"
            width={48}
            height={48}
            style={{
              display: "block",
              width: 48,
              height: 48,
              borderRadius: "50%",
              boxShadow: "0 8px 20px -8px var(--glow)",
            }}
          />
          <span
            className="disp brandtxt"
            style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--ink)" }}
          >
            Nurture<span style={{ color: "var(--roseDeep)" }}>Her</span>
          </span>
        </a>
        <nav className="navlinks" aria-label="Primary" style={{ flex: 1, display: "flex", justifyContent: "center", gap: 32 }}>
          {nav.map((n) => (
            <a key={n.href} className="navlink" href={n.href}>
              {n.label}
            </a>
          ))}
        </nav>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="lift"
            onClick={onToggleTheme}
            aria-label={themeLabel}
            style={{ width: 44, height: 44, padding: 0, borderRadius: "50%", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {isDark ? (
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            ) : (
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
              </svg>
            )}
          </button>
          <div id="langwrap" style={{ position: "relative" }}>
            <button
              type="button"
              className="lift"
              onClick={onToggleLang}
              aria-haspopup="listbox"
              aria-expanded={langOpen}
              aria-label={langLabel}
              style={{ height: 44, padding: "0 14px", borderRadius: 999, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 15 }}
            >
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" />
              </svg>
              <span>{langCode}</span>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {langOpen ? (
              <div role="listbox" aria-label={langLabel} style={{ position: "absolute", right: 0, top: 54, zIndex: 80, minWidth: 210, padding: 8, borderRadius: 20, background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "0 30px 60px -24px var(--glow)", display: "flex", flexDirection: "column", gap: 2 }}>
                {langOpts.map((lo) => (
                  <button
                    key={lo.code}
                    type="button"
                    role="option"
                    aria-selected={lo.on}
                    onClick={() => onPickLang(lo.code)}
                    style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, width: "100%", padding: "11px 14px", borderRadius: 14, border: 0, textAlign: "left", color: "var(--ink)", background: lo.on ? "var(--blush)" : "transparent" }}
                  >
                    <span style={{ fontWeight: 700, fontSize: 16 }}>{lo.native}</span>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>{lo.eng}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <Link className="navlink loginlink" to="/login" style={{ padding: "0 12px" }}>
            {loginLabel}
          </Link>
          <Link className="btn btn-dark regbtn" to="/register" style={{ height: 44, padding: "0 22px", fontSize: 15 }}>
            {registerLabel}
          </Link>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onMenu}
            aria-label={menuOpenLabel}
            style={{ height: 44, padding: "0 16px", fontSize: 13, letterSpacing: "0.12em" }}
          >
            <span>{menuLabel}</span>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M4 8h16M4 16h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

/* ================= HERO ================= */

export interface DemoWindow {
  style: string;
  bodyStyle: string;
  onDragStart: (e: React.PointerEvent) => void;
  onMinimise: () => void;
  onClose: () => void;
}

export interface MoodButton {
  label: string;
  on: boolean;
  pick: () => void;
  style: string;
}

export interface GuideTabLink {
  num: string;
  short: string;
  pick: () => void;
}

interface HeroProps {
  pill: string;
  heroWords: { w: string; style: string }[];
  heroLead: string;
  getStartedLabel: string;
  openLetterLabel: string;
  bubbles: { d: string; style: string }[];
  w1: DemoWindow;
  w2: DemoWindow;
  w3: DemoWindow;
  winCheck: string;
  winNote: string;
  winGuides: string;
  minAria: string;
  closeWinAria: string;
  anyClosed: boolean;
  onResetWindows: () => void;
  moods: MoodButton[];
  moodReply: string;
  feelLabel: string;
  todayWill: string;
  twLines: { text: string }[];
  twTyping: boolean;
  twDone: boolean;
  statusSup: string;
  guideTabs: GuideTabLink[];
  topics6: string;
  resetWinsLabel: string;
  onLetter: () => void;
  onGuidePick: (index: number) => void;
}

export function Hero(props: HeroProps) {
  const {
    pill, heroWords, heroLead, getStartedLabel, openLetterLabel, bubbles,
    w1, w2, w3, winCheck, winNote, winGuides, minAria, closeWinAria,
    anyClosed, onResetWindows, moods, moodReply, feelLabel, todayWill,
    twLines, twTyping, twDone, statusSup, guideTabs, topics6, resetWinsLabel,
    onLetter, onGuidePick,
  } = props;
  return (
    <section id="top" style={{ position: "relative", overflow: "hidden", padding: "24px 0 40px" }}>
      <div aria-hidden="true" style={{ position: "absolute", top: -160, left: -140, width: 520, height: 520, borderRadius: "50%", background: "var(--blush)", filter: "blur(90px)", opacity: "var(--blobOp)" }} />
      <div aria-hidden="true" style={{ position: "absolute", top: 60, right: -160, width: 560, height: 560, borderRadius: "50%", background: "var(--lav)", filter: "blur(100px)", opacity: "var(--blobOp)" }} />

      <div className="wrap" style={{ position: "relative", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 48 }}>
        <div style={{ flex: "1 1 460px", minWidth: 0 }}>
          <div className="pill" style={{ animation: "glide .9s cubic-bezier(.2,.7,.2,1) 0.05s backwards" }}>
            {pill}
          </div>
          <h1
            className="disp"
            style={{ margin: "22px 0 0", fontSize: "clamp(44px,6.4vw,84px)", lineHeight: "var(--lh0)", letterSpacing: "-0.03em", fontWeight: 700, color: "var(--ink)" }}
          >
            {heroWords.map((hw, i) => (
              <span key={i} style={sx(hw.style)}>
                {hw.w}
              </span>
            ))}
          </h1>
          <p className="lead" style={{ maxWidth: 520, animation: "glide 1s cubic-bezier(.2,.7,.2,1) 0.8s backwards" }}>
            {heroLead}
          </p>
          <div style={{ marginTop: 32, display: "flex", flexWrap: "wrap", gap: 14, animation: "glide 1s cubic-bezier(.2,.7,.2,1) 1s backwards" }}>
            <Link className="btn btn-dark" to="/register">
              <span>{getStartedLabel}</span>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <button type="button" className="btn btn-ghost" onClick={onLetter}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 6h16v12H4zM4 7l8 6 8-6" />
              </svg>
              <span>{openLetterLabel}</span>
            </button>
          </div>
        </div>

        {/* desktop scene: draggable windows */}
        <div style={{ position: "relative", flex: "1 1 480px", minWidth: 0, maxWidth: 600, height: 620 }}>
          <img
            className="float"
            src={HERO_IMAGE}
            alt=""
            style={{ position: "absolute", right: 0, top: 0, width: 200, height: 200, borderRadius: "50%", zIndex: 1, boxShadow: "0 30px 60px -24px var(--glow)" }}
          />
          {bubbles.map((b, i) => (
            <div key={i} aria-hidden="true" style={sx(b.style)}>
              <Icon d={b.d} />
            </div>
          ))}

          <HeroWindow win={w1} title={winCheck} titleBg="linear-gradient(90deg,var(--blush),var(--lav))" minimiseLabel={minAria} closeLabel={closeWinAria}>
            <div style={{ padding: "14px 16px 16px" }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{feelLabel}</div>
              <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {moods.map((m) => (
                  <button key={m.label} type="button" onClick={m.pick} aria-pressed={m.on} style={sx(m.style)}>
                    {m.label}
                  </button>
                ))}
              </div>
              <div aria-live="polite" style={{ marginTop: 12, minHeight: 42, fontSize: 13, lineHeight: 1.55, color: "var(--muted)" }}>
                {moodReply}
              </div>
            </div>
          </HeroWindow>

          <HeroWindow win={w2} title={winNote} titleBg="linear-gradient(90deg,var(--lav),var(--blush))" minimiseLabel={minAria} closeLabel={closeWinAria}>
            <div style={{ padding: "14px 16px 16px", fontSize: 14, lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{todayWill}</div>
              {twLines.map((ln, i) => (
                <div key={i} style={{ minHeight: 24, display: "flex", gap: 8 }}>
                  <span style={{ color: "var(--roseDeep)" }}>›</span>
                  <span>{ln.text}</span>
                </div>
              ))}
              {twTyping ? (
                <span className="cursor" style={{ color: "var(--roseDeep)" }}>
                  |
                </span>
              ) : null}
              {twDone ? (
                <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 999, background: "var(--lav2)", fontWeight: 700, fontSize: 13 }}>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12l4 4 10-10" />
                  </svg>
                  <span>{statusSup}</span>
                </div>
              ) : null}
            </div>
          </HeroWindow>

          <HeroWindow win={w3} title={winGuides} titleBg="linear-gradient(90deg,var(--blush),var(--lav))" minimiseLabel={minAria} closeLabel={closeWinAria}>
            <div style={{ padding: "8px 8px 10px" }}>
              {guideTabs.map((gt, i) => (
                <a
                  key={gt.num}
                  href="#guides"
                  onClick={() => onGuidePick(i)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 10px", borderRadius: 14, fontSize: 14, fontWeight: 600 }}
                >
                  <span className="disp" style={{ color: "var(--roseDeep)" }}>
                    {gt.num}
                  </span>
                  <span style={{ flex: 1 }}>{gt.short}</span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{topics6}</span>
                </a>
              ))}
            </div>
          </HeroWindow>

          {anyClosed ? (
            <button type="button" className="pill" onClick={onResetWindows} style={{ position: "absolute", left: 0, bottom: 0, zIndex: 7 }}>
              {resetWinsLabel}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function HeroWindow({
  win,
  title,
  titleBg,
  minimiseLabel,
  closeLabel,
  children,
}: {
  win: DemoWindow;
  title: string;
  titleBg: string;
  minimiseLabel: string;
  closeLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div style={sx(win.style)}>
      <div
        onPointerDown={win.onDragStart}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", cursor: "grab", userSelect: "none", touchAction: "none", background: titleBg, borderRadius: "19px 19px 0 0" }}
      >
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>{title}</span>
        <button type="button" className="wbtn" onClick={win.onMinimise} aria-label={minimiseLabel}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
            <path d="M6 12h12" />
          </svg>
        </button>
        <button type="button" className="wbtn" onClick={win.onClose} aria-label={closeLabel}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <div style={sx(win.bodyStyle)}>{children}</div>
    </div>
  );
}

/* ================= MARQUEE ================= */

export function Marquee({ headline, eyebrow, marqA, marqB }: { headline: Headline; eyebrow: string; marqA: string[]; marqB: string[] }) {
  return (
    <section id="marq" className="sec" style={{}}>
      <div className="wrap" style={{ textAlign: "center", marginBottom: 32 }}>
        <SectionHead headline={headline} eyebrow={eyebrow} />
      </div>
      <div style={{ overflow: "hidden", padding: "6px 0" }}>
        <div className="marq">
          {marqA.map((t, i) => (
            <span key={i} className="pill" style={{ marginRight: 16, padding: "16px 28px", fontSize: 18, fontWeight: 700 }}>
              {t}
            </span>
          ))}
          {marqA.map((t, i) => (
            <span key={`dup-${i}`} className="pill" aria-hidden="true" style={{ marginRight: 16, padding: "16px 28px", fontSize: 18, fontWeight: 700 }}>
              {t}
            </span>
          ))}
        </div>
      </div>
      <div style={{ overflow: "hidden", padding: "6px 0", marginTop: 14 }}>
        <div className="marq rev">
          {marqB.map((t, i) => (
            <span key={i} className="pill" aria-hidden="true" style={{ marginRight: 16, padding: "16px 28px", fontSize: 18, fontWeight: 700, background: "var(--lav2)" }}>
              {t}
            </span>
          ))}
          {marqB.map((t, i) => (
            <span key={`dup-${i}`} className="pill" aria-hidden="true" style={{ marginRight: 16, padding: "16px 28px", fontSize: 18, fontWeight: 700, background: "var(--lav2)" }}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================= WHY (click + wheel stepping, no scroll pin) ================= */

export interface WhyListItem {
  num: string;
  title: string;
  on: boolean;
  pick: () => void;
  style: string;
}

export interface WhyCard {
  num: string;
  title: string;
  body: string;
  icon: IconName;
  tags: string[];
  hidden: boolean;
  style: string;
}

export function Why({
  headline,
  eyebrow,
  whyList,
  whyFillStyle,
  whyCards,
}: {
  headline: Headline;
  eyebrow: string;
  whyList: WhyListItem[];
  whyFillStyle: string;
  whyCards: WhyCard[];
}) {
  return (
    <section id="why" className="sec">
      <div className="wrap" style={{ textAlign: "center" }}>
        <SectionHead headline={headline} eyebrow={eyebrow} />
      </div>

      <div id="why-track" className="wrap" style={{ marginTop: 32 }}>
        <div id="why-hover" style={{ display: "flex", flexWrap: "wrap", gap: 32, alignItems: "stretch" }}>
          <div style={{ position: "relative", flex: "1 1 300px", maxWidth: 380, display: "flex", flexDirection: "column", gap: 10, margin: "0 auto" }}>
            {whyList.map((w) => (
              <button key={w.num} type="button" onClick={w.pick} aria-pressed={w.on} style={sx(w.style)}>
                <span className="disp" style={{ fontSize: 22, fontWeight: 700, color: "var(--roseDeep)" }}>
                  {w.num}
                </span>
                <span style={{ fontSize: 17, fontWeight: 700, textAlign: "left" }}>{w.title}</span>
              </button>
            ))}
            <div aria-hidden="true" style={{ height: 6, borderRadius: 6, background: "var(--line)", marginTop: 8, overflow: "hidden" }}>
              <div style={sx(whyFillStyle)} />
            </div>
          </div>
          <div className="card" style={{ flex: "2 1 460px", minWidth: 0, display: "grid", overflow: "hidden" }}>
            {whyCards.map((wc) => (
              <div key={wc.num} aria-hidden={wc.hidden} style={sx(wc.style)}>
                <div style={{ flex: "1 1 300px", minWidth: 0 }}>
                  <div className="disp" style={{ fontSize: 20, fontWeight: 700, color: "var(--roseDeep)" }}>
                    {wc.num}
                  </div>
                  <h3 className="disp" style={{ margin: "10px 0 14px", fontSize: "clamp(28px,3.4vw,40px)", lineHeight: "var(--lh1)", fontWeight: 700, letterSpacing: "-0.01em" }}>
                    {wc.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: 17, lineHeight: 1.65, color: "var(--muted)" }}>{wc.body}</p>
                  <div style={{ marginTop: 22, display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {wc.tags.map((t) => (
                      <span key={t} className="pill">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div aria-hidden="true" style={{ flex: "0 1 240px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 240 }}>
                  <div
                    className="float"
                    style={{ position: "relative", width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%,var(--orbHi),var(--blush) 55%,var(--lav))", boxShadow: "0 0 0 14px var(--orbRing),0 0 0 15px var(--line),0 40px 60px -30px var(--glow)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--roseDeep)" }}
                  >
                    <svg width={84} height={84} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round">
                      <path d={ICON_PATHS[wc.icon]} />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================= PLATFORM ================= */

export interface PlatformTab {
  num: string;
  title: string;
  body: string;
  on: boolean;
  pick: () => void;
  style: string;
}

export function Platform({
  headline,
  eyebrow,
  lead,
  revealStyle,
  tabs,
  activeIndex,
  previewWord,
  goodMorning,
  feelLabel,
  weekSample,
  courses,
  turnRows,
}: {
  headline: Headline;
  eyebrow: string;
  lead: string;
  revealStyle: string;
  tabs: PlatformTab[];
  activeIndex: number;
  previewWord: string;
  goodMorning: string;
  feelLabel: string;
  weekSample: string;
  courses: string[];
  turnRows: string[];
}) {
  return (
    <section id="platform" className="sec" style={sx(revealStyle)}>
      <div className="wrap">
        <div style={{ maxWidth: 720 }}>
          <SectionHead headline={headline} eyebrow={eyebrow} />
          <p className="lead" style={sx(headline.lead)}>
            {lead}
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 40, marginTop: 40, alignItems: "flex-start" }}>
          <div style={{ flex: "1 1 320px", display: "flex", flexDirection: "column", gap: 12 }}>
            {tabs.map((tb) => (
              <button key={tb.num} type="button" onClick={tb.pick} aria-pressed={tb.on} style={sx(tb.style)}>
                <span className="disp" style={{ fontSize: 24, fontWeight: 700, color: "var(--roseDeep)" }}>
                  {tb.num}
                </span>
                <span style={{ textAlign: "left" }}>
                  <span style={{ display: "block", fontSize: 19, fontWeight: 700 }}>{tb.title}</span>
                  <span style={{ display: "block", marginTop: 6, fontSize: 15, lineHeight: 1.55, color: "var(--muted)" }}>{tb.body}</span>
                </span>
              </button>
            ))}
          </div>
          <div style={{ flex: "1.4 1 460px", minWidth: 0 }}>
            <div className="card" style={{ overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", background: "var(--lav2)", borderBottom: "1px solid var(--line)" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#F3B6C0" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#E3D9F8" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#D9CCF5" }} />
                <span style={{ marginLeft: 12, flex: 1, textAlign: "center", fontSize: 12, color: "var(--muted)" }}>nurtureher.app · {previewWord}</span>
              </div>
              <div style={{ minHeight: 400, padding: 28 }}>
                {activeIndex === 0 ? (
                  <div>
                    <div className="disp" style={{ fontSize: 26, fontWeight: 700 }}>
                      {goodMorning}
                    </div>
                    <div style={{ marginTop: 4, color: "var(--muted)", fontSize: 15 }}>{feelLabel}</div>
                    <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                      <span style={{ width: 46, height: 46, borderRadius: "50%", background: "var(--blush)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--roseDeep)" }}>
                        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 20s-7-4.4-8.6-9A4.8 4.8 0 0 1 12 7.2 4.8 4.8 0 0 1 20.6 11C19 15.6 12 20 12 20z" />
                        </svg>
                      </span>
                      <span style={{ width: 46, height: 46, borderRadius: "50%", background: "var(--lav)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink)" }}>
                        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
                        </svg>
                      </span>
                      <span style={{ width: 46, height: 46, borderRadius: "50%", background: "var(--lav2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink)" }}>
                        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
                        </svg>
                      </span>
                    </div>
                    <div style={{ marginTop: 28, fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" }}>
                      {weekSample}
                    </div>
                    <div aria-hidden="true" style={{ marginTop: 12, height: 120, display: "flex", alignItems: "flex-end", gap: 12 }}>
                      {["40%", "62%", "36%", "74%", "54%", "86%", "66%"].map((h, i) => (
                        <div key={i} style={{ flex: 1, height: h, borderRadius: 10, background: i === 6 ? "var(--lilac)" : i % 2 ? "var(--blush)" : "var(--lav)" }} />
                      ))}
                    </div>
                  </div>
                ) : null}
                {activeIndex === 1 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div className="disp" style={{ fontSize: 26, fontWeight: 700 }}>
                      {tabs[1].title}
                    </div>
                    {[courses[0], courses[1], courses[2]].map((title, i) => (
                      <div key={title} style={{ padding: "16px 18px", border: "1px solid var(--line)", borderRadius: 18 }}>
                        <div style={{ fontWeight: 700 }}>{title}</div>
                        <div aria-hidden="true" style={{ marginTop: 10, height: 6, borderRadius: 6, background: "var(--line)" }}>
                          <div style={{ width: ["70%", "35%", "12%"][i], height: "100%", borderRadius: 6, background: "linear-gradient(90deg,#E8B4BC,#B9A5EC)" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                {activeIndex === 2 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div className="disp" style={{ fontSize: 26, fontWeight: 700 }}>
                      {tabs[2].title}
                    </div>
                    {[
                      { label: turnRows[0], bg: "var(--blush)" },
                      { label: turnRows[1], bg: "var(--lav)" },
                      { label: turnRows[2], bg: "var(--lav2)" },
                    ].map((row) => (
                      <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", borderRadius: 18, background: row.bg }}>
                        <span style={{ flex: 1, fontWeight: 700 }}>{row.label}</span>
                        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
