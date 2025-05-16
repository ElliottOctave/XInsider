import * as d3Soccer from 'd3-soccer';
var selectedRange = null; // Will be necessary for the carousel interactivity


// Function to format big numbers (e.g. 3.000.000 gives 3M)
function formatValue(num) {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + "M";
  } else if (num >= 1_000) {
    return (num / 1_000).toFixed(0) + "k";
  } else {
    return num.toString();
  }
}

function calculateAge(dateOfBirth) {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Render player card
function createPlayerCard(player) {
  const birthDate = new Date(player.date_of_birth);
  const formattedDate = birthDate.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const age = calculateAge(player.date_of_birth);

  // HTML of the player card
  return `
    <div class="player-card">
      <div class="player-card-left">
        <img src="${player.image_url}" alt="${player.name}" class="player-card-image" />
      </div>
      <div class="player-card-middle">
        <h2>${player.name}</h2>
        <p><strong>Date of Birth</strong> ${formattedDate}</p>
        <p><strong>Age</strong> ${age}</p>
        <p><strong>Country of Birth</strong> ${player.country_of_birth}</p>
        <p><strong>Country of Citizenship</strong> ${player.country_of_citizenship}</p>
        <p><strong>Height</strong> ${player.height_in_cm} cm</p> 
        <p><strong>Market Value</strong> €${formatValue(Number(player.market_value_in_eur) || 0)}</p>
        <p><strong>Highest Market Value</strong> €${formatValue(Number(player.highest_market_value_in_eur) || 0)}</p>
      </div>
      <div class="player-card-right">
        <div class="info-box">
          <h4>Club</h4>
          <img src="${player.club_logo_url}" alt="Club Logo" class="club-logo" title="${player.club_name}"/>
        </div>
        <div class="info-box">
          <h4>Competition</h4>
          <img src="${player.competition_logo_url}" alt="Competition Logo" class="competition-logo" />
        </div>
        <div class="info-box">
          <h4>Position</h4>
          <p>${player.position}</p>
        </div>
        <div class="info-box foot-box">
          <h4>Foot</h4>
          <div class="foot-icons">
            <div class="foot-icon left-foot"></div>
            <div class="foot-icon right-foot"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Shows dominant foot of player
function showFoot(foot) {
  const leftFoot = document.querySelector('.left-foot');
  const rightFoot = document.querySelector('.right-foot');
  const lowerFoot = foot.toLowerCase();
  leftFoot.classList.toggle('active', lowerFoot.includes('both') || lowerFoot.includes('left'));
  rightFoot.classList.toggle('active', lowerFoot.includes('both') || lowerFoot.includes('right'));
}

// Parse players from csv
async function parsePlayers(playersCsv) {
  const response = await fetch(playersCsv);
  const csvText = await response.text();

  const rows = csvText.split('\n');
  let headers = rows[0].split(',').map(header => header.trim().replace(/\r$/, ''));

  const players = rows.slice(1).map(row => {
    const columns = row.split(',');
    let player = {};
    columns.forEach((column, index) => {
      player[headers[index]] = column.trim();
    });
    return player;
  });

  return players;
}

// Show the market evolution
async function showPlayerValuations(player) {
  try {
    const response = await fetch('../../processed_data/player_valuations.csv');
    if (!response.ok) {
      throw new Error(`Failed to fetch player valuations CSV, status: ${response.status}`);
    }

    const csvText = await response.text();
    const [headerLine, ...rows] = csvText.trim().split('\n');
    const headers = headerLine.split(',').map(h => h.trim());
    const valuations = rows.map(row => {
      const cols = row.split(',');
      return headers.reduce((obj, header, idx) => {
        obj[header] = cols[idx]?.trim() || '';
        return obj;
      }, {});
    });

    const playerValuations = valuations.filter(v => v.player_id === player.player_id);
    renderMarketValueChart(playerValuations);

  } catch (error) {
    console.error("Error fetching or processing player valuations CSV:", error);
  }
}

// Show cards pie (with hole to show exact number)
function drawCardsChart(player) {
  const svg = d3.select("#cardsChart");

  // Data for the pie chart (yellow and red cards)
  const data = [
    { category: "Yellow Cards", value: +player.yellow_cards },
    { category: "Red Cards", value: +player.red_cards }
  ];

  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = 60;
  const radius = Math.min(width, height) / 2 - margin;

  svg.selectAll("*").remove(); 
  const g = svg.append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  // Choose color scale for the pie slices
  const color = d3.scaleOrdinal()
    .domain(data.map(d => d.category))
    .range(["#f1c40f", "#e74c3c"]);

  const pie = d3.pie().value(d => d.value);
  const data_ready = pie(data);

  // Draw slices
  const slices = g.selectAll('path')
    .data(data_ready)
    .enter()
    .append('path')
    .attr('d', d3.arc()
      .innerRadius(100)         
      .outerRadius(radius)
    )
    .attr('fill', d => color(d.data.category))
    .attr("stroke", "white")
    .style("stroke-width", "2px")
    .style("opacity", 0.7);

  // Tooltip to give more information
  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background-color", "rgba(0, 0, 0, 0.7)")
    .style("color", "#fff")
    .style("padding", "6px 10px")
    .style("border-radius", "4px")
    .style("font-size", "12px");

  // Show tooltip on hover
  slices.on("mouseover", function(event, d) {
    tooltip.style("visibility", "visible")
      .html(`${d.data.category}: ${d.data.value} cards`);
  })
  .on("mousemove", function(event) {
    tooltip.style("top", (event.pageY + 5) + "px")
      .style("left", (event.pageX + 5) + "px");
  })
  .on("mouseout", function() {
    tooltip.style("visibility", "hidden");
  });

  // Calculate the total number of cards
  const totalCards = +player.yellow_cards + +player.red_cards;

  // Add a label in the center to show the total number of cards with more detailed information
  g.append("text")
  .attr("text-anchor", "middle")
  .attr("dominant-baseline", "central")
  .attr("font-size", "12px")
  .attr("fill", "#555")      
  .attr("dy", "-20px")   
  .text("Total Number of Cards");

  g.append("text")
  .attr("text-anchor", "middle")
  .attr("dominant-baseline", "central")
  .attr("font-size", "30px")     
  .attr("font-weight", "bold") 
  .attr("fill", "#333")         
  .attr("dy", "0px")          
  .text(totalCards);   
}

// Draw goals and assist pie
function drawGoalsAndAssistsChart(player) {
  const svg = d3.select("#goalsChart");

  // Data for the pie (goals and assists)
  const data = [
    { category: "Goals", value: +player.goals },
    { category: "Assists", value: +player.assists }
  ];

  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = 60;
  const radius = Math.min(width, height) / 2 - margin;

  svg.selectAll("*").remove();
  const g = svg.append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  const color = d3.scaleOrdinal()
    .domain(data.map(d => d.category))
    .range(["#4CAF50", "#2196F3"]);
  const pie = d3.pie().value(d => d.value);
  const data_ready = pie(data);

  // Draw slices
  const slices = g.selectAll('path')
    .data(data_ready)
    .enter()
    .append('path')
    .attr('d', d3.arc()
      .innerRadius(100)         
      .outerRadius(radius)      
    )
    .attr('fill', d => color(d.data.category))
    .attr("stroke", "white")
    .style("stroke-width", "2px")
    .style("opacity", 0.7);

  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background-color", "rgba(0, 0, 0, 0.7)")
    .style("color", "#fff")
    .style("padding", "6px 10px")
    .style("border-radius", "4px")
    .style("font-size", "12px");

  slices.on("mouseover", function(event, d) {
    tooltip.style("visibility", "visible")
      .html(`${d.data.category}: ${d.data.value}`);
  })
  .on("mousemove", function(event) {
    tooltip.style("top", (event.pageY + 5) + "px")
      .style("left", (event.pageX + 5) + "px");
  })
  .on("mouseout", function() {
    tooltip.style("visibility", "hidden");
  });

  // Calculate the total number of goals and assists for the center label
  const totalGoalsAndAssists = +player.goals + +player.assists;

  g.append("text")
  .attr("text-anchor", "middle")
  .attr("dominant-baseline", "central")
  .attr("font-size", "12px") 
  .attr("fill", "#555")    
  .attr("dy", "-20px")    
  .text("Total Goals & Assists");

  g.append("text")
  .attr("text-anchor", "middle")
  .attr("dominant-baseline", "central")
  .attr("font-size", "30px")   
  .attr("font-weight", "bold")   
  .attr("fill", "#333")   
  .attr("dy", "0px")   
  .text(totalGoalsAndAssists);    
}

// Draw the appearances pie
function drawAppearances(player) {
  const svg = d3.select("#minutesChart");
  const appearances = +player.appearances;
  const minutes = +player.minutes_played;
  const maxMinutes = +player.total_minutes;
  const percentage = maxMinutes > 0 ? minutes / maxMinutes : 0;
  const percentageText = `${Math.round(percentage * 100)}%`;
  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = 60;
  const radius = Math.min(width, height) / 2 - margin;

  svg.selectAll("*").remove();

  const g = svg.append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  // Percentage of time played
  const data = [
    { label: "Played", value: percentage },
    { label: "Remaining", value: 1 - percentage }
  ];

  const color = d3.scaleOrdinal()
    .domain(data.map(d => d.label))
    .range(["#003366", "#ecf0f1"]); 

  const pie = d3.pie()
    .value(d => d.value)
    .sort(null);

  const data_ready = pie(data);

  const arc = d3.arc()
    .innerRadius(100)
    .outerRadius(radius);

  const slices = g.selectAll('path')
    .data(data_ready)
    .enter()
    .append('path')
    .attr('d', arc)
    .attr('fill', d => color(d.data.label))
    .attr("stroke", "white")
    .style("stroke-width", "2px")
    .style("opacity", 0.9);

  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background-color", "rgba(0, 0, 0, 0.7)")
    .style("color", "#fff")
    .style("padding", "6px 10px")
    .style("border-radius", "4px")
    .style("font-size", "12px");

  slices.on("mouseover", function(event, d) {
    tooltip.style("visibility", "visible")
      .html(`Played ${minutes} minutes on ${maxMinutes}`);
  })
  .on("mousemove", function(event) {
    tooltip.style("top", (event.pageY + 5) + "px")
      .style("left", (event.pageX + 5) + "px");
  })
  .on("mouseout", function() {
    tooltip.style("visibility", "hidden");
  });

  g.append("text")
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "central")
    .attr("font-size", "12px")
    .attr("fill", "#555")
    .attr("dy", "-20px")
    .text("Total Appearances");

  g.append("text")
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "central")
    .attr("font-size", "30px")
    .attr("font-weight", "bold")
    .attr("fill", "#333")
    .attr("dy", "0px")
    .text(appearances);

  g.append("text")
  .attr("text-anchor", "middle")
  .attr("dominant-baseline", "central")
  .attr("font-size", "16px")
  .attr("fill", "#3498db")
  .attr("dy", "40px")
  .text(percentageText);
}

// Show the player positions of the field
function renderFieldPositions(player) {
  d3.csv('../../processed_data/position_count.csv').then(function(data) {

    // Use d3soccer to render the pitch
    const pitch = d3Soccer.pitch()
      .height(300)
      .showDirOfPlay(true)
      .shadeMiddleThird(false)
      .pitchStrokeWidth(.5)
      .goals("line");

    const svg = d3.select("#halfField")
      .attr("width", 500)
      .attr("height", 300)
      .call(pitch);

    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background-color", "rgba(0, 0, 0, 0.7)")
      .style("color", "#fff")
      .style("padding", "6px 10px")
      .style("border-radius", "4px")
      .style("font-size", "12px")

    const playerData = data.filter(p => p.player_id == player.player_id);

    // Position as ratios to adapt to the size of the field
    const positionCoords = {
      "Goalkeeper": [0.08, 0.5],
      "Right-Back": [0.18, 0.87],
      "Centre-Back": [0.2, 0.5],
      "Left-Back": [0.18, 0.13],
      "Defensive Midfield": [0.36, 0.5],
      "Central Midfield": [0.48, 0.5],
      "Attacking Midfield": [0.56, 0.5],
      "Right Midfield": [0.48, 0.87],
      "Left Midfield": [0.48, 0.13],
      "Right Winger": [0.7, 0.87],
      "Left Winger": [0.7, 0.13],
      "Centre-Forward": [0.78, 0.5],
      "Second Striker": [0.7, 0.5]
    };    

    // Show positions as initials
    const positionInitials = {
      "Goalkeeper": "GK",
      "Right-Back": "RB",
      "Centre-Back": "CB",
      "Left-Back": "LB",
      "Defensive Midfield": "DM",
      "Central Midfield": "CM",
      "Attacking Midfield": "AM",
      "Right Midfield": "RM",
      "Left Midfield": "LM",
      "Right Winger": "RW",
      "Left Winger": "LW",
      "Centre-Forward": "CF",
      "Second Striker": "SS"
    };

    playerData.forEach(function(player) {
      for (let position in player) {
        if (position !== "player_id" && position !== "player_name" && player[position] > 0) {
          const matches = +player[position];
          const [xPercent, yPercent] = positionCoords[position];
          const width = +svg.attr("width");
          const height = +svg.attr("height");
          const x = xPercent * width;
          const y = yPercent * height;
          const radius = Math.sqrt(matches) * 2;

          // Draw circle
          svg.append("circle")
            .attr("cx", x)
            .attr("cy", y)
            .attr("r", radius)
            .style("fill", "#003366")
            .style("opacity", 0.6);

          // For these ones put the label below the circle
          // Otherwise won't be able to see them
          const leftSidePositions = ["Left-Back", "Left Midfield", "Left Winger"];

          svg.append("text")
            .attr("x", x)
            .attr("y", leftSidePositions.includes(position) ? y + radius + 12 : y - radius - 5)
            .text(positionInitials[position])
            .attr("text-anchor", "middle")
            .style("font-size", "10px")
            .style("fill", "black");
          
          svg.append("rect")
            .attr("x", x - 15)
            .attr("y", y - 15)
            .attr("width", 30)
            .attr("height", 30)
            .style("fill", "transparent")
            .on("mouseover", function(event) {
              tooltip.transition().duration(200).style("opacity", 0.9);
              tooltip.html(`<strong>${position}</strong><br>Games played: ${matches}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
              tooltip.transition().duration(300).style("opacity", 0);
            });
        }
      }
    });
  }).catch(function(error) {
    console.error('Error loading the CSV data: ', error);
  });
}

