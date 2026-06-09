// app.js (module)
const container = document.getElementById('scenarios-container');
const runBtn = document.getElementById('runBtn');
const resetBtn = document.getElementById('resetBtn');
const status = document.getElementById('status');
const output = document.getElementById('output');

const defaults = [
  ['Scenario 1',20,5],
  ['Scenario 2',16,5],
  ['Scenario 3',13,5],
  ['Scenario 4',10,5],
  ['Scenario 5',8,5],
  ['Scenario 6',5,5],
  ['Scenario 7',3,5],
  ['Scenario 8',1,5],
];

function saveState(){
  const state = gatherInputs();
  localStorage.setItem('hypergeom-state', JSON.stringify(state));
}

function loadState(){
  const saved = localStorage.getItem('hypergeom-state');
  if(!saved) return;
  try {
    const state = JSON.parse(saved);
    document.getElementById('populationSize').value = state.populationSize;
    state.scenarios.forEach((scenario, i) => {
      const idx = i + 1;
      document.getElementById(`name_${idx}`).value = scenario[0];
      document.getElementById(`count_${idx}`).value = scenario[1];
      document.getElementById(`countVal_${idx}`).textContent = scenario[1];
      document.getElementById(`draw_${idx}`).value = scenario[2];
      document.getElementById(`drawVal_${idx}`).textContent = scenario[2];
    });
  } catch(e) {
    console.error('Failed to load saved state:', e);
  }
}

function makeCard(i, name, count, draw){
  const card = document.createElement('div');
  card.className = 'scenario-card';

  const title = document.createElement('div');
  title.className = 'title';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = name;
  nameInput.id = `name_${i}`;
  nameInput.addEventListener('change', saveState);
  title.appendChild(nameInput);
  card.appendChild(title);

  const countRow = document.createElement('div');
  countRow.className = 'row';
  const countLabel = document.createElement('label');
  countLabel.textContent = 'Count';
  const countRange = document.createElement('input');
  countRange.type = 'range';
  countRange.min = 0; countRange.max = 40; countRange.value = count;
  countRange.id = `count_${i}`;
  const countVal = document.createElement('span');
  countVal.id = `countVal_${i}`; countVal.textContent = count;
  countRange.addEventListener('input', ()=> countVal.textContent = countRange.value);
  countRange.addEventListener('change', saveState);
  countRow.append(countLabel, countRange, countVal);
  card.appendChild(countRow);

  const drawRow = document.createElement('div');
  drawRow.className = 'row';
  const drawLabel = document.createElement('label');
  drawLabel.textContent = 'Draw';
  const drawRange = document.createElement('input');
  drawRange.type = 'range';
  drawRange.min = 0; drawRange.max = 40; drawRange.value = draw;
  drawRange.id = `draw_${i}`;
  const drawVal = document.createElement('span');
  drawVal.id = `drawVal_${i}`; drawVal.textContent = draw;
  drawRange.addEventListener('input', ()=> drawVal.textContent = drawRange.value);
  drawRange.addEventListener('change', saveState);
  drawRow.append(drawLabel, drawRange, drawVal);
  card.appendChild(drawRow);

  container.appendChild(card);
}

for (let i=0; i<8; i++){
  const [n,c,d] = defaults[i];
  makeCard(i+1, n, c, d);
}

loadState();
document.getElementById('populationSize').addEventListener('change', saveState);

let pyodide = null;

async function loadPyodideAndPackages(){
  status.textContent = 'Loading pyodide...';
  pyodide = await globalThis.loadPyodide({indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/"});
  status.textContent = 'Installing packages (pandas, scipy)...';
  await pyodide.loadPackage(['micropip']);
  const micropip = pyodide.pyimport('micropip');
  await micropip.install('pandas');
  await micropip.install('scipy');
  status.textContent = 'Ready.';
  const pyText = await (await fetch('compute.py')).text();
  await pyodide.runPythonAsync(pyText);
}

loadPyodideAndPackages().catch(e=>{
  status.textContent = 'Load error';
  console.error(e);
});

function gatherInputs(){
  const scenarios = [];
  const populationSize = parseInt(document.getElementById('populationSize').value)||40;
  for (let i=1;i<=8;i++){
    const name = document.getElementById(`name_${i}`).value || `Scenario ${i}`;
    const count = parseInt(document.getElementById(`count_${i}`).value)||0;
    const draw = parseInt(document.getElementById(`draw_${i}`).value)||0;
    scenarios.push([name, count, draw]);
  }
  return {populationSize, scenarios};
}

function renderPlotlyTable(columns, rows){
  const headerValues = columns;
  const cellValues = columns.map((_, colIdx) => rows.map(row=>row[colIdx]));
  const data = [{
    type: 'table',
    header: { values: headerValues, align: 'center', fill: {color: '#eee'} },
    cells: { values: cellValues, align: 'center' }
  }];
  Plotly.newPlot(output, data, {margin:{t:10,b:10}});
}

runBtn.addEventListener('click', async ()=>{
  if(!pyodide){ status.textContent = 'Still loading pyodide...'; return; }
  status.textContent = 'Running...';
  output.innerHTML = '';
  const payload = gatherInputs();
  try {
    const arg = JSON.stringify(payload);
    const resultJson = await pyodide.runPythonAsync(`compute_json(r'''${arg}''')`);
    const parsed = JSON.parse(resultJson);
    renderPlotlyTable(parsed.columns, parsed.rows);
    status.textContent = 'Done.';
  } catch (err) {
    status.textContent = 'Error: ' + (err.message || err);
    output.textContent = String(err);
  }
});

resetBtn.addEventListener('click', ()=>{
  for (let i=0;i<8;i++){
    const [n,c,d] = defaults[i];
    document.getElementById(`name_${i+1}`).value = n;
    document.getElementById(`count_${i+1}`).value = c;
    document.getElementById(`countVal_${i+1}`).textContent = c;
    document.getElementById(`draw_${i+1}`).value = d;
    document.getElementById(`drawVal_${i+1}`).textContent = d;
  }
  document.getElementById('populationSize').value = 40;
  output.innerHTML = '';
  localStorage.removeItem('hypergeom-state');
});
