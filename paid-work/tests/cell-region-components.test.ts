import { test } from "bun:test"
import assert from "node:assert/strict"
import type { InputRect, Line } from "../lib/types"
import { sharedCellRegionCount } from "../lib/solvers/RepairBoundaryLinesSolver/geometry"
import { referenceSharedCellRegionCount } from "./fixtures/cell-regions-reference"

const line = (x1: number, y1: number, x2: number, y2: number): Line => ({
  start: { x: x1, y: y1 },
  end: { x: x2, y: y2 },
})
const cell = (minX: number, minY: number, maxX = minX + 0.4, maxY = minY + 0.4): InputRect => ({
  minX, minY, maxX, maxY,
})
const compare = (lines: Line[], cells: InputRect[], context = "") => {
  assert.equal(sharedCellRegionCount(lines, cells), referenceSharedCellRegionCount(lines, cells), context)
}

function random(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x100000000
  }
}

test("empty and degenerate grids preserve the missing-region sentinel", () => {
  for (const cells of [[], [cell(0, 0)], [cell(0, 0, 0, 0)], [cell(0, 0, 0, 0), cell(0, 0, 0, 0)]]) {
    compare([], cells)
    compare([line(0, 0, 0, 0)], cells)
  }
  assert.equal(sharedCellRegionCount([], []), 0)
  assert.equal(sharedCellRegionCount([], [cell(0, 0, 0, 0), cell(0, 0, 0, 0)]), 1)
})

test("a complete separator disconnects cells and an incomplete separator does not", () => {
  const cells = [cell(0, 0, 1, 1), cell(2, 0, 3, 1)]
  assert.equal(sharedCellRegionCount([], cells), 1)
  assert.equal(sharedCellRegionCount([line(1.5, 0, 1.5, 1)], cells), 0)
  assert.equal(sharedCellRegionCount([line(1.5, 0.2, 1.5, 0.8)], cells), 1)
  compare([line(1.5, 1, 1.5, 0)], cells)
})

test("closed regions, T junctions and crossing lines preserve connectivity", () => {
  const cells = [cell(0.1, 0.1), cell(1.1, 0.1), cell(0.1, 1.1), cell(1.1, 1.1)]
  for (const lines of [
    [line(1, 0, 1, 2)],
    [line(0, 1, 2, 1)],
    [line(1, 0, 1, 2), line(0, 1, 1, 1)],
    [line(1, 0, 1, 2), line(0, 1, 2, 1)],
    [line(0, 0, 1, 0), line(1, 0, 1, 1), line(1, 1, 0, 1), line(0, 1, 0, 0)],
  ]) compare(lines, cells)
})

test("all 4096 wall configurations of a 3 by 3 board match an independent graph oracle", () => {
  const cells = Array.from({ length: 9 }, (_, i) => cell((i % 3) + 0.2, Math.floor(i / 3) + 0.2, (i % 3) + 0.8, Math.floor(i / 3) + 0.8))
  const edges: { a: number; b: number; wall: Line }[] = []
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      if (x + 1 < 3) edges.push({ a: y * 3 + x, b: y * 3 + x + 1, wall: line(x + 1, y, x + 1, y + 1) })
      if (y + 1 < 3) edges.push({ a: y * 3 + x, b: (y + 1) * 3 + x, wall: line(x, y + 1, x + 1, y + 1) })
    }
  }
  const border = [line(0, 0, 3, 0), line(3, 0, 3, 3), line(3, 3, 0, 3), line(0, 3, 0, 0)]
  assert.equal(edges.length, 12)
  for (let mask = 0; mask < 1 << edges.length; mask++) {
    const parents = Array.from({ length: 9 }, (_, i) => i)
    const find = (start: number) => { let i = start; while (parents[i] !== i) i = parents[i]!; return i }
    const walls = [...border]
    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i]!
      if (mask & (1 << i)) walls.push(edge.wall)
      else parents[find(edge.a)] = find(edge.b)
    }
    let shared = 0
    for (let a = 0; a < 9; a++) for (let b = a + 1; b < 9; b++) if (find(a) === find(b)) shared++
    assert.equal(sharedCellRegionCount(walls, cells), shared, `wall mask=${mask}`)
    assert.equal(referenceSharedCellRegionCount(walls, cells), shared, `reference wall mask=${mask}`)
  }
}, 30_000)

