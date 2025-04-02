import { useState, useEffect, useRef, useCallback, useContext } from 'react';
import * as d3 from 'd3';
import { graphContext } from './graphContext';
import React from 'react';

const StatGraphs = ({ data }) => {
  const { crosshairValues, hoverValues, zoomBounds } = useContext(graphContext);
  const cpmRef = useRef(null);
  const intRef = useRef(null);

  useEffect(() => {
    if (!data || !crosshairValues) return;

    // Clear previous graphs
    d3.select(cpmRef.current).selectAll("*").remove();
    d3.select(intRef.current).selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = 500 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    // Create CPM line graph
    const cpmSvg = d3.select(cpmRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create scales for CPM
    const cpmScale = d3.scaleLinear()
      .domain(zoomBounds ? zoomBounds.cpm : [0, d3.max(data, d => d.cpm)])
      .range([0, width]);

    // Calculate points above thresholds for each CPM value
    const cpmBins = d3.bin()
      .domain(cpmScale.domain())
      .thresholds(40)(data.map(d => d.cpm));

    // For CPM graph, calculate rates for each bin
    const cpmRates = cpmBins.map(bin => {
      var TP = 0;
      var TN = 0;
      var FP = 0;
      var FN = 0;

      data.forEach(d => {
        if (d.cpm >= bin.x0) {
          if (d.intensity >= crosshairValues.intensity) {
            TP++;
          } else {
            FP++;
          }
        } else {
          if (d.intensity >= crosshairValues.intensity) {
            FN++;
          } else {
            TN++;
          }
        }
      });

      return {
        x: (bin.x0 + bin.x1) / 2,
        fnr: FN / (TP + FN),
        fpr: FP / (TN + FP),
        tpr: TP / (TP + FN),
        tnr: TN / (TN + FP)
      };
    });

    const cpmYScale = d3.scaleLinear()
      .domain([0, 1])
      .range([height, 0]);

    // Draw CPM rate lines
    const cpmlineGenerator = d3.line()
      .x(d => cpmScale(d.x))
      .y(d => cpmYScale(d.y))
      .curve(d3.curveBasis);

    ['fnr', 'fpr', 'tpr', 'tnr'].forEach((rate, i) => {
      const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'];
      cpmSvg.append("path")
        .datum(cpmRates.map(d => ({ x: d.x, y: d[rate] })))
        .attr("fill", "none")
        .attr("stroke", colors[i])
        .attr("stroke-width", 1.5)
        .attr("d", cpmlineGenerator);
    });

    // Add CPM axes
    cpmSvg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(cpmScale));
    cpmSvg.append("g")
      .call(d3.axisLeft(cpmYScale));

    // Add CPM x-axis label
    cpmSvg.append("text")
      .attr("class", "x-axis-label")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom)
      .text("CPM Threshold");

    // Add hover line group for CPM
    const cpmHoverLine = cpmSvg.append("g")
      .attr("class", "hover-line")
      .style("display", "none");

    cpmHoverLine.append("line")
      .attr("stroke", "#999")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3")
      .attr("y1", 0)
      .attr("y2", height);

    // Create Intensity line graph
    const intSvg = d3.select(intRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const intScale = d3.scaleLinear()
      .domain(zoomBounds ? zoomBounds.intensity : [0, d3.max(data, d => d.intensity)])
      .range([0, width]);

    const intBins = d3.bin()
      .domain(intScale.domain())
      .thresholds(40)(data.map(d => d.intensity));

    // For Intensity graph, calculate rates
    const intRates = intBins.map(bin => {
      var TP = 0;
      var TN = 0;
      var FP = 0;
      var FN = 0;

      data.forEach(d => {
        if (d.intensity >= bin.x0) {
          if (d.cpm >= crosshairValues.cpm) {
            TP++;
          } else {
            FP++;
          }
        } else {
          if (d.cpm >= crosshairValues.cpm) {
            FN++;
          } else {
            TN++;
          }
        }
      });

      return {
        x: (bin.x0 + bin.x1) / 2,
        fnr: FN / (TP + FN),
        fpr: FP / (TN + FP),
        tpr: TP / (TP + FN),
        tnr: TN / (TN + FP)
      };
    });

    const intYScale = d3.scaleLinear()
      .domain([0, 1])
      .range([height, 0]);

    const intlineGenerator = d3.line()
      .x(d => intScale(d.x))
      .y(d => intYScale(d.y))
      .curve(d3.curveBasis);

    // Draw Intensity rate lines
    ['fnr', 'fpr', 'tpr', 'tnr'].forEach((rate, i) => {
      const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'];
      intSvg.append("path")
        .datum(intRates.map(d => ({ x: d.x, y: d[rate] })))
        .attr("fill", "none")
        .attr("stroke", colors[i])
        .attr("stroke-width", 1.5)
        .attr("d", intlineGenerator);
    });

    // Add Intensity axes
    intSvg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(intScale));
    intSvg.append("g")
      .call(d3.axisLeft(intYScale));

    // Add Intensity x-axis label
    intSvg.append("text")
      .attr("class", "x-axis-label")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom)
      .text("Intensity Threshold");

    // Add hover line group for Intensity
    const intHoverLine = intSvg.append("g")
      .attr("class", "hover-line")
      .style("display", "none");

    intHoverLine.append("line")
      .attr("stroke", "#999")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3")
      .attr("y1", 0)
      .attr("y2", height);

    // Update hover lines when hoverValues change
    if (hoverValues) {
      // Update CPM hover line
      const cpmX = cpmScale(hoverValues.cpm);
      if (cpmX >= 0 && cpmX <= width) {
        cpmHoverLine
          .style("display", null)
          .select("line")
          .attr("x1", cpmX)
          .attr("x2", cpmX);
      }

      // Update Intensity hover line
      const intX = intScale(hoverValues.intensity);
      if (intX >= 0 && intX <= width) {
        intHoverLine
          .style("display", null)
          .select("line")
          .attr("x1", intX)
          .attr("x2", intX);
      }
    }

    // Add legend
    const legend = cpmSvg.append("g")
      .attr("font-family", "sans-serif")
      .attr("font-size", 10)
      .attr("text-anchor", "start")
      .selectAll("g")
      .data(['FNR', 'FPR', 'TPR', 'TNR'])
      .enter().append("g")
      .attr("transform", (d, i) => `translate(10,${i * 20 + 10})`);

    legend.append("rect")
      .attr("x", width - 60)
      .attr("width", 19)
      .attr("height", 19)
      .attr("fill", (d, i) => ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'][i]);

    legend.append("text")
      .attr("x", width - 35)
      .attr("y", 9.5)
      .attr("dy", "0.32em")
      .text(d => d);

  }, [data, crosshairValues, hoverValues, zoomBounds]);

  return (
    <div className='statGraphs' style={{
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-evenly'
    }}>
      {crosshairValues && (
        <>
          <div>
            <h4>CPM Rates at Intensity {crosshairValues.intensity}</h4>
            <svg ref={cpmRef}></svg>
          </div>
          <div>
            <h4>Intensity Rates at CPM {crosshairValues.cpm}</h4>
            <svg ref={intRef}></svg>
          </div>
        </>
      )
      }
    </div>

  );
}

export default StatGraphs;