import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { WeeklySalesRecord } from "../data/sampleData";
import { 
  TrendingUp, 
  Map, 
  Tag, 
  Award, 
  AlertTriangle, 
  ChevronRight, 
  DollarSign, 
  Calendar,
  Layers,
  ShoppingBag,
  HelpCircle,
  Package
} from "lucide-react";

interface RetailChartsProps {
  id: string;
  filteredSales: WeeklySalesRecord[];
  allSales: WeeklySalesRecord[];
  selectedRegion: string | null;
  onSelectRegion: (region: string | null) => void;
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  selectedFormat: string | null;
  onSelectFormat: (format: string | null) => void;
}

export default function RetailCharts({
  id,
  filteredSales,
  allSales,
  selectedRegion,
  onSelectRegion,
  selectedCategory,
  onSelectCategory,
  selectedFormat,
  onSelectFormat
}: RetailChartsProps) {
  const [activeChartTab, setActiveChartTab] = useState<"weekly" | "regional" | "category" | "leaderboard" | "stockout">("weekly");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 1. DATA PROCESSING - WEEKLY TREND
  const weeklyData = useMemo(() => {
    const weeksMap: Record<string, { week: string; sales: number; target: number; transactions: number }> = {};
    
    filteredSales.forEach(r => {
      if (!weeksMap[r.week_start_date]) {
        weeksMap[r.week_start_date] = { week: r.week_start_date, sales: 0, target: 0, transactions: 0 };
      }
      weeksMap[r.week_start_date].sales += r.net_sales;
      weeksMap[r.week_start_date].target += r.sales_target;
      weeksMap[r.week_start_date].transactions += r.transactions;
    });

    return Object.values(weeksMap).sort((a, b) => a.week.localeCompare(b.week));
  }, [filteredSales]);

  const maxWeeklyValue = useMemo(() => {
    if (weeklyData.length === 0) return 100000;
    return Math.max(...weeklyData.flatMap(w => [w.sales, w.target])) * 1.15;
  }, [weeklyData]);

  // 2. DATA PROCESSING - REGIONAL SALES
  const regionalData = useMemo(() => {
    const regions = ["Northeast", "Southeast", "Midwest", "Southwest", "West"];
    return regions.map(reg => {
      const records = filteredSales.filter(r => r.region === reg);
      const sales = records.reduce((sum, r) => sum + r.net_sales, 0);
      const target = records.reduce((sum, r) => sum + r.sales_target, 0);
      const returns = records.reduce((sum, r) => sum + r.returns_amount, 0);
      const count = new Set(records.map(r => r.store_id)).size;
      const progress = target > 0 ? (sales / target) * 100 : 0;
      return { name: reg, sales, target, returns, count, progress };
    });
  }, [filteredSales]);

  const maxRegionalValue = useMemo(() => {
    return Math.max(...regionalData.flatMap(r => [r.sales, r.target]), 100000);
  }, [regionalData]);

  // 3. DATA PROCESSING - CATEGORY PERFORMANCE
  const categoryData = useMemo(() => {
    const categories = ["Apparel", "Electronics", "Home", "Grocery", "Beauty"];
    return categories.map(cat => {
      const records = filteredSales.filter(r => r.product_category === cat);
      const sales = records.reduce((sum, r) => sum + r.net_sales, 0);
      const returns = records.reduce((sum, r) => sum + r.returns_amount, 0);
      const discount = records.reduce((sum, r) => sum + r.discount_amount, 0);
      const gross = records.reduce((sum, r) => sum + r.gross_sales, 0);
      const stockouts = records.reduce((sum, r) => sum + r.stockouts, 0);
      
      const returnRate = sales > 0 ? (returns / sales) * 100 : 0;
      const discountRate = gross > 0 ? (discount / gross) * 100 : 0;

      return { name: cat, sales, returns, returnRate, discountRate, stockouts };
    }).sort((a, b) => b.sales - a.sales);
  }, [filteredSales]);

  const maxCategorySales = useMemo(() => {
    return Math.max(...categoryData.map(c => c.sales), 10000);
  }, [categoryData]);

  // 4. DATA PROCESSING - STORE LEADERBOARD
  const leaderboardData = useMemo(() => {
    const storeMap: Record<string, { id: string; name: string; format: string; region: string; sales: number; target: number }> = {};
    
    filteredSales.forEach(r => {
      const key = r.store_id || r.store_name;
      if (!storeMap[key]) {
        storeMap[key] = { id: r.store_id, name: r.store_name, format: r.store_format, region: r.region, sales: 0, target: 0 };
      }
      storeMap[key].sales += r.net_sales;
      storeMap[key].target += r.sales_target;
    });

    return Object.values(storeMap)
      .map(s => ({
        ...s,
        achievement: s.target > 0 ? Math.round((s.sales / s.target) * 100) : 0
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 6); // Top 6 stores
  }, [filteredSales]);

  const maxLeaderboardSales = useMemo(() => {
    if (leaderboardData.length === 0) return 100000;
    return Math.max(...leaderboardData.map(s => s.sales));
  }, [leaderboardData]);

  // 5. DATA PROCESSING - STOCKOUT RISK
  // Evaluates risk by comparing remaining inventory on hand to units sold, and counting stockout incidents.
  const stockoutRiskData = useMemo(() => {
    const formatMap: Record<string, { format: string; inventory: number; sold: number; stockouts: number }> = {};
    
    filteredSales.forEach(r => {
      if (!formatMap[r.store_format]) {
        formatMap[r.store_format] = { format: r.store_format, inventory: 0, sold: 0, stockouts: 0 };
      }
      formatMap[r.store_format].inventory += r.inventory_on_hand;
      formatMap[r.store_format].sold += r.units_sold;
      formatMap[r.store_format].stockouts += r.stockouts;
    });

    return Object.values(formatMap).map(f => {
      // Risk ratio: higher units sold relative to inventory points to stockout risk
      // e.g. units_sold / inventory
      const riskRatio = f.inventory > 0 ? (f.sold / f.inventory) * 100 : 0;
      
      // Categorize risk level
      let riskLevel: "Critical" | "High" | "Moderate" | "Low" = "Low";
      if (f.stockouts > 12 || riskRatio > 40) riskLevel = "Critical";
      else if (f.stockouts > 5 || riskRatio > 25) riskLevel = "High";
      else if (f.stockouts > 0 || riskRatio > 12) riskLevel = "Moderate";

      return {
        ...f,
        riskRatio,
        riskLevel
      };
    });
  }, [filteredSales]);

  // Color map for store formats
  const formatColors: Record<string, string> = {
    Flagship: "bg-indigo-600",
    Superstore: "bg-blue-600",
    Standard: "bg-slate-600",
    Express: "bg-amber-500"
  };

  const formatTextColors: Record<string, string> = {
    Flagship: "text-indigo-600",
    Superstore: "text-blue-600",
    Standard: "text-slate-600",
    Express: "text-amber-600"
  };

  return (
    <div id={id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col md:flex-row h-[560px]">
      
      {/* Sidebar Controller */}
      <div className="w-full md:w-64 bg-slate-50/70 border-b md:border-b-0 md:border-r border-slate-100 p-5 flex flex-col justify-between flex-shrink-0">
        <div className="space-y-5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-sans block">
              Business Intelligence Charts
            </span>
            <h3 className="text-sm font-bold text-slate-900 mt-1 font-display">
              Operational Graph Center
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 font-sans leading-relaxed">
              Dynamically filtered based on active weeks, regions, formats, and product category selections.
            </p>
          </div>

          {/* Nav buttons */}
          <div className="space-y-1.5">
            {[
              { id: "weekly", label: "Weekly Sales Trend", icon: TrendingUp, desc: "Sales vs Budget over weeks" },
              { id: "regional", label: "Regional Sales & Gaps", icon: Map, desc: "Revenue vs Target by region" },
              { id: "category", label: "Category Performance", icon: Tag, desc: "Revenue vs Return rates" },
              { id: "leaderboard", label: "Store Leaderboard", icon: Award, desc: "Top performing retail nodes" },
              { id: "stockout", label: "Inventory & Stockouts", icon: AlertTriangle, desc: "Stockout metrics & risk zones" }
            ].map(tab => {
              const Icon = tab.icon;
              const isSelected = activeChartTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveChartTab(tab.id as any);
                    setHoveredIndex(null);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${
                    isSelected
                      ? "bg-white border-indigo-200 text-slate-950 shadow-sm"
                      : "bg-transparent hover:bg-slate-100/40 border-transparent text-slate-600"
                  }`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 ${isSelected ? "text-indigo-600" : "text-slate-400"}`} />
                  <div>
                    <div className="text-xs font-bold font-sans">{tab.label}</div>
                    <div className="text-[9px] text-slate-400 mt-0.5 line-clamp-1">{tab.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Filter Summary */}
        <div className="hidden md:block pt-4 border-t border-slate-100 text-[10px] text-slate-400 space-y-1 font-mono">
          <div className="font-bold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">Active Filters</div>
          <div className="flex justify-between">
            <span>Region:</span>
            <span className="text-slate-700 font-bold">{selectedRegion || "All"}</span>
          </div>
          <div className="flex justify-between">
            <span>Category:</span>
            <span className="text-slate-700 font-bold">{selectedCategory || "All"}</span>
          </div>
          <div className="flex justify-between">
            <span>Format:</span>
            <span className="text-slate-700 font-bold">{selectedFormat || "All"}</span>
          </div>
          <div className="flex justify-between">
            <span>Active Datapoints:</span>
            <span className="text-slate-700 font-bold">{filteredSales.length} records</span>
          </div>
        </div>
      </div>

      {/* Main Graph Area */}
      <div className="flex-1 p-6 flex flex-col justify-between overflow-hidden relative bg-slate-50/10">
        
        {/* Graph Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h4 className="text-base font-bold text-slate-900 font-display">
              {activeChartTab === "weekly" && "Weekly Revenue vs Sales Target"}
              {activeChartTab === "regional" && "Regional Revenue Distribution"}
              {activeChartTab === "category" && "Category Revenue & Quality Control"}
              {activeChartTab === "leaderboard" && "Top Store Locations by Revenue"}
              {activeChartTab === "stockout" && "Operational Stockout Risk Profile"}
            </h4>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              {activeChartTab === "weekly" && "Chronological breakdown of net sales against set targets across weeks."}
              {activeChartTab === "regional" && "Comparison of actual net revenue and budget completion for geographical regions."}
              {activeChartTab === "category" && "Evaluating gross performance coupled with reverse logistics (return rates)."}
              {activeChartTab === "leaderboard" && "Ranked comparison of the leading retail stores with target achievement percentages."}
              {activeChartTab === "stockout" && "Diagnosing stock shortage frequency and risk of out-of-stock events."}
            </p>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>Interactive Node</span>
          </div>
        </div>

        {/* Dynamic Display */}
        <div className="flex-1 py-6 flex items-center justify-center min-h-[300px]">
          <AnimatePresence mode="wait">
            
            {/* WEEKLY TREND CHART */}
            {activeChartTab === "weekly" && (
              <motion.div
                key="weekly-chart"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="w-full h-full flex flex-col justify-between"
              >
                {weeklyData.length > 0 ? (
                  <div className="w-full flex-1 flex flex-col justify-end space-y-6">
                    {/* SVG Graphic Representation */}
                    <div className="w-full h-56 flex items-end justify-around gap-2 px-4 relative">
                      {weeklyData.map((w, idx) => {
                        const isHovered = hoveredIndex === idx;
                        const salesHeight = (w.sales / maxWeeklyValue) * 100;
                        const targetHeight = (w.target / maxWeeklyValue) * 100;
                        const achievement = w.target > 0 ? Math.round((w.sales / w.target) * 100) : 0;

                        return (
                          <div
                            key={w.week}
                            className="flex-1 flex flex-col items-center justify-end h-full relative"
                            onMouseEnter={() => setHoveredIndex(idx)}
                            onMouseLeave={() => setHoveredIndex(null)}
                          >
                            {/* Hover Details Card */}
                            <AnimatePresence>
                              {isHovered && (
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: -15 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className="absolute bottom-full mb-1 z-30 bg-slate-900 text-white p-3 rounded-xl shadow-xl text-[10px] font-sans w-40 border border-slate-800"
                                >
                                  <div className="font-bold text-indigo-400 mb-1">{w.week}</div>
                                  <div className="flex justify-between font-mono">
                                    <span>Sales:</span>
                                    <span className="font-bold">${Math.round(w.sales).toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between font-mono mt-0.5">
                                    <span>Target:</span>
                                    <span>${Math.round(w.target).toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between font-mono mt-1 pt-1 border-t border-slate-800 text-emerald-400 font-bold">
                                    <span>Achieved:</span>
                                    <span>{achievement}%</span>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Double Bars Container */}
                            <div className="w-full flex items-end justify-center gap-1 h-full max-w-[60px]">
                              {/* Actual Sales Bar */}
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${salesHeight}%` }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className={`w-1/2 rounded-t-lg transition-all ${
                                  achievement >= 100 
                                    ? "bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-100" 
                                    : "bg-slate-400 hover:bg-slate-500"
                                }`}
                              />
                              {/* Target Bar */}
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${targetHeight}%` }}
                                transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                                className="w-1/2 bg-indigo-100 hover:bg-indigo-200 rounded-t-lg"
                              />
                            </div>

                            {/* Label */}
                            <span className="text-[10px] text-slate-400 font-mono mt-2 transform rotate-12 sm:rotate-0 whitespace-nowrap">
                              {w.week.slice(5)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Chart Legend */}
                    <div className="flex items-center justify-center gap-6 text-xs text-slate-500 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-indigo-600" />
                        <span>Actual Sales</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-indigo-100" />
                        <span>Sales Target</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-slate-400" />
                        <span>Sales Under Budget (&lt;100%)</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 py-12 flex flex-col items-center gap-2">
                    <Calendar className="w-10 h-10 stroke-[1.5]" />
                    <span className="text-xs">No chronological data matching your filters.</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* REGIONAL PERFORMANCE CHART */}
            {activeChartTab === "regional" && (
              <motion.div
                key="regional-chart"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="w-full h-full flex flex-col justify-between"
              >
                <div className="w-full flex-1 flex flex-col justify-end space-y-6">
                  <div className="w-full h-56 flex items-end justify-around gap-2 px-4 relative">
                    {regionalData.map((reg, idx) => {
                      const isHovered = hoveredIndex === idx;
                      const isSelected = selectedRegion === reg.name;
                      const salesHeight = (reg.sales / maxRegionalValue) * 100;
                      const targetHeight = (reg.target / maxRegionalValue) * 100;
                      
                      return (
                        <div
                          key={reg.name}
                          className={`flex-1 flex flex-col items-center justify-end h-full relative p-2 rounded-xl transition-all cursor-pointer ${
                            isSelected ? "bg-indigo-50/50" : "hover:bg-slate-50"
                          }`}
                          onMouseEnter={() => setHoveredIndex(idx)}
                          onMouseLeave={() => setHoveredIndex(null)}
                          onClick={() => onSelectRegion(isSelected ? null : reg.name)}
                        >
                          {/* Hover Detail */}
                          <AnimatePresence>
                            {isHovered && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: -15 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute bottom-full mb-1 z-30 bg-slate-900 text-white p-3 rounded-xl shadow-xl text-[10px] font-sans w-40 border border-slate-800"
                              >
                                <div className="font-bold text-indigo-400 mb-1">{reg.name}</div>
                                <div className="flex justify-between font-mono">
                                  <span>Sales:</span>
                                  <span className="font-bold">${Math.round(reg.sales).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between font-mono mt-0.5">
                                  <span>Target:</span>
                                  <span>${Math.round(reg.target).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between font-mono mt-1 pt-1 border-t border-slate-800 text-indigo-300 font-bold">
                                  <span>Achievement:</span>
                                  <span>{Math.round(reg.progress)}%</span>
                                </div>
                                <div className="text-[9px] text-slate-400 mt-1 italic text-center">Click bar to filter stores</div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Gaps Display */}
                          <div className="w-full flex items-end justify-center gap-1 h-full max-w-[65px]">
                            {/* Actual sales */}
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${salesHeight}%` }}
                              transition={{ duration: 0.5, ease: "easeOut" }}
                              className={`w-1/2 rounded-t-lg ${
                                isSelected ? "bg-indigo-600" : "bg-indigo-500 hover:bg-indigo-600"
                              }`}
                            />
                            {/* Target sales */}
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${targetHeight}%` }}
                              transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                              className="w-1/2 bg-blue-100 rounded-t-lg"
                            />
                          </div>

                          {/* Label */}
                          <span className="text-[10px] text-slate-800 font-bold font-sans mt-2">
                            {reg.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Regional Legend */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 font-sans">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded bg-indigo-500" />
                        <span>Sales Revenue</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded bg-blue-100" />
                        <span>Budget Target</span>
                      </div>
                    </div>
                    <span>Click a region to filter and focus on performance details</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* CATEGORY PERFORMANCE CHART */}
            {activeChartTab === "category" && (
              <motion.div
                key="category-chart"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="w-full h-full flex flex-col justify-between"
              >
                <div className="w-full flex-1 flex flex-col justify-center space-y-4">
                  {categoryData.map((cat, idx) => {
                    const isHovered = hoveredIndex === idx;
                    const isSelected = selectedCategory === cat.name;
                    const pctOfMax = (cat.sales / maxCategorySales) * 100;
                    
                    return (
                      <div
                        key={cat.name}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected ? "bg-indigo-50/50 border-indigo-200" : "bg-white hover:bg-slate-50 border-slate-100"
                        }`}
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        onClick={() => onSelectCategory(isSelected ? null : cat.name)}
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 font-sans">{cat.name}</span>
                            {cat.returnRate > 8 && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-rose-50 text-rose-600 border border-rose-100">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                High Returns ({cat.returnRate.toFixed(1)}%)
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500">
                            <div>
                              Sales: <span className="font-bold text-slate-900">${Math.round(cat.sales).toLocaleString()}</span>
                            </div>
                            <div>
                              Returns Rate: <span className="font-bold text-slate-900">{cat.returnRate.toFixed(1)}%</span>
                            </div>
                            <div>
                              Discounts: <span className="font-bold text-slate-900">{cat.discountRate.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>

                        {/* Bar Track */}
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pctOfMax}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className={`h-full rounded-full ${
                              cat.name === "Apparel"
                                ? "bg-indigo-500"
                                : cat.name === "Electronics"
                                ? "bg-blue-500"
                                : cat.name === "Home"
                                ? "bg-amber-500"
                                : cat.name === "Grocery"
                                ? "bg-emerald-500"
                                : "bg-rose-500"
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-100">
                  <span>Categories sorted by net sales. Select a row to filter other sections by product type.</span>
                  <div className="flex items-center gap-1.5 text-rose-500 font-bold text-[10px]">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Quality Check: Apparel & returns require inspection</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STORE LEADERBOARD CHART */}
            {activeChartTab === "leaderboard" && (
              <motion.div
                key="leaderboard-chart"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="w-full h-full flex flex-col justify-between"
              >
                {leaderboardData.length > 0 ? (
                  <div className="w-full flex-1 flex flex-col justify-center space-y-3.5">
                    {leaderboardData.map((store, idx) => {
                      const pctOfMax = (store.sales / maxLeaderboardSales) * 100;
                      return (
                        <div key={store.id} className="flex items-center gap-4">
                          {/* Rank */}
                          <div className="w-6 h-6 rounded-lg bg-slate-900 text-indigo-400 font-mono text-xs font-bold flex items-center justify-center">
                            #{idx + 1}
                          </div>

                          {/* Profile */}
                          <div className="w-36 truncate">
                            <div className="text-xs font-bold text-slate-800 font-sans truncate" title={store.name}>
                              {store.name}
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono flex items-center gap-1">
                              <span>{store.region}</span>
                              <span>•</span>
                              <span className={formatTextColors[store.format]}>{store.format}</span>
                            </div>
                          </div>

                          {/* Horizontal Bar */}
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-mono font-bold text-slate-900">${Math.round(store.sales).toLocaleString()}</span>
                              <span className={`font-mono font-bold ${store.achievement >= 100 ? "text-emerald-600" : "text-amber-600"}`}>
                                {store.achievement}% target
                              </span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pctOfMax}%` }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className={`h-full rounded-full ${
                                  store.achievement >= 100 ? "bg-emerald-500" : "bg-indigo-500"
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-slate-400 py-12 flex flex-col items-center gap-2">
                    <Award className="w-10 h-10 stroke-[1.5]" />
                    <span className="text-xs">No store leaderboard available matching current filter.</span>
                  </div>
                )}

                <div className="text-xs text-slate-400 pt-3 border-t border-slate-100 text-center font-mono">
                  Ranked by Net Sales revenue across active selections.
                </div>
              </motion.div>
            )}

            {/* STOCKOUT RISK CHART */}
            {activeChartTab === "stockout" && (
              <motion.div
                key="stockout-chart"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="w-full h-full flex flex-col justify-between"
              >
                <div className="w-full flex-1 flex flex-col justify-center space-y-5">
                  {stockoutRiskData.map((f, idx) => {
                    const isSelected = selectedFormat === f.format;
                    return (
                      <div
                        key={f.format}
                        onClick={() => onSelectFormat(isSelected ? null : f.format)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${
                          isSelected ? "bg-indigo-50/50 border-indigo-200" : "bg-white hover:bg-slate-50 border-slate-100"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs font-bold text-slate-800 font-sans">{f.format} Stores</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              f.riskLevel === "Critical"
                                ? "bg-rose-50 text-rose-700 border border-rose-100"
                                : f.riskLevel === "High"
                                ? "bg-amber-50 text-amber-700 border border-amber-100"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            }`}>
                              {f.riskLevel} Stockout Risk
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500">
                            <div>
                              Stockouts: <span className="font-bold text-slate-900">{f.stockouts} occurrences</span>
                            </div>
                            <div>
                              Units Sold: <span className="font-bold text-slate-900">{f.sold.toLocaleString()}</span>
                            </div>
                            <div>
                              Inventory: <span className="font-bold text-slate-900">{f.inventory.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Ratio comparison bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                            <span>Units Sold/Inventory ratio</span>
                            <span>{f.riskRatio.toFixed(1)}% Velocity</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, f.riskRatio * 2)}%` }} // Scaled for visual comparison
                              transition={{ duration: 0.6, ease: "easeOut" }}
                              className={`h-full rounded-full ${
                                f.riskLevel === "Critical"
                                  ? "bg-rose-500"
                                  : f.riskLevel === "High"
                                  ? "bg-amber-500"
                                  : "bg-indigo-500"
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-100">
                  <span className="flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-indigo-500" />
                    High velocity format structures like Superstores require active supply replenishment.
                  </span>
                  <span className="font-bold text-[9px] text-slate-500">Click a format to filter dashboard</span>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
