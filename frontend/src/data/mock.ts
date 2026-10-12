export const moodTrend = [
  { day: "Mon", calm: 72, energy: 48 },
  { day: "Tue", calm: 78, energy: 54 },
  { day: "Wed", calm: 68, energy: 62 },
  { day: "Thu", calm: 84, energy: 70 },
  { day: "Fri", calm: 88, energy: 76 },
  { day: "Sat", calm: 80, energy: 66 },
  { day: "Sun", calm: 92, energy: 82 },
];

export const healthAnalytics = [
  { name: "Wellness", value: 38, color: "#EC4899" },
  { name: "Cycle", value: 24, color: "#C084FC" },
  { name: "Nutrition", value: 22, color: "#8DD7C3" },
  { name: "Rest", value: 16, color: "#93C5FD" },
];

export const sleepData = [
  { day: "Mon", sleep: 6.8, deep: 2.1 },
  { day: "Tue", sleep: 7.4, deep: 2.5 },
  { day: "Wed", sleep: 6.2, deep: 1.7 },
  { day: "Thu", sleep: 7.8, deep: 2.8 },
  { day: "Fri", sleep: 7.1, deep: 2.2 },
  { day: "Sat", sleep: 8.2, deep: 3.1 },
  { day: "Sun", sleep: 7.6, deep: 2.7 },
];

export const activityData = [
  { day: "Mon", steps: 4200, yoga: 12 },
  { day: "Tue", steps: 5800, yoga: 18 },
  { day: "Wed", steps: 3900, yoga: 8 },
  { day: "Thu", steps: 6400, yoga: 21 },
  { day: "Fri", steps: 7200, yoga: 24 },
  { day: "Sat", steps: 5200, yoga: 16 },
  { day: "Sun", steps: 6800, yoga: 20 },
];

export const nutritionData = [
  { name: "Protein", value: 76, color: "#EC4899" },
  { name: "Iron", value: 68, color: "#F59E0B" },
  { name: "Fiber", value: 82, color: "#22C55E" },
  { name: "Calcium", value: 61, color: "#C084FC" },
];

export const waterData = [
  { time: "8a", cups: 1 },
  { time: "10a", cups: 3 },
  { time: "12p", cups: 4 },
  { time: "2p", cups: 5 },
  { time: "4p", cups: 7 },
  { time: "6p", cups: 8 },
];

export const heartRateData = [
  { time: "Mon", bpm: 78 },
  { time: "Tue", bpm: 76 },
  { time: "Wed", bpm: 82 },
  { time: "Thu", bpm: 74 },
  { time: "Fri", bpm: 79 },
  { time: "Sat", bpm: 72 },
  { time: "Sun", bpm: 75 },
];

export const cycleTimeline = [
  { title: "Period logged", detail: "Flow and cramp intensity captured for cycle accuracy.", time: "Day 1" },
  { title: "Fertility window", detail: "Predicted fertile days based on the last six cycles.", time: "Day 11" },
  { title: "Ovulation", detail: "Peak fertility day with gentle symptom reminders enabled.", time: "Day 14" },
  { title: "Wellness check", detail: "Mood, sleep, and hydration review before next period.", time: "Day 24" },
];

export const dashboardTasks = [
  { title: "Log morning mood", detail: "Takes 30 seconds", done: true },
  { title: "Drink 8 cups of water", detail: "6 of 8 completed", done: true },
  { title: "Evening breathing practice", detail: "3 minute reset", done: false },
  { title: "Review nutrition plan", detail: "Iron and protein focus", done: false },
];

export const appointments = [
  { title: "Antenatal checkup", doctor: "Dr. Rao", time: "Tomorrow, 10:30 AM", tone: "from-primary to-accent" },
  { title: "Nutrition review", doctor: "Care team", time: "Jul 12, 4:00 PM", tone: "from-emerald-400 to-mint" },
];

export const promptSuggestions = [
  "Why am I tired today?",
  "Plan high-protein meals",
  "Explain my cycle window",
  "Help me calm down",
];

export const quickActions = ["Journal", "Hydrate", "Symptoms", "Emergency"];

export const pcosHistory = [
  { date: "Jul 01", risk: "Low", probability: "18%" },
  { date: "Jun 12", risk: "Moderate", probability: "41%" },
  { date: "May 25", risk: "Low", probability: "22%" },
];

export const recommendations = [
  "Keep tracking cycle regularity and symptoms for the next 3 cycles.",
  "Prioritize protein at breakfast and a low-glycemic evening snack.",
  "Schedule a gynecology follow-up if acne, hair growth, or cycle changes rise.",
];

export const ppdHistory = [
  { date: "Jul 02", score: 7, risk: "Low" },
  { date: "Jun 18", score: 11, risk: "Moderate" },
  { date: "Jun 04", score: 5, risk: "Low" },
];

export const moodEntries = [
  { title: "Calm after a short walk", detail: "Energy improved after breakfast and hydration.", time: "Today" },
  { title: "Better sleep", detail: "Woke once at night, then returned to sleep after breathing.", time: "Jul 7" },
  { title: "Mild evening cramps", detail: "Logged symptom and rested with warm compress.", time: "Jul 6" },
];

export const highRiskRows = [
  { name: "Ananya Rao", district: "Bengaluru Rural", risk: "High", source: "PCOS", status: "Open" },
  { name: "Meera S", district: "Mysuru", risk: "Moderate", source: "PPD", status: "Open" },
  { name: "Lakshmi K", district: "Mandya", risk: "High", source: "PPD", status: "Review" },
  { name: "Farah N", district: "Tumakuru", risk: "Moderate", source: "PPD", status: "Open" },
];

export const cycleStats = [
  { label: "Average cycle", value: "28d" },
  { label: "Period length", value: "5d" },
  { label: "Logged cycles", value: "6" },
  { label: "Prediction accuracy", value: "91%" },
];

export const videos = [
  { title: "Postpartum Recovery", type: "Video", duration: "8 min", accent: "bg-pink-100 text-primary", description: "How caregivers can support rest, feeding, and gentle mobility." },
  { title: "Nutrition Basics", type: "Article", duration: "5 min", accent: "bg-emerald-100 text-emerald-700", description: "Simple meals for iron, protein, hydration, and energy stability." },
  { title: "Caregiver Support", type: "Guide", duration: "6 min", accent: "bg-purple-100 text-accent", description: "Conversation prompts and warning signs for emotional wellbeing." },
  { title: "Safe Movement", type: "Tip", duration: "3 min", accent: "bg-sky-100 text-sky-700", description: "Low-impact movement ideas with rest-first guardrails." },
];

export const reports = [
  { name: "Wellness Summary", status: "Updated today", progress: 88 },
  { name: "Risk Report", status: "Clinician ready", progress: 72 },
  { name: "Cycle Trends", status: "6 cycles included", progress: 94 },
];
