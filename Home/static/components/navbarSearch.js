// Wait until the navbar is injected into the page
// Wait until the navbar is injected into the page
const observer = new MutationObserver(() => {
  const searchInput = document.getElementById("search-bar");
  const resultBox = document.getElementById("search-results");

  if (searchInput && resultBox) {
    observer.disconnect(); // Stop observing once found

    let allPlayers = [];
    let allClubs = [];

    // Load player and club data
    Promise.all([
      fetch("/data/players.csv").then(res => res.text()),
      fetch("/data/clubs.csv").then(res => res.text())
    ]).then(([playerCSV, clubCSV]) => {
      // Parse players
      const playerRows = playerCSV.trim().split("\n");
      const playerHeaders = playerRows[0].split(",");
      allPlayers = playerRows.slice(1).map(row => {
        const cols = row.split(",");
        const player = {};
        playerHeaders.forEach((h, i) => player[h] = cols[i]);
        return player;
      });

      // Parse clubs
      const clubRows = clubCSV.trim().split("\n");
      const clubHeaders = clubRows[0].split(",");
      allClubs = clubRows.slice(1).map(row => {
        const cols = row.split(",");
        const club = {};
        clubHeaders.forEach((h, i) => club[h] = cols[i]);
        return club;
      });
    });

    searchInput.addEventListener("input", () => {
      const query = searchInput.value.trim().toLowerCase();
      if (!query) {
        resultBox.style.display = "none";
        return;
      }

      // Filter player results
      const playerResults = allPlayers.filter(p =>
        (p.first_name && p.first_name.toLowerCase().includes(query)) ||
        (p.last_name && p.last_name.toLowerCase().includes(query)) ||
        (p.name && p.name.toLowerCase().includes(query))
      ).slice(0, 5);


      // Filter club results
      const clubResults = allClubs.filter(c =>
        c.name && c.name.toLowerCase().includes(query)
      ).slice(0, 5);

      // Combine and display results
      resultBox.innerHTML = [
        ...playerResults.map(p =>
          `<div onclick="location.href='/Home/pages/player_info.html?playerId=${p.player_id}'">
            <i class='fas fa-user'></i> ${p.name} (${p.current_club_name})
          </div>`
        ),
        ...clubResults.map(c =>
          `<div onclick="location.href='/Home/pages/club_info.html?club_id=${c.club_id}'">
            <i class='fas fa-shield-alt'></i> ${c.name}
          </div>`
        )
      ].join("");

      resultBox.style.display = resultBox.innerHTML ? "block" : "none";
    });

    searchInput.addEventListener("blur", () => {
      setTimeout(() => resultBox.style.display = "none", 200);
    });
  }
});

// Observe changes in the document body to catch dynamic navbar insertion
observer.observe(document.body, { childList: true, subtree: true });

  