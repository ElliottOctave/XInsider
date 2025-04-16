import * as d3 from "d3";

const clubsCsvUrl = '../../data/clubs.csv';
const logosCsvUrl = '../../data/club_logos.csv';
const infoCsvUrl = '../../data/club_info.csv';
const playersCsvUrl = '../../data/players.csv';

function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

Promise.all([
  fetch(clubsCsvUrl).then(res => res.text()),
  fetch(logosCsvUrl).then(res => res.text()),
  fetch(infoCsvUrl).then(res => res.text()),
  fetch(playersCsvUrl).then(res => res.text())
])
  .then(([clubsText, logosText, infoText, playersText]) => {
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
    const clubInfoList = parseCSV(infoText);
    const players = parseCSV(playersText).map(p => ({
      ...p,
      current_club_id: parseInt(p.current_club_id),
      country_of_citizenship: p.country_of_citizenship
    }));

    const logoMap = {};
    logos.forEach(logo => {
      logoMap[logo.club_id] = logo.logo_url;
    });

    clubs.forEach(club => {
      club.logo_url = logoMap[club.club_id] || 'https://via.placeholder.com/100';
    });

    const clubId = parseInt(getQueryParam('club_id'));
    const club = clubs.find(c => parseInt(c.club_id) === clubId);

    if (club) {
      document.getElementById('club-logo').src = club.logo_url;
      document.getElementById('club-name').textContent = club.name;

      // Layout wrapper
      let vizLayout = document.getElementById('viz-layout');
      if (!vizLayout) {
        vizLayout = document.createElement('section');
        vizLayout.id = 'viz-layout';

        const leftCol = document.createElement('div');
        leftCol.id = 'viz-left';

        const rightCol = document.createElement('div');
        rightCol.id = 'viz-right';

        vizLayout.appendChild(leftCol);
        vizLayout.appendChild(rightCol);

        document.querySelector('main').appendChild(vizLayout);
      }

      const info = clubInfoList.find(i => parseInt(i.club_id) === clubId);
      if (info) {
        drawDonutChart(info);
        drawAgeMeter(info);
      }

      drawNationalityBarChart(clubId, players);
      drawPlayerTabs(clubId, players);
      drawTopMarketPlayers(clubId, players);
      drawMarketValueByPosition(clubId, players);
    } else {
      document.getElementById('club-name').textContent = 'Club not found';
    }
  })
  .catch(error => {
    console.error('Error loading club info:', error);
  });


