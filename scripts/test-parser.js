const { parseArtistName, sanitizeFilename, parseMonthFolder } = require('../lib/filename-parser');

console.log('Testing parseArtistName:');
console.log(parseArtistName('USTAKNOW - Chaos Drone.ogg')); // → "USTAKNOW"
console.log(parseArtistName('Mikey_Hogan_Drone.wav')); // → "Mikey"
console.log(parseArtistName('SomeDrone.mp3')); // → "SomeDrone"

console.log('\nTesting sanitizeFilename:');
console.log(sanitizeFilename('USTAKNOW - Chaos Drone.ogg')); // → "ustaknow-chaos-drone.ogg"
console.log(sanitizeFilename('Mikey & The Gang!!!.wav')); // → "mikey-the-gang.wav"

console.log('\nTesting parseMonthFolder:');
console.log(parseMonthFolder('2025-04')); // → { id: "2025-04", name: "April 2025", theme: null }
console.log(parseMonthFolder('2025-04 Chaos')); // → { id: "2025-04", name: "April 2025", theme: "Chaos" }
console.log(parseMonthFolder('2025-05 D Minor')); // → { id: "2025-05", name: "May 2025", theme: "D Minor" }
console.log(parseMonthFolder('invalid')); // → null
