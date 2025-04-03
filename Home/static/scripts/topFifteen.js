const fileUrls = {
    appearances: "../../../data/appearances.csv",
    gameEvents: "../../../data/game_events.csv",
    gameLineups: "../../../data/game_lineups.csv",
    players: "../../../data/players.csv",
    clubs: "../../../data/clubs.csv"
  };
  
  const categories = [];
  
  Promise.all([
    d3.csv(fileUrls.appearances),
    d3.csv(fileUrls.gameEvents),
    d3.csv(fileUrls.gameLineups),
    d3.csv(fileUrls.players),
    d3.csv(fileUrls.clubs)
  ]).then(([appearances, events, lineups, players, clubs]) => {
    const goals = events.filter(e => e.type === "Goal" && e.player_id)
      .reduce((map, e) => {
        const name = e.player_id;
        map[name] = (map[name] || 0) + 1;
        return map;
      }, {});
    const topScorers = Object.entries(goals).map(([Player, Goals]) => ({ Player, Goals }))
      .sort((a, b) => b.Goals - a.Goals).slice(0, 15);
    categories.push({ title: "Top 15 Scorers", data: topScorers });
  
    const keepers = lineups.filter(l => l.position === "Goalkeeper")
      .reduce((map, l) => {
        const name = l.player_name || l.player_id;
        map[name] = (map[name] || 0) + 1;
        return map;
      }, {});
    const topKeepers = Object.entries(keepers).map(([Goalkeeper, Appearances]) => ({ Goalkeeper, Appearances }))
      .sort((a, b) => b.Appearances - a.Appearances).slice(0, 15);
    categories.push({ title: "Top 15 Goalkeepers by Appearances", data: topKeepers });
  
    const reds = appearances.reduce((map, a) => {
      const name = a.player_name || a.player_id;
      const red = parseInt(a.red_cards || 0);
      map[name] = (map[name] || 0) + red;
      return map;
    }, {});
    const topReds = Object.entries(reds).map(([Player, RedCards]) => ({ Player, RedCards }))
      .filter(r => r.RedCards > 0).sort((a, b) => b.RedCards - a.RedCards).slice(0, 15);
    categories.push({ title: "Top 15 Players with Red Cards", data: topReds });
  
    const topValuable = players.filter(p => p.market_value_in_eur)
      .map(p => ({ Player: p.name, Value: +p.market_value_in_eur }))
      .sort((a, b) => b.Value - a.Value).slice(0, 15);
    categories.push({ title: "Top 15 Most Valuable Players", data: topValuable });
  
    const topHighest = players.filter(p => p.highest_market_value_in_eur)
      .map(p => ({ Player: p.name, PeakValue: +p.highest_market_value_in_eur }))
      .sort((a, b) => b.PeakValue - a.PeakValue).slice(0, 15);
    categories.push({ title: "Top 15 Players by Career Market Value", data: topHighest });
  
    const topClubs = clubs.filter(c => c.total_market_value)
      .map(c => ({ Club: c.name, Value: +c.total_market_value }))
      .sort((a, b) => b.Value - a.Value).slice(0, 15);
    categories.push({ title: "Top 15 Clubs by Market Value", data: topClubs });
  
    rotateTable();
  });
  
  let categoryIndex = 0;
  
  function rotateTable() {
    const container = document.getElementById("top15-table");
    const current = categories[categoryIndex];
    container.innerHTML = `<h3>${current.title}</h3>` + buildTableHTML(current.data);
    categoryIndex = (categoryIndex + 1) % categories.length;
    setTimeout(rotateTable, 1000);
  }
  
  function buildTableHTML(data) {
    if (!data.length) return "<p>No data available</p>";
    const keys = Object.keys(data[0]);
    const header = `<tr>${keys.map(k => `<th>${k}</th>`).join("")}</tr>`;
    const rows = data.map(row =>
      `<tr>${keys.map(k => `<td>${row[k]}</td>`).join("")}</tr>`
    ).join("");
    return `<table>${header}${rows}</table>`;
  }
  