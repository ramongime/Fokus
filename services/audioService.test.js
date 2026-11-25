import {
  createAudioPlayer,
  createMockPlayer,
  setAudioModeAsync,
} from "expo-audio";
import {
  cancelCycleAlarms,
  playCycleSound,
  prepareCycleSounds,
  releaseCycleSounds,
  scheduleCycleAlarms,
} from "./audioService";

jest.mock("../assets/sounds/focus.wav", () => "focus-sound-asset");
jest.mock("../assets/sounds/pause.wav", () => "break-sound-asset");

function getPlayerForAsset(assetName) {
  const callIndex = createAudioPlayer.mock.calls.findIndex(
    ([source]) => source === assetName,
  );
  if (callIndex === -1) return null;
  return createAudioPlayer.mock.results[callIndex]?.value ?? null;
}

describe("audioService (native)", () => {
  let warnSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    setAudioModeAsync.mockImplementation(() => Promise.resolve());
    createAudioPlayer.mockImplementation(() => createMockPlayer());
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    releaseCycleSounds();
    warnSpy.mockRestore();
  });

  it("configura o modo de áudio em primeiro plano e pré-carrega os sons de foco e pausa", async () => {
    await prepareCycleSounds();

    expect(setAudioModeAsync).toHaveBeenCalledTimes(1);
    expect(setAudioModeAsync).toHaveBeenCalledWith({
      playsInSilentMode: true,
      interruptionMode: "mixWithOthers",
      allowsRecording: false,
      shouldPlayInBackground: false,
    });
    expect(createAudioPlayer).toHaveBeenCalledTimes(2);
    expect(createAudioPlayer).toHaveBeenCalledWith("focus-sound-asset");
    expect(createAudioPlayer).toHaveBeenCalledWith("break-sound-asset");
  });

  it("libera os players pré-carregados com remove() e permite novo preparo mesmo se um remove() falhar", async () => {
    await prepareCycleSounds();
    const [firstPlayer, secondPlayer] = createAudioPlayer.mock.results.map(
      (result) => result.value,
    );
    firstPlayer.remove.mockImplementationOnce(() => {
      throw new Error("remove failed");
    });

    expect(() => releaseCycleSounds()).not.toThrow();

    expect(firstPlayer.remove).toHaveBeenCalledTimes(1);
    expect(secondPlayer.remove).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);

    // Nova liberação quando já está vazio é inofensiva
    expect(() => releaseCycleSounds()).not.toThrow();
    expect(firstPlayer.remove).toHaveBeenCalledTimes(1);
    expect(secondPlayer.remove).toHaveBeenCalledTimes(1);

    // Após liberar, um novo preparo volta a configurar o áudio e criar players
    await prepareCycleSounds();
    expect(setAudioModeAsync).toHaveBeenCalledTimes(2);
    expect(createAudioPlayer).toHaveBeenCalledTimes(4);
  });

  it("é idempotente após o preparo concluído sem recriar players", async () => {
    await prepareCycleSounds();
    await prepareCycleSounds();

    expect(setAudioModeAsync).toHaveBeenCalledTimes(1);
    expect(createAudioPlayer).toHaveBeenCalledTimes(2);
  });

  it("coalesce chamadas concorrentes de prepareCycleSounds sem criar players duplicados", async () => {
    let resolveAudioMode;
    setAudioModeAsync.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveAudioMode = resolve;
        }),
    );

    const firstCall = prepareCycleSounds();
    const secondCall = prepareCycleSounds();

    resolveAudioMode();
    await Promise.all([firstCall, secondCall]);

    expect(setAudioModeAsync).toHaveBeenCalledTimes(1);
    expect(createAudioPlayer).toHaveBeenCalledTimes(2);
  });

  it("prepara preguiçosamente, rebobina com seekTo(0) e só então toca o som de foco", async () => {
    let resolveSeek;
    let notifySeekStarted;
    const seekStarted = new Promise((resolve) => {
      notifySeekStarted = resolve;
    });

    createAudioPlayer.mockImplementation((source) => {
      const player = createMockPlayer();
      if (source === "focus-sound-asset") {
        player.seekTo.mockImplementation(() => {
          notifySeekStarted();
          return new Promise((resolve) => {
            resolveSeek = resolve;
          });
        });
      }
      return player;
    });

    const playPromise = playCycleSound("focus");
    await seekStarted;

    const focusPlayer = getPlayerForAsset("focus-sound-asset");
    const breakPlayer = getPlayerForAsset("break-sound-asset");

    expect(setAudioModeAsync).toHaveBeenCalledTimes(1);
    expect(focusPlayer.seekTo).toHaveBeenCalledWith(0);
    expect(focusPlayer.play).not.toHaveBeenCalled();

    resolveSeek();
    await playPromise;

    expect(focusPlayer.play).toHaveBeenCalledTimes(1);
    expect(breakPlayer.seekTo).not.toHaveBeenCalled();
    expect(breakPlayer.play).not.toHaveBeenCalled();
  });

  it("toca o som de pausa (pause.wav) para Pausa Curta e Pausa Longa quando distinctSounds está ativo", async () => {
    await prepareCycleSounds();
    const focusPlayer = getPlayerForAsset("focus-sound-asset");
    const breakPlayer = getPlayerForAsset("break-sound-asset");

    await playCycleSound("short");
    await playCycleSound("long", { distinctSounds: true });

    expect(breakPlayer.seekTo).toHaveBeenCalledTimes(2);
    expect(breakPlayer.seekTo).toHaveBeenNthCalledWith(1, 0);
    expect(breakPlayer.seekTo).toHaveBeenNthCalledWith(2, 0);
    expect(breakPlayer.play).toHaveBeenCalledTimes(2);
    expect(focusPlayer.play).not.toHaveBeenCalled();
  });

  it("toca o som padrão (focus.wav) também para pausas quando distinctSounds é false", async () => {
    await prepareCycleSounds();
    const focusPlayer = getPlayerForAsset("focus-sound-asset");
    const breakPlayer = getPlayerForAsset("break-sound-asset");

    await playCycleSound("short", { distinctSounds: false });
    await playCycleSound("long", { distinctSounds: false });
    await playCycleSound("focus", { distinctSounds: false });

    expect(focusPlayer.seekTo).toHaveBeenCalledTimes(3);
    expect(focusPlayer.play).toHaveBeenCalledTimes(3);
    expect(breakPlayer.seekTo).not.toHaveBeenCalled();
    expect(breakPlayer.play).not.toHaveBeenCalled();
  });

  it("captura falha em setAudioModeAsync com console.warn e permite retry futuro", async () => {
    setAudioModeAsync.mockRejectedValueOnce(new Error("audio session error"));

    await expect(prepareCycleSounds()).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(createAudioPlayer).not.toHaveBeenCalled();

    // Retry deve funcionar normalmente
    await playCycleSound("focus");

    const focusPlayer = getPlayerForAsset("focus-sound-asset");
    expect(setAudioModeAsync).toHaveBeenCalledTimes(2);
    expect(focusPlayer.seekTo).toHaveBeenCalledWith(0);
    expect(focusPlayer.play).toHaveBeenCalledTimes(1);
  });

  it("limpa player parcialmente criado se createAudioPlayer falhar no segundo som e permite retry", async () => {
    const partialPlayer = createMockPlayer();
    createAudioPlayer
      .mockImplementationOnce(() => partialPlayer)
      .mockImplementationOnce(() => {
        throw new Error("decode failed");
      });

    await expect(prepareCycleSounds()).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(partialPlayer.remove).toHaveBeenCalledTimes(1);

    // Retry deve criar ambos os players do zero e conseguir tocar
    await playCycleSound("short");

    expect(createAudioPlayer).toHaveBeenCalledTimes(4);
    const retryBreakPlayer = createAudioPlayer.mock.results
      .slice(2)
      .find(
        (_, idx) =>
          createAudioPlayer.mock.calls[idx + 2][0] === "break-sound-asset",
      )?.value;
    expect(retryBreakPlayer.seekTo).toHaveBeenCalledWith(0);
    expect(retryBreakPlayer.play).toHaveBeenCalledTimes(1);
  });

  it("captura erro em seekTo(0) com console.warn sem lançar exceção nem chamar play()", async () => {
    await prepareCycleSounds();
    const focusPlayer = getPlayerForAsset("focus-sound-asset");
    focusPlayer.seekTo.mockRejectedValueOnce(new Error("seek failed"));

    await expect(playCycleSound("focus")).resolves.toBeUndefined();

    expect(focusPlayer.play).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("captura erro em play() com console.warn sem lançar exceção", async () => {
    await prepareCycleSounds();
    const breakPlayer = getPlayerForAsset("break-sound-asset");
    breakPlayer.play.mockImplementationOnce(() => {
      throw new Error("playback failed");
    });

    await expect(playCycleSound("short")).resolves.toBeUndefined();

    expect(breakPlayer.seekTo).toHaveBeenCalledWith(0);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("descarta preparo em voo quando releaseCycleSounds() é chamado durante setAudioModeAsync", async () => {
    let resolveAudioMode;
    setAudioModeAsync.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveAudioMode = resolve;
        }),
    );

    const stalePrepare = prepareCycleSounds();
    releaseCycleSounds();

    resolveAudioMode();
    await stalePrepare;

    expect(createAudioPlayer).not.toHaveBeenCalled();

    // Um novo preparo após a liberação deve funcionar normalmente
    await prepareCycleSounds();
    expect(setAudioModeAsync).toHaveBeenCalledTimes(2);
    expect(createAudioPlayer).toHaveBeenCalledTimes(2);
  });

  it("não chama play() em player já liberado se releaseCycleSounds() ocorrer durante seekTo(0)", async () => {
    await prepareCycleSounds();
    const focusPlayer = getPlayerForAsset("focus-sound-asset");

    let resolveSeek;
    let notifySeekStarted;
    const seekStarted = new Promise((resolve) => {
      notifySeekStarted = resolve;
    });
    focusPlayer.seekTo.mockImplementationOnce(() => {
      notifySeekStarted();
      return new Promise((resolve) => {
        resolveSeek = resolve;
      });
    });

    const playPromise = playCycleSound("focus");
    await seekStarted;

    releaseCycleSounds();
    resolveSeek();
    await playPromise;

    expect(focusPlayer.remove).toHaveBeenCalledTimes(1);
    expect(focusPlayer.play).not.toHaveBeenCalled();
  });

  it("expõe scheduleCycleAlarms e cancelCycleAlarms como no-ops assíncronos no nativo", async () => {
    await expect(
      scheduleCycleAlarms([{ typeId: "focus", date: Date.now() + 60_000 }], {
        distinctSounds: true,
      }),
    ).resolves.toBeUndefined();
    await expect(cancelCycleAlarms()).resolves.toBeUndefined();

    expect(setAudioModeAsync).not.toHaveBeenCalled();
    expect(createAudioPlayer).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
