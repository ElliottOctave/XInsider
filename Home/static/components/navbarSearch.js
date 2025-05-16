// Dynamically inject required scripts and styles for Selectize
function loadSelectizeDependencies(callback) {
  const head = document.head;

  const injectScript = (src) => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      head.appendChild(script);
    });
  };

  const injectCSS = (href) => {
    return new Promise((resolve) => {
      const link = document.createElement('link');
      link.rel = "stylesheet";
      link.href = href;
      link.onload = resolve;
      head.appendChild(link);
    });
  };

  Promise.all([
    injectCSS("https://cdn.jsdelivr.net/npm/selectize/dist/css/selectize.default.css"),
    injectScript("https://code.jquery.com/jquery-3.6.0.min.js"),
    injectScript("https://cdn.jsdelivr.net/npm/selectize/dist/js/standalone/selectize.min.js")
  ]).then(callback);
}

// Start observing for navbar injection
const observer = new MutationObserver(() => {
  const searchInput = document.getElementById("search-bar");

  if (searchInput && !searchInput.classList.contains("selectize-initialized")) {
    observer.disconnect();

    loadSelectizeDependencies(() => {
      initializeNavbarSearch(); // defined below
    });
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Main logic after Selectize is loaded
function initializeNavbarSearch() {
  const searchInput = document.getElementById("search-bar");
  if (!searchInput) return;

  let allPlayers = [], allClubs = [];

  Promise.all([
    fetch("/data/players.csv").then(res => res.text()),
    fetch("/data/clubs.csv").then(res => res.text())
  ]).then(([playerCSV, clubCSV]) => {
    const parseCsv = (csv) => {
      const [header, ...rows] = csv.trim().split("\n");
      const keys = header.split(",");
      return rows.map(row => {
        const values = row.split(",");
        return Object.fromEntries(keys.map((k, i) => [k.trim(), values[i]?.trim()]));
      });
    };

    allPlayers = parseCsv(playerCSV);
    allClubs = parseCsv(clubCSV);

    const options = [
      ...allPlayers.map(p => ({
        value: `player-${p.player_id}`,
        text: `${p.name} (${p.current_club_name})`,
        url: `/Home/pages/player_info.html?playerId=${p.player_id}`,
        icon: "fas fa-user"
      })),
      ...allClubs.map(c => ({
        value: `club-${c.club_id}`,
        text: c.name,
        url: `/Home/pages/club_info.html?club_id=${c.club_id}`,
        icon: "fas fa-shield-alt"
      }))
    ];

    $('#search-bar').selectize({
      options,
      valueField: 'value',
      labelField: 'text',
      searchField: 'text',
      maxOptions: 10,
      placeholder: "Search players or clubs...",
      render: {
        option: function(data, escape) {
          return `<div><i class="${escape(data.icon)}"></i> ${escape(data.text)}</div>`;
        }
      },
      onChange: function(value) {
        const selected = options.find(opt => opt.value === value);
        if (selected) window.location.href = selected.url;
      }
    });

    searchInput.classList.add("selectize-initialized");
  });
}
