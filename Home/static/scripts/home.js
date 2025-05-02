document.addEventListener("DOMContentLoaded", () => {
  let mode = "player";
  let playersList = [];
  let clubsList = [];

  const playersCsv = "/data/players.csv";
  const clubsCsv = "/data/clubs.csv";

  function setMode(newMode) {
    mode = newMode;

    const compare1 = $('#compare1')[0].selectize;
    const compare2 = $('#compare2')[0].selectize;

    // Clear values
    compare1.clear();
    compare2.clear();

    // Update placeholders
    compare1.settings.placeholder = mode === "player" ? "Player 1" : "Team 1";
    compare2.settings.placeholder = mode === "player" ? "Player 2" : "Team 2";
    compare1.updatePlaceholder();
    compare2.updatePlaceholder();

    // Filter options based on mode
    compare1.clearOptions();
    compare2.clearOptions();

    const source = mode === "player" ? playersList : clubsList;
    source.forEach(entry => {
      compare1.addOption({ value: entry.name, text: entry.name });
      compare2.addOption({ value: entry.name, text: entry.name });
    });

    compare1.refreshOptions(false);
    compare2.refreshOptions(false);
  }

  // Init radio buttons
  document.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.addEventListener("change", event => {
      setMode(event.target.value);
    });
  });

  // Fetch players/clubs and init Selectize
  Promise.all([
    d3.csv(playersCsv),
    d3.csv(clubsCsv)
  ]).then(([players, clubs]) => {
    playersList = players;
    clubsList = clubs;

    const compare1 = $('#compare1').selectize({
      placeholder: "Player 1"
    })[0].selectize;

    const compare2 = $('#compare2').selectize({
      placeholder: "Player 2"
    })[0].selectize;

    setMode("player");

    const triggerCompare = () => {
      const val1 = compare1.getValue();
      const val2 = compare2.getValue();
      if (val1 && val2 && val1.toLowerCase() !== val2.toLowerCase()) {
        const type = mode === "player" ? "players" : "clubs";
        const query = new URLSearchParams({
          type: type,
          first: val1,
          second: val2
        }).toString();
        window.location.href = `/Home/pages/compare.html?${query}`;
      }
    };

    compare1.on('change', triggerCompare);
    compare2.on('change', triggerCompare);
  });

  showGamesCalendar();
  showPlayerCountries();
});


/*
    const svg = d3.select("#calendar")
      .append("svg")
      .attr("width", width)
      .attr("height", height * years.length)
      .attr("viewBox", [0, 0, width, height * years.length])
      .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");
*/

