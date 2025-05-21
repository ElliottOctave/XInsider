document.addEventListener("DOMContentLoaded", () => {
  let mode = "player";
  let playersList = [];
  let clubsList = [];

  const playersCsv = "/data/players.csv";
  const clubsCsv = "/data/clubs.csv";

  function setMode(newMode) {
    mode = newMode;

    // Update heading
    const heading = document.getElementById("compare-heading");
    heading.textContent = mode === "player" ? "Compare players" : "Compare teams";

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
    d3.csv(clubsCsv),
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

  const triggerCompare = async () => {
  const val1 = compare1.getValue();
  const val2 = compare2.getValue();

  if (val1 && val2 && val1.toLowerCase() !== val2.toLowerCase()) {
    const type = mode === "player" ? "players" : "clubs";

    // Show loaders
    const overlay = document.getElementById('loading-overlay');
    const inlineLoader = document.getElementById('compare-loader');
    if (overlay) overlay.style.display = 'block';
    if (inlineLoader) inlineLoader.style.display = 'inline-block';

    // Load radar/chart
    await loadComparison(type, val1, val2);

    // Hide loaders
    if (overlay) overlay.style.display = 'none';
    if (inlineLoader) inlineLoader.style.display = 'none';

    // Show comparison section
    const compareResult = document.getElementById('compare-result');
    compareResult.style.display = 'block';
    document.getElementById('compare-title').textContent = `${val1} vs ${val2}`;

    compareResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

    compare1.on('change', triggerCompare);
    compare2.on('change', triggerCompare);
  });

  // Modal close logic
  const closeBtn = document.querySelector('.close-modal');
  const modal = document.getElementById('compareModal');

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    });
  }
});
