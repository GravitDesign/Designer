// Old: designer.browser.dev.js module 443 (the Microsoft Teams runtime helper).
/**
 * Whether the app runs inside Microsoft Teams. The Teams integration is
 * dropped with the cloud (PORT-PLAN, drop reasons), so the local app never
 * runs there: every check answers false. Only the answers the rest of the
 * app reads are kept; the Teams SDK calls (initialize, context, locale,
 * authentication) are gone.
 */
export const TeamsMode = {
  DESKTOP: { label: "Desktop", code: "desktop" },
  WEB: { label: "Web", code: "web" },
  IOS: { label: "Ios", code: "ios" },
  ANDROID: { label: "Android", code: "android" },
  OTHER: { label: "Other" },
} as const;

export const runtime = {
  TeamsMode,
  isExecutingOnMSTeams: (): Promise<boolean> => Promise.resolve(false),
  isExecutingOnChannelOrChat: (): Promise<boolean> => Promise.resolve(false),
  isExecutingOnChannelOrChatSingletonPromise: (): Promise<boolean> => Promise.resolve(false),
  isExecutingOnMSTeamsSync: (): boolean => false,
};
