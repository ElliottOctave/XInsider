const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get("gameId");

const lineupsCsvPath = "../../data/game_lineups.csv";
const playersCsvPath = "../../data/players.csv";
const clubsCsvPath = "../../data/clubs.csv";
const gamesCsvPath = "../../data/games.csv";
const logosCsvPath = "../../data/club_logos.csv";
const eventsCsvPath = "../../data/game_events.csv";

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

const orderedPositions = [
  "Goalkeeper", "Right-Back", "Centre-Back", "Left-Back",
  "Defensive Midfield", "Central Midfield", "Attacking Midfield",
  "Right Winger", "Left Winger", "Centre-Forward"
];

let positionCounts;
let thisGame;

const svg = d3.select("#pitch")
  .append("svg")
  .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
  .attr("preserveAspectRatio", "xMidYMid meet");

svg.append("rect").attr("x", 0).attr("y", 0).attr("width", svgWidth).attr("height", svgHeight)
  .attr("fill", "#0b6623").attr("rx", 15);

svg.append("line").attr("x1", svgWidth / 2).attr("y1", 0).attr("x2", svgWidth / 2).attr("y2", svgHeight)
  .attr("stroke", "#fff").attr("stroke-width", 2);

svg.append("circle").attr("cx", svgWidth / 2).attr("cy", svgHeight / 2).attr("r", 60)
  .attr("stroke", "#fff").attr("stroke-width", 2).attr("fill", "none");

svg.append("rect").attr("x", 0).attr("y", svgHeight * 0.25).attr("width", 80).attr("height", svgHeight * 0.5)
  .attr("stroke", "#fff").attr("stroke-width", 2).attr("fill", "none");

svg.append("rect").attr("x", svgWidth - 80).attr("y", svgHeight * 0.25).attr("width", 80).attr("height", svgHeight * 0.5)
  .attr("stroke", "#fff").attr("stroke-width", 2).attr("fill", "none");

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

let allLineups, allPlayers, allClubs, allGames, allLogos, allEvents;
let playerMap = new Map();
let leftClub, rightClub;
let eventMinutes = [], currentEventIndex = 0;

Promise.all([
  fetch(lineupsCsvPath).then(res => res.text()),
  fetch(playersCsvPath).then(res => res.text()),
  fetch(clubsCsvPath).then(res => res.text()),
  fetch(gamesCsvPath).then(res => res.text()),
  fetch(logosCsvPath).then(res => res.text()),
  fetch(eventsCsvPath).then(res => res.text())
])
.then(([lineupsCsv, playersCsv, clubsCsv, gamesCsv, logosCsv, eventsCsv]) => {
  const parseCsv = csv => {
    const [headerLine, ...lines] = csv.trim().split("\n");
    const headers = headerLine.split(",");
    return lines.map(line => {
      const values = line.split(",");
      return Object.fromEntries(headers.map((h, i) => [h.trim(), values[i]?.trim()]));
    });
  };

  allLineups = parseCsv(lineupsCsv);
  allPlayers = parseCsv(playersCsv);
  allClubs = parseCsv(clubsCsv);
  allGames = parseCsv(gamesCsv);
  allLogos = parseCsv(logosCsv);
  allEvents = parseCsv(eventsCsv);

  const thisGame = allGames.find(g => g.game_id === gameId);
  leftClub = thisGame.home_club_id;
  rightClub = thisGame.away_club_id;

  const logoMap = new Map(allLogos.map(l => [l.club_id, l.logo_url]));
  const clubMap = new Map(allClubs.map(c => [c.club_id, c.name]));
  allPlayers.forEach(p => playerMap.set(p.player_id, p));

  leftTeamNameSpan.textContent = clubMap.get(leftClub);
  rightTeamNameSpan.textContent = clubMap.get(rightClub);
  leftLogoEl.src = logoMap.get(leftClub);
  rightLogoEl.src = logoMap.get(rightClub);
  leftManagerEl.textContent = thisGame.home_club_manager_name;
  rightManagerEl.textContent = thisGame.away_club_manager_name;
  leftFormationEl.textContent = thisGame.home_club_formation;
  rightFormationEl.textContent = thisGame.away_club_formation;

  currentEventIndex = -1;  // ✅ initialize BEFORE the first event
  renderLineup(0);         // show minute 0 on page load
  document.getElementById("event-minute").textContent = "0'";
  setupTimeline();         // now it works cleanly

})
.catch(err => console.error("Failed to load data:", err));

