const MARGIN = 40
const INK = [15, 23, 42]
const EMOJI_FONTS = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"'

const cellPaints = new WeakMap()
const paintCache = new Map()

// Helvetica only draws WinAnsi. Gujarati and emoji are painted by the browser
// so the PDF does not embed a special font.
const PAINT_TEXT = /[\u0A80-\u0AFF]|\p{Extended_Pictographic}/u

export function needsPaint(text) {
  return PAINT_TEXT.test(String(text ?? ''))
}

function pageFont() {
  if (typeof document === 'undefined') return `sans-serif, ${EMOJI_FONTS}`
  const body = getComputedStyle(document.body).fontFamily || 'sans-serif'
  if (body.includes('Color Emoji')) return body
  return `${body}, ${EMOJI_FONTS}`
}

function asRgb(color) {
  if (Array.isArray(color)) return color.slice(0, 3)
  if (typeof color === 'number') return [color, color, color]
  return INK
}

function graphemes(text) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    return [...new Intl.Segmenter('gu', { granularity: 'grapheme' }).segment(text)].map(
      (part) => part.segment,
    )
  }
  return [...text]
}

function wrapPainted(ctx, text, maxPx) {
  const lines = []
  const pushFitted = (value) => {
    let line = ''
    for (const piece of graphemes(value)) {
      const next = line + piece
      if (line && ctx.measureText(next).width > maxPx) {
        lines.push(line)
        line = piece
      } else {
        line = next
      }
    }
    return line
  }
  for (const para of String(text).replace(/\r/g, '').split('\n')) {
    if (!para) {
      lines.push('')
      continue
    }
    let line = ''
    for (const word of para.split(/(\s+)/)) {
      if (word.trim() && ctx.measureText(word).width > maxPx) {
        if (line.trim()) lines.push(line.trimEnd())
        line = pushFitted(word)
        continue
      }
      const next = line + word
      if (line.trim() && ctx.measureText(next).width > maxPx) {
        lines.push(line.trimEnd())
        line = word.trimStart()
      } else {
        line = next
      }
    }
    if (line.trim()) lines.push(line.trimEnd())
  }
  return lines.length ? lines : ['']
}

function paintBlock(text, { fontSize = 9, bold = false, maxWidth = 200, color = INK, maxLines = 0 } = {}) {
  const rgb = asRgb(color)
  const key = [text, fontSize, bold, maxWidth, maxLines, rgb.join(',')].join('\u0001')
  const cached = paintCache.get(key)
  if (cached) return cached
  const scale = 3
  const fontPx = fontSize * (96 / 72) * scale
  const maxPx = Math.max(24, maxWidth * (96 / 72) * scale)
  const scratch = document.createElement('canvas').getContext('2d')
  const font = `${bold ? '600' : '400'} ${fontPx}px ${pageFont()}`
  scratch.font = font
  let lines = wrapPainted(scratch, text, maxPx)
  if (maxLines > 0) lines = lines.slice(0, maxLines)
  const lineH = fontPx * 1.35
  const widthPx = Math.max(...lines.map((line) => scratch.measureText(line).width), 1)
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(widthPx + 6)
  canvas.height = Math.ceil(lines.length * lineH + 6)
  const ctx = canvas.getContext('2d')
  ctx.font = font
  ctx.fillStyle = `rgb(${rgb.join(',')})`
  ctx.textBaseline = 'top'
  lines.forEach((line, index) => ctx.fillText(line, 2, 2 + index * lineH))
  const painted = {
    dataUrl: canvas.toDataURL('image/png'),
    width: (canvas.width * 72) / (96 * scale),
    height: (canvas.height * 72) / (96 * scale),
  }
  paintCache.set(key, painted)
  return painted
}

export function writeBlock(
  doc,
  text,
  x,
  y,
  { size = 9, style = 'normal', color = INK, maxWidth, gap = 4, maxLines = 0 } = {},
) {
  const value = String(text ?? '')
  const width = maxWidth || doc.internal.pageSize.getWidth() - x - MARGIN
  const rgb = asRgb(color)
  if (!needsPaint(value)) {
    doc.setFont('helvetica', style === 'bold' ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...rgb)
    let lines = value ? doc.splitTextToSize(value, width) : ['']
    if (maxLines > 0) lines = lines.slice(0, maxLines)
    doc.text(lines, x, y)
    return y + lines.length * (size + 3) + gap
  }
  const painted = paintBlock(value, {
    fontSize: size,
    bold: style === 'bold',
    maxWidth: width,
    color: rgb,
    maxLines,
  })
  const top = y - size * 0.82
  doc.addImage(painted.dataUrl, 'PNG', x, top, painted.width, painted.height)
  return top + painted.height + gap
}

function paintHooks(doc) {
  return {
    didParseCell(data) {
      const raw = (data.cell.text || []).join('\n')
      if (!needsPaint(raw)) return
      const padX = data.cell.padding('horizontal')
      const styledWidth = data.cell.styles.cellWidth
      const limit = typeof styledWidth === 'number' ? styledWidth - padX : 188
      const painted = paintBlock(raw, {
        fontSize: data.cell.styles.fontSize || 8.5,
        bold: data.cell.styles.fontStyle === 'bold',
        maxWidth: Math.max(48, limit),
        color: asRgb(data.cell.styles.textColor),
      })
      cellPaints.set(data.cell, painted)
      data.cell.text = ['']
      data.cell.styles.minCellWidth = painted.width + padX
      data.cell.styles.minCellHeight = painted.height + data.cell.padding('vertical')
    },
    willDrawCell(data) {
      if (cellPaints.has(data.cell)) data.cell.text = ['']
    },
    didDrawCell(data) {
      const painted = cellPaints.get(data.cell)
      if (!painted) return
      const maxW = data.cell.width - data.cell.padding('horizontal')
      const scale = painted.width > maxW && maxW > 8 ? maxW / painted.width : 1
      doc.addImage(
        painted.dataUrl,
        'PNG',
        data.cell.x + data.cell.padding('left'),
        data.cell.y + data.cell.padding('top'),
        painted.width * scale,
        painted.height * scale,
      )
    },
  }
}

export function composePdfTableHooks(doc, extra = {}) {
  const paint = paintHooks(doc)
  const { didParseCell, willDrawCell, didDrawCell, ...rest } = extra
  return {
    ...rest,
    didParseCell(data) {
      didParseCell?.(data)
      paint.didParseCell(data)
    },
    willDrawCell(data) {
      willDrawCell?.(data)
      paint.willDrawCell(data)
    },
    didDrawCell(data) {
      didDrawCell?.(data)
      paint.didDrawCell(data)
    },
  }
}
