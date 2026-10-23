/**
 * NurtureHer public landing page (route `/` for logged-out visitors).
 * Interactive state is ported from the approved design reference; localized
 * copy and theme tokens live in landingContent.ts, markup in LandingSections.
 *
 * - Language follows the app-wide LanguageContext (English fallback).
 * - Theme toggle is landing-scoped and persisted to localStorage under its
 *   own key; dashboard/global theming is untouched.
 * - WHY navigation is click-first; wheel stepping is bounded and never traps
 *   page scrolling (passes through at both ends and for small deltas).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/context/useLanguage";
import { useTheme } from "@/theme/useTheme";
import "./landing.css";
import {
  BUBBLES,
  ICON_PATHS,
  LANDING_DARK_TOKENS,
  LANDING_DICT,
  LANDING_LANG_OPTS,
  LANDING_LIGHT_TOKENS,
  resolveLandingLang,
  type LandingDict,
} from "./landingContent";
import { ChatButton, Demo, Faq, FinalCta, Guides, MenuOverlay, SiteFooter, TalkModal, Voices } from "./LandingSections2";
import { Hero, Marquee, Platform, SiteHeader, Why, type Headline, type HeadWord } from "./LandingSections";

const SEEN_IDS = ["marq", "why", "platform", "demo", "guides", "voices", "faq", "cta"];

const two = (k: number) => (k < 9 ? "0" : "") + (k + 1);

interface WinPos {
  x: number;
  y: number;
}

const WIN_DEFS: Record<string, { L: number; T: number; W: number; dl: number }> = {
  a: { L: 0, T: 70, W: 300, dl: 0.35 },
  b: { L: 250, T: 250, W: 310, dl: 0.5 },
  c: { L: 0, T: 370, W: 270, dl: 0.65 },
};

export default function LandingPage() {
  const { language: appLanguage, setLanguage: setAppLanguage } = useLanguage();
  const lang = resolveLandingLang(appLanguage);
  const t: LandingDict = LANDING_DICT[lang];
  const indic = lang !== "en";

  const { theme: themeMode, toggleTheme } = useTheme();
  const dark = themeMode === "dark";

  const [scrolled, setScrolled] = useState(false);
  const [seen, setSeen] = useState<Record<string, boolean>>({});
  const [whyIdx, setWhyIdx] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [mood, setMood] = useState(-1);
  const [tw, setTw] = useState(0);
  const [win, setWin] = useState<Record<string, WinPos>>({});
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const [mini, setMini] = useState<Record<string, boolean>>({});
  const [topWin, setTopWin] = useState("");
  const [guideTab, setGuideTab] = useState(0);
  const [lmsTab, setLmsTab] = useState(0);
  const [demoTab, setDemoTab] = useState(0);
  const [ans, setAns] = useState<number[]>([-1, -1, -1]);
  const [ran, setRan] = useState(false);
  const [runs, setRuns] = useState<{ k: number; score: number }[]>([]);
  const [voice, setVoice] = useState(0);
  const [faqTab, setFaqTab] = useState(0);
  const [faqOpen, setFaqOpen] = useState(0);
  const [modal, setModal] = useState("");
  const [formDone, setFormDone] = useState(false);
  const [assistShow, setAssistShow] = useState(false);

  const tickingRef = useRef(false);
  const wheelLockRef = useRef(0);

  const measure = useCallback(() => {
    const vh = window.innerHeight || 800;
    const sy = Math.max(window.scrollY || 0, (document.documentElement && document.documentElement.scrollTop) || 0);
    setScrolled(sy > 12);
    setSeen((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const id of SEEN_IDS) {
        if (next[id]) continue;
        const node = document.getElementById(id);
        if (node && node.getBoundingClientRect().top < vh * 0.88) {
          next[id] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(() => {
        tickingRef.current = false;
        measure();
      });
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    const total =
      Math.max(...Object.values(LANDING_DICT).map((d) => d.tw.join("").length)) + 4;
    const twTimer = window.setInterval(() => {
      setTw((c) => {
        if (c >= total) {
          window.clearInterval(twTimer);
          return c;
        }
        return c + 1;
      });
    }, 55);
    const assistTimer = window.setTimeout(() => setAssistShow(true), 3500);
    measure();
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      window.clearInterval(twTimer);
      window.clearTimeout(assistTimer);
    };
  }, [measure]);

  // Close the language menu on outside pointer-down.
  useEffect(() => {
    if (!langOpen) return;
    const onDown = (e: PointerEvent) => {
      const w = document.getElementById("langwrap");
      const target = e.target as Node | null;
      if (w && target && w.contains(target)) return;
      setLangOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [langOpen]);

  // Bounded WHY wheel stepping on #why-hover only: advances the card without
  // ever trapping page scroll (passes through at both ends and for small
  // touchpad deltas). Click buttons remain the primary path.
  useEffect(() => {
    const el = document.getElementById("why-hover");
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const dy = e.deltaY || 0;
      if (Math.abs(dy) < 4) return;
      if (Date.now() < wheelLockRef.current) {
        e.preventDefault();
        return;
      }
      setWhyIdx((idx) => {
        const next = idx + (dy > 0 ? 1 : -1);
        if (next < 0 || next > 3) return idx;
        e.preventDefault();
        wheelLockRef.current = Date.now() + 600;
        return next;
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const startDrag = useCallback((id: string, e: React.PointerEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && target.closest && target.closest("button")) return;
    setTopWin(id);
    setWin((prev) => {
      const cur = prev[id] || { x: 0, y: 0 };
      const sx = e.clientX;
      const sy = e.clientY;
      const mv = (ev: PointerEvent) => {
        setWin((w2) => ({ ...w2, [id]: { x: cur.x + ev.clientX - sx, y: cur.y + ev.clientY - sy } }));
      };
      const up = () => {
        window.removeEventListener("pointermove", mv);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", mv);
      window.addEventListener("pointerup", up);
      return prev;
    });
  }, []);

  /* ---------- derived values (mirror the reference render model) ---------- */

  const tokens = dark ? LANDING_DARK_TOKENS : LANDING_LIGHT_TOKENS;
  const rootVars: Record<string, string> = {};
  for (const k of Object.keys(tokens)) rootVars[`--${k}`] = tokens[k];
  rootVars["--lh"] = indic ? "1.3" : "1.05";
  rootVars["--lh0"] = indic ? "1.25" : "1.02";
  rootVars["--lh1"] = indic ? "1.4" : "1.1";

  const GRAD =
    "background:linear-gradient(120deg,var(--g1),var(--g2) 55%,var(--g3));-webkit-background-clip:text;background-clip:text;color:transparent;";

  const tr = (id: string, d: number, extra?: string) => {
    const f = !!seen[id];
    const dl = d.toFixed(2);
    return (
      (f
        ? "opacity:1;transform:none;filter:blur(0);"
        : "opacity:0;transform:translateY(22px);filter:blur(6px);") +
      `transition:opacity .9s ease ${dl}s,transform .9s cubic-bezier(.2,.7,.2,1) ${dl}s,filter .9s ease ${dl}s;` +
      (extra || "")
    );
  };

  const hd = (id: string, line1: string, line2: string, grad = true): Headline => {
    let i = 0;
    const mk = (s: string, gr: boolean): HeadWord[] =>
      s.split(" ").map((w) => ({ w, style: `display:inline-block;margin-right:0.22em;${tr(id, 0.12 + 0.07 * i++, gr ? GRAD : "")}` }));
    const l1 = mk(line1, false);
    const l2 = mk(line2, grad);
    const ld = 0.12 + 0.07 * i + 0.1;
    return { eye: tr(id, 0), l1, l2, lead: tr(id, ld), leadFull: tr(id, ld, "margin:20px auto 0;max-width:520px;font-size:18px;line-height:1.6;") };
  };

  const rv = (id: string) => {
    const f = !!seen[id];
    return `opacity:${f ? 1 : 0};transform:translateY(${f ? 0 : 20}px);transition:opacity .8s ease .15s, transform .8s ease .15s;`;
  };

  const headerStyle = `position:sticky;top:0;z-index:50;transition:background .3s ease, box-shadow .3s ease;${
    scrolled
      ? "background:var(--hdr);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 1px 0 var(--line);"
      : "background:transparent;"
  }`;

  const menuStyle = `position:fixed;left:0;right:0;top:0;bottom:0;z-index:90;overflow:auto;background:var(--bg);transition:opacity .35s ease, visibility .35s;opacity:${
    menuOpen ? 1 : 0
  };visibility:${menuOpen ? "visible" : "hidden"};`;

  const heroWords = t.heroWords.map((w, i) => ({
    w,
    style: `display:inline-block;margin-right:0.24em;animation:glide 1s cubic-bezier(.2,.7,.2,1) ${(0.15 + i * 0.12).toFixed(2)}s backwards;${i === t.heroGrad ? GRAD : ""}`,
  }));

  const bubbles = BUBBLES.map((b) => ({
    d: ICON_PATHS[b.icon],
    style: `position:absolute;${b.pos};width:${b.size}px;height:${b.size}px;border-radius:50%;background:${b.bg};color:var(--roseDeep);display:flex;align-items:center;justify-content:center;z-index:2;box-shadow:0 18px 30px -16px var(--glow);animation:float 5.5s ease-in-out ${b.delay}s infinite;`,
  }));

  const mkWin = (id: string) => {
    const d = WIN_DEFS[id];
    const pos = win[id] || { x: 0, y: 0 };
    return {
      style: `position:absolute;left:${d.L}px;top:${d.T}px;width:${d.W}px;max-width:94%;transform:translate(${pos.x}px,${pos.y}px);z-index:${
        topWin === id ? 6 : 3
      };display:${closed[id] ? "none" : "block"};background:var(--surface);border:1px solid var(--line);border-radius:20px;box-shadow:0 30px 60px -28px rgba(58,39,80,0.38);animation:rise .9s cubic-bezier(.2,.7,.2,1) ${d.dl}s backwards;`,
      bodyStyle: mini[id] ? "display:none;" : "display:block;",
      onDragStart: (e: React.PointerEvent) => startDrag(id, e),
      onMinimise: () => setMini((m) => ({ ...m, [id]: !m[id] })),
      onClose: () => setClosed((c) => ({ ...c, [id]: true })),
    };
  };

  const moods = t.moods.map((m, i) => ({
    label: m.label,
    on: mood === i,
    pick: () => setMood(i),
    style: `height:36px;padding:0 16px;border-radius:999px;font-size:13px;font-weight:600;border:1.5px solid ${
      mood === i ? "var(--ink)" : "var(--line)"
    };background:${mood === i ? "var(--blush)" : "var(--surface)"};color:var(--ink);transition:all .2s ease;`,
  }));
  const moodReply = mood < 0 ? t.moodPrompt : t.moods[mood].reply;

  const twTotal = t.tw.join("").length;
  let budget = tw;
  const twLines = t.tw.map((line) => {
    const n = Math.max(0, Math.min(line.length, budget));
    budget -= line.length;
    return { text: line.slice(0, n) };
  });

  const guideTabs = t.guides.map((gd, i) => ({
    num: two(i),
    short: gd.short,
    title: gd.short,
    on: guideTab === i,
    pick: () => setGuideTab(i),
    select: () => setGuideTab(i),
    style: `display:flex;align-items:center;gap:16px;width:100%;padding:20px 22px;border-radius:24px;border:1.5px solid ${
      guideTab === i ? "var(--ink)" : "var(--line)"
    };background:${guideTab === i ? "var(--surface)" : "transparent"};color:var(--ink);box-shadow:${
      guideTab === i ? "0 24px 40px -26px var(--glow)" : "none"
    };transition:all .25s ease;`,
  }));
  const gc = t.guides[guideTab];
  const guideCur = {
    title: gc.title,
    tag: gc.tag,
    summary: gc.summary,
    mods: gc.mods.map((text, i) => ({ num: two(i), text })),
  };

  const whyList = t.why.map((w, i) => ({
    num: two(i),
    title: w.title,
    on: i === whyIdx,
    pick: () => setWhyIdx(i),
    style: `display:flex;align-items:center;gap:16px;width:100%;padding:18px 20px;border-radius:22px;border:1.5px solid ${
      i === whyIdx ? "var(--ink)" : "var(--line)"
    };background:${i === whyIdx ? "var(--surface)" : "transparent"};color:var(--ink);box-shadow:${
      i === whyIdx ? "0 24px 40px -26px var(--glow)" : "none"
    };transition:all .3s ease;`,
  }));
  const whyFillStyle = `height:100%;border-radius:6px;background:linear-gradient(90deg,#E8B4BC,#B9A5EC);width:${((whyIdx + 1) / t.why.length * 100).toFixed(1)}%;transition:width .2s linear;`;
  const whyCards = t.why.map((w, i) => {
    const a = i === whyIdx;
    return {
      num: two(i),
      title: w.title,
      body: w.body,
      icon: (["shield", "lotus", "spark", "users"] as const)[i],
      tags: w.tags,
      hidden: !a,
      style: `grid-area:1/1;display:flex;flex-wrap:wrap;gap:28px;align-items:center;padding:44px;box-sizing:border-box;opacity:${
        a ? 1 : 0
      };transform:translateY(${a ? 0 : 26}px);transition:opacity .5s ease, transform .5s ease;pointer-events:${a ? "auto" : "none"};`,
    };
  });

  const lmsTabs = t.lms.map((item, i) => ({
    num: two(i),
    title: item.title,
    body: item.body,
    on: lmsTab === i,
    pick: () => setLmsTab(i),
    style: `display:flex;align-items:flex-start;gap:18px;width:100%;padding:22px 24px;border-radius:26px;border:1.5px solid ${
      lmsTab === i ? "var(--ink)" : "var(--line)"
    };background:${lmsTab === i ? "var(--surface)" : "transparent"};color:var(--ink);box-shadow:${
      lmsTab === i ? "0 24px 40px -26px var(--glow)" : "none"
    };transition:all .25s ease;`,
  }));

  const quiz = t.quiz.map((qq, qi) => ({
    q: qq.q,
    opts: qq.o.map((label, oi) => {
      const on = ans[qi] === oi;
      return {
        label,
        on,
        pick: () => {
          const a2 = ans.slice();
          a2[qi] = oi;
          setAns(a2);
          setRan(false);
        },
        style: `height:40px;padding:0 18px;border-radius:999px;font-size:14px;font-weight:600;border:1.5px solid ${
          on ? "var(--ink)" : "var(--line)"
        };background:${on ? "var(--lav)" : "var(--surface)"};color:var(--ink);transition:all .2s ease;`,
      };
    }),
  }));
  const score = ans.reduce((a, b) => a + Math.max(0, b), 0);
  const answered = ans.every((v) => v >= 0);
  const kOf = (sc: number) => (sc <= 2 ? 0 : sc <= 4 ? 1 : 2);
  let demoOut = t.outReady;
  if (ran && !answered) demoOut = t.outMore;
  if (ran && answered) {
    const o = t.outs[kOf(score)];
    demoOut = { title: o.title, body: o.body + t.note };
  }
  const demoRuns = runs.map((r, i) => ({ n: i + 1, label: t.outs[r.k].title, score: r.score }));
  const demoTabs = t.dTabs.map((label, i) => ({
    label,
    on: demoTab === i,
    pick: () => setDemoTab(i),
    style: `height:36px;padding:0 16px;border-radius:999px;font-size:13px;font-weight:700;border:1.5px solid ${
      demoTab === i ? "var(--ink)" : "var(--line)"
    };background:${demoTab === i ? "var(--blush)" : "transparent"};color:var(--ink);`,
  }));

  const VOICE_ICONS: ("heart" | "users" | "lotus" | "moon" | "spark")[] = ["heart", "users", "lotus", "moon", "spark"];
  const voiceBtns = t.voices.map((_quote, i) => ({
    icon: VOICE_ICONS[i],
    d: ICON_PATHS[VOICE_ICONS[i]],
    aria: `${t.noteWord} ${i + 1}`,
    on: voice === i,
    pick: () => setVoice(i),
    style: `width:${voice === i ? 72 : 60}px;height:${voice === i ? 72 : 60}px;padding:0;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--ink);border:${
      voice === i ? "2px solid var(--ink)" : "1.5px solid var(--line)"
    };background:${voice === i ? "linear-gradient(135deg,var(--blush),var(--lav))" : "var(--surface)"};transition:all .3s ease;`,
  }));

  const faqTabs = t.faq.map((tab, i) => ({
    label: tab.label,
    on: faqTab === i,
    pick: () => {
      setFaqTab(i);
      setFaqOpen(0);
    },
    style: `height:44px;padding:0 24px;border-radius:999px;font-weight:700;font-size:15px;border:1.5px solid ${
      faqTab === i ? "var(--ink)" : "var(--line)"
    };background:${faqTab === i ? "var(--ink)" : "var(--surface)"};color:${faqTab === i ? "var(--onInk)" : "var(--ink)"};transition:all .25s ease;`,
  }));
  const faqItems = t.faq[faqTab].items.map((it, i) => ({
    q: it.q,
    a: it.a,
    open: faqOpen === i,
    toggle: () => setFaqOpen(faqOpen === i ? -1 : i),
    iconStyle: `flex:0 0 auto;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--blush);transition:transform .3s ease;transform:rotate(${
      faqOpen === i ? 45 : 0
    }deg);`,
  }));

  const modalOpen = modal !== "";
  const modalStyle = `position:fixed;left:0;right:0;top:0;bottom:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;background:rgba(58,39,80,0.5);transition:opacity .3s ease, visibility .3s;opacity:${
    modalOpen ? 1 : 0
  };visibility:${modalOpen ? "visible" : "hidden"};`;
  const isSummary = modal === "summary";
  const modalTitle = modal === "letter" ? t.letterEye : isSummary ? t.formSum : t.formTalk;

  return (
    <div
      className="nh-landing"
      style={{ ...rootVars, position: "relative", width: "100%", background: "var(--bg)", color: "var(--ink)", transition: "background .4s ease,color .4s ease" } as React.CSSProperties}
    >
      <SiteHeader
        headerStyle={headerStyle}
        nav={[{ label: t.navGuides, href: "#guides" }, { label: t.navWhy, href: "#why" }, { label: t.navPlat, href: "#platform" }, { label: t.navFaq, href: "#faq" }]}
        loginLabel={t.login}
        registerLabel={t.register}
        menuLabel={t.menu}
        menuOpenLabel={t.menuOpen}
        themeLabel={t.themeLabel}
        langLabel={t.langLabel}
        langCode={t.code}
        langOpen={langOpen}
        langOpts={LANDING_LANG_OPTS.map((o) => ({ ...o, on: lang === o.code }))}
        isDark={dark}
        onMenu={() => setMenuOpen(true)}
        onToggleTheme={toggleTheme}
        onToggleLang={() => setLangOpen((v) => !v)}
        onPickLang={(code) => {
          setAppLanguage(code);
          setLangOpen(false);
        }}
      />

      <Hero
        pill={t.pill}
        exploreDemoLabel={t.exploreDemo}
        heroWords={heroWords}
        heroLead={t.heroLead}
        getStartedLabel={t.getStarted}
        openLetterLabel={t.openLetter}
        bubbles={bubbles}
        w1={mkWin("a")}
        w2={mkWin("b")}
        w3={mkWin("c")}
        winCheck={t.winCheck}
        winNote={t.winNote}
        winGuides={t.winGuides}
        minAria={t.minAria}
        closeWinAria={t.closeWinAria}
        anyClosed={!!(closed.a || closed.b || closed.c)}
        onResetWindows={() => {
          setWin({});
          setClosed({});
          setMini({});
        }}
        moods={moods}
        moodReply={moodReply}
        feelLabel={t.feel}
        todayWill={t.todayWill}
        twLines={twLines}
        twTyping={tw < twTotal}
        twDone={tw >= twTotal}
        statusSup={t.statusSup}
        guideTabs={guideTabs.map((g, i) => ({ num: g.num, short: g.short, pick: () => setGuideTab(i) }))}
        topics6={t.topics6}
        resetWinsLabel={t.resetWins}
        onLetter={() => setModal("letter")}
        onGuidePick={(i) => setGuideTab(i)}
      />

      <Marquee headline={hd("marq", t.marqH1, t.marqH2, true)} eyebrow={t.marqEye} marqA={t.marqA} marqB={t.marqB} />

      <Guides
        headline={hd("guides", t.guidesH1, t.guidesH2, true)}
        eyebrow={t.guidesEye}
        lead={t.guidesLead}
        revealStyle={rv("guides")}
        guideTabs={guideTabs}
        guideCur={guideCur}
        exploreLabel={t.exploreGuide}
        getSummaryLabel={t.getSummary}
        onSummary={() => {
          setModal("summary");
          setFormDone(false);
        }}
      />

      <Why
        headline={hd("why", t.whyH1, t.whyH2, true)}
        eyebrow={t.whyEye}
        whyList={whyList}
        whyFillStyle={whyFillStyle}
        whyCards={whyCards}
      />

      <Platform
        headline={hd("platform", t.platH1, t.platH2, true)}
        eyebrow={t.platEye}
        lead={t.platLead}
        revealStyle={rv("platform")}
        tabs={lmsTabs}
        activeIndex={lmsTab}
        previewWord={t.previewWord}
        goodMorning={t.goodMorning}
        feelLabel={t.feel}
        weekSample={t.weekSample}
        courses={t.courses}
        turnRows={t.turn}
      />

      <Demo
        headline={hd("demo", t.demoH1, t.demoH2, true)}
        eyebrow={t.demoEye}
        lead={t.demoLead}
        revealStyle={rv("demo")}
        demoTabs={demoTabs}
        demoTab={demoTab}
        howTitle={t.howTitle}
        howP1={t.howP1}
        howP2={t.howP2}
        howSample={t.howSample}
        runsTitle={t.runsTitle}
        runsEmptyText={t.runsEmpty}
        guideTitle={t.dGuideTitle}
        guideP1={t.dGuideP1}
        guideP2={t.dGuideP2}
        weeklyCheck={t.weeklyCheck}
        gentleLabel={t.gentle}
        reflectionLabel={t.reflection}
        quiz={quiz}
        runLabel={t.run}
        resetLabel={t.reset}
        consoleLabel={t.consoleLbl}
        demoOut={demoOut}
        runs={demoRuns}
        runsEmpty={demoRuns.length === 0}
        onRun={() => {
          if (answered) {
            setRuns((r) => [...r, { k: kOf(score), score }]);
          }
          setRan(true);
        }}
        onReset={() => {
          setAns([-1, -1, -1]);
          setRan(false);
        }}
        assistShow={assistShow}
        assistTitle={t.assistTitle}
        assistBody={t.assistBody}
        dismissLabel={t.dismiss}
        acceptLabel={t.accept}
        onAssistDismiss={() => setAssistShow(false)}
        onAssistAccept={() => {
          setAssistShow(false);
          setDemoTab(2);
        }}
      />

      <Voices
        headline={hd("voices", t.voicesH1, t.voicesH2, true)}
        eyebrow={t.voicesEye}
        revealStyle={rv("voices")}
        voiceBtns={voiceBtns}
        voiceQuote={t.voices[voice]}
        voiceNote={t.voiceNote}
      />

      <Faq headline={hd("faq", t.faqH1, t.faqH2, true)} eyebrow={t.faqEye} revealStyle={rv("faq")} faqTabs={faqTabs} faqItems={faqItems} />

      <FinalCta
        headline={hd("cta", t.ctaH1, t.ctaH2, false)}
        lead={t.ctaLead}
        revealStyle={rv("cta")}
        getStartedLabel={t.getStarted}
        onTalk={() => {
          setModal("talk");
          setFormDone(false);
        }}
        talkLabel={t.talkUs}
      />

      <SiteFooter
        footTag={t.footTag}
        exploreLabel={t.explore}
        accountLabel={t.account}
        contactLabel={t.contact}
        navLinks={[{ label: t.navGuides, href: "#guides" }, { label: t.navWhy, href: "#why" }, { label: t.navPlat, href: "#platform" }, { label: t.navFaq, href: "#faq" }]}
        contactLines={t.ph}
        copyright={t.copy}
      />

      <ChatButton
        onTalk={() => {
          setModal("talk");
          setFormDone(false);
        }}
        label={t.talkUs}
      />

      <MenuOverlay
        menuStyle={menuStyle}
        brandWord="Nurture"
        brandAccent="Her"
        closeLabel={t.menuClose}
        closeWord={t.closeWord}
        loginLabel={t.login}
        registerLabel={t.register}
        onClose={() => setMenuOpen(false)}
        menuLinks={[
          { num: "01", label: t.mGuides, href: "#guides" },
          { num: "02", label: t.mWhy, href: "#why" },
          { num: "03", label: t.mPlat, href: "#platform" },
          { num: "04", label: t.mDemo, href: "#demo" },
          { num: "05", label: t.mFaq, href: "#faq" },
        ]}
      />

      <TalkModal
        modalStyle={modalStyle}
        modalTitle={modalTitle}
        isLetter={modal === "letter"}
        isForm={modal === "talk" || modal === "summary"}
        formDone={formDone}
        letterEye={t.letterEye}
        letterTitle={t.letterTitle}
        letterBody={t.letterP}
        approachLabel={t.rApproach}
        approachValue={t.rApproachV}
        guidanceLabel={t.rGuidance}
        guidanceValue={t.rGuidanceV}
        statusLabel={t.rStatus}
        statusValue={t.rStatusV}
        closeBtnLabel={t.closeBtn}
        closeAriaLabel={t.closeAria}
        thanksTitle={t.thanks}
        thanksBody={t.thanksP}
        content={{
          title: modalTitle,
          sub: isSummary ? t.subSum : t.subTalk,
          btn: isSummary ? t.btnSum : t.btnTalk,
        }}
        fullNameLabel={t.fullName}
        namePh={t.namePh}
        emailLabel={t.email}
        phoneLabel={t.phone}
        optionalLabel={t.optional}
        prefContactLabel={t.prefContact}
        prefOpts={t.prefOpts}
        onClose={() => setModal("")}
        onSubmit={(e) => {
          e.preventDefault();
          setFormDone(true);
        }}
      />
    </div>
  );
}