function renderLineup(minute) {
  positionCounts = {
    "Centre-Back_left": 0, "Centre-Back_right": 0,
    "Defensive Midfield_left": 0, "Defensive Midfield_right": 0,
    "Central Midfield_left": 0, "Central Midfield_right": 0,
    "Attacking Midfield_left": 0, "Attacking Midfield_right": 0
  };

  d3.selectAll(".player-img").remove();
  d3.selectAll(".event-icon").remove();
  leftLineupList.innerHTML = "";
  rightLineupList.innerHTML = "";

  const eventsUntilNow = allEvents.filter(e => e.game_id === gameId && parseInt(e.minute) <= minute);
  const activePlayers = new Set(allLineups
    .filter(p => p.game_id === gameId && p.type === "starting_lineup")
    .map(p => p.player_id));

  eventsUntilNow.forEach(e => {
    if (e.type === "Substitutions") {
      const subOut = e.player_id;
      const subIn = e.player_assist_id?.trim();

      activePlayers.delete(subOut);

      if (subIn && subIn !== "") {
        const incomingPlayer = allPlayers.find(p => p.player_id === subIn);
        const outgoingPlayerLineup = allLineups.find(p => p.player_id === subOut && p.game_id === gameId);
        if (incomingPlayer && outgoingPlayerLineup) {
          const subbedInLineup = allLineups.find(p => p.player_id === subIn && p.game_id === gameId);
          if (subbedInLineup) {
            subbedInLineup.position = outgoingPlayerLineup.position;
          }
        }
        activePlayers.add(subIn);
      }
    }
  });

  const visiblePlayers = allLineups
    .filter(p => p.game_id === gameId && activePlayers.has(p.player_id));

  const leftTeam = [], rightTeam = [];

  visiblePlayers.forEach(player => {
    const fullPlayer = playerMap.get(player.player_id);
    if (!fullPlayer || !fullPlayer.image_url) return;

    const isLeft = player.club_id === leftClub;
    const side = isLeft ? "left" : "right";
    const key = `${player.position}_${side}`;
    const pos = positionCoordinates[key];
    if (!pos) return;

    let x, y;
    if (Array.isArray(pos)) {
      const idx = positionCounts[key] || 0;
      if (idx >= pos.length) return;
      x = pos[idx].x;
      y = pos[idx].y;
      positionCounts[key] = idx + 1;
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

    const events = eventsUntilNow.filter(e => e.player_id === player.player_id);
    events.forEach(ev => {
      let icon = ev.description?.includes("Yellow") ? "🟨" :
                 ev.description?.includes("Red") ? "🟥" :
                 ev.type === "Goals" ? "⚽" : "";
      if (icon) {
        d3.select("#pitch")
          .append("div")
          .attr("class", "event-icon")
          .style("left", `${absX + 15}px`)
          .style("top", `${absY - 15}px`)
          .text(icon);
      }
    });

    const teamArray = isLeft ? leftTeam : rightTeam;
    teamArray.push({ id: player.player_id, name: fullPlayer.name, position: player.position });
  });

  [leftTeam, rightTeam].forEach((team, i) => {
    team.sort((a, b) => orderedPositions.indexOf(a.position) - orderedPositions.indexOf(b.position));
    const list = i === 0 ? leftLineupList : rightLineupList;

    team.forEach(p => {
      const li = document.createElement("li");
      li.textContent = p.name;
      li.setAttribute("data-player-id", p.id);
      list.appendChild(li);
    });
  });

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
}

function setupTimeline() {
  const timelineBar = document.getElementById("timeline-bar");
  timelineBar.innerHTML = ""; // Clear old icons

  const relevantEvents = allEvents
    .filter(e => e.game_id === gameId)
    .sort((a, b) => parseInt(a.minute) - parseInt(b.minute));

  eventMinutes = [...new Set(relevantEvents.map(e => parseInt(e.minute)))];

  relevantEvents.forEach(e => {
    const icon = e.description?.includes("Yellow") ? "🟨" :
                 e.description?.includes("Red") ? "🟥" :
                 e.type === "Goals" ? "⚽" :
                 e.type === "Substitutions" ? "🔁" : "";

    if (icon) {
      const div = document.createElement("div");
      div.className = "timeline-event-marker";
      div.style.left = `${(parseInt(e.minute) / 90) * 100}%`;
      div.textContent = icon;
      div.title = `${e.minute}'`;
      timelineBar.appendChild(div);
    }
  });

  renderLineup(0);
  document.getElementById("event-minute").textContent = "0'";
  
}

function updateTimeline() {
  const minute = eventMinutes[currentEventIndex] || 0;
  document.getElementById("event-minute").textContent = `${minute}'`;

  // Highlight correct marker
  document.querySelectorAll(".timeline-event-marker").forEach(marker => {
    const markerMinute = parseInt(marker.title.replace("'", ""));
    marker.classList.toggle("active", markerMinute === minute);
  });

  renderLineup(minute);
}

document.addEventListener("click", (e) => {
  if (e.target.id === "prev-button" && currentEventIndex > 0) {
    currentEventIndex--;
    updateTimeline();
  } else if (e.target.id === "next-button" && currentEventIndex < eventMinutes.length - 1) {
    currentEventIndex++;
    updateTimeline();
  }
});

