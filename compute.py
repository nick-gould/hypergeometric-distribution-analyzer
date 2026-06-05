# compute.py
# Exposes compute_json(json_str) for app.js via pyodide.
import json
from scipy.stats import hypergeom
import pandas as pd

def compute_json(payload_json: str) -> str:
    data = json.loads(payload_json)
    populationSize = int(data.get('populationSize', 40))
    scenarios = data.get('scenarios', [])

    rows = []
    for name, count, draw in scenarios:
        rv = hypergeom(populationSize, int(count), int(draw))
        p0 = float(rv.pmf(0))
        p1 = float(rv.pmf(1))
        p2 = float(rv.pmf(2))
        p3 = float(rv.pmf(3))
        p1plus = 1.0 - p0
        p1to2 = p1 + p2
        p2plus = 1.0 - p0 - p1
        rows.append([name, int(count), int(draw),
                     f"{p0:.4f}", f"{p1:.4f}", f"{p2:.4f}", f"{p3:.4f}",
                     f"{p1plus:.4f}", f"{p1to2:.4f}", f"{p2plus:.4f}"])

    cols = ['Scenario', 'Count', 'Draw', '0', '1', '2', '3', '1+', '1-2', '2+']
    result = {'columns': cols, 'rows': rows}
    return json.dumps(result)