function renderMarketValueChart(playerValuations) {
    // Map the player valuations to get the date and market value
    const marketValues = playerValuations.map(valuation => ({
        date: new Date(valuation.date), 
        value: parseFloat(valuation.market_value_in_eur) || 0 
    }));

    const margin = { top: 20, right: 30, bottom: 60, left: 80 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select("#marketValueChart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
        .domain([d3.min(marketValues, d => d.date), d3.max(marketValues, d => d.date)]) 
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(marketValues, d => d.value)])
        .nice()
        .range([height, 0]);

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(d3.timeYear.every(1)).tickFormat(d3.timeFormat("%Y")))
        .selectAll("text")
        .style("font-size", "12px")
        .style("text-anchor", "middle")

    svg.append("g")
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => `€ ${formatValue(d)}`))
        .selectAll("text")
        .style("font-size", "12px");

    svg.selectAll(".grid")
        .data(y.ticks(5))
        .enter()
        .append("line")
        .attr("class", "grid")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", d => y(d))
        .attr("y2", d => y(d))
        .attr("stroke", "#ddd")
        .attr("stroke-dasharray", "5,5");

    // Create array of line segments between consecutive points
    // Will be necessary to be able to adapt opacity when selection period in timeline
    const lineSegments = [];
    for (let i = 0; i < marketValues.length - 1; i++) {
        lineSegments.push({
            start: marketValues[i],
            end: marketValues[i + 1]
        });
    }

    svg.selectAll(".line-segment")
        .data(lineSegments)
        .enter()
        .append("line")
        .attr("class", "line-segment")
        .attr("x1", d => x(d.start.date))
        .attr("y1", d => y(d.start.value))
        .attr("x2", d => x(d.end.date))
        .attr("y2", d => y(d.end.value))
        .attr("stroke", "#003366")
        .attr("stroke-width", 2)
        .attr("data-date1", d => d.start.date.toISOString())
        .attr("data-date2", d => d.end.date.toISOString());

    svg.selectAll(".dot")
        .data(marketValues)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("cx", d => x(d.date))  
        .attr("cy", d => y(d.value)) 
        .attr("r", 5) 
        .style("fill", "#003366")
        .attr("data-date", d => d.date.toISOString());

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("opacity", 0)
        .style("background-color", "rgba(0, 0, 0, 0.7)")
        .style("color", "#fff")
        .style("padding", "6px 10px")
        .style("border-radius", "4px")
        .style("font-size", "12px");

    svg.selectAll(".dot")
        .on("mouseover", function(event, d) {
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`Date: ${d3.timeFormat("%Y-%m-%d")(d.date)}<br>Value: € ${(formatValue(d.value))}`)
                .style("left", `${event.pageX + 5}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", function() {
            tooltip.transition().duration(200).style("opacity", 0);
        });
}

function renderTimeline(player) {
  // For timeline look for the player transfers
  fetch('../../processed_data/transfers_preprocessed.csv')
    .then(response => response.text())
    .then(csvText => {
      const rows = csvText.split('\n');
      const headers = rows[0].split(',');
      let transfers = rows.slice(1).map(row => {
        const columns = row.split(',');
        let transfer = {};
        headers.forEach((header, index) => {
          transfer[header.trim()] = columns[index] ? columns[index].trim() : null;
        });
        return transfer;
      });

      const playerTransfers = transfers.filter(t => t.player_id === player.player_id);

      const parseDate = d3.timeParse("%Y-%m-%d");
      playerTransfers.forEach(t => {
        t.transfer_date = parseDate(t.transfer_date);
      });
      playerTransfers.sort((a, b) => a.transfer_date - b.transfer_date);

      let transfersInfo = [];
      for (let i = 0; i < playerTransfers.length; i++) {
        const current = playerTransfers[i];
        const next = playerTransfers[i + 1];
        if (current.to_club_name) {
          transfersInfo.push({
            club: current.to_club_name,
            start: current.transfer_date,
            end: next ? next.transfer_date : new Date(), 
            fee: current.transfer_fee
          });
        }
      }

      const width = 850, height = 400;
      const margin = { top: 40, right: 20, bottom: 40, left: 120 };
      const svg = d3.select("#timeChart")
        .attr("width", width)
        .attr("height", height)
        .html(""); 

      const xScale = d3.scaleTime()
        .domain([
          d3.min(transfersInfo, d => d.start),
          d3.max(transfersInfo, d => d.end)
        ])
        .range([margin.left, width - margin.right]);

      const yScale = d3.scaleBand()
        .domain(transfersInfo.map(d => d.club))
        .range([margin.top, height - margin.bottom])
        .padding(0.3);

      const maxFee = Math.max(...transfersInfo.map(d => d.fee));
      const colorScale = d3.scaleLinear()
        .domain([0, maxFee])
        .range(["#a2d0fc", "#01264a"]);      

      svg.append("g")
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%Y")));

      svg.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale))
        .attr("font-size", 14);

      svg.selectAll(".bar")
        .data(transfersInfo)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => xScale(d.start))
        .attr("y", d => yScale(d.club))
        .attr("width", d => xScale(d.end) - xScale(d.start))
        .attr("height", yScale.bandwidth())
        .attr("fill", d => colorScale(d.fee));
        
      const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("opacity", 0)
        .style("background-color", "rgba(0, 0, 0, 0.7)")
        .style("color", "#fff")
        .style("padding", "6px 10px")
        .style("border-radius", "4px")
        .style("font-size", "12px");

      svg.selectAll(".bar")
        .on("mouseover", (event, d) => {
          tooltip.transition().duration(200).style("opacity", 1);
          tooltip.html(`
            <strong>${d.club}</strong><br>
            From: ${d3.timeFormat("%d-%m-%Y")(d.start)}<br>
            To: ${d3.timeFormat("%d-%m-%Y")(d.end)}<br>
            Fee: ${d.fee == 0 ? "Free" : formatValue(d.fee)}
          `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => {
          tooltip.transition().duration(100).style("opacity", 0);
        })
        .on("click", function(event, d) {
          const wasSelected = d3.select(this).classed("selected");
          const start = d.start.getFullYear();
          const end = d.end.getFullYear();

          // When a bar is selected reduce the opacity of the others
          // And if users clicks a second time reset the opacity
          if (wasSelected) {
            selectedRange = null;
            svg.selectAll(".bar")
              .classed("selected", false)
              .transition()
              .duration(100)
              .style("opacity", 1);
          } else {
            selectedRange = { start, end };
            
            svg.selectAll(".bar")
              .classed("selected", false)
              .transition()
              .duration(100)
              .style("opacity", 0.2);
            
            d3.select(this)
              .classed("selected", true)
              .transition()
              .duration(100)
              .style("opacity", 1);
          }

          // Update the other visualizations
          updateVisualisation(start, end, wasSelected);
        });

        const legendWidth = 200, legendHeight = 10;
        const legendMargin = { top: 25, right: 30 };
        const legendX = width - margin.right - legendWidth - 20;
        const legendY = margin.top - legendMargin.top;
        const defs = svg.append("defs");

        // Legend for the transfer fees
        const linearGradient = defs.append("linearGradient")
          .attr("id", "legend-gradient");

        linearGradient.selectAll("stop")
          .data([
            { offset: "0%", color: "#a2d0fc" },
            { offset: "100%", color: "#01264a" }
          ])
          .enter()
          .append("stop")
          .attr("offset", d => d.offset)
          .attr("stop-color", d => d.color);

        svg.append("rect")
          .attr("class", ".rect")
          .attr("x", legendX)
          .attr("y", legendY)
          .attr("width", legendWidth)
          .attr("height", legendHeight)
          .style("fill", "url(#legend-gradient)");

        const legendScale = d3.scaleLinear()
          .domain([0, maxFee])
          .range([legendX, legendX + legendWidth]);

        svg.append("g")
          .attr("transform", `translate(0, ${legendY + legendHeight})`)
          .call(d3.axisBottom(legendScale)
            .tickValues([0, maxFee / 3, (2 * maxFee) / 3, maxFee])
            .tickFormat(d => d === 0 ? "Free" : formatValue(d)))
          .attr("font-size", "12px");
        
        svg.append("text")
          .attr("x", legendX + legendWidth / 2)
          .attr("y", legendY - 5)
          .attr("text-anchor", "middle")
          .attr("font-size", "12px")
          .text("Transfer Fee");
    })
    .catch(error => {
      // Debugging
      console.error("Error fetching or parsing transfers_preprocessed.csv:", error);
    });
}

function displayPlayerTrophies(player) {
  const container = d3.select("#trophies");

  // Need both dataset to continue so we wait for both of them to load
  Promise.all([
    d3.csv("../../processed_data/transfers_preprocessed.csv"),
    d3.csv("../../processed_data/club_competitions.csv")
  ]).then(([transfers, competitions]) => {
    // Filter transfers for current player
    const playerTransfers = transfers
      .filter(d => d.player_id === player.player_id)
      .sort((a, b) => new Date(a.transfer_date) - new Date(b.transfer_date));

    const clubYears = [];
    for (let i = 0; i < playerTransfers.length; i++) {
      const current = playerTransfers[i];
      const next = playerTransfers[i + 1];
      const startYear = new Date(current.transfer_date).getFullYear();
      const endYear = next ? new Date(next.transfer_date).getFullYear() - 1 : new Date().getFullYear();

      for (let year = startYear; year <= endYear; year++) {
        clubYears.push({ club_id: current.to_club_id, year: year });
      }
    }

    const wonTrophies = competitions.filter(comp => {
      return clubYears.some(cy => cy.club_id == comp.club_id && cy.year == comp.year);
    }).sort((a, b) => a.year - b.year);

    function formatCompetitionName(name) {
      return name
        .replace(/-/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
    }

    // Construct the players trophies 'shelf'
    wonTrophies.forEach(trophy => {
      const trophyContainer = container.append("div")
        .attr("class", "trophy-item");

      trophyContainer.append("img")
        .attr("src", trophy.cup_image_url)
        .attr("alt", `${formatCompetitionName(trophy.competition_name)} (${trophy.year})`)
        .attr("title", `${formatCompetitionName(trophy.competition_name)} (${trophy.year})`);

      trophyContainer.append("div")
        .attr("class", "trophy-caption")
        .html(`${formatCompetitionName(trophy.competition_name)}<br><span class="trophy-year">${trophy.year}</span>`);
    });
  }).catch(error => {
    console.error("Error loading data:", error);
  });
}

// Carousel for player goals/assists and cards over time
function renderPlayerStatsCarousel(player) {
  d3.csv("../../data/player_stats.csv").then(data => {
    const playerStats = data.filter(d => d.player_id === player.player_id);

    playerStats.forEach(d => {
      d.year = +d.year;
      d.nr_of_goals = +d.nr_of_goals;
      d.assists = +d.assists;
      d.yellow_cards = +d.yellow_cards;
      d.red_cards = +d.red_cards;
    });

    // Sort years in ascending order
    playerStats.sort((a, b) => a.year - b.year); 
    const container = d3.select("#carouselChart");
    const width = 980;
    const height = 400;
    const margin = { top: 60, right: 150, bottom: 50, left: 60 };

    container.selectAll("*").remove();

    const svg = container.append("svg")
      .attr("id", "carouselSvg")
      .attr("width", width)
      .attr("height", height);

    const x = d3.scaleBand()
      .domain(playerStats.map(d => d.year))
      .range([margin.left, width - margin.right])
      .padding(0.2);

    const y = d3.scaleLinear()
      .range([height - margin.bottom, margin.top]);

    const color = d3.scaleOrdinal()
      .domain(["nr_of_goals", "assists", "yellow_cards", "red_cards"])
      .range(["#1f77b4", "#2ca02c", "#f1c40f", "#e74c3c"]);

    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("opacity", 0)
      .style("background", "rgba(0, 0, 0, 0.7)")
      .style("color", "#fff")
      .style("padding", "6px 10px")
      .style("border-radius", "4px")
      .style("font-size", "12px");

    svg.append("g").attr("class", "x-axis")
      .attr("transform", `translate(0, ${height - margin.bottom})`);

    svg.append("g").attr("class", "y-axis")
      .attr("transform", `translate(${margin.left}, 0)`);

    // Legend
    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - margin.right - 70}, ${margin.top - 50})`);

    function drawStackedChart(mode) {
      svg.selectAll(".bar-group").remove();
      svg.selectAll(".chart-title").remove();
      legend.selectAll("*").remove();

      let keys, title;
      if (mode === "goals_assists") {
        keys = ["nr_of_goals", "assists"];
      } else {
        keys = ["yellow_cards", "red_cards"];
      }

      // We will use stacked bar charts
      const stack = d3.stack().keys(keys);
      const stackedData = stack(playerStats);

      const maxY = d3.max(playerStats, d => keys.reduce((sum, key) => sum + d[key], 0));
      y.domain([0, maxY]).nice();

      svg.select(".x-axis")
        .transition().duration(500)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

      svg.select(".y-axis")
        .transition().duration(500)
        .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("d")));

      const barGroups = svg.selectAll(".bar-group")
        .data(stackedData, d => d.key)
        .join("g")
        .attr("class", "bar-group")
        .attr("fill", d => color(d.key));

      const bars = barGroups.selectAll("rect")
        .data(d => d, d => d.data.year);

      bars.join(
        enter => enter.append("rect")
          .attr("data-year", d => d.data.year)
          .attr("x", d => x(d.data.year))
          .attr("width", x.bandwidth())
          .attr("y", y(0))
          .attr("height", 0)
              .style("opacity", d => {
            if (!selectedRange) return 1;
            const year = d.data.year;
            return (year >= selectedRange.start && year <= selectedRange.end) ? 1 : 0.2;
          })
          .on("mouseover", function(event, d) {
            const metric = this.parentNode.__data__.key;
            tooltip.transition().duration(100).style("opacity", 1);
            tooltip.html(`${metric.replace(/_/g, " ")}: ${d.data[metric]}`)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 20) + "px");
          })
          .on("mousemove", event => {
            tooltip.style("left", (event.pageX + 10) + "px")
                  .style("top", (event.pageY - 20) + "px");
          })
          .on("mouseout", () => {
            tooltip.transition().duration(200).style("opacity", 0);
          })
          .call(enter => enter.transition().duration(800)
            .attr("y", d => y(d[1]))
            .attr("height", d => y(d[0]) - y(d[1]))
          ),
        update => update.transition().duration(800)
          .attr("x", d => x(d.data.year))
          .attr("width", x.bandwidth())
          .attr("y", d => y(d[1]))
          .attr("height", d => y(d[0]) - y(d[1])),
        exit => exit.remove()
      );

      // Legend
      keys.forEach((key, i) => {
        legend.append("rect")
          .attr("x", -15)
          .attr("y", i * 20)
          .attr("width", 12)
          .attr("height", 12)
          .attr("fill", color(key));

        legend.append("text")
          .attr("x", 4)
          .attr("y", i * 20 + 6)
          .text(key.replace(/_/g, ' '))
          .style("font-size", "14px")
          .attr("alignment-baseline", "middle");
      });
    }

    let currentChart = 0;
    const chartModes = ["goals_assists", "cards"];
    let carouselRunning = true;
    let interval;
    const icon = document.getElementById("pauseIcon");

    // Enable the user to pause the carousel and look at the data
    function toggleCarousel() {
      carouselRunning = !carouselRunning;
      if (carouselRunning) {
        icon.src = "https://www.svgrepo.com/show/532514/pause.svg";
      } else {
        icon.src = "https://www.svgrepo.com/show/514197/play.svg"; 
        clearInterval(interval);
      }
    }

    document.getElementById("pauseButton").addEventListener("click", toggleCarousel);

    drawStackedChart(chartModes[currentChart]);
    setInterval(() => {
      if (carouselRunning) {
        currentChart = (currentChart + 1) % chartModes.length;
        drawStackedChart(chartModes[currentChart]);
      }
    }, 4000);
  });
}