// === DONUT CHART ===
function drawDonutChart(data) {
  const total = +data.squad_size;
  const foreigners = +data.foreigners_number;
  const locals = total - foreigners;

  const vizContainer = document.createElement('section');
  vizContainer.id = 'donut-chart-container';
  vizContainer.innerHTML = `<h2>Team Composition</h2>`;
  document.getElementById('viz-left').appendChild(vizContainer);

  const width = 300;
  const height = 300;
  const radius = Math.min(width, height) / 2;

  const svg = d3.select("#donut-chart-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${width / 2},${height / 2})`);

  const dataValues = [
    { label: "Foreign Players", value: foreigners },
    { label: "Local Players", value: locals }
  ];

  const color = d3.scaleOrdinal()
    .domain(dataValues.map(d => d.label))
    .range(["#0055aa", "#66ccff"]);

  const pie = d3.pie().value(d => d.value);
  const data_ready = pie(dataValues);
  const arc = d3.arc().innerRadius(80).outerRadius(radius);

  svg.selectAll('path')
    .data(data_ready)
    .join('path')
    .attr('d', arc)
    .attr('fill', d => color(d.data.label))
    .attr("stroke", "white")
    .style("stroke-width", "2px");

  svg.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .style('font-size', '24px')
    .style('font-weight', 'bold')
    .text(`${foreigners + locals}`);

  const legend = document.createElement('div');
  legend.className = 'donut-legend';
  dataValues.forEach(item => {
    const entry = document.createElement('div');
    entry.className = 'legend-entry';
    entry.innerHTML = `<span class="legend-color" style="background-color: ${color(item.label)};"></span> ${item.label}: ${item.value}`;
    legend.appendChild(entry);
  });
  vizContainer.appendChild(legend);
}


// === AGE METER ===
function drawAgeMeter(data) {
  const avgAge = +data.average_age;
  const minAge = 18;
  const maxAge = 35;

  const vizContainer = document.createElement('section');
  vizContainer.id = 'age-meter-container';
  vizContainer.innerHTML = `
    <h2>Average Age</h2>
    <div class="meter-wrapper">
      <div class="meter-bar">
        <div class="meter-fill" style="width: ${((avgAge - minAge) / (maxAge - minAge)) * 100}%; background-color: ${
          avgAge < 25 ? '#3399ff' : avgAge < 30 ? '#ffcc00' : '#ff4d4d'
        };">
          <span class="meter-label">${avgAge.toFixed(1)} yrs</span>
        </div>
      </div>
      <div class="meter-scale">
        <span>18</span><span>21</span><span>24</span><span>27</span><span>30</span><span>33</span><span>35</span>
      </div>
    </div>`;
  document.getElementById('viz-left').appendChild(vizContainer);
}


// === NATIONALITY BAR CHART ===
function drawNationalityBarChart(clubId, players) {
      const clubPlayers = players.filter(p => p.current_club_id === clubId && p.country_of_citizenship);
      const nationalityCounts = {};
    
      clubPlayers.forEach(p => {
        const nationality = p.country_of_citizenship;
        nationalityCounts[nationality] = (nationalityCounts[nationality] || 0) + 1;
      });
    
      const data = Object.entries(nationalityCounts).map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count);
    
      if (data.length === 0) return;
    
      const vizContainer = document.createElement('section');
      vizContainer.id = 'nationality-bar-container';
      vizContainer.innerHTML = `<h2>Player Nationalities</h2>`;
      document.getElementById('viz-right').appendChild(vizContainer);
    
      const barWidth = 50; // ⬅️ thicker bars
      const width = data.length * barWidth;
      const maxWrapperWidth = 800;
      const height = 400;
      const margin = { top: 40, right: 30, bottom: 140, left: 60 };
    
      const wrapperDiv = document.createElement('div');
      wrapperDiv.style.overflowX = 'auto';
      wrapperDiv.style.maxWidth = maxWrapperWidth + 'px';
      wrapperDiv.style.margin = '0 auto'; // center it
      vizContainer.appendChild(wrapperDiv);
    
      const svg = d3.select(wrapperDiv)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
      const x = d3.scaleBand()
        .domain(data.map(d => d.country))
        .range([0, width])
        .padding(0.1);
    
      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.count)])
        .range([height, 0]);
    
      svg.append("g")
        .call(d3.axisLeft(y).ticks(5))
        .style("font-size", "13px");
    
      svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("transform", "rotate(-45)")
        .attr("dx", "-0.8em")
        .attr("dy", "0.15em")
        .style("font-size", "12px")
        .style("fill", "#003366");
    
      svg.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", d => x(d.country))
        .attr("y", d => y(d.count))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.count))
        .attr("fill", "#0055aa");
    
      svg.selectAll("text.bar-label")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "bar-label")
        .attr("x", d => x(d.country) + x.bandwidth() / 2)
        .attr("y", d => y(d.count) - 5)
        .attr("text-anchor", "middle")
        .style("fill", "#333")
        .style("font-size", "12px")
        .text(d => d.count);
    }

    function drawPlayerTabs(clubId, players) {
      const clubPlayers = players
        .filter(p => p.current_club_id === clubId && p.name && p.position)
        .sort((a, b) => a.name.localeCompare(b.name));
    
      if (clubPlayers.length === 0) return;
    
      const grouped = {
        Goalkeepers: [],
        Defenders: [],
        Midfielders: [],
        Forwards: [],
        Others: [],
      };
    
      clubPlayers.forEach(p => {
        const pos = p.position.toLowerCase();
        if (pos.includes("goalkeeper")) grouped.Goalkeepers.push(p);
        else if (pos.includes("defender")) grouped.Defenders.push(p);
        else if (pos.includes("midfield")) grouped.Midfielders.push(p);
        else if (pos.includes("forward") || pos.includes("attacker") || pos.includes("striker")) grouped.Forwards.push(p);
        else grouped.Others.push(p);
      });
    
      const container = document.createElement("section");
      container.id = "squad-tabs-section";
      container.innerHTML = `<h2>Squad by Position</h2>`;
      document.querySelector("main").appendChild(container);
    
      const tabWrapper = document.createElement("div");
      tabWrapper.className = "squad-tabs";
    
      const tabButtons = document.createElement("div");
      tabButtons.className = "tab-buttons";
    
      const tabContent = document.createElement("div");
      tabContent.className = "tab-content";
    
      const positions = Object.keys(grouped).filter(pos => grouped[pos].length > 0);
      positions.forEach((position, index) => {
        const btn = document.createElement("button");
        btn.textContent = position;
        if (index === 0) btn.classList.add("active");
        btn.addEventListener("click", () => {
          document.querySelectorAll(".tab-buttons button").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          renderTable(grouped[position]);
        });
        tabButtons.appendChild(btn);
      });
    
      tabWrapper.appendChild(tabButtons);
      tabWrapper.appendChild(tabContent);
      container.appendChild(tabWrapper);
    
      // render first tab by default
      renderTable(grouped[positions[0]]);
    
      function renderTable(players) {
        tabContent.innerHTML = "";
        const table = document.createElement("table");
        table.className = "player-table";
    
        const thead = document.createElement("thead");
        thead.innerHTML = `<tr><th>Player</th><th>Position</th></tr>`;
        table.appendChild(thead);
    
        const tbody = document.createElement("tbody");
    
        players.forEach(player => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td class="player-link">${player.name}</td>
            <td>${player.position}</td>
          `;
          row.addEventListener("click", () => {
            // Replace this with your real link later
            window.location.href = `/Home/pages/player_info.html?playerId=${player.player_id}`;
          });
          tbody.appendChild(row);
        });
    
        table.appendChild(tbody);
        tabContent.appendChild(table);
      }
    }
    
    // top market value players 

    function drawTopMarketPlayers(clubId, players) {
      const clubPlayers = players
        .filter(p => p.current_club_id === clubId && p.name && p.market_value_in_eur)
        .map(p => ({
          name: p.name,
          marketValue: parseFloat(p.market_value_in_eur)
        }))
        .sort((a, b) => b.marketValue - a.marketValue)
        .slice(0, 5); // top 5
    
      if (clubPlayers.length === 0) return;
    
      // Create or reuse the horizontal container row
      let comparisonRow = document.getElementById("comparison-row");
      if (!comparisonRow) {
        comparisonRow = document.createElement("section");
        comparisonRow.id = "comparison-row";
        document.querySelector("main").appendChild(comparisonRow);
      }
    
      // Chart container (box)
      const container = document.createElement("div");
      container.className = "comparison-box";
      container.id = "market-value-chart";
      container.innerHTML = `<h2>Top 5 Most Valuable Players</h2>`;
      comparisonRow.appendChild(container);
    
      // Chart dimensions
      const width = 500;
      const height = 300;
      const margin = { top: 20, right: 40, bottom: 30, left: 160 };
    
      const svg = d3.select("#market-value-chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
      const x = d3.scaleLinear()
        .domain([0, d3.max(clubPlayers, d => d.marketValue)])
        .range([0, width]);
    
      const y = d3.scaleBand()
        .domain(clubPlayers.map(d => d.name))
        .range([0, height])
        .padding(0.2);
    
      svg.append("g")
        .call(d3.axisLeft(y))
        .style("font-size", "13px")
        .style("fill", "#003366");
    
      svg.selectAll("rect")
        .data(clubPlayers)
        .enter()
        .append("rect")
        .attr("y", d => y(d.name))
        .attr("x", 0)
        .attr("height", y.bandwidth())
        .attr("width", d => x(d.marketValue))
        .attr("fill", "#3399ff");
    
      svg.selectAll("text.value-label")
        .data(clubPlayers)
        .enter()
        .append("text")
        .attr("x", d => x(d.marketValue) + 5)
        .attr("y", d => y(d.name) + y.bandwidth() / 2 + 4)
        .text(d => `€${(d.marketValue / 1e6).toFixed(1)}M`)
        .style("font-size", "12px")
        .style("fill", "#333");
    }
    

    function drawMarketValueByPosition(clubId, players) {
      const clubPlayers = players.filter(p => p.current_club_id === clubId && p.market_value_in_eur);
    
      const groups = {
        Goalkeepers: 0,
        Defenders: 0,
        Midfielders: 0,
        Forwards: 0,
        Others: 0,
      };
    
      clubPlayers.forEach(p => {
        const pos = p.position.toLowerCase();
        const value = parseFloat(p.market_value_in_eur);
        if (pos.includes("goalkeeper")) groups.Goalkeepers += value;
        else if (pos.includes("defender")) groups.Defenders += value;
        else if (pos.includes("midfield")) groups.Midfielders += value;
        else if (pos.includes("forward") || pos.includes("attacker") || pos.includes("striker")) groups.Forwards += value;
        else groups.Others += value;
      });
    
      const data = Object.entries(groups)
        .filter(([, val]) => val > 0)
        .map(([position, totalValue]) => ({ position, totalValue }));
    
      if (data.length === 0) return;
    
      // Use same container row
      const container = document.createElement("div");
      container.className = "comparison-box";
      container.id = "market-value-position";
      container.innerHTML = `<h2>Total Market Value by Position</h2>`;
      document.getElementById("comparison-row").appendChild(container);
    
      const width = 500;
      const height = 300;
      const margin = { top: 20, right: 40, bottom: 30, left: 140 };
    
      const svg = d3.select("#market-value-position")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
      const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.totalValue)])
        .range([0, width]);
    
      const y = d3.scaleBand()
        .domain(data.map(d => d.position))
        .range([0, height])
        .padding(0.2);
    
      svg.append("g")
        .call(d3.axisLeft(y))
        .style("font-size", "13px")
        .style("fill", "#003366");
    
      svg.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("y", d => y(d.position))
        .attr("x", 0)
        .attr("height", y.bandwidth())
        .attr("width", d => x(d.totalValue))
        .attr("fill", "#ffaa00");
    
      svg.selectAll("text.value-label")
        .data(data)
        .enter()
        .append("text")
        .attr("x", d => x(d.totalValue) + 5)
        .attr("y", d => y(d.position) + y.bandwidth() / 2 + 4)
        .text(d => `€${(d.totalValue / 1e6).toFixed(1)}M`)
        .style("font-size", "12px")
        .style("fill", "#333");
    }
    
    
    