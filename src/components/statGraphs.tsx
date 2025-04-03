import { useState, useEffect, useRef, useCallback, useContext } from 'react';
import * as d3 from 'd3';
import { graphContext } from './graphContext';
import React from 'react';

const metricColors = {
  fnr: '#ffff33',
  fpr: '#a65628',
  tpr: '#377eb8',
  tnr: '#4daf4a',
  accuracy: '#f781bf',
  precision: '#984ea3',
  mcc: '#e41a1c',
  f1: '#ff7f00'
};

interface Metrics {
  fnr: number;
  fpr: number;
  tpr: number;
  tnr: number;
  accuracy: number;
  precision: number;
  mcc: number;
  f1: number;
  threshold: number;
}

interface DataPoint {
  cpm: number;
  intensity: number;
}

const StatGraphs = ({ data }) => {
  const { crosshairValues, hoverValues, zoomBounds } = useContext(graphContext);
  const [cpmClickedMetrics, setCpmClickedMetrics] = useState<Record<string, any> | null>(null);
  const [intClickedMetrics, setIntClickedMetrics] = useState<Record<string, any> | null>(null);
  const cpmRef = useRef(null);
  const intRef = useRef(null);

  // Add function to calculate metrics
  const calculateMetrics = (threshold: number, isCPM: boolean = true): Metrics => {
    let TP = 0, TN = 0, FP = 0, FN = 0;

    data.forEach((d: DataPoint) => {
      if (isCPM) {
        if (d.cpm >= threshold) {
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
      } else {
        if (d.intensity >= threshold) {
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
      }
    });

    const accuracy = (TP + TN) / (TP + TN + FP + FN);
    const precision = TP / (TP + FP) || 0;
    const tpr = TP / (TP + FN) || 0;
    const tnr = TN / (TN + FP) || 0;
    const fnr = FN / (TP + FN) || 0;
    const fpr = FP / (TN + FP) || 0;
    const mcc = (TP * TN - FP * FN) / Math.sqrt((TP + FP) * (TP + FN) * (TN + FP) * (TN + FN) || 1);
    const f1 = 2 * (precision * tpr) / (precision + tpr) || 0;

    return { fnr, fpr, tpr, tnr, accuracy, precision, mcc, f1, threshold };
  };

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

      const accuracy = (TP + TN) / (TP + TN + FP + FN);
      const precision = TP / (TP + FP);
      const mcc = (TP * TN - FP * FN) / Math.sqrt((TP + FP) * (TP + FN) * (TN + FP) * (TN + FN) || 1);
      const tpr = TP / (TP + FN) || 0;
      const f1 = 2 * (precision * tpr) / (precision + tpr) || 0;

      return {
        x: (bin.x0 + bin.x1) / 2,
        fnr: FN / (TP + FN),
        fpr: FP / (TN + FP),
        tpr,
        tnr: TN / (TN + FP),
        accuracy: accuracy,
        precision: precision,
        mcc: mcc,
        f1: f1
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

    // Update the rate lines to include new metrics
    ['fnr', 'fpr', 'tpr', 'tnr', 'accuracy', 'precision', 'mcc', 'f1'].forEach((rate, i) => {
      cpmSvg.append("path")
        .datum(cpmRates.map(d => ({ x: d.x, y: d[rate] })))
        .attr("fill", "none")
        .attr("stroke", metricColors[rate])
        .attr("stroke-width", 1.5)
        .attr("d", cpmlineGenerator);
    });

    // Add CPM axes
    cpmSvg.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(cpmScale));
    cpmSvg.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(cpmYScale));

    // Add CPM x-axis label
    cpmSvg.append("text")
      .attr("class", "x-axis-label")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom + 10)
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

    // Add mouse tracking overlay for CPM graph
    const cpmMouseG = cpmSvg.append("g")
      .attr("class", "mouse-over-effects");

    cpmMouseG.append("path")
      .attr("class", "mouse-line")
      .style("stroke", "black")
      .style("stroke-width", "1px")
      .style("opacity", "0");

    const cpmCrosshair = cpmMouseG.append("g")
      .style("display", "none");

    // Vertical line
    cpmCrosshair.append("line")
      .attr("class", "crosshair vertical")
      .style("stroke", "#666")
      .style("stroke-width", "1px")
      .style("stroke-dasharray", "3,3");

    // Horizontal line
    cpmCrosshair.append("line")
      .attr("class", "crosshair horizontal")
      .style("stroke", "#666")
      .style("stroke-width", "1px")
      .style("stroke-dasharray", "3,3");

    // Value labels
    cpmCrosshair.append("text")
      .attr("class", "crosshair-label x")
      .attr("text-anchor", "middle");

    cpmCrosshair.append("text")
      .attr("class", "crosshair-label y")
      .attr("text-anchor", "end");

    // Add click static crosshair groups
    const cpmClickLine = cpmSvg.append("g")
      .attr("class", "click-line")
      .style("display", "none");

    cpmClickLine.append("line")
      .attr("class", "click-crosshair")
      .style("stroke", "#00F")
      .style("stroke-width", "1px")
      .style("stroke-dasharray", "5,5");

    cpmClickLine.append("text")
      .attr("class", "click-label")
      .attr("text-anchor", "middle")
      .attr("y", -5);

    // Create overlay for mouse tracking
    cpmMouseG.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .on("mouseout", () => {
        cpmCrosshair.style("display", "none");
        // Show x-axis ticks when crosshair is hidden
        cpmSvg.selectAll(".x-axis .tick text").style("opacity", 1);
      })
      .on("mouseover", () => {
        cpmCrosshair.style("display", null);
        // Hide x-axis ticks when crosshair is visible
        cpmSvg.selectAll(".x-axis .tick text").style("opacity", 0);
      })
      .on("mousemove", function (event) {
        const mouse = d3.pointer(event);
        const xPos = mouse[0];
        const yPos = mouse[1];

        // Update crosshair position
        cpmCrosshair.select(".vertical")
          .attr("x1", xPos)
          .attr("x2", xPos)
          .attr("y1", 0)
          .attr("y2", height);

        cpmCrosshair.select(".horizontal")
          .attr("x1", 0)
          .attr("x2", width)
          .attr("y1", yPos)
          .attr("y2", yPos);

        // Update value labels
        const xValue = cpmScale.invert(xPos).toFixed(2);
        const yValue = cpmYScale.invert(yPos).toFixed(2);

        cpmCrosshair.select(".crosshair-label.x")
          .attr("x", xPos)
          .attr("y", height + 20)
          .text(`CPM: ${xValue}`);

        cpmCrosshair.select(".crosshair-label.y")
          .attr("x", -10)
          .attr("y", yPos + 4)
          .text(`${yValue}`);
      })
      .on("click", function (event) {
        const [xPos] = d3.pointer(event);
        const threshold = cpmScale.invert(xPos);
        setCpmClickedMetrics(calculateMetrics(threshold, true));

        // Update click line
        cpmClickLine
          .style("display", null)
          .attr("transform", `translate(${xPos},0)`);

        cpmClickLine.select("line")
          .attr("y1", 0)
          .attr("y2", height);

        cpmClickLine.select("text")
          .text(`CPM: ${threshold.toFixed(2)}`);
      });

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

      const accuracy = (TP + TN) / (TP + TN + FP + FN);
      const precision = TP / (TP + FP);
      const mcc = (TP * TN - FP * FN) / Math.sqrt((TP + FP) * (TP + FN) * (TN + FP) * (TN + FN) || 1);
      const tpr = TP / (TP + FN) || 0;
      const f1 = 2 * (precision * tpr) / (precision + tpr) || 0;

      return {
        x: (bin.x0 + bin.x1) / 2,
        fnr: FN / (TP + FN),
        fpr: FP / (TN + FP),
        tpr: TP / (TP + FN),
        tnr: TN / (TN + FP),
        accuracy,
        precision,
        mcc,
        f1
      };
    });

    const intYScale = d3.scaleLinear()
      .domain([0, 1])
      .range([height, 0]);

    const intlineGenerator = d3.line()
      .x(d => intScale(d.x))
      .y(d => intYScale(d.y))
      .curve(d3.curveBasis);

    // Update the rate lines to include new metrics
    ['fnr', 'fpr', 'tpr', 'tnr', 'accuracy', 'precision', 'mcc', 'f1'].forEach((rate, i) => {
      intSvg.append("path")
        .datum(intRates.map(d => ({ x: d.x, y: d[rate] })))
        .attr("fill", "none")
        .attr("stroke", metricColors[rate])
        .attr("stroke-width", 1.5)
        .attr("d", intlineGenerator);
    });

    // Add Intensity axes
    intSvg.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(intScale));
    intSvg.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(intYScale));

    // Add Intensity x-axis label
    intSvg.append("text")
      .attr("class", "x-axis-label")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom + 10)
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

    // Add similar code for Intensity graph
    const intMouseG = intSvg.append("g")
      .attr("class", "mouse-over-effects");

    // ... repeat the same pattern for intensity graph ...
    const intCrosshair = intMouseG.append("g")
      .style("display", "none");

    // Vertical line
    intCrosshair.append("line")
      .attr("class", "crosshair vertical")
      .style("stroke", "#666")
      .style("stroke-width", "1px")
      .style("stroke-dasharray", "3,3");

    // Horizontal line
    intCrosshair.append("line")
      .attr("class", "crosshair horizontal")
      .style("stroke", "#666")
      .style("stroke-width", "1px")
      .style("stroke-dasharray", "3,3");

    // Value labels
    intCrosshair.append("text")
      .attr("class", "crosshair-label x")
      .attr("text-anchor", "middle");

    intCrosshair.append("text")
      .attr("class", "crosshair-label y")
      .attr("text-anchor", "end");

    // Add click static crosshair groups
    const intClickLine = intSvg.append("g")
      .attr("class", "click-line")
      .style("display", "none");

    intClickLine.append("line")
      .attr("class", "click-crosshair")
      .style("stroke", "#00F")
      .style("stroke-width", "1px")
      .style("stroke-dasharray", "5,5");

    intClickLine.append("text")
      .attr("class", "click-label")
      .attr("text-anchor", "middle")
      .attr("y", -5);

    // Create overlay for mouse tracking
    intMouseG.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .on("mouseout", () => {
        intCrosshair.style("display", "none");
        // Show x-axis ticks when crosshair is hidden
        intSvg.selectAll(".x-axis .tick text").style("opacity", 1);
      })
      .on("mouseover", () => {
        intCrosshair.style("display", null);
        // Hide x-axis ticks when crosshair is visible
        intSvg.selectAll(".x-axis .tick text").style("opacity", 0);
      })
      .on("mousemove", function (event) {
        const mouse = d3.pointer(event);
        const xPos = mouse[0];
        const yPos = mouse[1];

        // Update crosshair position
        intCrosshair.select(".vertical")
          .attr("x1", xPos)
          .attr("x2", xPos)
          .attr("y1", 0)
          .attr("y2", height);

        intCrosshair.select(".horizontal")
          .attr("x1", 0)
          .attr("x2", width)
          .attr("y1", yPos)
          .attr("y2", yPos);

        // Update value labels
        const xValue = intScale.invert(xPos).toFixed(2);
        const yValue = intYScale.invert(yPos).toFixed(2);

        intCrosshair.select(".crosshair-label.x")
          .attr("x", xPos)
          .attr("y", height + 20)
          .text(`Intensity: ${xValue}`);

        intCrosshair.select(".crosshair-label.y")
          .attr("x", -10)
          .attr("y", yPos + 4)
          .text(`${yValue}`);
      })
      .on("click", function (event) {
        const [xPos] = d3.pointer(event);
        const threshold = intScale.invert(xPos);
        setIntClickedMetrics(calculateMetrics(threshold, false));

        // Update click line
        intClickLine
          .style("display", null)
          .attr("transform", `translate(${xPos},0)`);

        intClickLine.select("line")
          .attr("y1", 0)
          .attr("y2", height);

        intClickLine.select("text")
          .text(`Intensity: ${threshold.toFixed(2)}`);
      });

  }, [data, crosshairValues, hoverValues, zoomBounds]);

  useEffect(() => {
    // setCpmClickedMetrics(null);
    // setIntClickedMetrics(null);
  }, [crosshairValues]);

  return (
    <div className='statGraphs' style={{
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: '20px'
    }}>
      {crosshairValues && (
        <>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            {cpmClickedMetrics && (
              <div style={{
                backgroundColor: '#f5f5f5',
                padding: '15px',
                borderRadius: '8px',
                marginTop: '40px',
                minWidth: '200px'
              }}>
                <h5 style={{ margin: '0 0 10px 0' }}>Metrics at CPM {cpmClickedMetrics.threshold.toFixed(2)}</h5>
                {Object.entries(cpmClickedMetrics)
                  .filter(([key]) => key !== 'threshold')
                  .map(([key, value]) => (
                    <div key={key} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '5px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          backgroundColor: metricColors[key],
                          borderRadius: '2px'
                        }} />
                        <span>{key}:</span>
                      </div>
                      <span>{(value * 100).toFixed(1)}%</span>
                    </div>
                  ))}
              </div>
            )}

            <div>
              <h4>CPM Rates at Intensity {crosshairValues.intensity}</h4>
              <svg ref={cpmRef}></svg>
            </div>
          </div>

          <div style={{
            backgroundColor: '#f5f5f5',
            padding: '15px',
            borderRadius: '8px',
            marginTop: '40px'
          }}>
            <h5 style={{ marginTop: 0, marginBottom: '10px' }}>Legend</h5>
            {['FNR', 'FPR', 'TPR', 'TNR', 'Accuracy', 'Precision', 'MCC', 'F1'].map((label, i) => (
              <div key={label} style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <div style={{
                  width: '15px',
                  height: '15px',
                  backgroundColor: metricColors[label.toLowerCase()],
                  marginRight: '8px'
                }}></div>
                {label}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            <div>
              <h4>Intensity Rates at CPM {crosshairValues.cpm}</h4>
              <svg ref={intRef}></svg>
            </div>
            {intClickedMetrics && (
              <div style={{
                backgroundColor: '#f5f5f5',
                padding: '15px',
                borderRadius: '8px',
                marginTop: '40px',
                minWidth: '200px'
              }}>
                <h5 style={{ margin: '0 0 10px 0' }}>Metrics at Intensity {intClickedMetrics.threshold.toFixed(2)}</h5>
                {Object.entries(intClickedMetrics)
                  .filter(([key]) => key !== 'threshold')
                  .map(([key, value]) => (
                    <div key={key} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '5px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          backgroundColor: metricColors[key],
                          borderRadius: '2px'
                        }} />
                        <span>{key}:</span>
                      </div>
                      <span>{(value * 100).toFixed(1)}%</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>

  );
}

export default StatGraphs;