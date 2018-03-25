// *** This page uses angular as the way it interacts with the user input
angular.module("app", [])
    .controller("ctrl", function($scope) {
        // *** Create data
        function Data(json) {
            for (var x in json) { //json lives in external file for testing
                var data = [];
                for (var y in json[x].data) {
                    data.push({
                        date: new Date(json[x].data[y].date),
                        pivot: json[x].data[y].details.value,
                        name:  json[x].name
                    });
                    //replicate as another person
                    /*data.push({
                        date: new Date(json[x].data[y].date),
                        pivot: Math.floor(Math.random() * 50) + 1 ,
                        name:  json[x].name+"2"
                    });*/
                }
            }
            return data;
        }

        var fullData = Data(data);

        // *** Set up svg
        var margin = { top: 20, right: 20, bottom: 100, left: 60 };
        width = 960 - margin.left - margin.right,
            height = 300 - margin.top - margin.bottom;

        var tooltip = d3.select("#chart").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        var x = d3.scaleTime()
            .range([0, width-margin.left])
            .nice();

        var y = d3.scaleLinear().range([height, 0]);

        // *** Parse the date / time
        var formatDate = d3.timeFormat("%Y-%m-%eT%H:%M:%S");

        // *** Scale the range of the data
        var earliestDate = d3.min(fullData, function(d) { return d.date; });
        var latestDate = d3.max(fullData, function(d) {  return d.date; });

        var minPivot = d3.min(fullData, function(d) { return d.pivot; });
        var maxPivot = d3.max(fullData, function(d) { return d.pivot; });

        x.domain([earliestDate, latestDate]);
        y.domain([minPivot,maxPivot]);

        var xAxis = d3.axisBottom(x).tickFormat(d3.timeFormat("%m/%e %H:%M:%S"));
        var yAxis = d3.axisLeft(y);

        var brush = d3.brush().extent([[0, 0], [width, height]]).on("end", brushended),
            idleTimeout,
            idleDelay = 350;

        var svg = d3.select("#chart").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var clip = svg.append("defs").append("svg:clipPath")
            .attr("id", "clip")
            .append("svg:rect")
            .attr("width", width )
            .attr("height", height )
            .attr("x", 0)
            .attr("y", 0);

        var scatter = svg.append("g")
            .attr("id", "scatterplot")
            .attr("clip-path", "url(#clip)");


        var cValue = function(d) { return d.name;},
            color = d3.scaleOrdinal(d3.schemeCategory10);


        // x axis
        svg.append("g")
            .attr("class", "x axis")
            .attr('id', "axis--x")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis)
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-65)");


        svg.append("text")
            .style("text-anchor", "end")
            .attr("x", width)
            .attr("y", height - 8)
            .text("Date");

        // y axis
        svg.append("g")
            .attr("class", "y axis")
            .attr('id', "axis--y")
            .call(yAxis);

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", "1em")
            .style("text-anchor", "end")
            .text("Value");

        scatter.append("g")
            .attr("class", "brush")
            .call(brush);

        $scope.updateFilter = function(){

            var pivotKeys = d3.map(fullData, function(d){return d.pivot;}).keys();
            var filteredPivotArr = pivotKeys.filter(function(dataItem){
                var re = new RegExp($scope.filteringSelection, "i");
                var result = dataItem.match(re);

                if(result != null){
                    return true;
                } else {
                    return false;
                }

            });


            var filteredPivotObj = [];

            for(var k in fullData){

                if(filteredPivotArr.includes(fullData[k].pivot)){

                    filteredPivotObj.push(fullData[k]);
                }
            }

            plotData(filteredPivotObj);
        };

        plotData(fullData);
        function plotData(data){

            scatter.selectAll(".dot").remove();
            scatter.selectAll(".dot")
                .data(data)
                .enter().append("circle")
                .attr("class", "dot")
                .attr("r", 4)
                .attr("cx", function(d) { return x(d.date); })
                .attr("cy", function(d) { return y(d.pivot); })
                .attr("opacity", 0.5)
                .style("fill", function(d) { return color(cValue(d)); })
                .on("mouseover", function(d) {
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", .9);
                    tooltip.html(d.name +":"+ d.pivot)
                        .style("left", (d3.event.pageX) + "px")
                        .style("top", (d3.event.pageY) + "px");

                })
                .on("mouseout", function(d) {
                    tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                });
        }



        function brushended() {

            var s = d3.event.selection;
            if (!s) {
                if (!idleTimeout) return idleTimeout = setTimeout(idled, idleDelay);
                x.domain(d3.extent(fullData, function (d) { return d.date; })).nice();
                y.domain(d3.extent(fullData, function (d) { return d.pivot; })).nice();
            } else {

                x.domain([s[0][0], s[1][0]].map(x.invert, x));
                y.domain([s[1][1], s[0][1]].map(y.invert, y));
                scatter.select(".brush").call(brush.move, null);
            }
            zoom();
        }

        function idled() {
            idleTimeout = null;
        }

        function zoom() {

            var t = scatter.transition().duration(750);
            svg.select("#axis--x").transition(t).call(xAxis).selectAll("text")
                .style("text-anchor", "end")
                .attr("dx", "-.8em")
                .attr("dy", ".15em")
                .attr("transform", "rotate(-65)");

            svg.select("#axis--y").transition(t).call(yAxis);
            scatter.selectAll("circle").transition(t)
                .attr("cx", function (d) { return x(d.date); })
                .attr("cy", function (d) { return y(d.pivot); });
        }

    });