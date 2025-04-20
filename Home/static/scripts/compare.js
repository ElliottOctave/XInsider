// compare.js – radar chart scaled using precomputed max values with different axis labels and tooltip descriptions
const urlParams = new URLSearchParams(window.location.search);
const type = urlParams.get("type");
const first = urlParams.get("first");
const second = urlParams.get("second");

const maxValues = [
  100,        // Win%
  57,         // Max age (oldest player)
  type === "players" ? 200000000 : 1000000000,  // Max Wealth (latest player valuation)
  type === "players" ? 29 : 5,         // Max Aggressivity
  type === "players" ? 34 : 5,         // Max Assists
  type === "players" ? 34 : 5,           // Max Goals
];

const axisLabels = ["Win%", "Age", "Valuation", "Aggression", "Assists", "Goals"];
const tooltipDescriptions = [
  "Win percentage over games played",
  "Player age or average age of team",
  "Latest market valuation (€)",
  "Aggressivity score (R x2 + Y)",
  "Average number of assists",
  "Average number of goals"
];

Promise.all([
  d3.csv("/data/player_stats.csv"),
  d3.csv("/data/players.csv"),
  d3.csv("/data/clubs.csv"),
  d3.csv("/data/player_valuations.csv"),
  d3.csv("/data/games.csv"),
  d3.csv("/data/appearances.csv"),
  d3.csv("/data/club_logos.csv")
]).then(([stats, players, clubs, valuations, games, appearances, logos]) => {

  const calculateScore = raw => raw.map((v, i) => (v / maxValues[i]) * 100).reduce((a, b) => a + b, 0) / raw.length;

  const getPlayerData = (name) => {
    const playerStats = stats.filter(s => s.player_name === name);
    const playerId = playerStats[0]?.player_id;
    const profile = players.find(p => p.player_id === playerId);
    const wealthVals = valuations.filter(v => v.player_id === playerId);

    const avg = arr => d3.mean(arr.map(Number)) || 0;
    const scoring = avg(playerStats.map(d => d.nr_of_goals));
    const assists = avg(playerStats.map(d => d.assists));
    const reds = avg(playerStats.map(d => d.red_cards));
    const yellows = avg(playerStats.map(d => d.yellow_cards));
    const aggressivity = reds * 2 + yellows;
    const latest = d3.max(wealthVals, v => new Date(v.date));
    const wealth = +wealthVals.find(v => new Date(v.date).getTime() === latest.getTime())?.market_value_in_eur || 0;

    const birthDate = new Date(profile?.date_of_birth);
    const today = new Date();
    const age = birthDate instanceof Date && !isNaN(birthDate)
      ? today.getFullYear() - birthDate.getFullYear()
      : 0;

    const winPercent = (() => {
      const playerAppearances = appearances.filter(a => a.player_id === playerId);
      const playedGames = playerAppearances.map(a => {
        const game = games.find(g => g.game_id === a.game_id);
        if (!game) return null;
        const isHome = a.player_club_id === game.home_club_id;
        const homeGoals = +game.home_club_goals;
        const awayGoals = +game.away_club_goals;
        return isHome ? homeGoals > awayGoals : awayGoals > homeGoals;
      }).filter(r => r !== null);
      const wins = playedGames.filter(Boolean).length;
      return playedGames.length ? (wins / playedGames.length) * 100 : 0;
    })();

    const raw = [winPercent, age, wealth, aggressivity, assists, scoring];
    const score = calculateScore(raw);
    return {
      name,
      raw,
      logo: profile?.image_url,
      score
    };
  };

  const getClubData = (clubName) => {
    const club = clubs.find(c => c.name === clubName);
    const clubId = club?.club_id;
    const clubPlayers = players.filter(p => p.current_club_id === clubId);
    const playerIds = clubPlayers.map(p => p.player_id);

    const clubStats = stats.filter(s => playerIds.includes(s.player_id));
    const avg = arr => d3.mean(arr.map(Number)) || 0;
    const scoring = avg(clubStats.map(d => d.nr_of_goals));
    const assists = avg(clubStats.map(d => d.assists));
    const reds = avg(clubStats.map(d => d.red_cards));
    const yellows = avg(clubStats.map(d => d.yellow_cards));
    const aggressivity = reds * 2 + yellows;

    const clubValuations = valuations.filter(v => playerIds.includes(v.player_id));
    const latestValuations = clubValuations.reduce((map, v) => {
      const date = new Date(v.date);
      const prev = map.get(v.player_id);
      if (!prev || date > prev.date) {
        map.set(v.player_id, { value: +v.market_value_in_eur, date });
      }
      return map;
    }, new Map());
    const wealth = [...latestValuations.values()].reduce((sum, val) => sum + val.value, 0);

    const ages = clubPlayers.map(p => {
      const birthDate = new Date(p.date_of_birth);
      const today = new Date();
      return birthDate instanceof Date && !isNaN(birthDate)
        ? today.getFullYear() - birthDate.getFullYear()
        : 0;
    });
    const avgAge = avg(ages);

    const clubGames = games.filter(g => g.home_club_id === clubId || g.away_club_id === clubId);
    const goalsFor = clubGames.map(g => {
      if (g.home_club_id === clubId) return +g.home_club_goals;
      if (g.away_club_id === clubId) return +g.away_club_goals;
      return 0;
    });
    const avgGoals = avg(goalsFor);

    const winPercent = (() => {
      const wins = clubGames.filter(g => {
        const homeGoals = +g.home_club_goals;
        const awayGoals = +g.away_club_goals;
        if (g.home_club_id === clubId) return homeGoals > awayGoals;
        if (g.away_club_id === clubId) return awayGoals > homeGoals;
        return false;
      }).length;
      return clubGames.length ? (wins / clubGames.length) * 100 : 0;
    })();

    const raw = [winPercent, avgAge, wealth, aggressivity, assists, avgGoals];
    const logoEntry = logos.find(l => l.club_id === clubId || l.club_name === clubName);
    return {
      name: clubName,
      raw,
      logo: logoEntry?.logo_url || "",
      score: calculateScore(raw)
    };
  };

  const getData = type === "players" ? getPlayerData : getClubData;
  const entities = [getData(first), getData(second)];

  renderRadar(entities);
});

