const gamesCsvUrl = "../../data/games.csv";
const clubsCsvUrl = "../../data/clubs.csv";
const logosCsvUrl = "../../data/club_logos.csv";

let currentPage = 1;
const rowsPerPage = 12;
let filteredGames = [];
const clubMap = {};
const logoMap = {};

Promise.all([
  fetch(gamesCsvUrl).then(res => res.text()),
  fetch(clubsCsvUrl).then(res => res.text()),
  fetch(logosCsvUrl).then(res => res.text())
])
  .then(([gamesCsv, clubsCsv, logosCsv]) => {
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

    const games = parseCsv(gamesCsv);
    const clubs = parseCsv(clubsCsv);
    const logos = parseCsv(logosCsv);

    clubs.forEach(club => {
      clubMap[club.club_id] = club.name;
    });

    logos.forEach(logo => {
      logoMap[logo.club_id] = logo.logo_url;
    });

    games.forEach(game => {
      game.home_team = clubMap[game.home_club_id] || game.home_club_name || "Unknown";
      game.away_team = clubMap[game.away_club_id] || game.away_club_name || "Unknown";
      game.home_logo = logoMap[game.home_club_id] || "";
      game.away_logo = logoMap[game.away_club_id] || "";
    });

    // ✅ Sort most recent matches first
    games.sort((a, b) => new Date(b.date) - new Date(a.date));

    filteredGames = games;
    populateYearDropdown(games);
    renderCards();
    setupEventListeners(games);
  });

function renderCards() {
  const container = document.getElementById("matches-list");
  container.innerHTML = "";

  const validGames = filteredGames.filter(game =>
    game.home_team && game.away_team &&
    game.home_logo && game.away_logo &&
    game.home_club_goals !== undefined && game.away_club_goals !== undefined &&
    game.stadium && game.date
  );

  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const paginatedGames = validGames.slice(start, end);

  paginatedGames.forEach(game => {
    const score = `${game.home_club_goals} - ${game.away_club_goals}`;
    const card = document.createElement("div");
    card.className = "match-card";
    card.innerHTML = `
      <div class="teams">
        <div class="team">
          <div class="team-logo-wrapper">
            <img class="team-logo" src="${game.home_logo}" alt="${game.home_team}" />
          </div>
          <div class="team-name">${game.home_team}</div>
        </div>
        <div class="score">${score}</div>
        <div class="team">
          <div class="team-logo-wrapper">
            <img class="team-logo" src="${game.away_logo}" alt="${game.away_team}" />
          </div>
          <div class="team-name">${game.away_team}</div>
        </div>
      </div>
      <div class="meta">
        <p>${game.stadium}</p>
        <p>${game.date}</p>
      </div>
    `;
    container.appendChild(card);
  });

  document.getElementById("pageInfo").textContent =
    `Page ${currentPage} of ${Math.ceil(validGames.length / rowsPerPage)}`;
}

function setupEventListeners(allGames) {
  const yearSelect = document.getElementById("yearFilter");
  const teamInput = document.getElementById("teamFilter");

  document.getElementById("prevPage").onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      renderCards();
    }
  };

  document.getElementById("nextPage").onclick = () => {
    if (currentPage < Math.ceil(getValidGames().length / rowsPerPage)) {
      currentPage++;
      renderCards();
    }
  };

  yearSelect.addEventListener("change", () => {
    currentPage = 1;
    applyFilters(allGames);
  });

  teamInput.addEventListener("input", () => {
    currentPage = 1;
    applyFilters(allGames);
  });
}

function applyFilters(allGames) {
  const year = document.getElementById("yearFilter").value;
  const team = document.getElementById("teamFilter").value.toLowerCase();

  filteredGames = allGames.filter(game => {
    const matchYear = game.date?.slice(0, 4);
    const matchesYear = year === "all" || matchYear === year;
    const matchesTeam =
      game.home_team.toLowerCase().includes(team) ||
      game.away_team.toLowerCase().includes(team);

    return matchesYear && matchesTeam;
  });

  renderCards();
}

function getValidGames() {
  return filteredGames.filter(game =>
    game.home_team && game.away_team &&
    game.home_logo && game.away_logo &&
    game.home_club_goals !== undefined && game.away_club_goals !== undefined &&
    game.stadium && game.date
  );
}

function populateYearDropdown(games) {
  const yearSelect = document.getElementById("yearFilter");
  const years = [...new Set(games.map(g => g.date?.slice(0, 4)).filter(Boolean))].sort((a, b) => b - a);

  years.forEach(year => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  });
}
