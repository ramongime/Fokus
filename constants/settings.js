export const DEFAULT_SETTINGS = {
  autoStartCycles: true,
  longBreakInterval: 4,
  // Em minutos
  durations: {
    focus: 25,
    short: 5,
    long: 15,
  },
};

export const SETTINGS_LIMITS = {
  durations: {
    focus: { min: 1, max: 90 },
    short: { min: 1, max: 30 },
    long: { min: 1, max: 60 },
  },
  longBreakInterval: { min: 2, max: 8 },
};
