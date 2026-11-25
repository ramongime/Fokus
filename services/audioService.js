import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

const FOCUS_SOUND = require("../assets/sounds/focus.wav");
const BREAK_SOUND = require("../assets/sounds/break.wav");

const FOREGROUND_AUDIO_MODE = {
  playsInSilentMode: true,
  interruptionMode: "mixWithOthers",
  allowsRecording: false,
  shouldPlayInBackground: false,
};

let players = null;
let preparePromise = null;
let generation = 0;

function safeRemovePlayer(player) {
  if (!player) return;
  try {
    player.remove();
  } catch (error) {
    console.warn("Falha ao liberar player de áudio de ciclo:", error);
  }
}

export async function prepareCycleSounds() {
  if (players) return;
  if (preparePromise) {
    await preparePromise;
    return;
  }

  const currentGeneration = generation;
  const currentPromise = (async () => {
    let focusPlayer = null;
    let breakPlayer = null;
    try {
      await setAudioModeAsync(FOREGROUND_AUDIO_MODE);
      if (currentGeneration !== generation) return;

      focusPlayer = createAudioPlayer(FOCUS_SOUND);
      breakPlayer = createAudioPlayer(BREAK_SOUND);
      players = { focus: focusPlayer, break: breakPlayer };
    } catch (error) {
      safeRemovePlayer(focusPlayer);
      safeRemovePlayer(breakPlayer);
      if (currentGeneration === generation) {
        players = null;
      }
      console.warn("Falha ao preparar sons de ciclo:", error);
    }
  })().finally(() => {
    if (preparePromise === currentPromise) {
      preparePromise = null;
    }
  });

  preparePromise = currentPromise;
  await currentPromise;
}

export async function playCycleSound(typeId, { distinctSounds = true } = {}) {
  await prepareCycleSounds();
  const currentGeneration = generation;
  const soundKey = !distinctSounds || typeId === "focus" ? "focus" : "break";
  const player = players?.[soundKey];
  if (!player) return;

  try {
    await player.seekTo(0);
    if (currentGeneration !== generation || players?.[soundKey] !== player) {
      return;
    }
    player.play();
  } catch (error) {
    console.warn("Falha ao reproduzir som de ciclo:", error);
  }
}

export async function scheduleCycleAlarms(_items = [], _options = {}) {}

export async function cancelCycleAlarms() {}

export function releaseCycleSounds() {
  generation += 1;
  preparePromise = null;
  const currentPlayers = players;
  players = null;

  if (!currentPlayers) return;

  safeRemovePlayer(currentPlayers.focus);
  safeRemovePlayer(currentPlayers.break);
}
