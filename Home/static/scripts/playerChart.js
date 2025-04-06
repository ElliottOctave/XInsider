// /Home/static/js/playerChart.js
document.addEventListener('DOMContentLoaded', function() {
  // Set dimensions and margins
  const margin = { top: 40, right: 30, bottom: 100, left: 80 };
  const container = d3.select('#player-chart');
  let containerWidth = container.node().getBoundingClientRect().width;
  let width = containerWidth - margin.left - margin.right;
  let height = 500 - margin.top - margin.bottom;

  // Append SVG
  const svg = container.append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

  // Tooltip setup
  const tooltip = d3.select('body').append('div')
      .attr('id', 'tooltip')
      .style('position', 'absolute')
      .style('background', '#fff')
      .style('padding', '10px')
      .style('border', '1px solid #ddd')
      .style('border-radius', '5px')
      .style('box-shadow', '0 2px 4px rgba(0,0,0,0.2)')
      .style('opacity', 0);

  const formatValue = d3.format(',.2f');

  // Load data
  d3.csv('../../data/players.csv').then(function(data) {
      // Data processing - convert market value to millions and filter valid entries
      data.forEach(d => {
          d.market_value_in_eur = +d.market_value_in_eur / 1e6 || 0; // Convert to millions
          d.highest_market_value_in_eur = +d.highest_market_value_in_eur / 1e6 || 0;
      });

      // Filter out players with 0 market value and sort
      const top10 = data.filter(d => d.market_value_in_eur > 0)
                        .sort((a, b) => b.market_value_in_eur - a.market_value_in_eur)
                        .slice(0, 10);

      // X axis
      const x = d3.scaleBand()
          .range([0, width])
          .domain(top10.map(d => d.name))
          .padding(0.2);

      svg.append('g')
          .attr('transform', `translate(0,${height})`)
          .call(d3.axisBottom(x))
          .selectAll('text')
          .attr('transform', 'translate(-10,0)rotate(-45)')
          .style('text-anchor', 'end');

      // Y axis
      const y = d3.scaleLinear()
          .domain([0, d3.max(top10, d => d.market_value_in_eur) * 1.1]) // Add 10% padding
          .range([height, 0]);

      svg.append('g')
          .call(d3.axisLeft(y).tickFormat(d => `€${d}M`));

      // Y axis label
      svg.append('text')
          .attr('class', 'axis-label')
          .attr('transform', 'rotate(-90)')
          .attr('y', 0 - margin.left)
          .attr('x', 0 - (height / 2))
          .attr('dy', '1em')
          .style('text-anchor', 'middle')
          .text('Market Value (€ millions)');

      // Create bars
      svg.selectAll('.bar')
          .data(top10)
          .enter()
          .append('rect')
          .attr('class', 'bar')
          .attr('x', d => x(d.name))
          .attr('y', d => y(d.market_value_in_eur))
          .attr('width', x.bandwidth())
          .attr('height', d => height - y(d.market_value_in_eur))
          .attr('fill', '#007bff')
          .on('mouseover', function(event, d) {
              tooltip.transition()
                  .duration(200)
                  .style('opacity', 0.9);
              tooltip.html(`
                  <strong>${d.name}</strong>
                  <div>Club: ${d.current_club_name || "N/A"}</div>
                  <div>Position: ${d.position || "Unknown"} (${d.sub_position || ""})</div>
                  <div>Nationality: ${d.country_of_citizenship || "N/A"}</div>
                  <div>Current Value: €${formatValue(d.market_value_in_eur)}M</div>
                  <div>Highest Value: €${formatValue(d.highest_market_value_in_eur)}M</div>
              `)
                  .style('left', (event.pageX + 10) + 'px')
                  .style('top', (event.pageY - 28) + 'px');
          })
          .on('mouseout', function() {
              tooltip.transition()
                  .duration(500)
                  .style('opacity', 0);
          });

      // Add value labels on top of bars
      svg.selectAll('.value-label')
          .data(top10)
          .enter()
          .append('text')
          .attr('class', 'value-label')
          .attr('x', d => x(d.name) + x.bandwidth() / 2)
          .attr('y', d => y(d.market_value_in_eur) - 5)
          .attr('text-anchor', 'middle')
          .text(d => `€${formatValue(d.market_value_in_eur)}M`)
          .style('font-size', '12px')
          .style('fill', '#333');

      // Add chart title
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', 0 - (margin.top / 2))
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', 'bold');
  
      // Add footnote
      svg.append('text')
          .attr('x', width / 2)
          .attr('y', height + margin.bottom - 20)
          .attr('text-anchor', 'middle')
          .style('font-size', '10px')
          .style('fill', '#666')
          .text('Data source: Transfermarkt');

  }).catch(function(error) {
      console.error('Error loading the CSV file:', error);
      container.html('<p class="error">Error loading player data. Please check the data file.</p>');
  });

  // Responsive behavior
  window.addEventListener('resize', function() {
      containerWidth = container.node().getBoundingClientRect().width;
      width = containerWidth - margin.left - margin.right;
      d3.select('svg').attr('width', width);
      // A full redraw would be needed for a fully responsive chart
  });
});