test("almost-axis-aligned, reversed, diagonal and zero-length lines match legacy behavior", () => {
  const cells = [cell(-2, -2), cell(1, -2), cell(-2, 1), cell(1, 1)]
  for (const delta of [-0.001001, -0.001, -0.000999, 0, 0.000999, 0.001, 0.001001]) {
    for (const candidate of [line(0, -3, delta, 3), line(-3, 0, 3, delta), line(0, 0, delta, delta)]) {
      compare([candidate], cells)
      compare([{ start: candidate.end, end: candidate.start }], cells)
    }
  }
  compare([line(-3, -3, 3, 3)], cells)
})

test("wall coverage keeps the original inclusive endpoint and strict axis tolerances", () => {
  const cells = [cell(0, 0, 1, 1), cell(2, 0, 3, 1)]
  for (const delta of [-0.001001, -0.001, -0.000999, -0.00001, 0, 0.00001, 0.000999, 0.001, 0.001001]) {
    compare([line(1.5, delta, 1.5, 1 - delta)], cells)
    compare([line(1.5, 0, 1.5, 0.5 - delta), line(1.5, 0.5 + delta, 1.5, 1)], cells)
    compare([line(1.5, 0, 1.5, 1), line(1.5 + delta, -1, 1.5 + delta, 2)], cells)
  }
})

test("cell centers on and near grid boundaries retain the first matching interval", () => {
  for (const delta of [-0.001001, -0.001, -0.000999, 0, 0.000999, 0.001, 0.001001]) {
    const cells = [cell(-1 + delta, -0.5, 1 + delta, 0.5), cell(1.5, -0.5, 2.5, 0.5)]
    compare([line(0, -1, 0, 1)], cells)
    compare([line(0, -1, 0, 1), line(delta, -1, delta, 1)], cells)
  }
})

test("duplicate walls, unmerged intervals and line-order permutations agree", () => {
  const cells = [cell(0, 0), cell(2, 0), cell(0, 2), cell(2, 2)]
  const lines = [line(1, -1, 1, 3), line(1, 3, 1, -1), line(-1, 1, 1, 1), line(1, 1, 3, 1), line(0, 0, 0, 0)]
  compare(lines, cells)
  compare([...lines].reverse(), cells)
  compare([...lines, ...lines], cells)
})

test("sparse nonuniform grids and large coordinates retain their topology", () => {
  for (const scale of [1e-8, 1, 1e6, 1e12]) {
    const cells = [cell(-3 * scale, -2 * scale, -2 * scale, -scale), cell(scale, -2 * scale, 2 * scale, -scale), cell(scale, scale, 2 * scale, 2 * scale)]
    compare([line(0, -5 * scale, 0, 5 * scale), line(-5 * scale, 0, 5 * scale, 0)], cells)
  }
})

test("nonfinite and reversed rectangle coordinates retain the prior comparison behavior", () => {
  const regular = [cell(-2, -2), cell(1, 1)]
  for (const lines of [
    [line(Number.NaN, -3, Number.NaN, 3)],
    [line(-Infinity, 0, Infinity, 0)],
    [line(0, -Infinity, 0, Infinity)],
    [line(Infinity, 0, Infinity, 1)],
  ]) compare(lines, regular)
  compare([], [cell(1, 1, -1, -1), cell(2, 2)])
  compare([line(0, -3, 0, 3)], [cell(Number.NaN, 0), cell(2, 0)])
})

test("region counting does not mutate the caller's cells or line endpoints", () => {
  const lines = [line(1, -1, 1, 3), line(-1, 1, 3, 1)]
  const cells = [cell(0, 0), cell(2, 0), cell(0, 2), cell(2, 2)]
  const before = structuredClone({ lines, cells })
  for (const item of lines) { Object.freeze(item.start); Object.freeze(item.end); Object.freeze(item) }
  for (const item of cells) Object.freeze(item)
  Object.freeze(lines); Object.freeze(cells)
  compare(lines, cells)
  assert.deepEqual({ lines, cells }, before)
})

test("512 seeded layouts preserve exact region counts", () => {
  for (let seed = 1; seed <= 512; seed++) {
    const next = random(seed)
    const value = () => Math.floor(next() * 9) - 4 + (seed % 3 === 0 ? (next() - 0.5) * 0.0021 : 0)
    const cells = Array.from({ length: seed % 9 }, () => {
      const x = value(), y = value()
      return cell(x, y, x + next() * 2, y + next() * 2)
    })
    const lines = Array.from({ length: seed % 17 }, () => {
      const x = value(), y = value()
      return next() < 0.5 ? line(x, y, x + (seed % 5 === 0 ? 0.0005 : 0), value()) : line(x, y, value(), y)
    })
    compare(lines, cells, `seed=${seed}`)
  }
}, 30_000)
