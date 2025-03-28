/**
 * Client-side Earned Schedule calculator
 * Implements ES formulas for immediate calculations without server requests
 */
class ESCalculator {
    /**
     * Calculate Earned Schedule (ES) using interpolation
     * @param {number} evCum - Cumulative Earned Value at current time
     * @param {Array<number>} pvCum - List of cumulative Planned Values for each period
     * @returns {number} Earned Schedule value
     */
    calculateEarnedSchedule(evCum, pvCum) {
        // Find the last period index C where PV_cum[C] <= EV_cum
        let C = null;
        for (let i = 0; i < pvCum.length; i++) {
            if (pvCum[i] > evCum) {
                C = i - 1;
                break;
            } else if (i === pvCum.length - 1) { // Handle case where EV >= last PV
                C = i;
            }
        }
        
        // If EV is less than the first period's PV
        if (C === null || C < 0) {
            return 0;
        }
            
        // If EV is exactly at a planned point or at the last point
        if (C === pvCum.length - 1 || Math.abs(pvCum[C] - evCum) < 1e-9) {
            return C + 1; // +1 because periods typically start at 1, not 0
        }
        
        // Calculate fractional part using interpolation
        const PV_C = pvCum[C];
        const PV_next = pvCum[C + 1];
        
        // Avoid division by zero
        let I = 0;
        if (Math.abs(PV_next - PV_C) > 1e-9) {
            I = (evCum - PV_C) / (PV_next - PV_C);
        }
        
        // ES = C + I (with period adjustment)
        return (C + 1) + I; // +1 because periods typically start at 1, not 0
    }
    
    /**
     * Calculate all ES metrics based on input data
     * @param {Array<number>} pvValues - List of cumulative PV values
     * @param {Array<number>} evValues - List of cumulative EV values
     * @param {number} actualTime - Current time period (AT)
     * @param {number} milestoneDuration - Planned duration to milestone (MD)
     * @param {number|null} replanTime - Time at which re-planning occurred
     * @returns {Object} Dictionary containing all calculated metrics
     */
    calculateMetrics(pvValues, evValues, actualTime, milestoneDuration = null, replanTime = null) {
        // Calculate Earned Schedule
        const ES = this.calculateEarnedSchedule(evValues[evValues.length - 1], pvValues);
        
        // Calculate schedule performance indices
        const SV_t = ES - actualTime; // Schedule Variance (time)
        
        // Avoid division by zero
        let SPI_t = 1.0;
        if (actualTime > 0) {
            SPI_t = ES / actualTime; // Schedule Performance Index (time)
        }
        
        // Initialize results object
        const results = {
            ES: ES.toFixed(2),
            SV_t: SV_t.toFixed(2),
            SPI_t: SPI_t.toFixed(2)
        };
        
        // Calculate milestone metrics if milestoneDuration is provided
        if (milestoneDuration !== null) {
            // Forecast milestone completion (IEAC(t)_M)
            let IEAC_t_M = Number.POSITIVE_INFINITY;
            if (SPI_t > 0) {
                IEAC_t_M = milestoneDuration / SPI_t;
            }
            
            // Forecast Schedule Variance to milestone (F-SV(t))
            const F_SV_t = milestoneDuration - IEAC_t_M;
            
            // To-Complete Schedule Performance Index for milestone (TSPI_M)
            let TSPI_M = Number.POSITIVE_INFINITY;
            if (milestoneDuration !== actualTime) {
                TSPI_M = (milestoneDuration - ES) / (milestoneDuration - actualTime);
            }
            
            // Add milestone metrics to results
            results.IEAC_t_M = IEAC_t_M.toFixed(2);
            results.F_SV_t = F_SV_t.toFixed(2);
            results.TSPI_M = TSPI_M.toFixed(2);
        }
        
        // Handle re-plan scenarios
        if (replanTime !== null) {
            // Calculate pre-replan duration
            const D_pre = replanTime;
            
            // Calculate remaining planned duration after replan
            const PD_rem = pvValues.length - replanTime;
            
            // Calculate SPI(t) for remaining work after replan
            let SPI_t_rem = SPI_t;
            if (actualTime > replanTime) {
                // Extract post-replan PV and EV values
                const postReplanPV = pvValues.slice(replanTime);
                const postReplanEV = evValues.slice(replanTime);
                const postReplanAT = actualTime - replanTime;
                
                if (postReplanAT > 0 && postReplanEV.length > 0) {
                    const ES_rem = this.calculateEarnedSchedule(postReplanEV[postReplanEV.length - 1], postReplanPV);
                    SPI_t_rem = ES_rem / postReplanAT;
                }
            }
            
            // Calculate IEAC(t) for the re-plan scenario
            let IEAC_t_RP = Number.POSITIVE_INFINITY;
            if (SPI_t_rem > 0) {
                IEAC_t_RP = D_pre + (PD_rem / SPI_t_rem);
            }
            
            // Add re-plan metrics to results
            results.D_pre = D_pre.toFixed(2);
            results.PD_rem = PD_rem.toFixed(2);
            results.SPI_t_rem = SPI_t_rem.toFixed(2);
            results.IEAC_t_RP = IEAC_t_RP.toFixed(2);
        }
        
        return results;
    }
}

// Create a global instance of the calculator
const esCalculator = new ESCalculator();
