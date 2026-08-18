import { LayoutDashboard, Settings, Shield, Sparkles } from "lucide-react";
import { routes } from "wasp/client/router";

export const userMenuItems = [
  {
    name: "AI Scheduler (Demo App)",
    to: routes.DemoAppRoute.to,
    icon: LayoutDashboard,
    isAdminOnly: false,
    isAuthRequired: true,
  },
  {
    name: "AI Animation Studio",
    to: routes.HtmlAnimationRoute.to,
    icon: Sparkles,
    isAdminOnly: false,
    isAuthRequired: true,
  },
  {
    name: "Account Settings",
    to: routes.AccountRoute.to,
    icon: Settings,
    isAuthRequired: false,
    isAdminOnly: false,
  },
  {
    name: "Admin Dashboard",
    to: routes.AdminRoute.to,
    icon: Shield,
    isAuthRequired: false,
    isAdminOnly: true,
  },
] as const;
