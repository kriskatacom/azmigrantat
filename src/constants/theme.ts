export const lightTheme = {
  colors: {
    primary: "#2563eb",
    secondary: "#3b82f6",

    background: "#f9f9f9",
    surface: "#efefef",
    card: "#ffffff",

    text: "#18181b",
    textSecondary: "#71717a",

    border: "#efefef",

    success: "#16a34a",
    warning: "#f59e0b",
    danger: "#dc2626",

    icon: "#4b5563",

    button: "#2563eb",
    buttonText: "#ffffff",

    input: "#ffffff",
    inputBorder: "#d4d4d8",
    placeholder: "#9ca3af",
  },
};

export const darkTheme = {
  colors: {
    primary: "#3b82f6",
    secondary: "#60a5fa",

    background: "#09090b",
    surface: "#18181b",
    card: "#27272a",

    text: "#ffffff",
    textSecondary: "#a1a1aa",

    border: "#3f3f46",

    success: "#22c55e",
    warning: "#fbbf24",
    danger: "#ef4444",

    icon: "#ffffff",

    button: "#2563eb",
    buttonText: "#ffffff",

    input: "#18181b",
    inputBorder: "#3f3f46",
    placeholder: "#71717a",
  },
};

export type AppTheme = typeof lightTheme;
