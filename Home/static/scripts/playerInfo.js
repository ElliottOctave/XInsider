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
      document.getElementById('player-details').innerHTML = `
        <h1>${player.first_name} ${player.last_name}</h1>
        <p><strong>Current Club:</strong> ${player.current_club_name}</p>
        <p><strong>Position:</strong> ${player.position}</p>
        <p><strong>Market Value:</strong> €${player.market_value_in_eur}</p>
        <p><strong>Country of Birth:</strong> ${player.country_of_birth}</p>
        <p><strong>Date of Birth:</strong> ${player.date_of_birth}</p>
        <img src="${player.image_url}" alt="${player.first_name} ${player.last_name}" class="player-image" />
      `;

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