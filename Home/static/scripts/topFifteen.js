const summaryUrl = "../../../data/player_summary.csv"; // Adjust path if needed
const categories = [];

d3.csv(summaryUrl).then(data => {
  // Ensure all numbers are parsed
  data.forEach(d => {
    d.goals = +d.goals;
    d.assists = +d.assists;
    d.yellow_cards = +d.yellow_cards;
    d.red_cards = +d.red_cards;
    d.minutes = +d.minutes;
  });

  // Top 15 Scorers
  const topGoals = [...data]
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 15)
    .map(p => ({ Player: p.name, Goals: p.goals }));
  categories.push({ title: "Top 15 Goal Scorers", data: topGoals });

  // Top 15 Assists
  const topAssists = [...data]
    .sort((a, b) => b.assists - a.assists)
    .slice(0, 15)
    .map(p => ({ Player: p.name, Assists: p.assists }));
  categories.push({ title: "Top 15 Assists", data: topAssists });

  // Most Yellow Cards
  const topYellow = [...data]
    .sort((a, b) => b.yellow_cards - a.yellow_cards)
    .slice(0, 15)
    .map(p => ({ Player: p.name, "Yellow Cards": p.yellow_cards }));
  categories.push({ title: "Top 15 Players with Yellow Cards", data: topYellow });

  // Most Red Cards
  const topRed = [...data]
    .sort((a, b) => b.red_cards - a.red_cards)
    .slice(0, 15)
    .map(p => ({ Player: p.name, "Red Cards": p.red_cards }));
  categories.push({ title: "Top 15 Players with Red Cards", data: topRed });

  // Most Minutes Played
  const topMinutes = [...data]
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 15)
    .map(p => ({ Player: p.name, "Minutes Played": p.minutes }));
  categories.push({ title: "Top 15 Players by Minutes Played", data: topMinutes });

  rotateTable();
});

let categoryIndex = 0;
let autoRotateInterval;

function updateTable() {
  const container = document.getElementById("top15-table");
  const current = categories[categoryIndex];
  container.style.opacity = 0;

  setTimeout(() => {
    container.innerHTML = `<h3>${current.title}</h3>` + buildTableHTML(current.data);
    container.style.opacity = 1;
  }, 200);
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

function rotateTable() {
  updateTable();
  categoryIndex = (categoryIndex + 1) % categories.length;
  autoRotateInterval = setTimeout(rotateTable, 10000); // rotate every 10s
}

// Manual navigation
function nextCategory() {
  clearTimeout(autoRotateInterval);
  categoryIndex = (categoryIndex + 1) % categories.length;
  updateTable();
  autoRotateInterval = setTimeout(rotateTable, 10000);
}

function prevCategory() {
  clearTimeout(autoRotateInterval);
  categoryIndex = (categoryIndex - 1 + categories.length) % categories.length;
  updateTable();
  autoRotateInterval = setTimeout(rotateTable, 10000);
}

// Add event listeners after DOM loads
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("next-btn").addEventListener("click", nextCategory);
  document.getElementById("prev-btn").addEventListener("click", prevCategory);
});