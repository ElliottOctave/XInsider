const playersCsvUrl = '../../data/players.csv';

fetch(playersCsvUrl)
  .then(response => response.text())
  .then(csvText => {
    const rows = csvText.trim().split('\n');
    const headers = rows[0].split(',');
    let players = rows.slice(1).map(row => {
      const columns = row.split(',');
      let player = {};
      columns.forEach((column, index) => {
        player[headers[index]] = column.trim();
      });
      return player;
    });

    const playersListContainer = document.getElementById('players-list');
    const searchBar = document.getElementById('player-search-bar');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');

    // Pagination state
    let currentPage = 1;
    const playersPerPage = 20;
    let filteredPlayers = [...players]; // Initially, show all players

    // Function to render players for the current page
    function renderPlayers(playerList) {
      playersListContainer.innerHTML = '';

      const startIndex = (currentPage - 1) * playersPerPage;
      const endIndex = startIndex + playersPerPage;
      const playersToShow = playerList.slice(startIndex, endIndex);

      playersToShow.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.classList.add('player-item');

        const playerImage = document.createElement('img');
        playerImage.src = player.image_url;
        playerImage.alt = `${player.first_name} ${player.last_name}`;
        playerImage.classList.add('player-image');

        const playerLink = document.createElement('a');
        playerLink.href = `/Home/templates/player_info.html?playerId=${player.player_id}`;
        playerLink.textContent = `${player.first_name} ${player.last_name}`;

        const playerDetails = document.createElement('p');
        playerDetails.textContent = `${player.current_club_name}`;

        playerItem.appendChild(playerImage);
        playerItem.appendChild(playerLink);
        playerItem.appendChild(playerDetails);

        playersListContainer.appendChild(playerItem);
      });

      // Update page info
      const totalPages = Math.ceil(playerList.length / playersPerPage);
      pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

      // Disable buttons appropriately
      prevBtn.disabled = currentPage === 1;
      nextBtn.disabled = currentPage === totalPages;
    }

    // Search filter
    function filterPlayers() {
      const query = searchBar.value.toLowerCase();
      filteredPlayers = players.filter(player =>
        player.first_name.toLowerCase().includes(query) ||
        player.last_name.toLowerCase().includes(query) ||
        player.name.toLowerCase().includes(query) ||
        player.current_club_name.toLowerCase().includes(query)
      );
      currentPage = 1; // Reset to page 1 on new search
      renderPlayers(filteredPlayers);
    }

    // Pagination controls
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderPlayers(filteredPlayers);
      }
    });

    nextBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredPlayers.length / playersPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderPlayers(filteredPlayers);
      }
    });

    searchBar.addEventListener('input', filterPlayers);

    // Initial render
    renderPlayers(filteredPlayers);
  })
  .catch(error => {
    console.error("Error fetching or parsing CSV:", error);
  });
