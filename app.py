from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Import ES calculation engine
from models.es_calculator import ESCalculator

# Create an instance of the calculator
calculator = ESCalculator()

@app.route('/')
def index():
    """Render the main application page"""
    return render_template('index.html')

@app.route('/api/calculate', methods=['POST'])
def calculate():
    """API endpoint to calculate ES metrics based on input data"""
    try:
        data = request.json
        
        # Extract data from request
        pv_values = data.get('pv_values', [])
        ev_values = data.get('ev_values', [])
        actual_time = data.get('actual_time', 0)
        milestone_duration = data.get('milestone_duration', 0)
        replan_time = data.get('replan_time', None)
        
        # Calculate ES metrics
        results = calculator.calculate_metrics(
            pv_values=pv_values,
            ev_values=ev_values,
            actual_time=actual_time,
            milestone_duration=milestone_duration,
            replan_time=replan_time
        )
        
        return jsonify({
            'success': True,
            'data': results
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/simulate', methods=['POST'])
def simulate():
    """API endpoint to run a simulation with the AI agent"""
    try:
        data = request.json
        
        # Extract simulation parameters
        initial_pv = data.get('initial_pv', [])
        initial_ev = data.get('initial_ev', [])
        initial_at = data.get('initial_at', 0)
        milestone_duration = data.get('milestone_duration', 0)
        simulation_steps = data.get('simulation_steps', 5)
        scenario = data.get('scenario', 'recovery')  # Options: recovery, slippage, maintain
        
        # Run simulation
        simulation_results = calculator.run_simulation(
            initial_pv=initial_pv,
            initial_ev=initial_ev,
            initial_at=initial_at,
            milestone_duration=milestone_duration,
            simulation_steps=simulation_steps,
            scenario=scenario
        )
        
        return jsonify({
            'success': True,
            'data': simulation_results
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV', 'development') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
