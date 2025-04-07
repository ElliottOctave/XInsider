const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get("gameId");

const lineupsCsvPath = "../../data/game_lineups.csv";
const playersCsvPath = "../../data/players.csv";

const svgWidth = 800;
const svgHeight = 480;

const positionCoordinates = {
  "Goalkeeper_left": { x: 5, y: 50 },
  "Left-Back_left": { x: 20, y: 20 },
  "Right-Back_left": { x: 20, y: 80 },
  "Centre-Back_left": [{ x: 15, y: 40 }, { x: 15, y: 60 }],
  "Defensive Midfield_left": [{ x: 27, y: 50 }, { x: 30, y: 60 }],
  "Central Midfield_left": [{ x: 33, y: 35 }, { x: 33, y: 65 }],
  "Attacking Midfield_left": [{ x: 36, y: 65 }, { x: 36, y: 35 }],
  "Left Winger_left": { x: 40, y: 20 },
  "Right Winger_left": { x: 40, y: 80 },
  "Centre-Forward_left": { x: 45, y: 50 },

  "Goalkeeper_right": { x: 95, y: 50 },
  "Left-Back_right": { x: 80, y: 80 },
  "Right-Back_right": { x: 80, y: 20 },
  "Centre-Back_right": [{ x: 85, y: 60 }, { x: 85, y: 40 }],
  "Defensive Midfield_right": [{ x: 73, y: 50 }, { x: 70, y: 40 }],
  "Central Midfield_right": [{ x: 67, y: 65 }, { x: 67, y: 35 }],
  "Attacking Midfield_right": [{ x: 64, y: 35 }, { x: 64, y: 65 }],
  "Left Winger_right": { x: 60, y: 80 },
  "Right Winger_right": { x: 60, y: 20 },
  "Centre-Forward_right": { x: 55, y: 50 }
};

let positionCounts = {
  "Centre-Back_left": 0,
  "Centre-Back_right": 0,
  "Defensive Midfield_left": 0,
  "Defensive Midfield_right": 0,
  "Central Midfield_left": 0,
  "Central Midfield_right": 0,
  "Attacking Midfield_left": 0,
  "Attacking Midfield_right": 0
};

const svg = d3.select("#pitch")
  .append("svg")
  .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
  .attr("preserveAspectRatio", "xMidYMid meet");

// Draw pitch
svg.append("rect")
  .attr("x", 0).attr("y", 0)
  .attr("width", svgWidth)
  .attr("height", svgHeight)
  .attr("fill", "#0b6623")
  .attr("rx", 15);

// Midline
svg.append("line")
  .attr("x1", svgWidth / 2).attr("y1", 0)
  .attr("x2", svgWidth / 2).attr("y2", svgHeight)
  .attr("stroke", "#fff").attr("stroke-width", 2);

// Center circle
svg.append("circle")
  .attr("cx", svgWidth / 2).attr("cy", svgHeight / 2)
  .attr("r", 60)
  .attr("stroke", "#fff").attr("stroke-width", 2).attr("fill", "none");

// Penalty boxes (left and right)
svg.append("rect")
  .attr("x", 0).attr("y", svgHeight * 0.25)
  .attr("width", 80).attr("height", svgHeight * 0.5)
  .attr("stroke", "#fff").attr("stroke-width", 2).attr("fill", "none");

svg.append("rect")
  .attr("x", svgWidth - 80).attr("y", svgHeight * 0.25)
  .attr("width", 80).attr("height", svgHeight * 0.5)
  .attr("stroke", "#fff").attr("stroke-width", 2).attr("fill", "none");

// Load player data
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

      const absX = (x / 100) * svgWidth;
      const absY = (y / 100) * svgHeight;

      d3.select("#pitch")
        .append("img")
        .attr("src", fullPlayer.image_url)
        .attr("alt", fullPlayer.name)
        .attr("title", fullPlayer.name)
        .attr("class", "player-img")
        .style("left", `${absX}px`)
        .style("top", `${absY}px`);
    });
  })
  .catch(err => {
    console.error("Failed to load lineups or players:", err);
  });
