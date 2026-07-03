const KEY = 'bubblepop.sound';

export function loadSoundOn() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw === null ? true : raw === '1';
  } catch (e) {
    return true;
  }
}

export function saveSoundOn(on) {
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { /* ignore */ }
}
