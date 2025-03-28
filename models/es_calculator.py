import numpy as np
import pandas as pd

class ESCalculator:
    """Earned Schedule calculator class that implements ES formulas and algorithms"""
    
    def __init__(self):
        """Initialize the calculator"""
        pass
    
    def calculate_earned_schedule(self, ev_cum, pv_cum):
        """
        Calculate Earned Schedule (ES) using interpolation.
        
        Args:
            ev_cum (float): Cumulative Earned Value at current time
            pv_cum (list): List of cumulative Planned Values for each period
            
        Returns:
            float: Earned Schedule value
        """
        # Find the last period index C where PV_cum[C] <= EV_cum
        C = None
        for i in range(len(pv_cum)):
            if pv_cum[i] > ev_cum:
                C = i - 1
                break
            elif i == len(pv_cum) - 1:  # Handle case where EV >= last PV
                C = i
        
        # If EV is less than the first period's PV
        if C is None or C < 0:
            return 0
            
        # If EV is exactly at a planned point or at the last point
        if C == len(pv_cum) - 1 or abs(pv_cum[C] - ev_cum) < 1e-9:
            return C + 1  # +1 because periods typically start at 1, not 0
        
        # Calculate fractional part using interpolation
        PV_C = pv_cum[C]
        PV_next = pv_cum[C + 1]
        
        # Avoid division by zero
        if PV_next - PV_C < 1e-9:
            I = 0
        else:
            I = (ev_cum - PV_C) / (PV_next - PV_C)
        
        # ES = C + I (with period adjustment)
        return (C + 1) + I  # +1 because periods typically start at 1, not 0
    
    def calculate_metrics(self, pv_values, ev_values, actual_time, milestone_duration=None, replan_time=None):
        """
        Calculate all ES metrics based on input data.
        
        Args:
            pv_values (list): List of cumulative PV values
            ev_values (list): List of cumulative EV values
            actual_time (int): Current time period (AT)
            milestone_duration (float, optional): Planned duration to milestone (MD)
            replan_time (int, optional): Time at which re-planning occurred
            
        Returns:
            dict: Dictionary containing all calculated metrics
        """
        # Convert inputs to numpy arrays
        pv_cum = np.array(pv_values, dtype=float)
        ev_cum = np.array(ev_values, dtype=float)
        
        # Calculate Earned Schedule
        ES = self.calculate_earned_schedule(ev_cum[-1], pv_cum)
        
        # Calculate schedule performance indices
        SV_t = ES - actual_time  # Schedule Variance (time)
        
        # Avoid division by zero
        if actual_time == 0:
            SPI_t = 1.0
        else:
            SPI_t = ES / actual_time  # Schedule Performance Index (time)
        
        # Initialize results dictionary
        results = {
            'ES': ES,
            'SV_t': SV_t,
            'SPI_t': SPI_t
        }
        
        # Calculate milestone metrics if milestone_duration is provided
        if milestone_duration is not None:
            # Forecast milestone completion (IEAC(t)_M)
            if SPI_t > 0:
                IEAC_t_M = milestone_duration / SPI_t
            else:
                IEAC_t_M = float('inf')  # If SPI_t is zero, forecast is infinite
            
            # Forecast Schedule Variance to milestone (F-SV(t))
            F_SV_t = milestone_duration - IEAC_t_M
            
            # To-Complete Schedule Performance Index for milestone (TSPI_M)
            if milestone_duration == actual_time:
                TSPI_M = float('inf')  # Milestone due now, no time left
            else:
                TSPI_M = (milestone_duration - ES) / (milestone_duration - actual_time)
            
            # Add milestone metrics to results
            results.update({
                'IEAC_t_M': IEAC_t_M,
                'F_SV_t': F_SV_t,
                'TSPI_M': TSPI_M
            })
        
        # Handle re-plan scenarios
        if replan_time is not None:
            # Calculate pre-replan duration
            D_pre = replan_time
            
            # Calculate remaining planned duration after replan
            PD_rem = len(pv_cum) - replan_time
            
            # Calculate SPI(t) for remaining work after replan
            if actual_time <= replan_time:
                SPI_t_rem = SPI_t  # No post-replan data yet
            else:
                # Calculate ES for the remaining portion
                post_replan_ev = ev_cum[replan_time:]
                post_replan_pv = pv_cum[replan_time:]
                post_replan_at = actual_time - replan_time
                
                if post_replan_at > 0:
                    ES_rem = self.calculate_earned_schedule(post_replan_ev[-1], post_replan_pv)
                    SPI_t_rem = ES_rem / post_replan_at
                else:
                    SPI_t_rem = 1.0
            
            # Calculate IEAC(t) for the re-plan scenario
            if SPI_t_rem > 0:
                IEAC_t_RP = D_pre + (PD_rem / SPI_t_rem)
            else:
                IEAC_t_RP = float('inf')
            
            # Add re-plan metrics to results
            results.update({
                'D_pre': D_pre,
                'PD_rem': PD_rem,
                'SPI_t_rem': SPI_t_rem,
                'IEAC_t_RP': IEAC_t_RP
            })
        
        return results
    
    def run_simulation(self, initial_pv, initial_ev, initial_at, milestone_duration, simulation_steps=5, scenario='recovery'):
        """
        Run a simulation to forecast future project performance.
        
        Args:
            initial_pv (list): Initial planned value curve
            initial_ev (list): Initial earned value curve
            initial_at (int): Current actual time
            milestone_duration (float): Planned duration to milestone
            simulation_steps (int): Number of steps to simulate
            scenario (str): Simulation scenario (recovery, slippage, maintain)
            
        Returns:
            dict: Simulation results with metrics at each step
        """
        # Initialize arrays for simulation
        pv_values = np.array(initial_pv, dtype=float)
        ev_values = np.array(initial_ev, dtype=float)
        
        # Extend arrays if needed for simulation steps
        if len(pv_values) < initial_at + simulation_steps:
            # Extend PV assuming linear growth for remaining periods
            if len(pv_values) > 1:
                avg_increment = (pv_values[-1] - pv_values[0]) / (len(pv_values) - 1)
                extension = [pv_values[-1] + avg_increment * (i+1) for i in range(simulation_steps)]
                pv_values = np.append(pv_values, extension)
            else:
                # If only one PV value, assume constant increment
                extension = [pv_values[-1] * (1 + 0.1 * (i+1)) for i in range(simulation_steps)]
                pv_values = np.append(pv_values, extension)
        
        # Initialize results container
        simulation_results = {
            'periods': list(range(initial_at + 1, initial_at + simulation_steps + 1)),
            'pv_values': [],
            'ev_values': [],
            'metrics': []
        }
        
        # Current EV at initial time
        current_ev = ev_values[-1] if len(ev_values) > 0 else 0
        
        # Calculate initial metrics
        initial_metrics = self.calculate_metrics(
            pv_values=pv_values[:initial_at + 1].tolist(),
            ev_values=np.append(ev_values, current_ev).tolist(),
            actual_time=initial_at,
            milestone_duration=milestone_duration
        )
        
        # Initial SPI(t)
        initial_spi_t = initial_metrics['SPI_t']
        
        # Simulate future periods
        for step in range(simulation_steps):
            current_period = initial_at + step + 1
            current_pv = pv_values[current_period] if current_period < len(pv_values) else pv_values[-1] * 1.1
            
            # Determine EV growth based on scenario
            if scenario == 'recovery':
                # Gradually improve performance
                target_spi_t = min(1.0, initial_spi_t + 0.05 * (step + 1))
                ev_increment = target_spi_t * (current_pv - pv_values[current_period - 1])
            elif scenario == 'slippage':
                # Gradually worsen performance
                target_spi_t = max(0.7, initial_spi_t - 0.03 * (step + 1))
                ev_increment = target_spi_t * (current_pv - pv_values[current_period - 1])
            else:  # maintain
                # Maintain current performance
                ev_increment = initial_spi_t * (current_pv - pv_values[current_period - 1])
            
            # Update current EV
            current_ev += ev_increment
            
            # Ensure EV doesn't exceed PV unrealistically
            current_ev = min(current_ev, current_pv * 1.1)
            
            # Add to simulation arrays
            ev_extended = np.append(ev_values, current_ev)
            
            # Calculate metrics for this period
            period_metrics = self.calculate_metrics(
                pv_values=pv_values[:current_period + 1].tolist(),
                ev_values=ev_extended.tolist(),
                actual_time=current_period,
                milestone_duration=milestone_duration
            )
            
            # Store results
            simulation_results['pv_values'].append(float(current_pv))
            simulation_results['ev_values'].append(float(current_ev))
            simulation_results['metrics'].append(period_metrics)
        
        return simulation_results
