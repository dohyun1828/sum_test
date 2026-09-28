const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const assert = require('node:assert/strict')

const evidence = path.resolve(process.argv[2] || 'evidence')
const fixturePath = path.resolve(process.argv[3] || path.join(__dirname, '../fixtures/tang-nano.json'))
const baseline = require(path.join(evidence, 'baseline-library.cjs'))
const patched = require(path.join(evidence, 'patched-library.cjs'))
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'))
const { input } = fixture
const expanded = baseline.applyCellMargin(input, 1)
const bounds = baseline.computeBoundsFromCellContents(expanded)
const pipelineParams = {
  cellContents: expanded.map(c => ({ cellId: c.cellId, x: c.minX - bounds.minX, y: c.minY - bounds.minY, width: c.maxX - c.minX, height: c.maxY - c.minY })),
  containerWidth: bounds.maxX - bounds.minX,
  containerHeight: bounds.maxY - bounds.minY,
  offsetX: bounds.minX,
  offsetY: bounds.minY,
}
const pipeline = new baseline.CellBoundariesPipeline(structuredClone(pipelineParams))
pipeline.solveUntilStage('repairBoundaryLinesSolver')
assert.equal(pipeline.failed, false)
assert.equal(pipeline.reduceBoundaryLinesSolver.solved, true)
const repairParams = {
  reducedLines: pipeline.reduceBoundaryLinesSolver.reducedLines,
  originalLines: pipeline.reduceBoundaryLinesSolver.mergedOriginalLines,
  cellContents: pipeline.inputProblem.cellContents,
}
const samples = Number(process.env.BENCHMARK_SAMPLES || 3)
assert.ok(Number.isInteger(samples) && samples >= 1 && samples <= 10)
const median = values => [...values].sort((a,b) => a-b)[Math.floor(values.length/2)]
function stage(lib) {
  const params = structuredClone(repairParams)
  const start = performance.now()
  const solver = new lib.RepairBoundaryLinesSolver(params)
  solver.solve()
  const output = solver.getOutput()
  const ms = performance.now() - start
  assert.equal(solver.solved, true)
  assert.equal(solver.failed, false)
  return {ms,output}
}
function full(lib) {
  const cells = structuredClone(input)
  const start = performance.now()
  const output = lib.calculateCellBoundaries(cells, {cellMargin:1})
  return {ms:performance.now()-start,output}
}
const report = {
  checked_at: new Date().toISOString(),
  upstream_commit: fixture.source_commit,
  fixture_source: fixture.source_path,
  runtime: process.version,
  platform: `${os.platform()} ${os.arch()}`,
  cpu: os.cpus()[0]?.model,
  github_run_id: process.env.GITHUB_RUN_ID || null,
  cell_count: input.length,
  grid_rectangle_count: pipeline.buildGridSolver.gridRects.length,
  repair_input_line_count: repairParams.reducedLines.length,
  repair_original_line_count: repairParams.originalLines.length,
  measurement: 'Same process/runtime/dependencies; constructor, full solve and output included; input cloning and equality checks outside timing. One warm-up per variant per case; three alternating samples unless BENCHMARK_SAMPLES overrides. No wall-clock assertions.',
  benchmarks: {},
}
for (const [name,run] of [['repair_stage',stage],['public_api',full]]) {
  const warmA=run(baseline), warmB=run(patched)
  assert.deepEqual(warmB.output,warmA.output)
  const a=[],b=[]
  for(let i=0;i<samples;i++) {
    let ra,rb
    if(i%2===0) {ra=run(baseline);rb=run(patched)} else {rb=run(patched);ra=run(baseline)}
    assert.deepEqual(rb.output,ra.output)
    assert.deepEqual(ra.output,warmA.output)
    a.push(ra.ms);b.push(rb.ms)
  }
  report.benchmarks[name]={baseline_ms:a,patched_ms:b,baseline_median_ms:median(a),patched_median_ms:median(b),median_speedup:median(a)/median(b),exact_output_equal:true,output_line_count:warmA.output.length}
  fs.writeFileSync(path.join(evidence, `${name}-output.json`),JSON.stringify(warmA.output,null,2)+'\n')
  console.log(name,JSON.stringify(report.benchmarks[name]))
}
fs.writeFileSync(path.join(evidence,'benchmark.json'),JSON.stringify(report,null,2)+'\n')
console.log('All benchmark outputs match exactly.')
