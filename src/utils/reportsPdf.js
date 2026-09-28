import {
  attendanceStatusLabel,
  formatReportDate,
  formatReportTime,
  groupReportByPerson,
  loggedByName,
} from './reportAttendance'

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
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...INK)
  doc.text(text, MARGIN, next)
  doc.setDrawColor(...TEAL)
  doc.setLineWidth(0.8)
  doc.line(MARGIN, next + 4, MARGIN + 120, next + 4)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(51, 65, 85)
  return next + 16
}

function addSubhead(doc, text, y) {
  const width = doc.internal.pageSize.getWidth() - MARGIN * 2
  const lines = doc.splitTextToSize(text, width)
  const next = ensureSpace(doc, y, lines.length * 14 + 8)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...INK)
  doc.text(lines, MARGIN, next)
  return next + lines.length * 14 + 2
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

function drawPerson(doc, autoTable, person, y) {
  let next = addSection(doc, person.displayName, y)

  if (person.attendance.length) {
    next = drawNamedTable(
      doc,
      autoTable,
      next,
      'Event attendance',
      ['Date', 'Event', 'Arrival', 'Status'],
      person.attendance.map((row) => [
        formatReportDate(row.date) || row.date,
        row.eventTitle,
        formatReportTime(row.time) || '—',
        attendanceStatusLabel(row),
      ]),
      {
        0: { cellWidth: 90 },
        2: { cellWidth: 70 },
        3: { cellWidth: 110 },
      },
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

export async function exportReportsPdf({ from, to, events, notes, roster }) {
  const people = groupReportByPerson({ from, to, events, notes, roster })
  if (!people.length) {
    throw new Error('Nothing was logged in that date range.')
  }

  const { jsPDF, autoTable } = await loadPdf()
  const art = await loadPdfArt()
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const fromLabel = formatReportDate(from) || from
  const toLabel = formatReportDate(to) || to
  const rangeLabel = from === to ? fromLabel : `${fromLabel} – ${toLabel}`
  const title = 'Room report'

  let y = drawPage1Letterhead(doc, art, {
    kicker: KICKER,
    title,
    meta: [`${rangeLabel}`, `Generated ${todayLabel()}`].join('  ·  '),
  })

  for (const person of people) {
    y = drawPerson(doc, autoTable, person, y)
  }

  applyPdfChrome(doc, art, {
    title: `${title}  ·  ${rangeLabel}`,
    subtitle: `Room reports  ·  ${rangeLabel}`,
  })
  doc.save(`room-reports-${fileSafe(from)}-to-${fileSafe(to)}.pdf`)
}
