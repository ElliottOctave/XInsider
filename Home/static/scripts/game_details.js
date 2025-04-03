const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get("gameId");

const lineupsCsvPath = "../../data/game_lineups.csv";
const playersCsvPath = "../../data/players.csv";

const positionCoordinates = {
  // LEFT TEAM
  "Goalkeeper_left": { x: 10, y: 50 },
  "Left-Back_left": { x: 25, y: 20 },
  "Right-Back_left": { x: 25, y: 80 },
  "Centre-Back_left": [
    { x: 20, y: 40 },
    { x: 20, y: 60 }
  ],
  "Defensive Midfield_left": [
    { x: 27, y: 50 },
    { x: 30, y: 60 }
  ],
  "Central Midfield_left": [
    { x: 33, y: 35 },
    { x: 33, y: 65 }
  ],
  "Attacking Midfield_left": [
    { x: 33, y: 65 },
    { x: 33, y: 35 }
  ],
  "Left Winger_left": { x: 40, y: 20 },
  "Right Winger_left": { x: 40, y: 80 },
  "Centre-Forward_left": { x: 40, y: 50 },

  // RIGHT TEAM (mirrored)
  "Goalkeeper_right": { x: 90, y: 50 },
  "Left-Back_right": { x: 75, y: 80 },
  "Right-Back_right": { x: 75, y: 20 },
  "Centre-Back_right": [
    { x: 80, y: 60 },
    { x: 80, y: 40 }
  ],
  "Defensive Midfield_right": [
    { x: 73, y: 50 },
    { x: 70, y: 40 }
  ],
  "Central Midfield_right": [
    { x: 67, y: 65 },
    { x: 67, y: 35 }
  ],
  "Attacking Midfield_right": [
    { x: 67, y: 35 },
    { x: 67, y: 65 }
  ],
  "Left Winger_right": { x: 60, y: 80 },
  "Right Winger_right": { x: 60, y: 20 },
  "Centre-Forward_right": { x: 60, y: 50 }
};

let positionCounts = {
  "Centre-Back_left": 0,
  "Centre-Back_right": 0,
  "Defensive Midfield_left": 0,
  "Defensive Midfield_right": 0,
  "Central Midfield_left": 0,
  "Central Midfield_right": 0
};

Promise.all([
  fetch(lineupsCsvPath).then(res => res.text()),
  fetch(playersCsvPath).then(res => res.text())
])
  .then(([lineupsCsv, playersCsv]) => {
    const parseCsv = (csvText) => {
      const rows = csvText.trim().split('\n');
      const headers = rows[0].split(',');
      return rows.slice(1).map(row => {
        const values = row.split(',');
        const obj = {};
        headers.forEach((header, i) => {
          obj[header.trim()] = values[i]?.trim();
        });
        return obj;
      });
    };

    const allLineups = parseCsv(lineupsCsv);
    const allPlayers = parseCsv(playersCsv);

    const gameLineup = allLineups.filter(
      p => p.game_id === gameId && p.type === "starting_lineup"
    );

    if (gameLineup.length === 0) {
      console.warn("No starting lineup found for gameId:", gameId);
      return;
    }

    const leftClub = gameLineup[0].club_id;
    const rightClub = gameLineup.find(p => p.club_id !== leftClub)?.club_id;

    const overlay = document.getElementById("pitch-overlay");

    gameLineup.forEach(player => {
      const fullPlayer = allPlayers.find(p => p.player_id === player.player_id);
      if (!fullPlayer || !fullPlayer.image_url) return;

      const isLeft = player.club_id === leftClub;
      const side = isLeft ? "left" : "right";
      const key = `${player.position}_${side}`;
      const pos = positionCoordinates[key];

      if (!pos) return;

      let x, y;

      if (Array.isArray(pos)) {
        const index = positionCounts[key] || 0;
        if (index >= pos.length) return;
        x = pos[index].x;
        y = pos[index].y;
        positionCounts[key] = index + 1;
      } else {
        x = pos.x;
        y = pos.y;
      }

      const img = document.createElement("img");
      img.className = "player-img";
      img.src = fullPlayer.image_url;
      img.alt = fullPlayer.name;
      img.title = fullPlayer.name;
      img.style.left = `${x}%`;
      img.style.top = `${y}%`;

      overlay.appendChild(img);
    });
  })
  .catch(err => {
    console.error("Failed to load lineups or players:", err);
  });