import * as d3 from "d3";

// === File URLs ===
const CSV_PATH = '../../data/';
const files = {
  clubs: `${CSV_PATH}clubs.csv`,
  clubInfo: `${CSV_PATH}club_info.csv`,
  clubLogos: `${CSV_PATH}club_logos.csv`,
  clubGames: `${CSV_PATH}club_games.csv`,
  players: `${CSV_PATH}players.csv`,
  competitions: `${CSV_PATH}competitions.csv`,
  competitionLogos: `${CSV_PATH}competition_logos.csv`,
  games: '../../processed_data/processed_games.csv',
  playerStats: `${CSV_PATH}player_stats.csv`,
};

// === Get Club ID from URL ===
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

// === Main App ===
Promise.all([
  d3.csv(files.clubs),
  d3.csv(files.clubInfo),
  d3.csv(files.clubLogos),
  d3.csv(files.players),
  d3.csv(files.competitions),
  d3.csv(files.competitionLogos),
  d3.csv(files.clubGames),
  d3.csv(files.games),
  d3.csv(files.playerStats),
]).then(([clubs, clubInfo, clubLogos, players, competitions, compLogos, clubGames, allGames, playerStats]) => {

  const clubId = getQueryParam("club_id");
  if (!clubId) {
    document.body.innerHTML = "<h2 style='padding: 40px;'>No club ID provided in URL.</h2>";
    return;
  }

  const club = clubs.find(c => c.club_id === clubId);
  const info = clubInfo.find(c => c.club_id === clubId);
  const logo = clubLogos.find(l => l.club_id === clubId);
  const league = competitions.find(c => c.competition_id === club.domestic_competition_id);
  const leagueLogo = compLogos.find(l => l.competition_id === club.domestic_competition_id);

  if (!club || !info) {
    document.body.innerHTML = "<h2 style='padding: 40px;'>Club not found.</h2>";
    return;
  }

  // === Render Hero ===
  renderHeroSection({ club, info, logo, league, leagueLogo });

  // === Render Quick Stats ===
  renderQuickStats(info);

  // ==== Donut Render Chart ===
  drawDonutChart(info);

  // ==== Nationality Render Chart ===
  drawNationalityBarChart(clubId, players);

  // ==== squad Render Chart ===
  drawSquadByPosition(clubId, players);

  // === performance trends
  drawPerformanceTrend(clubId, allGames);

  // === top players
  drawTopPlayerCarousel(clubId, players, playerStats);

  // === draw last games
  drawLastGames(clubId, clubGames, clubLogos, allGames, club.name);

}).catch(err => {
  console.error("Error loading data:", err);
});


// === Render Hero Section ===
function renderHeroSection({ club, info, logo, league }) {
  const hero = document.getElementById("hero-section");
  hero.innerHTML = `
    <div class="hero-info">
      <img src="${logo?.logo_url || ''}" alt="${club.name} logo">
      <h1>${club.name}</h1>
      <p><strong>League:</strong> ${league?.name || 'N/A'}</p>
      <p><strong>Stadium:</strong> ${club.stadium_name || 'N/A'}</p>
    </div>
  `;
}


// === Render Quick Stats ===
function renderQuickStats(info) {
  const container = document.getElementById("quick-stats");

  container.innerHTML = `
    <div class="stat-card">
      <h3>Squad Size</h3>
      <p>${info.squad_size}</p>
    </div>
    <div class="stat-card">
      <h3>Average Age</h3>
      <p>${info.average_age}</p>
    </div>
    <div class="stat-card">
      <h3>Foreign Players</h3>
      <p>${info.foreigners_number}</p>
    </div>
    <div class="stat-card">
      <h3>National Players</h3>
      <p>${info.national_team_players}</p>
    </div>
  `;
}

