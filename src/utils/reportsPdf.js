import {
  formatAnswerLabel,
  formatReportDate,
  formatReportTime,
  groupReportByPerson,
  groupReportDays,
  loggedByName,
  personLabel,
} from './reportAttendance'
import {
  REPORT_ANSWER_TYPE,
  REPORT_ANSWER_TYPE_LABELS,
  REPORT_ATTENDANCE_STATUS,
  REPORT_OUT_OF_CITY_REASON,
  REPORT_PDF_LAYOUT,
} from '../config/constants'

const MARGIN = 40
const HEAD_FILL = [15, 118, 110]
const TEAL = [15, 118, 110]
const GOLD = [201, 164, 91]
const INK = [15, 23, 42]
const MUTED = [100, 116, 139]
const PAGE1_BANNER_H = 92
const PAGE1_CONTENT_TOP = 136
const CONT_HEADER_H = 48
const CONT_CONTENT_TOP = 60
const FOOTER_RESERVE = 54
const PDF_BANNER_SRC = '/darshan/finance.jpg'
const PDF_STAMP_SRC = '/darshan/stamp.jpg'
const KICKER = 'JAY SWAMINARAYAN  ·  ROOM REPORTS'
const cellPaints = new WeakMap()
const paintCache = new Map()

function fileSafe(text) {
  return String(text || 'room-reports')
    .replace(/[^\w]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'room-reports'
}

function todayLabel() {
  return new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// Helvetica cannot draw Gujarati, and the file must not embed a Gujarati font. The browser paints those strings.
function needsPaint(text) {
  return /[\u0A80-\u0AFF]/.test(String(text ?? ''))
}

function pageFont() {
  if (typeof document === 'undefined') return 'sans-serif'
  return getComputedStyle(document.body).fontFamily || 'sans-serif'
}

function rgbOf(color) {
  if (Array.isArray(color)) return color.slice(0, 3)
  if (typeof color === 'number') return [color, color, color]
  return INK
}

function graphemes(text) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    return [...new Intl.Segmenter('gu', { granularity: 'grapheme' }).segment(text)].map((part) => part.segment)
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

function paintBlock(text, { fontSize = 9, bold = false, maxWidth = 200, color = INK } = {}) {
  const key = [text, fontSize, bold, maxWidth, color.join(',')].join('\u0001')
  const cached = paintCache.get(key)
  if (cached) return cached
  const scale = 3
  const fontPx = fontSize * (96 / 72) * scale
  const maxPx = Math.max(24, maxWidth * (96 / 72) * scale)
  const scratch = document.createElement('canvas').getContext('2d')
  const font = `${bold ? '600' : '400'} ${fontPx}px ${pageFont()}`
  scratch.font = font
  const lines = wrapPainted(scratch, text, maxPx)
  const lineH = fontPx * 1.35
  const widthPx = Math.max(...lines.map((line) => scratch.measureText(line).width), 1)
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(widthPx + 6)
  canvas.height = Math.ceil(lines.length * lineH + 6)
  const ctx = canvas.getContext('2d')
  ctx.font = font
  ctx.fillStyle = `rgb(${color.join(',')})`
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

function writeBlock(doc, text, x, y, { size = 9, style = 'normal', color = INK, maxWidth, gap = 4 } = {}) {
  const value = String(text ?? '')
  const width = maxWidth || doc.internal.pageSize.getWidth() - x - MARGIN
  if (!needsPaint(value)) {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(value, width)
    doc.text(lines, x, y)
    return y + lines.length * (size + 3) + gap
  }
  const painted = paintBlock(value, {
    fontSize: size,
    bold: style === 'bold',
    maxWidth: width,
    color,
  })
  const top = y - size * 0.82
  doc.addImage(painted.dataUrl, 'PNG', x, top, painted.width, painted.height)
  return top + painted.height + gap
}

async function loadPdf() {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  return { jsPDF, autoTable }
}

function pageBottom(doc) {
  return doc.internal.pageSize.getHeight() - FOOTER_RESERVE
}

function ensureSpace(doc, y, needed = 72) {
  if (y + needed <= pageBottom(doc)) return y
  doc.addPage()
  return CONT_CONTENT_TOP
}

async function decodeImage(src) {
  const img = new Image()
  img.src = src
  await img.decode()
  return img
}

function coverDraw(ctx, img, width, height, focusX = 0.5, focusY = 0.12) {
  const ir = img.naturalWidth / img.naturalHeight
  const cr = width / height
  let dw
  let dh
  let dx
  let dy
  if (ir > cr) {
    dh = height
    dw = height * ir
    dx = (width - dw) * focusX
    dy = 0
  } else {
    dw = width
    dh = width / ir
    dx = 0
    dy = (height - dh) * focusY
  }
  ctx.drawImage(img, dx, dy, dw, dh)
}

function bannerJpeg(img) {
  const canvas = document.createElement('canvas')
  canvas.width = 1800
  canvas.height = 320
  const ctx = canvas.getContext('2d')
  coverDraw(ctx, img, canvas.width, canvas.height, 0.5, 0.1)
  return canvas.toDataURL('image/jpeg', 0.82)
}

function circularStampPng(img) {
  const size = 280
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.save()
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()
  coverDraw(ctx, img, size, size, 0.5, 0.22)
  ctx.restore()
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2)
  ctx.strokeStyle = '#c9a45b'
  ctx.lineWidth = 12
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2)
  ctx.strokeStyle = '#0f766e'
  ctx.lineWidth = 3
  ctx.stroke()
  return canvas.toDataURL('image/png')
}

async function loadPdfArt() {
  try {
    const [bannerImg, stampImg] = await Promise.all([
      decodeImage(PDF_BANNER_SRC),
      decodeImage(PDF_STAMP_SRC),
    ])
    return { banner: bannerJpeg(bannerImg), stamp: circularStampPng(stampImg) }
  } catch {
    return { banner: null, stamp: null }
  }
}

function drawBannerBar(doc, y, height = 2.5) {
  const w = doc.internal.pageSize.getWidth()
  doc.setFillColor(...TEAL)
  doc.rect(0, y, w, height, 'F')
  doc.setFillColor(...GOLD)
  doc.rect(0, y + height, w, 1.1, 'F')
}

function drawPage1Letterhead(doc, art, { kicker, title, meta }) {
  const w = doc.internal.pageSize.getWidth()
  if (art.banner) {
    doc.addImage(art.banner, 'JPEG', 0, 0, w, PAGE1_BANNER_H)
  } else {
    doc.setFillColor(...TEAL)
    doc.rect(0, 0, w, PAGE1_BANNER_H, 'F')
  }
  drawBannerBar(doc, PAGE1_BANNER_H)

  const stampSize = 46
  const stampX = MARGIN
  const stampY = PAGE1_BANNER_H - 18
  if (art.stamp) {
    doc.addImage(art.stamp, 'PNG', stampX, stampY, stampSize, stampSize)
  }

  const textX = art.stamp ? stampX + stampSize + 12 : MARGIN
  let y = PAGE1_BANNER_H + 22
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...TEAL)
  doc.text(kicker || KICKER, textX, y)
  y += 16
  doc.setFontSize(15)
  doc.setTextColor(...INK)
  const lines = doc.splitTextToSize(title, w - textX - MARGIN)
  doc.text(lines, textX, y)
  y += lines.length * 17 + 4
  if (meta) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(51, 65, 85)
    const metaLines = doc.splitTextToSize(meta, w - textX - MARGIN)
    doc.text(metaLines, textX, y)
    y += metaLines.length * 12
  }
  return Math.max(y + 10, PAGE1_CONTENT_TOP)
}

