import {
  Activity,
  Baby,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  Compass,
  FileText,
  HeartPulse,
  Home,
  LifeBuoy,
  LogOut,
  LucideIcon,
  MessageCircle,
  Moon,
  QrCode,
  Settings,
  Shield,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  User,
  Utensils,
} from "lucide-react";
import { TranslationSchema } from "@/i18n/types";

export interface NavItem {
  key: string;
  label: string;
  path: string;
  icon: LucideIcon;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export function getNavigationSections(t: TranslationSchema, role = "mother"): NavSection[] {
  const normalizedRole = role?.toLowerCase() || "mother";

  if (normalizedRole === "doctor") {
    return [
      {
        title: "Clinical Practice",
        items: [
          { key: "doctor", label: "Doctor Dashboard", path: "/doctor", icon: Stethoscope },
          { key: "herreach", label: "HerReach Resource Finder", path: "/herreach", icon: Compass },
          { key: "reports", label: "Reports Zone", path: "/reports", icon: BarChart3 },
          { key: "coach", label: "AI Clinical Assistant", path: "/coach", icon: Bot },
        ],
      },
      {
        title: "Clinical Guidance",
        items: [
          { key: "nutrition", label: "Nutrition Standards", path: "/nutrition", icon: Utensils },
          { key: "emergency", label: "Emergency Protocols", path: "/emergency", icon: LifeBuoy },
        ],
      },
      {
        title: t.nav.sections.account,
        items: [
          { key: "profile", label: t.nav.profile, path: "/profile", icon: User },
          { key: "settings", label: t.nav.settings, path: "/settings", icon: Settings },
          { key: "logout", label: t.nav.logout, path: "/logout", icon: LogOut },
        ],
      },
    ];
  }

  if (normalizedRole === "admin") {
    return [
      {
        title: "Governance & Systems",
        items: [
          { key: "admin", label: "Admin Console", path: "/admin", icon: Shield },
          { key: "reports", label: "System Analytics", path: "/reports", icon: BarChart3 },
        ],
      },
      {
        title: "Platform Tools",
        items: [
          { key: "coach", label: "AI Testbed", path: "/coach", icon: Bot },
          { key: "emergency", label: "Emergency Gateway", path: "/emergency", icon: LifeBuoy },
        ],
      },
      {
        title: t.nav.sections.account,
        items: [
          { key: "profile", label: t.nav.profile, path: "/profile", icon: User },
          { key: "settings", label: t.nav.settings, path: "/settings", icon: Settings },
          { key: "logout", label: t.nav.logout, path: "/logout", icon: LogOut },
        ],
      },
    ];
  }

  if (normalizedRole === "caregiver") {
    return [
      {
        title: "Care Companion",
        items: [
          { key: "caregiver", label: "Caregiver Companion", path: "/caregiver", icon: Baby },
          { key: "herreach", label: "HerReach Facility Finder", path: "/herreach", icon: Compass },
          { key: "carecircle", label: "CareCircle TrustVault", path: "/carecircle", icon: QrCode },
          { key: "coach", label: "Family Coach", path: "/coach", icon: Bot },
        ],
      },
      {
        title: "Wellness & Safety",
        items: [
          { key: "nutrition", label: "Nutrition Guide", path: "/nutrition", icon: Utensils },
          { key: "emergency", label: "Emergency SOS", path: "/emergency", icon: LifeBuoy },
        ],
      },
      {
        title: t.nav.sections.account,
        items: [
          { key: "profile", label: t.nav.profile, path: "/profile", icon: User },
          { key: "settings", label: t.nav.settings, path: "/settings", icon: Settings },
          { key: "logout", label: t.nav.logout, path: "/logout", icon: LogOut },
        ],
      },
    ];
  }

  // Default: Mother role
  return [
    {
      title: t.nav.sections.overview,
      items: [
        { key: "dashboard", label: t.nav.dashboard, path: "/", icon: Home },
        { key: "insights", label: t.nav.insights, path: "/insights", icon: Activity },
        { key: "coach", label: t.nav.coach, path: "/coach", icon: Bot },
        { key: "chatHistory", label: t.nav.chatHistory, path: "/chat-history", icon: MessageCircle },
      ],
    },
    {
      title: t.nav.sections.careTools,
      items: [
        { key: "cycle", label: t.nav.cycle, path: "/cycle", icon: CalendarDays },
        { key: "pcos", label: t.nav.pcos, path: "/pcos", icon: HeartPulse },
        { key: "ppd", label: t.nav.ppd, path: "/ppd", icon: ShieldAlert },
        { key: "journal", label: t.nav.journal, path: "/journal", icon: Moon },
        { key: "nutrition", label: t.nav.nutrition, path: "/nutrition", icon: Utensils },
        { key: "herreach", label: "HerReach Healthcare", path: "/herreach", icon: Compass },
        { key: "doctorVisit", label: "Doctor-Visit Prep", path: "/doctor-visit", icon: Stethoscope },
        { key: "carecircle", label: "CareCircle QR Vault", path: "/carecircle", icon: QrCode },
        { key: "caregiver", label: t.nav.caregiver, path: "/caregiver", icon: Baby },
        { key: "emergency", label: t.nav.emergency, path: "/emergency", icon: LifeBuoy },
      ],
    },
    {
      title: t.nav.sections.teamRecords,
      items: [
        { key: "reports", label: "Reports Zone", path: "/reports", icon: BarChart3 },
        { key: "profile", label: t.nav.profile, path: "/profile", icon: User },
      ],
    },
    {
      title: t.nav.sections.account,
      items: [
        { key: "settings", label: t.nav.settings, path: "/settings", icon: Settings },
        { key: "logout", label: t.nav.logout, path: "/logout", icon: LogOut },
      ],
    },
  ];
}

export const navigation = [
  { label: "Dashboard", path: "/", icon: Home },
  { label: "Health Insights", path: "/insights", icon: Activity },
  { label: "AI Health Coach", path: "/coach", icon: Bot },
  { label: "Chat History", path: "/chat-history", icon: MessageCircle },
  { label: "Cycle Tracker", path: "/cycle", icon: CalendarDays },
  { label: "PCOS Prediction", path: "/pcos", icon: HeartPulse },
  { label: "PPD Detection", path: "/ppd", icon: ShieldAlert },
  { label: "Mood Journal", path: "/journal", icon: Moon },
  { label: "Nutrition Guide", path: "/nutrition", icon: Utensils },
  { label: "AI Doctor-Visit Prep", path: "/doctor-visit", icon: Stethoscope },
  { label: "CareCircle QR Vault", path: "/carecircle", icon: QrCode },
  { label: "Caregiver Zone", path: "/caregiver", icon: Baby },
  { label: "Emergency Help", path: "/emergency", icon: LifeBuoy },
  { label: "Reports Zone", path: "/reports", icon: BarChart3 },
  { label: "Doctor Portal", path: "/doctor", icon: Stethoscope },
  { label: "Admin Console", path: "/admin", icon: Shield },
  { label: "Profile", path: "/profile", icon: User },
  { label: "Settings", path: "/settings", icon: Settings },
  { label: "Logout", path: "/logout", icon: LogOut },
];

export const navigationSections = [
  {
    title: "Overview",
    items: navigation.slice(0, 4),
  },
  {
    title: "Care Tools",
    items: navigation.slice(4, 13),
  },
  {
    title: "Team & Records",
    items: navigation.slice(13, 17),
  },
  {
    title: "Account",
    items: navigation.slice(17),
  },
];

export const navSpotlight = [
  { label: "Today", icon: Bell },
  { label: "Care plan", icon: BookOpen },
  { label: "Reports", icon: FileText },
  { label: "Insights", icon: Sparkles },
];
