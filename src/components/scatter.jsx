import { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { Button, Typography } from '@mui/material';
import * as d3 from 'd3';
import { graphContext } from './graphContext';

const stateColors = [
  '#377eb8', // blue
  '#e41a1c', // red
  '#4daf4a', // green
  '#984ea3', // purple
  '#ff7f00', // orange
  '#a65628', // brown
  '#f781bf'  // pink
];

const ScatterPlot = ({ data }) => {
  const svgRef = useRef();
  const zoomCPMRef = useRef();
  const zoomIntRef = useRef();
  const width = 800;
  const height = 600;
  const margin = { top: 120, right: 120, bottom: 40, left: 40 };
  const { crosshairValues, setCrosshairValues, setHoverValues, zoomBounds, setZoomBounds, clearState } = useContext(graphContext);

  const [varData, setVarData] = useState(data);

  // Handle click event on the SVG, changes behavior based on selection mode
  const handleClick = useCallback((event, scales, updateCrosshair) => {
    const [mouseX, mouseY] = d3.pointer(event);
    const newValues = {
      cpm: scales.xScale.invert(mouseX),
      intensity: scales.yScale.invert(mouseY)
    };
    // Normal mode logic
    const svg = d3.select(svgRef.current);
    const crosshair = svg.select('.crosshair');
    const referenceCrosshair = svg.select('.reference-crosshair');

    updateCrosshair(mouseX, mouseY);
    crosshair.attr('manual-show', true);
    crosshair.style('display', null);

    referenceCrosshair.style('display', null);
    referenceCrosshair.select('.reference-vertical')
      .attr('x1', mouseX)
      .attr('x2', mouseX);
    referenceCrosshair.select('.reference-horizontal')
      .attr('y1', mouseY)
      .attr('y2', mouseY);

    setCrosshairValues(newValues);

  }, [crosshairValues, varData]);

  // Handle zooming based on user input
  const applyZoom = () => {
    const cpmRange = zoomCPMRef.current.value.split('-').map(Number);
    const intensityRange = zoomIntRef.current.value.split('-').map(Number);
    if (cpmRange.length !== 2 || intensityRange.length !== 2) {
      console.error('Invalid input format. Expected format: "min-max"');
      return;
    }

    setZoomBounds({ cpm: cpmRange, intensity: intensityRange });
  }

  useEffect(() => {
    if (!data) return;
    setVarData(data);
    // Clear previous state when new data is loaded
    clearState();
  }, [data]);

  useEffect(() => {
    if (!varData) return;

    // Clear previous svg content
    d3.select(svgRef.current).selectAll("*").remove();
    d3.select('body').selectAll('.tooltip').remove();

    // Create tooltip div
    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);

    // Create scales
    const xScale = d3.scaleLinear()
      .domain(zoomBounds ? zoomBounds.cpm : [0, d3.max(varData, d => d.cpm)])
      .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
      .domain(zoomBounds ? zoomBounds.intensity : [0, d3.max(varData, d => d.intensity)])
      .range([height - margin.bottom, margin.top]);

    // Filter points based on zoom bounds
    const visiblePoints = zoomBounds
      ? varData.filter(d =>
        d.cpm >= zoomBounds.cpm[0] &&
        d.cpm <= zoomBounds.cpm[1] &&
        d.intensity >= zoomBounds.intensity[0] &&
        d.intensity <= zoomBounds.intensity[1]
      )
      : varData;

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Create density namerators
    const xDensity = d3.histogram()
      .value(d => d.cpm)
      .domain(xScale.domain())
      .thresholds(xScale.ticks(30));

    const yDensity = d3.histogram()
      .value(d => d.intensity)
      .domain(yScale.domain())
      .thresholds(yScale.ticks(30));

    // Compute the bins for x and y
    const xBins = xDensity(visiblePoints);
    const yBins = yDensity(visiblePoints);

    // Create density scales
    const xDensityScale = d3.scaleLinear()
      .domain([0, d3.max(xBins, d => d.length)]) // Adjust last value to scale height of density plot
      .range([0, margin.top]);

    const yDensityScale = d3.scaleLinear()
      .domain([0, d3.max(yBins, d => d.length)]) // Adjust max based on your varData
      .range([0, margin.right]);

    // Add top density plot
    const topDensity = svg.append('g')
      .attr('transform', `translate(0, ${margin.top})`);

    topDensity.append('path')
      .datum(xBins)
      .attr('fill', '#999')
      .attr('opacity', 0.5)
      .attr('d', d3.area()
        .x(d => xScale(d.x0 + (d.x1 - d.x0) / 2))
        .y0(0)
        .y1(d => -xDensityScale(d.length))
        .curve(d3.curveBasis)
      );

    // Add right density plot
    const rightDensity = svg.append('g')
      .attr('transform', `translate(${width - margin.right}, 0)`);

    rightDensity.append('path')
      .datum(yBins)
      .attr('fill', '#999')
      .attr('opacity', 0.5)
      .attr('d', d3.area()
        .y(d => yScale(d.x0 + (d.x1 - d.x0) / 10))
        .x0(0)
        .x1(d => yDensityScale(d.length))
        .curve(d3.curveBasis)
      );

    // Create container for reference crosshair
    const referenceCrosshair = svg.append('g')
      .attr('class', 'reference-crosshair')
      .style('display', 'none');

    // Add reference vertical line
    referenceCrosshair.append('line')
      .attr('class', 'reference-vertical')
      .attr('y1', margin.top)
      .attr('y2', height - margin.bottom)
      .attr('stroke', '#0066cc')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    // Add reference horizontal line
    referenceCrosshair.append('line')
      .attr('class', 'reference-horizontal')
      .attr('x1', margin.left)
      .attr('x2', width - margin.right)
      .attr('stroke', '#0066cc')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    // Add axes
    svg.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale))
      .append('text')
      .attr('x', width - margin.right)
      .attr('y', -10)
      .attr('fill', 'black')
      .text('CPM');

    svg.append('g')
      .attr('class', 'y-axis')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale))
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 15)
      .attr('x', -margin.top + 10)
      .attr('fill', 'black')
      .text('Intensity');

    // Create container for crosshairs
    const crosshair = svg.append('g')
      .attr('class', 'crosshair')
      .style('display', 'none');

    // Add vertical line
    crosshair.append('line')
      .attr('class', 'crosshair-vertical')
      .attr('y1', margin.top)
      .attr('y2', height - margin.bottom)
      .attr('stroke', '#666')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    // Add horizontal line
    crosshair.append('line')
      .attr('class', 'crosshair-horizontal')
      .attr('x1', margin.left)
      .attr('x2', width - margin.right)
      .attr('stroke', '#666')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    // Add value labels
    crosshair.append('text')
      .attr('class', 'crosshair-x-label')
      .attr('text-anchor', 'middle')
      .attr('dy', '1em')
      .attr('y', height - margin.bottom + 20);

    crosshair.append('text')
      .attr('class', 'crosshair-y-label')
      .attr('text-anchor', 'end')
      .attr('dx', '-0.5em')
      .attr('x', margin.left - 5);

    // Add mouse tracking area 
    svg.append('rect')
      .attr('width', width - margin.left - margin.right)
      .attr('height', height - margin.top - margin.bottom)
      .attr('x', margin.left)
      .attr('y', margin.top)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('mousemove', function (event) {
        const [mouseX, mouseY] = d3.pointer(event);
        updateCrosshair(mouseX, mouseY);
        // convert mouseX, mouseY to cpm, intensity values
        const cpm = xScale.invert(mouseX).toFixed(2);
        const intensity = yScale.invert(mouseY).toFixed(2);
        setHoverValues({ cpm, intensity });
      })
      .on('mouseleave', function () {
        crosshair.style('display', 'none');
        setHoverValues(null);
      })
      .on('click', (event => handleClick(event, { xScale, yScale }, updateCrosshair)));

    // Add points
    svg.selectAll('circle')
      .data(visiblePoints)
      .join('circle')
      .attr('cx', d => xScale(d.cpm))
      .attr('cy', d => yScale(d.intensity))
      .attr('r', 3)
      .attr('fill', d => {if (d.state) {
        return stateColors[d.state % stateColors.length]}
      else {
        return '#377eb8'
      }})
      .attr('opacity', 0.6)
      .on('mouseover', function (event, d) {
        const circle = d3.select(this);
        crosshair.attr('manual-show', true);
        updateCrosshair(xScale(d.cpm), yScale(d.intensity));
        circle.attr('r', 5)
          .attr('stroke', '#000')
          .attr('stroke-width', 1);

        // Show tooltip
        tooltip.transition()
          .duration(200)
          .style('opacity', .9);
        tooltip.html(d.name)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function () {
        const circle = d3.select(this);
        crosshair.attr('manual-show', null);
        crosshair.style('display', 'none');
        circle.attr('r', 3)
          .attr('stroke', null);

        // Hide tooltip
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
      });

    // Helper function to update crosshair position and labels
    function updateCrosshair(x, y) {
      if (x >= margin.left &&
        x <= width - margin.right &&
        y >= margin.top &&
        y <= height - margin.bottom) {

        crosshair.style('display', null);

        crosshair.select('.crosshair-vertical')
          .attr('x1', x)
          .attr('x2', x);

        crosshair.select('.crosshair-horizontal')
          .attr('y1', y)
          .attr('y2', y);

        const xValue = xScale.invert(x).toFixed(2);
        const yValue = yScale.invert(y).toFixed(2);

        crosshair.select('.crosshair-x-label')
          .attr('x', x)
          .text(`CPM: ${xValue}`);

        crosshair.select('.crosshair-y-label')
          .attr('y', y)
          .text(`Intensity: ${yValue}`);
      }
    }

  }, [varData, zoomBounds]);

  const downloadResults = () => {
    if (!crosshairValues || !data) return;

    // Create categorized data
    const categorizedData = data.map(d => {
      let state;
      if (d.cpm > crosshairValues.cpm && d.intensity > crosshairValues.intensity) {
        state = 1; // True positive
      } else if (d.cpm > crosshairValues.cpm && d.intensity <= crosshairValues.intensity) {
        state = 2; // False positive
      } else if (d.cpm <= crosshairValues.cpm && d.intensity <= crosshairValues.intensity) {
        state = 3; // True negative
      } else {
        state = 4; // False negative
      }
      return { name: d.name, state };
    });

    // Convert to TSV
    const headers = ['name', 'state'];
    const tsv = [
      headers.join('\t'),
      ...categorizedData.map(row => `${row.name}\t${row.state}`)
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([tsv], { type: 'text/tab-separated-values' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'threshold_results.tsv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const renderThreshold = () => {
    const handleValueChange = (type, value) => {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        setCrosshairValues(prev => ({
          ...prev,
          [type]: numValue
        }));

        // Update reference crosshair position
        const svg = d3.select(svgRef.current);
        const xScale = d3.scaleLinear()
          .domain([d3.min(data, d => d.cpm), d3.max(data, d => d.cpm)])
          .range([margin.left, width - margin.right]);
        const yScale = d3.scaleLinear()
          .domain([d3.min(data, d => d.intensity), d3.max(data, d => d.intensity)])
          .range([height - margin.bottom, margin.top]);

        const referenceCrosshair = svg.select('.reference-crosshair');
        if (type === 'cpm') {
          referenceCrosshair.select('.reference-vertical')
            .attr('x1', xScale(numValue))
            .attr('x2', xScale(numValue));
        } else {
          referenceCrosshair.select('.reference-horizontal')
            .attr('y1', yScale(numValue))
            .attr('y2', yScale(numValue));
        }
      }
    };

    return (
      <div style={{
        padding: '10px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
        minWidth: '200px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-evenly',
          alignItems: 'center',
          marginBottom: '15px'
        }}>
          <Typography variant="h7">Threshold</Typography>
        </div>
        <div className='threshold-inputs'>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <label htmlFor="cpm-input">CPM:</label>
            <input
              id="cpm-input"
              type="number"
              placeholder={crosshairValues?.cpm || 0}
              onKeyUp={(e) => {
                if (e.key === 'Enter') {
                  handleValueChange('cpm', e.target.value);
                }
              }}
              style={{
                width: '100px',
                padding: '4px',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <label htmlFor="intensity-input">Intensity:</label>
            <input
              id="intensity-input"
              type="number"
              placeholder={crosshairValues?.intensity || 0}
              onKeyUp={(e) => {
                if (e.key === 'Enter') {
                  handleValueChange('intensity', e.target.value);
                }
              }}
              style={{
                width: '100px',
                padding: '4px',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
            />
          </div>
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={() => {
              setCrosshairValues(null);
              d3.select(svgRef.current)
                .select('.reference-crosshair')
                .style('display', 'none');
            }}
          >
            Clear
          </Button>
        </div>
      </div>
    )
  };

  const renderMetrics = () => {
    if (!crosshairValues) return null;

    // Calculate metrics based on reference values
    var TP = 0;
    var TN = 0;
    var FP = 0;
    var FN = 0;
    // iterate over data and calculate TP, TN, FP, FN
    varData.forEach(d => {
      if (d.cpm > crosshairValues.cpm && d.intensity > crosshairValues.intensity) {
        TP++;
      } else if (d.cpm <= crosshairValues.cpm && d.intensity <= crosshairValues.intensity) {
        TN++;
      } else if (d.cpm > crosshairValues.cpm && d.intensity <= crosshairValues.intensity) {
        FP++;
      } else if (d.cpm <= crosshairValues.cpm && d.intensity > crosshairValues.intensity) {
        FN++;
      }
    });

    // Calculate rates


    const accuracy = (TP + TN) / (TP + TN + FP + FN);
    const precision = TP / (TP + FP);
    const recall = TP / (TP + FN);
    const f1Score = 2 * (precision * recall) / (precision + recall);
    const specificity = TN / (TN + FP);
    const fpr = FP / (FP + TN);
    const fnr = FN / (TP + FN);
    const mcc = (TP * TN - FP * FN) / Math.sqrt((TP + FP) * (TP + FN) * (TN + FP) * (TN + FN));

    return (
      <div style={{
        padding: '10px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
        minWidth: '200px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-evenly',
          alignItems: 'center',
          marginBottom: '15px'
        }}>
          <Typography variant="h7">Metrics</Typography>
        </div>
        <div className='metrics-text' style={{ marginTop: '10px', textAlign: 'start' }}>
          <div>Accuracy: {(accuracy * 100).toFixed(2)}%</div>
          <div>Precision: {(precision * 100).toFixed(2)}%</div>
          <div>Recall (TPR): {(recall * 100).toFixed(2)}%</div>
          <div>F1 Score: {f1Score.toFixed(2)}</div>
          <div>Specificity (TNR): {(specificity * 100).toFixed(2)}%</div>
          <div>False Positive Rate: {(fpr * 100).toFixed(2)}%</div>
          <div>False Negative Rate: {(fnr * 100).toFixed(2)}%</div>
          <div>MCC: {mcc.toFixed(2)}</div>
        </div>

        <div style={{ marginTop: '10px' }}>
          <Button
            size="small"
            variant="outlined"
            onClick={downloadResults}
          >
            Download
          </Button>
        </div>
      </div>
    );
  };

  const renderZoomMenu = () => {
    return (
      <div style={{
        padding: '10px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
        minWidth: '200px'
      }}>
        <div className='graph-main'
          style={{
            display: 'flex',
            justifyContent: 'space-evenly',
            alignItems: 'center',
            marginBottom: '15px'
          }}>
          <Typography variant="h7">Zoom Between</Typography>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <label htmlFor="cpm-input">CPM:</label>
            <input
              id="cpm-input"
              type="text"
              placeholder={`0-${d3.max(varData, d => d.cpm).toFixed(2)}`}
              style={{
                width: '100px',
                padding: '4px',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
              ref={zoomCPMRef}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="intensity-input">Intensity:</label>
            <input
              id="intensity-input"
              type="text"
              placeholder={`0-${d3.max(varData, d => d.intensity).toFixed(2)}`}
              style={{
                width: '100px',
                padding: '4px',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
              ref={zoomIntRef}
            />
          </div>
        </div>
        <Button
          size="small"
          variant="outlined"
          color="primary"
          onClick={() => {
            applyZoom()
          }}
        >
          Apply Zoom
        </Button>
        {zoomBounds && (
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setVarData(data); // Reset to original data
              setZoomBounds(null);
            }}
          >
            Reset Selection
          </Button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: crosshairValues ? 'space-evenly' : "center", alignItems: 'center' }}>
      <div style={{ position: 'relative' }}>
        <svg ref={svgRef}></svg>
      </div>
      <div className='rightPanels' style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {renderThreshold()}
        {renderMetrics()}
        {renderZoomMenu()}
      </div>
    </div>
  );
};

export default ScatterPlot;