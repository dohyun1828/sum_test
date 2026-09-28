const cellRegionComponents = (lines: BLine[], cellContents: InputRect[]) => {
  const { xs, ys } = axisValues(lines, cellContents)
  const xCount = xs.length - 1
  const yCount = ys.length - 1
  if (xCount <= 0 || yCount <= 0) return cellContents.map(() => -1)

  const tileCount = xCount * yCount
  const componentByTile = new Int32Array(tileCount).fill(-1)
  const blockedLeft = new Uint8Array(tileCount)
  const blockedBelow = new Uint8Array(tileCount)
  const stack = new Int32Array(tileCount)

  // A wall blocks an edge only when one original line covers its whole interval.
  for (const line of lines) {
    if (!(Math.abs(line.start.x - line.end.x) >= TOL)) {
      const minY = Math.min(line.start.y, line.end.y)
      const maxY = Math.max(line.start.y, line.end.y)
      for (let x = 1; x < xCount; x++) {
        if (Math.abs(line.start.x - xs[x]!) >= TOL) continue
        const offset = x * yCount
        for (let y = 0; y < yCount; y++) {
          if (ys[y]! >= minY - TOL && ys[y + 1]! <= maxY + TOL) {
            blockedLeft[offset + y] = 1
          }
        }
      }
    }
    if (!(Math.abs(line.start.y - line.end.y) >= TOL)) {
      const minX = Math.min(line.start.x, line.end.x)
      const maxX = Math.max(line.start.x, line.end.x)
      for (let y = 1; y < yCount; y++) {
        if (Math.abs(line.start.y - ys[y]!) >= TOL) continue
        for (let x = 0; x < xCount; x++) {
          if (xs[x]! >= minX - TOL && xs[x + 1]! <= maxX + TOL) {
            blockedBelow[x * yCount + y] = 1
          }
        }
      }
    }
  }

  let componentId = 0
  for (let start = 0; start < tileCount; start++) {
    if (componentByTile[start] !== -1) continue
    let stackSize = 1
    stack[0] = start
    componentByTile[start] = componentId
    while (stackSize > 0) {
      const current = stack[--stackSize]!
      const x = Math.floor(current / yCount)
      const y = current % yCount
      const left = current - yCount
      const right = current + yCount
      const below = current - 1
      const above = current + 1
      if (x > 0 && !blockedLeft[current] && componentByTile[left] === -1) {
        componentByTile[left] = componentId
        stack[stackSize++] = left
      }
      if (x + 1 < xCount && !blockedLeft[right] && componentByTile[right] === -1) {
        componentByTile[right] = componentId
        stack[stackSize++] = right
      }
      if (y > 0 && !blockedBelow[current] && componentByTile[below] === -1) {
        componentByTile[below] = componentId
        stack[stackSize++] = below
      }
      if (y + 1 < yCount && !blockedBelow[above] && componentByTile[above] === -1) {
        componentByTile[above] = componentId
        stack[stackSize++] = above
      }
    }
    componentId++
  }

  return cellContents.map((cell) => {
    const center = cellCenter(cell)
    const xIndex = xs.findIndex(
      (x, index) =>
        index + 1 < xs.length &&
        center.x >= x - TOL &&
        center.x <= (xs[index + 1] ?? x) + TOL,
    )
    const yIndex = ys.findIndex(
      (y, index) =>
        index + 1 < ys.length &&
        center.y >= y - TOL &&
        center.y <= (ys[index + 1] ?? y) + TOL,
    )
    if (xIndex < 0 || yIndex < 0) return -1
    return componentByTile[xIndex * yCount + yIndex] ?? -1
  })
}
