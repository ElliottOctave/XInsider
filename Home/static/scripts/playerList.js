// Path to the players.csv file
const playersCsvUrl = '../../data/players.csv';

// Fetch and parse the CSV file manually
fetch(playersCsvUrl)
  .then(response => response.text()) // Get the CSV text
  .then(csvText => {
    // Split the CSV into rows
    const rows = csvText.split('\n');

    // Extract headers (first row)
    const headers = rows[0].split(',');

    // Map through the rows and create an array of player objects
    let players = rows.slice(1).map(row => {
      const columns = row.split(',');
      let player = {};
      columns.forEach((column, index) => {
        player[headers[index]] = column.trim(); // Map columns to headers
      });
      return player;
    });

    // ⚡ Limit to the first 1000 players
    players = players.slice(0, 1000);

    // Get the container where the player list will be displayed
    const playersListContainer = document.getElementById('players-list');

    // Loop through the limited players and create a list item for each player
    players.forEach(player => {
      // Create a div for each player
      const playerItem = document.createElement('div');
      playerItem.classList.add('player-item');

      // Create player image element
      const playerImage = document.createElement('img');
      playerImage.src = player.image_url;
      playerImage.alt = `${player.first_name} ${player.last_name}`;
      playerImage.classList.add('player-image');

      // Create a link for each player to go to their profile
      const playerLink = document.createElement('a');
      playerLink.href = `/player-info.html?playerId=${player.player_id}`; // Link to player info page
      playerLink.textContent = `${player.first_name} ${player.last_name}`; // Full name of the player

      // Add additional details (e.g., current club, market value)
      const playerDetails = document.createElement('p');
      playerDetails.textContent = `Current Club: ${player.current_club_name} | Market Value: €${player.market_value_in_eur}`;

      // Append elements to the player item
      playerItem.appendChild(playerImage);
      playerItem.appendChild(playerLink);
      playerItem.appendChild(playerDetails);

      // Append the player item to the container
      playersListContainer.appendChild(playerItem);
    });
  })
  .catch(error => {
    console.error("Error fetching or parsing CSV:", error);
  });
