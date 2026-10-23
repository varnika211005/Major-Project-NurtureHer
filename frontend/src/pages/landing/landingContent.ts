/**
 * NurtureHer landing page content, extracted from the approved design reference.
 * Copy is reproduced verbatim per language; interactive behavior lives in
 * LandingPage.tsx. The landing reads the app-wide language (en/hi/kn/ta/te/ml)
 * and falls back to English for anything else.
 */

export const HERO_IMAGE = "/landing/hero.png";

export const ICON_PATHS = {
  heart:
    "M12 20s-7-4.4-8.6-9A4.8 4.8 0 0 1 12 7.2 4.8 4.8 0 0 1 20.6 11C19 15.6 12 20 12 20z",
  moon: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z",
  leaf: "M5 19C5 10 10 5 19 5c0 9-5 14-14 14zM5 19c3-4 6-7 10-9",
  drop: "M12 3c3.2 4.4 6 7.2 6 10.4a6 6 0 0 1-12 0C6 10.2 8.8 7.4 12 3z",
  spark: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z",
  lotus:
    "M12 19c-3-1-5-4-5-8 3 0 5 2 5 4 0-2 2-4 5-4 0 4-2 7-5 8zM12 15c-1.5-2-1.5-5 0-8 1.5 3 1.5 6 0 8z",
  shield: "M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z",
  users:
    "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M17 11a2.5 2.5 0 1 0 0-5M17 14c2.5 0 4 2 4 5",
} as const;

export type IconName = keyof typeof ICON_PATHS;

export interface BubbleDef {
  icon: IconName;
  pos: string;
  size: number;
  bg: string;
  delay: number;
}

export const BUBBLES: BubbleDef[] = [
  { icon: "heart", pos: "left:2%;top:2%", size: 64, bg: "var(--blush)", delay: 0 },
  { icon: "leaf", pos: "left:44%;top:3%", size: 52, bg: "var(--lav)", delay: 1.2 },
  { icon: "moon", pos: "right:3%;top:42%", size: 58, bg: "var(--lav)", delay: 0.6 },
  { icon: "drop", pos: "left:48%;bottom:2%", size: 54, bg: "var(--blush)", delay: 1.8 },
  { icon: "spark", pos: "left:1%;bottom:4%", size: 52, bg: "var(--lav)", delay: 0.9 },
  { icon: "lotus", pos: "right:2%;bottom:14%", size: 60, bg: "var(--blush2)", delay: 1.5 },
];

export type LandingLang = "en" | "hi" | "kn" | "ta" | "te" | "ml";

export const SUPPORTED_LANDING_LANGS: LandingLang[] = ["en", "hi", "kn", "ta", "te", "ml"];

export function resolveLandingLang(lang: string | undefined): LandingLang {
  return (SUPPORTED_LANDING_LANGS as string[]).includes(lang ?? "") ? (lang as LandingLang) : "en";
}

export interface LandingMood {
  label: string;
  reply: string;
}

export interface LandingWhyItem {
  title: string;
  body: string;
  tags: string[];
}

export interface LandingLmsItem {
  title: string;
  body: string;
}

export interface LandingQuizItem {
  q: string;
  o: string[];
}

export interface LandingOut {
  title: string;
  body: string;
}

export interface LandingGuide {
  short: string;
  title: string;
  tag: string;
  summary: string;
  mods: string[];
}

export interface LandingFaqItem {
  q: string;
  a: string;
}

export interface LandingFaqTab {
  label: string;
  items: LandingFaqItem[];
}

export interface LandingDict {
  code: string;
  themeLabel: string;
  langLabel: string;
  login: string;
  register: string;
  menu: string;
  menuOpen: string;
  menuClose: string;
  closeWord: string;
  navWhy: string;
  navPlat: string;
  navGuides: string;
  navFaq: string;
  mWhy: string;
  mPlat: string;
  mDemo: string;
  mGuides: string;
  mFaq: string;
  pill: string;
  exploreDemo: string;
  winCheck: string;
  winNote: string;
  winGuides: string;
  previewWord: string;
  minAria: string;
  closeWinAria: string;
  heroWords: string[];
  heroGrad: number;
  heroLead: string;
  getStarted: string;
  openLetter: string;
  feel: string;
  moodPrompt: string;
  moods: LandingMood[];
  todayWill: string;
  tw: string[];
  statusSup: string;
  topics6: string;
  resetWins: string;
  marqEye: string;
  marqH1: string;
  marqH2: string;
  marqA: string[];
  marqB: string[];
  whyEye: string;
  whyH1: string;
  whyH2: string;
  why: LandingWhyItem[];
  platEye: string;
  platH1: string;
  platH2: string;
  platLead: string;
  lms: LandingLmsItem[];
  goodMorning: string;
  weekSample: string;
  courses: string[];
  turn: string[];
  demoEye: string;
  demoH1: string;
  demoH2: string;
  demoLead: string;
  weeklyCheck: string;
  gentle: string;
  dTabs: string[];
  howTitle: string;
  howP1: string;
  howP2: string;
  howSample: string;
  runsTitle: string;
  runsEmpty: string;
  dGuideTitle: string;
  dGuideP1: string;
  dGuideP2: string;
  reflection: string;
  quiz: LandingQuizItem[];
  run: string;
  reset: string;
  consoleLbl: string;
  outReady: LandingOut;
  outMore: LandingOut;
  note: string;
  outs: LandingOut[];
  assistTitle: string;
  assistBody: string;
  dismiss: string;
  accept: string;
  guidesEye: string;
  guidesH1: string;
  guidesH2: string;
  guidesLead: string;
  guides: LandingGuide[];
  exploreGuide: string;
  getSummary: string;
  voicesEye: string;
  voicesH1: string;
  voicesH2: string;
  voices: string[];
  voiceNote: string;
  noteWord: string;
  faqEye: string;
  faqH1: string;
  faqH2: string;
  faq: LandingFaqTab[];
  ctaH1: string;
  ctaH2: string;
  ctaLead: string;
  talkUs: string;
  footTag: string;
  explore: string;
  account: string;
  contact: string;
  ph: string[];
  copy: string;
  letterEye: string;
  letterTitle: string;
  letterP: string;
  rApproach: string;
  rApproachV: string;
  rGuidance: string;
  rGuidanceV: string;
  rStatus: string;
  rStatusV: string;
  closeBtn: string;
  closeAria: string;
  thanks: string;
  thanksP: string;
  formTalk: string;
  formSum: string;
  subTalk: string;
  subSum: string;
  btnTalk: string;
  btnSum: string;
  fullName: string;
  namePh: string;
  email: string;
  phone: string;
  optional: string;
  prefContact: string;
  prefOpts: string[];
}

// The landing design tokens are the source of truth for the whole application.
// They now live in the shared theme module so every screen renders from one
// palette; they are re-exported here so existing imports keep working.
export { LANDING_LIGHT_TOKENS, LANDING_DARK_TOKENS } from "@/theme/tokens";

export interface LangOption {
  code: LandingLang;
  native: string;
  eng: string;
}

export const LANDING_LANG_OPTS: LangOption[] = [
  { code: "en", native: "English", eng: "English" },
  { code: "kn", native: "ಕನ್ನಡ", eng: "Kannada" },
  { code: "hi", native: "हिन्दी", eng: "Hindi" },
  { code: "ta", native: "தமிழ்", eng: "Tamil" },
  { code: "te", native: "తెలుగు", eng: "Telugu" },
  { code: "ml", native: "മലയാളം", eng: "Malayalam" },
];

