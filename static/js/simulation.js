/**
 * Simulation module for the Earned Schedule calculator
 * Handles the AI agent simulation and step-by-step project progression
 */
class ESSimulation {
    constructor() {
        // Simulation state
        this.isRunning = false;
        this.currentStep = 0;
        this.maxSteps = 0;
        this.simulationInterval = null;
        this.scenario = 'recovery'; // Default scenario
        
        // Simulation data
        this.initialPV = [];
        this.initialEV = [];
        this.initialAT = 0;
        this.milestoneDuration = 10;
        this.replanEnabled = false;
        this.replanTime = null;
        
        // Current simulation state
        this.currentPV = [];
        this.currentEV = [];
        this.currentAT = 0;
        this.currentMetrics = {};
        
        // Simulation results storage
        this.simulationResults = {
            periods: [],
            pvValues: [],
            evValues: [],
            metrics: []
        };
        
        // DOM elements
        this.simPanel = document.getElementById('simulation-panel');
        this.simProgress = document.getElementById('sim-progress');
        this.simStatus = document.getElementById('sim-status');
        this.btnSimStep = document.getElementById('btn-sim-step');
        this.btnSimPlay = document.getElementById('btn-sim-play');
        this.btnSimStop = document.getElementById('btn-sim-stop');
        
        // AI analysis element
        this.aiAnalysis = document.getElementById('ai-analysis');
        
        // Bind event handlers
        this.bindEvents();
    }
    
    /**
     * Bind event handlers for simulation controls
     */
    bindEvents() {
        this.btnSimStep.addEventListener('click', () => this.runStep());
        this.btnSimPlay.addEventListener('click', () => this.startAutoPlay());
        this.btnSimStop.addEventListener('click', () => this.stopSimulation());
    }
    
    /**
     * Initialize a new simulation with provided parameters
     * @param {Array<number>} pvValues - Initial PV values
     * @param {Array<number>} evValues - Initial EV values
     * @param {number} actualTime - Current actual time
     * @param {number} milestoneDuration - Duration to milestone
     * @param {number} steps - Number of simulation steps
     * @param {string} scenario - Simulation scenario (recovery, slippage, maintain)
     * @param {boolean} replanEnabled - Whether re-planning is enabled
     */
    initSimulation(pvValues, evValues, actualTime, milestoneDuration, steps, scenario, replanEnabled) {
        // Store simulation parameters
        this.initialPV = [...pvValues];
        this.initialEV = [...evValues];
        this.initialAT = actualTime;
        this.milestoneDuration = milestoneDuration;
        this.maxSteps = steps;
        this.scenario = scenario;
        this.replanEnabled = replanEnabled;
        this.replanTime = replanEnabled ? actualTime : null;
        
        // Reset simulation state
        this.currentStep = 0;
        this.currentPV = [...pvValues];
        this.currentEV = [...evValues];
        this.currentAT = actualTime;
        
        // Reset simulation results
        this.simulationResults = {
            periods: [],
            pvValues: [],
            evValues: [],
            metrics: []
        };
        
        // Calculate initial metrics
        this.currentMetrics = esCalculator.calculateMetrics(
            this.currentPV,
            this.currentEV,
            this.currentAT,
            this.milestoneDuration,
            this.replanTime
        );
        
        // Show simulation panel
        this.simPanel.style.display = 'block';
        this.simStatus.textContent = `Simulation initialized. ${this.maxSteps} steps to run.`;
        this.simStatus.className = 'alert alert-info';
        this.simProgress.style.width = '0%';
        
        // Generate initial AI analysis
        this.generateAIAnalysis(true);
    }
    
