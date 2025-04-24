const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get("gameId");

const lineupsCsvPath = "../../processed_data/processed_game_lineups.csv";
const playersCsvPath = "../../processed_data/player_summary.csv";
const clubsCsvPath = "../../data/clubs.csv";
const gamesCsvPath = "../../processed_data/processed_games.csv";
const logosCsvPath = "../../data/club_logos.csv";
const eventsCsvPath = "../../data/game_events.csv";
const svgWidth = 800;
const svgHeight = 480;

function computeDynamicPositionMap(formationStr, side) {
  const lines = formationStr.split("-").map(n => parseInt(n));
  const xSteps = lines.length + 1;
  const xStart = side === "left" ? 10 : 90;
  const xEnd = side === "left" ? 45 : 55;
  const xPositions = [];

  for (let i = 0; i < lines.length; i++) {
    const ratio = (i + 1) / xSteps;
    const x = xStart + (xEnd - xStart) * ratio;
    xPositions.push(x);
  }

  const result = [];

  lines.forEach((count, lineIdx) => {
    const x = xPositions[lineIdx];
    for (let i = 0; i < count; i++) {
      const y = ((i + 1) / (count + 1)) * 100;
      result.push({ x, y });
    }
  });

  // Add Goalkeeper in the middle of the goal
  result.unshift({
    x: side === "left" ? 5 : 95,
    y: 50
  });

  return result;
}

const orderedPositions = [
  "Goalkeeper", "Right-Back", "Centre-Back", "Left-Back", "Right Midfielder",
  "Defensive Midfield", "Central Midfield", "Attacking Midfield", "Left Midfielder",
  "Right Winger", "Left Winger", "Centre-Forward"
];

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
const leftTimelineLogo = document.getElementById("home-timeline-logo");
const rightTimelineLogo = document.getElementById("away-timeline-logo");

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

  thisGame = allGames.find(g => g.game_id === gameId);
  leftClub = thisGame.home_club_id;
  rightClub = thisGame.away_club_id;

  const logoMap = new Map(allLogos.map(l => [l.club_id, l.logo_url]));
  const clubMap = new Map(allClubs.map(c => [c.club_id, c.name]));
  allPlayers.forEach(p => playerMap.set(p.player_id, p));

  leftTeamNameSpan.textContent = clubMap.get(leftClub);
  rightTeamNameSpan.textContent = clubMap.get(rightClub);
  leftLogoEl.src = logoMap.get(leftClub);
  rightLogoEl.src = logoMap.get(rightClub);
  leftTimelineLogo.src = logoMap.get(leftClub);
  rightTimelineLogo.src = logoMap.get(rightClub);
  leftManagerEl.textContent = thisGame.home_club_manager_name;
  rightManagerEl.textContent = thisGame.away_club_manager_name;
  leftFormationEl.textContent = thisGame.home_club_formation;
  rightFormationEl.textContent = thisGame.away_club_formation;
  renderRecentMatches(leftClub, gameId, "left");
  renderRecentMatches(rightClub, gameId, "right");  
  currentEventIndex = -1;  // ✅ initialize BEFORE the first event
  renderLineup(0);         // show minute 0 on page load
  document.getElementById("event-minute").textContent = "0'";
  setupTimeline();         // now it works cleanly

})
.catch(err => console.error("Failed to load data:", err));

