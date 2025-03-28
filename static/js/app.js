/**
 * Main application script for the Earned Schedule Re-Plan Simulation
 */
document.addEventListener('DOMContentLoaded', function() {
    // Initialize charts
    esCharts.initCharts();
    
    // DOM elements
    const progressTableBody = document.getElementById('progress-table-body');
    const btnAddPeriod = document.getElementById('btn-add-period');
    const btnReset = document.getElementById('btn-reset');
    const btnSimulate = document.getElementById('btn-simulate');
    const milestoneDurationInput = document.getElementById('milestone-duration');
    const currentPeriodInput = document.getElementById('current-period');
    const simulationStepsInput = document.getElementById('simulation-steps');
    const scenarioSelect = document.getElementById('scenario-select');
    const replanCheckbox = document.getElementById('replan-checkbox');
    
    // Initialize app state
    const appState = {
        periodCount: 0,
        pvValues: [],
        evValues: []
    };
    
    /**
     * Add a new period row to the progress table
     * @param {number} period - Period number
     * @param {number} pv - Planned value for the period (default 0)
     * @param {number} ev - Earned value for the period (default 0)
     */
    function addPeriodRow(period, pv = 0, ev = 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${period}</td>
            <td><input type="number" class="pv-input" data-period="${period}" value="${pv}" min="0" step="0.1"></td>
            <td><input type="number" class="ev-input" data-period="${period}" value="${ev}" min="0" step="0.1"></td>
        `;
        progressTableBody.appendChild(row);
        
        // Add event listeners to inputs
        const pvInput = row.querySelector('.pv-input');
        const evInput = row.querySelector('.ev-input');
        
        pvInput.addEventListener('change', function() {
            updatePVValue(period, parseFloat(this.value));
        });
        
        evInput.addEventListener('change', function() {
            updateEVValue(period, parseFloat(this.value));
        });
        
        // Update app state
        appState.periodCount = Math.max(appState.periodCount, period + 1);
        
        if (appState.pvValues.length <= period) {
            appState.pvValues[period] = pv;
        } else {
            appState.pvValues[period] = pv;
        }
        
        if (appState.evValues.length <= period) {
            appState.evValues[period] = ev;
        } else {
            appState.evValues[period] = ev;
        }
    }
    
    /**
     * Update a PV value in the app state
     * @param {number} period - Period index
     * @param {number} value - New PV value
     */
    function updatePVValue(period, value) {
        appState.pvValues[period] = value;
        calculateAndUpdateMetrics();
    }
    
    /**
     * Update an EV value in the app state
     * @param {number} period - Period index
     * @param {number} value - New EV value
     */
    function updateEVValue(period, value) {
        appState.evValues[period] = value;
        calculateAndUpdateMetrics();
    }
    
    /**
     * Calculate metrics and update displays
     */
    function calculateAndUpdateMetrics() {
        const currentPeriod = parseInt(currentPeriodInput.value, 10);
        const milestoneDuration = parseInt(milestoneDurationInput.value, 10);
        const replanEnabled = replanCheckbox.checked;
        const replanTime = replanEnabled ? currentPeriod : null;
        
        // Ensure current period doesn't exceed available data
        if (currentPeriod >= appState.periodCount) {
            currentPeriodInput.value = appState.periodCount - 1;
            return;
        }
        
        // Calculate cumulative PV and EV up to current period
        const pvValues = appState.pvValues.slice(0, currentPeriod + 1);
        const evValues = appState.evValues.slice(0, currentPeriod + 1);
        
        // Calculate metrics using the ES calculator
        const metrics = esCalculator.calculateMetrics(
            pvValues,
            evValues,
            currentPeriod,
            milestoneDuration,
            replanTime
        );
        
        // Update metric displays
        document.getElementById('es-value').textContent = metrics.ES;
        document.getElementById('spi-t-value').textContent = metrics.SPI_t;
        document.getElementById('sv-t-value').textContent = metrics.SV_t;
        
        if (metrics.TSPI_M) {
            document.getElementById('tspi-m-value').textContent = metrics.TSPI_M;
        } else {
            document.getElementById('tspi-m-value').textContent = '-';
        }
        
        if (metrics.IEAC_t_M) {
            document.getElementById('ieac-t-m-value').textContent = metrics.IEAC_t_M;
        } else {
            document.getElementById('ieac-t-m-value').textContent = '-';
        }
        
        if (metrics.F_SV_t) {
            document.getElementById('f-sv-t-value').textContent = metrics.F_SV_t;
        } else {
            document.getElementById('f-sv-t-value').textContent = '-';
        }
        
        // Add styling based on values
        const spiElement = document.getElementById('spi-t-value');
        if (parseFloat(metrics.SPI_t) >= 1.0) {
            spiElement.classList.add('positive');
            spiElement.classList.remove('negative');
        } else {
            spiElement.classList.add('negative');
            spiElement.classList.remove('positive');
        }
        
        const svElement = document.getElementById('sv-t-value');
        if (parseFloat(metrics.SV_t) >= 0) {
            svElement.classList.add('positive');
            svElement.classList.remove('negative');
        } else {
            svElement.classList.add('negative');
            svElement.classList.remove('positive');
        }
        
        // Update charts
        const periods = Array.from({length: currentPeriod + 1}, (_, i) => i);
        esCharts.updateSCurveChart(
            periods,
            pvValues,
            evValues,
            milestoneDuration,
            metrics.IEAC_t_M ? parseFloat(metrics.IEAC_t_M) : null
        );
        
        // Generate AI Analysis
        generateSimpleAnalysis(metrics, currentPeriod, milestoneDuration);
    }
    
    /**
     * Generate a simple AI analysis based on current metrics
     * @param {Object} metrics - Current metrics
     * @param {number} currentPeriod - Current period
     * @param {number} milestoneDuration - Milestone duration
     */
    function generateSimpleAnalysis(metrics, currentPeriod, milestoneDuration) {
        const aiAnalysis = document.getElementById('ai-analysis');
        let analysisText = '<p>';
        
        const spiT = parseFloat(metrics.SPI_t);
        const svT = parseFloat(metrics.SV_t);
        
        // Current status analysis
        if (spiT < 0.9) {
            analysisText += `The project is significantly behind schedule with an SPI(t) of ${spiT.toFixed(2)}. `;
        } else if (spiT < 1.0) {
            analysisText += `The project is slightly behind schedule with an SPI(t) of ${spiT.toFixed(2)}. `;
        } else {
            analysisText += `The project is on or ahead of schedule with an SPI(t) of ${spiT.toFixed(2)}. `;
        }
        
        analysisText += `This translates to a schedule variance of ${svT.toFixed(2)} periods.</p>`;
        
        // Milestone forecast analysis
        if (metrics.F_SV_t && metrics.IEAC_t_M && metrics.TSPI_M) {
            const fSvT = parseFloat(metrics.F_SV_t);
            const ieacTM = parseFloat(metrics.IEAC_t_M);
            const tspiM = parseFloat(metrics.TSPI_M);
            
            analysisText += `<p>At the current rate of progress [SPI(t) = ${spiT.toFixed(2)}], `;
            
            if (fSvT < 0) {
                analysisText += `the milestone is forecasted to be completed at period ${ieacTM.toFixed(1)}, `;
                analysisText += `which is ${Math.abs(fSvT).toFixed(1)} periods behind the planned date (period ${milestoneDuration}).</p>`;
            } else {
                analysisText += `the milestone is forecasted to be completed at period ${ieacTM.toFixed(1)}, `;
                analysisText += `which is ${fSvT.toFixed(1)} periods ahead of the planned date (period ${milestoneDuration}).</p>`;
            }
            
            // TSPI analysis
            analysisText += `<p>To complete the milestone on time, a To-Complete Schedule Performance Index (TSPI<sub>M</sub>) `;
            analysisText += `of ${tspiM.toFixed(2)} is required. `;
            
            if (tspiM > 1.1) {
                analysisText += `This means performance must improve significantly (${((tspiM - 1) * 100).toFixed(0)}% faster) `;
                analysisText += `compared to the plan for the remaining work.</p>`;
            } else if (tspiM > 1.0) {
                analysisText += `This means performance must improve slightly (${((tspiM - 1) * 100).toFixed(0)}% faster) `;
                analysisText += `compared to the plan for the remaining work.</p>`;
            } else {
                analysisText += `Current performance is sufficient to meet or beat the milestone date.</p>`;
            }
        } else {
            analysisText += `<p>Please set a milestone duration to see forecast metrics.</p>`;
        }
        
        aiAnalysis.innerHTML = analysisText;
    }
    
    /**
     * Reset the application to initial state
     */
    function resetApp() {
        // Clear table
        progressTableBody.innerHTML = '';
        
        // Reset app state
        appState.periodCount = 0;
        appState.pvValues = [];
        appState.evValues = [];
        
        // Reset inputs to defaults
        milestoneDurationInput.value = 10;
        currentPeriodInput.value = 3;
        simulationStepsInput.value = 5;
        scenarioSelect.value = 'recovery';
        replanCheckbox.checked = false;
        
        // Add initial periods
        addDefaultData();
        
        // Hide simulation panel
        document.getElementById('simulation-panel').style.display = 'none';
        
        // Reset AI analysis
        document.getElementById('ai-analysis').innerHTML = `
            <p>Welcome to the Earned Schedule Re-Plan Simulation. Enter your project data or use the simulation 
            to see real-time earned schedule metrics and forecasts.</p>
        `;
        
        // Reset metric values
        document.getElementById('es-value').textContent = '-';
        document.getElementById('spi-t-value').textContent = '-';
        document.getElementById('sv-t-value').textContent = '-';
        document.getElementById('tspi-m-value').textContent = '-';
        document.getElementById('ieac-t-m-value').textContent = '-';
        document.getElementById('f-sv-t-value').textContent = '-';
        
        // Initialize charts
        esCharts.initCharts();
    }
    
    /**
     * Start a simulation with current data
     */
    function startSimulation() {
        const currentPeriod = parseInt(currentPeriodInput.value, 10);
        const milestoneDuration = parseInt(milestoneDurationInput.value, 10);
        const simulationSteps = parseInt(simulationStepsInput.value, 10);
        const scenario = scenarioSelect.value;
        const replanEnabled = replanCheckbox.checked;
        
        // Ensure we have enough data
        if (currentPeriod >= appState.periodCount) {
            alert('Invalid current period. Please ensure you have enough data.');
            return;
        }
        
        // Get PV and EV values up to current period
        const pvValues = appState.pvValues.slice(0, currentPeriod + 1);
        const evValues = appState.evValues.slice(0, currentPeriod + 1);
        
        // Initialize simulation
        esSimulation.initSimulation(
            pvValues,
            evValues,
            currentPeriod,
            milestoneDuration,
            simulationSteps,
            scenario,
            replanEnabled
        );
    }
    
    /**
     * Add default data for demonstration
     */
    function addDefaultData() {
        // Example project data with slight underperformance
        const defaultPV = [10, 25, 45, 70, 100];
        const defaultEV = [8, 20, 38, 60, 85];
        
        // Add rows for each period
        for (let i = 0; i < defaultPV.length; i++) {
            addPeriodRow(i, defaultPV[i], i <= 3 ? defaultEV[i] : 0);
        }
        
        // Set current period to 3 (index)
        currentPeriodInput.value = 3;
        
        // Calculate initial metrics
        calculateAndUpdateMetrics();
    }
    
    // Add event listeners
    btnAddPeriod.addEventListener('click', function() {
        const newPeriod = appState.periodCount;
        const previousPV = newPeriod > 0 ? appState.pvValues[newPeriod - 1] : 0;
        const suggestedPV = previousPV + (newPeriod > 1 ? 
            (appState.pvValues[newPeriod - 1] - appState.pvValues[newPeriod - 2]) : 10);
        
        addPeriodRow(newPeriod, Math.round(suggestedPV * 10) / 10, 0);
        calculateAndUpdateMetrics();
    });
    
    btnReset.addEventListener('click', resetApp);
    btnSimulate.addEventListener('click', startSimulation);
    
    // Add event listeners for settings inputs
    currentPeriodInput.addEventListener('change', calculateAndUpdateMetrics);
    milestoneDurationInput.addEventListener('change', calculateAndUpdateMetrics);
    replanCheckbox.addEventListener('change', calculateAndUpdateMetrics);
    
    // Initialize app with default data
    addDefaultData();
});
