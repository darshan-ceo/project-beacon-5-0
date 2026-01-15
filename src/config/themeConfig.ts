/**
 * H-Office Litigation CRM - Brand Guidelines Configuration
 * Version: 1.0 | Theme: legal_blue
 * Single source of truth for all theming
 */

export const THEME_CONFIG = {
  meta: {
    brand_name: "H-Office Litigation CRM",
    guideline_version: "1.0",
    approved_for: ["Litigation", "GST", "Tribunal", "Appeal"],
    last_updated: "2026-01-15"
  },

  theme_control: {
    active_theme: "legal_blue" as const,
    preview_enabled: true,
    allow_admin_toggle: true
  },

  themes: {
    legal_blue: {
      brand: {
        primary: "#1E3A8A",      // Deep blue - main actions, links, highlights
        secondary: "#0F766E",    // Teal - secondary accents
        accent: "#3730A3",       // Indigo - tertiary accent
        neutral: "#334155"       // Slate - neutral elements
      },
      backgrounds: {
        app: "#F8FAFC",          // Main application background
        surface: "#FFFFFF",      // Cards, panels
        muted: "#F1F5F9",        // Subtle backgrounds
        divider: "#E2E8F0"       // Borders, dividers
      },
      text: {
        primary: "#0F172A",      // Headers, primary text
        secondary: "#475569",    // Secondary text
        muted: "#64748B",        // Muted, placeholder text
        inverse: "#FFFFFF"       // Text on dark backgrounds
      },
      actions: {
        primary: "#1E3A8A",
        secondary: "#0F766E",
        tertiary: "#3730A3",
        disabled: "#CBD5E1",
        hover_overlay: "rgba(30,58,138,0.08)",
        focus_ring: "rgba(30,58,138,0.35)"
      },
      alerts: {
        critical: "#DC2626",     // Red - critical alerts
        important: "#F59E0B",    // Amber - important (time-critical only)
        neutral: "#2563EB"       // Blue - informational
      }
    }
  },

  rules: {
    orange_usage: {
      allowed: false,
      exception: "Time-critical alerts only (optional, approval required)"
    },
    stage_vs_status: {
      rule: "Stage defines case position; Status defines condition inside the stage",
      mixing_not_allowed: true
    },
    accessibility: {
      wcag_min_contrast: "AA",
      avoid_full_saturation_backgrounds: true
    },
    responsiveness: {
      desktop: true,
      tablet: true,
      mobile: true
    }
  }
} as const;

// HSL versions for CSS custom properties
export const THEME_HSL = {
  brand: {
    primary: "222 47% 33%",          // #1E3A8A
    primaryHover: "222 47% 28%",
    primaryLight: "222 47% 95%",
    secondary: "171 75% 24%",        // #0F766E
    secondaryHover: "171 75% 20%",
    secondaryLight: "171 75% 95%",
    accent: "243 75% 43%",           // #3730A3
    accentLight: "243 75% 95%",
    neutral: "215 25% 27%"           // #334155
  },
  backgrounds: {
    app: "210 40% 98%",              // #F8FAFC
    surface: "0 0% 100%",            // #FFFFFF
    muted: "213 27% 96%",            // #F1F5F9
    divider: "214 32% 89%"           // #E2E8F0
  },
  text: {
    primary: "222 47% 11%",          // #0F172A
    secondary: "215 20% 35%",        // #475569
    muted: "215 16% 47%",            // #64748B
    inverse: "0 0% 100%"             // #FFFFFF
  },
  status: {
    success: "142 76% 36%",          // #16A34A - Favourable
    successPartial: "84 81% 44%",    // #65A30D - Partial Relief
    pending: "217 91% 60%",          // #2563EB - Pending
    warning: "38 92% 50%",           // #F59E0B - Attention
    overdue: "0 84% 50%",            // #DC2626 - Overdue/Risk
    info: "199 89% 48%"              // #0284C7 - Informational
  },
  alerts: {
    critical: "0 84% 50%",           // #DC2626
    important: "38 92% 50%",         // #F59E0B
    neutral: "217 91% 60%"           // #2563EB
  }
} as const;

export type ThemeName = keyof typeof THEME_CONFIG.themes;
