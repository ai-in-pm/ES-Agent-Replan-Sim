# Earned Schedule Re-Plan Simulation

A web-based AI agent for Earned Schedule (ES) re-plan simulation that provides real-time calculation and visualization of key ES metrics such as F-SV(t) and TSPI<sub>M</sub>.

The development of this repository was inspired by the Earned Schedule Community in their development of Earned Schedule tools. To learn more visit https://www.earnedschedule.com/Calculator.shtml


https://github.com/user-attachments/assets/82db3630-aa57-4ae3-a77f-846128bd16c1


![ES-Replan interface](https://github.com/user-attachments/assets/8a69f10d-025f-4d1a-bced-96c1775ffdd2)

## Features

- Interactive data entry for project tasks, progress, and milestones
- Real-time calculation of ES metrics (ES, SPI(t), SV(t), F-SV(t), TSPI<sub>M</sub>)
- Visualization through dynamic charts (S-curves, performance indices)
- Simulation capabilities with AI-guided assistance
- Re-plan scenario support to assess schedule recovery options

## Setup and Installation

1. Clone the repository
2. Create a virtual environment: `python -m venv venv`
3. Activate the virtual environment:
   - Windows: `.\venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Run the application: `python app.py`

## Technology Stack

- Backend: Flask (Python)
- Frontend: HTML, CSS, JavaScript with Plotly for visualizations
- Data processing: NumPy, Pandas

## Project Structure

- `/app.py` - Main application file
- `/static/` - Static assets (CSS, JS, images)
- `/templates/` - HTML templates
- `/models/` - ES calculation engine
- `/routes/` - API routes