function drawContHeader(doc, art, title) {
  const w = doc.internal.pageSize.getWidth()
  doc.setFillColor(248, 250, 252)
  doc.rect(0, 0, w, CONT_HEADER_H, 'F')
  if (art.stamp) {
    doc.addImage(art.stamp, 'PNG', MARGIN, 9, 30, 30)
  }
  const textX = art.stamp ? MARGIN + 38 : MARGIN
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...TEAL)
  doc.text(KICKER, textX, 20)
  doc.setFontSize(10)
  doc.setTextColor(...INK)
  const line = doc.splitTextToSize(title, w - textX - MARGIN)[0]
  doc.text(line, textX, 36)
  drawBannerBar(doc, CONT_HEADER_H, 2)
}

function drawFooter(doc, art, subtitle, page, pages) {
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  const y0 = h - 46
  doc.setDrawColor(...TEAL)
  doc.setLineWidth(0.7)
  doc.line(MARGIN, y0, w - MARGIN, y0)
  if (art.stamp) {
    doc.addImage(art.stamp, 'PNG', MARGIN, y0 + 6, 18, 18)
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  const labelX = art.stamp ? MARGIN + 24 : MARGIN
  doc.text(`Jay Swaminarayan  ·  ${subtitle}`, labelX, y0 + 18)
  doc.text(`Page ${page} of ${pages}`, w - MARGIN, y0 + 18, { align: 'right' })
}

function applyPdfChrome(doc, art, { title, subtitle }) {
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i)
    if (i > 1) drawContHeader(doc, art, title)
    drawFooter(doc, art, subtitle, i, pageCount)
  }
}

