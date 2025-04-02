import React from 'react';
import { useAudio } from '../lib/stores/useAudio';

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
    toggleSound,
    toggleMusic,
    setSoundVolume,
    setMusicVolume
  } = useAudio();
  
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
        
        <div className="flex items-center">
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
      </div>
      
      <div>
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
    </div>
  );
};