function renderRadialDecisivenessChart(startYear, endYear) {
    d3.csv("../../data/player_stats.csv").then(data => {
      data = data.filter(d => d.player_name && +d.year >= startYear && +d.year <= endYear);
  
      data.forEach(d => {
        d.year = +d.year;
        d.nr_of_goals = +d.nr_of_goals || 0;
        d.assists = +d.assists || 0;
        d.minutes = +d.minutes || 0;
      });
  
      const grouped = d3.groups(data, d => d.player_id).map(([id, records]) => {
        const totalGoals = d3.sum(records, d => d.nr_of_goals);
        const totalAssists = d3.sum(records, d => d.assists);
        const totalMinutes = d3.sum(records, d => d.minutes);
        const totalGA = totalGoals + totalAssists;
        const playerName = records[0].player_name;
  
        const avgMinutesPerGA = (totalGA >= 10 && totalMinutes >= 500)
          ? totalMinutes / totalGA
          : null;
  
        return {
          player_id: id,
          player_name: playerName,
          totalMinutes,
          totalGA,
          avgMinutesPerGA
        };
      });
  
      const nested = grouped
        .filter(d => d.avgMinutesPerGA !== null && isFinite(d.avgMinutesPerGA))
        .sort((a, b) => a.avgMinutesPerGA - b.avgMinutesPerGA)
        .slice(0, 10);
  
      const width = 440, height = 560;
      const innerRadius = 80, outerRadius = 160;
      const labelOffset = 18;
  
      const svg = d3.select("#top-decisive-chart")
        .html("")
        .append("svg")
        .attr("width", width)
        .attr("height", height);
  
      const chartGroup = svg.append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2 - 20})`);
  
      const x = d3.scaleBand()
        .domain(nested.map(d => d.player_name))
        .range([0, 2 * Math.PI]);
  
      const y = d3.scaleLinear()
        .domain([0, d3.max(nested, d => d.avgMinutesPerGA)])
        .range([innerRadius, outerRadius]);
  
      const color = d3.scaleSequential()
        .domain([d3.min(nested, d => d.avgMinutesPerGA), d3.max(nested, d => d.avgMinutesPerGA)])
        .interpolator(d3.interpolateRdBu);
  
      const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background", "#333")
        .style("color", "#fff")
        .style("padding", "6px 10px")
        .style("border-radius", "4px")
        .style("font-size", "12px");
  
      chartGroup.append("g")
        .selectAll("path")
        .data(nested)
        .enter()
        .append("path")
        .attr("fill", d => color(d.avgMinutesPerGA))
        .attr("d", d3.arc()
          .innerRadius(innerRadius)
          .outerRadius(d => y(d.avgMinutesPerGA))
          .startAngle(d => x(d.player_name))
          .endAngle(d => x(d.player_name) + x.bandwidth())
          .padAngle(0.01)
          .padRadius(innerRadius)
        )
        .on("mouseover", function (event, d) {
          d3.select(this).attr("stroke", "#000").attr("stroke-width", 1.5);
          tooltip.transition().duration(100).style("opacity", 1);
          tooltip.html(
            `<strong>${d.player_name}</strong><br>` +
            `Avg Minutes per G/A: ${d.avgMinutesPerGA.toFixed(1)}<br>` +
            `Total Minutes: ${d.totalMinutes}<br>` +
            `Total G/A: ${d.totalGA}`
          )
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 30) + "px");
        })
        .on("mousemove", function (event) {
          tooltip.style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", function () {
          d3.select(this).attr("stroke", "none");
          tooltip.transition().duration(300).style("opacity", 0);
        });
  
      chartGroup.append("g")
        .selectAll("g")
        .data(nested)
        .enter()
        .append("g")
        .attr("text-anchor", d => (x(d.player_name) + x.bandwidth() / 2) > Math.PI ? "end" : "start")
        .attr("transform", d => `
          rotate(${(x(d.player_name) + x.bandwidth() / 2) * 180 / Math.PI - 90})
          translate(${y(d.avgMinutesPerGA) + labelOffset}, 0)
        `)
        .append("text")
        .text(d => d.player_name)
        .attr("transform", d => (x(d.player_name) + x.bandwidth() / 2) > Math.PI ? "rotate(180)" : null)
        .style("font-size", "11px")
        .style("fill", "#111")
        .attr("alignment-baseline", "middle")
        .call(text => text.each(function () {
          const lines = this.textContent.split(" ");
          if (lines.length > 1) {
            d3.select(this).text(null);
            lines.forEach((word, i) => {
              d3.select(this)
                .append("tspan")
                .text(word)
                .attr("x", 0)
                .attr("dy", i === 0 ? 0 : "1.1em");
            });
          }
        }));
  
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", 30)
        .style("font-size", "15px")
        .style("font-weight", "bold")
        .text(`Top 10 Most Decisive Players (${startYear}–${endYear})`);
  
      // LEGEND (Blue left, Red right)
      const legendWidth = 220;
      const legendHeight = 14;
  
      const defs = svg.append("defs");
      const gradient = defs.append("linearGradient")
        .attr("id", "legendGradient")
        .attr("x1", "0%")
        .attr("x2", "100%");
  
      gradient.selectAll("stop")
        .data([
          { offset: "0%", color: d3.interpolateRdBu(1) },   // Blue = less decisive
          { offset: "50%", color: d3.interpolateRdBu(0.5) }, // Neutral
          { offset: "100%", color: d3.interpolateRdBu(0) }   // Red = more decisive
        ])
        .enter()
        .append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);
  
      const legendGroup = svg.append("g")
        .attr("transform", `translate(${(width - legendWidth) / 2}, ${height - 40})`);
  
      legendGroup.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legendGradient)")
        .style("stroke", "#aaa")
        .style("stroke-width", 0.8)
        .style("rx", 4);
  
      legendGroup.append("text")
        .attr("x", 0)
        .attr("y", -5)
        .text("Less Decisive")
        .style("font-size", "11px");
  
      legendGroup.append("text")
        .attr("x", legendWidth)
        .attr("y", -5)
        .attr("text-anchor", "end")
        .text("More Decisive")
        .style("font-size", "11px");
    });
  }
  