function addSection(doc, text, y) {
  const next = ensureSpace(doc, y, 36)
  const after = writeBlock(doc, text, MARGIN, next, {
    size: 12,
    style: 'bold',
    color: INK,
    gap: 2,
  })
  doc.setDrawColor(...TEAL)
  doc.setLineWidth(0.8)
  doc.line(MARGIN, after, MARGIN + 120, after)
  return after + 14
}

function addSubhead(doc, text, y) {
  const width = doc.internal.pageSize.getWidth() - MARGIN * 2
  const next = ensureSpace(doc, y, 28)
  return writeBlock(doc, text, MARGIN, next, {
    size: 11,
    style: 'bold',
    color: INK,
    maxWidth: width,
    gap: 6,
  })
}

function addParagraph(doc, text, y) {
  const width = doc.internal.pageSize.getWidth() - MARGIN * 2
  const next = ensureSpace(doc, y, 24)
  return writeBlock(doc, text, MARGIN, next, {
    size: 9,
    style: 'normal',
    color: [51, 65, 85],
    maxWidth: width,
    gap: 8,
  })
}

function tableOptions(doc, extra = {}) {
  return {
    margin: { left: MARGIN, right: MARGIN, top: CONT_CONTENT_TOP, bottom: FOOTER_RESERVE },
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 4.5,
      overflow: 'linebreak',
      valign: 'middle',
      textColor: INK,
      lineColor: [226, 232, 240],
      lineWidth: 0.4,
    },
    headStyles: {
      fillColor: HEAD_FILL,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
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
        color: rgbOf(data.cell.styles.textColor),
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
    ...extra,
  }
}

function afterTable(doc, fallbackY) {
  return (doc.lastAutoTable?.finalY || fallbackY) + 14
}

function drawTable(doc, autoTable, y, head, body, columnStyles) {
  if (!body.length) return y
  const startY = ensureSpace(doc, y, 48)
  autoTable(doc, {
    ...tableOptions(doc, {
      startY,
      head: [head],
      body,
      columnStyles,
    }),
  })
  return afterTable(doc, startY)
}

function drawNamedTable(doc, autoTable, y, title, head, body, columnStyles) {
  if (!body.length) return y
  let next = addSubhead(doc, title, y)
  next = drawTable(doc, autoTable, next, head, body, columnStyles)
  return next
}

function eventLine(title, time) {
  const clock = formatReportTime(time)
  return clock ? `${title || 'Event'} · ${clock}` : (title || 'Event')
}

