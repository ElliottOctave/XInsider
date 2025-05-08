import * as d3Soccer from 'd3-soccer';

function formatValue(num) {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + "M";
  } else if (num >= 1_000) {
    return (num / 1_000).toFixed(0) + "k";
  } else {
    return num.toString();
  }
}


// Get playerId from the URL (e.g., ?playerId=123)
const urlParams = new URLSearchParams(window.location.search);
const playerId = urlParams.get('playerId');

// Fetch player data
fetch('../../processed_data/player_summary.csv')
  .then(response => response.text())
  .then(csvText => {
    const rows = csvText.split('\n');
    var headers = rows[0].split(',');
    headers = headers.map(header => header.trim().replace(/\r$/, ''));

    // Map through the rows and create an array of player objects
    let players = rows.slice(1).map(row => {
      const columns = row.split(',');
      let player = {};
      columns.forEach((column, index) => {
        player[headers[index]] = column.trim(); // Map columns to headers
      });
      return player;
    });

    // Find the selected player by playerId
    const player = players.find(p => p.player_id === playerId);
    if (player) {
      const birthDate = new Date(player.date_of_birth);
      const formattedDate = birthDate.toLocaleDateString("en-GB", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      document.getElementById('player-info').innerHTML = `
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
            <p><strong>Market Value</strong> € ${(formatValue(player.market_value_in_eur)|| "0")}</p>
            <p><strong>Highest Market Value</strong> € ${(formatValue(player.highest_market_value_in_eur)|| "0")}</p>
          </div>
      
          <div class="player-card-right">
            <div class="info-box"><h4>Club</h4><img src="${player.club_logo_url}" alt="Club Logo" class="club-logo" /></div>
            <div class="info-box"><h4>Competition</h4><img src="${player.competition_logo_url}" alt="Competition Logo" class="club-logo"/></div>
            <div class="info-box"><h4>Position</h4><p>${player.position}</p></div>
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

      const foot = player.foot.toLowerCase();
      const leftFoot = document.querySelector('.left-foot');
      const rightFoot = document.querySelector('.right-foot');

      if (foot.includes("both")) {
        leftFoot.classList.add('active');
        rightFoot.classList.add('active');
      }
      if (foot.includes("left")) {
        leftFoot.classList.add('active');
      }
      if (foot.includes("right")) {
        rightFoot.classList.add('active');
      }

      console.log(playerId);

      // Call the function to start the world tour animation with transfers
      /*renderTransfersWorldTour(playerId);*/
      renderMap(player);
      drawGoalsAndAssistsChart(player);
      drawCardsChart(player);
      drawAppearances(player)
      renderFieldPositions(playerId);
      renderPlayerStatsCarousel(playerId);
      renderTimeline(playerId);
      displayPlayerTrophies(player);


      // Fetch market value history
      fetch('../../processed_data/player_valuations.csv')
        .then(response => response.text())
        .then(valuationsCsvText => {
          const valuationRows = valuationsCsvText.split('\n');
          const valuationHeaders = valuationRows[0].split(',');

          // Map through the rows and create an array of valuation objects
          let valuations = valuationRows.slice(1).map(row => {
            const columns = row.split(',');
            let valuation = {};
            columns.forEach((column, index) => {
              valuation[valuationHeaders[index]] = column.trim(); // Map columns to headers
            });
            return valuation;
          });

          // Filter the valuations for the selected player
          const playerValuations = valuations.filter(v => v.player_id === playerId);

          // Render the market value chart
          renderMarketValueChart(playerValuations);
        })
        .catch(error => {
          console.error("Error fetching or parsing player_valuations.csv:", error);
        });
    } else {
      console.error("Player not found.");
    }
  })
  .catch(error => {
    console.error("Error fetching or parsing players.csv:", error);
  });

  function renderMap(player) {
    // The svg container
    const width = 400, height = 300;
    const svg = d3.select("#player-map")
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    // Create a tooltip div
    const tooltip = d3.select("#player-map")
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.7)")
      .style("color", "#fff")
      .style("padding", "5px 10px")
      .style("border-radius", "5px")
      .style("font-size", "12px")
      .style("pointer-events", "none");

    // Default projection setup
    const projection = d3.geoAitoff()
      .scale(width / 1.3 / Math.PI)
      .center([0, 20]) // Default center
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    // Load the world map GeoJSON
    d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson").then(function(worldData) {
      
      // Draw the world map
      svg.append("g")
        .selectAll("path")
        .data(worldData.features)
        .join("path")
        .attr("d", path)
        .attr("fill", "#ddd")
        .attr("stroke", "#fff")
        .on("mouseover", function(event, d) {
            d3.select(this).attr("fill", "#0077b6"); // Highlight country on hover
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(d.properties.name)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mousemove", function(event) {
            tooltip.style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("fill", d => d.properties.name === player.country_of_birth ? "#003366" : "#ddd"); // Restore color
            tooltip.transition().duration(200).style("opacity", 0);
        });

      if (player && player.country_of_birth) {
        const countryName = player.country_of_birth;

        // Find the country in the GeoJSON
        const country = worldData.features.find(d => d.properties.name === countryName);

        if (country) {
          // Get country bounds and calculate scaling
          let bounds = d3.geoBounds(country);
          let center = d3.geoCentroid(country);
          let [[x0, y0], [x1, y1]] = bounds;
            
          // Calculate a zoom factor based on country size
          let scaleFactor = Math.min(
              width / (x1 - x0),
              height / (y1 - y0)
          ) * 10; // Adjust the zoom level

          // Update projection with new center and scale
          projection
          .scale(scaleFactor)
          .center(center)
          .translate([width / 2, height / 2]);

          // Redraw the map with the new projection
          svg.selectAll("path")
            .attr("d", path)
            .attr("fill", d => d.properties.name === player.country_of_birth ? "#003366" : "#ddd"); // Highlight the country
        } else {
          console.error("Country not found in GeoJSON.");
        }
      } else {
        console.error("Player's country is missing.");
      }
    }).catch(function(error) {
      console.error("Error loading GeoJSON data:", error);
    });
}

function drawCardsChart(player) {
  const svg = d3.select("#cardsChart");

  // Data for the pie chart (yellow and red cards)
  const data = [
    { category: "Yellow Cards", value: +player.yellow_cards },
    { category: "Red Cards", value: +player.red_cards }
  ];

  // Set the dimensions and margins of the graph
  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = 60;

  // The radius of the pie plot is half the width or half the height (smallest one). I subtract a bit of margin.
  const radius = Math.min(width, height) / 2 - margin;

  // Append the svg object to the div called 'cardsChart' and set the group element for pie chart positioning
  svg.selectAll("*").remove(); // Clear previous content

  const g = svg.append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  // Set up the color scale for the pie slices
  const color = d3.scaleOrdinal()
    .domain(data.map(d => d.category))
    .range(["#f1c40f", "#e74c3c"]);

  // Compute the position of each group on the pie (pie chart setup)
  const pie = d3.pie().value(d => d.value);
  const data_ready = pie(data);

  // Build the pie chart (draw slices)
  const slices = g.selectAll('path')
    .data(data_ready)
    .enter()
    .append('path')
    .attr('d', d3.arc()
      .innerRadius(100)         // This is the size of the donut hole
      .outerRadius(radius)      // Outer radius of the pie
    )
    .attr('fill', d => color(d.data.category)) // Fill color based on category
    .attr("stroke", "white")
    .style("stroke-width", "2px")
    .style("opacity", 0.7);

  // Create a tooltip div and make it invisible by default
  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background-color", "rgba(0, 0, 0, 0.7)")
    .style("color", "#fff")
    .style("padding", "6px 10px")
    .style("border-radius", "4px")
    .style("font-size", "12px");

  // Add interaction: Show tooltip on hover
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

  // Calculate the total number of cards for the center label
  const totalCards = +player.yellow_cards + +player.red_cards;

  // Add a label in the center to show the total number of cards with more detailed information
  g.append("text")
  .attr("text-anchor", "middle")
  .attr("dominant-baseline", "central")
  .attr("font-size", "12px")  // Smaller font for "Total Appearances"
  .attr("fill", "#003366")       // Color for the smaller text
  .attr("dy", "-20px")        // Adjust vertical positioning
  .text("Total Number of Cards");

  g.append("text")
  .attr("text-anchor", "middle")
  .attr("dominant-baseline", "central")
  .attr("font-size", "30px")      // Larger font for the appearance number
  .attr("font-weight", "bold")    // Bold font
  .attr("fill", "#333")           // Color for the text
  .attr("dy", "0px")             // Adjust vertical positioning to match your original code
  .text(totalCards);             // Set the text to the appearances value
}

function drawGoalsAndAssistsChart(player) {
  const svg = d3.select("#goalsChart");

  // Data for the pie chart (goals and assists)
  const data = [
    { category: "Goals", value: +player.goals },
    { category: "Assists", value: +player.assists }
  ];

  // Set the dimensions and margins of the graph
  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = 60;

  // The radius of the pie plot is half the width or half the height (smallest one). I subtract a bit of margin.
  const radius = Math.min(width, height) / 2 - margin;

  svg.selectAll("*").remove(); // Clear previous content

  const g = svg.append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  // Set up the color scale for the pie slices
  const color = d3.scaleOrdinal()
    .domain(data.map(d => d.category))
    .range(["#4CAF50", "#2196F3"]);
  // Compute the position of each group on the pie (pie chart setup)
  const pie = d3.pie().value(d => d.value);
  const data_ready = pie(data);

  // Build the donut chart (draw slices)
  const slices = g.selectAll('path')
    .data(data_ready)
    .enter()
    .append('path')
    .attr('d', d3.arc()
      .innerRadius(100)         // This is the size of the donut hole
      .outerRadius(radius)      // Outer radius of the pie
    )
    .attr('fill', d => color(d.data.category)) // Fill color based on category
    .attr("stroke", "white")
    .style("stroke-width", "2px")
    .style("opacity", 0.7);

  // Create a tooltip div and make it invisible by default
  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background-color", "rgba(0, 0, 0, 0.7)")
    .style("color", "#fff")
    .style("padding", "6px 10px")
    .style("border-radius", "4px")
    .style("font-size", "12px");

  // Add interaction: Show tooltip on hover
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
  .attr("font-size", "12px")  // Smaller font for "Total Appearances"
  .attr("fill", "#555")       // Color for the smaller text
  .attr("dy", "-20px")        // Adjust vertical positioning
  .text("Total Goals & Assists");

  g.append("text")
  .attr("text-anchor", "middle")
  .attr("dominant-baseline", "central")
  .attr("font-size", "30px")      // Larger font for the appearance number
  .attr("font-weight", "bold")    // Bold font
  .attr("fill", "#333")           // Color for the text
  .attr("dy", "0px")             // Adjust vertical positioning to match your original code
  .text(totalGoalsAndAssists);             // Set the text to the appearances value
}

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

  const data = [
    { label: "Played", value: percentage },
    { label: "Remaining", value: 1 - percentage }
  ];

  const color = d3.scaleOrdinal()
    .domain(data.map(d => d.label))
    .range(["#003366", "#ecf0f1"]); // Blue and light grey

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

      // Center label - third line: minutes percentage
  g.append("text")
  .attr("text-anchor", "middle")
  .attr("dominant-baseline", "central")
  .attr("font-size", "16px")
  .attr("fill", "#3498db")
  .attr("dy", "40px")
  .text(percentageText);
}



  
function renderFieldPositions(playerId) {
  d3.csv('../../processed_data/position_count.csv').then(function(data) {

    const pitch = d3Soccer.pitch()
      .height(200)
      .showDirOfPlay(true)
      .shadeMiddleThird(false)
      .pitchStrokeWidth(.5)
      .goals("line");

    const svg = d3.select("#halfField")
      .attr("width", 305)
      .attr("height", 200)
      .call(pitch);

    // Tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background-color", "black")
      .style("color", "#fff")
      .style("padding", "6px 10px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")

    const playerData = data.filter(player => player.player_id == playerId);
    if (playerData.length === 0) {
      console.log('No data found for player with id ' + playerId);
      return;
    }

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

          // Draw initials **above** the circle
          const leftSidePositions = ["Left-Back", "Left Midfield", "Left Winger"];

          svg.append("text")
            .attr("x", x)
            .attr("y", leftSidePositions.includes(position) ? y + radius + 12 : y - radius - 5)
            .text(positionInitials[position])
            .attr("text-anchor", "middle")
            .style("font-size", "10px")
            .style("fill", "black");
          

          // Transparent hover zone (better for tiny circles)
          svg.append("rect")
            .attr("x", x - 15)
            .attr("y", y - 15)
            .attr("width", 30)
            .attr("height", 30)
            .style("fill", "transparent")
            .on("mouseover", function(event) {
              const [mouseX, mouseY] = d3.pointer(event);
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
    // Map the player valuations to get the date and market value (in million EUR)
    const marketValues = playerValuations.map(valuation => ({
        date: new Date(valuation.date),  // Ensure the date is in JavaScript Date object format
        value: parseFloat(valuation.market_value_in_eur) || 0  // Convert the market value to millions of euros
    }));

    // Set up margins and dimensions for the chart (increased left margin for y-axis labels)
    const margin = { top: 20, right: 30, bottom: 60, left: 80 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Create SVG container
    const svg = d3.select("#marketValueChart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Set up scales for the x and y axes
    const x = d3.scaleTime()
        .domain([d3.min(marketValues, d => d.date), d3.max(marketValues, d => d.date)])  // Time scale for dates
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(marketValues, d => d.value)])
        .nice()
        .range([height, 0]);

    // Create the x-axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(d3.timeYear.every(1)).tickFormat(d3.timeFormat("%Y"))) // Format to full date
        .selectAll("text")
        .style("font-size", "12px")
        .style("text-anchor", "middle")

    // Create the y-axis
    svg.append("g")
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => `€ ${formatValue(d)}`))  // Format y axis to show currency
        .selectAll("text")
        .style("font-size", "12px");

    // Add gridlines
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

    // Create the line for market value (without smoothing)
    const line = d3.line()
        .x(d => x(d.date))  // Use the date for the x position
        .y(d => y(d.value));  // Use market value for the y position

    // Append the line path to the SVG
    svg.append("path")
        .data([marketValues])
        .attr("class", "line")
        .attr("d", line)  // Use the line generator to create the path
        .style("fill", "none")
        .style("stroke", "#003366")
        .style("stroke-width", 2);  // Line width

    // Optionally, add circles at each data point for better visibility
    svg.selectAll(".dot")
        .data(marketValues)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("cx", d => x(d.date))  // Position circles at the x position of the line
        .attr("cy", d => y(d.value))  // Position circles at the y value of the line
        .attr("r", 5)  // Radius of the circle
        .style("fill", "#003366");

    // Add hover tooltip
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

function renderTimeline(playerId) {
  fetch('../../processed_data/transfers_preprocessed.csv')
    .then(response => response.text())
    .then(csvText => {
      const rows = csvText.split('\n');
      const headers = rows[0].split(',');

      // Parse CSV to JSON format
      let transfers = rows.slice(1).map(row => {
        const columns = row.split(',');
        let transfer = {};
        headers.forEach((header, index) => {
          transfer[header.trim()] = columns[index] ? columns[index].trim() : null;
        });
        return transfer;
      });

      // Filter transfers for the selected player
      const playerTransfers = transfers.filter(t => t.player_id === playerId);

      if (playerTransfers.length === 0) {
        console.warn("No transfer history found for this player.");
        return;
      }

      // Sort by date to maintain correct order
      const parseDate = d3.timeParse("%Y-%m-%d");
      playerTransfers.forEach(t => {
        t.transfer_date = parseDate(t.transfer_date);
      });
      playerTransfers.sort((a, b) => a.transfer_date - b.transfer_date);

      // Build a club tenure dataset: start = transfer to club, end = next transfer date
      let tenures = [];
      for (let i = 0; i < playerTransfers.length; i++) {
        const current = playerTransfers[i];
        const next = playerTransfers[i + 1];
        if (current.to_club_name) {
          tenures.push({
            club: current.to_club_name,
            start: current.transfer_date,
            end: next ? next.transfer_date : new Date(), // assume still at last club if no next
            fee: current.transfer_fee
          });
        }
      }

      // Set dimensions
      const width = 850, height = 400;
      const margin = { top: 40, right: 20, bottom: 40, left: 120 };

      const svg = d3.select("#timeChart")
        .attr("width", width)
        .attr("height", height)
        .html(""); // Clear previous content if any

      // Set scales
      const xScale = d3.scaleTime()
        .domain([
          d3.min(tenures, d => d.start),
          d3.max(tenures, d => d.end)
        ])
        .range([margin.left, width - margin.right]);

      const yScale = d3.scaleBand()
        .domain(tenures.map(d => d.club))
        .range([margin.top, height - margin.bottom])
        .padding(0.3);

      // Color scale: Light blue (low fee) → Dark blue (high fee)
      const maxFee = Math.max(...tenures.map(d => d.fee));
      const colorScale = d3.scaleLinear()
        .domain([0, maxFee])
        .range(["#a2d0fc", "#01264a"]);      

      // Draw axes
      svg.append("g")
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%Y")));

      svg.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale));

      // Add bars (Gantt chart style)
      svg.selectAll(".bar")
        .data(tenures)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => xScale(d.start))
        .attr("y", d => yScale(d.club))
        .attr("width", d => xScale(d.end) - xScale(d.start))
        .attr("height", yScale.bandwidth())
        .attr("fill", d => colorScale(d.fee));
        
      // Add tooltips
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
          tooltip.transition().duration(200).style("opacity", 0);
        });

        // Legend positioning
        const legendWidth = 200, legendHeight = 10;
        const legendMargin = { top: 25, right: 30 };

        const legendX = width - margin.right - legendWidth;
        const legendY = margin.top - legendMargin.top;

        // Append defs for gradient
        const defs = svg.append("defs");

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

        // Draw legend rectangle
        svg.append("rect")
          .attr("x", legendX)
          .attr("y", legendY)
          .attr("width", legendWidth)
          .attr("height", legendHeight)
          .style("fill", "url(#legend-gradient)");

        // Legend scale and axis
        const legendScale = d3.scaleLinear()
          .domain([0, maxFee])
          .range([legendX, legendX + legendWidth]);

        svg.append("g")
          .attr("transform", `translate(0, ${legendY + legendHeight})`)
          .call(d3.axisBottom(legendScale)
            .tickValues([0, maxFee / 3, (2 * maxFee) / 3, maxFee]) // Ensures maxFee is included
            .tickFormat(d => d === 0 ? "Free" : formatValue(d)))
          .attr("font-size", "10px");
        

        // Legend label
        svg.append("text")
          .attr("x", legendX + legendWidth / 2)
          .attr("y", legendY - 5)
          .attr("text-anchor", "middle")
          .attr("font-size", "12px")
          .text("Transfer Fee");


    })
    .catch(error => {
      console.error("Error fetching or parsing transfers_preprocessed.csv:", error);
    });
}

class Versor {
  static fromAngles([l, p, g]) {
    l *= Math.PI / 360;
    p *= Math.PI / 360;
    g *= Math.PI / 360;
    const sl = Math.sin(l), cl = Math.cos(l);
    const sp = Math.sin(p), cp = Math.cos(p);
    const sg = Math.sin(g), cg = Math.cos(g);
    return [
      cl * cp * cg + sl * sp * sg,
      sl * cp * cg - cl * sp * sg,
      cl * sp * cg + sl * cp * sg,
      cl * cp * sg - sl * sp * cg
    ];
  }
  static toAngles([a, b, c, d]) {
    return [
      Math.atan2(2 * (a * b + c * d), 1 - 2 * (b * b + c * c)) * 180 / Math.PI,
      Math.asin(Math.max(-1, Math.min(1, 2 * (a * c - d * b)))) * 180 / Math.PI,
      Math.atan2(2 * (a * d + b * c), 1 - 2 * (c * c + d * d)) * 180 / Math.PI
    ];
  }
  static interpolateAngles(a, b) {
    const i = Versor.interpolate(Versor.fromAngles(a), Versor.fromAngles(b));
    return t => Versor.toAngles(i(t));
  }
  static interpolateLinear([a1, b1, c1, d1], [a2, b2, c2, d2]) {
    a2 -= a1, b2 -= b1, c2 -= c1, d2 -= d1;
    const x = new Array(4);
    return t => {
      const l = Math.hypot(x[0] = a1 + a2 * t, x[1] = b1 + b2 * t, x[2] = c1 + c2 * t, x[3] = d1 + d2 * t);
      x[0] /= l, x[1] /= l, x[2] /= l, x[3] /= l;
      return x;
    };
  }
  static interpolate([a1, b1, c1, d1], [a2, b2, c2, d2]) {
    let dot = a1 * a2 + b1 * b2 + c1 * c2 + d1 * d2;
    if (dot < 0) a2 = -a2, b2 = -b2, c2 = -c2, d2 = -d2, dot = -dot;
    if (dot > 0.9995) return Versor.interpolateLinear([a1, b1, c1, d1], [a2, b2, c2, d2]); 
    const theta0 = Math.acos(Math.max(-1, Math.min(1, dot)));
    const x = new Array(4);
    const l = Math.hypot(a2 -= a1 * dot, b2 -= b1 * dot, c2 -= c1 * dot, d2 -= d1 * dot);
    a2 /= l, b2 /= l, c2 /= l, d2 /= l;
    return t => {
      const theta = theta0 * t;
      const s = Math.sin(theta);
      const c = Math.cos(theta);
      x[0] = a1 * c + a2 * s;
      x[1] = b1 * c + b2 * s;
      x[2] = c1 * c + c2 * s;
      x[3] = d1 * c + d2 * s;
      return x;
    };
  }
}

function displayPlayerTrophies(player) {
  const container = d3.select("#trophies");
  container.html(""); // Clear previous trophies

  // Load both CSV files
  Promise.all([
    d3.csv("../../processed_data/transfers_preprocessed.csv"),
    d3.csv("../../processed_data/club_competitions.csv")
  ]).then(([transfers, competitions]) => {
    // Filter transfers for this player
    const playerTransfers = transfers
      .filter(d => d.player_id === player.player_id)
      .sort((a, b) => new Date(a.transfer_date) - new Date(b.transfer_date));

    // Build a timeline of clubs and years
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
    // Check if any of the clubs the player was at won a competition that year
    const wonTrophies = competitions.filter(comp => {
      return clubYears.some(cy => cy.club_id == comp.club_id && cy.year == comp.year);
    }).sort((a, b) => a.year - b.year);

    function formatCompetitionName(name) {
      return name
        .replace(/-/g, ' ')  // Replace hyphens with spaces
        .replace(/\b\w/g, char => char.toUpperCase());  // Capitalize first letter of each word
    }
    

    // Add each trophy image to the container
    wonTrophies.forEach(trophy => {
      console.log(trophy);
      container.append("img")
        .attr("src", trophy.cup_image_url)
        .attr("alt", `${formatCompetitionName(trophy.competition_name)} (${trophy.year})`)
        .attr("title", `${formatCompetitionName(trophy.competition_name)} (${trophy.year})`)
    });
  }).catch(error => {
    console.error("Error loading data:", error);
  });
}



   



function renderPlayerStatsCarousel(playerId) {
  d3.csv("../../data/player_stats.csv").then(data => {
    const playerStats = data.filter(d => d.player_id === playerId);

    if (playerStats.length === 0) {
      console.warn("No stats found for this player.");
      return;
    }

    playerStats.forEach(d => {
      d.year = +d.year;
      d.nr_of_goals = +d.nr_of_goals;
      d.assists = +d.assists;
      d.yellow_cards = +d.yellow_cards;
      d.red_cards = +d.red_cards;
    });

    playerStats.sort((a, b) => a.year - b.year); // sort years ascending

    const playerName = playerStats[0].player_name;
    const container = d3.select("#carouselChart");
    const width = 980;
    const height = 400;
    const margin = { top: 60, right: 150, bottom: 50, left: 60 };

    container.selectAll("*").remove();

    const svg = container.append("svg")
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
      .style("background", "#333")
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
          .attr("x", d => x(d.data.year))
          .attr("width", x.bandwidth())
          .attr("y", y(0))
          .attr("height", 0)
          .on("mouseover", function(event, d) {
            const metric = this.parentNode.__data__.key;
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`${metric.replace(/_/g, ' ')}: ${d.data[metric]}`)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 20) + "px");
          })
          .on("mousemove", event => {
            tooltip.style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 20) + "px");
          })
          .on("mouseout", () => tooltip.transition().duration(200).style("opacity", 0))
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

      svg.append("text")
        .attr("class", "chart-title")
        .attr("x", width / 2)
        .attr("y", margin.top - 25)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .text(title);

      // Legend
      keys.forEach((key, i) => {
        legend.append("rect")
          .attr("x", 0)
          .attr("y", i * 20)
          .attr("width", 12)
          .attr("height", 12)
          .attr("fill", color(key));

        legend.append("text")
          .attr("x", 18)
          .attr("y", i * 20 + 10)
          .text(key.replace(/_/g, ' '))
          .style("font-size", "12px")
          .attr("alignment-baseline", "middle");
      });
    }

    let currentChart = 0;
    const chartModes = ["goals_assists", "cards"];

    drawStackedChart(chartModes[currentChart]);
    setInterval(() => {
      currentChart = (currentChart + 1) % chartModes.length;
      drawStackedChart(chartModes[currentChart]);
    }, 4000);
  });
}