function renderLineup(minute) {
  d3.selectAll(".player-img").remove();
  d3.selectAll(".event-icon").remove();
  leftLineupList.innerHTML = "";
  rightLineupList.innerHTML = "";

  const eventsUntilNow = allEvents.filter(e => e.game_id === gameId && parseInt(e.minute) <= minute);

  const activePlayers = new Set(
    allLineups.filter(p => p.game_id === gameId && p.type === "starting_lineup").map(p => p.player_id)
  );

  // Substitutions
  eventsUntilNow.forEach(e => {
    if (e.type === "Substitutions") {
      const subOut = e.player_id;
      const subIn = e.player_assist_id?.trim();
      activePlayers.delete(subOut);
      if (subIn && subIn !== "") {
        const incomingPlayer = allPlayers.find(p => p.player_id === subIn);
        const outgoing = allLineups.find(p => p.player_id === subOut && p.game_id === gameId);
        const subbedIn = allLineups.find(p => p.player_id === subIn && p.game_id === gameId);
        if (incomingPlayer && outgoing && subbedIn) {
          subbedIn.position = outgoing.position;
          activePlayers.add(subIn);
        }
      }
    }
  });

  const visiblePlayers = allLineups.filter(p => p.game_id === gameId && activePlayers.has(p.player_id));

  const leftFormation = thisGame.home_club_formation;
  const rightFormation = thisGame.away_club_formation;

  const orderedPositions = [
    "Goalkeeper", "Right-Back", "Centre-Back", "Left-Back", "Right Midfield",
    "Defensive Midfield", "Central Midfield", "Attacking Midfield", "Left Midfield",
    "Right Winger","Centre-Forward", "Left Winger"
  ];

  const positionOrderMap = Object.fromEntries(orderedPositions.map((p, i) => [p, i]));

  const leftPlayers = visiblePlayers.filter(p => p.club_id === leftClub).sort((a, b) =>
    (positionOrderMap[a.position] ?? 999) - (positionOrderMap[b.position] ?? 999)
  );

  const rightPlayers = visiblePlayers.filter(p => p.club_id === rightClub).sort((a, b) =>
    (positionOrderMap[a.position] ?? 999) - (positionOrderMap[b.position] ?? 999)
  );

  const leftPositions = computeDynamicPositionMap(leftFormation, "left");
  const rightPositions = computeDynamicPositionMap(rightFormation, "right");

  const layoutPlayers = (players, positions, side) => {
    const list = side === "left" ? leftLineupList : rightLineupList;
    const teamArray = [];

    players.forEach((player, idx) => {
      const fullPlayer = playerMap.get(player.player_id);
      if (!fullPlayer || !fullPlayer.image_url) return;
      if (idx >= positions.length) return;

      let { x, y } = positions[idx];
      if (side === "left") {
        y = 100 - y; // 🪞 Mirror horizontally for left team
      }
      const absX = (x / 100) * svgWidth;
      
      const absY = (y / 100) * svgHeight;

      // 👤 Image
      d3.select("#pitch").append("img")
        .attr("src", fullPlayer.image_url)
        .attr("alt", fullPlayer.name)
        .attr("title", fullPlayer.name)
        .attr("class", "player-img")
        .attr("data-player-id", player.player_id)
        .style("left", `${absX}px`)
        .style("top", `${absY}px`);

      // 🎯 Events
      const events = eventsUntilNow.filter(e => e.player_id === player.player_id);
      const yellowCards = events.filter(ev => ev.description?.includes("Yellow"));
      const redCards = events.filter(ev => ev.description?.includes("Red"));
      const goals = events.filter(ev => ev.type === "Goals");
      const subs = events.filter(ev => ev.type === "Substitutions");

      const icons = [];
      if (yellowCards.length >= 2 && redCards.length === 0) {
        icons.push("🟥");
      } else {
        icons.push(...yellowCards.map(() => "🟨"));
        icons.push(...redCards.map(() => "🟥"));
      }
      icons.push(...goals.map(() => "⚽"));

      const playerLineup = allLineups.find(l => l.player_id === player.player_id && l.game_id === gameId);

      if (playerLineup?.team_captain === "1") {
        d3.select("#pitch")
          .append("img")
          .attr("src", "/ressources/Captain.png")
          .attr("class", "event-icon")
          .style("width", "20px")
          .style("height", "20px")
          .style("left", `${absX + 15}px`)
          .style("top", `${absY + 20}px`);
      }

      // Icons
      let iconOffset = 0;
      icons.forEach(icon => {
        d3.select("#pitch")
          .append("div")
          .attr("class", "event-icon")
          .style("left", `${absX + 15 + iconOffset}px`)
          .style("top", `${absY - 20}px`)
          .text(icon);
        iconOffset += 18;
      });

      // Substitutions
      subs.forEach(() => {
        d3.select("#pitch")
          .append("img")
          .attr("src", "/ressources/Substitution.png")
          .attr("class", "event-icon")
          .style("width", "18px")
          .style("height", "18px")
          .style("left", `${absX + 15 + iconOffset}px`)
          .style("top", `${absY - 20}px`);
        iconOffset += 20;
      });

      // 📋 Lineup list
      const number = playerLineup?.number || "";
      const li = document.createElement("li");
      li.textContent = number ? `${number} ${fullPlayer.name}` : fullPlayer.name;
      li.setAttribute("data-player-id", player.player_id);
      list.appendChild(li);

      teamArray.push({ id: player.player_id, name: fullPlayer.name, position: player.position });
    });
  };

  layoutPlayers(leftPlayers, leftPositions, "left");
  layoutPlayers(rightPlayers, rightPositions, "right");

  // ✨ Highlight on hover
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
                 e.type === "Goals" ? "⚽" : "";
  
    const isHomeTeam = e.club_id === leftClub;
    const leftPercent = (parseInt(e.minute) / 90) * 100;
    const verticalOffset = isHomeTeam ? "-25px" : "25px";
  
    // 🟨🟥⚽ as emoji
    if (icon) {
      const div = document.createElement("div");
      div.className = "timeline-event-marker";
      div.textContent = icon;
      div.title = `${e.minute}'`;
      div.style.left = `${leftPercent}%`;
      div.style.position = "absolute";
      div.style.transform = "translateX(-50%)";
      div.style.top = verticalOffset;
      timelineBar.appendChild(div);
    }
  
    // 🔁 Substitution as image
    if (e.type === "Substitutions") {
      const img = document.createElement("img");
      img.src = "/ressources/Substitution.png";
      img.className = "timeline-event-marker";
      img.title = `${e.minute}'`;
      img.style.left = `${leftPercent}%`;
      img.style.width = "20px";
      img.style.height = "20px";
      img.style.position = "absolute";
      img.style.transform = "translateX(-50%)";
      img.style.top = verticalOffset;
      timelineBar.appendChild(img);
    }
  });  

  renderLineup(0);
  document.getElementById("event-minute").textContent = "0'";
  
}

