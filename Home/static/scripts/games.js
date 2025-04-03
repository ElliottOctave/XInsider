const gamesCsvUrl = "../../data/games.csv";
const clubsCsvUrl = "../../data/clubs.csv";

let currentPage = 1;
const rowsPerPage = 10;
let filteredGames = [];

Promise.all([
  fetch(gamesCsvUrl).then(res => res.text()),
  fetch(clubsCsvUrl).then(res => res.text())
])
  .then(([gamesCsv, clubsCsv]) => {
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

    const clubMap = {};
    clubs.forEach(club => {
      clubMap[club.club_id] = club.name;
    });

    games.forEach(game => {
      game.home_team = clubMap[game.home_club_id] || game.home_club_name || "Unknown";
      game.away_team = clubMap[game.away_club_id] || game.away_club_name || "Unknown";
    });

    filteredGames = games;

    populateYearDropdown(games);
    renderTable();
    setupEventListeners(games);
  });

function renderTable() {
  const tableBody = document.querySelector("#matches-table tbody");
  tableBody.innerHTML = "";

  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const paginatedGames = filteredGames.slice(start, end);

  paginatedGames.forEach(game => {
    const row = document.createElement("tr");
    const score = `${game.home_club_goals || "?"} - ${game.away_club_goals || "?"}`;
    row.innerHTML = `
      <td>${game.date}</td>
      <td>${game.home_team}</td>
      <td>${game.away_team}</td>
      <td>${score}</td>
      <td>${game.stadium || "Unknown"}</td>
    `;
    tableBody.appendChild(row);
  });

  document.getElementById("pageInfo").textContent = 
    `Page ${currentPage} of ${Math.ceil(filteredGames.length / rowsPerPage)}`;
}

function setupEventListeners(allGames) {
  const yearSelect = document.getElementById("yearFilter");
  const teamInput = document.getElementById("teamFilter");

  document.getElementById("prevPage").onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable();
    }
  };

  document.getElementById("nextPage").onclick = () => {
    if (currentPage < Math.ceil(filteredGames.length / rowsPerPage)) {
      currentPage++;
      renderTable();
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

  renderTable();
}

function populateYearDropdown(games) {
  const yearSelect = document.getElementById("yearFilter");
  const years = [...new Set(games.map(g => g.date?.slice(0, 4)).filter(Boolean))].sort();

  years.forEach(year => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  });
}
