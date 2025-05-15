const playersCsvUrl = '../../processed_data/player_summary.csv';

async function fetchCsv(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch CSV: ${response.statusText}`);
  return response.text();
}

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

function populateYearSelect(select, start, end) {
  select.innerHTML = '';
  for (let year = start; year <= end; year++) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    select.appendChild(option);
  }
}

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
  playerDetails.textContent = player.current_club_name;

  playerItem.append(playerImage, playerLink, playerDetails);

  return playerItem;
}

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
      filteredPlayers = filterPlayers(players, getFilters());
      currentPage = 1;
      renderPlayers(playersListContainer, filteredPlayers, currentPage, playersPerPage, pageInfo, prevBtn, nextBtn);
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

    // Initial render
    renderPlayers(playersListContainer, filteredPlayers, currentPage, playersPerPage, pageInfo, prevBtn, nextBtn);
  } catch (error) {
    console.error('Error fetching or processing players data:', error);
  }
}

showPlayers(playersCsvUrl);
