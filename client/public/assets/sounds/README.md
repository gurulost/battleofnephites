# Sound Assets

This directory contains the sound effects for the Battles of the Covenant game.

## Sound Files
- `attack.mp3`: Played when a unit attacks
- `build.mp3`: Played when a building is constructed
- `gather.mp3`: Played when a worker gathers resources
- `move.mp3`: Played when a unit moves
- `select.mp3`: Played when selecting units or UI elements
- `unit-created.mp3`: Played when a new unit is trained
- `victory.mp3`: Played on victory
- `defeat.mp3`: Played on defeat

## Adding New Sound Effects
When adding new sound effects, make sure they are:
1. In MP3 format
2. Short in duration (typically less than 3 seconds)
3. Named consistently with the existing naming scheme
4. Added to the `soundFiles` object in the `useAudio.tsx` file