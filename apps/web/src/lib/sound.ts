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

// Tracking active sound timers for cleanup
let activeTimers: number[] = [];

// Cleanup function to stop all sounds and clear timers
export function stopAllSounds(): void {
  // Clear all active timers
  activeTimers.forEach(timerId => window.clearInterval(timerId));
  activeTimers = [];
  
  // Stop all sounds
  Object.values(sounds).forEach(sound => {
    if (sound) {
      sound.pause();
      sound.currentTime = 0;
    }
  });
}

// Function to clear all registered timers without stopping sounds
export function clearAllTimers(): void {
  console.log(`Clearing ${activeTimers.length} active timers`);
  
  // Clear all timeouts and intervals
  activeTimers.forEach(timerId => {
    try {
      // Try to clear as both timeout and interval since we might not know which one it is
      window.clearTimeout(timerId);
      window.clearInterval(timerId);
    } catch (e) {
      console.error(`Error clearing timer ${timerId}:`, e);
    }
  });
  
  // Reset timer array
  activeTimers = [];
}

// Initialize sounds
export function initSounds(): void {
  // Stop any existing sounds first
  stopAllSounds();
  
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
    // Reset the audio to make sure it starts from the beginning
    sound.pause();
    sound.currentTime = 0;
    
    // Set volume and play with error handling
    sound.volume = volume;
    
    // Use a promise to handle the play gracefully
    const playPromise = sound.play();
    
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        // Ignore abort errors as they're common when sounds are played in quick succession
        if (error.name !== 'AbortError') {
          console.warn(`Failed to play sound ${name}:`, error);
        }
      });
    }
  } catch (error) {
    console.warn(`Error playing sound ${name}:`, error);
  }
}

// Register a timer for cleanup
export function registerTimer(timerId: number): void {
  activeTimers.push(timerId);
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
  stop: stopAllSounds,
  registerTimer,
  vibrate,
  clearAllTimers,
}; 