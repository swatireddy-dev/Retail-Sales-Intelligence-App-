export interface WeeklySalesRecord {
  week_start_date: string;
  region: string;
  store_id: string;
  store_name: string;
  city: string;
  store_format: string;
  product_category: string;
  footfall: number;
  transactions: number;
  units_sold: number;
  gross_sales: number;
  discount_amount: number;
  net_sales: number;
  sales_target: number;
  inventory_on_hand: number;
  stockouts: number; // Number of stockout events or days
  returns_amount: number;
  customer_rating: number; // 1.0 to 5.0
  marketing_spend: number;
}

export interface StoreRecord {
  store_id: string;
  store_name: string;
  region: string;
  city: string;
  store_format: string;
}

export const INITIAL_STORES: StoreRecord[] = [
  { store_id: "ST-101", store_name: "Boston Copley Flagship", region: "Northeast", city: "Boston", store_format: "Flagship" },
  { store_id: "ST-102", store_name: "NY Midtown Superstore", region: "Northeast", city: "New York", store_format: "Superstore" },
  { store_id: "ST-103", store_name: "Atlanta Buckhead Flagship", region: "Southeast", city: "Atlanta", store_format: "Flagship" },
  { store_id: "ST-104", store_name: "Miami Lincoln Express", region: "Southeast", city: "Miami", store_format: "Express" },
  { store_id: "ST-105", store_name: "Chicago Mag Mile Flagship", region: "Midwest", city: "Chicago", store_format: "Flagship" },
  { store_id: "ST-106", store_name: "Dallas Galleria Superstore", region: "Southwest", city: "Dallas", store_format: "Superstore" },
  { store_id: "ST-107", store_name: "SF Union Square Flagship", region: "West", city: "San Francisco", store_format: "Flagship" },
  { store_id: "ST-108", store_name: "LA Century City Superstore", region: "West", city: "Los Angeles", store_format: "Superstore" },
  { store_id: "ST-109", store_name: "Seattle Pike Express", region: "West", city: "Seattle", store_format: "Express" }
];

// Helper to generate full relational weekly records procedurally for the base template
export function generateInitialWeeklySales(): WeeklySalesRecord[] {
  const records: WeeklySalesRecord[] = [];
  const weeks = ["2026-06-01", "2026-06-08", "2026-06-15", "2026-06-22", "2026-06-29"];
  const categories = ["Apparel", "Electronics", "Home", "Grocery", "Beauty"];

  const categoryBaseMultipliers: Record<string, { sales: number; refundRate: number; discountRate: number; rating: number }> = {
    Apparel: { sales: 25000, refundRate: 0.10, discountRate: 0.15, rating: 4.4 },
    Electronics: { sales: 45000, refundRate: 0.05, discountRate: 0.08, rating: 4.2 },
    Home: { sales: 18000, refundRate: 0.06, discountRate: 0.10, rating: 4.5 },
    Grocery: { sales: 30000, refundRate: 0.01, discountRate: 0.04, rating: 4.6 },
    Beauty: { sales: 15000, refundRate: 0.04, discountRate: 0.12, rating: 4.3 }
  };

  const formatMultipliers: Record<string, number> = {
    Flagship: 1.4,
    Superstore: 1.8,
    Express: 0.5,
    Standard: 1.0
  };

  const weekMultipliers: Record<string, number> = {
    "2026-06-01": 1.0,
    "2026-06-08": 1.08,
    "2026-06-15": 0.95,
    "2026-06-22": 1.15,
    "2026-06-29": 1.25 // End of month rush
  };

  // Generate deterministic/stable pseudo-random metrics to avoid visual flicker
  let seed = 42;
  const pseudoRandom = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  INITIAL_STORES.forEach(store => {
    weeks.forEach(week => {
      categories.forEach(cat => {
        const catBase = categoryBaseMultipliers[cat];
        const fmtMult = formatMultipliers[store.store_format] || 1.0;
        const weekMult = weekMultipliers[week] || 1.0;
        const noise = 0.85 + pseudoRandom() * 0.3; // ±15% noise

        const gross_sales = Math.round(catBase.sales * fmtMult * weekMult * noise);
        const discount_amount = Math.round(gross_sales * (catBase.discountRate + (pseudoRandom() * 0.04 - 0.02)));
        const net_sales = gross_sales - discount_amount;
        const sales_target = Math.round(net_sales * (0.9 + pseudoRandom() * 0.25)); // targets vary around net sales
        
        const avgBasketValue = cat === "Electronics" ? 180 : cat === "Home" ? 110 : cat === "Apparel" ? 65 : cat === "Beauty" ? 45 : 32;
        const transactions = Math.round(net_sales / (avgBasketValue + (pseudoRandom() * 10 - 5)));
        const footfall = Math.round(transactions * (2.2 + pseudoRandom() * 1.5));
        const units_sold = Math.round(transactions * (1.2 + pseudoRandom() * 1.8));

        const returns_amount = Math.round(net_sales * (catBase.refundRate + (pseudoRandom() * 0.03 - 0.015)));
        const inventory_on_hand = Math.round(net_sales * (1.5 + pseudoRandom() * 2.0));
        
        // Stockouts occurrences: Higher for high performing weeks or lower inventory
        let stockouts = 0;
        if (pseudoRandom() > 0.8) {
          stockouts = Math.floor(pseudoRandom() * 4) + 1;
        }

        const customer_rating = Math.min(5.0, Math.max(1.0, parseFloat((catBase.rating + (pseudoRandom() * 0.6 - 0.3)).toFixed(1))));
        const marketing_spend = Math.round(gross_sales * (0.02 + pseudoRandom() * 0.04));

        records.push({
          week_start_date: week,
          region: store.region,
          store_id: store.store_id,
          store_name: store.store_name,
          city: store.city,
          store_format: store.store_format,
          product_category: cat,
          footfall,
          transactions,
          units_sold,
          gross_sales,
          discount_amount,
          net_sales,
          sales_target,
          inventory_on_hand,
          stockouts,
          returns_amount,
          customer_rating,
          marketing_spend
        });
      });
    });
  });

  return records;
}

