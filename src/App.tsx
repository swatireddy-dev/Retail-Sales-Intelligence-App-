import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";
import {
  Upload,
  Download,
  Search,
  Building2,
  TrendingUp,
  Coins,
  MapPin,
  Star,
  X,
  ChevronDown,
  Info,
  Calendar,
  ArrowUpRight,
  SlidersHorizontal,
  Sparkles,
  RefreshCw,
  Clock,
  AlertTriangle,
  Percent,
  Check,
  RotateCcw,
  ShoppingBag,
  ListFilter,
  FileSpreadsheet,
  UploadCloud
} from "lucide-react";
import {
  generateInitialWeeklySales,
  calculateAdvancedMetrics,
  getWeeklySalesTemplateCSV,
  getStoreTemplateCSV,
  parseWeeklySalesCSV,
  parseStoreCSV,
  WeeklySalesRecord,
  StoreRecord,
  INITIAL_STORES
} from "./data/sampleData";
import MetricCard from "./components/MetricCard";
import RetailCharts from "./components/RetailCharts";
import AIAdvisor from "./components/AIAdvisor";

export default function App() {
  // 1. Core Relational States
  const [weeklySales, setWeeklySales] = useState<WeeklySalesRecord[]>([]);
  const [stores, setStores] = useState<StoreRecord[]>([]);

  // Filter States
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedFormat, setSelectedFormat] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Ingestion Modal States
  const [uploadTarget, setUploadTarget] = useState<"sales" | "stores" | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Table Pagination
  const [tablePage, setTablePage] = useState(1);
  const itemsPerPage = 8;

  // Active Store Drilldown
  const [activeDrilldownRecord, setActiveDrilldownRecord] = useState<WeeklySalesRecord | null>(null);

  // 2. DYNAMIC LOOKUP BOUNDARIES (computed directly from dataset to adapt when users upload files)
  const uniqueWeeks = useMemo(() => Array.from(new Set(weeklySales.map(r => r.week_start_date))).sort(), [weeklySales]);
  const uniqueRegions = useMemo(() => Array.from(new Set(weeklySales.map(r => r.region))).sort(), [weeklySales]);
  const uniqueStores = useMemo(() => Array.from(new Set(weeklySales.map(r => r.store_name))).sort(), [weeklySales]);
  const uniqueCities = useMemo(() => Array.from(new Set(weeklySales.map(r => r.city))).sort(), [weeklySales]);
  const uniqueFormats = useMemo(() => Array.from(new Set(weeklySales.map(r => r.store_format))).sort(), [weeklySales]);
  const uniqueCategories = useMemo(() => Array.from(new Set(weeklySales.map(r => r.product_category))).sort(), [weeklySales]);

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedWeek("");
    setSelectedRegion("");
    setSelectedStore("");
    setSelectedCity("");
    setSelectedFormat("");
    setSelectedCategory("");
    setSearchQuery("");
    setTablePage(1);
  };

  // 3. MULTI-DIMENSIONAL FILTERING ENGINE (OLAP slice & dice)
  const filteredSales = useMemo(() => {
    return weeklySales.filter(r => {
      const weekMatch = selectedWeek ? r.week_start_date === selectedWeek : true;
      const regionMatch = selectedRegion ? r.region === selectedRegion : true;
      const storeMatch = selectedStore ? r.store_name === selectedStore : true;
      const cityMatch = selectedCity ? r.city === selectedCity : true;
      const formatMatch = selectedFormat ? r.store_format === selectedFormat : true;
      const categoryMatch = selectedCategory ? r.product_category === selectedCategory : true;
      
      const query = searchQuery.toLowerCase().trim();
      const searchMatch = query
        ? (
            r.store_name.toLowerCase().includes(query) ||
            r.store_id.toLowerCase().includes(query) ||
            r.city.toLowerCase().includes(query) ||
            r.product_category.toLowerCase().includes(query) ||
            r.region.toLowerCase().includes(query)
          )
        : true;

      return weekMatch && regionMatch && storeMatch && cityMatch && formatMatch && categoryMatch && searchMatch;
    });
  }, [weeklySales, selectedWeek, selectedRegion, selectedStore, selectedCity, selectedFormat, selectedCategory, searchQuery]);

  // Compute stats on currently filtered dataset
  const activeMetrics = useMemo(() => {
    return calculateAdvancedMetrics(filteredSales);
  }, [filteredSales]);

  // Compute stats on total baseline dataset for benchmarks
  const baselineMetrics = useMemo(() => {
    return calculateAdvancedMetrics(weeklySales);
  }, [weeklySales]);

  // Pagination slicing
  const paginatedSales = useMemo(() => {
    const startIndex = (tablePage - 1) * itemsPerPage;
    return filteredSales.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSales, tablePage]);

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / itemsPerPage));

  // 4. FILE INGESTION CONTROLLERS
  const triggerDownloadTemplate = (type: "sales" | "stores") => {
    const csvContent = type === "sales" ? getWeeklySalesTemplateCSV() : getStoreTemplateCSV();
    const filename = type === "sales" ? "weekly_sales_template.csv" : "stores_directory_template.csv";
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processUploadedCSV = (file: File, type: "sales" | "stores") => {
    const reader = new FileReader();
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    reader.onload = (event) => {
      try {
        let text = "";
        if (isExcel) {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          text = XLSX.utils.sheet_to_csv(sheet);
        } else {
          text = event.target?.result as string;
        }

        if (type === "sales") {
          const parsed = parseWeeklySalesCSV(text);
          setWeeklySales(parsed);
          setUploadSuccess(`Successfully ingested ${parsed.length} weekly transactional metrics. Slicing filters updated!`);
          setUploadError(null);
        } else {
          const parsedStores = parseStoreCSV(text);
          setStores(parsedStores);
          
          // Relational trigger: Regenerate active weekly database records mapped to the newly uploaded store directory so the charts instantly render!
          const weeks = ["2026-06-01", "2026-06-08", "2026-06-15", "2026-06-22", "2026-06-29"];
          const categories = ["Apparel", "Electronics", "Home", "Grocery", "Beauty"];
          const generatedRecords: WeeklySalesRecord[] = [];
          
          let seed = 77;
          const pseudoRandom = () => {
            const x = Math.sin(seed++) * 10000;
            return x - Math.floor(x);
          };

          parsedStores.forEach(store => {
            weeks.forEach(week => {
              categories.forEach(cat => {
                const baseVal = cat === "Electronics" ? 35000 : cat === "Apparel" ? 22000 : cat === "Grocery" ? 25000 : 15000;
                const gross = Math.round(baseVal * (0.85 + pseudoRandom() * 0.4));
                const discount = Math.round(gross * (0.05 + pseudoRandom() * 0.08));
                const net = gross - discount;
                const target = Math.round(net * (0.9 + pseudoRandom() * 0.2));
                const trans = Math.round(net / (cat === "Electronics" ? 150 : 40));
                
                generatedRecords.push({
                  week_start_date: week,
                  region: store.region,
                  store_id: store.store_id,
                  store_name: store.store_name,
                  city: store.city,
                  store_format: store.store_format,
                  product_category: cat,
                  footfall: Math.round(trans * 3),
                  transactions: trans,
                  units_sold: Math.round(trans * 1.8),
                  gross_sales: gross,
                  discount_amount: discount,
                  net_sales: net,
                  sales_target: target,
                  inventory_on_hand: Math.round(net * 2.5),
                  stockouts: pseudoRandom() > 0.85 ? Math.floor(pseudoRandom() * 3) + 1 : 0,
                  returns_amount: Math.round(net * (0.02 + pseudoRandom() * 0.06)),
                  customer_rating: parseFloat((4.0 + pseudoRandom() * 1.0).toFixed(1)),
                  marketing_spend: Math.round(gross * 0.03)
                });
              });
            });
          });

          setWeeklySales(generatedRecords);
          setUploadSuccess(`Successfully registered ${parsedStores.length} stores. Relational weekly transactions auto-synthesized for interactive testing!`);
          setUploadError(null);
        }

        // Close the modal instantly so they return to the main dashboard
        setUploadTarget(null);
        
        // Auto-clear success banner from the main screen after 8 seconds
        setTimeout(() => {
          setUploadSuccess(null);
        }, 8000);
      } catch (err: any) {
        setUploadError(err.message || `Failed to process target ${isExcel ? 'Excel' : 'CSV'}. Verify columns matching instructions.`);
        setUploadSuccess(null);
      }
    };
    reader.onerror = () => {
      setUploadError("Error reading uploaded spreadsheet file.");
    };
    
    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0] && uploadTarget) {
      processUploadedCSV(e.dataTransfer.files[0], uploadTarget);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && uploadTarget) {
      processUploadedCSV(e.target.files[0], uploadTarget);
    }
  };

  const handleClearAllData = () => {
    setWeeklySales([]);
    setStores([]);
    handleResetFilters();
    setUploadSuccess("Workspace cleared. All datasets removed and filters reset.");
    setTimeout(() => setUploadSuccess(null), 6000);
  };

  const handleLoadDemoData = () => {
    setWeeklySales(generateInitialWeeklySales());
    setStores(INITIAL_STORES);
    handleResetFilters();
    setUploadSuccess("Demo dataset loaded successfully. All features and charts activated.");
    setTimeout(() => setUploadSuccess(null), 6000);
  };

  // 5. EXPORT/DOWNLOAD FILTERED TRANSACTIONAL SALES DATA
  const handleExportFilteredCSV = () => {
    const headers = [
      "week_start_date", "region", "store_id", "store_name", "city",
      "store_format", "product_category", "footfall", "transactions", "units_sold",
      "gross_sales", "discount_amount", "net_sales", "sales_target", "inventory_on_hand",
      "stockouts", "returns_amount", "customer_rating", "marketing_spend"
    ];
    
    const rows = filteredSales.map(r => [
      r.week_start_date,
      `"${r.region}"`,
      r.store_id,
      `"${r.store_name}"`,
      `"${r.city}"`,
      `"${r.store_format}"`,
      `"${r.product_category}"`,
      r.footfall,
      r.transactions,
      r.units_sold,
      r.gross_sales,
      r.discount_amount,
      r.net_sales,
      r.sales_target,
      r.inventory_on_hand,
      r.stockouts,
      r.returns_amount,
      r.customer_rating,
      r.marketing_spend
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `filtered_sales_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportStoreListCSV = () => {
    const headers = ["store_id", "store_name", "region", "city", "store_format"];
    const uniqueStoresList: StoreRecord[] = [];
    const keysSeen = new Set<string>();

    filteredSales.forEach(r => {
      if (!keysSeen.has(r.store_id)) {
        keysSeen.add(r.store_id);
        uniqueStoresList.push({
          store_id: r.store_id,
          store_name: r.store_name,
          region: r.region,
          city: r.city,
          store_format: r.store_format
        });
      }
    });

    const rows = uniqueStoresList.map(s => [
      s.store_id,
      `"${s.store_name}"`,
      `"${s.region}"`,
      `"${s.city}"`,
      `"${s.store_format}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `active_stores_directory_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeDateString = useMemo(() => {
    return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }, []);

  return (
    <div id="main-root" className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500 selection:text-white pb-16">
      
      {/* 1. TOP EXECUTIVE HEADER BAR */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-950 flex items-center justify-center text-white border border-slate-900 shadow-sm">
              <Building2 className="w-5.5 h-5.5 text-indigo-400 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-slate-950 uppercase font-sans">
                Retail Sales Intelligence
              </h1>
              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono">
                <Clock className="w-3 h-3 text-indigo-500" />
                <span>DYNAMIC ANALYTICS ENGINE</span>
                <span>•</span>
                <span>{activeDateString}</span>
              </div>
            </div>
          </div>

          {/* TWO UPLOAD BUTTONS NEAR TO EACH OTHER */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            
            {/* Reset Defaults */}
            <button
              onClick={handleClearAllData}
              className="flex items-center gap-1 px-2.5 py-2 border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 rounded-xl text-[11px] font-bold bg-white hover:bg-red-50/30 transition-all cursor-pointer"
              title="Remove uploaded files and reset workspace to empty state"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear Workspace
            </button>

            {/* BUTTON 1: UPLOAD WEEKLY SALES */}
            <button
              onClick={() => setUploadTarget("sales")}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-bold shadow-sm shadow-indigo-100 transition-all cursor-pointer"
              title="Ingest spreadsheet with historical weekly sales"
            >
              <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
              Upload Weekly Sales
            </button>

            {/* BUTTON 2: UPLOAD STORE DIRECTORY */}
            <button
              onClick={() => setUploadTarget("stores")}
              className="flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-[11px] font-bold shadow-sm shadow-sky-100 transition-all cursor-pointer"
              title="Ingest spreadsheet with stores information"
            >
              <Building2 className="w-3.5 h-3.5 stroke-[2.5]" />
              Upload Store Data
            </button>

          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">

        {/* Global Feedback Banner */}
        {uploadSuccess && (
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-xs text-emerald-800 flex items-center justify-between gap-2.5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <Check className="w-4.5 h-4.5 text-emerald-500 flex-shrink-0" />
              <span className="font-semibold">{uploadSuccess}</span>
            </div>
            <button
              onClick={() => setUploadSuccess(null)}
              className="p-1 hover:bg-emerald-100/50 rounded-lg text-emerald-600 hover:text-emerald-800 transition-all cursor-pointer"
              aria-label="Dismiss feedback"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {weeklySales.length === 0 ? (
          <div className="bg-white border border-slate-200/60 rounded-3xl p-8 sm:p-12 text-center max-w-3xl mx-auto my-12 shadow-sm space-y-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-50 to-sky-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto border border-indigo-100/80 shadow-inner">
              <UploadCloud className="w-8 h-8 text-indigo-600" />
            </div>
            
            <div className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
                Retail Sales Intelligence Workspace
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
                Your analytics environment is currently unpopulated. Upload a store directory or weekly sales transaction file (CSV or Excel) to activate live KPIs, diagnostic reports, and generative AI advisory systems.
              </p>
            </div>

            {/* Quick-action buttons in empty state */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto pt-2">
              <button
                onClick={() => setUploadTarget("sales")}
                className="flex items-center justify-center gap-2.5 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-indigo-100 hover:shadow-lg cursor-pointer"
              >
                <Upload className="w-4 h-4 stroke-[2.5]" />
                Upload Weekly Sales
              </button>
              
              <button
                onClick={() => setUploadTarget("stores")}
                className="flex items-center justify-center gap-2.5 px-6 py-3.5 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-sky-100 hover:shadow-lg cursor-pointer"
              >
                <Building2 className="w-4 h-4 stroke-[2.5]" />
                Upload Store Data
              </button>
            </div>

            <div className="flex items-center gap-3 justify-center text-xs text-slate-300">
              <div className="h-px bg-slate-200 w-16" />
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Or use a shortcut</span>
              <div className="h-px bg-slate-200 w-16" />
            </div>

            <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-5 max-w-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-left space-y-1">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block">Quick Evaluation</span>
                <p className="text-[11px] text-slate-500">Explore the interface immediately with high-fidelity mock data</p>
              </div>
              <button
                onClick={handleLoadDemoData}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-700 hover:text-slate-900 font-bold text-xs bg-white hover:bg-slate-50 rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Load Demo Dataset
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-x-6 gap-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Download Templates:</span>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => triggerDownloadTemplate("sales")}
                  className="text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Sales CSV Template
                </button>
                <span className="text-slate-200">|</span>
                <button
                  onClick={() => triggerDownloadTemplate("stores")}
                  className="text-xs font-bold text-slate-600 hover:text-sky-600 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Stores CSV Template
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>

        {/* 2. ADVANCED MULTIDIMENSIONAL SLICING FILTERS PANEL */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-50 pb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 font-sans">
                Operational Ingestion & Multi-Dimensional Slicing
              </h3>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleResetFilters}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Clear Filters
              </button>

              <button
                onClick={handleExportFilteredCSV}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 transition-all"
                title="Download current filtered table slice as CSV file"
              >
                <Download className="w-3.5 h-3.5" />
                Export Filtered Data
              </button>
            </div>
          </div>

          {/* Slicing Controls Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            
            {/* Filter: Week */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Week Start Date</label>
              <div className="relative">
                <select
                  value={selectedWeek}
                  onChange={e => { setSelectedWeek(e.target.value); setTablePage(1); }}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold px-3 py-2.5 focus:outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="">All Weeks</option>
                  {uniqueWeeks.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Filter: Region */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Region</label>
              <div className="relative">
                <select
                  value={selectedRegion}
                  onChange={e => { setSelectedRegion(e.target.value); setTablePage(1); }}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold px-3 py-2.5 focus:outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="">All Regions</option>
                  {uniqueRegions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Filter: Store */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Store Location</label>
              <div className="relative">
                <select
                  value={selectedStore}
                  onChange={e => { setSelectedStore(e.target.value); setTablePage(1); }}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold px-3 py-2.5 focus:outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="">All Stores</option>
                  {uniqueStores.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Filter: City */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">City</label>
              <div className="relative">
                <select
                  value={selectedCity}
                  onChange={e => { setSelectedCity(e.target.value); setTablePage(1); }}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold px-3 py-2.5 focus:outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="">All Cities</option>
                  {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Filter: Store Format */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Format Classification</label>
              <div className="relative">
                <select
                  value={selectedFormat}
                  onChange={e => { setSelectedFormat(e.target.value); setTablePage(1); }}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold px-3 py-2.5 focus:outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="">All Formats</option>
                  {uniqueFormats.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Filter: Product Category */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Product Category</label>
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={e => { setSelectedCategory(e.target.value); setTablePage(1); }}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold px-3 py-2.5 focus:outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="">All Categories</option>
                  {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

          </div>

          {/* Quick search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setTablePage(1); }}
              placeholder="Search store name, city, ID, or product category..."
              className="w-full bg-slate-50 text-xs text-slate-900 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:outline-none pl-9 pr-4 py-2.5 rounded-xl transition-all"
            />
          </div>
        </section>

        {/* 3. DYNAMIC METRICS SUMMARY GRID (5 Required KPIs) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* KPI 1: Net Sales */}
          <MetricCard
            id="kpi-net-sales"
            title="Net Sales Revenue"
            value={`$${Math.round(activeMetrics.totalNetSales).toLocaleString()}`}
            subtitle={`Gross sales: $${Math.round(activeMetrics.totalGrossSales).toLocaleString()}`}
            icon={Coins}
            color="indigo"
          />

          {/* KPI 2: Target Achievement */}
          <MetricCard
            id="kpi-target-achievement"
            title="Target Achievement"
            value={`${activeMetrics.targetAchievement.toFixed(1)}%`}
            subtitle={`Budget: $${Math.round(activeMetrics.totalSalesTarget).toLocaleString()}`}
            icon={TrendingUp}
            progress={activeMetrics.targetAchievement}
            color="emerald"
          />

          {/* KPI 3: Average Transaction Value (ATV) */}
          <MetricCard
            id="kpi-atv"
            title="Average Transaction Value"
            value={`$${activeMetrics.averageTransactionValue.toFixed(2)}`}
            subtitle={`${activeMetrics.totalTransactions.toLocaleString()} Transactions`}
            icon={ShoppingBag}
            trend={{
              value: `${(activeMetrics.totalUnitsSold / (activeMetrics.totalTransactions || 1)).toFixed(1)} items/basket`,
              isPositive: true
            }}
            color="blue"
          />

          {/* KPI 4: Return Rate */}
          <MetricCard
            id="kpi-return-rate"
            title="Return Rate"
            value={`${activeMetrics.returnRate.toFixed(2)}%`}
            subtitle={`Returns: $${Math.round(activeMetrics.totalReturnsAmount).toLocaleString()}`}
            icon={AlertTriangle}
            trend={{
              value: "Threshold: 5.0%",
              isPositive: activeMetrics.returnRate < 5.0
            }}
            color="rose"
          />

          {/* KPI 5: Discount Rate */}
          <MetricCard
            id="kpi-discount-rate"
            title="Discount Rate"
            value={`${activeMetrics.discountRate.toFixed(2)}%`}
            subtitle={`Marketing: $${Math.round(activeMetrics.totalMarketingSpend).toLocaleString()}`}
            icon={Percent}
            color="amber"
          />

        </div>

        {/* 4. TABBED GRAPHICAL ANALYTICS SECTION */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 font-sans">
              Visual Sales intelligence dashboard
            </h2>
            <div className="h-px bg-slate-200/60 flex-1 ml-4" />
          </div>

          <RetailCharts
            id="analytics-charts"
            filteredSales={filteredSales}
            allSales={weeklySales}
            selectedRegion={selectedRegion}
            onSelectRegion={setSelectedRegion}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            selectedFormat={selectedFormat}
            onSelectFormat={setSelectedFormat}
          />
        </section>

        {/* 5. BUSINESS INSIGHT SUMMARY & STRATEGIC DIAGNOSTICS */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Outlier Card 1: Regional Disparities */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-indigo-600">
                <MapPin className="w-4 h-4" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 font-sans">
                  Regional Disparities
                </h4>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-2 font-display">
                Top & Bottom Performing Regions
              </h3>
              
              <div className="mt-4 space-y-3.5">
                {/* Best performer */}
                <div className="flex items-center justify-between p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Best Performer</span>
                    <div className="text-sm font-bold text-slate-800">{activeMetrics.topRegion} Region</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-emerald-700 font-mono">
                      ${Math.round(activeMetrics.regionMetrics[activeMetrics.topRegion]?.netSales || 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400 font-semibold">
                      {Math.round((activeMetrics.regionMetrics[activeMetrics.topRegion]?.netSales / (activeMetrics.regionMetrics[activeMetrics.topRegion]?.target || 1)) * 100)}% Target Met
                    </div>
                  </div>
                </div>

                {/* Worst performer */}
                <div className="flex items-center justify-between p-2.5 bg-rose-50/50 rounded-xl border border-rose-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Underperformer</span>
                    <div className="text-sm font-bold text-slate-800">{activeMetrics.bottomRegion} Region</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-rose-700 font-mono">
                      ${Math.round(activeMetrics.regionMetrics[activeMetrics.bottomRegion]?.netSales || 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400 font-semibold">
                      {Math.round((activeMetrics.regionMetrics[activeMetrics.bottomRegion]?.netSales / (activeMetrics.regionMetrics[activeMetrics.bottomRegion]?.target || 1)) * 100)}% Target Met
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 italic">
              Geographical distribution computed from dynamic active sales data.
            </p>
          </div>

          {/* Outlier Card 2: Target Gaps & Lagging Nodes */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-rose-500">
                <AlertTriangle className="w-4 h-4" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 font-sans">
                  Target Diagnostics
                </h4>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-2 font-display">
                Stores Missing Target Gaps
              </h3>

              <div className="mt-4 space-y-2">
                {activeMetrics.storesMissingTarget.length > 0 ? (
                  activeMetrics.storesMissingTarget.slice(0, 3).map(store => {
                    const gapValue = store.target - store.netSales;
                    return (
                      <div key={store.store_id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 last:border-0">
                        <div className="truncate w-36">
                          <span className="font-bold text-slate-800 font-sans block truncate">{store.store_name}</span>
                          <span className="text-[9px] text-slate-400 font-mono uppercase">{store.format} • {store.region}</span>
                        </div>
                        <div className="text-right font-mono">
                          <div className="text-rose-600 font-bold">-{store.achievement}%</div>
                          <div className="text-[10px] text-slate-400">Gap: -${Math.round(gapValue).toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-6 text-center text-[11px] text-slate-400 flex flex-col items-center gap-1.5">
                    <Check className="w-6 h-6 text-emerald-500" />
                    <span>All stores in selection successfully hit targets!</span>
                  </div>
                )}
              </div>
            </div>

            <p className="text-[10px] text-slate-400 italic">
              Stores sorted by largest percentage shortfall.
            </p>
          </div>

          {/* Outlier Card 3: Reverse Logistics Risks */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-amber-500">
                <Percent className="w-4 h-4" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 font-sans">
                  Reverse Logistics
                </h4>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-2 font-display">
                High Return Categories
              </h3>

              <div className="mt-4 space-y-2.5">
                {activeMetrics.highReturnCategories.slice(0, 3).map((cat, idx) => (
                  <div key={cat.category} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-indigo-500 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                        #{idx + 1}
                      </div>
                      <span className="text-xs font-bold text-slate-700 font-sans">{cat.category}</span>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-xs font-bold text-rose-600">{cat.returnRate.toFixed(1)}% Return Rate</div>
                      <div className="text-[9px] text-slate-400">Value: ${Math.round(cat.returns).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-slate-400 italic">
              Sectors categorized by return rate percentage.
            </p>
          </div>

        </section>

        {/* 6. GENATIVE STRATEGIC AI ADVISOR HUB */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 font-sans">
              Gemini Generative Advisory & Chat Co-Pilot
            </h2>
            <div className="h-px bg-slate-200/60 flex-1 ml-4" />
          </div>

          <AIAdvisor
            id="gemini-advisory-center"
            aggregatedData={activeMetrics}
          />
        </section>

        {/* 7. GRANULAR TRANSACTIONAL SALES RECORDS TABLE */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 font-sans">
              Active Weekly Transaction Database Grid
            </h2>
            <div className="h-px bg-slate-200/60 flex-1 ml-4" />
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            
            {/* Toolbar */}
            <div className="p-4 bg-slate-50/40 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-700 font-sans">
                  Granular Weekly Records ({filteredSales.length.toLocaleString()} matching records)
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleExportStoreListCSV}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5 text-sky-600" />
                  Export Stores List
                </button>
                <button
                  onClick={handleExportFilteredCSV}
                  className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Sales Table (CSV)
                </button>
              </div>
            </div>

            {/* Grid Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    <th className="py-3 px-5">Week</th>
                    <th className="py-3 px-5">Store ID & Name</th>
                    <th className="py-3 px-5">Region / City</th>
                    <th className="py-3 px-5">Product Category</th>
                    <th className="py-3 px-5 text-right">Net Sales / Target</th>
                    <th className="py-3 px-5 text-right">Discount Rate</th>
                    <th className="py-3 px-5 text-right">Return Rate</th>
                    <th className="py-3 px-5 text-center">Stockouts</th>
                    <th className="py-3 px-5 text-right">Customer CSI</th>
                    <th className="py-3 px-5 text-right">Footfall</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-[11px]">
                  {paginatedSales.length > 0 ? (
                    paginatedSales.map((r, idx) => {
                      const achievement = r.sales_target > 0 ? Math.round((r.net_sales / r.sales_target) * 100) : 0;
                      const returnRate = r.net_sales > 0 ? (r.returns_amount / r.net_sales) * 100 : 0;
                      const discountRate = r.gross_sales > 0 ? (r.discount_amount / r.gross_sales) * 100 : 0;

                      return (
                        <tr
                          key={`${r.store_id}-${r.week_start_date}-${r.product_category}`}
                          className="hover:bg-slate-50/40 transition-all cursor-pointer group"
                          onClick={() => setActiveDrilldownRecord(r)}
                        >
                          <td className="py-3 px-5 font-mono text-slate-500 font-semibold">{r.week_start_date}</td>
                          <td className="py-3 px-5">
                            <div className="font-bold text-slate-800 font-sans group-hover:text-indigo-600 transition-colors">
                              {r.store_name}
                            </div>
                            <span className="text-[9px] text-slate-400 font-mono block uppercase">{r.store_id} • {r.store_format}</span>
                          </td>
                          <td className="py-3 px-5">
                            <span className="font-sans text-slate-600 block font-medium">{r.city}</span>
                            <span className="text-[9px] text-slate-400 font-mono block">{r.region} Region</span>
                          </td>
                          <td className="py-3 px-5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 text-slate-700">
                              {r.product_category}
                            </span>
                          </td>
                          <td className="py-3 px-5 text-right font-mono">
                            <div className="font-bold text-slate-900">${Math.round(r.net_sales).toLocaleString()}</div>
                            <div className="text-[9px] text-slate-400 flex items-center justify-end gap-1">
                              <span>Target: ${Math.round(r.sales_target).toLocaleString()}</span>
                              <span className={`font-semibold ${achievement >= 100 ? "text-emerald-600" : "text-amber-600"}`}>
                                ({achievement}%)
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-5 text-right font-mono font-medium text-slate-600">
                            {discountRate.toFixed(1)}%
                          </td>
                          <td className="py-3 px-5 text-right font-mono font-medium text-slate-600">
                            <span className={returnRate > 7 ? "text-rose-600 font-bold" : "text-slate-600"}>
                              {returnRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 px-5 text-center font-mono">
                            {r.stockouts > 0 ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-50 text-rose-600 border border-rose-100 font-bold text-[9px]" title={`${r.stockouts} stockout incidents`}>
                                {r.stockouts}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-3 px-5 text-right">
                            <div className="flex items-center justify-end gap-1 font-mono font-bold text-slate-700">
                              <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />
                              {r.customer_rating.toFixed(1)}
                            </div>
                          </td>
                          <td className="py-3 px-5 text-right font-mono text-slate-500">
                            {r.footfall.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-slate-400">
                        No transactions found matching active multi-dimensional filter selections.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/20 text-xs text-slate-500 font-mono flex flex-col sm:flex-row items-center justify-between gap-3">
              <span>Showing {filteredSales.length === 0 ? 0 : (tablePage - 1) * itemsPerPage + 1} - {Math.min(tablePage * itemsPerPage, filteredSales.length)} of {filteredSales.length} database records</span>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTablePage(p => Math.max(1, p - 1))}
                  disabled={tablePage === 1}
                  className="px-3 py-1.5 border border-slate-200 hover:border-slate-300 rounded-lg bg-white disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-bold"
                >
                  Prev
                </button>
                <div className="px-3.5 py-1.5 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-600">
                  Page {tablePage} of {totalPages}
                </div>
                <button
                  onClick={() => setTablePage(p => Math.min(totalPages, p + 1))}
                  disabled={tablePage === totalPages}
                  className="px-3 py-1.5 border border-slate-200 hover:border-slate-300 rounded-lg bg-white disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-bold"
                >
                  Next
                </button>
              </div>
            </div>

          </div>
        </section>
        </>
        )}

      </main>

      {/* 8. FILE INGESTION SIDE-BY-SIDE MODAL / DIALOG */}
      <AnimatePresence>
        {uploadTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.96, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 15 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col"
            >
              
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5 text-slate-900">
                  <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <Upload className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm tracking-tight font-display">
                      {uploadTarget === "sales" ? "Ingest Weekly Sales Data" : "Ingest Store Directory Data"}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                      Upload standard compliant CSV or Excel spreadsheet
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setUploadTarget(null);
                    setUploadError(null);
                  }}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                
                {/* Drag-and-drop area */}
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    dragActive
                      ? "border-indigo-500 bg-indigo-50/20"
                      : "border-slate-200 hover:border-slate-300 bg-slate-50/30"
                  }`}
                  onClick={() => document.getElementById("csv-file-selector")?.click()}
                >
                  <input
                    type="file"
                    id="csv-file-selector"
                    className="hidden"
                    accept=".csv, .xlsx, .xls"
                    onChange={handleFileInput}
                  />

                  <div className="p-3.5 rounded-full bg-white border border-slate-100 text-slate-400 shadow-sm mb-3">
                    <Upload className="w-5.5 h-5.5 text-indigo-500" />
                  </div>
                  
                  <span className="text-xs font-black text-slate-800 font-sans block mb-1">
                    Drag and drop your CSV or Excel file here
                  </span>
                  <span className="text-[10px] text-slate-400 font-sans">
                    or click to browse local files on your PC
                  </span>
                </div>

                {/* Templates & Guidelines */}
                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl text-xs space-y-2">
                  <div className="font-bold text-slate-700 font-sans flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                    Required Spreadsheet Format (CSV or Excel)
                  </div>
                  <ul className="list-disc pl-5 text-[10px] text-slate-500 space-y-1">
                    {uploadTarget === "sales" ? (
                      <>
                        <li className="font-bold">Weekly Sales columns required:</li>
                        <li className="font-mono text-[9px] text-slate-600 break-all leading-tight">
                          week_start_date, region, store_id, store_name, city, store_format, product_category, footfall, transactions, units_sold, gross_sales, discount_amount, net_sales, sales_target, inventory_on_hand, stockouts, returns_amount, customer_rating, marketing_spend
                        </li>
                      </>
                    ) : (
                      <>
                        <li className="font-bold">Store Directory columns required:</li>
                        <li className="font-mono text-[9px] text-slate-600 break-all leading-tight">
                          store_id, store_name, region, city, store_format
                        </li>
                      </>
                    )}
                  </ul>
                  
                  <button
                    onClick={() => triggerDownloadTemplate(uploadTarget)}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-2 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    Download Compliant CSV Template
                  </button>
                </div>

                {/* Feedback */}
                {uploadSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs font-bold text-center animate-pulse">
                    {uploadSuccess}
                  </div>
                )}

                {uploadError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs text-center font-sans">
                    <span className="font-bold block mb-1">Validation Error</span>
                    {uploadError}
                  </div>
                )}

              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 9. DETAILED DRILLDOWN DRAWER */}
      <AnimatePresence>
        {activeDrilldownRecord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-xs flex justify-end"
            onClick={() => setActiveDrilldownRecord(null)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="bg-white w-full max-w-md h-full shadow-2xl overflow-y-auto flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-2.5 rounded-lg text-indigo-700 bg-indigo-50 border border-indigo-100">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm tracking-tight text-slate-900 font-sans">
                      Transaction Record Detail
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase">
                      Category: {activeDrilldownRecord.product_category}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveDrilldownRecord(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 p-6 space-y-6">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Store Profile</span>
                  <h4 className="text-base font-bold text-slate-900 font-display mt-0.5">{activeDrilldownRecord.store_name}</h4>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {activeDrilldownRecord.city} ({activeDrilldownRecord.region} Region)
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1 uppercase">
                    ID: {activeDrilldownRecord.store_id} • Format: {activeDrilldownRecord.store_format}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">Net Sales</span>
                    <span className="text-sm font-bold font-mono text-slate-950 block mt-1">
                      ${Math.round(activeDrilldownRecord.net_sales).toLocaleString()}
                    </span>
                    <span className="text-[9px] text-slate-400 font-sans block">
                      Gross: ${Math.round(activeDrilldownRecord.gross_sales).toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">Sales Target</span>
                    <span className="text-sm font-bold font-mono text-slate-950 block mt-1">
                      ${Math.round(activeDrilldownRecord.sales_target).toLocaleString()}
                    </span>
                    <span className={`text-[10px] font-bold ${activeDrilldownRecord.net_sales >= activeDrilldownRecord.sales_target ? "text-emerald-600" : "text-amber-600"}`}>
                      {Math.round((activeDrilldownRecord.net_sales / activeDrilldownRecord.sales_target) * 100)}% achieved
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">Returns</span>
                    <span className="text-sm font-bold font-mono text-rose-600 block mt-1">
                      ${Math.round(activeDrilldownRecord.returns_amount).toLocaleString()}
                    </span>
                    <span className="text-[9px] text-slate-400 font-sans block">
                      Rate: {((activeDrilldownRecord.returns_amount / (activeDrilldownRecord.net_sales || 1)) * 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">Discount Applied</span>
                    <span className="text-sm font-bold font-mono text-slate-900 block mt-1">
                      ${Math.round(activeDrilldownRecord.discount_amount).toLocaleString()}
                    </span>
                    <span className="text-[9px] text-slate-400 font-sans block">
                      Rate: {((activeDrilldownRecord.discount_amount / (activeDrilldownRecord.gross_sales || 1)) * 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">Stockout Outages</span>
                    <span className={`text-sm font-bold font-mono block mt-1 ${activeDrilldownRecord.stockouts > 0 ? "text-rose-600" : "text-slate-700"}`}>
                      {activeDrilldownRecord.stockouts} Days
                    </span>
                    <span className="text-[9px] text-slate-400 font-sans block">
                      Stock: {activeDrilldownRecord.inventory_on_hand.toLocaleString()} units
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">CSI Satisfaction</span>
                    <div className="flex items-center gap-1 text-sm font-bold font-mono text-slate-950 mt-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
                      {activeDrilldownRecord.customer_rating.toFixed(1)} / 5.0
                    </div>
                    <span className="text-[9px] text-slate-400 font-sans block">
                      Marketing: ${activeDrilldownRecord.marketing_spend.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Conversion metrics */}
                <div className="border-t border-slate-100 pt-5 text-xs space-y-2 text-slate-500">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-2">Customer Funnel Analytics</span>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span>Weekly Footfall Traffic</span>
                    <span className="font-mono font-bold text-slate-800">{activeDrilldownRecord.footfall.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span>Completed Transactions</span>
                    <span className="font-mono font-bold text-slate-800">{activeDrilldownRecord.transactions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span>Units Sold Volume</span>
                    <span className="font-mono font-bold text-slate-800">{activeDrilldownRecord.units_sold.toLocaleString()} units</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Traffic Conversion Rate</span>
                    <span className="font-mono font-bold text-slate-800">
                      {((activeDrilldownRecord.transactions / (activeDrilldownRecord.footfall || 1)) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

              </div>
              
              <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400 font-sans flex-shrink-0">
                Click outside this sidebar to return to database view
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
