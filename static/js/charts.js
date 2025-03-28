/**
 * Charts module for the Earned Schedule calculator
 * Handles rendering and updating of S-curve and performance charts
 */
class ESCharts {
    constructor() {
        // Initialize chart containers
        this.sCurveChart = null;
        this.performanceChart = null;
        
        // Chart DOM elements
        this.sCurveContainer = document.getElementById('s-curve-chart');
        this.performanceContainer = document.getElementById('performance-chart');
    }
    
    /**
     * Initialize all charts
     */
    initCharts() {
        this.initSCurveChart();
        this.initPerformanceChart();
    }
    
    /**
     * Initialize the S-Curve chart
     */
    initSCurveChart() {
        const data = [
            {
                x: [0],
                y: [0],
                type: 'scatter',
                mode: 'lines+markers',
                name: 'Planned Value (PV)',
                line: {
                    color: '#007bff',
                    width: 3
                }
            },
            {
                x: [0],
                y: [0],
                type: 'scatter',
                mode: 'lines+markers',
                name: 'Earned Value (EV)',
                line: {
                    color: '#28a745',
                    width: 3
                }
            }
        ];
        
        const layout = {
            title: 'Progress S-Curve',
            xaxis: {
                title: 'Time Period',
                showgrid: true,
                zeroline: true
            },
            yaxis: {
                title: 'Cumulative Value',
                showgrid: true,
                zeroline: true
            },
            margin: { t: 40, l: 60, r: 40, b: 60 },
            legend: {
                orientation: 'h',
                y: -0.2
            },
            showlegend: true,
            hovermode: 'closest'
        };
        
        const config = {
            responsive: true,
            displayModeBar: false
        };
        
        this.sCurveChart = Plotly.newPlot(this.sCurveContainer, data, layout, config);
    }
    
    /**
     * Initialize the Performance Indices chart
     */
    initPerformanceChart() {
        const data = [
            {
                x: [0],
                y: [1],
                type: 'scatter',
                mode: 'lines+markers',
                name: 'SPI(t)',
                line: {
                    color: '#fd7e14',
                    width: 3
                }
            },
            {
                x: [0],
                y: [0],
                type: 'scatter',
                mode: 'lines+markers',
                name: 'SV(t)',
                line: {
                    color: '#6f42c1',
                    width: 3
                },
                yaxis: 'y2'
            },
            {
                x: [0, 100],
                y: [1, 1],
                type: 'scatter',
                mode: 'lines',
                name: 'On Schedule (SPI(t) = 1)',
                line: {
                    color: '#aaaaaa',
                    width: 2,
                    dash: 'dash'
                },
                showlegend: true
            }
        ];
        
        const layout = {
            title: 'Schedule Performance',
            xaxis: {
                title: 'Time Period',
                showgrid: true,
                zeroline: true
            },
            yaxis: {
                title: 'SPI(t)',
                showgrid: true,
                zeroline: true,
                range: [0, 1.5]
            },
            yaxis2: {
                title: 'SV(t)',
                overlaying: 'y',
                side: 'right',
                showgrid: false,
                zeroline: true
            },
            margin: { t: 40, l: 60, r: 60, b: 60 },
            legend: {
                orientation: 'h',
                y: -0.2
            },
            showlegend: true,
            hovermode: 'closest'
        };
        
        const config = {
            responsive: true,
            displayModeBar: false
        };
        
        this.performanceChart = Plotly.newPlot(this.performanceContainer, data, layout, config);
    }
    
