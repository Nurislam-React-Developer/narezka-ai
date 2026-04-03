// Утилита для воспроизведения уведомлений через Web Audio API

/**
 * Приятный успех-звук: три восходящие ноты (До-Ми-Соль)
 * Мягкий тон, напоминает iOS/macOS уведомления.
 */
export function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.18, ctx.currentTime);
    master.connect(ctx.destination);

    // До-Ми-Соль (C5, E5, G5) — мажорный аккорд по очереди
    const notes = [
      { freq: 523.25, start: 0,    dur: 0.18 }, // C5
      { freq: 659.25, start: 0.13, dur: 0.18 }, // E5
      { freq: 783.99, start: 0.26, dur: 0.28 }, // G5
    ];

    notes.forEach(({ freq, start, dur }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

      // Мягкая атака + плавное затухание (без щелчков)
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(1, ctx.currentTime + start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);

      osc.connect(gain);
      gain.connect(master);

      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.01);
    });

    // Закрываем контекст после воспроизведения
    setTimeout(() => ctx.close(), 800);
  } catch (err) {
    console.warn("Audio API не доступен:", err);
  }
}

/**
 * Звук ошибки: две нисходящие ноты
 */
export function playErrorSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.15, ctx.currentTime);
    master.connect(ctx.destination);

    const notes = [
      { freq: 440, start: 0,    dur: 0.15 }, // A4
      { freq: 330, start: 0.18, dur: 0.25 }, // E4
    ];

    notes.forEach(({ freq, start, dur }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(1, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);

      osc.connect(gain);
      gain.connect(master);

      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.01);
    });

    setTimeout(() => ctx.close(), 700);
  } catch (err) {
    console.warn("Audio API не доступен:", err);
  }
}

// Оставляем для обратной совместимости
export const playSimpleBeep = playNotificationSound;
