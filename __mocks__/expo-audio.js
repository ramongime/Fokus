export const createMockPlayer = () => ({
  play: jest.fn(),
  pause: jest.fn(),
  seekTo: jest.fn(() => Promise.resolve()),
  remove: jest.fn(),
});

export const setAudioModeAsync = jest.fn(() => Promise.resolve());
export const createAudioPlayer = jest.fn(() => createMockPlayer());
