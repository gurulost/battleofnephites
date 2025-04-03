# Sound Assets

This directory contains the sound effects for the Battles of the Covenant game. Currently, these files are placeholder MP3 files, as the game uses procedurally generated audio through the Web Audio API instead of pre-recorded sound files.

## Sound Files
- `attack.mp3`: Played when a unit attacks
- `build.mp3`: Played when a building is constructed
- `gather.mp3`: Played when a worker gathers resources
- `move.mp3`: Played when a unit moves
- `select.mp3`: Played when selecting units or UI elements
- `unit-created.mp3`: Played when a new unit is trained
- `victory.mp3`: Played on victory
- `defeat.mp3`: Played on defeat

## Audio Implementation
The game uses the Web Audio API to generate culturally appropriate, procedural audio for each of these events instead of loading pre-recorded audio files. The audio generation logic can be found in:

- `client/src/lib/utils/audioUtils.ts`: Core audio generation functions
- `client/src/lib/services/SoundService.ts`: Service for playing sounds
- `client/src/lib/stores/useAudio.tsx`: State management for audio settings

This approach allows for more dynamic and varied sound effects while keeping the application size small.

## Adding New Sound Effects
When adding new sound effects, you can:

1. Add procedural generation logic in the audioUtils.ts file
2. Register the new sound in the SoundService class
3. Update the useAudio store to include any new settings
4. Place placeholder MP3 files in this directory to maintain compatibility with the file structure