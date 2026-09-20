import {
  FINANCE_SPLIT_MODE_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_SOURCE_LABELS,
  PAYMENT_SOURCES,
  WALLET_MOVEMENT_REASON_LABELS,
} from '../config/constants'
import { formatDateLabel, formatPeriodLabel, movementDateLabel, sumPaise } from './money'
import { isExpenseFromFundPayment, roomFundExpensesForCollection } from './financeLedger'
import {
  cookLeaveFactRows,
  formatCookLeaveDate,
  leavePeriodLine,
  memberCookLeaveShare,
} from './cookLeave'

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

function fileSafe(text) {
  return String(text || 'collection')
    .replace(/[^\w]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'collection'
}

function rs(paise) {
  const n = (Number(paise) || 0) / 100
  return `Rs. ${n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function signedRs(paise) {
  const n = Number(paise) || 0
  if (n > 0) return `+${rs(n)}`
  if (n < 0) return `-${rs(Math.abs(n))}`
  return rs(0)
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
  doc.text(kicker || 'JAY SWAMINARAYAN  ·  ROOM FINANCE', textX, y)
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
  doc.text('JAY SWAMINARAYAN  ·  ROOM FINANCE', textX, 20)
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
  doc.setTextColor(15, 23, 42)
  doc.text(text, MARGIN, next)
  doc.setDrawColor(15, 118, 110)
  doc.setLineWidth(0.8)
  doc.line(MARGIN, next + 4, MARGIN + 120, next + 4)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(51, 65, 85)
  return next + 16
}

function addParagraph(doc, text, y) {
  const width = doc.internal.pageSize.getWidth() - MARGIN * 2
  const lines = doc.splitTextToSize(text, width)
  const height = lines.length * 12
  const next = ensureSpace(doc, y, height + 8)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(51, 65, 85)
  doc.text(lines, MARGIN, next)
  return next + height + 8
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

function moneyCols(indexes) {
  const columnStyles = {}
  for (const i of indexes) {
    columnStyles[i] = { halign: 'right', cellWidth: 'auto' }
  }
  return columnStyles
}

function afterTable(doc, fallbackY) {
  return (doc.lastAutoTable?.finalY || fallbackY) + 14
}

function fundCopy(report) {
  const impact = report.totals?.fundImpactPaise || 0
  const added = report.totals?.appliedFundPaise || 0
  const covered = report.totals?.fundCoveredPaise || 0
  const recovered = report.totals?.fundRecoveredPaise || 0
  const cookLeaveToFund = report.totals?.cookLeaveToFundPaise || 0
  const fromFund = report.totals?.fromFundPaise || 0
  const parts = []
  if (impact) {
    parts.push(
      `Rounding extras go to the room fund when a person pays their full share. Expected rounding ${signedRs(impact)}. Added so far ${signedRs(added)}.`,
    )
  } else {
    parts.push('No rounding on this collection.')
  }
  if (fromFund) {
    parts.push(
      `${rs(fromFund)} of expenses was paid from the room fund when this collection was issued and is included in received.`,
    )
  }
  if (cookLeaveToFund) {
    parts.push(
      report.collection?.status === 'closed'
        ? `Cook leave held back ${rs(cookLeaveToFund)} into the room fund.`
        : `${rs(cookLeaveToFund)} of cook-leave money will go to the room fund when this collection closes.`,
    )
  }
  if (covered) {
    parts.push(
      `Room fund covered ${rs(covered)} of unpaid shares. Those people still owe the room wallet.`,
    )
  }
  if (recovered) {
    parts.push(
      report.collection?.status === 'closed'
        ? `Recovered ${rs(recovered)} of rolled-in remaining into the room fund.`
        : `${rs(recovered)} of rolled-in remaining will go back to the room fund at close.`,
    )
  }
  parts.push("Extra on an open collection stays here until close, then it moves to that person's wallet.")
  return parts.join(' ')
}

function sortByName(rows) {
  return [...(rows || [])].sort((a, b) =>
    String(a.name || a.userName || '').localeCompare(String(b.name || b.userName || '')),
  )
}

function expensesForPdf(report) {
  if (report.expenses?.length) {
    return report.expenses.map((expense) => ({
      ...expense,
      perUser: sortByName(expense.perUser || []),
    }))
  }

  const byExpense = new Map()
  for (const person of report.people || []) {
    for (const line of person.breakdown || []) {
      const key = line.expenseId || line.name
      if (!key) continue
      if (!byExpense.has(key)) {
        byExpense.set(key, {
          expenseId: key,
          name: line.name || 'Expense',
          amountPaise: 0,
          periodId: '',
          date: null,
          note: '',
          splitMode: '',
          perUser: [],
          excludedNames: [],
        })
      }
      const expense = byExpense.get(key)
      expense.perUser.push({
        userId: person.userId,
        name: person.userName,
        sharePaise: line.sharePaise,
      })
      expense.amountPaise += Number(line.sharePaise) || 0
    }
  }
  return [...byExpense.values()].map((expense) => ({
    ...expense,
    perUser: sortByName(expense.perUser),
  }))
}

function expenseMeta(expense) {
  const parts = []
  const period = formatPeriodLabel(expense.periodId)
  if (period) parts.push(period)
  if (expense.date) parts.push(formatDateLabel(expense.date))
  const split = FINANCE_SPLIT_MODE_LABELS[expense.splitMode] || expense.splitMode
  if (split) parts.push(`${split} split`)
  if (expense.note) parts.push(expense.note)
  return parts.join('  ·  ')
}

function drawExpenseBlocks(doc, autoTable, expenses, y, { focusUserId } = {}) {
  if (!expenses.length) {
    return addParagraph(
      doc,
      'No stored expense snapshot. Older collections only kept the split totals.',
      y,
    )
  }

  let cursor = y
  expenses.forEach((expense, index) => {
    cursor = addSection(
      doc,
      `${index + 1}. ${expense.name || 'Expense'}  ·  ${rs(expense.amountPaise)}`,
      cursor,
    )
    const meta = expenseMeta(expense)
    if (meta) cursor = addParagraph(doc, meta, cursor)
    if ((expense.fromFundPaise || 0) > 0) {
      cursor = addParagraph(
        doc,
        `From room fund ${rs(expense.fromFundPaise)}  ·  People ${rs(
          expense.billablePaise ?? expense.amountPaise - expense.fromFundPaise,
        )}`,
        cursor,
      )
    }

    const shares = expense.perUser || []
    const body = shares.map((row) => [row.name || 'Member', rs(row.sharePaise)])
    const shareTotal = sumPaise(shares.map((row) => row.sharePaise))
    body.push(['Total', rs(shareTotal || expense.amountPaise)])

    autoTable(doc, {
      ...tableOptions(doc, {
        startY: ensureSpace(doc, cursor, 48),
        head: [['Person', 'Share']],
        body,
        columnStyles: { 0: { cellWidth: 320 }, 1: { halign: 'right' } },
        didParseCell: (data) => {
          if (data.section !== 'body') return
          if (data.row.index === body.length - 1) {
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.fillColor = [241, 245, 249]
            return
          }
          if (focusUserId && shares[data.row.index]?.userId === focusUserId) {
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.fillColor = [204, 251, 241]
          }
        },
      }),
    })
    cursor = afterTable(doc, cursor)

    const excluded = (expense.excludedNames || []).filter(Boolean)
    if (excluded.length) {
      cursor = addParagraph(doc, `Not included: ${excluded.join(', ')}`, cursor)
    }
  })
  return cursor
}

function fundAfterClosePaise(report, wallet) {
  const current = Number(wallet?.balancePaise) || 0
  if (report.collection?.status === 'closed') return current
  const remainingCover = sumPaise((report.people || []).map((row) => row.fundCoverPaise || 0))
  const recover = sumPaise((report.people || []).map((row) => row.fundRecoverPaise || 0))
  const cookLeaveToFund = Number(report.totals?.cookLeaveToFundPaise) || 0
  return current - remainingCover + recover + cookLeaveToFund
}

function drawSummary(doc, autoTable, report, y, { wallet } = {}) {
  const totals = report.totals || {}
  const body = [
    ['Expenses', rs(totals.totalExpensePaise)],
    ['Exact shares', rs(totals.totalExactPaise)],
    ['Rounded due', rs(totals.totalDuePaise)],
    ['Received', rs(totals.receivedPaise)],
    ['Outstanding on this collection', rs(totals.outstandingPaise)],
    ['Covered by room fund', rs(totals.fundCoveredPaise)],
    ['Recovered to room fund', rs(totals.fundRecoveredPaise)],
  ]
  if ((totals.fromFundPaise || 0) > 0) {
    body.push(['From room fund', rs(totals.fromFundPaise)])
  }
  if ((totals.cookLeaveDeductionPaise || 0) > 0 || (totals.cookLeaveToFundPaise || 0) > 0) {
    body.push(['Cook leave cut', rs(totals.cookLeaveDeductionPaise)])
    body.push(['Cook leave to room fund', rs(totals.cookLeaveToFundPaise)])
  }
  body.push(
    ['Rounding expected for room fund', signedRs(totals.fundImpactPaise)],
    ['Rounding from paid shares', signedRs(totals.paidRoundingPaise)],
    ['Added to room fund so far', signedRs(totals.appliedFundPaise)],
    ['Current room fund balance', signedRs(wallet?.balancePaise)],
    ['Room fund after close', signedRs(fundAfterClosePaise(report, wallet))],
    ['Extra on this collection', rs(totals.extraCreditPaise)],
  )
  autoTable(doc, {
    ...tableOptions(doc, {
      startY: y,
      head: [['Item', 'Amount']],
      body,
      columnStyles: { 1: { halign: 'right' } },
    }),
  })
  return afterTable(doc, y)
}

function drawPeopleTable(doc, autoTable, people, y, { closed = false } = {}) {
  const rows = people || []
  const leftoverOf = (row) => (closed ? row.settledPaise || 0 : row.leftoverCreditPaise || 0)
  const body = rows.map((row) => {
    const line = [
      row.userName || 'Member',
      rs(row.exactSharePaise),
      signedRs(row.roundingDeltaPaise),
      rs(row.roundedDuePaise),
      row.previousBalancePaise ? signedRs(row.previousBalancePaise) : '—',
      row.toPayPaise > 0 ? rs(row.toPayPaise) : rs(0),
      rs(row.memberPaidPaise ?? row.paidPaise),
      (row.fundPaidPaise || 0) > 0 ? rs(row.fundPaidPaise) : '—',
    ]
    if (closed) line.push((row.fundRecoverPaise || 0) > 0 ? rs(row.fundRecoverPaise) : '—')
    line.push(leftoverOf(row) ? signedRs(leftoverOf(row)) : '—')
    line.push(row.status || '')
    return line
  })
  const total = [
    'Total',
    rs(sumPaise(rows.map((r) => r.exactSharePaise))),
    signedRs(sumPaise(rows.map((r) => r.roundingDeltaPaise))),
    rs(sumPaise(rows.map((r) => r.roundedDuePaise))),
    '',
    rs(sumPaise(rows.map((r) => r.toPayPaise))),
    rs(sumPaise(rows.map((r) => r.memberPaidPaise ?? r.paidPaise))),
    rs(sumPaise(rows.map((r) => r.fundPaidPaise))),
  ]
  if (closed) total.push(rs(sumPaise(rows.map((r) => r.fundRecoverPaise))))
  total.push(signedRs(sumPaise(rows.map((r) => leftoverOf(r)))))
  total.push('')
  body.push(total)
  const head = [
    'Person',
    'Exact',
    'Rounding',
    'Due',
    'Wallet applied',
    'To pay',
    'Paid',
    'From room fund',
  ]
  if (closed) head.push('Recovered')
  head.push(closed ? 'Wallet after close' : 'Extra here')
  head.push('Status')
  const moneyIndexes = closed ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : [1, 2, 3, 4, 5, 6, 7, 8]
  autoTable(doc, {
    ...tableOptions(doc, {
      startY: y,
      head: [head],
      body,
      styles: {
        font: 'helvetica',
        fontSize: 6.5,
        cellPadding: 2.8,
        overflow: 'linebreak',
        valign: 'middle',
        textColor: [15, 23, 42],
        lineColor: [226, 232, 240],
        lineWidth: 0.4,
      },
      columnStyles: {
        ...moneyCols(moneyIndexes),
        0: { cellWidth: 64 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.index === body.length - 1) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fillColor = [241, 245, 249]
        }
      },
    }),
  })
  return afterTable(doc, y)
}

function drawFundMovements(doc, autoTable, movements, y) {
  if (!movements?.length) {
    return addParagraph(doc, 'No room-fund movement recorded for this collection yet.', y)
  }
  autoTable(doc, {
    ...tableOptions(doc, {
      startY: y,
      head: [['When', 'Person', 'Reason', 'Amount', 'Note']],
      body: movements.map((movement) => [
        movementDateLabel(movement) || '—',
        movement.userName || '—',
        WALLET_MOVEMENT_REASON_LABELS[movement.reason] || movement.reason || '',
        signedRs(movement.amountPaise),
        movement.note || '',
      ]),
      columnStyles: { 3: { halign: 'right' } },
    }),
  })
  return afterTable(doc, y)
}

function drawWalletRepayments(doc, autoTable, movements, y) {
  if (!movements?.length) {
    return addParagraph(doc, 'No wallet repayments were recorded before this collection.', y)
  }
  autoTable(doc, {
    ...tableOptions(doc, {
      startY: y,
      head: [['When', 'Person', 'Amount', 'Note']],
      body: movements.map((movement) => [
        movementDateLabel(movement) || '—',
        movement.userName || '—',
        signedRs(movement.amountPaise),
        movement.note || '',
      ]),
      columnStyles: { 2: { halign: 'right' } },
    }),
  })
  return afterTable(doc, y)
}

function drawPersonalWallets(doc, autoTable, people, y, { closed = false } = {}) {
  const rows = (people || []).filter((row) =>
    closed ? (row.settledPaise || 0) !== 0 : (row.leftoverCreditPaise || 0) > 0,
  )
  if (!rows.length) {
    return addParagraph(
      doc,
      closed
        ? 'No leftover was moved to a personal wallet.'
        : 'Nobody has extra on this collection.',
      y,
    )
  }
  autoTable(doc, {
    ...tableOptions(doc, {
      startY: y,
      head: [[
        'Person',
        'To pay',
        'Paid',
        closed ? 'Moved to wallet' : 'Extra on this collection',
      ]],
      body: rows.map((row) => [
        row.userName || 'Member',
        rs(row.payablePaise || row.roundedDuePaise),
        rs(row.memberPaidPaise ?? row.paidPaise),
        signedRs(closed ? row.settledPaise : row.leftoverCreditPaise),
      ]),
      columnStyles: moneyCols([1, 2, 3]),
    }),
  })
  return afterTable(doc, y)
}

function paymentWhen(payment) {
  return formatDateLabel(payment.paidOn) || String(payment.createdAt || '').slice(0, 10) || '—'
}

function paymentMethod(payment) {
  if (payment.source === PAYMENT_SOURCES.ROOM_FUND) {
    return PAYMENT_SOURCE_LABELS[PAYMENT_SOURCES.ROOM_FUND]
  }
  if (!payment.method) return ''
  return PAYMENT_METHOD_LABELS[payment.method] || payment.method
}

function drawPayments(doc, autoTable, payments, y, { includePerson = true } = {}) {
  if (!payments?.length) {
    return addParagraph(doc, 'No payments recorded yet.', y)
  }
  const head = includePerson
    ? [['When', 'Person', 'Amount', 'Method', 'Note', 'Recorded by', 'Voided']]
    : [['When', 'Amount', 'Method', 'Note', 'Voided']]
  const body = payments.map((payment) => {
    const when = paymentWhen(payment)
    const amount = rs(payment.amountPaise)
    const method = paymentMethod(payment)
    const note = payment.note || ''
    const voided = payment.voided ? 'Yes' : ''
    if (includePerson) {
      return [
        when,
        isExpenseFromFundPayment(payment) ? 'Room fund' : payment.userName || '',
        amount,
        method,
        note,
        payment.recordedByName || '',
        voided,
      ]
    }
    return [when, amount, method, note, voided]
  })
  autoTable(doc, {
    ...tableOptions(doc, {
      startY: y,
      head,
      body,
      columnStyles: includePerson
        ? { 2: { halign: 'right' }, 4: { cellWidth: 90 } }
        : { 1: { halign: 'right' } },
    }),
  })
  return afterTable(doc, y)
}

function drawCookLeave(doc, autoTable, cookLeaves, y, { userId, closed = false } = {}) {
  if (!cookLeaves?.length) return y
  let cursor = y
  for (const item of cookLeaves) {
    cursor = addParagraph(
      doc,
      [
        item.cookName || 'Cook',
        item.expenseName || 'Cook salary',
        item.monthId ? formatPeriodLabel(item.monthId) : '',
      ]
        .filter(Boolean)
        .join('  ·  '),
      cursor,
    )
    const facts = cookLeaveFactRows(item)
    if (facts.length) {
      autoTable(doc, {
        ...tableOptions(doc, {
          startY: cursor,
          head: [['Item', 'Amount']],
          body: facts.map((row) => [
            row.label,
            row.kind === 'money' ? rs(row.value) : String(row.value ?? ''),
          ]),
          columnStyles: { 1: { halign: 'right' } },
        }),
      })
      cursor = afterTable(doc, cursor)
    }
    const leaveRows = item.leaveLines?.length
      ? item.leaveLines
      : (item.leaveEntries || []).map((entry) => ({
          date: entry.date,
          period: entry.period,
          reason: entry.reason,
        }))
    if (leaveRows.length) {
      autoTable(doc, {
        ...tableOptions(doc, {
          startY: cursor,
          head: [['Date', 'Period', 'Reason']],
          body: leaveRows.map((row) => [
            formatCookLeaveDate(row.date) || row.label || '—',
            leavePeriodLine(row.period) || row.period || '',
            row.reason || '',
          ]),
        }),
      })
      cursor = afterTable(doc, cursor)
    }
    if (userId) {
      const share = memberCookLeaveShare(
        {
          amountPaise: item.amountPaise,
          perUser: item.perUser,
          cookLeave: item,
        },
        userId,
      )
      if (share.sharePaise > 0 && (item.toFundPaise || 0) > 0) {
        cursor = addParagraph(
          doc,
          `Of your ${rs(share.sharePaise)} cook salary share, ${rs(share.toFundPaise)} went to the room fund.`,
          cursor,
        )
      }
    } else if ((item.toFundPaise || 0) > 0) {
      cursor = addParagraph(
        doc,
        closed
          ? `${rs(item.toFundPaise)} held back in the room fund.`
          : `${rs(item.toFundPaise)} to the room fund at close.`,
        cursor,
      )
    }
  }
  return cursor
}

function drawRoomFundExpenses(doc, autoTable, movements, y) {
  if (!movements?.length) {
    return addParagraph(
      doc,
      "No room-fund expenses recorded in this collection's month.",
      y,
    )
  }
  autoTable(doc, {
    ...tableOptions(doc, {
      startY: y,
      head: [['When', 'Amount', 'Note']],
      body: movements.map((movement) => [
        movementDateLabel(movement) || '—',
        signedRs(movement.amountPaise),
        movement.note || '',
      ]),
      columnStyles: { 1: { halign: 'right' } },
    }),
  })
  return afterTable(doc, y)
}

export async function exportRoomReport(report, { wallet, walletMovements } = {}) {
  const { jsPDF, autoTable } = await loadPdf()
  const art = await loadPdfArt()
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const collection = report.collection
  const closed = collection.status === 'closed'
  const title = collection.title || 'Collection report'
  let y = drawPage1Letterhead(doc, art, {
    kicker: 'JAY SWAMINARAYAN  ·  ROOM FINANCE',
    title,
    meta: [
      `Due ${formatDateLabel(collection.dueDate) || collection.dueDate || '—'}`,
      `${report.totals?.personCount || (report.people || []).length} people`,
      `Generated ${todayLabel()}`,
    ].join('  ·  '),
  })

  y = addSection(doc, 'Summary', y)
  y = drawSummary(doc, autoTable, report, y, { wallet })

  y = addSection(doc, 'Expenses', y)
  y = drawExpenseBlocks(doc, autoTable, expensesForPdf(report), y)

  if ((report.cookLeaves || []).length) {
    y = addSection(doc, 'Cook leave', y)
    y = drawCookLeave(doc, autoTable, report.cookLeaves, y, { closed })
  }

  y = addSection(doc, 'Room fund', y)
  y = addParagraph(doc, fundCopy(report), y)
  y = addParagraph(doc, `Current room fund balance ${rs(wallet?.balancePaise)}.`, y)
  y = drawFundMovements(doc, autoTable, report.fundMovements, y)

  y = addSection(doc, 'Wallet repayments before this collection', y)
  y = drawWalletRepayments(doc, autoTable, report.walletRepayments, y)

  y = addSection(doc, 'Room fund expenses this month', y)
  y = drawRoomFundExpenses(
    doc,
    autoTable,
    roomFundExpensesForCollection(walletMovements, collection),
    y,
  )

  y = addSection(doc, 'Who pays what', y)
  y = drawPeopleTable(doc, autoTable, report.people, y, { closed })

  y = addSection(doc, closed ? 'Moved to wallets' : 'Extra on this collection', y)
  y = addParagraph(
    doc,
    closed
      ? 'Leftover after close lives in that person\'s wallet. It is not added to the room fund.'
      : 'Extra paid above this collection\'s to-pay stays here until close. It is not added to the room fund.',
    y,
  )
  y = drawPersonalWallets(doc, autoTable, report.people, y, { closed })

  y = addSection(doc, 'Payments', y)
  drawPayments(doc, autoTable, report.payments, y)

  applyPdfChrome(doc, art, { title, subtitle: `${title}  ·  room report` })
  doc.save(`${fileSafe(title)}-room.pdf`)
}

export async function exportMemberReport(report, userId) {
  const { jsPDF, autoTable } = await loadPdf()
  const art = await loadPdfArt()
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const collection = report.collection
  const row = (report.people || []).find((p) => p.userId === userId)
  if (!row) {
    throw new Error('You are not on this collection.')
  }
  const closed = collection.status === 'closed'
  const title = collection.title || 'Collection'
  const heading = `${title}  ·  ${row.userName}`
  let y = drawPage1Letterhead(doc, art, {
    kicker: 'JAY SWAMINARAYAN  ·  ROOM FINANCE',
    title: heading,
    meta: [
      `Due ${formatDateLabel(collection.dueDate) || collection.dueDate || '—'}`,
      `Generated ${todayLabel()}`,
    ].join('  ·  '),
  })

  y = addSection(doc, 'Your summary', y)
  const walletLine = row.creditPaise > 0
    ? ['Wallet applied (credit)', rs(row.creditPaise)]
    : row.arrearsPaise > 0
      ? ['Wallet applied (remaining)', rs(row.arrearsPaise)]
      : ['Wallet applied', rs(0)]
  autoTable(doc, {
    ...tableOptions(doc, {
      startY: y,
      head: [['Item', 'Amount']],
      body: [
        ['Exact share', rs(row.exactSharePaise)],
        ['Rounding', signedRs(row.roundingDeltaPaise)],
        ['This due', rs(row.roundedDuePaise)],
        walletLine,
        ['To pay', rs(row.payablePaise || 0)],
        ['Paid on this collection', rs(row.memberPaidPaise ?? row.paidPaise)],
        ['From room fund', rs(row.fundPaidPaise || 0)],
        closed
          ? ['Recovered to room fund', rs(row.fundRecoverPaise || 0)]
          : null,
        closed
          ? (row.settledPaise || 0) < 0
            ? ['Owes room wallet', rs(-(row.settledPaise || 0))]
            : ['Moved to wallet', signedRs(row.settledPaise || 0)]
          : ['Extra on this collection', rs(row.leftoverCreditPaise)],
        ['To pay now', rs(row.toPayPaise)],
        ['Status', row.status || ''],
      ].filter(Boolean),
      columnStyles: { 1: { halign: 'right' } },
    }),
  })
  y = afterTable(doc, y)

  if ((report.cookLeaves || []).length) {
    y = addSection(doc, 'Cook leave', y)
    y = drawCookLeave(doc, autoTable, report.cookLeaves, y, { userId, closed })
  }

  y = addSection(doc, 'Expenses and shares', y)
  y = addParagraph(
    doc,
    'Every expense in this collection is listed with its full amount and each person’s share. Your row is highlighted.',
    y,
  )
  y = drawExpenseBlocks(doc, autoTable, expensesForPdf(report), y, { focusUserId: userId })

  y = addSection(doc, closed ? 'Moved to wallets' : 'Extra on this collection', y)
  y = addParagraph(
    doc,
    closed
      ? 'Leftover after close lives in that person\'s wallet. It is not added to the room fund.'
      : 'Extra paid above this collection\'s to-pay stays here until close. It is not added to the room fund.',
    y,
  )
  y = drawPersonalWallets(doc, autoTable, report.people, y, { closed })

  y = addSection(doc, 'Your payments', y)
  y = drawPayments(
    doc,
    autoTable,
    (report.payments || []).filter((payment) => payment.userId === userId),
    y,
    { includePerson: false },
  )

  const mineMoves = (report.fundMovements || []).filter((movement) => {
    const duePeople = report.people || []
    const person = duePeople.find((p) => p.userId === userId)
    return movement.userName === person?.userName || movement.userId === userId
  })
  const mineRepay = (report.walletRepayments || []).filter((movement) => movement.userId === userId)
  if (mineMoves.length || mineRepay.length) {
    y = addSection(doc, 'Your room fund lines', y)
    if (mineRepay.length) {
      if (mineMoves.length) y = drawFundMovements(doc, autoTable, mineMoves, y)
      y = addParagraph(doc, 'Wallet repayments before this collection', y)
      drawWalletRepayments(doc, autoTable, mineRepay, y)
    } else {
      drawFundMovements(doc, autoTable, mineMoves, y)
    }
  }

  applyPdfChrome(doc, art, { title: heading, subtitle: `${title}  ·  ${row.userName}` })
  doc.save(`${fileSafe(title)}-${fileSafe(row.userName)}.pdf`)
}
