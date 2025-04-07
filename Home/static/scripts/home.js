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
