const playersCsvUrl = '../../processed_data/player_summary.csv';

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
    const fromYearSelect = document.getElementById('from-year');
    const toYearSelect = document.getElementById('to-year');
    const positionFilter = document.getElementById('position-filter');
    const nationalityFilter = document.getElementById('nationality-filter');
    const applyFiltersBtn = document.getElementById('apply-filters');

    // Populate From Year and To Year selects
    const minYear = 2013;
    const maxYear = 2025;

    function populateYearSelect(select, start, end) {
      for (let year = start; year <= end; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        select.appendChild(option);
      }
    }

    populateYearSelect(fromYearSelect, minYear, maxYear);

    fromYearSelect.addEventListener('change', () => {
      const selectedFrom = parseInt(fromYearSelect.value);
      if (!isNaN(selectedFrom)) {
        populateYearSelect(toYearSelect, selectedFrom, maxYear);
      } else {
        populateYearSelect(toYearSelect, minYear, maxYear);
      }
    });

    // Pagination state
    let currentPage = 1;
    const playersPerPage = 20;
    let filteredPlayers = [...players];

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
        playerImage.alt = `${player.name}`;
        playerImage.classList.add('player-image');

        const playerLink = document.createElement('a');
        playerLink.href = `/Home/pages/player_info.html?playerId=${player.player_id}`;
        playerLink.textContent = `${player.name}`;

        const playerDetails = document.createElement('p');
        playerDetails.textContent = `${player.current_club_name}`;

        playerItem.appendChild(playerImage);
        playerItem.appendChild(playerLink);
        playerItem.appendChild(playerDetails);

        playersListContainer.appendChild(playerItem);
      });

      const totalPages = Math.ceil(playerList.length / playersPerPage);
      pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
      prevBtn.disabled = currentPage === 1;
      nextBtn.disabled = currentPage === totalPages;
    }

    function filterPlayers() {
      const query = searchBar.value.toLowerCase();
      const fromYear = parseInt(fromYearSelect.value);
      const toYear = parseInt(toYearSelect.value);
      const selectedPosition = positionFilter.value.toLowerCase();
      const nationalityQuery = nationalityFilter.value.toLowerCase();

      filteredPlayers = players.filter(player => {
        const nameMatch = player.name.toLowerCase().includes(query);
        const clubMatch = player.current_club_name.toLowerCase().includes(query);

        let yearMatch = true;
        const playerFirstYear = parseInt(player.first_match_year);
        const playerLastYear = parseInt(player.last_match_year);

        if (!isNaN(fromYear) && !isNaN(toYear)) {
          yearMatch = (
            (playerFirstYear >= fromYear && playerFirstYear <= toYear) ||
            (playerLastYear >= fromYear && playerLastYear <= toYear)
          );
        }
        const positionMatch = selectedPosition === "" || player.position.toLowerCase() === selectedPosition;
        const nationalityMatch = nationalityQuery === "" || player.country_of_birth.toLowerCase().includes(nationalityQuery);

        return (nameMatch || clubMatch) && yearMatch && positionMatch && nationalityMatch;
      });

      currentPage = 1;
      renderPlayers(filteredPlayers);
    }

    searchBar.addEventListener('input', filterPlayers);
    applyFiltersBtn.addEventListener('click', filterPlayers);

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

    renderPlayers(filteredPlayers);
  })
  .catch(error => {
    console.error("Error fetching or parsing CSV:", error);
  });
