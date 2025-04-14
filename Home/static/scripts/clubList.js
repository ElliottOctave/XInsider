const clubsCsvUrl = '../../data/clubs.csv';
const logosCsvUrl = '../../data/club_logos.csv';

Promise.all([
  fetch(clubsCsvUrl).then(res => res.text()),
  fetch(logosCsvUrl).then(res => res.text())
])
  .then(([clubsText, logosText]) => {
    const parseCSV = (csv) => {
      const [headerLine, ...lines] = csv.trim().split('\n');
      const headers = headerLine.split(',').map(h => h.trim());
      return lines.map(line => {
        const values = line.split(',').map(v => v.trim());
        return headers.reduce((obj, key, i) => {
          obj[key] = values[i];
          return obj;
        }, {});
      });
    };

    const clubs = parseCSV(clubsText);
    const logos = parseCSV(logosText);

    // Maak een map van logo's op club_id
    const logoMap = {};
    logos.forEach(logo => {
      logoMap[logo.club_id] = logo.logo_url;
    });

    // Voeg logo_url toe aan elk club-object
    clubs.forEach(club => {
      club.logo_url = logoMap[club.club_id] || 'https://via.placeholder.com/50'; // fallback
    });

    const clubsListContainer = document.getElementById('clubs-list');
    const searchBar = document.getElementById('club-search-bar');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');

    let currentPage = 1;
    const clubsPerPage = 20;
    let filteredClubs = [...clubs];

    function renderClubs(clubList) {
      clubsListContainer.innerHTML = '';

      const startIndex = (currentPage - 1) * clubsPerPage;
      const endIndex = startIndex + clubsPerPage;
      const clubsToShow = clubList.slice(startIndex, endIndex);

      clubsToShow.forEach(club => {
        const clubItem = document.createElement('div');
        clubItem.classList.add('club-item');

        const clubImage = document.createElement('img');
        clubImage.src = club.logo_url;
        clubImage.alt = `${club.club_name}`;
        clubImage.classList.add('club-image');

        const clubLink = document.createElement('a');
        clubLink.href = `/Home/templates/club_info.html?club_id=${club.club_id}`;
        clubLink.textContent = `${club.name}`;

        const clubDetails = document.createElement('p');
        clubDetails.textContent = `${club.country || ''}`;

        clubItem.appendChild(clubImage);
        clubItem.appendChild(clubLink);
        clubItem.appendChild(clubDetails);

        clubsListContainer.appendChild(clubItem);
      });

      const totalPages = Math.ceil(clubList.length / clubsPerPage);
      pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
      prevBtn.disabled = currentPage === 1;
      nextBtn.disabled = currentPage === totalPages;
    }

    function filterClubs() {
      const query = searchBar.value.toLowerCase();
      filteredClubs = clubs.filter(club =>
        club.name.toLowerCase().includes(query) ||
        (club.country && club.country.toLowerCase().includes(query))
      );
      currentPage = 1;
      renderClubs(filteredClubs);
    }

    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderClubs(filteredClubs);
      }
    });

    nextBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredClubs.length / clubsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderClubs(filteredClubs);
      }
    });

    searchBar.addEventListener('input', filterClubs);

    renderClubs(filteredClubs);
  })
  .catch(error => {
    console.error("Error loading or processing CSV files:", error);
  });
