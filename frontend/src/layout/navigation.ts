import {
  Activity,
  Baby,
  BarChart3,
  Bot,
  CalendarDays,
  BookOpen,
  Compass,
  Download,
  HeartPulse,
  Home,
  LifeBuoy,
  LogOut,
  LucideIcon,
  MapPin,
  Moon,
  QrCode,
  Settings,
  Shield,
  ShieldAlert,
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
        title: t.nav.sections.clinicalPractice,
        items: [
          { key: "doctor", label: t.nav.doctorDashboard, path: "/doctor", icon: Stethoscope },
          { key: "herreach", label: t.nav.herreachFinder, path: "/herreach", icon: Compass },
          { key: "reports", label: t.nav.reportsZone, path: "/reports", icon: BarChart3 },
          { key: "district-analytics", label: t.nav.districtAnalytics, path: "/district-analytics", icon: MapPin },
          { key: "coach", label: t.nav.clinicalAssistant, path: "/coach", icon: Bot },
        ],
      },
      {
        title: t.nav.sections.clinicalGuidance,
        items: [
          { key: "library", label: "Patient Education", path: "/library", icon: BookOpen },
          { key: "offline-library", label: "My Offline Library", path: "/offline-library?tab=offline", icon: Download },
          { key: "nutrition", label: t.nav.nutritionStandards, path: "/nutrition", icon: Utensils },
          { key: "emergency", label: t.nav.emergencyProtocols, path: "/emergency", icon: LifeBuoy },
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
        title: t.nav.sections.governance,
        items: [
          { key: "admin", label: t.nav.adminConsole, path: "/admin", icon: Shield },
          { key: "reports", label: t.nav.systemAnalytics, path: "/reports", icon: BarChart3 },
          { key: "district-analytics", label: t.nav.districtAnalytics, path: "/district-analytics", icon: MapPin },
        ],
      },
      {
        title: t.nav.sections.platformTools,
        items: [
          { key: "coach", label: t.nav.aiTestbed, path: "/coach", icon: Bot },
          { key: "emergency", label: t.nav.emergencyGateway, path: "/emergency", icon: LifeBuoy },
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
        title: t.nav.sections.careCompanion,
        items: [
          { key: "caregiver", label: t.nav.caregiverCompanion, path: "/caregiver", icon: Baby },
          { key: "library", label: "Resource Library", path: "/library", icon: BookOpen },
          { key: "offline-library", label: "My Offline Library", path: "/offline-library?tab=offline", icon: Download },
          { key: "carecircle-connect", label: t.nav.connectToMother, path: "/caregiver?tab=connect", icon: QrCode },
          { key: "herreach", label: t.nav.facilityFinder, path: "/herreach", icon: Compass },
          { key: "coach", label: t.nav.familyCoach, path: "/coach", icon: Bot },
        ],
      },
      {
        title: t.nav.sections.wellnessSafety,
        items: [
          { key: "nutrition", label: t.nav.nutritionGuide, path: "/nutrition", icon: Utensils },
          { key: "emergency", label: t.nav.emergencySos, path: "/emergency", icon: LifeBuoy },
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
      ],
    },
    {
      title: t.nav.sections.careTools,
      items: [
        { key: "library", label: "Resource Library", path: "/library", icon: BookOpen },
        { key: "offline-library", label: "My Offline Library", path: "/offline-library?tab=offline", icon: Download },
        { key: "cycle", label: t.nav.cycle, path: "/cycle", icon: CalendarDays },
        { key: "pcos", label: t.nav.pcos, path: "/pcos", icon: HeartPulse },
        { key: "ppd", label: t.nav.ppd, path: "/ppd", icon: ShieldAlert },
        { key: "journal", label: t.nav.journal, path: "/journal", icon: Moon },
        { key: "nutrition", label: t.nav.nutrition, path: "/nutrition", icon: Utensils },
        { key: "herreach", label: t.nav.herreachHealthcare, path: "/herreach", icon: Compass },
        { key: "carecircle", label: t.nav.careCircleVault, path: "/carecircle", icon: QrCode },
        { key: "emergency", label: t.nav.emergency, path: "/emergency", icon: LifeBuoy },
      ],
    },
    {
      title: t.nav.sections.teamRecords,
      items: [
        { key: "reports", label: t.nav.reportsZone, path: "/reports", icon: BarChart3 },
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