async function showGamesCalendar() {
  const cellSize = 16;
  const height = cellSize * 9;
  const width = (cellSize + 1.5) * 53;

  const formatValue = d3.format("+.2%");
  const formatDate = d3.utcFormat("%x");
  const formatDay = i => "MTWTFSS"[i];  // Day labels: Sunday, Monday, ..., Saturday
  const formatMonth = d3.utcFormat("%b");

  const timeWeek = d3.utcMonday;
  const countDay = i => i;  // Adjusted to correctly represent days (0 = Sunday, 6 = Saturday)

  // Step 1: Load the games data and parse the dates
  const games = await d3.csv("../../data/games.csv", d => ({
    date: new Date(d.date)
  }));

  // Step 2: Group by day and count the number of games for each day
  const data = d3.rollups(
    games,
    v => v.length,  // count the number of games on each date
    d => d3.utcDay(d.date)  // group by day (ignoring time)
  ).map(([date, count]) => ({
    date: new Date(date),
    value: count, // number of games on that day
  }));

  // Step 3: Set up color scale
  const max = d3.quantile(data, 0.9975, d => Math.abs(d.value));
  const color = d3.scaleSequential(d3.interpolateBlues).domain([0, max]);

  // Step 4: Group data by year (so we can display each year in reverse order)
  const years = d3.groups(data, d => d.date.getUTCFullYear()).reverse();

  // A function that draws month boundaries (white lines separating months)
  function pathMonth(t) {
    const d = countDay(t.getUTCDay()); // Get the correct day of the week (0 = Sunday, ..., 6 = Saturday)
    const w = timeWeek.count(d3.utcYear(t), t);
    return `${d === 0 ? `M${w * cellSize},0`
        : d === 6 ? `M${(w + 1) * cellSize},0`
        : `M${(w + 1) * cellSize},0V${d * cellSize}H${w * cellSize}`}V${7 * cellSize}`;  // Adjust path to include Saturday
  }

  // Step 5: Set up the SVG canvas
  const svg = d3.select("#calendar")
    .append("svg")
    .attr("width", width)
    .attr("height", height * years.length)
    .attr("viewBox", [0, 0, width, height * years.length])
    .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

  // Step 6: Create the calendar for each year
  const year = svg.selectAll("g")
    .data(years)
    .join("g")
      .attr("transform", (d, i) => `translate(40.5,${height * i + cellSize * 1.5})`);

  // Step 7: Add the year label
  year.append("text")
      .attr("x", -5)
      .attr("y", -5)
      .attr("font-weight", "bold")
      .attr("text-anchor", "end")
      .text(([key]) => key);

  // Step 8: Add the day of the week labels
  year.append("g")
      .attr("text-anchor", "end")
    .selectAll()
    .data(d3.range(7)) // Include all 7 days (Sunday to Saturday)
    .join("text")
      .attr("x", -5)
      .attr("y", i => (countDay(i) + 0.5) * cellSize)
      .attr("dy", "0.31em")
      .text(formatDay);

  // Step 9: Add the rectangles representing the number of games
  year.append("g")
    .selectAll()
    .data(([, values]) => values)  // Include all days
    .join("rect")
      .attr("width", cellSize - 1)
      .attr("height", cellSize - 1)
      .attr("x", d => timeWeek.count(d3.utcYear(d.date), d.date) * cellSize + 0.5)
      .attr("y", d => countDay(d.date.getUTCDay()) * cellSize + 0.5)
      .attr("fill", d => color(d.value))
    .append("title")
      .text(d => `${formatDate(d.date)}\n${d.value} games`);

  // Step 10: Add month separators (white lines)
  const month = year.append("g")
    .selectAll()
    .data(([, values]) => d3.utcMonths(d3.utcMonth(values[0].date), values.at(-1).date))
    .join("g");

  month.filter((d, i) => i).append("path")
      .attr("fill", "none")
      .attr("stroke", "#000")
      .attr("stroke-width", 3)
      .attr("d", pathMonth);

  month.append("text")
      .attr("x", d => timeWeek.count(d3.utcYear(d), timeWeek.ceil(d)) * cellSize + 2)
      .attr("y", -5)
      .text(formatMonth);

  return svg.node();
}

async function showPlayerCountries() {
  // Specify the chart’s dimensions.
  const width = 800;
  const marginTop = 46;
  const height = width / 2 + marginTop;

  // Fit the projection.
  const projection = d3.geoEqualEarth().fitExtent([[2, marginTop + 2], [width - 2, height]], {type: "Sphere"});
  const path = d3.geoPath(projection);

  // Load the player data (CSV).
  const players = await d3.csv("../../processed_data/player_summary.csv");

  // Count the number of players per country of birth.
  const countryCounts = players.reduce((acc, player) => {
    const country = player.country_of_birth;
    acc[country] = (acc[country] || 0) + 1;
    return acc;
  }, {});

  // Load the GeoJSON data for countries.
  const world = await d3.json("https://unpkg.com/world-atlas@2/countries-110m.json");
  const countries = topojson.feature(world, world.objects.countries);
  const countrymesh = topojson.mesh(world, world.objects.countries, (a, b) => a !== b);

  // Map the number of players to each country in the GeoJSON data.
  countries.features.forEach(country => {
    const countryName = country.properties.name;
    country.properties.playerCount = countryCounts[countryName] || 0;  // Default to 0 if no players from this country
  });

  // Create the color scale based on player count
  const maxPlayers = d3.max(countries.features, d => d.properties.playerCount);
  const color = d3.scaleSequential(d3.interpolateYlGnBu).domain([0, maxPlayers]);

  // Create the SVG container.
  const svg = d3.select("#countries")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("viewBox", [0, 0, width, height])
  .attr("style", "max-width: 100%; height: auto;");

  // Add a white sphere with a black border.
  svg.append("path")
    .datum({type: "Sphere"})
    .attr("fill", "white")
    .attr("stroke", "black")
    .attr("d", path);

  // Add a path for each country and color it based on the number of players.
  svg.append("g")
    .selectAll("path")
    .data(countries.features)
    .join("path")
    .attr("fill", d => color(d.properties.playerCount))
    .attr("d", path)
    .append("title")
    .text(d => `${d.properties.name}\n${d.properties.playerCount} players`);

  // Add a white mesh (country borders).
  svg.append("path")
    .datum(countrymesh)
    .attr("fill", "none")
    .attr("stroke", "white")
    .attr("d", path);

console.log('Loaded countries:', countries);
console.log('Max Players:', maxPlayers);

}