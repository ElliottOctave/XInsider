let mode = "player";
const playersCsv = "/data/players.csv";
const clubsCsv = "/data/clubs.csv";

const compare1 = document.getElementById("compare1");
const compare2 = document.getElementById("compare2");
const list1 = document.getElementById("compare1-list");
const list2 = document.getElementById("compare2-list");

// Listen for radio button change
document.querySelectorAll('input[name="mode"]').forEach(radio => {
  radio.addEventListener("change", event => {
    setMode(event.target.value);
  });
});

// Mode switch logic
function setMode(newMode) {
  mode = newMode;

  // Update placeholders
  compare1.placeholder = mode === "player" ? "Player 1" : "Club 1";
  compare2.placeholder = mode === "player" ? "Player 2" : "Club 2";

  // Clear inputs
  compare1.value = "";
  compare2.value = "";

  // Load suggestions
  loadSuggestions();
}

// Load suggestions
function loadSuggestions() {
  const source = mode === "player" ? playersCsv : clubsCsv;
  d3.csv(source).then(data => {
    const names = data.map(d => d.name);
    const optionsHtml = names.map(n => `<option value="${n}">`).join("");
    list1.innerHTML = optionsHtml;
    list2.innerHTML = optionsHtml;
  });
}
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

  console.log(games);

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





// Handle form
document.getElementById("compare-form").addEventListener("submit", e => {
  e.preventDefault();
  const entity1 = encodeURIComponent(compare1.value.trim());
  const entity2 = encodeURIComponent(compare2.value.trim());
  const type = mode === "player" ? "players" : "clubs";
  window.location.href = `/Home/templates/compare_${type}.html?first=${entity1}&second=${entity2}`;
});

// Init
setMode("player");
showGamesCalendar();