// Global Aggregated Metrics for the new dashboard
export function calculateAdvancedMetrics(records: WeeklySalesRecord[]) {
  const recordCount = records.length;
  let totalGrossSales = 0;
  let totalDiscountAmount = 0;
  let totalNetSales = 0;
  let totalSalesTarget = 0;
  let totalTransactions = 0;
  let totalReturnsAmount = 0;
  let totalFootfall = 0;
  let totalUnitsSold = 0;
  let totalStockouts = 0;
  let totalMarketingSpend = 0;
  let sumRating = 0;

  // Track regional matrices
  const regionMetrics: Record<string, { netSales: number; target: number; returns: number; count: number }> = {
    Northeast: { netSales: 0, target: 0, returns: 0, count: 0 },
    Southeast: { netSales: 0, target: 0, returns: 0, count: 0 },
    Midwest: { netSales: 0, target: 0, returns: 0, count: 0 },
    Southwest: { netSales: 0, target: 0, returns: 0, count: 0 },
    West: { netSales: 0, target: 0, returns: 0, count: 0 }
  };

  // Track category matrices
  const categoryMetrics: Record<string, { netSales: number; target: number; returns: number; discount: number; gross: number; stockouts: number; count: number }> = {};

  // Track weekly trend matrices
  const weeklyMetrics: Record<string, { netSales: number; target: number; transactions: number }> = {};

  // Track store matrices
  const storeMetrics: Record<string, { store_id: string; store_name: string; region: string; city: string; format: string; netSales: number; target: number; transactions: number; returns: number; ratingSum: number; ratingCount: number; stockouts: number; inventory: number }> = {};

  records.forEach(r => {
    totalGrossSales += r.gross_sales;
    totalDiscountAmount += r.discount_amount;
    totalNetSales += r.net_sales;
    totalSalesTarget += r.sales_target;
    totalTransactions += r.transactions;
    totalReturnsAmount += r.returns_amount;
    totalFootfall += r.footfall;
    totalUnitsSold += r.units_sold;
    totalStockouts += r.stockouts;
    totalMarketingSpend += r.marketing_spend;
    sumRating += r.customer_rating;

    // Region Accumulation
    if (regionMetrics[r.region]) {
      regionMetrics[r.region].netSales += r.net_sales;
      regionMetrics[r.region].target += r.sales_target;
      regionMetrics[r.region].returns += r.returns_amount;
      regionMetrics[r.region].count++;
    } else {
      regionMetrics[r.region] = { netSales: r.net_sales, target: r.sales_target, returns: r.returns_amount, count: 1 };
    }

    // Category Accumulation
    if (!categoryMetrics[r.product_category]) {
      categoryMetrics[r.product_category] = { netSales: 0, target: 0, returns: 0, discount: 0, gross: 0, stockouts: 0, count: 0 };
    }
    categoryMetrics[r.product_category].netSales += r.net_sales;
    categoryMetrics[r.product_category].target += r.sales_target;
    categoryMetrics[r.product_category].returns += r.returns_amount;
    categoryMetrics[r.product_category].discount += r.discount_amount;
    categoryMetrics[r.product_category].gross += r.gross_sales;
    categoryMetrics[r.product_category].stockouts += r.stockouts;
    categoryMetrics[r.product_category].count++;

    // Weekly Trend Accumulation
    if (!weeklyMetrics[r.week_start_date]) {
      weeklyMetrics[r.week_start_date] = { netSales: 0, target: 0, transactions: 0 };
    }
    weeklyMetrics[r.week_start_date].netSales += r.net_sales;
    weeklyMetrics[r.week_start_date].target += r.sales_target;
    weeklyMetrics[r.week_start_date].transactions += r.transactions;

    // Store Accumulation
    const storeKey = r.store_id || r.store_name;
    if (!storeMetrics[storeKey]) {
      storeMetrics[storeKey] = {
        store_id: r.store_id,
        store_name: r.store_name,
        region: r.region,
        city: r.city,
        format: r.store_format,
        netSales: 0,
        target: 0,
        transactions: 0,
        returns: 0,
        ratingSum: 0,
        ratingCount: 0,
        stockouts: 0,
        inventory: 0
      };
    }
    storeMetrics[storeKey].netSales += r.net_sales;
    storeMetrics[storeKey].target += r.sales_target;
    storeMetrics[storeKey].transactions += r.transactions;
    storeMetrics[storeKey].returns += r.returns_amount;
    storeMetrics[storeKey].ratingSum += r.customer_rating;
    storeMetrics[storeKey].ratingCount++;
    storeMetrics[storeKey].stockouts += r.stockouts;
    storeMetrics[storeKey].inventory = Math.max(storeMetrics[storeKey].inventory, r.inventory_on_hand); // Track peak/representative inventory
  });

  // Calculate high-level rates
  const targetAchievement = totalSalesTarget > 0 ? (totalNetSales / totalSalesTarget) * 100 : 0;
  const averageTransactionValue = totalTransactions > 0 ? totalNetSales / totalTransactions : 0;
  const returnRate = totalNetSales > 0 ? (totalReturnsAmount / totalNetSales) * 100 : 0;
  const discountRate = totalGrossSales > 0 ? (totalDiscountAmount / totalGrossSales) * 100 : 0;
  const averageRating = recordCount > 0 ? sumRating / recordCount : 0;

  // Determine top and bottom regions
  let topRegion = "Northeast";
  let maxSales = -1;
  let bottomRegion = "Southwest";
  let minSales = Infinity;

  Object.entries(regionMetrics).forEach(([reg, metrics]) => {
    if (metrics.netSales > maxSales) {
      maxSales = metrics.netSales;
      topRegion = reg;
    }
    if (metrics.netSales < minSales && metrics.netSales > 0) {
      minSales = metrics.netSales;
      bottomRegion = reg;
    }
  });

  // Identify stores missing target
  const storesList = Object.values(storeMetrics).map(s => {
    const ach = s.target > 0 ? (s.netSales / s.target) * 100 : 0;
    const avgRating = s.ratingCount > 0 ? s.ratingSum / s.ratingCount : 0;
    return {
      ...s,
      achievement: Math.round(ach),
      avgRating
    };
  });

  const storesMissingTarget = storesList
    .filter(s => s.achievement < 100)
    .sort((a, b) => a.achievement - b.achievement);

  // Identify high return categories (refundRate > threshold)
  const categorySummaryList = Object.entries(categoryMetrics).map(([cat, met]) => {
    const retRate = met.netSales > 0 ? (met.returns / met.netSales) * 100 : 0;
    const discRate = met.gross > 0 ? (met.discount / met.gross) * 100 : 0;
    return {
      category: cat,
      netSales: met.netSales,
      returns: met.returns,
      returnRate: retRate,
      discountRate: discRate,
      stockouts: met.stockouts
    };
  }).sort((a, b) => b.returnRate - a.returnRate);

  return {
    recordCount,
    totalGrossSales,
    totalDiscountAmount,
    totalNetSales,
    totalSalesTarget,
    totalTransactions,
    totalReturnsAmount,
    totalFootfall,
    totalUnitsSold,
    totalStockouts,
    totalMarketingSpend,
    targetAchievement,
    averageTransactionValue,
    returnRate,
    discountRate,
    averageRating,
    topRegion,
    bottomRegion,
    regionMetrics,
    categoryMetrics: categorySummaryList,
    weeklyMetrics,
    storesList,
    storesMissingTarget,
    highReturnCategories: categorySummaryList.slice(0, 3)
  };
}

