/** Default kitchen + cleaning stock — seeded into Firestore (admin can edit after) */

export const DEFAULT_STOCK_SEED_GROUPS = [
  { id: 'vaghar-masala', name: 'વઘારના મસાલા', linkToMenu: true, order: 0 },
  { id: 'powder-masala', name: 'પાવડર મસાલા', linkToMenu: true, order: 1 },
  { id: 'lot-aato', name: 'લોટ / આટો', linkToMenu: true, order: 2 },
  { id: 'dal-kathol', name: 'દાળ / કઠોળ', linkToMenu: true, order: 3 },
  { id: 'anaj-chokha', name: 'અનાજ / ચોખા', linkToMenu: true, order: 4 },
  { id: 'suka-meva', name: 'સૂકા મેવા / બીજ', linkToMenu: true, order: 5 },
  { id: 'dabba-packet', name: 'ડબ્બા / પેકેટ', linkToMenu: true, order: 6 },
  { id: 'cha-coffee', name: 'ચા / કોફી / પીણાં', linkToMenu: true, order: 7 },
  { id: 'room-safai', name: 'રૂમ સફાઈ', linkToMenu: false, order: 8 },
  { id: 'vegetables', name: 'Vegetables', linkToMenu: true, order: 9 },
]

const RAW_STOCK_SEED_ITEMS = [
  // વઘારના મસાલા
  { groupId: 'vaghar-masala', name: 'મીઠું', unit: 'kg', needPerIteration: 3 },
  { groupId: 'vaghar-masala', name: 'ખાંડ', unit: 'kg', needPerIteration: 8 },
  { groupId: 'vaghar-masala', name: 'ગોળ', unit: 'kg', needPerIteration: 2 },
  { groupId: 'vaghar-masala', name: 'આંબલી', unit: 'g', needPerIteration: 500 },
  { groupId: 'vaghar-masala', name: 'રાઈ', unit: 'g', needPerIteration: 500 },
  { groupId: 'vaghar-masala', name: 'જીરું (આખુ)', unit: 'g', needPerIteration: 500 },
  { groupId: 'vaghar-masala', name: 'મેથી', unit: 'g', needPerIteration: 250 },
  { groupId: 'vaghar-masala', name: 'અજમો', unit: 'g', needPerIteration: 250 },
  { groupId: 'vaghar-masala', name: 'ધાણા (આખા)', unit: 'g', needPerIteration: 150 },
  { groupId: 'vaghar-masala', name: 'મરી', unit: 'g', needPerIteration: 100 },
  { groupId: 'vaghar-masala', name: 'લવિંગ', unit: 'g', needPerIteration: 100 },
  { groupId: 'vaghar-masala', name: 'તજ', unit: 'g', needPerIteration: 100 },
  { groupId: 'vaghar-masala', name: 'એલચી', unit: 'g', needPerIteration: 50 },
  { groupId: 'vaghar-masala', name: 'લાલ સૂકા મારચા', unit: 'g', needPerIteration: 150 },
  { groupId: 'vaghar-masala', name: 'તમાલ પત્ર', unit: 'pkt', needPerIteration: 1 },
  { groupId: 'vaghar-masala', name: 'બાદિયા', unit: 'g', needPerIteration: 100 },
  { groupId: 'vaghar-masala', name: 'ઘી', unit: 'lit', needPerIteration: 3 },
  { groupId: 'vaghar-masala', name: 'તેલ', unit: 'kg', needPerIteration: 20 },

  // પાવડર મસાલા
  { groupId: 'powder-masala', name: 'હળદર (પાવડર)', unit: 'kg', needPerIteration: 1 },
  { groupId: 'powder-masala', name: 'લાલ મરચું (પાવડર)', unit: 'kg', needPerIteration: 1.5 },
  { groupId: 'powder-masala', name: 'ધાણાજીરું પાવડર', unit: 'kg', needPerIteration: 1 },
  { groupId: 'powder-masala', name: 'ગરમ મસાલો', unit: 'pkt', needPerIteration: 1 },
  { groupId: 'powder-masala', name: 'સાંભાર મસાલો', unit: 'pkt', needPerIteration: 1 },
  { groupId: 'powder-masala', name: 'પાવ ભાજી મસાલો', unit: 'pkt', needPerIteration: 1 },
  { groupId: 'powder-masala', name: 'પનીર મસાલો', unit: 'pkt', needPerIteration: 0 },
  { groupId: 'powder-masala', name: 'ચાટ મસાલો', unit: 'pkt', needPerIteration: 1 },
  { groupId: 'powder-masala', name: 'જલજીરા પાવડર', unit: 'pkt', needPerIteration: 0 },
  { groupId: 'powder-masala', name: 'અમચૂર પાવડર', unit: 'pkt', needPerIteration: 1 },
  { groupId: 'powder-masala', name: 'સંચળ પાવડર', unit: 'g', needPerIteration: 150 },
  { groupId: 'powder-masala', name: 'કાશ્મીરી મરચું', unit: 'kg', needPerIteration: 1 },

  // લોટ / આટો
  { groupId: 'lot-aato', name: 'મેંદા લોટ', unit: 'kg', needPerIteration: 1 },
  { groupId: 'lot-aato', name: 'બેસન', unit: 'kg', needPerIteration: 2 },
  { groupId: 'lot-aato', name: 'સોજી / રવો', unit: 'g', needPerIteration: 250 },
  { groupId: 'lot-aato', name: 'કોર્નફ્લોર', unit: 'g', needPerIteration: 250 },

  // દાળ / કઠોળ
  { groupId: 'dal-kathol', name: 'તુવેરની દાળ', unit: 'kg', needPerIteration: 4 },
  { groupId: 'dal-kathol', name: 'મગની દાળ', unit: 'kg', needPerIteration: 3 },
  { groupId: 'dal-kathol', name: 'મગ', unit: 'kg', needPerIteration: 4 },
  { groupId: 'dal-kathol', name: 'મોગર દાળ', unit: 'kg', needPerIteration: 2 },
  { groupId: 'dal-kathol', name: 'અડદની દાળ', unit: 'kg', needPerIteration: 3 },
  { groupId: 'dal-kathol', name: 'ચણાની દાળ', unit: 'kg', needPerIteration: 4 },
  { groupId: 'dal-kathol', name: 'ચણા', unit: 'kg', needPerIteration: 3 },
  { groupId: 'dal-kathol', name: 'છોલે', unit: 'kg', needPerIteration: 2 },
  { groupId: 'dal-kathol', name: 'રાજમા', unit: 'kg', needPerIteration: 1 },
  { groupId: 'dal-kathol', name: 'લાલ ચોળા', unit: 'kg', needPerIteration: 2 },
  { groupId: 'dal-kathol', name: 'વટાણા (સૂકા)', unit: 'kg', needPerIteration: 2 },
  { groupId: 'dal-kathol', name: 'વટાણા (ફ્રોઝન)', unit: 'kg', needPerIteration: 1 },

  // અનાજ / ચોખા
  { groupId: 'anaj-chokha', name: 'બાસમતી ચોખા', unit: 'kg', needPerIteration: 5 },
  { groupId: 'anaj-chokha', name: 'ખીચડીયા ચોખા', unit: 'kg', needPerIteration: 4 },
  { groupId: 'anaj-chokha', name: 'ચોખાના પોહા / પૌઆ', unit: 'kg', needPerIteration: 1 },
  { groupId: 'anaj-chokha', name: 'સાબુદાણા', unit: 'kg', needPerIteration: 3 },
  { groupId: 'anaj-chokha', name: 'મોરૈયા', unit: 'g', needPerIteration: 500 },
  { groupId: 'anaj-chokha', name: 'શીંગદાણા', unit: 'kg', needPerIteration: 2 },
  { groupId: 'anaj-chokha', name: 'દાળિયા', unit: 'kg', needPerIteration: 1 },

  // સૂકા મેવા / બીજ
  { groupId: 'suka-meva', name: 'બદામ', unit: 'g', needPerIteration: 0 },
  { groupId: 'suka-meva', name: 'કાજુ', unit: 'g', needPerIteration: 0 },
  { groupId: 'suka-meva', name: 'કિસમિસ', unit: 'g', needPerIteration: 0 },
  { groupId: 'suka-meva', name: 'ખજૂર', unit: 'g', needPerIteration: 1000 },

  // ડબ્બા / પેકેટ
  { groupId: 'dabba-packet', name: 'ટામેટા સોસ', unit: 'pkt', needPerIteration: 1 },
  { groupId: 'dabba-packet', name: 'મેયોનેઝ', unit: 'g', needPerIteration: 0 },
  { groupId: 'dabba-packet', name: 'ચીઝ (પ્રોસેસ્ડ)', unit: 'g', needPerIteration: 0 },
  { groupId: 'dabba-packet', name: 'પનીર', unit: 'g', needPerIteration: 0 },

  // ચા / કોફી / પીણાં
  { groupId: 'cha-coffee', name: 'હોર્લિક્સ / બોર્નવિટા', unit: 'kg', needPerIteration: 0 },

  // રૂમ સફાઈ
  { groupId: 'room-safai', name: 'વાસણ ઘસવાનું લીકવીડ', unit: 'lit', needPerIteration: 10 },
  { groupId: 'room-safai', name: 'સ્ક્રબર', unit: 'count', needPerIteration: 5 },
  { groupId: 'room-safai', name: 'મેચબોક્સ (બાકસ)', unit: 'count', needPerIteration: 1 },
  { groupId: 'room-safai', name: 'ગેસ લાઇટર', unit: 'count', needPerIteration: 1 },
  { groupId: 'room-safai', name: 'હાર્પિક', unit: 'count', needPerIteration: 2 },
  { groupId: 'room-safai', name: 'ફિનાઈલની ગોળીયો', unit: 'pkt', needPerIteration: 1 },
  { groupId: 'room-safai', name: 'ફિનાઈલ લીકવીડ', unit: 'lit', needPerIteration: 1 },
  { groupId: 'room-safai', name: 'હાથ ધોવાના સાબુ', unit: 'count', needPerIteration: 10 },
  { groupId: 'room-safai', name: 'કપડા ધોવાનો પાવડર', unit: 'kg', needPerIteration: 5 },
]

export const DEFAULT_STOCK_SEED_ITEMS = RAW_STOCK_SEED_ITEMS.map((item) => ({
  ...item,
  iterationPeriod: item.iterationPeriod ?? 'month',
}))
