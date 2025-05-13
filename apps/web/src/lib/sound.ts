/**
 * Sound utility for managing audio effects
 */

// Sound URLs 
const SOUND_PATHS = {
  tick: '/sounds/tick.mp3',
  win: '/sounds/win.mp3',
  lose: '/sounds/lose.mp3',
  click: '/sounds/click.mp3',
};

// Sound instances
const sounds: Record<string, HTMLAudioElement | null> = {};

// Initialize sounds
export function initSounds(): void {
  Object.entries(SOUND_PATHS).forEach(([key, path]) => {
    try {
      const audio = new Audio(path);
      audio.preload = 'auto';
      sounds[key] = audio;
    } catch (error) {
      console.error(`Failed to load sound: ${path}`, error);
      sounds[key] = null;
    }
  });
}

// Play a sound
export function playSound(name: keyof typeof SOUND_PATHS, volume = 1.0): void {
  const sound = sounds[name];
  if (!sound) {
    console.warn(`Sound ${name} not loaded`);
    return;
  }

  try {
    // Stop and reset the sound first
    sound.pause();
    sound.currentTime = 0;
    sound.volume = volume;
    
    // Play the sound
    sound.play().catch(error => {
      console.warn(`Failed to play sound ${name}:`, error);
    });
  } catch (error) {
    console.error(`Error playing sound ${name}:`, error);
  }
}

// Vibration API utility
export function vibrate(pattern: number | number[]): void {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (error) {
      console.warn('Vibration failed:', error);
    }
  }
}

export default {
  init: initSounds,
  play: playSound,
  vibrate,
}; 