// Ingestion structures and templates
export function getWeeklySalesTemplateCSV(): string {
  return `week_start_date,region,store_id,store_name,city,store_format,product_category,footfall,transactions,units_sold,gross_sales,discount_amount,net_sales,sales_target,inventory_on_hand,stockouts,returns_amount,customer_rating,marketing_spend
2026-06-01,Northeast,ST-101,Boston Copley Flagship,Boston,Flagship,Apparel,98400,32800,58200,2450000,367500,2082500,2000000,4500000,2,208250,4.6,50000
2026-06-01,Northeast,ST-101,Boston Copley Flagship,Boston,Flagship,Electronics,45000,18200,24000,3100000,248000,2852000,2800000,5000000,0,142600,4.3,35000
2026-06-01,Northeast,ST-102,NY Midtown Superstore,New York,Superstore,Grocery,124000,51200,98000,1850000,74000,1776000,1800000,2200000,1,17760,4.7,20000
2026-06-01,West,ST-107,SF Union Square Flagship,San Francisco,Flagship,Beauty,68000,24500,41000,1500000,180000,1320000,1250000,3200000,4,52800,4.5,45000
2026-06-08,Southeast,ST-103,Atlanta Buckhead Flagship,Atlanta,Flagship,Home,38000,12100,19500,980000,98000,882000,900000,2100000,0,52920,4.4,18000
2026-06-08,Southwest,ST-106,Dallas Galleria Superstore,Dallas,Superstore,Electronics,85000,34200,51000,4200000,336000,3864000,4000000,8000000,1,193200,4.1,80000`;
}

