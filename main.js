/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true,
strict:true, undef:true, unused:true, curly:true, browser:true, white:true,
moz:true, esnext:false, indent:2, maxerr:50, devel:true, node:true, boss:true,
globalstrict:true, nomen:false, newcap:false */

/*global d3:false */

"use strict";

var width = 1200, 
    height = width,
    radius = width / 2,
    x = d3.scale.linear().range([0, 2 * Math.PI]),
    y = d3.scale.pow().exponent(1.3).domain([0, 1]).range([0, radius]),
    padding = 5,
    duration = 1000;

var div = d3.select("#vis");

div.select("img").remove();

var vis = div.append("svg")
    .attr("width", width + padding * 2)
    .attr("height", height + padding * 2)
  .append("g")
    .attr("transform", "translate(" + [radius + padding, radius + padding] + ")");

div.append("p")
    .attr("id", "intro")
    .text("Click to zoom!");

var partition = d3.layout.partition()
    .sort(null)
    .value(function(d) {
      var rv = 4;
      if (!d3.select("#resolved.active").empty()) {
        rv += d.resolved;
      }
      if (!d3.select("#mentored.active").empty()) {
        rv += d.mentored;
      }
      if (!d3.select("#good_first.active").empty()) {
        rv += d.good_first;
      }
      if (!d3.select("#mentor_offer.active").empty()) {
        rv += d.mentor_offer;
      }
      if (d.name === "Bryan Clark") {
        console.log(d.name,
          d3.select("#resolved.active").empty(),
          d3.select("#mentored.active").empty(),
          d3.select("#good_first.active").empty(),
          d3.select("#mentor_offer.active").empty(),
          rv);
      }
      return rv;
    });

var arc = d3.svg.arc()
    .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
    .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); })
    .innerRadius(function(d) { return Math.max(0, d.y ? y(d.y) : d.y); })
    .outerRadius(function(d) { return Math.max(0, y(d.y + d.dy)); });

function click(d) {
  vis.selectAll("path").transition()
    .duration(duration)
    .attrTween("d", arcTween(d));

  // Somewhat of a hack as we rely on arcTween updating the scales.
  vis.selectAll("text").style("visibility", function(e) {
        return isParentOf(d, e) ? null : d3.select(this).style("visibility");
      })
    .transition()
      .duration(duration)
      .attrTween("text-anchor", function(d) {
        return function() {
          return x(d.x + d.dx / 2) > Math.PI ? "end" : "start";
        };
      })
      .attrTween("transform", function(d) {
        var multiline = (d.name || "").length > 1;
        return function() {
          var angle = x(d.x + d.dx / 2) * 180 / Math.PI - 90,
              rotate = angle + (multiline ? -0.5 : 0);
          return "rotate(" + rotate + ")translate(" + (y(d.y) + padding) + ")rotate(" + (angle > 90 ? -180 : 0) + ")";
        };
      })
      .style("fill-opacity", function(e) { return isParentOf(d, e) ? 1 : 1e-6; })
      .each("end", function(e) {
        d3.select(this).style("visibility", isParentOf(d, e) ? null : "hidden");
      });
}

function update() {
  vis.selectAll("path").transition()
    .duration(duration)
    .attr("d", arc);

  vis.selectAll("text").transition()
    .duration(duration)
    .attr("text-anchor", function(d) {
      return x(d.x + d.dx / 2) > Math.PI ? "end" : "start";
    })
    .attr("transform", function(d) {
      var multiline = (d.name || "").length > 1;
      var angle = x(d.x + d.dx / 2) * 180 / Math.PI - 90,
          rotate = angle + (multiline ? -0.5 : 0);
      return "rotate(" + rotate + ")translate(" + (y(d.y) + padding) + ")rotate(" + (angle > 90 ? -180 : 0) + ")";
    });
  vis.selectAll("tspan")
    .text(function(d) {
      var s = "";
      if (d.name) { s += d.name + " "; }
      if (!d3.select("#numbers.active").empty()) {
        if (d.mentored) { s += " M: " + d.mentored; }
        if (d.mentor_offer) { s += " O: " + d.mentor_offer; }
        if (d.good_first) { s += " G: " + d.good_first; }
        if (d.resolved) { s += " R: " + d.resolved; }
      }
      return s;
    });
}

function draw(data) {
  var nodes = partition.nodes({children: data});

  var path = vis.selectAll("path").data(nodes);
  path.enter().append("path")
      .attr("id", function(d, i) { return "path-" + i; })
      .attr("d", arc)
      .attr("fill-rule", "evenodd")
      .style("fill", colour)
      .on("click", click);

  var text = vis.selectAll("text").data(nodes);
  var textEnter = text.enter().append("text")
      .style("fill-opacity", 1)
      .style("fill", function(d) {
        return brightness(d3.rgb(colour(d))) < 125 ? "#eee" : "#000";
      })
      .attr("text-anchor", function(d) {
        return x(d.x + d.dx / 2) > Math.PI ? "end" : "start";
      })
      .attr("dy", ".2em")
      .attr("transform", function(d) {
        var multiline = (d.name || "").length > 1,
            angle = x(d.x + d.dx / 2) * 180 / Math.PI - 90,
            rotate = angle + (multiline ? -0.5 : 0);
        return "rotate(" + rotate + ")translate(" + (y(d.y) + padding) + ")rotate(" + (angle > 90 ? -180 : 0) + ")";
      })
      .on("click", click);
  textEnter.append("tspan")
      .attr("x", 0);
  update();
}

var cachedData;
d3.json("extended-data.json", function(error, json) {
  cachedData = json;
  draw(json);
});

d3.selectAll(".toggle").on("click", function () {
  // alert(this);
  var self = d3.select(this);
  self.classed("active", function () {
    return !self.classed("active");
  });
  var nodes = partition.nodes({children: cachedData});
  vis.selectAll("path").data(nodes);
  vis.selectAll("text").data(nodes);
  update();
});

function isParentOf(p, c) {
  if (p === c) { return true; }
  if (p.children) {
    return p.children.some(function(d) {
      return isParentOf(d, c);
    });
  }
  return false;
}

var colourScale = d3.scale.category20b().domain(d3.range(20));
function colour(d) {
  if (d.children) {
    // There is a maximum of two children!
    var colours = d.children.map(colour),
        a = d3.hsl(colours[0]),
        b = d3.hsl(colours[1]);
    if (colours.length === 1) {
      b = a;
    }
    // L*a*b* might be better here...
    return d3.hsl((a.h + b.h) / 2, a.s * 1.2, a.l / 1.2);
  }
  if (!d.colour) {
    d.colour = colourScale(3);
  }
  return d.colour || "#bfb";
}

// Interpolate the scales!
function arcTween(d) {
  var my = maxY(d),
      xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
      yd = d3.interpolate(y.domain(), [d.y, my]),
      yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
  return function(d) {
    return function(t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); return arc(d); };
  };
}

function maxY(d) {
  return d.children ? Math.max.apply(Math, d.children.map(maxY)) : d.y + d.dy;
}

// http://www.w3.org/WAI/ER/WD-AERT/#color-contrast
function brightness(rgb) {
  return rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114;
}
