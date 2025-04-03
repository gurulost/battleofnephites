import React from 'react';
import { useAudio } from '../lib/stores/useAudio';
import { SoundMode } from '../lib/services/SoundService';

/**
 * Component for controlling audio settings
 * Allows toggling music and sound effects and adjusting their volume
 */
export const AudioSettings: React.FC = () => {
  const {
    soundEnabled,
    musicEnabled,
    soundVolume,
    musicVolume,
    soundMode,
    toggleSound,
    toggleMusic,
    setSoundVolume,
    setMusicVolume,
    setSoundMode
  } = useAudio();
  
  // Descriptions for sound modes
  const soundModeDescriptions = {
    'procedural': 'Uses generated sounds only, low memory usage',
    'recorded': 'Uses pre-recorded sounds for better quality',
    'hybrid': 'Uses pre-recorded when available, falls back to generated'
  };
  
  return (
    <div className="audio-settings p-4 bg-gray-800 rounded-md text-white">
      <h3 className="text-lg font-bold mb-4">Audio Settings</h3>
      
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={toggleSound}
              className="sr-only"
            />
            <div className={`toggle-bg w-11 h-6 bg-gray-700 rounded-full p-1 transition-colors duration-200 ease-in-out ${soundEnabled ? 'bg-green-600' : ''}`}>
              <div className={`toggle-dot bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ease-in-out ${soundEnabled ? 'translate-x-5' : ''}`}></div>
            </div>
            <span className="ml-3 font-medium text-white">Sound Effects</span>
          </label>
        </div>
        
        <div className="flex items-center mb-3">
          <span className="mr-2 text-sm w-10">Volume</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={soundVolume}
            onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
            disabled={!soundEnabled}
            className="w-full accent-green-500"
          />
          <span className="ml-2 text-sm w-10">{Math.round(soundVolume * 100)}%</span>
        </div>
        
        {/* Sound mode selector */}
        <div className="mt-3 mb-4">
          <label className="block text-sm font-medium mb-2">Sound Generation Mode</label>
          <div className="grid grid-cols-3 gap-2">
            {(['procedural', 'hybrid', 'recorded'] as SoundMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setSoundMode(mode)}
                className={`py-1 px-2 rounded text-sm transition-colors ${
                  soundMode === mode 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {soundModeDescriptions[soundMode]}
          </p>
        </div>
      </div>
      
      <div className="border-t border-gray-700 pt-4">
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={musicEnabled}
              onChange={toggleMusic}
              className="sr-only"
            />
            <div className={`toggle-bg w-11 h-6 bg-gray-700 rounded-full p-1 transition-colors duration-200 ease-in-out ${musicEnabled ? 'bg-green-600' : ''}`}>
              <div className={`toggle-dot bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ease-in-out ${musicEnabled ? 'translate-x-5' : ''}`}></div>
            </div>
            <span className="ml-3 font-medium text-white">Music</span>
          </label>
        </div>
        
        <div className="flex items-center">
          <span className="mr-2 text-sm w-10">Volume</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={musicVolume}
            onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
            disabled={!musicEnabled}
            className="w-full accent-green-500"
          />
          <span className="ml-2 text-sm w-10">{Math.round(musicVolume * 100)}%</span>
        </div>
      </div>
      
      <div className="mt-4 text-xs text-gray-400">
        <p className="mb-1">
          <strong>Note:</strong> Some browsers may require user interaction before playing audio.
        </p>
        <p>
          The game uses a combination of procedurally generated and pre-recorded sounds for cultural authenticity.
        </p>
      </div>
    </div>
  );
};