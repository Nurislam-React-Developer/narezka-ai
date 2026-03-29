// Утилита для воспроизведения уведомлений

// Синтезируем звук с помощью Web Audio API
export function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioContext.currentTime;

    // Создаём мелодию: две нноты (как в уведомлениях телефона)
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Первая нота: высокая (C6 ~ 1047 Hz)
    oscillator1.frequency.setValueAtTime(1047, now);
    oscillator1.frequency.setValueAtTime(1047, now + 0.1);
    oscillator1.start(now);
    oscillator1.stop(now + 0.1);

    // Вторая нота: очень высокая (G6 ~ 1568 Hz)
    oscillator2.frequency.setValueAtTime(1568, now + 0.15);
    oscillator2.frequency.setValueAtTime(1568, now + 0.25);
    oscillator2.start(now + 0.15);
    oscillator2.stop(now + 0.25);

    // Громкость: быстрое появление и затухание
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.02);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.25);
  } catch (err) {
    console.warn('Audio API не доступен:', err);
  }
}

// Альтернативный вариант: простой короткий тон
export function playSimpleBeep() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, now);
    oscillator.start(now);
    oscillator.stop(now + 0.1);

    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.1);
  } catch (err) {
    console.warn('Audio API не доступен:', err);
  }
}