    /**
     * Run a single simulation step
     */
    runStep() {
        if (this.currentStep >= this.maxSteps) {
            this.simStatus.textContent = 'Simulation complete!';
            this.simStatus.className = 'alert alert-success';
            return;
        }
        
        // Increment step counter
        this.currentStep++;
        
        // Update progress bar
        const progressPct = (this.currentStep / this.maxSteps) * 100;
        this.simProgress.style.width = `${progressPct}%`;
        
        // Calculate next period
        const nextPeriod = this.currentAT + 1;
        
        // Extend PV array if needed
        if (this.currentPV.length <= nextPeriod) {
            // Calculate average PV increment
            const avgIncrement = (this.currentPV[this.currentPV.length - 1] - this.currentPV[0]) / (this.currentPV.length - 1);
            this.currentPV.push(this.currentPV[this.currentPV.length - 1] + avgIncrement);
        }
        
        // Get next period's PV
        const currentPV = this.currentPV[nextPeriod];
        
        // Determine EV growth based on scenario
        let evIncrement;
        const lastEV = this.currentEV[this.currentEV.length - 1];
        const prevPV = this.currentPV[nextPeriod - 1];
        const pvIncrement = currentPV - prevPV;
        
        if (this.scenario === 'recovery') {
            // Gradually improve performance
            const currentSPIt = parseFloat(this.currentMetrics.SPI_t);
            const targetSPIt = Math.min(1.0, currentSPIt + 0.05);
            evIncrement = targetSPIt * pvIncrement;
        } else if (this.scenario === 'slippage') {
            // Gradually worsen performance
            const currentSPIt = parseFloat(this.currentMetrics.SPI_t);
            const targetSPIt = Math.max(0.7, currentSPIt - 0.03);
            evIncrement = targetSPIt * pvIncrement;
        } else { // maintain
            // Maintain current performance
            const currentSPIt = parseFloat(this.currentMetrics.SPI_t);
            evIncrement = currentSPIt * pvIncrement;
        }
        
        // Update EV for next period
        const nextEV = lastEV + evIncrement;
        this.currentEV.push(nextEV);
        
        // Update current AT
        this.currentAT = nextPeriod;
        
        // Calculate new metrics
        this.currentMetrics = esCalculator.calculateMetrics(
            this.currentPV,
            this.currentEV,
            this.currentAT,
            this.milestoneDuration,
            this.replanTime
        );
        
        // Store simulation results
        this.simulationResults.periods.push(nextPeriod);
        this.simulationResults.pvValues.push(currentPV);
        this.simulationResults.evValues.push(nextEV);
        this.simulationResults.metrics.push(this.currentMetrics);
        
        // Update status
        this.simStatus.textContent = `Step ${this.currentStep}/${this.maxSteps}: Period ${nextPeriod}`;
        
        // Update charts
        esCharts.updateSCurveChart(
            this.simulationResults.periods,
            this.simulationResults.pvValues,
            this.simulationResults.evValues,
            this.milestoneDuration,
            parseFloat(this.currentMetrics.IEAC_t_M)
        );
        
        // Extract SPI(t) and SV(t) values for performance chart
        const spiValues = this.simulationResults.metrics.map(m => parseFloat(m.SPI_t));
        const svValues = this.simulationResults.metrics.map(m => parseFloat(m.SV_t));
        
        esCharts.updatePerformanceChart(
            this.simulationResults.periods,
            spiValues,
            svValues,
            parseFloat(this.currentMetrics.TSPI_M)
        );
        
        // Update metrics display
        this.updateMetricsDisplay(this.currentMetrics);
        
        // Generate AI analysis
        this.generateAIAnalysis();
        
        // Check if simulation is complete
        if (this.currentStep >= this.maxSteps) {
            this.simStatus.textContent = 'Simulation complete!';
            this.simStatus.className = 'alert alert-success';
            
            if (this.simulationInterval) {
                clearInterval(this.simulationInterval);
                this.simulationInterval = null;
                this.isRunning = false;
            }
        }
    }
    
    /**
     * Start auto-playing the simulation
     */
    startAutoPlay() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.btnSimPlay.textContent = 'Pause';
        
        // Run a step immediately
        this.runStep();
        