export function getStoreTemplateCSV(): string {
  return `store_id,store_name,region,city,store_format
ST-101,Boston Copley Flagship,Northeast,Boston,Flagship
ST-102,NY Midtown Superstore,Northeast,New York,Superstore
ST-103,Atlanta Buckhead Flagship,Southeast,Atlanta,Flagship
ST-104,Miami Lincoln Express,Southeast,Miami,Express
ST-105,Chicago Mag Mile Flagship,Midwest,Chicago,Flagship
ST-106,Dallas Galleria Superstore,Southwest,Dallas,Superstore
ST-107,SF Union Square Flagship,West,San Francisco,Flagship
ST-108,LA Century City Superstore,West,Los Angeles,Superstore
ST-109,Seattle Pike Express,West,Seattle,Express`;
}

// Parsers with rigorous fallback mapping for column name casing/spaces/underscores
export function parseWeeklySalesCSV(csvText: string): WeeklySalesRecord[] {
  const lines = csvText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length < 2) {
    throw new Error("Weekly Sales CSV must contain a header row and at least one row of metrics.");
  }

  const parseRow = (row: string): string[] => {
    const result: string[] = [];
    let insideQuotes = false;
    let entry = "";

    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        result.push(entry.trim());
        entry = "";
      } else {
        entry += char;
      }
    }
    result.push(entry.trim());
    return result.map(val => val.replace(/^"|"$/g, '').trim());
  };

  const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/[\s_]+/g, ''));

  const findIdx = (syns: string[]): number => {
    return headers.findIndex(h => syns.some(syn => h.includes(syn.replace(/[\s_]+/g, ''))));
  };

  const weekIdx = findIdx(["weekstartdate", "week", "date"]);
  const regionIdx = findIdx(["region", "zone", "territory"]);
  const idIdx = findIdx(["storeid", "id"]);
  const nameIdx = findIdx(["storename", "name", "location"]);
  const cityIdx = findIdx(["city", "town"]);
  const formatIdx = findIdx(["storeformat", "format", "type"]);
  const categoryIdx = findIdx(["productcategory", "category", "merchandise"]);
  
  // Metrics indices
  const footIdx = findIdx(["footfall", "traffic", "visitors"]);
  const transIdx = findIdx(["transactions", "orders", "baskets"]);
  const unitsIdx = findIdx(["unitssold", "units", "quantity"]);
  const grossIdx = findIdx(["grosssales", "gross"]);
  const discIdx = findIdx(["discountamount", "discount"]);
  const netIdx = findIdx(["netsales", "net", "revenue"]);
  const targetIdx = findIdx(["salestarget", "target", "budget"]);
  const invIdx = findIdx(["inventoryonhand", "inventory", "stock"]);
  const stockoutIdx = findIdx(["stockouts", "stockout", "outages"]);
  const returnsIdx = findIdx(["returnsamount", "returns", "refunds"]);
  const ratingIdx = findIdx(["customerrating", "rating", "csi", "score"]);
  const marketingIdx = findIdx(["marketingspend", "marketing", "ads"]);

  if (weekIdx === -1 || idIdx === -1 || netIdx === -1) {
    throw new Error("Weekly Sales CSV missing required identifiers. Make sure columns like 'week_start_date', 'store_id', and 'net_sales' are defined.");
  }

  const parsedRecords: WeeklySalesRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseRow(lines[i]);
    if (values.length < 3) continue;

    const parseNum = (v: string): number => {
      if (!v) return 0;
      const clean = v.replace(/[^0-9.-]/g, '');
      const parsed = parseFloat(clean);
      return isNaN(parsed) ? 0 : parsed;
    };

    const week_start_date = values[weekIdx] || "2026-06-01";
    const region = values[regionIdx] || "Northeast";
    const store_id = values[idIdx] || `ST-${100 + i}`;
    const store_name = nameIdx !== -1 ? values[nameIdx] : `Store (${store_id})`;
    const city = cityIdx !== -1 ? values[cityIdx] : "Urban Node";
    const store_format = formatIdx !== -1 ? values[formatIdx] : "Standard";
    const product_category = categoryIdx !== -1 ? values[categoryIdx] : "General";

    const footfall = footIdx !== -1 ? parseNum(values[footIdx]) : 10000;
    const transactions = transIdx !== -1 ? parseNum(values[transIdx]) : Math.round(footfall * 0.3);
    const units_sold = unitsIdx !== -1 ? parseNum(values[unitsIdx]) : Math.round(transactions * 1.8);
    const gross_sales = grossIdx !== -1 ? parseNum(values[grossIdx]) : 15000;
    const discount_amount = discIdx !== -1 ? parseNum(values[discIdx]) : Math.round(gross_sales * 0.08);
    const net_sales = netIdx !== -1 ? parseNum(values[netIdx]) : gross_sales - discount_amount;
    const sales_target = targetIdx !== -1 ? parseNum(values[targetIdx]) : Math.round(net_sales * 0.95);
    const inventory_on_hand = invIdx !== -1 ? parseNum(values[invIdx]) : Math.round(net_sales * 2);
    const stockouts = stockoutIdx !== -1 ? parseNum(values[stockoutIdx]) : 0;
    const returns_amount = returnsIdx !== -1 ? parseNum(values[returnsIdx]) : Math.round(net_sales * 0.04);
    const customer_rating = ratingIdx !== -1 ? parseNum(values[ratingIdx]) : 4.3;
    const marketing_spend = marketingIdx !== -1 ? parseNum(values[marketingIdx]) : Math.round(net_sales * 0.03);

    parsedRecords.push({
      week_start_date,
      region,
      store_id,
      store_name,
      city,
      store_format,
      product_category,
      footfall,
      transactions,
      units_sold,
      gross_sales,
      discount_amount,
      net_sales,
      sales_target,
      inventory_on_hand,
      stockouts,
      returns_amount,
      customer_rating,
      marketing_spend
    });
  }

  return parsedRecords;
}