function drawPerson(doc, autoTable, person, y) {
  let next = addSection(doc, person.displayName, y)

  if (person.attendance.length) {
    next = drawNamedTable(
      doc,
      autoTable,
      next,
      'Answers',
      ['Date', 'Event', 'Answer'],
      person.attendance.map((row) => [
        formatReportDate(row.date) || row.date,
        eventLine(row.eventTitle, row.eventTime),
        formatAnswerLabel(row) || '—',
      ]),
      { 0: { cellWidth: 108 } },
    )
  }

  // Skip notes table entirely when this person has none in the range.
  if (person.notes.length) {
    next = drawNamedTable(
      doc,
      autoTable,
      next,
      'Notes',
      ['Date', 'Note', 'Logged by'],
      person.notes.map((note) => [
        formatReportDate(note.date) || note.date,
        note.text || '',
        loggedByName(note),
      ]),
      { 0: { cellWidth: 90 }, 2: { cellWidth: 100 } },
    )
  }

  return next + 4
}

function peopleFor(event, roster) {
  const answers = new Map()
  for (const row of event.attendance || []) {
    if (row?.userId) answers.set(row.userId, row)
  }
  const source = roster?.length
    ? roster
    : [...answers.values()].map((row) => ({ id: row.userId, displayName: row.displayName }))
  return source
    .map((person) => ({
      name: personLabel(person),
      answer: answers.get(person.id) || null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

function dash(value) {
  const text = String(value ?? '').trim()
  return text || '—'
}

function eventAnswerRows(event, roster) {
  const type = event.answerType || REPORT_ANSWER_TYPE.ATTENDANCE
  const people = peopleFor(event, roster)
  if (type === REPORT_ANSWER_TYPE.NUMBER) {
    return {
      title: 'Numbers',
      head: ['Name', 'Number', 'Note'],
      body: people.map(({ name, answer }) => [
        name,
        answer && answer.numberValue != null && answer.numberValue !== ''
          ? String(answer.numberValue)
          : 'Not filled yet',
        dash(answer?.note),
      ]),
    }
  }
  if (type === REPORT_ANSWER_TYPE.YES_NO) {
    return {
      title: 'Yes or No',
      head: ['Name', 'Answer', 'Note'],
      body: people.map(({ name, answer }) => {
        let label = 'Not filled yet'
        if (answer?.status === REPORT_ATTENDANCE_STATUS.PRESENT) label = 'Yes'
        else if (answer?.status === REPORT_ATTENDANCE_STATUS.ABSENT) label = 'No'
        return [name, label, dash(answer?.note)]
      }),
    }
  }
  if (type === REPORT_ANSWER_TYPE.SINGLE || type === REPORT_ANSWER_TYPE.MULTI) {
    return {
      title: REPORT_ANSWER_TYPE_LABELS[type] || 'Choices',
      head: ['Name', 'Choice', 'Written answer'],
      body: people.map(({ name, answer }) => {
        const picked = Array.isArray(answer?.selected) ? answer.selected.filter(Boolean) : []
        const written = String(answer?.customText || '').trim()
        if (!picked.length && !written) return [name, 'Not filled yet', '—']
        return [name, picked.join(', ') || '—', written || '—']
      }),
    }
  }
  return {
    title: 'Attendance',
    head: ['Name', 'Answer', 'Detail'],
    body: people.map(({ name, answer }) => {
      if (!answer) return [name, 'Not filled yet', '—']
      if (answer.status === REPORT_ATTENDANCE_STATUS.PRESENT) {
        return [name, 'Yes', formatReportTime(answer.time) || '—']
      }
      const reason = String(answer.reason || '').trim()
      if (reason.startsWith(REPORT_OUT_OF_CITY_REASON)) {
        const extra = reason.slice(REPORT_OUT_OF_CITY_REASON.length).replace(/^[\s—-]+/, '').trim()
        return [name, 'Out of city', extra || '—']
      }
      if (answer.status === REPORT_ATTENDANCE_STATUS.ABSENT) return [name, 'No', reason || '—']
      return [name, formatAnswerLabel(answer) || 'Not filled yet', '—']
    }),
  }
}

function drawEvent(doc, autoTable, event, roster, y) {
  let next = addSubhead(doc, eventLine(event.title, event.time), y)
  const typeLabel = REPORT_ANSWER_TYPE_LABELS[event.answerType || REPORT_ANSWER_TYPE.ATTENDANCE]
  if (typeLabel) next = addParagraph(doc, typeLabel, next)
  if (event.note) next = addParagraph(doc, event.note, next)
  const sheet = eventAnswerRows(event, roster)
  next = drawNamedTable(
    doc,
    autoTable,
    next,
    sheet.title,
    sheet.head,
    sheet.body,
    { 0: { cellWidth: 140 } },
  )
  return next + 4
}

function drawDayNotes(doc, autoTable, notes, y) {
  if (!notes.length) return y
  return drawNamedTable(
    doc,
    autoTable,
    y,
    'Person notes',
    ['Person', 'Note', 'Logged by'],
    notes.map((note) => [
      personLabel(note),
      note.text || '',
      loggedByName(note),
    ]),
    { 0: { cellWidth: 110 }, 2: { cellWidth: 100 } },
  )
}

function renderPersonLayout(doc, autoTable, { from, to, events, notes, roster, y }) {
  const people = groupReportByPerson({ from, to, events, notes, roster })
  if (!people.length) {
    throw new Error('Nothing was logged in that date range.')
  }
  let next = y
  for (const person of people) {
    next = drawPerson(doc, autoTable, person, next)
  }
  return next
}

function renderEventLayout(doc, autoTable, { from, to, events, notes, roster, y }) {
  const days = groupReportDays({ from, to, events, notes })
  if (!days.length) {
    throw new Error('Nothing was logged in that date range.')
  }
  let next = y
  for (const day of days) {
    next = addSection(doc, formatReportDate(day.date) || day.date, next)
    for (const event of day.events) {
      next = drawEvent(doc, autoTable, event, roster, next)
    }
    next = drawDayNotes(doc, autoTable, day.notes, next)
  }
  return next
}

export async function exportReportsPdf({
  from,
  to,
  events,
  notes,
  roster,
  layout = REPORT_PDF_LAYOUT.PERSON,
}) {
  const mode =
    layout === REPORT_PDF_LAYOUT.EVENT
      ? REPORT_PDF_LAYOUT.EVENT
      : REPORT_PDF_LAYOUT.PERSON

  const { jsPDF, autoTable } = await loadPdf()
  const art = await loadPdfArt()
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const fromLabel = formatReportDate(from) || from
  const toLabel = formatReportDate(to) || to
  const rangeLabel = from === to ? fromLabel : `${fromLabel} – ${toLabel}`
  const title = 'Room report'
  const layoutLabel = mode === REPORT_PDF_LAYOUT.EVENT ? 'Event wise' : 'Person wise'

  let y = drawPage1Letterhead(doc, art, {
    kicker: KICKER,
    title,
    meta: [`${rangeLabel}`, layoutLabel, `Generated ${todayLabel()}`].join('  ·  '),
  })

  const payload = { from, to, events, notes, roster, y }
  if (mode === REPORT_PDF_LAYOUT.EVENT) {
    renderEventLayout(doc, autoTable, payload)
  } else {
    renderPersonLayout(doc, autoTable, payload)
  }

  applyPdfChrome(doc, art, {
    title: `${title}  ·  ${rangeLabel}`,
    subtitle: `Room reports  ·  ${layoutLabel}  ·  ${rangeLabel}`,
  })
  doc.save(`room-reports-${mode}-${fileSafe(from)}-to-${fileSafe(to)}.pdf`)
}