function updateVisualisation(startYear, endYear, isSelected) {
    const svgValuations = d3.select("#marketValueChart");
    const svgCarousel = d3.select("#carouselSvg");

    if (isSelected) {
        // Show everything full opacity
        svgValuations.selectAll(".dot")
            .transition()
            .duration(200)
            .style("opacity", 1);

        svgValuations.selectAll(".line-segment")
            .transition()
            .duration(200)
            .style("opacity", 1);

        svgCarousel.selectAll(".bar-group").selectAll("rect")
          .transition()
          .duration(200)
          .style("opacity", 1);
    } else {
        // Apply fade based on date range
        svgValuations.selectAll(".dot")
            .transition()
            .duration(200)
            .style("opacity", function() {
                const dotDate = new Date(this.getAttribute("data-date"));
                const year = dotDate.getFullYear();
                return (year >= startYear && year <= endYear) ? 1 : 0.2;
            });

        svgValuations.selectAll(".line-segment")
            .transition()
            .duration(200)
            .style("opacity", function() {
                const date1 = new Date(this.getAttribute("data-date1"));
                const date2 = new Date(this.getAttribute("data-date2"));
                const year1 = date1.getFullYear();
                const year2 = date2.getFullYear();
                return (year1 >= startYear && year1 <= endYear && year2 >= startYear && year2 <= endYear) ? 1 : 0.2;
            });

        svgCarousel.selectAll(".bar-group").selectAll("rect")
          .transition()
          .duration(200)
          .style("opacity", d => {
            if (!selectedRange) return 1;
            const year = d.data.year;
            return (year >= selectedRange.start && year <= selectedRange.end) ? 1 : 0.2;
          });
    }
}

async function renderPlayerVisuals(playerId) {
  try {
    const players = await parsePlayers('../../processed_data/player_summary.csv');
    const player = players.find(p => p.player_id === playerId);
    const container = document.getElementById('player-details');
    container.innerHTML = createPlayerCard(player);

    // Show all visualizations

    showFoot(player.foot);

    renderFieldPositions(player);

    await showPlayerValuations(player);

    drawCardsChart(player);

    drawGoalsAndAssistsChart(player);

    drawAppearances(player);

    renderTimeline(player);

    displayPlayerTrophies(player);

    renderPlayerStatsCarousel(player);

  } catch (error) {
    console.error("Error rendering player visuals:", error);
  }
}

const urlParams = new URLSearchParams(window.location.search);
const playerId = urlParams.get("playerId");
renderPlayerVisuals(playerId)