export function parseStoreCSV(csvText: string): StoreRecord[] {
  const lines = csvText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length < 2) {
    throw new Error("Stores CSV must contain a header row and at least one store listing row.");
  }

  const parseRow = (row: string): string[] => {
    const result: string[] = [];
    let insideQuotes = false;
    let entry = "";

    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        result.push(entry.trim());
        entry = "";
      } else {
        entry += char;
      }
    }
    result.push(entry.trim());
    return result.map(val => val.replace(/^"|"$/g, '').trim());
  };

  const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/[\s_]+/g, ''));

  const findIdx = (syns: string[]): number => {
    return headers.findIndex(h => syns.some(syn => h.includes(syn.replace(/[\s_]+/g, ''))));
  };

  const idIdx = findIdx(["storeid", "id"]);
  const nameIdx = findIdx(["storename", "name", "location"]);
  const regionIdx = findIdx(["region", "zone", "territory"]);
  const cityIdx = findIdx(["city", "town"]);
  const formatIdx = findIdx(["storeformat", "format", "type"]);

  if (idIdx === -1 || nameIdx === -1) {
    throw new Error("Stores CSV missing 'store_id' or 'store_name' columns.");
  }

  const parsedStores: StoreRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseRow(lines[i]);
    if (values.length < 2) continue;

    parsedStores.push({
      store_id: values[idIdx] || `ST-${100 + i}`,
      store_name: values[nameIdx] || `Store #${i}`,
      region: regionIdx !== -1 ? values[regionIdx] : "Northeast",
      city: cityIdx !== -1 ? values[cityIdx] : "Metro Area",
      store_format: formatIdx !== -1 ? values[formatIdx] : "Standard"
    });
  }

  return parsedStores;
}