function drawDonutChart(info) {
  const total = +info.squad_size;
  const foreign = +info.foreigners_number;
  const local = total - foreign;

  const dataValues = [
    { label: "Foreign", value: foreign },
    { label: "Local", value: local }
  ];

  const width = 280;
  const height = 280;
  const radius = Math.min(width, height) / 2;

  const color = d3.scaleOrdinal()
    .domain(dataValues.map(d => d.label))
    .range(["#3399ff", "#66ccff"]);

  const pie = d3.pie().value(d => d.value);
  const data_ready = pie(dataValues);
  const arc = d3.arc().innerRadius(70).outerRadius(radius);

  // Create viz container
  const container = document.createElement("div");
  container.className = "viz-card";
  container.innerHTML = `<h2>Squad Composition</h2>`;

  const vizInner = document.createElement("div");
  vizInner.className = "donut-inner";
  container.appendChild(vizInner);
  document.getElementById("viz-left").appendChild(container);

  // Create SVG
  const svg = d3.select(vizInner)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = svg.append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  g.selectAll("path")
    .data(data_ready)
    .enter()
    .append("path")
    .attr("d", arc)
    .attr("fill", d => color(d.data.label))
    .attr("stroke", "white")
    .style("stroke-width", "2px");

  // Center total value
  g.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .style("font-size", "24px")
    .style("font-weight", "bold")
    .style("fill", "#003366")
    .text(total);

  // Legend
  const legend = document.createElement("div");
  legend.className = "donut-legend";

  dataValues.forEach(d => {
    const item = document.createElement("div");
    item.className = "legend-item";
    item.innerHTML = `
      <span class="legend-color" style="background-color: ${color(d.label)};"></span>
      <span>${d.label}:</span> <strong>${d.value}</strong>
    `;
    legend.appendChild(item);
  });

  vizInner.appendChild(legend);
}

// nationality bar chart

function drawNationalityBarChart(clubId, players) {
  const clubPlayers = Array.from(
  new Map(
    players
      .filter(p => p.current_club_id === clubId && p.country_of_citizenship)
      .map(p => [p.player_id, p])  // key = player_id to deduplicate
  ).values()
);
  const nationalityCounts = {};

  clubPlayers.forEach(p => {
    const country = p.country_of_citizenship;
    nationalityCounts[country] = (nationalityCounts[country] || 0) + 1;
  });

  const data = Object.entries(nationalityCounts)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count);

  if (data.length === 0) return;

  // Create container
  const container = document.createElement("div");
  container.className = "viz-card";
  container.innerHTML = `<h2>Player Nationalities</h2>`;

  const wrapper = document.createElement("div");
  wrapper.className = "bar-chart-wrapper";
  container.appendChild(wrapper);
  document.getElementById("viz-right").appendChild(container);

  const margin = { top: 20, right: 20, bottom: 100, left: 60 };
  const width = Math.max(data.length * 60, 500);
  const height = 300;

  const svg = d3.select(wrapper)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .domain(data.map(d => d.country))
    .range([0, width])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.count)])
    .nice()
    .range([height, 0]);

  svg.append("g")
    .call(d3.axisLeft(y).ticks(5))
    .style("font-size", "12px");

  svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-40)")
    .style("text-anchor", "end")
    .style("font-size", "18px")
    .style("font-weight", "500")
    .style("fill", "#003366");

  svg.selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", d => x(d.country))
    .attr("y", d => y(d.count))
    .attr("width", x.bandwidth())
    .attr("height", d => height - y(d.count))
    .attr("fill", "#3399ff");

  svg.selectAll("text.bar-label")
    .data(data)
    .enter()
    .append("text")
    .attr("x", d => x(d.country) + x.bandwidth() / 2)
    .attr("y", d => y(d.count) - 5)
    .attr("text-anchor", "middle")
    .style("fill", "#003366")
    .style("font-size", "12px")
    .text(d => d.count);
}

// squad position

