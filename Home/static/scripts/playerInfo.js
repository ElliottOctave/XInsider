// Get playerId from the URL (e.g., ?playerId=123)
const urlParams = new URLSearchParams(window.location.search);
const playerId = urlParams.get('playerId');

// Fetch player data
fetch('../../data/players.csv')
  .then(response => response.text())
  .then(csvText => {
    const rows = csvText.split('\n');
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

    // Find the selected player by playerId
    const player = players.find(p => p.player_id === playerId);

    if (player) {
      // Populate the player's profile details
      document.getElementById('player-info').innerHTML = `
        <h1>${player.first_name} ${player.last_name}</h1>
        <p><strong>Current Club:</strong> ${player.current_club_name}</p>
        <p><strong>Position:</strong> ${player.position}</p>
        <p><strong>Market Value:</strong> €${player.market_value_in_eur}</p>
        <p><strong>Country of Birth:</strong> ${player.country_of_birth}</p>
        <p><strong>Date of Birth:</strong> ${player.date_of_birth}</p>
        <img src="${player.image_url}" alt="${player.first_name} ${player.last_name}" class="player-image" />
      `;
      
      renderMap(player);

      renderTimeline(playerId);

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

  
  
  
  

  function renderMarketValueChart(playerValuations) {
    // Map the player valuations to get the date and market value (in million EUR)
    const marketValues = playerValuations.map(valuation => ({
        date: new Date(valuation.date),  // Ensure the date is in JavaScript Date object format
        value: parseFloat(valuation.market_value_in_eur / 1000000) || 0  // Convert the market value to millions of euros
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
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => `€${d.toFixed(2)}M`))  // Format y axis to show currency
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
        .style("stroke", "#007bff")
        .style("stroke-width", 2);  // Line width

    // Optionally, add circles at each data point for better visibility
    svg.selectAll(".dot")
        .data(marketValues)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("cx", d => x(d.date))  // Position circles at the x position of the line
        .attr("cy", d => y(d.value))  // Position circles at the y value of the line
        .attr("r", 5)  // Radius of the circle
        .style("fill", "#007bff");

    // Add hover tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("opacity", 0)
        .style("background-color", "rgba(0, 0, 0, 0.7)")
        .style("color", "#fff")
        .style("padding", "5px")
        .style("border-radius", "5px")
        .style("font-size", "12px");

    svg.selectAll(".dot")
        .on("mouseover", function(event, d) {
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`Date: ${d3.timeFormat("%Y-%m-%d")(d.date)}<br>Value: €${d.value.toFixed(2)}M`)
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
            end: next ? next.transfer_date : new Date() // assume still at last club if no next
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
        .attr("fill", "#007bff");

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
            From: ${d3.timeFormat("%Y-%m-%d")(d.start)}<br>
            To: ${d3.timeFormat("%Y-%m-%d")(d.end)}
          `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => {
          tooltip.transition().duration(200).style("opacity", 0);
        });
    })
    .catch(error => {
      console.error("Error fetching or parsing transfers_preprocessed.csv:", error);
    });
}
