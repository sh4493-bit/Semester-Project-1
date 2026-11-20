export const PUBLIC_PROFILE_THEMES = {
  sunset: {
    label: "After Hours",
    description: "Warm sunset colors",
    page: "bg-[#fff1e8] text-[#35201b]",
    card: "border-[#f3c7b1] bg-white/80",
    accent: "text-[#c2410c]",
    swatch: "bg-gradient-to-br from-orange-300 via-rose-300 to-pink-400",
  },
  ocean: {
    label: "Deep Dive",
    description: "Cool ocean blues",
    page: "bg-[#eaf7ff] text-[#102b42]",
    card: "border-[#b8dff3] bg-white/80",
    accent: "text-[#0369a1]",
    swatch: "bg-gradient-to-br from-cyan-300 via-sky-400 to-blue-500",
  },
  grape: {
    label: "Oddball",
    description: "Playful purple tones",
    page: "bg-[#f5edff] text-[#2e1b45]",
    card: "border-[#d9c4f2] bg-white/80",
    accent: "text-[#7e22ce]",
    swatch: "bg-gradient-to-br from-violet-300 via-fuchsia-400 to-purple-500",
  },
  lime: {
    label: "Green Room",
    description: "Bright, fresh greens",
    page: "bg-[#effbe9] text-[#1f351d]",
    card: "border-[#c9e6bb] bg-white/80",
    accent: "text-[#3f7a20]",
    swatch: "bg-gradient-to-br from-lime-300 via-emerald-300 to-green-500",
  },
} as const;

export type PublicProfileTheme = keyof typeof PUBLIC_PROFILE_THEMES;

export const isPublicProfileTheme = (value: string): value is PublicProfileTheme =>
  Object.hasOwn(PUBLIC_PROFILE_THEMES, value);

export const isValidUsername = (value: string) =>
  /^[a-z0-9][a-z0-9_-]{2,19}$/.test(value);
