const playersCsvUrl = '../../processed_data/player_summary.csv';

// Load csv
async function fetchCsv(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch CSV: ${response.statusText}`);
  return response.text();
}

// Make objects from the csv
function parseCsv(csvText) {
  const [headerLine, ...lines] = csvText.trim().split('\n');
  const headers = headerLine.split(',').map(h => h.trim());
  return lines.map(line => {
    const columns = line.split(',').map(c => c.trim());
    return headers.reduce((obj, header, i) => {
      obj[header] = columns[i];
      return obj;
    }, {});
  });
}

// populate the years options for filtering
function populateYearSelect(select, start, end) {
  select.innerHTML = '';
  for (let year = start; year <= end; year++) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    select.appendChild(option);
  }
}

// Create the player cards
function createPlayerElement(player) {
  const playerItem = document.createElement('div');
  playerItem.classList.add('player-item');

  const playerImage = document.createElement('img');
  playerImage.src = player.image_url;
  playerImage.alt = player.name;
  playerImage.classList.add('player-image');

  const playerLink = document.createElement('a');
  playerLink.href = `/Home/pages/player_info.html?playerId=${player.player_id}`;
  playerLink.textContent = player.name;

  const playerDetails = document.createElement('p');
  playerDetails.textContent = `${player.position} | € ${formatValue(player.market_value_in_eur)}`;

  const playerClub = document.createElement('p');
  playerClub.textContent = player.current_club_name;

  playerItem.append(playerImage, playerLink, playerDetails, playerClub);

  return playerItem;
}

// Function to sort players based on the sorting field (sortField) and order (sortOrder)
function sortPlayers(players, sortField, sortOrder) {
  if (!sortField) return players;

  return players.sort((a, b) => {
    let valA = 0
    let valB = 0
    if (sortField == "cards") {
      valA = Number(a['yellow_cards']) + Number(a['red_cards'])
      valB = Number(b['yellow_cards']) + Number(b['red_cards'])
    } else {
      valA = a[sortField];
      valB = b[sortField];
    }
    valA = Number(valA);
    valB = Number(valB);
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
}

// Filtering functions
function filterPlayers(players, filters) {
  const query = filters.query;
  const fromYear = filters.fromYear;
  const toYear = filters.toYear;
  const position = filters.position;
  const nationality = filters.nationality;
  const filteredPlayers = players.filter(player => {
    const nameMatch = player.name.toLowerCase().includes(query);
    const clubMatch = player.current_club_name.toLowerCase().includes(query);
    const playerFirstYear = parseInt(player.first_match_year);
    const playerLastYear = parseInt(player.last_match_year);
    const yearMatch = (playerFirstYear >= fromYear && playerFirstYear <= toYear) || (playerLastYear >= fromYear && playerLastYear <= toYear);
    const positionMatch = !position || player.position.toLowerCase() == position;
    const nationalityMatch = !nationality || player.country_of_citizenship.toLowerCase().includes(nationality);
    return (nameMatch || clubMatch) && yearMatch && positionMatch && nationalityMatch;
  });
  return filteredPlayers
}

function renderPlayers(container, players, page, perPage, pageInfoEl, prevBtn, nextBtn) {
  container.innerHTML = '';
  const totalPages = Math.ceil(players.length / perPage);
  const startIdx = (page - 1) * perPage;
  const endIdx = startIdx + perPage;
  const playersToShow = players.slice(startIdx, endIdx);
  playersToShow.forEach(player => container.appendChild(createPlayerElement(player)));
  pageInfoEl.textContent = `Page ${page} of ${totalPages}`;
  prevBtn.disabled = page <= 1;
  nextBtn.disabled = page >= totalPages;
}

async function showPlayers(dataUrl) {
  // Debugging
  try {
    const csvText = await fetchCsv(dataUrl);
    const players = parseCsv(csvText);
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
    const minYear = 2013;
    const maxYear = 2025;
    const sortButton = document.getElementById('sort-button');
    const sortMenu = document.getElementById('sort-menu');

    populateYearSelect(fromYearSelect, minYear, maxYear);
    populateYearSelect(toYearSelect, minYear, maxYear);
    fromYearSelect.addEventListener('change', () => {
      const selectedFrom = parseInt(fromYearSelect.value);
      if (!isNaN(selectedFrom)) {
        populateYearSelect(toYearSelect, selectedFrom, maxYear);
      } else {
        populateYearSelect(toYearSelect, minYear, maxYear);
      }
    });

    let currentPage = 1;
    const playersPerPage = 20;
    let filteredPlayers = [...players];
    const getFilters = () => ({
      query: searchBar.value.trim().toLowerCase(),
      fromYear: parseInt(fromYearSelect.value),
      toYear: parseInt(toYearSelect.value),
      position: positionFilter.value.trim().toLowerCase(),
      nationality: nationalityFilter.value.trim().toLowerCase()
    });

    function updatePlayers() {
      const sortField = document.getElementById('sort-field').value;
      const sortOrder = document.getElementById('sort-order').value;
      console.log(sortField);
      console.log(sortOrder);
      filteredPlayers = filterPlayers(players, getFilters());
      sortedPlayers = sortPlayers(filteredPlayers, sortField, sortOrder);
      currentPage = 1;
      renderPlayers(playersListContainer, sortedPlayers, currentPage, playersPerPage, pageInfo, prevBtn, nextBtn);
    }

    searchBar.addEventListener('input', updatePlayers);
    applyFiltersBtn.addEventListener('click', updatePlayers);

    // Pagination
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderPlayers(playersListContainer, filteredPlayers, currentPage, playersPerPage, pageInfo, prevBtn, nextBtn);
      }
    });

    nextBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredPlayers.length / playersPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderPlayers(playersListContainer, filteredPlayers, currentPage, playersPerPage, pageInfo, prevBtn, nextBtn);
      }
    });

    sortButton.addEventListener('click', () => {
      const isHidden = sortMenu.hasAttribute('hidden');
      if (isHidden) {
        sortMenu.removeAttribute('hidden');
        sortButton.setAttribute('aria-expanded', 'true');
      } else {
        sortMenu.setAttribute('hidden', '');
        sortButton.setAttribute('aria-expanded', 'false');
      }
    });

    // Handle clicks on sort options
    sortMenu.querySelectorAll('.sort-option').forEach(button => {
      button.addEventListener('click', () => {
        sortField = button.getAttribute('data-field');
        sortOrder = button.getAttribute('data-order');

        // Update sort button label
        sortButton.textContent = `${button.textContent} ▼`;

        // Hide the menu
        sortMenu.setAttribute('hidden', '');
        sortButton.setAttribute('aria-expanded', 'false');
        sortedPlayers = sortPlayers(players, sortField, sortOrder)
        renderPlayers(playersListContainer, sortedPlayers, currentPage, playersPerPage, pageInfo, prevBtn, nextBtn);
      });
    });

    document.addEventListener('click', (event) => {
      if (!sortButton.contains(event.target) && !sortMenu.contains(event.target)) {
        sortMenu.setAttribute('hidden', '');
        sortButton.setAttribute('aria-expanded', 'false');
      }
    });
    
    renderPlayers(playersListContainer, filteredPlayers, currentPage, playersPerPage, pageInfo, prevBtn, nextBtn);
  } catch (error) {
    console.error('Error fetching or processing players data:', error);
  }
}

showPlayers(playersCsvUrl);


function formatValue(num) {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + "M";
  } else if (num >= 1_000) {
    return (num / 1_000).toFixed(0) + "k";
  } else {
    return num.toString();
  }
}