function renderRecentMatches(clubId, excludeGameId, side) {
  const title = document.getElementById(`recent-matches-title-${side}`);
  const container = document.getElementById(`recent-matches-list-${side}`);

  console.log("📌 Rendering recent matches for clubId:", clubId, "excluding game:", excludeGameId);

  const clubName = allClubs.find(c => String(c.club_id) === String(clubId))?.name || "Unknown Club";
  title.textContent = `Five last games of ${clubName}`;
  container.innerHTML = "";

  const recentGames = allGames
    .filter(g => (String(g.home_club_id) === String(clubId) || String(g.away_club_id) === String(clubId)) && g.game_id !== excludeGameId)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  console.log("🔍 Found recent games:", recentGames.map(g => g.game_id));

  recentGames.forEach(game => {
    const home = allClubs.find(c => String(c.club_id) === String(game.home_club_id));
    const away = allClubs.find(c => String(c.club_id) === String(game.away_club_id));

    const homeLogo = allLogos.find(l => String(l.club_id) === String(game.home_club_id))?.logo_url || "/fallback.png";
    const awayLogo = allLogos.find(l => String(l.club_id) === String(game.away_club_id))?.logo_url || "/fallback.png";

    if (!home || !away) {
      console.warn("⚠️ Club not found in allClubs:", {
        game_id: game.game_id,
        home_club_id: game.home_club_id,
        away_club_id: game.away_club_id,
        home_found: !!home,
        away_found: !!away
      });
    }

    const div = document.createElement("div");
    div.className = "match-card";
    div.onclick = () => window.location.href = `/Home/pages/game_details.html?gameId=${game.game_id}`;

    div.innerHTML = `
      <div class="logos">
        <img src="${homeLogo}" alt="${home?.name || 'Unknown'}">
        <img src="${awayLogo}" alt="${away?.name || 'Unknown'}">
      </div>
      <div class="score">${game.home_club_goals} - ${game.away_club_goals}</div>
      <div class="venue">${game.stadium}</div>
      <div class="date">${game.date}</div>
    `;

    container.appendChild(div);
  });
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

