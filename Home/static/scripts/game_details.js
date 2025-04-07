const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get("gameId");

const lineupsCsvPath = "../../data/game_lineups.csv";
const playersCsvPath = "../../data/players.csv";
const clubsCsvPath = "../../data/clubs.csv";
const gamesCsvPath = "../../data/games.csv";
const logosCsvPath = "../../data/club_logos.csv";

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

svg.append("rect")
  .attr("x", 0).attr("y", 0)
  .attr("width", svgWidth)
  .attr("height", svgHeight)
  .attr("fill", "#0b6623")
  .attr("rx", 15);

svg.append("line")
  .attr("x1", svgWidth / 2).attr("y1", 0)
  .attr("x2", svgWidth / 2).attr("y2", svgHeight)
  .attr("stroke", "#fff")
  .attr("stroke-width", 2);

svg.append("circle")
  .attr("cx", svgWidth / 2)
  .attr("cy", svgHeight / 2)
  .attr("r", 60)
  .attr("stroke", "#fff")
  .attr("stroke-width", 2)
  .attr("fill", "none");

svg.append("rect")
  .attr("x", 0)
  .attr("y", svgHeight * 0.25)
  .attr("width", 80)
  .attr("height", svgHeight * 0.5)
  .attr("stroke", "#fff")
  .attr("stroke-width", 2)
  .attr("fill", "none");

svg.append("rect")
  .attr("x", svgWidth - 80)
  .attr("y", svgHeight * 0.25)
  .attr("width", 80)
  .attr("height", svgHeight * 0.5)
  .attr("stroke", "#fff")
  .attr("stroke-width", 2)
  .attr("fill", "none");

const leftLineupList = document.getElementById("left-lineup-list");
const rightLineupList = document.getElementById("right-lineup-list");

const leftLogoEl = document.getElementById("left-team-logo");
const rightLogoEl = document.getElementById("right-team-logo");
const leftTeamNameSpan = document.querySelector("#left-team-name span");
const rightTeamNameSpan = document.querySelector("#right-team-name span");
const leftFormationEl = document.getElementById("left-team-formation");
const rightFormationEl = document.getElementById("right-team-formation");
const leftManagerEl = document.getElementById("left-team-manager");
const rightManagerEl = document.getElementById("right-team-manager");

Promise.all([
  fetch(lineupsCsvPath).then(res => res.text()),
  fetch(playersCsvPath).then(res => res.text()),
  fetch(clubsCsvPath).then(res => res.text()),
  fetch(gamesCsvPath).then(res => res.text()),
  fetch(logosCsvPath).then(res => res.text())
])
.then(([lineupsCsv, playersCsv, clubsCsv, gamesCsv, logosCsv]) => {
  const parseCsv = (csvText) => {
    const rows = csvText.trim().split("\n");
    const headers = rows[0].split(",");
    return rows.slice(1).map(row => {
      const values = row.split(",");
      const obj = {};
      headers.forEach((header, i) => {
        obj[header.trim()] = values[i]?.trim();
      });
      return obj;
    });
  };

  const allLineups = parseCsv(lineupsCsv);
  const allPlayers = parseCsv(playersCsv);
  const allClubs = parseCsv(clubsCsv);
  const allGames = parseCsv(gamesCsv);
  const allLogos = parseCsv(logosCsv);

  const thisGame = allGames.find(g => g.game_id === gameId);
  const homeClub = thisGame?.home_club_id;
  const awayClub = thisGame?.away_club_id;
  const homeManager = thisGame?.home_club_manager_name;
  const awayManager = thisGame?.away_club_manager_name;

  const leftClub = homeClub;
  const rightClub = awayClub;

  const clubMap = new Map();
  allClubs.forEach(c => clubMap.set(c.club_id, c.name));

  const logoMap = new Map();
  allLogos.forEach(l => logoMap.set(l.club_id, l.logo_url));

  const leftClubName = clubMap.get(leftClub) || "Home Team";
  const rightClubName = clubMap.get(rightClub) || "Away Team";

  leftTeamNameSpan.textContent = leftClubName;
  rightTeamNameSpan.textContent = rightClubName;

  leftLogoEl.src = logoMap.get(leftClub);
  rightLogoEl.src = logoMap.get(rightClub);
  leftLogoEl.alt = leftClubName;
  rightLogoEl.alt = rightClubName;

  leftManagerEl.textContent = homeManager;
  rightManagerEl.textContent = awayManager;

  leftFormationEl.textContent = "4-3-3";
  rightFormationEl.textContent = "4-3-3";

  const orderedPositions = [
    "Goalkeeper", "Right-Back", "Centre-Back", "Left-Back",
    "Defensive Midfield", "Central Midfield", "Attacking Midfield",
    "Right Winger", "Left Winger", "Centre-Forward"
  ];

  const gameLineup = allLineups.filter(
    p => p.game_id === gameId && p.type === "starting_lineup"
  );

  const leftTeam = [];
  const rightTeam = [];

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
      .attr("data-player-id", player.player_id)
      .style("left", `${absX}px`)
      .style("top", `${absY}px`);

    const playerInfo = {
      id: player.player_id,
      name: fullPlayer.name,
      position: player.position
    };

    (isLeft ? leftTeam : rightTeam).push(playerInfo);
  });

  [leftTeam, rightTeam].forEach((team, i) => {
    team.sort((a, b) => {
      const indexA = orderedPositions.indexOf(a.position);
      const indexB = orderedPositions.indexOf(b.position);
      return indexA - indexB;
    });

    const list = i === 0 ? leftLineupList : rightLineupList;

    team.forEach(p => {
      const li = document.createElement("li");
      li.textContent = p.name;
      li.setAttribute("data-player-id", p.id);
      list.appendChild(li);
    });
  });

  // 🔥 Hover effect: highlight pitch player
  document.querySelectorAll("li[data-player-id]").forEach(li => {
    li.addEventListener("mouseenter", () => {
      const id = li.getAttribute("data-player-id");
      const img = document.querySelector(`.player-img[data-player-id="${id}"]`);
      if (img) img.classList.add("highlighted");
    });
    li.addEventListener("mouseleave", () => {
      const id = li.getAttribute("data-player-id");
      const img = document.querySelector(`.player-img[data-player-id="${id}"]`);
      if (img) img.classList.remove("highlighted");
    });
  });
})
.catch(err => {
  console.error("Failed to load data:", err);
});