export const LANDING_DICT: Record<LandingLang, LandingDict> = {
  en: {
    code: "EN", themeLabel: "Switch dark or light mode", langLabel: "Change language",
    login: "Login", register: "Register", menu: "MENU", menuOpen: "Open menu", menuClose: "Close menu", closeWord: "CLOSE",
    navWhy: "Why NurtureHer", navPlat: "Platform", navGuides: "Overview", navFaq: "FAQ",
    mWhy: "Why NurtureHer", mPlat: "The platform", mDemo: "Try a check-in", mGuides: "Quick overview", mFaq: "FAQ",
    pill: "Women’s health · PPD · PCOS",
    exploreDemo: "Explore demo",
    winCheck: "check-in.app", winNote: "daily-note.txt", winGuides: "overview", previewWord: "preview", minAria: "Minimise", closeWinAria: "Close window",
    heroWords: ["Support", "that", "stays", "with", "her."], heroGrad: 2,
    heroLead: "NurtureHer brings gentle, trusted guidance on postpartum depression, PCOS and everyday wellbeing, so no woman has to figure it out alone.",
    getStarted: "Get Started", openLetter: "Open your letter",
    feel: "How are you feeling today?", moodPrompt: "Pick a mood to see a gentle note.",
    moods: [
      { label: "Calm", reply: "Lovely. Notice what helped today and do a little more of it." },
      { label: "Tired", reply: "That is so valid. Rest where you can, and ask for a hand if you need one." },
      { label: "Anxious", reply: "Take a slow breath. Talking to someone you trust can lighten the load." },
      { label: "Low", reply: "Thank you for naming it. If this lasts, please speak with a doctor or counsellor." },
      { label: "Joyful", reply: "Wonderful. Hold on to this feeling and share it with someone." }
    ],
    todayWill: "Today I will…", tw: ["Rest, even if it is just ten minutes", "Drink some water", "Ask someone for help today"],
    statusSup: "Status: Supported", topics6: "6 topics", resetWins: "Reset windows",
    marqEye: "What we cover", marqH1: "Care that covers", marqH2: "what matters.",
    marqA: ["Postpartum depression", "PCOS", "Cycle health", "Sleep and rest", "Nutrition", "Mindfulness", "Family support", "Early awareness"],
    marqB: ["Gentle guidance", "Trusted information", "Judgement free", "Your pace", "Know the signs", "Talk to a doctor", "You are not alone", "Self-care"],
    whyEye: "Why NurtureHer", whyH1: "Care that feels", whyH2: "gentle, not clinical.",
    why: [
      { title: "Trusted information", body: "Plain-language explanations of postpartum depression and PCOS, written to be easy to read and easy to trust.", tags: ["Plain language", "Easy to scan", "Evidence-informed"] },
      { title: "Gentle guidance", body: "Calm, step-by-step guidance that meets you where you are, without pressure and without judgement.", tags: ["Step by step", "Judgement free", "Your pace"] },
      { title: "Early awareness", body: "Knowing the signs sooner makes it easier to ask for help. Learn what to look for and when to act.", tags: ["Know the signs", "Seek care early", "Share with family"] },
      { title: "Support pathways", body: "Clear pointers on when and how to reach a doctor or counsellor, and how loved ones can help.", tags: ["When to seek help", "Talk to a professional", "Bring family in"] }
    ],
    platEye: "The platform", platH1: "One place.", platH2: "Everything she needs.",
    platLead: "A calm space for check-ins, clear explanations and knowing where to turn next. This is an illustrative preview.",
    lms: [
      { title: "Daily check-in", body: "A quick, kind way to notice how you are feeling and spot patterns over the week." },
      { title: "Learn at your pace", body: "Short guides on PPD, PCOS and wellbeing that you can pick up and put down." },
      { title: "Know where to turn", body: "Simple pointers to doctors, counsellors and the people around you." }
    ],
    goodMorning: "Good morning", weekSample: "Your week (sample)",
    courses: ["What is postpartum depression?", "Understanding PCOS", "Sleep, food and rest"],
    turn: ["Talk to a doctor", "Find a counsellor", "Bring family in"],
    demoEye: "Live demo", demoH1: "Don’t just read.", demoH2: "Try a gentle check-in.",
    demoLead: "Pick an answer for each question, then press Run. It is a reflection to help you think, not a diagnosis.",
    weeklyCheck: "Weekly check-in", gentle: "GENTLE", dTabs: ["Description", "Runs", "Guide"],
    howTitle: "How it works",
    howP1: "Answer three short questions about sleep, mood and support. Press Run to see a gentle summary and some ideas for what to do next.",
    howP2: "There are no right or wrong answers, and nothing you choose here is saved.",
    howSample: "Sample: sleeping well, mood good, someone to lean on gives a steady summary.",
    runsTitle: "Your runs this visit", runsEmpty: "No runs yet. Run the check-in and every attempt from this visit shows up here.",
    dGuideTitle: "Guide",
    dGuideP1: "Take it one question at a time. If a question feels hard to answer, choose what feels closest to most days this week.",
    dGuideP2: "If you ever feel unsafe, or have thoughts of harming yourself or your baby, contact local emergency services right away.",
    reflection: "Reflection",
    quiz: [
      { q: "How have you been sleeping?", o: ["Mostly well", "Often disturbed", "Barely at all"] },
      { q: "How has your mood been most days?", o: ["Mostly good", "Up and down", "Mostly low"] },
      { q: "Do you have someone to lean on?", o: ["Yes, easily", "Sometimes", "Not really"] }
    ],
    run: "Run", reset: "Reset", consoleLbl: "Console",
    outReady: { title: "Ready when you are", body: "Answer the three questions, then press Run." },
    outMore: { title: "One more step", body: "Please choose an answer for all three questions, then press Run." },
    note: " This is a reflection, not a diagnosis. If you ever feel unsafe or have thoughts of harming yourself or your baby, contact local emergency services right away.",
    outs: [
      { title: "Steady for now", body: "Things sound fairly steady. Keep leaning on what is working, and check in again whenever you like." },
      { title: "Some strain", body: "It sounds like things feel heavier at times. Rest where you can, talk with someone you trust, and consider mentioning this to your doctor." },
      { title: "Extra support may help", body: "Many of your answers point to a tough stretch. Please consider speaking with a doctor or counsellor soon. You do not have to carry this alone." }
    ],
    assistTitle: "Guide Assistant", assistBody: "Stuck? Take it one question at a time. There are no wrong answers.", dismiss: "Dismiss", accept: "Accept",
    guidesEye: "Quick overview", guidesH1: "Our story, PPD, PCOS", guidesH2: "and caregiver modules.", guidesLead: "A quick overview of where NurtureHer began, what PPD and PCOS are, and how family and caregivers can help.",
    guides: [
      { short: "Our story", title: "How NurtureHer began", tag: "01 · Origins", summary: "NurtureHer started from a simple belief: every woman deserves clear, kind and trustworthy health information, without having to search through the noise or fear being judged.", mods: ["Why we started", "Who we are for", "What we believe", "How we keep it trustworthy", "Where we are headed", "Our care promise"] },
      { short: "Postpartum depression", title: "Postpartum depression (PPD)", tag: "02 · PPD", summary: "Understand the difference between the baby blues and PPD, recognise the signs, and know when and how to ask for help.", mods: ["Baby blues or PPD?", "Common signs and feelings", "When to seek help", "Support from partner and family", "Treatment options", "Gentle self-care routines"] },
      { short: "PCOS", title: "Polycystic ovary syndrome (PCOS)", tag: "03 · PCOS", summary: "A clear look at what PCOS is, how it shows up, how it is diagnosed, and the everyday steps that help manage it.", mods: ["What is PCOS?", "Symptoms to look for", "Getting a diagnosis", "Food, movement and sleep", "Periods and fertility", "Emotional wellbeing"] },
      { short: "Caregiver modules", title: "Caregiver modules", tag: "04 · Caregivers", summary: "Short modules for partners, family and friends: how to listen, spot the signs, share the load and know when to help find professional care.", mods: ["Listening without fixing", "Spotting the signs early", "Sharing the load at home", "Supporting rest and sleep", "Talking about getting help", "Looking after yourself too"] }
    ],
    exploreGuide: "Explore this guide", getSummary: "Get the summary",
    voicesEye: "A little encouragement", voicesH1: "Words worth", voicesH2: "keeping close.",
    voices: ["You do not have to be perfect to be a good mother.", "Asking for help is a strength, not a failure.", "Your body is doing something hard. Be gentle with it.", "Rest is part of healing, not a reward for it.", "You are allowed to take up space and take care of yourself."],
    voiceNote: "A note from NurtureHer", noteWord: "Note",
    faqEye: "FAQ", faqH1: "Questions,", faqH2: "answered.",
    faq: [
      { label: "General", items: [
        { q: "So what exactly is NurtureHer?", a: "NurtureHer is a gentle, easy-to-use space for trusted information and support around women’s health, starting with postpartum depression and PCOS." },
        { q: "Is this a replacement for seeing a doctor?", a: "No. NurtureHer offers information and support, but it cannot diagnose or treat any condition. Please speak with a qualified healthcare professional about your health." },
        { q: "Who is NurtureHer for?", a: "Anyone who wants clear, kind information about PPD, PCOS and everyday wellbeing, including new mothers, women with symptoms, and the family who support them." }
      ] },
      { label: "PPD", items: [
        { q: "How is PPD different from the baby blues?", a: "Baby blues are common, usually begin within a few days of birth and ease within about two weeks. PPD lasts longer, feels more intense and can get in the way of daily life." },
        { q: "When should I reach out for help?", a: "If low mood, anxiety or exhaustion lasts more than two weeks, or makes it hard to care for yourself or your baby, speak to a doctor. If you have thoughts of harming yourself or your baby, seek emergency help immediately." },
        { q: "Can PPD be treated?", a: "Yes. PPD is treatable, and support such as counselling, help from family and sometimes medication prescribed by a doctor can make a real difference." }
      ] },
      { label: "PCOS", items: [
        { q: "What are common signs of PCOS?", a: "Irregular or missed periods, acne, excess facial or body hair, thinning scalp hair and weight changes are common. Symptoms vary from person to person." },
        { q: "How is PCOS diagnosed?", a: "A doctor usually reviews your history and symptoms and may suggest a physical exam, blood tests and an ultrasound." },
        { q: "Can PCOS be managed?", a: "Yes. Many people manage PCOS with lifestyle changes and, where needed, treatment guided by their doctor. Early care helps." }
      ] }
    ],
    ctaH1: "Ready to take", ctaH2: "the first step?", ctaLead: "Join NurtureHer and find calm, trusted guidance for every stage of her health.", talkUs: "Talk to us",
    footTag: "Gentle, trusted guidance on postpartum depression, PCOS and everyday wellbeing.", explore: "Explore", account: "Account", contact: "Contact",
    ph: ["[Email address]", "[Phone number]", "[City, State]"],
    copy: "© 2026 NurtureHer. This site shares general information and is not a substitute for professional medical advice.",
    letterEye: "A letter for you", letterTitle: "Dear Mama,",
    letterP: "We are so glad you are here. Whatever this season looks like for you, joyful, heavy or somewhere in between, you deserve care, rest and kindness.",
    rApproach: "Approach", rApproachV: "Gentle steps", rGuidance: "Guidance", rGuidanceV: "Trusted information", rStatus: "Status", rStatusV: "You are not alone",
    closeBtn: "Close", closeAria: "Close",
    thanks: "Thank you.", thanksP: "This is a design preview, so nothing was actually sent. In the live site, this is where we would confirm and follow up.",
    formTalk: "Let’s talk it through", formSum: "Get the summary guide",
    subTalk: "Tell us a little about yourself and how you would like us to reach you.", subSum: "Leave your details and we will send a short summary of this guide.",
    btnTalk: "Let’s connect", btnSum: "Send me the summary",
    fullName: "Full name", namePh: "Your name", email: "Email", phone: "Phone number", optional: "Optional", prefContact: "Preferred contact",
    prefOpts: ["Email", "Phone call", "Message"]
  },
  hi: {
    code: "हिन्दी", themeLabel: "डार्क या लाइट मोड बदलें", langLabel: "भाषा बदलें",
    login: "लॉग इन", register: "रजिस्टर", menu: "मेनू", menuOpen: "मेनू खोलें", menuClose: "मेनू बंद करें", closeWord: "बंद करें",
    navWhy: "NurtureHer क्यों", navPlat: "प्लेटफ़ॉर्म", navGuides: "परिचय", navFaq: "सवाल-जवाब",
    mWhy: "NurtureHer क्यों", mPlat: "प्लेटफ़ॉर्म", mDemo: "चेक-इन आज़माएँ", mGuides: "संक्षिप्त परिचय", mFaq: "सवाल-जवाब",
    pill: "महिला स्वास्थ्य · पीपीडी · पीसीओएस",
    exploreDemo: "डेमो देखें",
    winCheck: "चेक-इन ऐप", winNote: "दैनिक नोट", winGuides: "परिचय", previewWord: "पूर्वावलोकन", minAria: "छोटा करें", closeWinAria: "विंडो बंद करें",
    heroWords: ["उसके", "साथ", "हमेशा", "रहने", "वाला", "सहारा।"], heroGrad: 2,
    heroLead: "NurtureHer प्रसवोत्तर अवसाद, पीसीओएस और रोज़मर्रा की सेहत पर कोमल, भरोसेमंद मार्गदर्शन देता है, ताकि किसी भी महिला को सब कुछ अकेले न सँभालना पड़े।",
    getStarted: "शुरू करें", openLetter: "अपना पत्र खोलें",
    feel: "आज आप कैसा महसूस कर रही हैं?", moodPrompt: "कोमल संदेश देखने के लिए एक मनोदशा चुनें।",
    moods: [
      { label: "शांत", reply: "बहुत अच्छा। ध्यान दें कि आज क्या काम आया, और उसे थोड़ा और करें।" },
      { label: "थकी हुई", reply: "यह बिल्कुल स्वाभाविक है। जहाँ हो सके आराम करें, और ज़रूरत हो तो किसी से मदद माँगें।" },
      { label: "चिंतित", reply: "एक धीमी साँस लें। किसी भरोसेमंद से बात करने से बोझ हल्का हो सकता है।" },
      { label: "उदास", reply: "इसे बताने के लिए शुक्रिया। अगर यह लंबे समय तक रहे, तो कृपया डॉक्टर या काउंसलर से बात करें।" },
      { label: "खुश", reply: "बहुत बढ़िया। इस एहसास को सँजोएँ और किसी के साथ बाँटें।" }
    ],
    todayWill: "आज मैं…", tw: ["कम से कम दस मिनट आराम करूँगी", "पानी पिऊँगी", "आज किसी से मदद माँगूँगी"],
    statusSup: "स्थिति: सहारा मिला", topics6: "6 विषय", resetWins: "विंडो रीसेट करें",
    marqEye: "हम क्या कवर करते हैं", marqH1: "देखभाल जो", marqH2: "ज़रूरी हर बात समेटे।",
    marqA: ["प्रसवोत्तर अवसाद", "पीसीओएस", "मासिक चक्र की सेहत", "नींद और आराम", "पोषण", "माइंडफुलनेस", "परिवार का सहयोग", "शुरुआती जागरूकता"],
    marqB: ["कोमल मार्गदर्शन", "भरोसेमंद जानकारी", "बिना आलोचना के", "आपकी अपनी गति", "लक्षण पहचानें", "डॉक्टर से बात करें", "आप अकेली नहीं हैं", "खुद की देखभाल"],
    whyEye: "NurtureHer क्यों", whyH1: "देखभाल जो लगे", whyH2: "कोमल, क्लिनिकल नहीं।",
    why: [
      { title: "भरोसेमंद जानकारी", body: "प्रसवोत्तर अवसाद और पीसीओएस की सरल भाषा में व्याख्या, जो पढ़ने में आसान और भरोसेमंद है।", tags: ["सरल भाषा", "आसानी से पढ़ने योग्य", "प्रमाण-आधारित"] },
      { title: "कोमल मार्गदर्शन", body: "शांत, चरण-दर-चरण मार्गदर्शन जो आपको वहीं मिलता है जहाँ आप हैं, बिना दबाव और बिना आलोचना के।", tags: ["चरण-दर-चरण", "बिना आलोचना", "आपकी गति"] },
      { title: "जल्दी जागरूकता", body: "लक्षण जल्दी पहचानने से मदद माँगना आसान हो जाता है। जानें क्या देखना है और कब कदम उठाना है।", tags: ["लक्षण पहचानें", "समय पर इलाज लें", "परिवार से साझा करें"] },
      { title: "सहयोग के रास्ते", body: "डॉक्टर या काउंसलर तक कब और कैसे पहुँचें, और अपने लोग कैसे मदद कर सकते हैं, इसकी स्पष्ट जानकारी।", tags: ["मदद कब लें", "विशेषज्ञ से बात करें", "परिवार को जोड़ें"] }
    ],
    platEye: "प्लेटफ़ॉर्म", platH1: "एक ही जगह।", platH2: "उसकी हर ज़रूरत।",
    platLead: "चेक-इन, स्पष्ट जानकारी और आगे कहाँ जाना है, यह जानने के लिए एक शांत जगह। यह एक उदाहरण पूर्वावलोकन है।",
    lms: [
      { title: "रोज़ का चेक-इन", body: "यह जानने का एक छोटा, कोमल तरीका कि आप कैसा महसूस कर रही हैं, और हफ़्ते भर के पैटर्न पहचानना।" },
      { title: "अपनी गति से सीखें", body: "पीपीडी, पीसीओएस और सेहत पर छोटी गाइड, जिन्हें आप जब चाहें शुरू करें और जब चाहें रोकें।" },
      { title: "जानें कहाँ जाना है", body: "डॉक्टरों, काउंसलरों और आसपास के लोगों तक पहुँचने के सरल संकेत।" }
    ],
    goodMorning: "सुप्रभात", weekSample: "आपका हफ़्ता (नमूना)",
    courses: ["प्रसवोत्तर अवसाद क्या है?", "पीसीओएस को समझना", "नींद, खान-पान और आराम"],
    turn: ["डॉक्टर से बात करें", "काउंसलर खोजें", "परिवार को साथ लाएँ"],
    demoEye: "लाइव डेमो", demoH1: "सिर्फ़ पढ़ें नहीं।", demoH2: "एक कोमल चेक-इन आज़माएँ।",
    demoLead: "हर सवाल का एक उत्तर चुनें, फिर रन दबाएँ। यह सोचने में मदद करने वाला एक चिंतन है, निदान नहीं।",
    weeklyCheck: "साप्ताहिक चेक-इन", gentle: "कोमल", dTabs: ["विवरण", "रन", "गाइड"],
    howTitle: "यह कैसे काम करता है",
    howP1: "नींद, मनोदशा और सहयोग के बारे में तीन छोटे सवालों के जवाब दें। एक कोमल सारांश और आगे के कुछ सुझाव देखने के लिए रन दबाएँ।",
    howP2: "कोई उत्तर सही या गलत नहीं है, और यहाँ आप जो भी चुनें वह सहेजा नहीं जाता।",
    howSample: "नमूना: अच्छी नींद, अच्छा मूड और सहारा देने वाला कोई साथ हो, तो सारांश स्थिर आता है।",
    runsTitle: "इस विज़िट में आपके रन", runsEmpty: "अभी कोई रन नहीं। चेक-इन चलाएँ, इस विज़िट की हर कोशिश यहाँ दिखेगी।",
    dGuideTitle: "गाइड",
    dGuideP1: "एक बार में एक सवाल लें। अगर कोई सवाल मुश्किल लगे, तो वह चुनें जो इस हफ़्ते ज़्यादातर दिनों के सबसे करीब हो।",
    dGuideP2: "अगर आप कभी असुरक्षित महसूस करें, या खुद को या अपने बच्चे को नुकसान पहुँचाने के विचार आएँ, तो तुरंत स्थानीय आपातकालीन सेवाओं से संपर्क करें।",
    reflection: "चिंतन",
    quiz: [
      { q: "आपकी नींद कैसी रही है?", o: ["ज़्यादातर अच्छी", "अक्सर टूटती है", "बहुत कम"] },
      { q: "ज़्यादातर दिनों में आपका मूड कैसा रहा है?", o: ["ज़्यादातर अच्छा", "कभी ऊपर, कभी नीचे", "ज़्यादातर उदास"] },
      { q: "क्या कोई है जिस पर आप भरोसा कर सकें?", o: ["हाँ, आसानी से", "कभी-कभी", "वास्तव में नहीं"] }
    ],
    run: "रन", reset: "रीसेट", consoleLbl: "कंसोल",
    outReady: { title: "तैयार हों तो शुरू करें", body: "तीनों सवालों के जवाब दें, फिर रन दबाएँ।" },
    outMore: { title: "एक कदम और", body: "कृपया तीनों सवालों का उत्तर चुनें, फिर रन दबाएँ।" },
    note: " यह एक चिंतन है, निदान नहीं। अगर आप कभी असुरक्षित महसूस करें या खुद को या अपने बच्चे को नुकसान पहुँचाने के विचार आएँ, तो तुरंत स्थानीय आपातकालीन सेवाओं से संपर्क करें।",
    outs: [
      { title: "फ़िलहाल स्थिर", body: "स्थिति काफ़ी स्थिर लगती है। जो चीज़ें काम कर रही हैं उन पर भरोसा रखें, और जब चाहें फिर से चेक-इन करें।" },
      { title: "कुछ तनाव", body: "लगता है कभी-कभी चीज़ें भारी लगती हैं। जहाँ हो सके आराम करें, किसी भरोसेमंद से बात करें, और अपने डॉक्टर को भी बताने पर विचार करें।" },
      { title: "अतिरिक्त सहयोग मददगार हो सकता है", body: "आपके कई उत्तर कठिन दौर की ओर इशारा करते हैं। कृपया जल्द ही किसी डॉक्टर या काउंसलर से बात करने पर विचार करें। आपको यह बोझ अकेले नहीं उठाना है।" }
    ],
    assistTitle: "गाइड असिस्टेंट", assistBody: "उलझन में हैं? एक बार में एक सवाल लें। कोई उत्तर गलत नहीं होता।", dismiss: "बंद करें", accept: "ठीक है",
    guidesEye: "संक्षिप्त परिचय", guidesH1: "हमारी कहानी, पीपीडी, पीसीओएस", guidesH2: "और देखभालकर्ता मॉड्यूल।", guidesLead: "NurtureHer की शुरुआत कैसे हुई, पीपीडी और पीसीओएस क्या हैं, और परिवार व देखभालकर्ता कैसे मदद कर सकते हैं, इसका संक्षिप्त परिचय।",
    guides: [
      { short: "हमारी कहानी", title: "NurtureHer की शुरुआत कैसे हुई", tag: "01 · शुरुआत", summary: "NurtureHer एक सीधे-सादे विश्वास से शुरू हुआ: हर महिला को स्पष्ट, संवेदनशील और भरोसेमंद स्वास्थ्य जानकारी मिलनी चाहिए, बिना शोर में खोए और बिना आलोचना के डर के।", mods: ["हमने शुरुआत क्यों की", "हम किसके लिए हैं", "हम किस पर विश्वास करते हैं", "हम जानकारी को भरोसेमंद कैसे रखते हैं", "हम आगे कहाँ जा रहे हैं", "हमारा देखभाल का वादा"] },
      { short: "प्रसवोत्तर अवसाद", title: "प्रसवोत्तर अवसाद (पीपीडी)", tag: "02 · पीपीडी", summary: "बेबी ब्लूज़ और पीपीडी का फ़र्क समझें, लक्षण पहचानें, और जानें कि मदद कब और कैसे माँगनी है।", mods: ["बेबी ब्लूज़ या पीपीडी?", "आम लक्षण और भावनाएँ", "मदद कब लें", "साथी और परिवार का सहयोग", "इलाज के विकल्प", "खुद की देखभाल की कोमल दिनचर्या"] },
      { short: "पीसीओएस", title: "पॉलीसिस्टिक ओवरी सिंड्रोम (पीसीओएस)", tag: "03 · पीसीओएस", summary: "पीसीओएस क्या है, कैसे दिखता है, कैसे पहचाना जाता है, और रोज़मर्रा के कौन-से कदम इसे सँभालने में मदद करते हैं, इसकी स्पष्ट जानकारी।", mods: ["पीसीओएस क्या है?", "देखने योग्य लक्षण", "निदान कैसे होता है", "खान-पान, व्यायाम और नींद", "पीरियड्स और प्रजनन क्षमता", "भावनात्मक स्वास्थ्य"] },
      { short: "देखभालकर्ता मॉड्यूल", title: "देखभालकर्ता मॉड्यूल", tag: "04 · देखभालकर्ता", summary: "साथी, परिवार और दोस्तों के लिए छोटे मॉड्यूल: कैसे सुनें, संकेत कैसे पहचानें, ज़िम्मेदारी कैसे बाँटें और पेशेवर मदद दिलाने में कब सहयोग करें।", mods: ["बिना सुझाव थोपे सुनना", "शुरुआती संकेत पहचानना", "घर में काम बाँटना", "आराम और नींद में सहयोग", "मदद लेने की बात करना", "अपना भी ध्यान रखना"] }
    ],
    exploreGuide: "यह गाइड देखें", getSummary: "सारांश पाएँ",
    voicesEye: "थोड़ा हौसला", voicesH1: "ऐसे शब्द जो", voicesH2: "दिल के करीब रहें।",
    voices: ["अच्छी माँ बनने के लिए परफ़ेक्ट होना ज़रूरी नहीं।", "मदद माँगना ताकत है, कमज़ोरी नहीं।", "आपका शरीर कुछ कठिन कर रहा है। उसके साथ कोमल रहें।", "आराम इलाज का हिस्सा है, कोई इनाम नहीं।", "आपको अपनी जगह लेने और अपना ध्यान रखने का पूरा हक़ है।"],
    voiceNote: "NurtureHer की ओर से एक संदेश", noteWord: "संदेश",
    faqEye: "सवाल-जवाब", faqH1: "आपके सवाल,", faqH2: "हमारे जवाब।",
    faq: [
      { label: "सामान्य", items: [
        { q: "तो NurtureHer आखिर है क्या?", a: "NurtureHer महिलाओं की सेहत पर भरोसेमंद जानकारी और सहयोग के लिए एक कोमल, आसान जगह है, जिसकी शुरुआत प्रसवोत्तर अवसाद और पीसीओएस से हुई है।" },
        { q: "क्या यह डॉक्टर को दिखाने का विकल्प है?", a: "नहीं। NurtureHer जानकारी और सहयोग देता है, लेकिन किसी स्थिति का निदान या इलाज नहीं कर सकता। अपनी सेहत के बारे में कृपया किसी योग्य स्वास्थ्य विशेषज्ञ से बात करें।" },
        { q: "NurtureHer किसके लिए है?", a: "हर उस व्यक्ति के लिए जो पीपीडी, पीसीओएस और रोज़मर्रा की सेहत पर स्पष्ट, संवेदनशील जानकारी चाहता है, जैसे नई माँएँ, लक्षणों वाली महिलाएँ और उनका साथ देने वाला परिवार।" }
      ] },
      { label: "पीपीडी", items: [
        { q: "पीपीडी बेबी ब्लूज़ से कैसे अलग है?", a: "बेबी ब्लूज़ आम हैं, आमतौर पर जन्म के कुछ दिनों में शुरू होते हैं और लगभग दो हफ़्तों में ठीक हो जाते हैं। पीपीडी ज़्यादा लंबा चलता है, ज़्यादा तीव्र होता है और रोज़मर्रा के जीवन में बाधा डाल सकता है।" },
        { q: "मुझे मदद कब लेनी चाहिए?", a: "अगर उदासी, चिंता या थकान दो हफ़्ते से ज़्यादा रहे, या खुद की या बच्चे की देखभाल मुश्किल लगे, तो डॉक्टर से बात करें। अगर खुद को या अपने बच्चे को नुकसान पहुँचाने के विचार आएँ, तो तुरंत आपातकालीन मदद लें।" },
        { q: "क्या पीपीडी का इलाज हो सकता है?", a: "हाँ। पीपीडी का इलाज संभव है, और काउंसलिंग, परिवार की मदद और कभी-कभी डॉक्टर द्वारा बताई गई दवा से सचमुच फ़र्क पड़ सकता है।" }
      ] },
      { label: "पीसीओएस", items: [
        { q: "पीसीओएस के आम लक्षण क्या हैं?", a: "अनियमित या छूटे हुए पीरियड्स, मुहाँसे, चेहरे या शरीर पर ज़्यादा बाल, सिर के बाल पतले होना और वज़न में बदलाव आम हैं। लक्षण हर व्यक्ति में अलग होते हैं।" },
        { q: "पीसीओएस का निदान कैसे होता है?", a: "डॉक्टर आमतौर पर आपका इतिहास और लक्षण देखते हैं, और शारीरिक जाँच, ब्लड टेस्ट और अल्ट्रासाउंड सुझा सकते हैं।" },
        { q: "क्या पीसीओएस को सँभाला जा सकता है?", a: "हाँ। कई लोग जीवनशैली में बदलाव और ज़रूरत पड़ने पर डॉक्टर की सलाह वाले इलाज से पीसीओएस को सँभालते हैं। जल्दी देखभाल से मदद मिलती है।" }
      ] }
    ],
    ctaH1: "पहला कदम", ctaH2: "उठाने के लिए तैयार?", ctaLead: "NurtureHer से जुड़ें और उसकी सेहत के हर पड़ाव के लिए शांत, भरोसेमंद मार्गदर्शन पाएँ।", talkUs: "हमसे बात करें",
    footTag: "प्रसवोत्तर अवसाद, पीसीओएस और रोज़मर्रा की सेहत पर कोमल, भरोसेमंद मार्गदर्शन।", explore: "खोजें", account: "खाता", contact: "संपर्क",
    ph: ["[ईमेल पता]", "[फ़ोन नंबर]", "[शहर, राज्य]"],
    copy: "© 2026 NurtureHer. यह साइट सामान्य जानकारी देती है और पेशेवर चिकित्सा सलाह का विकल्प नहीं है।",
    letterEye: "आपके लिए एक पत्र", letterTitle: "प्रिय माँ,",
    letterP: "आप यहाँ हैं, हमें बहुत खुशी है। यह दौर आपके लिए जैसा भी हो, खुशी भरा, भारी या दोनों के बीच का, आप देखभाल, आराम और अपनेपन की हक़दार हैं।",
    rApproach: "तरीका", rApproachV: "कोमल कदम", rGuidance: "मार्गदर्शन", rGuidanceV: "भरोसेमंद जानकारी", rStatus: "स्थिति", rStatusV: "आप अकेली नहीं हैं",
    closeBtn: "बंद करें", closeAria: "बंद करें",
    thanks: "धन्यवाद।", thanksP: "यह एक डिज़ाइन पूर्वावलोकन है, इसलिए कुछ भेजा नहीं गया। असली साइट पर यहीं हम पुष्टि करेंगे और आपसे संपर्क करेंगे।",
    formTalk: "आइए बात करें", formSum: "सारांश गाइड पाएँ",
    subTalk: "हमें अपने बारे में थोड़ा बताएँ और यह भी कि हम आपसे कैसे संपर्क करें।", subSum: "अपना विवरण दें और हम इस गाइड का एक छोटा सारांश भेजेंगे।",
    btnTalk: "जुड़ें", btnSum: "मुझे सारांश भेजें",
    fullName: "पूरा नाम", namePh: "आपका नाम", email: "ईमेल", phone: "फ़ोन नंबर", optional: "वैकल्पिक", prefContact: "संपर्क का तरीका",
    prefOpts: ["ईमेल", "फ़ोन कॉल", "संदेश"]
  },
  kn: {
    code: "ಕನ್ನಡ", themeLabel: "ಡಾರ್ಕ್ ಅಥವಾ ಲೈಟ್ ಮೋಡ್ ಬದಲಿಸಿ", langLabel: "ಭಾಷೆ ಬದಲಿಸಿ",
    login: "ಲಾಗಿನ್", register: "ನೋಂದಣಿ", menu: "ಮೆನು", menuOpen: "ಮೆನು ತೆರೆಯಿರಿ", menuClose: "ಮೆನು ಮುಚ್ಚಿ", closeWord: "ಮುಚ್ಚಿ",
    navWhy: "NurtureHer ಏಕೆ", navPlat: "ವೇದಿಕೆ", navGuides: "ಅವಲೋಕನ", navFaq: "ಪ್ರಶ್ನೋತ್ತರ",
    mWhy: "NurtureHer ಏಕೆ", mPlat: "ವೇದಿಕೆ", mDemo: "ಚೆಕ್-ಇನ್ ಪ್ರಯತ್ನಿಸಿ", mGuides: "ತ್ವರಿತ ಅವಲೋಕನ", mFaq: "ಪ್ರಶ್ನೋತ್ತರ",
    pill: "ಮಹಿಳಾ ಆರೋಗ್ಯ · ಪಿಪಿಡಿ · ಪಿಸಿಓಎಸ್",
    exploreDemo: "ಡೆಮೋ ನೋಡಿ",
    winCheck: "ಚೆಕ್-ಇನ್ ಆ್ಯಪ್", winNote: "ದೈನಂದಿನ ಟಿಪ್ಪಣಿ", winGuides: "ಅವಲೋಕನ", previewWord: "ಮುನ್ನೋಟ", minAria: "ಚಿಕ್ಕದಾಗಿಸಿ", closeWinAria: "ವಿಂಡೋ ಮುಚ್ಚಿ",
    heroWords: ["ಅವಳ", "ಜೊತೆ", "ಸದಾ", "ಇರುವ", "ಬೆಂಬಲ."], heroGrad: 2,
    heroLead: "NurtureHer ಪ್ರಸವೋತ್ತರ ಖಿನ್ನತೆ, ಪಿಸಿಓಎಸ್ ಮತ್ತು ದೈನಂದಿನ ಯೋಗಕ್ಷೇಮದ ಕುರಿತು ಮೃದುವಾದ, ವಿಶ್ವಾಸಾರ್ಹ ಮಾರ್ಗದರ್ಶನ ನೀಡುತ್ತದೆ, ಯಾವ ಮಹಿಳೆಯೂ ಎಲ್ಲವನ್ನೂ ಒಂಟಿಯಾಗಿ ನಿಭಾಯಿಸಬೇಕಾಗಿಲ್ಲ.",
    getStarted: "ಪ್ರಾರಂಭಿಸಿ", openLetter: "ನಿಮ್ಮ ಪತ್ರ ತೆರೆಯಿರಿ",
    feel: "ಇಂದು ನಿಮಗೆ ಹೇಗನಿಸುತ್ತಿದೆ?", moodPrompt: "ಮೃದುವಾದ ಸಂದೇಶ ನೋಡಲು ಒಂದು ಮನಸ್ಥಿತಿ ಆರಿಸಿ.",
    moods: [
      { label: "ಶಾಂತ", reply: "ಚೆನ್ನಾಗಿದೆ. ಇಂದು ಏನು ಸಹಾಯ ಮಾಡಿತು ಎಂದು ಗಮನಿಸಿ, ಅದನ್ನು ಇನ್ನಷ್ಟು ಮಾಡಿ." },
      { label: "ಆಯಾಸ", reply: "ಅದು ತುಂಬಾ ಸಹಜ. ಸಾಧ್ಯವಾದಲ್ಲಿ ವಿಶ್ರಾಂತಿ ಪಡೆಯಿರಿ, ಅಗತ್ಯವಿದ್ದರೆ ಸಹಾಯ ಕೇಳಿ." },
      { label: "ಆತಂಕ", reply: "ನಿಧಾನವಾಗಿ ಒಂದು ಉಸಿರು ತೆಗೆದುಕೊಳ್ಳಿ. ನಂಬಿಕಸ್ಥರ ಜೊತೆ ಮಾತನಾಡಿದರೆ ಭಾರ ಹಗುರವಾಗಬಹುದು." },
      { label: "ಕುಗ್ಗಿದ", reply: "ಹೇಳಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದ. ಇದು ಮುಂದುವರಿದರೆ ದಯವಿಟ್ಟು ವೈದ್ಯರು ಅಥವಾ ಸಲಹೆಗಾರರ ಜೊತೆ ಮಾತನಾಡಿ." },
      { label: "ಸಂತೋಷ", reply: "ಅದ್ಭುತ. ಈ ಭಾವನೆಯನ್ನು ಉಳಿಸಿಕೊಳ್ಳಿ, ಬೇರೊಬ್ಬರ ಜೊತೆ ಹಂಚಿಕೊಳ್ಳಿ." }
    ],
    todayWill: "ಇಂದು ನಾನು…", tw: ["ಕೇವಲ ಹತ್ತು ನಿಮಿಷವಾದರೂ ವಿಶ್ರಾಂತಿ ಪಡೆಯುತ್ತೇನೆ", "ನೀರು ಕುಡಿಯುತ್ತೇನೆ", "ಇಂದು ಯಾರಾದರೂ ಬಳಿ ಸಹಾಯ ಕೇಳುತ್ತೇನೆ"],
    statusSup: "ಸ್ಥಿತಿ: ಬೆಂಬಲ ಸಿಕ್ಕಿದೆ", topics6: "6 ವಿಷಯಗಳು", resetWins: "ವಿಂಡೋ ಮರುಹೊಂದಿಸಿ",
    marqEye: "ನಾವು ಏನನ್ನು ಒಳಗೊಳ್ಳುತ್ತೇವೆ", marqH1: "ಮುಖ್ಯವಾದ ಎಲ್ಲವನ್ನೂ", marqH2: "ಒಳಗೊಳ್ಳುವ ಕಾಳಜಿ.",
    marqA: ["ಪ್ರಸವೋತ್ತರ ಖಿನ್ನತೆ", "ಪಿಸಿಓಎಸ್", "ಋತುಚಕ್ರ ಆರೋಗ್ಯ", "ನಿದ್ರೆ ಮತ್ತು ವಿಶ್ರಾಂತಿ", "ಪೋಷಣೆ", "ಮೈಂಡ್‌ಫುಲ್‌ನೆಸ್", "ಕುಟುಂಬದ ಬೆಂಬಲ", "ಆರಂಭಿಕ ಜಾಗೃತಿ"],
    marqB: ["ಮೃದುವಾದ ಮಾರ್ಗದರ್ಶನ", "ವಿಶ್ವಾಸಾರ್ಹ ಮಾಹಿತಿ", "ತೀರ್ಪಿಲ್ಲದೆ", "ನಿಮ್ಮದೇ ವೇಗ", "ಲಕ್ಷಣಗಳನ್ನು ತಿಳಿಯಿರಿ", "ವೈದ್ಯರ ಜೊತೆ ಮಾತನಾಡಿ", "ನೀವು ಒಂಟಿಯಲ್ಲ", "ಸ್ವಯಂ ಆರೈಕೆ"],
    whyEye: "NurtureHer ಏಕೆ", whyH1: "ಕಾಳಜಿ ಇರಬೇಕು", whyH2: "ಮೃದುವಾಗಿ, ಯಾಂತ್ರಿಕವಾಗಿ ಅಲ್ಲ.",
    why: [
      { title: "ವಿಶ್ವಾಸಾರ್ಹ ಮಾಹಿತಿ", body: "ಪ್ರಸವೋತ್ತರ ಖಿನ್ನತೆ ಮತ್ತು ಪಿಸಿಓಎಸ್ ಕುರಿತು ಸರಳ ಭಾಷೆಯ ವಿವರಣೆ, ಓದಲು ಸುಲಭ ಮತ್ತು ನಂಬಲು ಯೋಗ್ಯ.", tags: ["ಸರಳ ಭಾಷೆ", "ಓದಲು ಸುಲಭ", "ಸಾಕ್ಷ್ಯಾಧಾರಿತ"] },
      { title: "ಮೃದುವಾದ ಮಾರ್ಗದರ್ಶನ", body: "ನೀವಿರುವ ಸ್ಥಿತಿಯಲ್ಲೇ ನಿಮ್ಮನ್ನು ಭೇಟಿಯಾಗುವ ಶಾಂತ, ಹಂತ ಹಂತದ ಮಾರ್ಗದರ್ಶನ, ಒತ್ತಡ ಮತ್ತು ತೀರ್ಪು ಇಲ್ಲದೆ.", tags: ["ಹಂತ ಹಂತವಾಗಿ", "ತೀರ್ಪಿಲ್ಲದೆ", "ನಿಮ್ಮದೇ ವೇಗ"] },
      { title: "ಆರಂಭಿಕ ಜಾಗೃತಿ", body: "ಲಕ್ಷಣಗಳನ್ನು ಬೇಗ ತಿಳಿದರೆ ಸಹಾಯ ಕೇಳುವುದು ಸುಲಭ. ಏನನ್ನು ಗಮನಿಸಬೇಕು ಮತ್ತು ಯಾವಾಗ ಕ್ರಮ ಕೈಗೊಳ್ಳಬೇಕು ಎಂದು ತಿಳಿಯಿರಿ.", tags: ["ಲಕ್ಷಣಗಳನ್ನು ತಿಳಿಯಿರಿ", "ಬೇಗ ಚಿಕಿತ್ಸೆ ಪಡೆಯಿರಿ", "ಕುಟುಂಬದೊಂದಿಗೆ ಹಂಚಿಕೊಳ್ಳಿ"] },
      { title: "ಬೆಂಬಲದ ದಾರಿಗಳು", body: "ವೈದ್ಯರು ಅಥವಾ ಸಲಹೆಗಾರರನ್ನು ಯಾವಾಗ ಮತ್ತು ಹೇಗೆ ತಲುಪಬೇಕು, ಆಪ್ತರು ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು ಎಂಬ ಸ್ಪಷ್ಟ ಮಾಹಿತಿ.", tags: ["ಯಾವಾಗ ಸಹಾಯ ಪಡೆಯಬೇಕು", "ತಜ್ಞರ ಜೊತೆ ಮಾತನಾಡಿ", "ಕುಟುಂಬವನ್ನು ಸೇರಿಸಿ"] }
    ],
    platEye: "ವೇದಿಕೆ", platH1: "ಒಂದೇ ಸ್ಥಳ.", platH2: "ಅವಳಿಗೆ ಬೇಕಾದ ಎಲ್ಲವೂ.",
    platLead: "ಚೆಕ್-ಇನ್, ಸ್ಪಷ್ಟ ವಿವರಣೆ ಮತ್ತು ಮುಂದೆ ಎಲ್ಲಿಗೆ ಹೋಗಬೇಕು ಎಂದು ತಿಳಿಯಲು ಶಾಂತ ಸ್ಥಳ. ಇದು ಒಂದು ಉದಾಹರಣೆ ಮುನ್ನೋಟ.",
    lms: [
      { title: "ದೈನಂದಿನ ಚೆಕ್-ಇನ್", body: "ನಿಮಗೆ ಹೇಗನಿಸುತ್ತಿದೆ ಎಂದು ಗಮನಿಸಲು ಮತ್ತು ವಾರದ ಮಾದರಿಗಳನ್ನು ಗುರುತಿಸಲು ಒಂದು ಸಣ್ಣ, ಮೃದು ಮಾರ್ಗ." },
      { title: "ನಿಮ್ಮದೇ ವೇಗದಲ್ಲಿ ಕಲಿಯಿರಿ", body: "ಪಿಪಿಡಿ, ಪಿಸಿಓಎಸ್ ಮತ್ತು ಯೋಗಕ್ಷೇಮದ ಕುರಿತು ಸಣ್ಣ ಮಾರ್ಗದರ್ಶಿಗಳು, ಬೇಕಾದಾಗ ಆರಂಭಿಸಿ, ಬೇಕಾದಾಗ ನಿಲ್ಲಿಸಿ." },
      { title: "ಎಲ್ಲಿಗೆ ಹೋಗಬೇಕೆಂದು ತಿಳಿಯಿರಿ", body: "ವೈದ್ಯರು, ಸಲಹೆಗಾರರು ಮತ್ತು ಸುತ್ತಲಿನ ಜನರನ್ನು ತಲುಪಲು ಸರಳ ಸೂಚನೆಗಳು." }
    ],
    goodMorning: "ಶುಭೋದಯ", weekSample: "ನಿಮ್ಮ ವಾರ (ಮಾದರಿ)",
    courses: ["ಪ್ರಸವೋತ್ತರ ಖಿನ್ನತೆ ಎಂದರೇನು?", "ಪಿಸಿಓಎಸ್ ಅರ್ಥಮಾಡಿಕೊಳ್ಳುವುದು", "ನಿದ್ರೆ, ಆಹಾರ ಮತ್ತು ವಿಶ್ರಾಂತಿ"],
    turn: ["ವೈದ್ಯರೊಂದಿಗೆ ಮಾತನಾಡಿ", "ಸಲಹೆಗಾರರನ್ನು ಹುಡುಕಿ", "ಕುಟುಂಬವನ್ನು ಜೊತೆಗೂಡಿಸಿ"],
    demoEye: "ಲೈವ್ ಡೆಮೊ", demoH1: "ಕೇವಲ ಓದಬೇಡಿ.", demoH2: "ಮೃದುವಾದ ಚೆಕ್-ಇನ್ ಪ್ರಯತ್ನಿಸಿ.",
    demoLead: "ಪ್ರತಿ ಪ್ರಶ್ನೆಗೆ ಒಂದು ಉತ್ತರ ಆರಿಸಿ, ನಂತರ ರನ್ ಒತ್ತಿ. ಇದು ಯೋಚಿಸಲು ಸಹಾಯ ಮಾಡುವ ಪ್ರತಿಬಿಂಬ, ರೋಗನಿರ್ಣಯವಲ್ಲ.",
    weeklyCheck: "ಸಾಪ್ತಾಹಿಕ ಚೆಕ್-ಇನ್", gentle: "ಮೃದು", dTabs: ["ವಿವರಣೆ", "ರನ್‌ಗಳು", "ಮಾರ್ಗದರ್ಶಿ"],
    howTitle: "ಇದು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ",
    howP1: "ನಿದ್ರೆ, ಮನಸ್ಥಿತಿ ಮತ್ತು ಬೆಂಬಲದ ಕುರಿತು ಮೂರು ಸಣ್ಣ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಿ. ಮೃದುವಾದ ಸಾರಾಂಶ ಮತ್ತು ಮುಂದೆ ಮಾಡಬಹುದಾದ ಕೆಲವು ಸಲಹೆಗಳಿಗಾಗಿ ರನ್ ಒತ್ತಿ.",
    howP2: "ಯಾವ ಉತ್ತರವೂ ಸರಿ ಅಥವಾ ತಪ್ಪಲ್ಲ, ಮತ್ತು ಇಲ್ಲಿ ನೀವು ಆರಿಸುವುದು ಏನನ್ನೂ ಉಳಿಸಲಾಗುವುದಿಲ್ಲ.",
    howSample: "ಮಾದರಿ: ಚೆನ್ನಾಗಿ ನಿದ್ರೆ, ಉತ್ತಮ ಮನಸ್ಥಿತಿ, ಆತುಕೊಳ್ಳಲು ಒಬ್ಬರಿದ್ದರೆ ಸಾರಾಂಶ ಸ್ಥಿರವಾಗಿರುತ್ತದೆ.",
    runsTitle: "ಈ ಭೇಟಿಯಲ್ಲಿ ನಿಮ್ಮ ರನ್‌ಗಳು", runsEmpty: "ಇನ್ನೂ ರನ್ ಇಲ್ಲ. ಚೆಕ್-ಇನ್ ನಡೆಸಿ, ಈ ಭೇಟಿಯ ಪ್ರತಿ ಪ್ರಯತ್ನ ಇಲ್ಲಿ ಕಾಣುತ್ತದೆ.",
    dGuideTitle: "ಮಾರ್ಗದರ್ಶಿ",
    dGuideP1: "ಒಂದು ಸಮಯದಲ್ಲಿ ಒಂದು ಪ್ರಶ್ನೆ ತೆಗೆದುಕೊಳ್ಳಿ. ಯಾವುದಾದರೂ ಪ್ರಶ್ನೆಗೆ ಉತ್ತರಿಸುವುದು ಕಷ್ಟವೆನಿಸಿದರೆ, ಈ ವಾರ ಹೆಚ್ಚಿನ ದಿನಗಳಿಗೆ ಹತ್ತಿರವಾದುದನ್ನು ಆರಿಸಿ.",
    dGuideP2: "ನೀವು ಎಂದಾದರೂ ಅಸುರಕ್ಷಿತವೆನಿಸಿದರೆ, ಅಥವಾ ನಿಮಗೆ ಅಥವಾ ನಿಮ್ಮ ಮಗುವಿಗೆ ಹಾನಿ ಮಾಡುವ ಆಲೋಚನೆ ಬಂದರೆ, ತಕ್ಷಣ ಸ್ಥಳೀಯ ತುರ್ತು ಸೇವೆಗಳನ್ನು ಸಂಪರ್ಕಿಸಿ.",
    reflection: "ಪ್ರತಿಬಿಂಬ",
    quiz: [
      { q: "ನಿಮ್ಮ ನಿದ್ರೆ ಹೇಗಿದೆ?", o: ["ಹೆಚ್ಚಾಗಿ ಚೆನ್ನಾಗಿ", "ಆಗಾಗ ಭಂಗವಾಗುತ್ತದೆ", "ಬಹುತೇಕ ಇಲ್ಲ"] },
      { q: "ಹೆಚ್ಚಿನ ದಿನಗಳಲ್ಲಿ ನಿಮ್ಮ ಮನಸ್ಥಿತಿ ಹೇಗಿದೆ?", o: ["ಹೆಚ್ಚಾಗಿ ಚೆನ್ನಾಗಿ", "ಏರಿಳಿತ", "ಹೆಚ್ಚಾಗಿ ಕುಗ್ಗಿದೆ"] },
      { q: "ಆತುಕೊಳ್ಳಲು ನಿಮಗೆ ಯಾರಾದರೂ ಇದ್ದಾರೆಯೇ?", o: ["ಹೌದು, ಸುಲಭವಾಗಿ", "ಕೆಲವೊಮ್ಮೆ", "ನಿಜವಾಗಿಯೂ ಇಲ್ಲ"] }
    ],
    run: "ರನ್", reset: "ಮರುಹೊಂದಿಸಿ", consoleLbl: "ಕನ್ಸೋಲ್",
    outReady: { title: "ನೀವು ಸಿದ್ಧರಾದಾಗ", body: "ಮೂರು ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಿ, ನಂತರ ರನ್ ಒತ್ತಿ." },
    outMore: { title: "ಇನ್ನೂ ಒಂದು ಹೆಜ್ಜೆ", body: "ದಯವಿಟ್ಟು ಮೂರೂ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರ ಆರಿಸಿ, ನಂತರ ರನ್ ಒತ್ತಿ." },
    note: " ಇದು ಪ್ರತಿಬಿಂಬ, ರೋಗನಿರ್ಣಯವಲ್ಲ. ನೀವು ಎಂದಾದರೂ ಅಸುರಕ್ಷಿತವೆನಿಸಿದರೆ ಅಥವಾ ನಿಮಗೆ ಅಥವಾ ನಿಮ್ಮ ಮಗುವಿಗೆ ಹಾನಿ ಮಾಡುವ ಆಲೋಚನೆ ಬಂದರೆ, ತಕ್ಷಣ ಸ್ಥಳೀಯ ತುರ್ತು ಸೇವೆಗಳನ್ನು ಸಂಪರ್ಕಿಸಿ.",
    outs: [
      { title: "ಸದ್ಯಕ್ಕೆ ಸ್ಥಿರ", body: "ಪರಿಸ್ಥಿತಿ ಸಾಕಷ್ಟು ಸ್ಥಿರವಾಗಿದೆ ಎನಿಸುತ್ತದೆ. ಕೆಲಸ ಮಾಡುತ್ತಿರುವುದನ್ನು ಮುಂದುವರಿಸಿ, ಬೇಕೆನಿಸಿದಾಗ ಮತ್ತೆ ಚೆಕ್-ಇನ್ ಮಾಡಿ." },
      { title: "ಸ್ವಲ್ಪ ಒತ್ತಡ", body: "ಕೆಲವೊಮ್ಮೆ ಪರಿಸ್ಥಿತಿ ಭಾರವೆನಿಸುತ್ತದೆ. ಸಾಧ್ಯವಾದಲ್ಲಿ ವಿಶ್ರಾಂತಿ ಪಡೆಯಿರಿ, ನಂಬಿಕಸ್ಥರ ಜೊತೆ ಮಾತನಾಡಿ, ವೈದ್ಯರಿಗೂ ಹೇಳುವುದನ್ನು ಪರಿಗಣಿಸಿ." },
      { title: "ಹೆಚ್ಚುವರಿ ಬೆಂಬಲ ಸಹಾಯಕವಾಗಬಹುದು", body: "ನಿಮ್ಮ ಹಲವು ಉತ್ತರಗಳು ಕಠಿಣ ಹಂತವನ್ನು ಸೂಚಿಸುತ್ತವೆ. ದಯವಿಟ್ಟು ಬೇಗನೆ ವೈದ್ಯರು ಅಥವಾ ಸಲಹೆಗಾರರ ಜೊತೆ ಮಾತನಾಡಿ. ಈ ಭಾರವನ್ನು ನೀವು ಒಬ್ಬರೇ ಹೊರಬೇಕಿಲ್ಲ." }
    ],
    assistTitle: "ಮಾರ್ಗದರ್ಶಿ ಸಹಾಯಕ", assistBody: "ಗೊಂದಲವೇ? ಒಂದು ಸಮಯದಲ್ಲಿ ಒಂದು ಪ್ರಶ್ನೆ ತೆಗೆದುಕೊಳ್ಳಿ. ಯಾವ ಉತ್ತರವೂ ತಪ್ಪಲ್ಲ.", dismiss: "ಬೇಡ", accept: "ಸರಿ",
    guidesEye: "ತ್ವರಿತ ಅವಲೋಕನ", guidesH1: "ನಮ್ಮ ಕಥೆ, ಪಿಪಿಡಿ, ಪಿಸಿಓಎಸ್", guidesH2: "ಮತ್ತು ಆರೈಕೆದಾರರ ಮಾಡ್ಯೂಲ್‌ಗಳು.", guidesLead: "NurtureHer ಹೇಗೆ ಆರಂಭವಾಯಿತು, ಪಿಪಿಡಿ ಮತ್ತು ಪಿಸಿಓಎಸ್ ಎಂದರೇನು, ಕುಟುಂಬ ಮತ್ತು ಆರೈಕೆದಾರರು ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು ಎಂಬ ತ್ವರಿತ ಅವಲೋಕನ.",
    guides: [
      { short: "ನಮ್ಮ ಕಥೆ", title: "NurtureHer ಹೇಗೆ ಆರಂಭವಾಯಿತು", tag: "01 · ಆರಂಭ", summary: "NurtureHer ಒಂದು ಸರಳ ನಂಬಿಕೆಯಿಂದ ಆರಂಭವಾಯಿತು: ಪ್ರತಿ ಮಹಿಳೆಗೂ ಸ್ಪಷ್ಟ, ಕಾಳಜಿಯ ಮತ್ತು ವಿಶ್ವಾಸಾರ್ಹ ಆರೋಗ್ಯ ಮಾಹಿತಿ ಸಿಗಬೇಕು, ಗದ್ದಲದಲ್ಲಿ ಹುಡುಕಬೇಕಿಲ್ಲ, ತೀರ್ಪಿನ ಭಯವಿಲ್ಲದೆ.", mods: ["ನಾವು ಏಕೆ ಆರಂಭಿಸಿದೆವು", "ನಾವು ಯಾರಿಗಾಗಿ", "ನಾವು ನಂಬುವುದು ಏನನ್ನು", "ಮಾಹಿತಿಯನ್ನು ವಿಶ್ವಾಸಾರ್ಹವಾಗಿ ಹೇಗೆ ಇಡುತ್ತೇವೆ", "ನಾವು ಮುಂದೆ ಎತ್ತ ಸಾಗುತ್ತಿದ್ದೇವೆ", "ನಮ್ಮ ಕಾಳಜಿಯ ಭರವಸೆ"] },
      { short: "ಪ್ರಸವೋತ್ತರ ಖಿನ್ನತೆ", title: "ಪ್ರಸವೋತ್ತರ ಖಿನ್ನತೆ (ಪಿಪಿಡಿ)", tag: "02 · ಪಿಪಿಡಿ", summary: "ಬೇಬಿ ಬ್ಲೂಸ್ ಮತ್ತು ಪಿಪಿಡಿ ನಡುವಿನ ವ್ಯತ್ಯಾಸ ತಿಳಿಯಿರಿ, ಲಕ್ಷಣಗಳನ್ನು ಗುರುತಿಸಿ, ಯಾವಾಗ ಮತ್ತು ಹೇಗೆ ಸಹಾಯ ಕೇಳಬೇಕು ಎಂದು ತಿಳಿಯಿರಿ.", mods: ["ಬೇಬಿ ಬ್ಲೂಸ್ ಅಥವಾ ಪಿಪಿಡಿ?", "ಸಾಮಾನ್ಯ ಲಕ್ಷಣಗಳು ಮತ್ತು ಭಾವನೆಗಳು", "ಯಾವಾಗ ಸಹಾಯ ಪಡೆಯಬೇಕು", "ಸಂಗಾತಿ ಮತ್ತು ಕುಟುಂಬದ ಬೆಂಬಲ", "ಚಿಕಿತ್ಸೆಯ ಆಯ್ಕೆಗಳು", "ಮೃದುವಾದ ಸ್ವಯಂ ಆರೈಕೆ ದಿನಚರಿ"] },
      { short: "ಪಿಸಿಓಎಸ್", title: "ಪಾಲಿಸಿಸ್ಟಿಕ್ ಓವರಿ ಸಿಂಡ್ರೋಮ್ (ಪಿಸಿಓಎಸ್)", tag: "03 · ಪಿಸಿಓಎಸ್", summary: "ಪಿಸಿಓಎಸ್ ಎಂದರೇನು, ಅದು ಹೇಗೆ ಕಾಣಿಸಿಕೊಳ್ಳುತ್ತದೆ, ಹೇಗೆ ಪತ್ತೆಯಾಗುತ್ತದೆ ಮತ್ತು ದೈನಂದಿನ ಯಾವ ಹೆಜ್ಜೆಗಳು ನಿರ್ವಹಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತವೆ ಎಂಬ ಸ್ಪಷ್ಟ ನೋಟ.", mods: ["ಪಿಸಿಓಎಸ್ ಎಂದರೇನು?", "ಗಮನಿಸಬೇಕಾದ ಲಕ್ಷಣಗಳು", "ರೋಗನಿರ್ಣಯ ಪಡೆಯುವುದು", "ಆಹಾರ, ಚಲನೆ ಮತ್ತು ನಿದ್ರೆ", "ಮುಟ್ಟು ಮತ್ತು ಫಲವತ್ತತೆ", "ಭಾವನಾತ್ಮಕ ಯೋಗಕ್ಷೇಮ"] },
      { short: "ಆರೈಕೆದಾರರ ಮಾಡ್ಯೂಲ್‌ಗಳು", title: "ಆರೈಕೆದಾರರ ಮಾಡ್ಯೂಲ್‌ಗಳು", tag: "04 · ಆರೈಕೆದಾರರು", summary: "ಸಂಗಾತಿ, ಕುಟುಂಬ ಮತ್ತು ಸ್ನೇಹಿತರಿಗಾಗಿ ಸಣ್ಣ ಮಾಡ್ಯೂಲ್‌ಗಳು: ಹೇಗೆ ಕೇಳಬೇಕು, ಲಕ್ಷಣಗಳನ್ನು ಹೇಗೆ ಗುರುತಿಸಬೇಕು, ಹೊಣೆ ಹಂಚಿಕೊಳ್ಳುವುದು ಮತ್ತು ವೃತ್ತಿಪರ ಆರೈಕೆ ಪಡೆಯಲು ಯಾವಾಗ ನೆರವಾಗಬೇಕು.", mods: ["ಪರಿಹಾರ ಹೇರದೆ ಕೇಳುವುದು", "ಆರಂಭಿಕ ಲಕ್ಷಣಗಳನ್ನು ಗುರುತಿಸುವುದು", "ಮನೆಯ ಹೊಣೆ ಹಂಚಿಕೊಳ್ಳುವುದು", "ವಿಶ್ರಾಂತಿ ಮತ್ತು ನಿದ್ರೆಗೆ ಬೆಂಬಲ", "ಸಹಾಯ ಪಡೆಯುವ ಬಗ್ಗೆ ಮಾತನಾಡುವುದು", "ನಿಮ್ಮನ್ನೂ ನೋಡಿಕೊಳ್ಳುವುದು"] }
    ],
    exploreGuide: "ಈ ಮಾರ್ಗದರ್ಶಿ ನೋಡಿ", getSummary: "ಸಾರಾಂಶ ಪಡೆಯಿರಿ",
    voicesEye: "ಸ್ವಲ್ಪ ಪ್ರೋತ್ಸಾಹ", voicesH1: "ಹತ್ತಿರವಿರಿಸಿಕೊಳ್ಳಬೇಕಾದ", voicesH2: "ಮಾತುಗಳು.",
    voices: ["ಒಳ್ಳೆಯ ತಾಯಿಯಾಗಲು ಪರಿಪೂರ್ಣರಾಗಿರಬೇಕಿಲ್ಲ.", "ಸಹಾಯ ಕೇಳುವುದು ಬಲ, ವೈಫಲ್ಯವಲ್ಲ.", "ನಿಮ್ಮ ದೇಹ ಕಷ್ಟಕರವಾದದ್ದನ್ನು ಮಾಡುತ್ತಿದೆ. ಅದರೊಂದಿಗೆ ಮೃದುವಾಗಿರಿ.", "ವಿಶ್ರಾಂತಿ ಗುಣವಾಗುವಿಕೆಯ ಭಾಗ, ಬಹುಮಾನವಲ್ಲ.", "ನಿಮ್ಮ ಸ್ಥಾನ ಪಡೆಯಲು ಮತ್ತು ನಿಮ್ಮನ್ನು ನೋಡಿಕೊಳ್ಳಲು ನಿಮಗೆ ಅಧಿಕಾರವಿದೆ."],
    voiceNote: "NurtureHer ಕಡೆಯಿಂದ ಒಂದು ಸಂದೇಶ", noteWord: "ಸಂದೇಶ",
    faqEye: "ಪ್ರಶ್ನೋತ್ತರ", faqH1: "ಪ್ರಶ್ನೆಗಳು,", faqH2: "ಉತ್ತರಗಳು.",
    faq: [
      { label: "ಸಾಮಾನ್ಯ", items: [
        { q: "ಹಾಗಾದರೆ NurtureHer ಎಂದರೆ ನಿಖರವಾಗಿ ಏನು?", a: "NurtureHer ಮಹಿಳೆಯರ ಆರೋಗ್ಯದ ಕುರಿತು ವಿಶ್ವಾಸಾರ್ಹ ಮಾಹಿತಿ ಮತ್ತು ಬೆಂಬಲಕ್ಕಾಗಿ ಒಂದು ಮೃದುವಾದ, ಬಳಸಲು ಸುಲಭವಾದ ಸ್ಥಳ, ಪ್ರಸವೋತ್ತರ ಖಿನ್ನತೆ ಮತ್ತು ಪಿಸಿಓಎಸ್ ನಿಂದ ಆರಂಭ." },
        { q: "ಇದು ವೈದ್ಯರನ್ನು ಭೇಟಿಯಾಗುವುದಕ್ಕೆ ಪರ್ಯಾಯವೇ?", a: "ಇಲ್ಲ. NurtureHer ಮಾಹಿತಿ ಮತ್ತು ಬೆಂಬಲ ನೀಡುತ್ತದೆ, ಆದರೆ ಯಾವುದೇ ಸ್ಥಿತಿಯನ್ನು ಪತ್ತೆ ಮಾಡಲು ಅಥವಾ ಚಿಕಿತ್ಸೆ ನೀಡಲು ಸಾಧ್ಯವಿಲ್ಲ. ನಿಮ್ಮ ಆರೋಗ್ಯದ ಬಗ್ಗೆ ದಯವಿಟ್ಟು ಅರ್ಹ ಆರೋಗ್ಯ ವೃತ್ತಿಪರರ ಜೊತೆ ಮಾತನಾಡಿ." },
        { q: "NurtureHer ಯಾರಿಗಾಗಿ?", a: "ಪಿಪಿಡಿ, ಪಿಸಿಓಎಸ್ ಮತ್ತು ದೈನಂದಿನ ಯೋಗಕ್ಷೇಮದ ಕುರಿತು ಸ್ಪಷ್ಟ, ಕಾಳಜಿಯ ಮಾಹಿತಿ ಬಯಸುವ ಎಲ್ಲರಿಗೂ: ಹೊಸ ತಾಯಂದಿರು, ಲಕ್ಷಣಗಳಿರುವ ಮಹಿಳೆಯರು ಮತ್ತು ಅವರನ್ನು ಬೆಂಬಲಿಸುವ ಕುಟುಂಬ." }
      ] },
      { label: "ಪಿಪಿಡಿ", items: [
        { q: "ಪಿಪಿಡಿ ಬೇಬಿ ಬ್ಲೂಸ್‌ಗಿಂತ ಹೇಗೆ ಭಿನ್ನ?", a: "ಬೇಬಿ ಬ್ಲೂಸ್ ಸಾಮಾನ್ಯ, ಸಾಮಾನ್ಯವಾಗಿ ಹೆರಿಗೆಯ ಕೆಲವೇ ದಿನಗಳಲ್ಲಿ ಆರಂಭವಾಗಿ ಸುಮಾರು ಎರಡು ವಾರಗಳಲ್ಲಿ ಕಡಿಮೆಯಾಗುತ್ತದೆ. ಪಿಪಿಡಿ ಹೆಚ್ಚು ಕಾಲ ಇರುತ್ತದೆ, ಹೆಚ್ಚು ತೀವ್ರವೆನಿಸುತ್ತದೆ ಮತ್ತು ದೈನಂದಿನ ಜೀವನಕ್ಕೆ ಅಡ್ಡಿಯಾಗಬಹುದು." },
        { q: "ನಾನು ಯಾವಾಗ ಸಹಾಯ ಪಡೆಯಬೇಕು?", a: "ಕುಗ್ಗಿದ ಮನಸ್ಥಿತಿ, ಆತಂಕ ಅಥವಾ ಆಯಾಸ ಎರಡು ವಾರಕ್ಕಿಂತ ಹೆಚ್ಚು ಕಾಲ ಇದ್ದರೆ, ಅಥವಾ ನಿಮ್ಮನ್ನು ಅಥವಾ ಮಗುವನ್ನು ನೋಡಿಕೊಳ್ಳುವುದು ಕಷ್ಟವಾದರೆ, ವೈದ್ಯರ ಜೊತೆ ಮಾತನಾಡಿ. ನಿಮಗೆ ಅಥವಾ ನಿಮ್ಮ ಮಗುವಿಗೆ ಹಾನಿ ಮಾಡುವ ಆಲೋಚನೆ ಬಂದರೆ ತಕ್ಷಣ ತುರ್ತು ಸಹಾಯ ಪಡೆಯಿರಿ." },
        { q: "ಪಿಪಿಡಿ ಗೆ ಚಿಕಿತ್ಸೆ ಸಾಧ್ಯವೇ?", a: "ಹೌದು. ಪಿಪಿಡಿ ಗೆ ಚಿಕಿತ್ಸೆ ಇದೆ, ಮತ್ತು ಸಮಾಲೋಚನೆ, ಕುಟುಂಬದ ಸಹಾಯ ಹಾಗೂ ಕೆಲವೊಮ್ಮೆ ವೈದ್ಯರು ಸೂಚಿಸಿದ ಔಷಧ ನಿಜವಾದ ಬದಲಾವಣೆ ತರಬಲ್ಲವು." }
      ] },
      { label: "ಪಿಸಿಓಎಸ್", items: [
        { q: "ಪಿಸಿಓಎಸ್ ನ ಸಾಮಾನ್ಯ ಲಕ್ಷಣಗಳು ಯಾವುವು?", a: "ಅನಿಯಮಿತ ಅಥವಾ ತಪ್ಪಿದ ಮುಟ್ಟು, ಮೊಡವೆ, ಮುಖ ಅಥವಾ ದೇಹದಲ್ಲಿ ಹೆಚ್ಚು ಕೂದಲು, ನೆತ್ತಿಯ ಕೂದಲು ತೆಳುವಾಗುವುದು ಮತ್ತು ತೂಕದ ಬದಲಾವಣೆ ಸಾಮಾನ್ಯ. ಲಕ್ಷಣಗಳು ಒಬ್ಬೊಬ್ಬರಿಗೆ ಬೇರೆ ಬೇರೆ." },
        { q: "ಪಿಸಿಓಎಸ್ ಹೇಗೆ ಪತ್ತೆಯಾಗುತ್ತದೆ?", a: "ವೈದ್ಯರು ಸಾಮಾನ್ಯವಾಗಿ ನಿಮ್ಮ ಇತಿಹಾಸ ಮತ್ತು ಲಕ್ಷಣಗಳನ್ನು ಪರಿಶೀಲಿಸಿ, ದೈಹಿಕ ಪರೀಕ್ಷೆ, ರಕ್ತ ಪರೀಕ್ಷೆ ಮತ್ತು ಅಲ್ಟ್ರಾಸೌಂಡ್ ಸೂಚಿಸಬಹುದು." },
        { q: "ಪಿಸಿಓಎಸ್ ಅನ್ನು ನಿರ್ವಹಿಸಬಹುದೇ?", a: "ಹೌದು. ಅನೇಕರು ಜೀವನಶೈಲಿ ಬದಲಾವಣೆ ಮತ್ತು ಅಗತ್ಯವಿದ್ದಾಗ ವೈದ್ಯರ ಮಾರ್ಗದರ್ಶನದ ಚಿಕಿತ್ಸೆಯಿಂದ ಪಿಸಿಓಎಸ್ ಅನ್ನು ನಿರ್ವಹಿಸುತ್ತಾರೆ. ಬೇಗ ಕಾಳಜಿ ವಹಿಸಿದರೆ ಸಹಾಯವಾಗುತ್ತದೆ." }
      ] }
    ],
    ctaH1: "ಮೊದಲ ಹೆಜ್ಜೆ ಇಡಲು", ctaH2: "ಸಿದ್ಧರಿದ್ದೀರಾ?", ctaLead: "NurtureHer ಗೆ ಸೇರಿ, ಅವಳ ಆರೋಗ್ಯದ ಪ್ರತಿ ಹಂತಕ್ಕೂ ಶಾಂತ, ವಿಶ್ವಾಸಾರ್ಹ ಮಾರ್ಗದರ್ಶನ ಪಡೆಯಿರಿ.", talkUs: "ನಮ್ಮೊಂದಿಗೆ ಮಾತನಾಡಿ",
    footTag: "ಪ್ರಸವೋತ್ತರ ಖಿನ್ನತೆ, ಪಿಸಿಓಎಸ್ ಮತ್ತು ದೈನಂದಿನ ಯೋಗಕ್ಷೇಮದ ಕುರಿತು ಮೃದುವಾದ, ವಿಶ್ವಾಸಾರ್ಹ ಮಾರ್ಗದರ್ಶನ.", explore: "ಅನ್ವೇಷಿಸಿ", account: "ಖಾತೆ", contact: "ಸಂಪರ್ಕ",
    ph: ["[ಇಮೇಲ್ ವಿಳಾಸ]", "[ಫೋನ್ ಸಂಖ್ಯೆ]", "[ನಗರ, ರಾಜ್ಯ]"],
    copy: "© 2026 NurtureHer. ಈ ಸೈಟ್ ಸಾಮಾನ್ಯ ಮಾಹಿತಿ ನೀಡುತ್ತದೆ ಮತ್ತು ವೃತ್ತಿಪರ ವೈದ್ಯಕೀಯ ಸಲಹೆಗೆ ಬದಲಿಯಲ್ಲ.",
    letterEye: "ನಿಮಗಾಗಿ ಒಂದು ಪತ್ರ", letterTitle: "ಪ್ರೀತಿಯ ಅಮ್ಮ,",
    letterP: "ನೀವು ಇಲ್ಲಿರುವುದಕ್ಕೆ ನಮಗೆ ತುಂಬಾ ಸಂತೋಷ. ಈ ಹಂತ ನಿಮಗೆ ಹೇಗಿದ್ದರೂ, ಸಂತೋಷದ್ದು, ಭಾರವಾದದ್ದು ಅಥವಾ ಎರಡರ ನಡುವಿನದು, ನೀವು ಕಾಳಜಿ, ವಿಶ್ರಾಂತಿ ಮತ್ತು ದಯೆಗೆ ಅರ್ಹರು.",
    rApproach: "ವಿಧಾನ", rApproachV: "ಮೃದುವಾದ ಹೆಜ್ಜೆಗಳು", rGuidance: "ಮಾರ್ಗದರ್ಶನ", rGuidanceV: "ವಿಶ್ವಾಸಾರ್ಹ ಮಾಹಿತಿ", rStatus: "ಸ್ಥಿತಿ", rStatusV: "ನೀವು ಒಂಟಿಯಲ್ಲ",
    closeBtn: "ಮುಚ್ಚಿ", closeAria: "ಮುಚ್ಚಿ",
    thanks: "ಧನ್ಯವಾದಗಳು.", thanksP: "ಇದು ವಿನ್ಯಾಸದ ಮುನ್ನೋಟ, ಆದ್ದರಿಂದ ಏನನ್ನೂ ಕಳುಹಿಸಲಾಗಿಲ್ಲ. ನಿಜವಾದ ಸೈಟ್‌ನಲ್ಲಿ ಇಲ್ಲಿ ನಾವು ದೃಢೀಕರಿಸಿ ಸಂಪರ್ಕಿಸುತ್ತೇವೆ.",
    formTalk: "ಮಾತನಾಡೋಣ", formSum: "ಸಾರಾಂಶ ಮಾರ್ಗದರ್ಶಿ ಪಡೆಯಿರಿ",
    subTalk: "ನಿಮ್ಮ ಬಗ್ಗೆ ಸ್ವಲ್ಪ ಹೇಳಿ ಮತ್ತು ನಾವು ನಿಮ್ಮನ್ನು ಹೇಗೆ ಸಂಪರ್ಕಿಸಬೇಕು ಎಂದು ತಿಳಿಸಿ.", subSum: "ನಿಮ್ಮ ವಿವರ ನೀಡಿ, ಈ ಮಾರ್ಗದರ್ಶಿಯ ಸಣ್ಣ ಸಾರಾಂಶ ಕಳುಹಿಸುತ್ತೇವೆ.",
    btnTalk: "ಸಂಪರ್ಕಿಸೋಣ", btnSum: "ಸಾರಾಂಶ ಕಳುಹಿಸಿ",
    fullName: "ಪೂರ್ಣ ಹೆಸರು", namePh: "ನಿಮ್ಮ ಹೆಸರು", email: "ಇಮೇಲ್", phone: "ಫೋನ್ ಸಂಖ್ಯೆ", optional: "ಐಚ್ಛಿಕ", prefContact: "ಆದ್ಯತೆಯ ಸಂಪರ್ಕ ವಿಧಾನ",
    prefOpts: ["ಇಮೇಲ್", "ಫೋನ್ ಕರೆ", "ಸಂದೇಶ"]
  },
  ta: {
    code: "தமிழ்", themeLabel: "இருள் அல்லது ஒளி பயன்முறையை மாற்று", langLabel: "மொழியை மாற்று",
    login: "உள்நுழை", register: "பதிவு செய்", menu: "மெனு", menuOpen: "மெனுவைத் திற", menuClose: "மெனுவை மூடு", closeWord: "மூடு",
    navWhy: "NurtureHer ஏன்", navPlat: "தளம்", navGuides: "கண்ணோட்டம்", navFaq: "கேள்வி-பதில்",
    mWhy: "NurtureHer ஏன்", mPlat: "தளம்", mDemo: "செக்-இன் முயற்சி", mGuides: "விரைவு கண்ணோட்டம்", mFaq: "கேள்வி-பதில்",
    pill: "பெண்கள் நலம் · பிபிடி · பிசிஓஎஸ்",
    exploreDemo: "டெமோவை ஆராயுங்கள்",
    winCheck: "செக்-இன் ஆப்", winNote: "தினசரி குறிப்பு", winGuides: "கண்ணோட்டம்", previewWord: "முன்னோட்டம்", minAria: "சிறிதாக்கு", closeWinAria: "சாளரத்தை மூடு",
    heroWords: ["அவளுடன்", "எப்போதும்", "இருக்கும்", "ஆதரவு."], heroGrad: 1,
    heroLead: "NurtureHer, பிரசவத்திற்குப் பிந்தைய மனச்சோர்வு, பிசிஓஎஸ் மற்றும் அன்றாட நலம் குறித்து மென்மையான, நம்பகமான வழிகாட்டுதலை வழங்குகிறது; எந்தப் பெண்ணும் எல்லாவற்றையும் தனியாகச் சமாளிக்க வேண்டியதில்லை.",
    getStarted: "தொடங்குங்கள்", openLetter: "உங்கள் கடிதத்தைத் திறக்கவும்",
    feel: "இன்று நீங்கள் எப்படி உணர்கிறீர்கள்?", moodPrompt: "மென்மையான குறிப்பைக் காண ஒரு மனநிலையைத் தேர்ந்தெடுங்கள்.",
    moods: [
      { label: "அமைதி", reply: "அருமை. இன்று எது உதவியது என்பதைக் கவனித்து, அதை இன்னும் கொஞ்சம் செய்யுங்கள்." },
      { label: "சோர்வு", reply: "இது முற்றிலும் இயல்பானது. முடிந்த இடத்தில் ஓய்வெடுங்கள், தேவைப்பட்டால் உதவி கேளுங்கள்." },
      { label: "பதற்றம்", reply: "ஒரு மெதுவான மூச்சு எடுங்கள். நம்பிக்கையானவரிடம் பேசினால் சுமை குறையலாம்." },
      { label: "சோகம்", reply: "இதைச் சொன்னதற்கு நன்றி. இது நீடித்தால், தயவுசெய்து மருத்துவர் அல்லது ஆலோசகரிடம் பேசுங்கள்." },
      { label: "மகிழ்ச்சி", reply: "அருமை. இந்த உணர்வைப் பற்றிக்கொண்டு, ஒருவருடன் பகிர்ந்துகொள்ளுங்கள்." }
    ],
    todayWill: "இன்று நான்…", tw: ["பத்து நிமிடமாவது ஓய்வெடுப்பேன்", "தண்ணீர் குடிப்பேன்", "இன்று யாரிடமாவது உதவி கேட்பேன்"],
    statusSup: "நிலை: ஆதரவு கிடைத்தது", topics6: "6 தலைப்புகள்", resetWins: "சாளரங்களை மீட்டமை",
    marqEye: "நாங்கள் உள்ளடக்குவது", marqH1: "முக்கியமான அனைத்தையும்", marqH2: "அரவணைக்கும் அக்கறை.",
    marqA: ["பிரசவத்திற்குப் பிந்தைய மனச்சோர்வு", "பிசிஓஎஸ்", "மாதவிடாய் சுழற்சி நலம்", "தூக்கமும் ஓய்வும்", "ஊட்டச்சத்து", "நினைவாற்றல் பயிற்சி", "குடும்ப ஆதரவு", "முன்கூட்டிய விழிப்புணர்வு"],
    marqB: ["மென்மையான வழிகாட்டுதல்", "நம்பகமான தகவல்", "தீர்ப்பு இல்லாமல்", "உங்கள் வேகத்தில்", "அறிகுறிகளை அறியுங்கள்", "மருத்துவரிடம் பேசுங்கள்", "நீங்கள் தனியாக இல்லை", "சுய பராமரிப்பு"],
    whyEye: "NurtureHer ஏன்", whyH1: "மென்மையாக உணரும் அக்கறை,", whyH2: "மருத்துவ இறுக்கம் இல்லாமல்.",
    why: [
      { title: "நம்பகமான தகவல்", body: "பிரசவத்திற்குப் பிந்தைய மனச்சோர்வு மற்றும் பிசிஓஎஸ் பற்றிய எளிய மொழி விளக்கங்கள், படிக்க எளிது, நம்பவும் எளிது.", tags: ["எளிய மொழி", "எளிதில் பார்க்கலாம்", "சான்று அடிப்படை"] },
      { title: "மென்மையான வழிகாட்டுதல்", body: "நீங்கள் இருக்கும் இடத்திலேயே உங்களைச் சந்திக்கும் அமைதியான, படிப்படியான வழிகாட்டுதல், அழுத்தமும் தீர்ப்பும் இல்லாமல்.", tags: ["படிப்படியாக", "தீர்ப்பு இல்லாமல்", "உங்கள் வேகத்தில்"] },
      { title: "முன்கூட்டிய விழிப்புணர்வு", body: "அறிகுறிகளை விரைவில் அறிந்தால் உதவி கேட்பது எளிதாகும். எதைக் கவனிக்க வேண்டும், எப்போது செயல்பட வேண்டும் என்பதை அறியுங்கள்.", tags: ["அறிகுறிகளை அறியுங்கள்", "முன்கூட்டியே சிகிச்சை பெறுங்கள்", "குடும்பத்துடன் பகிருங்கள்"] },
      { title: "ஆதரவு வழிகள்", body: "மருத்துவர் அல்லது ஆலோசகரை எப்போது, எப்படி அணுகுவது, அன்பானவர்கள் எவ்வாறு உதவலாம் என்பதற்கான தெளிவான வழிகாட்டல்.", tags: ["எப்போது உதவி பெறுவது", "நிபுணரிடம் பேசுங்கள்", "குடும்பத்தை இணைக்கவும்"] }
    ],
    platEye: "தளம்", platH1: "ஒரே இடம்.", platH2: "அவளுக்குத் தேவையான அனைத்தும்.",
    platLead: "செக்-இன், தெளிவான விளக்கங்கள், அடுத்து எங்கு செல்வது என்பதை அறிய ஓர் அமைதியான இடம். இது ஒரு எடுத்துக்காட்டு முன்னோட்டம்.",
    lms: [
      { title: "தினசரி செக்-இன்", body: "நீங்கள் எப்படி உணர்கிறீர்கள் என்பதைக் கவனிக்கவும், வாரம் முழுவதும் போக்குகளைக் காணவும் ஒரு சிறிய, அன்பான வழி." },
      { title: "உங்கள் வேகத்தில் கற்றுக்கொள்ளுங்கள்", body: "பிபிடி, பிசிஓஎஸ் மற்றும் நலம் குறித்த சிறு வழிகாட்டிகள், நீங்கள் விரும்பும்போது தொடங்கி நிறுத்தலாம்." },
      { title: "எங்கு செல்வது என்பதை அறியுங்கள்", body: "மருத்துவர்கள், ஆலோசகர்கள் மற்றும் உங்களைச் சுற்றியுள்ளவர்களை அணுக எளிய குறிப்புகள்." }
    ],
    goodMorning: "காலை வணக்கம்", weekSample: "உங்கள் வாரம் (மாதிரி)",
    courses: ["பிரசவத்திற்குப் பிந்தைய மனச்சோர்வு என்றால் என்ன?", "பிசிஓஎஸ் புரிந்துகொள்ளுதல்", "தூக்கம், உணவு மற்றும் ஓய்வு"],
    turn: ["மருத்துவரிடம் பேசுங்கள்", "ஆலோசகரைத் தேடுங்கள்", "குடும்பத்தை இணைத்துக்கொள்ளுங்கள்"],
    demoEye: "நேரடி டெமோ", demoH1: "படிப்பதோடு நிற்காதீர்கள்.", demoH2: "மென்மையான செக்-இன் முயற்சியுங்கள்.",
    demoLead: "ஒவ்வொரு கேள்விக்கும் ஒரு பதிலைத் தேர்ந்தெடுத்து, ரன் அழுத்துங்கள். இது சிந்திக்க உதவும் ஒரு பிரதிபலிப்பு, நோயறிதல் அல்ல.",
    weeklyCheck: "வாராந்திர செக்-இன்", gentle: "மென்மை", dTabs: ["விளக்கம்", "ரன்கள்", "வழிகாட்டி"],
    howTitle: "இது எப்படி வேலை செய்கிறது",
    howP1: "தூக்கம், மனநிலை மற்றும் ஆதரவு குறித்த மூன்று சிறு கேள்விகளுக்குப் பதிலளியுங்கள். மென்மையான சுருக்கமும் அடுத்து செய்யக்கூடிய சில யோசனைகளும் காண ரன் அழுத்துங்கள்.",
    howP2: "சரி தவறு என எந்தப் பதிலும் இல்லை; இங்கு நீங்கள் தேர்ந்தெடுப்பது எதுவும் சேமிக்கப்படாது.",
    howSample: "மாதிரி: நன்றாகத் தூங்குவது, நல்ல மனநிலை, சாய்ந்துகொள்ள ஒருவர் இருப்பது நிலையான சுருக்கத்தைத் தரும்.",
    runsTitle: "இந்த வருகையில் உங்கள் ரன்கள்", runsEmpty: "இன்னும் ரன் இல்லை. செக்-இன் இயக்கினால், இந்த வருகையின் ஒவ்வொரு முயற்சியும் இங்கே தெரியும்.",
    dGuideTitle: "வழிகாட்டி",
    dGuideP1: "ஒரு நேரத்தில் ஒரு கேள்வியை எடுத்துக்கொள்ளுங்கள். ஒரு கேள்விக்குப் பதிலளிக்க கடினமாக இருந்தால், இந்த வாரத்தின் பெரும்பாலான நாட்களுக்கு நெருக்கமானதைத் தேர்ந்தெடுங்கள்.",
    dGuideP2: "நீங்கள் பாதுகாப்பற்றதாக உணர்ந்தால், அல்லது உங்களுக்கோ உங்கள் குழந்தைக்கோ தீங்கு செய்யும் எண்ணங்கள் வந்தால், உடனடியாக உள்ளூர் அவசர சேவைகளைத் தொடர்புகொள்ளுங்கள்.",
    reflection: "பிரதிபலிப்பு",
    quiz: [
      { q: "நீங்கள் எப்படித் தூங்குகிறீர்கள்?", o: ["பெரும்பாலும் நன்றாக", "அடிக்கடி தடைபடுகிறது", "கிட்டத்தட்ட இல்லை"] },
      { q: "பெரும்பாலான நாட்களில் உங்கள் மனநிலை எப்படி இருந்தது?", o: ["பெரும்பாலும் நன்றாக", "ஏற்ற இறக்கம்", "பெரும்பாலும் சோகமாக"] },
      { q: "சாய்ந்துகொள்ள உங்களுக்கு யாராவது இருக்கிறார்களா?", o: ["ஆம், எளிதாக", "சில நேரங்களில்", "உண்மையில் இல்லை"] }
    ],
    run: "ரன்", reset: "மீட்டமை", consoleLbl: "கன்சோல்",
    outReady: { title: "நீங்கள் தயாரானதும்", body: "மூன்று கேள்விகளுக்கும் பதிலளித்து, ரன் அழுத்துங்கள்." },
    outMore: { title: "இன்னும் ஒரு படி", body: "தயவுசெய்து மூன்று கேள்விகளுக்கும் பதிலைத் தேர்ந்தெடுத்து, ரன் அழுத்துங்கள்." },
    note: " இது ஒரு பிரதிபலிப்பு, நோயறிதல் அல்ல. நீங்கள் பாதுகாப்பற்றதாக உணர்ந்தால் அல்லது உங்களுக்கோ உங்கள் குழந்தைக்கோ தீங்கு செய்யும் எண்ணங்கள் வந்தால், உடனடியாக உள்ளூர் அவசர சேவைகளைத் தொடர்புகொள்ளுங்கள்.",
    outs: [
      { title: "தற்போது நிலையாக", body: "நிலைமை ஓரளவு நிலையாகத் தெரிகிறது. பலனளிப்பவற்றைத் தொடர்ந்து சார்ந்திருங்கள், விரும்பும்போது மீண்டும் செக்-இன் செய்யுங்கள்." },
      { title: "சற்று அழுத்தம்", body: "சில நேரங்களில் நிலைமை கனமாகத் தோன்றுகிறது. முடிந்த இடத்தில் ஓய்வெடுங்கள், நம்பிக்கையானவரிடம் பேசுங்கள், மருத்துவரிடமும் இதைக் குறிப்பிடுவதைப் பரிசீலியுங்கள்." },
      { title: "கூடுதல் ஆதரவு உதவலாம்", body: "உங்கள் பல பதில்கள் கடினமான காலகட்டத்தைக் காட்டுகின்றன. விரைவில் மருத்துவர் அல்லது ஆலோசகரிடம் பேசுவதைப் பரிசீலியுங்கள். இந்தச் சுமையை நீங்கள் தனியாகச் சுமக்க வேண்டியதில்லை." }
    ],
    assistTitle: "வழிகாட்டி உதவியாளர்", assistBody: "குழப்பமா? ஒரு நேரத்தில் ஒரு கேள்வியை எடுத்துக்கொள்ளுங்கள். தவறான பதில்கள் இல்லை.", dismiss: "வேண்டாம்", accept: "சரி",
    guidesEye: "விரைவு கண்ணோட்டம்", guidesH1: "எங்கள் கதை, பிபிடி, பிசிஓஎஸ்", guidesH2: "மற்றும் பராமரிப்பாளர் தொகுதிகள்.", guidesLead: "NurtureHer எப்படித் தொடங்கியது, பிபிடி மற்றும் பிசிஓஎஸ் என்றால் என்ன, குடும்பமும் பராமரிப்பாளர்களும் எவ்வாறு உதவலாம் என்பதற்கான விரைவு கண்ணோட்டம்.",
    guides: [
      { short: "எங்கள் கதை", title: "NurtureHer எப்படித் தொடங்கியது", tag: "01 · தொடக்கம்", summary: "NurtureHer ஒரு எளிய நம்பிக்கையிலிருந்து தொடங்கியது: ஒவ்வொரு பெண்ணுக்கும் தெளிவான, அன்பான, நம்பகமான சுகாதாரத் தகவல் கிடைக்க வேண்டும்; இரைச்சலில் தேட வேண்டியதில்லை, தீர்ப்புக்கு அஞ்ச வேண்டியதில்லை.", mods: ["நாங்கள் ஏன் தொடங்கினோம்", "நாங்கள் யாருக்காக", "நாங்கள் நம்புவது", "தகவலை எப்படி நம்பகமாக வைக்கிறோம்", "நாங்கள் எங்கே செல்கிறோம்", "எங்கள் அக்கறை உறுதி"] },
      { short: "பிரசவத்திற்குப் பிந்தைய மனச்சோர்வு", title: "பிரசவத்திற்குப் பிந்தைய மனச்சோர்வு (பிபிடி)", tag: "02 · பிபிடி", summary: "பேபி ப்ளூஸுக்கும் பிபிடிக்கும் உள்ள வேறுபாட்டைப் புரிந்துகொள்ளுங்கள், அறிகுறிகளை அடையாளம் காணுங்கள், எப்போது எப்படி உதவி கேட்பது என்பதை அறியுங்கள்.", mods: ["பேபி ப்ளூஸா அல்லது பிபிடியா?", "பொதுவான அறிகுறிகளும் உணர்வுகளும்", "எப்போது உதவி பெறுவது", "துணை மற்றும் குடும்ப ஆதரவு", "சிகிச்சை வழிகள்", "மென்மையான சுய பராமரிப்பு வழக்கங்கள்"] },
      { short: "பிசிஓஎஸ்", title: "பாலிசிஸ்டிக் ஓவரி சிண்ட்ரோம் (பிசிஓஎஸ்)", tag: "03 · பிசிஓஎஸ்", summary: "பிசிஓஎஸ் என்றால் என்ன, அது எப்படி வெளிப்படுகிறது, எப்படிக் கண்டறியப்படுகிறது, அதை நிர்வகிக்க உதவும் அன்றாட படிகள் ஆகியவற்றின் தெளிவான பார்வை.", mods: ["பிசிஓஎஸ் என்றால் என்ன?", "கவனிக்க வேண்டிய அறிகுறிகள்", "நோயறிதல் பெறுதல்", "உணவு, இயக்கம் மற்றும் தூக்கம்", "மாதவிடாயும் கருவுறுதலும்", "மன நலம்"] },
      { short: "பராமரிப்பாளர் தொகுதிகள்", title: "பராமரிப்பாளர் தொகுதிகள்", tag: "04 · பராமரிப்பாளர்", summary: "துணை, குடும்பம் மற்றும் நண்பர்களுக்கான சிறு தொகுதிகள்: எப்படிக் கேட்பது, அறிகுறிகளை எப்படி அறிவது, பொறுப்பைப் பகிர்வது, தொழில்முறை சிகிச்சையைக் கண்டறிய எப்போது உதவுவது.", mods: ["தீர்வு திணிக்காமல் கேட்பது", "ஆரம்ப அறிகுறிகளை அறிதல்", "வீட்டுப் பொறுப்பைப் பகிர்தல்", "ஓய்வுக்கும் தூக்கத்திற்கும் ஆதரவு", "உதவி பெறுவது பற்றிப் பேசுதல்", "உங்களையும் கவனித்துக்கொள்ளுதல்"] }
    ],
    exploreGuide: "இந்த வழிகாட்டியைப் பாருங்கள்", getSummary: "சுருக்கம் பெறுங்கள்",
    voicesEye: "சிறிது ஊக்கம்", voicesH1: "அருகில் வைத்துக்கொள்ள", voicesH2: "வேண்டிய வார்த்தைகள்.",
    voices: ["நல்ல தாயாக இருக்க நீங்கள் குறையற்றவராக இருக்க வேண்டியதில்லை.", "உதவி கேட்பது பலம், தோல்வி அல்ல.", "உங்கள் உடல் கடினமான ஒன்றைச் செய்கிறது. அதனிடம் மென்மையாக இருங்கள்.", "ஓய்வு குணமாதலின் ஒரு பகுதி, அதற்கான பரிசு அல்ல.", "உங்களுக்கான இடத்தை எடுத்துக்கொள்ளவும், உங்களைக் கவனித்துக்கொள்ளவும் உங்களுக்கு உரிமை உண்டு."],
    voiceNote: "NurtureHer-இடமிருந்து ஒரு குறிப்பு", noteWord: "குறிப்பு",
    faqEye: "கேள்வி-பதில்", faqH1: "கேள்விகள்,", faqH2: "பதில்கள்.",
    faq: [
      { label: "பொது", items: [
        { q: "அப்படியானால் NurtureHer என்றால் சரியாக என்ன?", a: "NurtureHer என்பது பெண்கள் நலம் குறித்த நம்பகமான தகவலுக்கும் ஆதரவுக்குமான மென்மையான, எளிதாகப் பயன்படுத்தக்கூடிய இடம்; பிரசவத்திற்குப் பிந்தைய மனச்சோர்வு மற்றும் பிசிஓஎஸ்-இலிருந்து தொடங்குகிறது." },
        { q: "இது மருத்துவரைப் பார்ப்பதற்கு மாற்றா?", a: "இல்லை. NurtureHer தகவலும் ஆதரவும் தருகிறது, ஆனால் எந்த நிலையையும் கண்டறியவோ சிகிச்சையளிக்கவோ முடியாது. உங்கள் ஆரோக்கியம் குறித்து தகுதிவாய்ந்த சுகாதார நிபுணரிடம் பேசுங்கள்." },
        { q: "NurtureHer யாருக்காக?", a: "பிபிடி, பிசிஓஎஸ் மற்றும் அன்றாட நலம் குறித்து தெளிவான, அன்பான தகவல் விரும்பும் அனைவருக்கும்: புதிய தாய்மார்கள், அறிகுறிகள் உள்ள பெண்கள், அவர்களுக்குத் துணையாக இருக்கும் குடும்பம்." }
      ] },
      { label: "பிபிடி", items: [
        { q: "பிபிடி பேபி ப்ளூஸிலிருந்து எப்படி வேறுபடுகிறது?", a: "பேபி ப்ளூஸ் பொதுவானது; பொதுவாக பிறந்த சில நாட்களில் தொடங்கி சுமார் இரண்டு வாரங்களில் குறையும். பிபிடி நீண்ட காலம் நீடிக்கும், தீவிரமாக உணரப்படும், அன்றாட வாழ்க்கையைப் பாதிக்கும்." },
        { q: "நான் எப்போது உதவி கேட்க வேண்டும்?", a: "மனச்சோர்வு, பதற்றம் அல்லது சோர்வு இரண்டு வாரங்களுக்கு மேல் நீடித்தால், அல்லது உங்களையோ குழந்தையையோ கவனிப்பது கடினமாக இருந்தால், மருத்துவரிடம் பேசுங்கள். உங்களுக்கோ குழந்தைக்கோ தீங்கு செய்யும் எண்ணங்கள் இருந்தால், உடனடியாக அவசர உதவியை நாடுங்கள்." },
        { q: "பிபிடிக்குச் சிகிச்சை அளிக்க முடியுமா?", a: "ஆம். பிபிடி குணப்படுத்தக்கூடியது; ஆலோசனை, குடும்ப உதவி, சில சமயம் மருத்துவர் பரிந்துரைக்கும் மருந்து ஆகியவை உண்மையான மாற்றத்தைத் தரும்." }
      ] },
      { label: "பிசிஓஎஸ்", items: [
        { q: "பிசிஓஎஸ்-இன் பொதுவான அறிகுறிகள் என்ன?", a: "ஒழுங்கற்ற அல்லது தவறிய மாதவிடாய், முகப்பரு, முகம் அல்லது உடலில் அதிக முடி, தலைமுடி மெலிதல், எடை மாற்றங்கள் பொதுவானவை. அறிகுறிகள் ஒவ்வொருவருக்கும் மாறுபடும்." },
        { q: "பிசிஓஎஸ் எப்படிக் கண்டறியப்படுகிறது?", a: "மருத்துவர் பொதுவாக உங்கள் வரலாறு மற்றும் அறிகுறிகளை ஆராய்ந்து, உடல் பரிசோதனை, இரத்தப் பரிசோதனை, அல்ட்ராசவுண்ட் ஆகியவற்றைப் பரிந்துரைக்கலாம்." },
        { q: "பிசிஓஎஸ்-ஐ நிர்வகிக்க முடியுமா?", a: "ஆம். பலர் வாழ்க்கைமுறை மாற்றங்களாலும், தேவையானபோது மருத்துவர் வழிகாட்டும் சிகிச்சையாலும் பிசிஓஎஸ்-ஐ நிர்வகிக்கிறார்கள். முன்கூட்டிய பராமரிப்பு உதவும்." }
      ] }
    ],
    ctaH1: "முதல் அடி எடுத்துவைக்க", ctaH2: "தயாரா?", ctaLead: "NurtureHer-இல் இணைந்து, அவளது ஆரோக்கியத்தின் ஒவ்வொரு கட்டத்திற்கும் அமைதியான, நம்பகமான வழிகாட்டுதலைப் பெறுங்கள்.", talkUs: "எங்களிடம் பேசுங்கள்",
    footTag: "பிரசவத்திற்குப் பிந்தைய மனச்சோர்வு, பிசிஓஎஸ் மற்றும் அன்றாட நலம் குறித்த மென்மையான, நம்பகமான வழிகாட்டுதல்.", explore: "ஆராயுங்கள்", account: "கணக்கு", contact: "தொடர்பு",
    ph: ["[மின்னஞ்சல் முகவரி]", "[தொலைபேசி எண்]", "[நகரம், மாநிலம்]"],
    copy: "© 2026 NurtureHer. இந்தத் தளம் பொதுவான தகவல்களைத் தருகிறது; தொழில்முறை மருத்துவ ஆலோசனைக்கு மாற்றன்று.",
    letterEye: "உங்களுக்கான ஒரு கடிதம்", letterTitle: "அன்புள்ள அம்மாவுக்கு,",
    letterP: "நீங்கள் இங்கே இருப்பதில் நாங்கள் மிகவும் மகிழ்கிறோம். இந்தக் காலம் உங்களுக்கு எப்படி இருந்தாலும், மகிழ்ச்சியாக, கனமாக அல்லது இடையில் எங்கோ, நீங்கள் அக்கறை, ஓய்வு, அன்புக்கு உரியவர்.",
    rApproach: "அணுகுமுறை", rApproachV: "மென்மையான படிகள்", rGuidance: "வழிகாட்டுதல்", rGuidanceV: "நம்பகமான தகவல்", rStatus: "நிலை", rStatusV: "நீங்கள் தனியாக இல்லை",
    closeBtn: "மூடு", closeAria: "மூடு",
    thanks: "நன்றி.", thanksP: "இது ஒரு வடிவமைப்பு முன்னோட்டம், எனவே எதுவும் அனுப்பப்படவில்லை. உண்மையான தளத்தில், இங்கே உறுதிப்படுத்தி உங்களைத் தொடர்புகொள்வோம்.",
    formTalk: "பேசிப் பார்ப்போம்", formSum: "சுருக்க வழிகாட்டியைப் பெறுங்கள்",
    subTalk: "உங்களைப் பற்றியும், நாங்கள் உங்களை எப்படித் தொடர்புகொள்ள வேண்டும் என்பதையும் சிறிது சொல்லுங்கள்.", subSum: "உங்கள் விவரங்களைத் தாருங்கள்; இந்த வழிகாட்டியின் சிறு சுருக்கத்தை அனுப்புவோம்.",
    btnTalk: "இணைவோம்", btnSum: "சுருக்கத்தை அனுப்புங்கள்",
    fullName: "முழுப் பெயர்", namePh: "உங்கள் பெயர்", email: "மின்னஞ்சல்", phone: "தொலைபேசி எண்", optional: "விருப்பத்திற்குரியது", prefContact: "விருப்பமான தொடர்பு முறை",
    prefOpts: ["மின்னஞ்சல்", "தொலைபேசி அழைப்பு", "செய்தி"]
  },
  te: {
    code: "తెలుగు", themeLabel: "డార్క్ లేదా లైట్ మోడ్ మార్చండి", langLabel: "భాష మార్చండి",
    login: "లాగిన్", register: "నమోదు", menu: "మెనూ", menuOpen: "మెనూ తెరవండి", menuClose: "మెనూ మూసివేయండి", closeWord: "మూసివేయి",
    navWhy: "NurtureHer ఎందుకు", navPlat: "వేదిక", navGuides: "అవలోకనం", navFaq: "ప్రశ్నలు-జవాబులు",
    mWhy: "NurtureHer ఎందుకు", mPlat: "వేదిక", mDemo: "చెక్-ఇన్ ప్రయత్నించండి", mGuides: "శీఘ్ర అవలోకనం", mFaq: "ప్రశ్నలు-జవాబులు",
    pill: "మహిళల ఆరోగ్యం · పిపిడి · పిసిఓఎస్",
    exploreDemo: "డెమోను అన్వేషించండి",
    winCheck: "చెక్-ఇన్ యాప్", winNote: "రోజువారీ నోట్", winGuides: "అవలోకనం", previewWord: "ప్రివ్యూ", minAria: "చిన్నది చేయి", closeWinAria: "విండో మూసివేయి",
    heroWords: ["ఆమెతో", "ఎప్పుడూ", "ఉండే", "ఆసరా."], heroGrad: 1,
    heroLead: "NurtureHer ప్రసవానంతర డిప్రెషన్, పిసిఓఎస్ మరియు రోజువారీ శ్రేయస్సుపై సున్నితమైన, నమ్మదగిన మార్గదర్శనం అందిస్తుంది, ఏ స్త్రీ అయినా అన్నింటినీ ఒంటరిగా ఎదుర్కోవాల్సిన అవసరం లేదు.",
    getStarted: "ప్రారంభించండి", openLetter: "మీ లేఖను తెరవండి",
    feel: "ఈ రోజు మీకు ఎలా అనిపిస్తోంది?", moodPrompt: "సున్నితమైన సందేశం చూడటానికి ఒక మానసిక స్థితిని ఎంచుకోండి.",
    moods: [
      { label: "ప్రశాంతం", reply: "చాలా బాగుంది. ఈ రోజు ఏది సహాయపడిందో గమనించి, దాన్ని ఇంకొంచెం చేయండి." },
      { label: "అలసట", reply: "అది చాలా సహజం. వీలైన చోట విశ్రాంతి తీసుకోండి, అవసరమైతే సహాయం అడగండి." },
      { label: "ఆందోళన", reply: "నెమ్మదిగా ఒక శ్వాస తీసుకోండి. నమ్మకమైన వారితో మాట్లాడితే భారం తగ్గవచ్చు." },
      { label: "నీరసం", reply: "చెప్పినందుకు ధన్యవాదాలు. ఇది కొనసాగితే, దయచేసి వైద్యులు లేదా కౌన్సెలర్‌తో మాట్లాడండి." },
      { label: "ఆనందం", reply: "అద్భుతం. ఈ భావనను నిలుపుకొని, ఎవరితోనైనా పంచుకోండి." }
    ],
    todayWill: "ఈ రోజు నేను…", tw: ["కనీసం పది నిమిషాలైనా విశ్రాంతి తీసుకుంటాను", "నీళ్లు తాగుతాను", "ఈ రోజు ఎవరినైనా సహాయం అడుగుతాను"],
    statusSup: "స్థితి: ఆసరా లభించింది", topics6: "6 అంశాలు", resetWins: "విండోలను రీసెట్ చేయండి",
    marqEye: "మేము ఏమి కవర్ చేస్తాము", marqH1: "ముఖ్యమైనదంతా", marqH2: "కలుపుకునే సంరక్షణ.",
    marqA: ["ప్రసవానంతర డిప్రెషన్", "పిసిఓఎస్", "రుతుచక్ర ఆరోగ్యం", "నిద్ర మరియు విశ్రాంతి", "పోషణ", "మైండ్‌ఫుల్‌నెస్", "కుటుంబ మద్దతు", "ముందస్తు అవగాహన"],
    marqB: ["సున్నితమైన మార్గదర్శనం", "నమ్మదగిన సమాచారం", "తీర్పులు లేకుండా", "మీ వేగంలో", "లక్షణాలు తెలుసుకోండి", "వైద్యునితో మాట్లాడండి", "మీరు ఒంటరి కాదు", "స్వీయ సంరక్షణ"],
    whyEye: "NurtureHer ఎందుకు", whyH1: "సున్నితంగా అనిపించే సంరక్షణ,", whyH2: "క్లినికల్ కాదు.",
    why: [
      { title: "నమ్మదగిన సమాచారం", body: "ప్రసవానంతర డిప్రెషన్ మరియు పిసిఓఎస్ గురించి సులభ భాషలో వివరణలు, చదవడానికి సులభం, నమ్మడానికి సులభం.", tags: ["సులభ భాష", "త్వరగా చూడవచ్చు", "ఆధారాల ఆధారిత"] },
      { title: "సున్నితమైన మార్గదర్శనం", body: "మీరు ఉన్న చోటే మిమ్మల్ని కలిసే ప్రశాంతమైన, దశలవారీ మార్గదర్శనం, ఒత్తిడి మరియు తీర్పు లేకుండా.", tags: ["దశలవారీగా", "తీర్పులు లేకుండా", "మీ వేగంలో"] },
      { title: "ముందస్తు అవగాహన", body: "లక్షణాలను త్వరగా తెలుసుకుంటే సహాయం అడగడం సులభమవుతుంది. ఏమి గమనించాలో, ఎప్పుడు చర్య తీసుకోవాలో తెలుసుకోండి.", tags: ["లక్షణాలు తెలుసుకోండి", "ముందే చికిత్స పొందండి", "కుటుంబంతో పంచుకోండి"] },
      { title: "మద్దతు మార్గాలు", body: "వైద్యులు లేదా కౌన్సెలర్‌ను ఎప్పుడు, ఎలా సంప్రదించాలో, ఆత్మీయులు ఎలా సహాయపడగలరో స్పష్టమైన సూచనలు.", tags: ["ఎప్పుడు సహాయం పొందాలి", "నిపుణునితో మాట్లాడండి", "కుటుంబాన్ని చేర్చండి"] }
    ],
    platEye: "వేదిక", platH1: "ఒకే చోటు.", platH2: "ఆమెకు కావలసినదంతా.",
    platLead: "చెక్-ఇన్‌లు, స్పష్టమైన వివరణలు, తర్వాత ఎక్కడికి వెళ్లాలో తెలుసుకోవడానికి ప్రశాంతమైన స్థలం. ఇది ఒక ఉదాహరణ ప్రివ్యూ.",
    lms: [
      { title: "రోజువారీ చెక్-ఇన్", body: "మీకు ఎలా అనిపిస్తోందో గమనించడానికి, వారం పొడవునా ధోరణులు గుర్తించడానికి ఒక చిన్న, దయగల మార్గం." },
      { title: "మీ వేగంలో నేర్చుకోండి", body: "పిపిడి, పిసిఓఎస్ మరియు శ్రేయస్సుపై చిన్న గైడ్‌లు, మీకు నచ్చినప్పుడు మొదలుపెట్టి ఆపవచ్చు." },
      { title: "ఎక్కడికి వెళ్లాలో తెలుసుకోండి", body: "వైద్యులు, కౌన్సెలర్లు, మీ చుట్టూ ఉన్నవారిని చేరుకోవడానికి సులభమైన సూచనలు." }
    ],
    goodMorning: "శుభోదయం", weekSample: "మీ వారం (నమూనా)",
    courses: ["ప్రసవానంతర డిప్రెషన్ అంటే ఏమిటి?", "పిసిఓఎస్‌ను అర్థం చేసుకోవడం", "నిద్ర, ఆహారం మరియు విశ్రాంతి"],
    turn: ["వైద్యునితో మాట్లాడండి", "కౌన్సెలర్‌ను కనుగొనండి", "కుటుంబాన్ని చేర్చుకోండి"],
    demoEye: "లైవ్ డెమో", demoH1: "కేవలం చదవకండి.", demoH2: "సున్నితమైన చెక్-ఇన్ ప్రయత్నించండి.",
    demoLead: "ప్రతి ప్రశ్నకు ఒక సమాధానం ఎంచుకుని, రన్ నొక్కండి. ఇది ఆలోచించడానికి సహాయపడే ప్రతిబింబం, రోగనిర్ధారణ కాదు.",
    weeklyCheck: "వారపు చెక్-ఇన్", gentle: "సున్నితం", dTabs: ["వివరణ", "రన్‌లు", "గైడ్"],
    howTitle: "ఇది ఎలా పనిచేస్తుంది",
    howP1: "నిద్ర, మానసిక స్థితి, మద్దతు గురించి మూడు చిన్న ప్రశ్నలకు సమాధానమివ్వండి. సున్నితమైన సారాంశం మరియు తర్వాత చేయదగిన కొన్ని ఆలోచనల కోసం రన్ నొక్కండి.",
    howP2: "సరైన లేదా తప్పు సమాధానాలు లేవు, ఇక్కడ మీరు ఎంచుకునేదేదీ సేవ్ చేయబడదు.",
    howSample: "నమూనా: బాగా నిద్రపోవడం, మంచి మూడ్, ఆధారపడటానికి ఒకరు ఉండటం స్థిరమైన సారాంశాన్ని ఇస్తుంది.",
    runsTitle: "ఈ సందర్శనలో మీ రన్‌లు", runsEmpty: "ఇంకా రన్‌లు లేవు. చెక్-ఇన్ నడపండి, ఈ సందర్శనలోని ప్రతి ప్రయత్నం ఇక్కడ కనిపిస్తుంది.",
    dGuideTitle: "గైడ్",
    dGuideP1: "ఒకసారి ఒక ప్రశ్న తీసుకోండి. ఏదైనా ప్రశ్నకు సమాధానం చెప్పడం కష్టంగా ఉంటే, ఈ వారం చాలా రోజులకు దగ్గరగా ఉన్నదాన్ని ఎంచుకోండి.",
    dGuideP2: "మీరు ఎప్పుడైనా అసురక్షితంగా భావిస్తే, లేదా మీకు లేదా మీ బిడ్డకు హాని చేసే ఆలోచనలు వస్తే, వెంటనే స్థానిక అత్యవసర సేవలను సంప్రదించండి.",
    reflection: "ప్రతిబింబం",
    quiz: [
      { q: "మీ నిద్ర ఎలా ఉంది?", o: ["ఎక్కువగా బాగుంది", "తరచూ భంగమవుతుంది", "దాదాపు లేదు"] },
      { q: "చాలా రోజులు మీ మానసిక స్థితి ఎలా ఉంది?", o: ["ఎక్కువగా బాగుంది", "ఎత్తుపల్లాలు", "ఎక్కువగా నీరసం"] },
      { q: "ఆధారపడటానికి మీకు ఎవరైనా ఉన్నారా?", o: ["అవును, సులభంగా", "కొన్నిసార్లు", "నిజంగా లేదు"] }
    ],
    run: "రన్", reset: "రీసెట్", consoleLbl: "కన్సోల్",
    outReady: { title: "మీరు సిద్ధమైనప్పుడు", body: "మూడు ప్రశ్నలకు సమాధానమిచ్చి, రన్ నొక్కండి." },
    outMore: { title: "ఇంకొక అడుగు", body: "దయచేసి మూడు ప్రశ్నలకూ సమాధానం ఎంచుకుని, రన్ నొక్కండి." },
    note: " ఇది ప్రతిబింబం మాత్రమే, రోగనిర్ధారణ కాదు. మీరు ఎప్పుడైనా అసురక్షితంగా భావిస్తే లేదా మీకు లేదా మీ బిడ్డకు హాని చేసే ఆలోచనలు వస్తే, వెంటనే స్థానిక అత్యవసర సేవలను సంప్రదించండి.",
    outs: [
      { title: "ప్రస్తుతానికి స్థిరం", body: "పరిస్థితి చాలా వరకు స్థిరంగా అనిపిస్తోంది. పనిచేస్తున్న వాటిపై ఆధారపడుతూ ఉండండి, కావాలనుకున్నప్పుడు మళ్లీ చెక్-ఇన్ చేయండి." },
      { title: "కొంత ఒత్తిడి", body: "కొన్నిసార్లు పరిస్థితి భారంగా అనిపిస్తున్నట్లుంది. వీలైన చోట విశ్రాంతి తీసుకోండి, నమ్మకమైనవారితో మాట్లాడండి, వైద్యునికి కూడా చెప్పడం పరిగణించండి." },
      { title: "అదనపు మద్దతు సహాయపడవచ్చు", body: "మీ చాలా సమాధానాలు కష్టకాలాన్ని సూచిస్తున్నాయి. దయచేసి త్వరలో వైద్యులు లేదా కౌన్సెలర్‌తో మాట్లాడడం పరిగణించండి. ఈ భారాన్ని మీరు ఒంటరిగా మోయాల్సిన అవసరం లేదు." }
    ],
    assistTitle: "గైడ్ అసిస్టెంట్", assistBody: "ఇరుక్కుపోయారా? ఒకసారి ఒక ప్రశ్న తీసుకోండి. తప్పు సమాధానాలు లేవు.", dismiss: "వద్దు", accept: "సరే",
    guidesEye: "శీఘ్ర అవలోకనం", guidesH1: "మా కథ, పిపిడి, పిసిఓఎస్", guidesH2: "మరియు సంరక్షకుల మాడ్యూల్స్.", guidesLead: "NurtureHer ఎలా మొదలైంది, పిపిడి మరియు పిసిఓఎస్ అంటే ఏమిటి, కుటుంబం మరియు సంరక్షకులు ఎలా సహాయపడగలరు అనే శీఘ్ర అవలోకనం.",
    guides: [
      { short: "మా కథ", title: "NurtureHer ఎలా మొదలైంది", tag: "01 · ఆరంభం", summary: "NurtureHer ఒక సరళమైన నమ్మకంతో మొదలైంది: ప్రతి స్త్రీకి స్పష్టమైన, దయగల, నమ్మదగిన ఆరోగ్య సమాచారం అందాలి; గందరగోళంలో వెతకనవసరం లేదు, తీర్పుకు భయపడనవసరం లేదు.", mods: ["మేము ఎందుకు మొదలుపెట్టాము", "మేము ఎవరి కోసం", "మేము నమ్మేది", "సమాచారాన్ని నమ్మదగినదిగా ఎలా ఉంచుతాము", "మేము ఎటు సాగుతున్నాము", "మా సంరక్షణ హామీ"] },
      { short: "ప్రసవానంతర డిప్రెషన్", title: "ప్రసవానంతర డిప్రెషన్ (పిపిడి)", tag: "02 · పిపిడి", summary: "బేబీ బ్లూస్ మరియు పిపిడి మధ్య తేడా అర్థం చేసుకోండి, లక్షణాలను గుర్తించండి, సహాయం ఎప్పుడు ఎలా అడగాలో తెలుసుకోండి.", mods: ["బేబీ బ్లూస్ లేదా పిపిడి?", "సాధారణ లక్షణాలు మరియు భావాలు", "ఎప్పుడు సహాయం పొందాలి", "భాగస్వామి మరియు కుటుంబ మద్దతు", "చికిత్స ఎంపికలు", "సున్నితమైన స్వీయ సంరక్షణ అలవాట్లు"] },
      { short: "పిసిఓఎస్", title: "పాలిసిస్టిక్ ఓవరీ సిండ్రోమ్ (పిసిఓఎస్)", tag: "03 · పిసిఓఎస్", summary: "పిసిఓఎస్ అంటే ఏమిటి, ఎలా కనిపిస్తుంది, ఎలా నిర్ధారిస్తారు, దాన్ని నిర్వహించడంలో సహాయపడే రోజువారీ చర్యలపై స్పష్టమైన పరిశీలన.", mods: ["పిసిఓఎస్ అంటే ఏమిటి?", "గమనించవలసిన లక్షణాలు", "నిర్ధారణ పొందడం", "ఆహారం, కదలిక మరియు నిద్ర", "నెలసరి మరియు సంతానోత్పత్తి", "భావోద్వేగ శ్రేయస్సు"] },
      { short: "సంరక్షకుల మాడ్యూల్స్", title: "సంరక్షకుల మాడ్యూల్స్", tag: "04 · సంరక్షకులు", summary: "భాగస్వామి, కుటుంబం, స్నేహితుల కోసం చిన్న మాడ్యూల్స్: ఎలా వినాలి, లక్షణాలను ఎలా గుర్తించాలి, బాధ్యతను ఎలా పంచుకోవాలి, వృత్తిపరమైన సంరక్షణ పొందడంలో ఎప్పుడు సహాయపడాలి.", mods: ["పరిష్కారం రుద్దకుండా వినడం", "ముందస్తు లక్షణాలను గుర్తించడం", "ఇంటి బాధ్యత పంచుకోవడం", "విశ్రాంతి, నిద్రకు మద్దతు", "సహాయం పొందడం గురించి మాట్లాడటం", "మిమ్మల్ని కూడా చూసుకోవడం"] }
    ],
    exploreGuide: "ఈ గైడ్ చూడండి", getSummary: "సారాంశం పొందండి",
    voicesEye: "కొంచెం ప్రోత్సాహం", voicesH1: "దగ్గరగా ఉంచుకోదగిన", voicesH2: "మాటలు.",
    voices: ["మంచి తల్లిగా ఉండటానికి మీరు పరిపూర్ణంగా ఉండాల్సిన అవసరం లేదు.", "సహాయం అడగడం బలం, వైఫల్యం కాదు.", "మీ శరీరం కష్టమైనది చేస్తోంది. దానితో సున్నితంగా ఉండండి.", "విశ్రాంతి కోలుకోవడంలో భాగం, దానికి బహుమతి కాదు.", "మీ స్థానాన్ని తీసుకోవడానికి, మిమ్మల్ని మీరు చూసుకోవడానికి మీకు అనుమతి ఉంది."],
    voiceNote: "NurtureHer నుండి ఒక సందేశం", noteWord: "సందేశం",
    faqEye: "ప్రశ్నలు-జవాబులు", faqH1: "ప్రశ్నలు,", faqH2: "జవాబులు.",
    faq: [
      { label: "సాధారణం", items: [
        { q: "అసలు NurtureHer అంటే ఏమిటి?", a: "NurtureHer అనేది మహిళల ఆరోగ్యంపై నమ్మదగిన సమాచారం, మద్దతు కోసం సున్నితమైన, సులభంగా వాడగల వేదిక; ప్రసవానంతర డిప్రెషన్ మరియు పిసిఓఎస్‌తో ప్రారంభం." },
        { q: "ఇది వైద్యుణ్ణి కలవడానికి ప్రత్యామ్నాయమా?", a: "కాదు. NurtureHer సమాచారం, మద్దతు ఇస్తుంది, కానీ ఏ స్థితినీ నిర్ధారించలేదు, చికిత్స చేయలేదు. మీ ఆరోగ్యం గురించి అర్హత కలిగిన ఆరోగ్య నిపుణునితో మాట్లాడండి." },
        { q: "NurtureHer ఎవరి కోసం?", a: "పిపిడి, పిసిఓఎస్, రోజువారీ శ్రేయస్సుపై స్పష్టమైన, దయగల సమాచారం కోరే ప్రతి ఒక్కరికీ: కొత్త తల్లులు, లక్షణాలున్న మహిళలు, వారికి తోడుగా నిలిచే కుటుంబం." }
      ] },
      { label: "పిపిడి", items: [
        { q: "పిపిడి బేబీ బ్లూస్ నుండి ఎలా భిన్నం?", a: "బేబీ బ్లూస్ సాధారణం; సాధారణంగా ప్రసవమైన కొన్ని రోజుల్లో మొదలై సుమారు రెండు వారాల్లో తగ్గుతుంది. పిపిడి ఎక్కువ కాలం ఉంటుంది, తీవ్రంగా అనిపిస్తుంది, రోజువారీ జీవితానికి ఆటంకం కలిగించవచ్చు." },
        { q: "నేను సహాయం కోసం ఎప్పుడు సంప్రదించాలి?", a: "నీరసం, ఆందోళన లేదా అలసట రెండు వారాల కంటే ఎక్కువ ఉంటే, లేదా మిమ్మల్ని లేదా బిడ్డను చూసుకోవడం కష్టమైతే, వైద్యునితో మాట్లాడండి. మీకు లేదా మీ బిడ్డకు హాని చేసే ఆలోచనలు ఉంటే వెంటనే అత్యవసర సహాయం పొందండి." },
        { q: "పిపిడికి చికిత్స సాధ్యమేనా?", a: "అవును. పిపిడికి చికిత్స ఉంది; కౌన్సెలింగ్, కుటుంబ సహాయం, కొన్నిసార్లు వైద్యుడు సూచించిన మందులు నిజమైన మార్పు తేగలవు." }
      ] },
      { label: "పిసిఓఎస్", items: [
        { q: "పిసిఓఎస్ సాధారణ లక్షణాలు ఏమిటి?", a: "క్రమరహిత లేదా తప్పిన నెలసరి, మొటిమలు, ముఖం లేదా శరీరంపై అధిక రోమాలు, తలవెంట్రుకలు పల్చబడటం, బరువులో మార్పులు సాధారణం. లక్షణాలు ఒక్కొక్కరికి వేరుగా ఉంటాయి." },
        { q: "పిసిఓఎస్‌ను ఎలా నిర్ధారిస్తారు?", a: "వైద్యులు సాధారణంగా మీ చరిత్ర, లక్షణాలను సమీక్షించి, శారీరక పరీక్ష, రక్త పరీక్షలు, అల్ట్రాసౌండ్ సూచించవచ్చు." },
        { q: "పిసిఓఎస్‌ను నిర్వహించవచ్చా?", a: "అవును. చాలామంది జీవనశైలి మార్పులతో, అవసరమైతే వైద్యుల మార్గదర్శక చికిత్సతో పిసిఓఎస్‌ను నిర్వహిస్తారు. ముందస్తు సంరక్షణ సహాయపడుతుంది." }
      ] }
    ],
    ctaH1: "మొదటి అడుగు వేయడానికి", ctaH2: "సిద్ధమా?", ctaLead: "NurtureHerలో చేరి, ఆమె ఆరోగ్యంలోని ప్రతి దశకూ ప్రశాంతమైన, నమ్మదగిన మార్గదర్శనం పొందండి.", talkUs: "మాతో మాట్లాడండి",
    footTag: "ప్రసవానంతర డిప్రెషన్, పిసిఓఎస్ మరియు రోజువారీ శ్రేయస్సుపై సున్నితమైన, నమ్మదగిన మార్గదర్శనం.", explore: "అన్వేషించండి", account: "ఖాతా", contact: "సంప్రదింపు",
    ph: ["[ఇమెయిల్ చిరునామా]", "[ఫోన్ నంబర్]", "[నగరం, రాష్ట్రం]"],
    copy: "© 2026 NurtureHer. ఈ సైట్ సాధారణ సమాచారాన్ని అందిస్తుంది, వృత్తిపరమైన వైద్య సలహాకు ప్రత్యామ్నాయం కాదు.",
    letterEye: "మీ కోసం ఒక లేఖ", letterTitle: "ప్రియమైన అమ్మకు,",
    letterP: "మీరు ఇక్కడ ఉండటం మాకు చాలా సంతోషం. ఈ కాలం మీకు ఎలా ఉన్నా, ఆనందంగా, భారంగా లేదా మధ్యలో ఎక్కడో, మీరు శ్రద్ధ, విశ్రాంతి, దయకు అర్హులు.",
    rApproach: "విధానం", rApproachV: "సున్నితమైన అడుగులు", rGuidance: "మార్గదర్శనం", rGuidanceV: "నమ్మదగిన సమాచారం", rStatus: "స్థితి", rStatusV: "మీరు ఒంటరి కాదు",
    closeBtn: "మూసివేయి", closeAria: "మూసివేయి",
    thanks: "ధన్యవాదాలు.", thanksP: "ఇది డిజైన్ ప్రివ్యూ, కాబట్టి ఏదీ పంపబడలేదు. అసలు సైట్‌లో, ఇక్కడ మేము నిర్ధారించి మిమ్మల్ని సంప్రదిస్తాము.",
    formTalk: "మాట్లాడుకుందాం", formSum: "సారాంశ గైడ్ పొందండి",
    subTalk: "మీ గురించి కొంచెం చెప్పండి, మేము మిమ్మల్ని ఎలా సంప్రదించాలో తెలపండి.", subSum: "మీ వివరాలు ఇవ్వండి, ఈ గైడ్ చిన్న సారాంశాన్ని పంపుతాము.",
    btnTalk: "కనెక్ట్ అవుదాం", btnSum: "సారాంశం పంపండి",
    fullName: "పూర్తి పేరు", namePh: "మీ పేరు", email: "ఇమెయిల్", phone: "ఫోన్ నంబర్", optional: "ఐచ్ఛికం", prefContact: "ఇష్టమైన సంప్రదింపు విధానం",
    prefOpts: ["ఇమెయిల్", "ఫోన్ కాల్", "సందేశం"]
  },
  ml: {
    code: "മലയാളം", themeLabel: "ഡാർക്ക് അല്ലെങ്കിൽ ലൈറ്റ് മോഡ് മാറ്റുക", langLabel: "ഭാഷ മാറ്റുക",
    login: "ലോഗിൻ", register: "രജിസ്റ്റർ", menu: "മെനു", menuOpen: "മെനു തുറക്കുക", menuClose: "മെനു അടയ്ക്കുക", closeWord: "അടയ്ക്കുക",
    navWhy: "NurtureHer എന്തുകൊണ്ട്", navPlat: "പ്ലാറ്റ്‌ഫോം", navGuides: "അവലോകനം", navFaq: "ചോദ്യോത്തരം",
    mWhy: "NurtureHer എന്തുകൊണ്ട്", mPlat: "പ്ലാറ്റ്‌ഫോം", mDemo: "ചെക്ക്-ഇൻ പരീക്ഷിക്കൂ", mGuides: "ചുരുക്ക അവലോകനം", mFaq: "ചോദ്യോത്തരം",
    pill: "സ്ത്രീ ആരോഗ്യം · പിപിഡി · പിസിഒഎസ്",
    exploreDemo: "ഡെമോ പരിശോധിക്കുക",
    winCheck: "ചെക്ക്-ഇൻ ആപ്പ്", winNote: "ദിനക്കുറിപ്പ്", winGuides: "അവലോകനം", previewWord: "പ്രിവ്യൂ", minAria: "ചെറുതാക്കുക", closeWinAria: "വിൻഡോ അടയ്ക്കുക",
    heroWords: ["അവളോടൊപ്പം", "എപ്പോഴും", "നിൽക്കുന്ന", "പിന്തുണ."], heroGrad: 1,
    heroLead: "NurtureHer, പ്രസവാനന്തര വിഷാദം, പിസിഒഎസ്, ദൈനംദിന ക്ഷേമം എന്നിവയെക്കുറിച്ച് സൗമ്യവും വിശ്വസനീയവുമായ മാർഗനിർദേശം നൽകുന്നു, ഒരു സ്ത്രീയും എല്ലാം ഒറ്റയ്ക്ക് നേരിടേണ്ടതില്ല.",
    getStarted: "തുടങ്ങാം", openLetter: "നിങ്ങളുടെ കത്ത് തുറക്കുക",
    feel: "ഇന്ന് നിങ്ങൾക്ക് എങ്ങനെ തോന്നുന്നു?", moodPrompt: "സൗമ്യമായ കുറിപ്പ് കാണാൻ ഒരു മാനസികാവസ്ഥ തിരഞ്ഞെടുക്കൂ.",
    moods: [
      { label: "ശാന്തം", reply: "മനോഹരം. ഇന്ന് എന്താണ് സഹായിച്ചതെന്ന് ശ്രദ്ധിച്ച്, അത് കുറച്ചുകൂടി ചെയ്യൂ." },
      { label: "ക്ഷീണം", reply: "അത് തികച്ചും സ്വാഭാവികമാണ്. കഴിയുന്നിടത്ത് വിശ്രമിക്കൂ, ആവശ്യമെങ്കിൽ സഹായം ചോദിക്കൂ." },
      { label: "ആശങ്ക", reply: "പതുക്കെ ഒരു ശ്വാസമെടുക്കൂ. വിശ്വസ്തരോട് സംസാരിച്ചാൽ ഭാരം കുറയാം." },
      { label: "വിഷാദം", reply: "ഇത് പറഞ്ഞതിന് നന്ദി. ഇത് നീണ്ടുനിൽക്കുകയാണെങ്കിൽ, ദയവായി ഡോക്ടറോടോ കൗൺസിലറോടോ സംസാരിക്കൂ." },
      { label: "സന്തോഷം", reply: "അതിശയകരം. ഈ അനുഭൂതി മുറുകെ പിടിച്ച് ആരെങ്കിലുമായി പങ്കിടൂ." }
    ],
    todayWill: "ഇന്ന് ഞാൻ…", tw: ["പത്തു മിനിറ്റെങ്കിലും വിശ്രമിക്കും", "വെള്ളം കുടിക്കും", "ഇന്ന് ആരോടെങ്കിലും സഹായം ചോദിക്കും"],
    statusSup: "നില: പിന്തുണ ലഭിച്ചു", topics6: "6 വിഷയങ്ങൾ", resetWins: "വിൻഡോകൾ റീസെറ്റ് ചെയ്യുക",
    marqEye: "ഞങ്ങൾ ഉൾക്കൊള്ളുന്നത്", marqH1: "പ്രധാനമായതെല്ലാം", marqH2: "ഉൾക്കൊള്ളുന്ന കരുതൽ.",
    marqA: ["പ്രസവാനന്തര വിഷാദം", "പിസിഒഎസ്", "ആർത്തവചക്ര ആരോഗ്യം", "ഉറക്കവും വിശ്രമവും", "പോഷണം", "മൈൻഡ്‌ഫുൾനെസ്", "കുടുംബ പിന്തുണ", "നേരത്തെയുള്ള അവബോധം"],
    marqB: ["സൗമ്യമായ മാർഗനിർദേശം", "വിശ്വസനീയ വിവരങ്ങൾ", "വിധിക്കാതെ", "നിങ്ങളുടെ വേഗത്തിൽ", "ലക്ഷണങ്ങൾ അറിയൂ", "ഡോക്ടറോട് സംസാരിക്കൂ", "നിങ്ങൾ ഒറ്റയ്ക്കല്ല", "സ്വയം പരിചരണം"],
    whyEye: "NurtureHer എന്തുകൊണ്ട്", whyH1: "സൗമ്യമായി അനുഭവപ്പെടുന്ന കരുതൽ,", whyH2: "ക്ലിനിക്കൽ അല്ല.",
    why: [
      { title: "വിശ്വസനീയ വിവരങ്ങൾ", body: "പ്രസവാനന്തര വിഷാദത്തെയും പിസിഒഎസിനെയും കുറിച്ചുള്ള ലളിത ഭാഷയിലെ വിശദീകരണങ്ങൾ, വായിക്കാൻ എളുപ്പം, വിശ്വസിക്കാൻ എളുപ്പം.", tags: ["ലളിത ഭാഷ", "എളുപ്പത്തിൽ നോക്കാം", "തെളിവ് അടിസ്ഥാനം"] },
      { title: "സൗമ്യമായ മാർഗനിർദേശം", body: "നിങ്ങൾ ഉള്ളിടത്തുതന്നെ നിങ്ങളെ കാണുന്ന ശാന്തവും ഘട്ടം ഘട്ടവുമായ മാർഗനിർദേശം, സമ്മർദ്ദമോ വിധിയോ ഇല്ലാതെ.", tags: ["ഘട്ടം ഘട്ടമായി", "വിധിക്കാതെ", "നിങ്ങളുടെ വേഗത്തിൽ"] },
      { title: "നേരത്തെയുള്ള അവബോധം", body: "ലക്ഷണങ്ങൾ നേരത്തെ അറിയുന്നത് സഹായം ചോദിക്കുന്നത് എളുപ്പമാക്കുന്നു. എന്ത് ശ്രദ്ധിക്കണമെന്നും എപ്പോൾ പ്രവർത്തിക്കണമെന്നും അറിയൂ.", tags: ["ലക്ഷണങ്ങൾ അറിയൂ", "നേരത്തെ ചികിത്സ തേടൂ", "കുടുംബവുമായി പങ്കിടൂ"] },
      { title: "പിന്തുണയുടെ വഴികൾ", body: "ഡോക്ടറെയോ കൗൺസിലറെയോ എപ്പോൾ, എങ്ങനെ സമീപിക്കണം, പ്രിയപ്പെട്ടവർക്ക് എങ്ങനെ സഹായിക്കാം എന്നതിന്റെ വ്യക്തമായ സൂചനകൾ.", tags: ["എപ്പോൾ സഹായം തേടണം", "വിദഗ്ധരോട് സംസാരിക്കൂ", "കുടുംബത്തെ ഉൾപ്പെടുത്തൂ"] }
    ],
    platEye: "പ്ലാറ്റ്‌ഫോം", platH1: "ഒരൊറ്റ ഇടം.", platH2: "അവൾക്കു വേണ്ടതെല്ലാം.",
    platLead: "ചെക്ക്-ഇന്നുകൾക്കും വ്യക്തമായ വിശദീകരണങ്ങൾക്കും അടുത്തതായി എവിടെ പോകണമെന്ന് അറിയാനുമുള്ള ശാന്തമായ ഇടം. ഇതൊരു ഉദാഹരണ പ്രിവ്യൂ ആണ്.",
    lms: [
      { title: "ദിനംപ്രതി ചെക്ക്-ഇൻ", body: "നിങ്ങൾക്ക് എങ്ങനെ തോന്നുന്നു എന്ന് ശ്രദ്ധിക്കാനും ആഴ്ചയിലെ രീതികൾ തിരിച്ചറിയാനുമുള്ള ചെറുതും ദയയുള്ളതുമായ വഴി." },
      { title: "നിങ്ങളുടെ വേഗത്തിൽ പഠിക്കൂ", body: "പിപിഡി, പിസിഒഎസ്, ക്ഷേമം എന്നിവയെക്കുറിച്ചുള്ള ചെറിയ ഗൈഡുകൾ, ഇഷ്ടമുള്ളപ്പോൾ തുടങ്ങാം, നിർത്താം." },
      { title: "എവിടെ പോകണമെന്ന് അറിയൂ", body: "ഡോക്ടർമാർ, കൗൺസിലർമാർ, ചുറ്റുമുള്ളവർ എന്നിവരെ സമീപിക്കാനുള്ള ലളിതമായ സൂചനകൾ." }
    ],
    goodMorning: "സുപ്രഭാതം", weekSample: "നിങ്ങളുടെ ആഴ്ച (മാതൃക)",
    courses: ["പ്രസവാനന്തര വിഷാദം എന്നാൽ എന്ത്?", "പിസിഒഎസ് മനസ്സിലാക്കൽ", "ഉറക്കം, ഭക്ഷണം, വിശ്രമം"],
    turn: ["ഡോക്ടറോട് സംസാരിക്കൂ", "കൗൺസിലറെ കണ്ടെത്തൂ", "കുടുംബത്തെ ഒപ്പം ചേർക്കൂ"],
    demoEye: "ലൈവ് ഡെമോ", demoH1: "വെറുതെ വായിക്കരുത്.", demoH2: "സൗമ്യമായ ചെക്ക്-ഇൻ പരീക്ഷിക്കൂ.",
    demoLead: "ഓരോ ചോദ്യത്തിനും ഒരു ഉത്തരം തിരഞ്ഞെടുത്ത് റൺ അമർത്തൂ. ഇത് ചിന്തിക്കാൻ സഹായിക്കുന്ന ഒരു പ്രതിഫലനമാണ്, രോഗനിർണയമല്ല.",
    weeklyCheck: "പ്രതിവാര ചെക്ക്-ഇൻ", gentle: "സൗമ്യം", dTabs: ["വിവരണം", "റണ്ണുകൾ", "ഗൈഡ്"],
    howTitle: "ഇത് എങ്ങനെ പ്രവർത്തിക്കുന്നു",
    howP1: "ഉറക്കം, മാനസികാവസ്ഥ, പിന്തുണ എന്നിവയെക്കുറിച്ചുള്ള മൂന്ന് ചെറിയ ചോദ്യങ്ങൾക്ക് ഉത്തരം നൽകൂ. സൗമ്യമായ സംഗ്രഹവും അടുത്തതായി ചെയ്യാവുന്ന ചില ആശയങ്ങളും കാണാൻ റൺ അമർത്തൂ.",
    howP2: "ശരിയോ തെറ്റോ ആയ ഉത്തരങ്ങളില്ല, ഇവിടെ നിങ്ങൾ തിരഞ്ഞെടുക്കുന്നതൊന്നും സേവ് ചെയ്യപ്പെടുന്നില്ല.",
    howSample: "മാതൃക: നന്നായി ഉറങ്ങുക, നല്ല മൂഡ്, ആശ്രയിക്കാൻ ഒരാൾ ഉണ്ടാകുക എന്നിവ സ്ഥിരതയുള്ള സംഗ്രഹം നൽകുന്നു.",
    runsTitle: "ഈ സന്ദർശനത്തിലെ നിങ്ങളുടെ റണ്ണുകൾ", runsEmpty: "ഇതുവരെ റണ്ണുകളില്ല. ചെക്ക്-ഇൻ പ്രവർത്തിപ്പിച്ചാൽ ഈ സന്ദർശനത്തിലെ ഓരോ ശ്രമവും ഇവിടെ കാണാം.",
    dGuideTitle: "ഗൈഡ്",
    dGuideP1: "ഒരു സമയം ഒരു ചോദ്യം എടുക്കൂ. ഏതെങ്കിലും ചോദ്യത്തിന് ഉത്തരം പറയാൻ ബുദ്ധിമുട്ടാണെങ്കിൽ, ഈ ആഴ്ചയിലെ മിക്ക ദിവസങ്ങൾക്കും ഏറ്റവും അടുത്തത് തിരഞ്ഞെടുക്കൂ.",
    dGuideP2: "നിങ്ങൾക്ക് എപ്പോഴെങ്കിലും സുരക്ഷിതമല്ലെന്ന് തോന്നുകയോ, നിങ്ങളെയോ കുഞ്ഞിനെയോ ഉപദ്രവിക്കുന്ന ചിന്തകൾ വരികയോ ചെയ്താൽ, ഉടൻ പ്രാദേശിക അടിയന്തര സേവനങ്ങളുമായി ബന്ധപ്പെടൂ.",
    reflection: "പ്രതിഫലനം",
    quiz: [
      { q: "നിങ്ങളുടെ ഉറക്കം എങ്ങനെയാണ്?", o: ["മിക്കവാറും നന്നായി", "പലപ്പോഴും തടസ്സപ്പെടുന്നു", "ഏതാണ്ട് ഇല്ല"] },
      { q: "മിക്ക ദിവസങ്ങളിലും നിങ്ങളുടെ മാനസികാവസ്ഥ എങ്ങനെയായിരുന്നു?", o: ["മിക്കവാറും നല്ലത്", "ഉയർച്ചതാഴ്ചകൾ", "മിക്കവാറും വിഷാദം"] },
      { q: "ആശ്രയിക്കാൻ നിങ്ങൾക്ക് ആരെങ്കിലും ഉണ്ടോ?", o: ["ഉണ്ട്, എളുപ്പത്തിൽ", "ചിലപ്പോൾ", "ശരിക്കും ഇല്ല"] }
    ],
    run: "റൺ", reset: "റീസെറ്റ്", consoleLbl: "കൺസോൾ",
    outReady: { title: "നിങ്ങൾ തയ്യാറാകുമ്പോൾ", body: "മൂന്ന് ചോദ്യങ്ങൾക്കും ഉത്തരം നൽകി റൺ അമർത്തൂ." },
    outMore: { title: "ഇനി ഒരു ചുവടുകൂടി", body: "ദയവായി മൂന്ന് ചോദ്യങ്ങൾക്കും ഉത്തരം തിരഞ്ഞെടുത്ത് റൺ അമർത്തൂ." },
    note: " ഇത് ഒരു പ്രതിഫലനം മാത്രമാണ്, രോഗനിർണയമല്ല. നിങ്ങൾക്ക് എപ്പോഴെങ്കിലും സുരക്ഷിതമല്ലെന്ന് തോന്നുകയോ നിങ്ങളെയോ കുഞ്ഞിനെയോ ഉപദ്രവിക്കുന്ന ചിന്തകൾ വരികയോ ചെയ്താൽ, ഉടൻ പ്രാദേശിക അടിയന്തര സേവനങ്ങളുമായി ബന്ധപ്പെടൂ.",
    outs: [
      { title: "തൽക്കാലം സ്ഥിരം", body: "കാര്യങ്ങൾ വലിയൊരളവിൽ സ്ഥിരമായി തോന്നുന്നു. ഫലിക്കുന്നതിനെ ആശ്രയിക്കുന്നത് തുടരൂ, ഇഷ്ടമുള്ളപ്പോൾ വീണ്ടും ചെക്ക്-ഇൻ ചെയ്യൂ." },
      { title: "ചെറിയ സമ്മർദ്ദം", body: "ചിലപ്പോൾ കാര്യങ്ങൾ ഭാരമുള്ളതായി തോന്നുന്നു. കഴിയുന്നിടത്ത് വിശ്രമിക്കൂ, വിശ്വസ്തരോട് സംസാരിക്കൂ, ഡോക്ടറോടും പറയുന്നത് പരിഗണിക്കൂ." },
      { title: "അധിക പിന്തുണ സഹായിച്ചേക്കാം", body: "നിങ്ങളുടെ പല ഉത്തരങ്ങളും ബുദ്ധിമുട്ടുള്ള ഘട്ടത്തെ സൂചിപ്പിക്കുന്നു. ദയവായി ഉടൻ ഡോക്ടറോടോ കൗൺസിലറോടോ സംസാരിക്കുന്നത് പരിഗണിക്കൂ. ഈ ഭാരം നിങ്ങൾ ഒറ്റയ്ക്ക് ചുമക്കേണ്ടതില്ല." }
    ],
    assistTitle: "ഗൈഡ് അസിസ്റ്റന്റ്", assistBody: "കുടുങ്ങിയോ? ഒരു സമയം ഒരു ചോദ്യം എടുക്കൂ. തെറ്റായ ഉത്തരങ്ങളില്ല.", dismiss: "വേണ്ട", accept: "ശരി",
    guidesEye: "ചുരുക്ക അവലോകനം", guidesH1: "ഞങ്ങളുടെ കഥ, പിപിഡി, പിസിഒഎസ്", guidesH2: "പരിചരണക്കാർക്കുള്ള മൊഡ്യൂളുകളും.", guidesLead: "NurtureHer എങ്ങനെ തുടങ്ങി, പിപിഡിയും പിസിഒഎസും എന്താണ്, കുടുംബത്തിനും പരിചരണക്കാർക്കും എങ്ങനെ സഹായിക്കാം എന്നതിന്റെ ചുരുക്ക അവലോകനം.",
    guides: [
      { short: "ഞങ്ങളുടെ കഥ", title: "NurtureHer എങ്ങനെ തുടങ്ങി", tag: "01 · തുടക്കം", summary: "NurtureHer ഒരു ലളിതമായ വിശ്വാസത്തിൽ നിന്ന് തുടങ്ങി: ഓരോ സ്ത്രീക്കും വ്യക്തവും ദയയുള്ളതും വിശ്വസനീയവുമായ ആരോഗ്യ വിവരങ്ങൾ ലഭിക്കണം; ബഹളത്തിൽ തിരയേണ്ടതില്ല, വിധിയെ ഭയക്കേണ്ടതില്ല.", mods: ["ഞങ്ങൾ എന്തുകൊണ്ട് തുടങ്ങി", "ഞങ്ങൾ ആർക്കുവേണ്ടി", "ഞങ്ങൾ വിശ്വസിക്കുന്നത്", "വിവരങ്ങൾ എങ്ങനെ വിശ്വസനീയമായി നിലനിർത്തുന്നു", "ഞങ്ങൾ എങ്ങോട്ടാണ് പോകുന്നത്", "ഞങ്ങളുടെ കരുതൽ വാഗ്ദാനം"] },
      { short: "പ്രസവാനന്തര വിഷാദം", title: "പ്രസവാനന്തര വിഷാദം (പിപിഡി)", tag: "02 · പിപിഡി", summary: "ബേബി ബ്ലൂസും പിപിഡിയും തമ്മിലുള്ള വ്യത്യാസം മനസ്സിലാക്കൂ, ലക്ഷണങ്ങൾ തിരിച്ചറിയൂ, എപ്പോൾ എങ്ങനെ സഹായം ചോദിക്കണമെന്ന് അറിയൂ.", mods: ["ബേബി ബ്ലൂസോ പിപിഡിയോ?", "സാധാരണ ലക്ഷണങ്ങളും വികാരങ്ങളും", "എപ്പോൾ സഹായം തേടണം", "പങ്കാളിയുടെയും കുടുംബത്തിന്റെയും പിന്തുണ", "ചികിത്സാ മാർഗങ്ങൾ", "സൗമ്യമായ സ്വയം പരിചരണ ശീലങ്ങൾ"] },
      { short: "പിസിഒഎസ്", title: "പോളിസിസ്റ്റിക് ഓവറി സിൻഡ്രോം (പിസിഒഎസ്)", tag: "03 · പിസിഓഎസ്", summary: "പിസിഒഎസ് എന്താണ്, എങ്ങനെ പ്രകടമാകുന്നു, എങ്ങനെ കണ്ടെത്തുന്നു, നിയന്ത്രിക്കാൻ സഹായിക്കുന്ന ദൈനംദിന ചുവടുകൾ എന്നിവയുടെ വ്യക്തമായ നോട്ടം.", mods: ["പിസിഒഎസ് എന്താണ്?", "ശ്രദ്ധിക്കേണ്ട ലക്ഷണങ്ങൾ", "രോഗനിർണയം നേടൽ", "ഭക്ഷണം, ചലനം, ഉറക്കം", "ആർത്തവവും പ്രത്യുത്പാദനക്ഷമതയും", "വൈകാരിക ക്ഷേമം"] },
      { short: "പരിചരണക്കാരുടെ മൊഡ്യൂളുകൾ", title: "പരിചരണക്കാരുടെ മൊഡ്യൂളുകൾ", tag: "04 · പരിചരണക്കാർ", summary: "പങ്കാളി, കുടുംബം, സുഹൃത്തുക്കൾ എന്നിവർക്കുള്ള ചെറിയ മൊഡ്യൂളുകൾ: എങ്ങനെ കേൾക്കണം, ലക്ഷണങ്ങൾ എങ്ങനെ തിരിച്ചറിയണം, ഭാരം എങ്ങനെ പങ്കിടണം, പ്രൊഫഷണൽ പരിചരണം കണ്ടെത്താൻ എപ്പോൾ സഹായിക്കണം.", mods: ["പരിഹാരം അടിച്ചേൽപ്പിക്കാതെ കേൾക്കൽ", "ആദ്യ ലക്ഷണങ്ങൾ തിരിച്ചറിയൽ", "വീട്ടിലെ ഭാരം പങ്കിടൽ", "വിശ്രമത്തിനും ഉറക്കത്തിനും പിന്തുണ", "സഹായം തേടുന്നതിനെക്കുറിച്ച് സംസാരിക്കൽ", "നിങ്ങളെയും ശ്രദ്ധിക്കൽ"] }
    ],
    exploreGuide: "ഈ ഗൈഡ് കാണുക", getSummary: "സംഗ്രഹം നേടുക",
    voicesEye: "അല്പം പ്രോത്സാഹനം", voicesH1: "അടുത്ത് സൂക്ഷിക്കാവുന്ന", voicesH2: "വാക്കുകൾ.",
    voices: ["നല്ല അമ്മയാകാൻ നിങ്ങൾ പൂർണ്ണരാകേണ്ടതില്ല.", "സഹായം ചോദിക്കുന്നത് ശക്തിയാണ്, പരാജയമല്ല.", "നിങ്ങളുടെ ശരീരം കഠിനമായ ഒന്ന് ചെയ്യുകയാണ്. അതിനോട് സൗമ്യമായിരിക്കൂ.", "വിശ്രമം സുഖപ്പെടലിന്റെ ഭാഗമാണ്, അതിനുള്ള സമ്മാനമല്ല.", "നിങ്ങളുടെ ഇടം എടുക്കാനും സ്വയം പരിപാലിക്കാനും നിങ്ങൾക്ക് അവകാശമുണ്ട്."],
    voiceNote: "NurtureHer-ൽ നിന്നുള്ള ഒരു കുറിപ്പ്", noteWord: "കുറിപ്പ്",
    faqEye: "ചോദ്യോത്തരം", faqH1: "ചോദ്യങ്ങൾ,", faqH2: "ഉത്തരങ്ങൾ.",
    faq: [
      { label: "പൊതുവായത്", items: [
        { q: "അപ്പോൾ NurtureHer എന്നാൽ കൃത്യമായി എന്താണ്?", a: "NurtureHer സ്ത്രീകളുടെ ആരോഗ്യത്തെക്കുറിച്ചുള്ള വിശ്വസനീയ വിവരങ്ങൾക്കും പിന്തുണയ്ക്കുമുള്ള സൗമ്യവും ഉപയോഗിക്കാൻ എളുപ്പവുമായ ഇടമാണ്; പ്രസവാനന്തര വിഷാദത്തിലും പിസിഒഎസിലും തുടങ്ങുന്നു." },
        { q: "ഇത് ഡോക്ടറെ കാണുന്നതിന് പകരമാണോ?", a: "അല്ല. NurtureHer വിവരങ്ങളും പിന്തുണയും നൽകുന്നു, പക്ഷേ ഒരു അവസ്ഥയും കണ്ടെത്താനോ ചികിത്സിക്കാനോ കഴിയില്ല. നിങ്ങളുടെ ആരോഗ്യത്തെക്കുറിച്ച് യോഗ്യതയുള്ള ആരോഗ്യ വിദഗ്ധരോട് സംസാരിക്കൂ." },
        { q: "NurtureHer ആർക്കുവേണ്ടിയാണ്?", a: "പിപിഡി, പിസിഒഎസ്, ദൈനംദിന ക്ഷേമം എന്നിവയെക്കുറിച്ച് വ്യക്തവും ദയയുള്ളതുമായ വിവരങ്ങൾ ആഗ്രഹിക്കുന്ന എല്ലാവർക്കും: പുതിയ അമ്മമാർ, ലക്ഷണങ്ങളുള്ള സ്ത്രീകൾ, അവരെ പിന്തുണയ്ക്കുന്ന കുടുംബം." }
      ] },
      { label: "പിപിഡി", items: [
        { q: "പിപിഡി ബേബി ബ്ലൂസിൽ നിന്ന് എങ്ങനെ വ്യത്യസ്തമാണ്?", a: "ബേബി ബ്ലൂസ് സാധാരണമാണ്; സാധാരണയായി പ്രസവം കഴിഞ്ഞ് ഏതാനും ദിവസത്തിനുള്ളിൽ തുടങ്ങി ഏകദേശം രണ്ടാഴ്ചയ്ക്കുള്ളിൽ കുറയും. പിപിഡി കൂടുതൽ കാലം നീണ്ടുനിൽക്കും, തീവ്രമായി അനുഭവപ്പെടും, ദൈനംദിന ജീവിതത്തെ ബാധിക്കാം." },
        { q: "ഞാൻ എപ്പോൾ സഹായം തേടണം?", a: "വിഷാദമോ ആശങ്കയോ ക്ഷീണമോ രണ്ടാഴ്ചയിൽ കൂടുതൽ നീണ്ടാൽ, അല്ലെങ്കിൽ നിങ്ങളെയോ കുഞ്ഞിനെയോ പരിപാലിക്കാൻ ബുദ്ധിമുട്ടായാൽ, ഡോക്ടറോട് സംസാരിക്കൂ. നിങ്ങളെയോ കുഞ്ഞിനെയോ ഉപദ്രവിക്കുന്ന ചിന്തകളുണ്ടെങ്കിൽ ഉടൻ അടിയന്തര സഹായം തേടൂ." },
        { q: "പിപിഡി ചികിത്സിക്കാനാകുമോ?", a: "ഉണ്ട്. പിപിഡി ചികിത്സിച്ച് ഭേദമാക്കാം; കൗൺസിലിംഗ്, കുടുംബത്തിന്റെ സഹായം, ചിലപ്പോൾ ഡോക്ടർ നിർദ്ദേശിക്കുന്ന മരുന്ന് എന്നിവ യഥാർത്ഥ മാറ്റമുണ്ടാക്കും." }
      ] },
      { label: "പിസിഒഎസ്", items: [
        { q: "പിസിഒഎസിന്റെ സാധാരണ ലക്ഷണങ്ങൾ എന്തൊക്കെയാണ്?", a: "ക്രമരഹിതമോ മുടങ്ങിയതോ ആയ ആർത്തവം, മുഖക്കുരു, മുഖത്തോ ശരീരത്തോ അധിക രോമം, തലമുടി കനം കുറയൽ, ഭാരമാറ്റങ്ങൾ എന്നിവ സാധാരണമാണ്. ലക്ഷണങ്ങൾ ഓരോരുത്തർക്കും വ്യത്യസ്തമാണ്." },
        { q: "പിസിഒഎസ് എങ്ങനെയാണ് കണ്ടെത്തുന്നത്?", a: "ഡോക്ടർ സാധാരണയായി നിങ്ങളുടെ ചരിത്രവും ലക്ഷണങ്ങളും പരിശോധിച്ച് ശാരീരിക പരിശോധന, രക്തപരിശോധന, അൾട്രാസൗണ്ട് എന്നിവ നിർദ്ദേശിച്ചേക്കാം." },
        { q: "പിസിഒഎസ് നിയന്ത്രിക്കാനാകുമോ?", a: "ഉണ്ട്. പലരും ജീവിതശൈലി മാറ്റങ്ങളിലൂടെയും, ആവശ്യമെങ്കിൽ ഡോക്ടറുടെ മാർഗനിർദ്ദേശത്തിലുള്ള ചികിത്സയിലൂടെയും പിസിഒഎസ് നിയന്ത്രിക്കുന്നു. നേരത്തെയുള്ള പരിചരണം സഹായിക്കും." }
      ] }
    ],
    ctaH1: "ആദ്യ ചുവടുവയ്ക്കാൻ", ctaH2: "തയ്യാറാണോ?", ctaLead: "NurtureHer-ൽ ചേർന്ന് അവളുടെ ആരോഗ്യത്തിന്റെ ഓരോ ഘട്ടത്തിനും ശാന്തവും വിശ്വസനീയവുമായ മാർഗനിർദേശം നേടൂ.", talkUs: "ഞങ്ങളോട് സംസാരിക്കൂ",
    footTag: "പ്രസവാനന്തര വിഷാദം, പിസിഒഎസ്, ദൈനംദിന ക്ഷേമം എന്നിവയെക്കുറിച്ചുള്ള സൗമ്യവും വിശ്വസനീയവുമായ മാർഗനിർദേശം.", explore: "പര്യവേക്ഷണം ചെയ്യൂ", account: "അക്കൗണ്ട്", contact: "ബന്ധപ്പെടുക",
    ph: ["[ഇമെയിൽ വിലാസം]", "[ഫോൺ നമ്പർ]", "[നഗരം, സംസ്ഥാനം]"],
    copy: "© 2026 NurtureHer. ഈ സൈറ്റ് പൊതുവായ വിവരങ്ങൾ നൽകുന്നു, പ്രൊഫഷണൽ മെഡിക്കൽ ഉപദേശത്തിന് പകരമല്ല.",
    letterEye: "നിങ്ങൾക്കായി ഒരു കത്ത്", letterTitle: "പ്രിയപ്പെട്ട അമ്മയ്ക്ക്,",
    letterP: "നിങ്ങൾ ഇവിടെയുള്ളതിൽ ഞങ്ങൾക്ക് ഒരുപാട് സന്തോഷം. ഈ കാലം നിങ്ങൾക്ക് എങ്ങനെയായാലും, സന്തോഷകരമോ ഭാരമുള്ളതോ ഇടയിലെവിടെയോ, നിങ്ങൾ കരുതലിനും വിശ്രമത്തിനും ദയയ്ക്കും അർഹയാണ്.",
    rApproach: "സമീപനം", rApproachV: "സൗമ്യമായ ചുവടുകൾ", rGuidance: "മാർഗനിർദേശം", rGuidanceV: "വിശ്വസനീയ വിവരങ്ങൾ", rStatus: "നില", rStatusV: "നിങ്ങൾ ഒറ്റയ്ക്കല്ല",
    closeBtn: "അടയ്ക്കുക", closeAria: "അടയ്ക്കുക",
    thanks: "നന്ദി.", thanksP: "ഇതൊരു ഡിസൈൻ പ്രിവ്യൂ ആണ്, അതിനാൽ ഒന്നും അയച്ചിട്ടില്ല. യഥാർത്ഥ സൈറ്റിൽ ഇവിടെ ഞങ്ങൾ സ്ഥിരീകരിച്ച് നിങ്ങളെ ബന്ധപ്പെടും.",
    formTalk: "നമുക്ക് സംസാരിക്കാം", formSum: "സംഗ്രഹ ഗൈഡ് നേടൂ",
    subTalk: "നിങ്ങളെക്കുറിച്ച് അല്പം പറയൂ, ഞങ്ങൾ എങ്ങനെ ബന്ധപ്പെടണമെന്നും.", subSum: "നിങ്ങളുടെ വിവരങ്ങൾ നൽകൂ, ഈ ഗൈഡിന്റെ ഒരു ചെറിയ സംഗ്രഹം അയയ്ക്കാം.",
    btnTalk: "ബന്ധപ്പെടാം", btnSum: "സംഗ്രഹം അയയ്ക്കൂ",
    fullName: "പൂർണ്ണ നാമം", namePh: "നിങ്ങളുടെ പേര്", email: "ഇമെയിൽ", phone: "ഫോൺ നമ്പർ", optional: "ഓപ്ഷണൽ", prefContact: "ഇഷ്ടപ്പെട്ട ബന്ധപ്പെടൽ രീതി",
    prefOpts: ["ഇമെയിൽ", "ഫോൺ കോൾ", "സന്ദേശം"]
  }
};

/**
 * Convert a CSS declaration string (the format used by the design reference,
 * e.g. "display:flex;gap:10px") into a React style object. Custom properties
 * (--var) are preserved verbatim; other names are camelCased.
 */
export function sx(style: string | undefined): React.CSSProperties | undefined {
  if (!style) return undefined;
  const out: Record<string, string> = {};
  for (const decl of style.split(";")) {
    const idx = decl.indexOf(":");
    if (idx < 0) continue;
    const prop = decl.slice(0, idx).trim();
    const val = decl.slice(idx + 1).trim();
    if (!prop || !val) continue;
    out[prop.startsWith("--") ? prop : prop.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase())] = val;
  }
  return out as React.CSSProperties;
}
