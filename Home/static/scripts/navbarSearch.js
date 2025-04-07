// Wait until the navbar is injected into the page
const observer = new MutationObserver(() => {
    const searchInput = document.getElementById("search-bar");
    const resultBox = document.getElementById("search-results");
  
    if (searchInput && resultBox) {
      observer.disconnect(); // Stop observing once found
  
      let allPlayers = [];
  
      // Load player data
      fetch("/data/players.csv")
        .then(res => res.text())
        .then(csv => {
          const rows = csv.trim().split("\n");
          const headers = rows[0].split(",");
          allPlayers = rows.slice(1).map(row => {
            const cols = row.split(",");
            const player = {};
            headers.forEach((h, i) => player[h] = cols[i]);
            return player;
          });
        });
  
      searchInput.addEventListener("input", () => {
        const query = searchInput.value.trim().toLowerCase();
        if (!query) {
          resultBox.style.display = "none";
          return;
        }
  
        const results = allPlayers.filter(p =>
          (p.first_name && p.first_name.toLowerCase().includes(query)) ||
          (p.last_name && p.last_name.toLowerCase().includes(query)) ||
          (p.name && p.name.toLowerCase().includes(query)) ||
          (p.current_club_name && p.current_club_name.toLowerCase().includes(query))
        ).slice(0, 5);
  
        resultBox.innerHTML = results.map(p =>
          `<div onclick="location.href='/Home/templates/player_info.html?playerId=${p.player_id}'">
            ${p.name} (${p.current_club_name})
          </div>`
        ).join("");
  
        resultBox.style.display = results.length ? "block" : "none";
      });
  
      searchInput.addEventListener("blur", () => {
        setTimeout(() => resultBox.style.display = "none", 200);
      });
    }
  });
  
  // Observe changes in the document body to catch dynamic navbar insertion
  observer.observe(document.body, { childList: true, subtree: true });
  