function drawSquadByPosition(clubId, players) {
  const clubPlayers = players
    .filter(p => p.current_club_id === clubId && p.name && p.position)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (clubPlayers.length === 0) return;

  const grouped = {
    Goalkeepers: [],
    Defenders: [],
    Midfielders: [],
    Attackers: [],
    Others: [],
  };

  clubPlayers.forEach(p => {
    const pos = p.position.toLowerCase();
    if (pos.includes("goalkeeper")) grouped.Goalkeepers.push(p);
    else if (pos.includes("defender")) grouped.Defenders.push(p);
    else if (pos.includes("midfield")) grouped.Midfielders.push(p);
    else if (pos.includes("forward") || pos.includes("attack") || pos.includes("striker")) grouped.Attackers.push(p);
    else grouped.Others.push(p);
  });

  const container = document.createElement("section");
  container.id = "squad-tabs-section";
  container.className = "viz-card";
  container.innerHTML = `<h2>Squad by Position</h2>`;

  const tabWrapper = document.createElement("div");
  tabWrapper.className = "squad-tabs";

  const tabButtons = document.createElement("div");
  tabButtons.className = "tab-buttons";

  const tabContent = document.createElement("div");
  tabContent.className = "tab-content";

  const positions = Object.keys(grouped).filter(pos => grouped[pos].length > 0);
  positions.forEach((position, index) => {
    const btn = document.createElement("button");
    btn.textContent = position;
    if (index === 0) btn.classList.add("active");
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-buttons button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderTable(grouped[position]);
    });
    tabButtons.appendChild(btn);
  });

  tabWrapper.appendChild(tabButtons);
  tabWrapper.appendChild(tabContent);
  container.appendChild(tabWrapper);

  // Append below the charts
  document.getElementById("viz-bottom-row").appendChild(container);

  renderTable(grouped[positions[0]]); // Initial

  function renderTable(players) {
    tabContent.innerHTML = "";
    const table = document.createElement("table");
    table.className = "player-table";

    const thead = document.createElement("thead");
    thead.innerHTML = `<tr><th>Name</th><th>Position</th></tr>`;
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    players.forEach(player => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="player-link">${player.name}</td>
        <td>${player.position}</td>
      `;
      row.addEventListener("click", () => {
        window.location.href = `/Home/pages/player_info.html?playerId=${player.player_id}`;
      });
      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    tabContent.appendChild(table);
  }
}

//performance trends 

function drawPerformanceTrend(clubId, games) {
  // Filter for this club's matches (home or away)
  const matches = games
    .filter(g => g.home_club_id === clubId || g.away_club_id === clubId)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10)
    .reverse(); // chronological

  const formData = matches.map(g => {
    const isHome = g.home_club_id === clubId;
    const goalsFor = isHome ? +g.home_club_goals : +g.away_club_goals;
    const goalsAgainst = isHome ? +g.away_club_goals : +g.home_club_goals;
    let result = goalsFor > goalsAgainst ? 3 : goalsFor === goalsAgainst ? 1 : 0;

    return {
      date: g.date,
      result
    };
  });

  if (formData.length === 0) return;

  // === Layout
  const container = document.createElement("div");
  container.className = "viz-card";
  container.innerHTML = `<h2>Form Over Last 10 Games</h2>`;
  document.getElementById("game-left").appendChild(container);

  const wrapper = document.createElement("div");
  wrapper.className = "line-chart-wrapper";
  container.appendChild(wrapper);

  // === Chart setup
  const margin = { top: 30, right: 20, bottom: 50, left: 50 };
  const width = 800 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const svg = d3.select(wrapper)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scalePoint()
    .domain(formData.map((d, i) => `Match ${i + 1}`))
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, 3])
    .range([height, 0]);

  const line = d3.line()
    .x((d, i) => x(`Match ${i + 1}`))
    .y(d => y(d.result))
    .curve(d3.curveMonotoneX);

  svg.append("path")
    .datum(formData)
    .attr("fill", "none")
    .attr("stroke", "#0055aa")
    .attr("stroke-width", 2)
    .attr("d", line);

  svg.selectAll("circle")
    .data(formData)
    .enter()
    .append("circle")
    .attr("cx", (d, i) => x(`Match ${i + 1}`))
    .attr("cy", d => y(d.result))
    .attr("r", 5)
    .attr("fill", d => d.result === 3 ? "#4CAF50" : d.result === 1 ? "#FFC107" : "#F44336");

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("font-size", "14px");

  svg.append("g")
    .call(d3.axisLeft(y).ticks(3).tickFormat(d => {
      if (d === 3) return "Win";
      if (d === 1) return "Draw";
      if (d === 0) return "Loss";
      return "";
    }))
    .style("font-size", "14px");
}


/// draw last games
function drawLastGames(clubId, clubGames, logos, allGames, clubName) {
  const logoMap = Object.fromEntries(logos.map(l => [l.club_id, l.logo_url]));

  // Get all games where the club is either home or away
  const recentGames = allGames
    .filter(g => g.home_club_id === clubId || g.away_club_id === clubId)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  if (recentGames.length === 0) return;

  const container = document.createElement("section");
  container.className = "last-games";
  container.innerHTML = `<h2 class="last-games-title">Five last games of <strong>${clubName}</strong></h2>`;

  const gameRow = document.createElement("div");
  gameRow.className = "last-games-row";

  recentGames.forEach(game => {
    const isHome = game.home_club_id === clubId;
    const ownScore = isHome ? game.home_club_goals : game.away_club_goals;
    const oppScore = isHome ? game.away_club_goals : game.home_club_goals;

    const ownLogo = logoMap[isHome ? game.home_club_id : game.away_club_id];
    const oppLogo = logoMap[isHome ? game.away_club_id : game.home_club_id];

    const score = `${ownScore} - ${oppScore}`;
    const venue = game.stadium || (isHome ? "Home" : "Away");

    const card = document.createElement("a");
    card.href = `/Home/pages/game_details.html?gameId=${game.game_id}`;
    card.className = "game-card";

    card.innerHTML = `
      <div class="game-logos">
        <img src="${ownLogo}" alt="club" />
        <span class="score">${score}</span>
        <img src="${oppLogo}" alt="opponent" />
      </div>
      <div class="stadium">${venue}</div>
      <div class="date">${game.date}</div>
    `;

    gameRow.appendChild(card);
  });

  container.appendChild(gameRow);
  document.getElementById("viz-bottom-row").appendChild(container);
}


function drawTopPlayerCarousel(clubId, players, playerStats) {
  // Helper: compute age from date_of_birth
  const calculateAge = (birthStr) => {
    const birth = new Date(birthStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  // Build player stats map
  const statsByPlayer = {};
  playerStats.forEach(stat => {
    const pid = stat.player_id;
    if (!statsByPlayer[pid]) {
      statsByPlayer[pid] = { goals: 0, assists: 0 };
    }
    statsByPlayer[pid].goals += +stat.nr_of_goals || 0;
    statsByPlayer[pid].assists += +stat.assists || 0;
  });

  // Merge stats with players
  const clubPlayers = players.filter(p => p.current_club_id === clubId);
  const mergedPlayers = clubPlayers.map(p => {
    const stats = statsByPlayer[p.player_id] || { goals: 0, assists: 0 };
    const age = calculateAge(p.date_of_birth);
    return { ...p, ...stats, age };
  });

  if (mergedPlayers.length === 0) return;

  // Determine top players
  const topScorer = [...mergedPlayers].sort((a, b) => b.goals - a.goals)[0];
  const topAssists = [...mergedPlayers].sort((a, b) => b.assists - a.assists)[0];
  const oldestPlayer = [...mergedPlayers].sort((a, b) => b.age - a.age)[0];

  const slides = [
    {
      label: "Top Scorer",
      player: topScorer,
      stat: `${topScorer.goals} goals`
    },
    {
      label: "Top Assists",
      player: topAssists,
      stat: `${topAssists.assists} assists`
    },
    {
      label: "Oldest Player",
      player: oldestPlayer,
      stat: `${oldestPlayer.age} years`
    }
  ];

  let current = 0;

  const container = document.createElement("div");
  container.className = "viz-card player-carousel";
  container.innerHTML = `
    <h2>Key Players</h2>
    <div class="carousel-content"></div>
    <div class="carousel-controls">
      <button id="prev-slide">⬅️</button>
      <button id="next-slide">➡️</button>
    </div>
  `;
  document.getElementById("game-right").appendChild(container);

  const content = container.querySelector(".carousel-content");

  function renderSlide(index) {
    const { label, player, stat } = slides[index];
    content.innerHTML = `
      <div class="player-profile-card full-height">
        <div class="left-profile vertical">
          <img src="${player.image_url}" alt="${player.name}" class="profile-image-tall" />
          <h3>${player.name}</h3>
        </div>
        <div class="right-info grid-large">
          <div class="info-box big">
            <h4>${label}</h4>
            <p>${stat}</p>
          </div>
          <div class="info-box big">
            <h4>Position</h4>
            <p>${player.position}</p>
          </div>
          <div class="info-box big">
            <h4>Age</h4>
            <p>${player.age}</p>
          </div>
          <div class="info-box big">
            <h4>Nationality</h4>
            <p>${player.country_of_citizenship}</p>
          </div>
        </div>
      </div>
    `;
  }



  renderSlide(current);

  document.getElementById("prev-slide").addEventListener("click", () => {
    current = (current - 1 + slides.length) % slides.length;
    renderSlide(current);
  });

  document.getElementById("next-slide").addEventListener("click", () => {
    current = (current + 1) % slides.length;
    renderSlide(current);
  });
}



