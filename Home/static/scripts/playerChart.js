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
  