function renderRadar(entities) {
  const loadingOverlay = document.getElementById("loading-overlay");
  const canvas = document.getElementById("radarChart");
  canvas.style.maxHeight = "700px";
  const ctx = canvas.getContext("2d");

  const normalized = entities.map(e => ({
    name: e.name,
    raw: e.raw,
    score: e.score,
    logo: e.logo,
    data: e.raw.map((v, i) => maxValues[i] ? (v / maxValues[i]) * 100 : 0)
  }));

  document.getElementById("comparison-logo-team1").innerHTML = `
    <div class="side-by-side">
      <img src="${normalized[0].logo}" alt="${normalized[0].name}" class="compare-logo" />
      <h3>${normalized[0].name}</h3>
      <p>Score: ${Math.round(normalized[0].score)} / 100</p>
    </div>`;

  document.getElementById("comparison-logo-team2").innerHTML = `
    <div class="side-by-side">
      <img src="${normalized[1].logo}" alt="${normalized[1].name}" class="compare-logo" />
      <h3>${normalized[1].name}</h3>
      <p>Score: ${Math.round(normalized[1].score)} / 100</p>
    </div>`;

  new Chart(ctx, {
    plugins: [{
      id: 'onCompleteLoaderHide',
      afterRender: () => {
        if (loadingOverlay) loadingOverlay.style.display = "none";
      }
    }],
    type: 'radar',
    data: {
      labels: axisLabels,
      datasets: normalized.map((e, i) => ({
        label: e.name,
        data: e.data,
        raw: e.raw,
        fill: true,
        backgroundColor: i === 0 ? "rgba(0,123,255,0.2)" : "rgba(255,99,132,0.2)",
        borderColor: i === 0 ? "#007bff" : "#ff6384",
        pointBackgroundColor: "#000"
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              const index = context.dataIndex;
              const dataset = context.dataset;
              const description = tooltipDescriptions[index];
              const value = dataset.raw[index];
              return `${dataset.label} – ${description}: ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
            }
          }
        }
      },
      scales: {
        r: {
          suggestedMin: 0,
          max: 100,
          ticks: { beginAtZero: true }
        }
      }
    }
  });
}
