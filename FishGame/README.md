# Tragedy of the Commons - Fishing Game

A multiplayer web-based game that simulates the "Tragedy of the Commons" scenario in a fishing context. Players must balance their individual gains with the sustainability of the shared fishing resource.

## Features

- Real-time multiplayer gameplay using Firebase
- Game Master control panel for managing game settings
- Three different boat types with varying capacities
- Dynamic fish population management
- Player statistics tracking
- Responsive design for mobile devices

## Setup Instructions

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Realtime Database in your Firebase project
3. Get your Firebase configuration from Project Settings
4. Replace the Firebase configuration in `game.js` with your own:
   ```javascript
   const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_AUTH_DOMAIN",
       databaseURL: "YOUR_DATABASE_URL",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_STORAGE_BUCKET",
       messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
       appId: "YOUR_APP_ID"
   };
   ```

## How to Play

### Game Master
1. Enter your name and click "Create New Room"
2. Configure game settings:
   - Maximum fish population
   - Initial fish population
   - Fish survival threshold
   - Starting money for players
   - Round time limit
3. Share the room code with players
4. Click "Start Game" when all players are ready
5. Monitor player activities and manage the game

### Players
1. Enter the room code provided by the Game Master
2. Enter your name and click "Join Room"
3. During each round:
   - Move your boat to catch fish
   - Sell fish to earn money
   - Upgrade your boat to increase fishing capacity
4. Try to maximize your earnings while maintaining sustainable fish population

## Game Rules

- Each boat type has different fishing capacities:
  - Small Boat: 10 fish per round
  - Medium Boat: 15 fish per round
  - Large Boat: 20 fish per round
- Fish price: $5 per fish
- Boat upgrade costs:
  - Medium Boat: $50
  - Large Boat: $100
- Game ends if fish population falls below the survival threshold

## Technical Requirements

- Modern web browser with JavaScript enabled
- Internet connection for Firebase integration
- Touch screen device recommended for mobile play

## Development

The game is built using:
- HTML5
- CSS3
- JavaScript
- Firebase Realtime Database

## License

This project is open source and available under the MIT License. 