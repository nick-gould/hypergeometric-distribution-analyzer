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
        count_pct = (float(count) / float(populationSize) * 100)
        rv = hypergeom(populationSize, int(count), int(draw))
        p0 = float(rv.pmf(0)) * 100
        p1 = float(rv.pmf(1)) * 100
        p2 = float(rv.pmf(2)) * 100
        p3 = float(rv.pmf(3)) * 100
        p1plus = (1.0 - float(rv.pmf(0))) * 100
        p1to2 = (float(rv.pmf(1)) + float(rv.pmf(2))) * 100
        p2plus = (1.0 - float(rv.pmf(0)) - float(rv.pmf(1))) * 100
        rows.append([name, int(count), f"{count_pct:.1f}", int(draw),
                     f"{p0:.1f}", f"{p1:.1f}", f"{p2:.1f}", f"{p3:.1f}",
                     f"{p1plus:.1f}", f"{p1to2:.1f}", f"{p2plus:.1f}"])

    cols = ['Scenario', 'Count', 'Count %', 'Draw', '0', '1', '2', '3', '1+', '1-2', '2+']
    result = {'columns': cols, 'rows': rows}
    return json.dumps(result)