    /**
     * Update the S-Curve chart with new data
     * @param {Array<number>} periods - Array of period numbers
     * @param {Array<number>} pvValues - Array of cumulative PV values
     * @param {Array<number>} evValues - Array of cumulative EV values
     * @param {number} milestoneDuration - Duration to milestone (for vertical line)
     * @param {number|null} forecastDate - Forecasted completion date/period
     */
    updateSCurveChart(periods, pvValues, evValues, milestoneDuration = null, forecastDate = null) {
        // Create updated data arrays
        const xPeriods = [0].concat(periods);
        const yPV = [0].concat(pvValues);
        const yEV = [0].concat(evValues);
        
        // Update chart data
        const update = {
            'x': [xPeriods, xPeriods],
            'y': [yPV, yEV]
        };
        
        Plotly.update(this.sCurveContainer, update, {}, [0, 1]);
        
        // Add milestone marker if provided
        if (milestoneDuration !== null) {
            // Create shape for milestone line
            const shapes = [{
                type: 'line',
                x0: milestoneDuration,
                y0: 0,
                x1: milestoneDuration,
                y1: Math.max(...pvValues, ...evValues) * 1.1,
                line: {
                    color: 'red',
                    width: 2,
                    dash: 'dot'
                }
            }];
            
            // Add forecast line if available
            if (forecastDate !== null && !isNaN(forecastDate) && forecastDate !== Infinity) {
                shapes.push({
                    type: 'line',
                    x0: forecastDate,
                    y0: 0,
                    x1: forecastDate,
                    y1: Math.max(...pvValues, ...evValues) * 1.1,
                    line: {
                        color: 'orange',
                        width: 2,
                        dash: 'dot'
                    }
                });
                
                // Add annotation for the forecast
                Plotly.relayout(this.sCurveContainer, {
                    shapes: shapes,
                    annotations: [{
                        x: milestoneDuration,
                        y: Math.max(...pvValues, ...evValues) * 1.05,
                        text: 'Milestone',
                        showarrow: true,
                        arrowhead: 5,
                        ax: 0,
                        ay: -40
                    }, {
                        x: forecastDate,
                        y: Math.max(...pvValues, ...evValues) * 1.05,
                        text: 'Forecast',
                        showarrow: true,
                        arrowhead: 5,
                        ax: 0,
                        ay: -40
                    }]
                });
            } else {
                // Just the milestone annotation
                Plotly.relayout(this.sCurveContainer, {
                    shapes: shapes,
                    annotations: [{
                        x: milestoneDuration,
                        y: Math.max(...pvValues, ...evValues) * 1.05,
                        text: 'Milestone',
                        showarrow: true,
                        arrowhead: 5,
                        ax: 0,
                        ay: -40
                    }]
                });
            }
        }
    }
    
    /**
     * Update the Performance Indices chart with new data
     * @param {Array<number>} periods - Array of period numbers
     * @param {Array<number>} spiValues - Array of SPI(t) values
     * @param {Array<number>} svValues - Array of SV(t) values
     * @param {number|null} tspiM - To-Complete SPI for milestone (horizontal line)
     */
    updatePerformanceChart(periods, spiValues, svValues, tspiM = null) {
        // Create updated data arrays
        const xPeriods = [0].concat(periods);
        const ySPI = [1].concat(spiValues);
        const ySV = [0].concat(svValues);
        
        // Update chart data
        const update = {
            'x': [xPeriods, xPeriods],
            'y': [ySPI, ySV]
        };
        
        Plotly.update(this.performanceContainer, update, {}, [0, 1]);
        
        // Add TSPI_M line if provided
        if (tspiM !== null && !isNaN(tspiM) && tspiM !== Infinity) {
            // Create TSPI_M line data
            const tspiLine = {
                x: [0, Math.max(...periods) * 1.5],
                y: [tspiM, tspiM],
                type: 'scatter',
                mode: 'lines',
                name: 'Required TSPI_M',
                line: {
                    color: '#dc3545',
                    width: 2,
                    dash: 'dash'
                }
            };
            
            // Add TSPI_M line to chart
            Plotly.addTraces(this.performanceContainer, tspiLine);
            
            // Add annotation for TSPI_M
            Plotly.relayout(this.performanceContainer, {
                annotations: [{
                    x: Math.max(...periods) * 0.9,
                    y: tspiM,
                    text: `TSPI_M = ${tspiM.toFixed(2)}`,
                    showarrow: true,
                    arrowhead: 2,
                    ax: -40,
                    ay: -20
                }]
            });
        }
    }
}

// Create a global instance of the charts handler
const esCharts = new ESCharts();