        // Set up interval for automatic stepping
        this.simulationInterval = setInterval(() => {
            if (this.currentStep >= this.maxSteps) {
                clearInterval(this.simulationInterval);
                this.simulationInterval = null;
                this.isRunning = false;
                this.btnSimPlay.textContent = 'Play';
                return;
            }
            
            this.runStep();
        }, 2000); // 2 seconds between steps
    }
    
    /**
     * Stop or pause the simulation
     */
    stopSimulation() {
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
        }
        
        this.isRunning = false;
        this.btnSimPlay.textContent = 'Play';
        
        if (this.currentStep < this.maxSteps) {
            this.simStatus.textContent = `Simulation paused at step ${this.currentStep}/${this.maxSteps}.`;
            this.simStatus.className = 'alert alert-warning';
        }
    }
    
    /**
     * Update the metrics display with new values
     * @param {Object} metrics - The metrics to display
     */
    updateMetricsDisplay(metrics) {
        // Update metric values
        document.getElementById('es-value').textContent = metrics.ES;
        document.getElementById('spi-t-value').textContent = metrics.SPI_t;
        document.getElementById('sv-t-value').textContent = metrics.SV_t;
        
        if (metrics.TSPI_M) {
            document.getElementById('tspi-m-value').textContent = metrics.TSPI_M;
        }
        
        if (metrics.IEAC_t_M) {
            document.getElementById('ieac-t-m-value').textContent = metrics.IEAC_t_M;
        }
        
        if (metrics.F_SV_t) {
            document.getElementById('f-sv-t-value').textContent = metrics.F_SV_t;
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
        
        const fsvElement = document.getElementById('f-sv-t-value');
        if (metrics.F_SV_t && parseFloat(metrics.F_SV_t) >= 0) {
            fsvElement.classList.add('positive');
            fsvElement.classList.remove('negative');
        } else if (metrics.F_SV_t) {
            fsvElement.classList.add('negative');
            fsvElement.classList.remove('positive');
        }
        
        const tspiElement = document.getElementById('tspi-m-value');
        if (metrics.TSPI_M && parseFloat(metrics.TSPI_M) <= 1.0) {
            tspiElement.classList.add('positive');
            tspiElement.classList.remove('negative');
        } else if (metrics.TSPI_M) {
            tspiElement.classList.add('negative');
            tspiElement.classList.remove('positive');
        }
    }
    
    /**
     * Generate AI analysis based on current metrics
     * @param {boolean} isInitial - Whether this is the initial analysis
     */
    generateAIAnalysis(isInitial = false) {
        let analysisText = '';
        
        if (isInitial) {
            // Initial analysis based on starting conditions
            const spiT = parseFloat(this.currentMetrics.SPI_t);
            const svT = parseFloat(this.currentMetrics.SV_t);
            
            if (spiT < 0.9) {
                analysisText = `<p>Initial analysis shows the project is significantly behind schedule with an SPI(t) of ${spiT.toFixed(2)}. 
                This translates to a schedule variance of ${svT.toFixed(2)} periods.</p>
                <p>Based on the ${this.scenario} scenario, I'll simulate how the project might progress over the next ${this.maxSteps} periods.</p>`;
            } else if (spiT < 1.0) {
                analysisText = `<p>Initial analysis shows the project is slightly behind schedule with an SPI(t) of ${spiT.toFixed(2)}. 
                This translates to a schedule variance of ${svT.toFixed(2)} periods.</p>
                <p>Based on the ${this.scenario} scenario, I'll simulate how the project might progress over the next ${this.maxSteps} periods.</p>`;
            } else {
                analysisText = `<p>Initial analysis shows the project is on or ahead of schedule with an SPI(t) of ${spiT.toFixed(2)}. 
                This translates to a schedule variance of ${svT.toFixed(2)} periods.</p>
                <p>Based on the ${this.scenario} scenario, I'll simulate how the project might progress over the next ${this.maxSteps} periods.</p>`;
            }
            
            if (this.replanEnabled) {
                analysisText += `<p>Note: Re-planning is enabled at period ${this.replanTime}. Metrics will be calculated relative to the new baseline from this point forward.</p>`;
            }
        } else {
            // Ongoing analysis during simulation
            const spiT = parseFloat(this.currentMetrics.SPI_t);
            const svT = parseFloat(this.currentMetrics.SV_t);
            const fSvT = parseFloat(this.currentMetrics.F_SV_t);
            const tspiM = parseFloat(this.currentMetrics.TSPI_M);
            const ieacTM = parseFloat(this.currentMetrics.IEAC_t_M);
            
            // Analysis of current status
            let statusAnalysis = '';
            if (spiT < 0.9) {
                statusAnalysis = `The project is significantly behind schedule with an SPI(t) of ${spiT.toFixed(2)}.`;
            } else if (spiT < 1.0) {
                statusAnalysis = `The project is slightly behind schedule with an SPI(t) of ${spiT.toFixed(2)}.`;
            } else {
                statusAnalysis = `The project is on or ahead of schedule with an SPI(t) of ${spiT.toFixed(2)}.`;
            }
            
            // Analysis of milestone forecast
            let milestoneAnalysis = '';
            if (fSvT < -1) {
                milestoneAnalysis = `The milestone is forecasted to be significantly late by ${Math.abs(fSvT).toFixed(1)} periods.`;
            } else if (fSvT < 0) {
                milestoneAnalysis = `The milestone is forecasted to be slightly late by ${Math.abs(fSvT).toFixed(1)} periods.`;
            } else {
                milestoneAnalysis = `The milestone is forecasted to be completed on time or early by ${fSvT.toFixed(1)} periods.`;
            }
            
            // Analysis of required performance
            let tspiAnalysis = '';
            if (tspiM > 1.2) {
                tspiAnalysis = `To meet the milestone, performance needs to significantly improve to ${tspiM.toFixed(2)} times the planned rate, which may be challenging.`;
            } else if (tspiM > 1.0) {
                tspiAnalysis = `To meet the milestone, performance needs to improve to ${tspiM.toFixed(2)} times the planned rate.`;
            } else {
                tspiAnalysis = `Current performance is sufficient to meet the milestone, with a required TSPI<sub>M</sub> of ${tspiM.toFixed(2)}.`;
            }
            
            // Trend analysis
            let trendAnalysis = '';
            if (this.currentStep > 1) {
                const prevSpiT = parseFloat(this.simulationResults.metrics[this.currentStep - 2].SPI_t);
                if (spiT > prevSpiT) {
                    trendAnalysis = `Performance is improving (SPI(t) increased from ${prevSpiT.toFixed(2)} to ${spiT.toFixed(2)}).`;
                } else if (spiT < prevSpiT) {
                    trendAnalysis = `Performance is declining (SPI(t) decreased from ${prevSpiT.toFixed(2)} to ${spiT.toFixed(2)}).`;
                } else {
                    trendAnalysis = `Performance is stable at SPI(t) = ${spiT.toFixed(2)}.`;
                }
            }
            
            // Combine all analyses
            analysisText = `<p><strong>Period ${this.currentAT} Analysis:</strong></p>
                <p>${statusAnalysis} ${trendAnalysis}</p>
                <p>${milestoneAnalysis} ${tspiAnalysis}</p>
                <p>If current trends continue, the milestone will be reached at period ${ieacTM.toFixed(1)} 
                (planned at period ${this.milestoneDuration}).</p>`;
            
            // Add recommendation
            if (fSvT < 0 && tspiM > 1.0) {
                analysisText += `<p><strong>Recommendation:</strong> Consider implementing recovery measures to improve performance, 
                or re-plan the remaining work if the milestone date cannot be changed.</p>`;
            } else if (fSvT > 1 && tspiM < 0.9) {
                analysisText += `<p><strong>Recommendation:</strong> The project has significant schedule margin. 
                Consider reallocating resources if other parts of the project need assistance.</p>`;
            }
        }
        
        // Update the AI analysis element
        this.aiAnalysis.innerHTML = analysisText;
    }
}

// Create a global instance of the simulation handler
const esSimulation = new ESSimulation();
