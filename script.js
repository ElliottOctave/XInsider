document.addEventListener("DOMContentLoaded", function () {
    d3.csv("data/players.csv").then(function (data) {
        // Convert market_value_eur to numbers and sort by value
        data.forEach(d => d.market_value_eur = +d.market_value_eur);
        let topPlayers = data.sort((a, b) => b.market_value_eur - a.market_value_eur).slice(0, 10);

        // Set dimensions
        const width = 800, height = 400;
        const margin = { top: 40, right: 30, bottom: 100, left: 100 };

        const svg = d3.select("#player-chart")
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        // Scales
        const xScale = d3.scaleBand()
            .domain(topPlayers.map(d => d.player_name))
            .range([margin.left, width - margin.right])
            .padding(0.4);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(topPlayers, d => d.market_value_eur)])
            .nice()
            .range([height - margin.bottom, margin.top]);

        // Bars
        svg.selectAll("rect")
            .data(topPlayers)
            .enter()
            .append("rect")
            .attr("x", d => xScale(d.player_name))
            .attr("y", d => yScale(d.market_value_eur))
            .attr("width", xScale.bandwidth())
            .attr("height", d => height - margin.bottom - yScale(d.market_value_eur))
            .attr("fill", "#007bff");

        // X Axis
        svg.append("g")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(xScale))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .attr("text-anchor", "end");

        // Y Axis
        svg.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(yScale));

        // Labels
        svg.selectAll("text.label")
            .data(topPlayers)
            .enter()
            .append("text")
            .attr("x", d => xScale(d.player_name) + xScale.bandwidth() / 2)
            .attr("y", d => yScale(d.market_value_eur) - 5)
            .attr("text-anchor", "middle")
            .attr("fill", "black")
            .text(d => d.market_value_eur.toLocaleString() + " €");
    });
});
