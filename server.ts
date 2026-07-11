import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Setup body parsing with increased limits for potential CSV data size
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// Helper to check and initialize Gemini API safely
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// 1. API: Generate Action-Oriented Business Summaries and Insights
app.post("/api/generate-insights", async (req, res) => {
  try {
    const { summaryType, aggregatedData } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(200).json({
        success: false,
        message: "Gemini API key is missing or not configured. To activate AI executive summaries, please set a valid GEMINI_API_KEY in Settings > Secrets.",
        insight: `### Executive Summary (Demo Mode)

**Overview**: Retail operations are performing steadily across all regions, with total sales of **$${(aggregatedData?.totalSales || 0).toLocaleString()}** achieving **${aggregatedData?.targetProgress || 0}%** of target.

**Key Observations**:
1. **Top Performer**: The **${aggregatedData?.topRegion || "N/A"}** region leads in total revenue, driven by flagship store performance.
2. **Growth Opportunities**: The **${aggregatedData?.bottomRegion || "N/A"}** region is currently lagging at **${aggregatedData?.bottomRegionPerformance || 0}%** of sales target, representing our primary area of focus.
3. **Category Pulse**: **Electronics and Apparel** continue to comprise the bulk of customer spending, while **Grocery and Home** segments show emerging traction.

*Configure your GEMINI_API_KEY in the Secrets panel to generate real-time generative insights tailored to this specific dataset.*`
      });
    }

    let prompt = "";
    if (summaryType === "executive") {
      prompt = `You are a Principal Retail Sales Intelligence Advisor. Analyze the following aggregated performance metrics and generate a high-impact, professional executive summary of the retail chain. 

Aggregated Performance Metrics:
- Total Net Sales Revenue: $${(aggregatedData.totalNetSales || 0).toLocaleString()}
- Total Gross Sales Revenue: $${(aggregatedData.totalGrossSales || 0).toLocaleString()}
- Total Sales Target: $${(aggregatedData.totalSalesTarget || 0).toLocaleString()}
- Target Achievement %: ${(aggregatedData.targetAchievement || 0).toFixed(1)}%
- Average Discount Rate: ${(aggregatedData.discountRate || 0).toFixed(2)}%
- Average Return Rate: ${(aggregatedData.returnRate || 0).toFixed(2)}%
- Total Return Amount: $${(aggregatedData.totalReturnsAmount || 0).toLocaleString()}
- Total Transaction Count: ${(aggregatedData.totalTransactions || 0).toLocaleString()}
- Average Transaction Value (ATV): $${(aggregatedData.averageTransactionValue || 0).toFixed(2)}
- Total Stockout Days/Events: ${aggregatedData.totalStockouts || 0}
- Total Marketing Spend: $${(aggregatedData.totalMarketingSpend || 0).toLocaleString()}
- Average Customer Rating: ${(aggregatedData.averageRating || 0).toFixed(2)} / 5.0
- Top Performing Region (Sales): ${aggregatedData.topRegion || "N/A"}
- Worst Performing Region (Sales): ${aggregatedData.bottomRegion || "N/A"}
- Regional Performance Map: ${JSON.stringify(aggregatedData.regionMetrics || {})}
- Product Category Breakdown (with return and discount rates): ${JSON.stringify(aggregatedData.categoryMetrics || [])}
- Stores Missing Target: ${JSON.stringify((aggregatedData.storesMissingTarget || []).slice(0, 5).map((s: any) => ({ name: s.store_name, achievement: s.achievement, netSales: s.netSales, target: s.target })))}

Provide a formatted Markdown report with these sections:
1. **Executive Performance Pulse**: A high-level assessment of the chain's overall performance, calling out net vs gross sales, target achievement, and average basket value.
2. **Regional Outliers & Performance Geography**: Compare the best region (${aggregatedData.topRegion}) against the worst region (${aggregatedData.bottomRegion}). Highlight the performance of other regions.
3. **Product Category & Return Rate Analysis**: Call out which categories have high return rates or high discount rates. Provide merchandizing and stock layout advice.
4. **Supply Chain & Stockout Diagnostic**: Discuss the ${aggregatedData.totalStockouts} stockout events and explain how inventory on hand or marketing spend can be optimized.
5. **Action Items (Next 30 Days)**: Exactly 3 highly specific, quantitative business recommendations to resolve margin leakages (discounts/returns) and boost sales.
Keep your response concise, highly readable, executive-level, and professional. Avoid generic filler.`;
    } else if (summaryType === "optimization") {
      prompt = `You are an operational retail consultant specializing in turnaround strategies. Focus heavily on low-performing stores, target shortfalls, and CSI ratings in this dataset.

Aggregated Metrics:
- Worst Performing Region: ${aggregatedData.bottomRegion || "N/A"}
- Stores Missing Target: ${JSON.stringify((aggregatedData.storesMissingTarget || []).map((s: any) => ({ name: s.store_name, format: s.format, achievement: s.achievement, gap: s.target - s.netSales, rating: s.avgRating })))}
- Average Customer Satisfaction Rating: ${(aggregatedData.averageRating || 0).toFixed(2)} / 5.0
- Total Stockout Incidents: ${aggregatedData.totalStockouts || 0}

Provide a formatted Markdown report with these sections:
1. **Turnaround Diagnostics for Underperforming Stores**: Analyze the specific stores missing target, focusing on their target gap, store format, and customer rating.
2. **CSI & Customer Loyalty Strategy**: Propose concrete methods to improve service and rating in locations scoring below average.
3. **Stockout Mitigation Action Plan**: Address stockouts and outline optimal inventory rebalancing strategies to ensure key items are on shelves.
Keep it punchy, practical, and highly strategic.`;
    } else {
      prompt = `You are a Merchandise Planning and Margin Optimization Expert. Analyze the category breakdown, discount rates, return rates, and marketing spends to maximize margin efficiency.

Aggregated Metrics:
- Product Category Breakdown (Metrics: Net Sales, Return Rate, Discount Rate, Stockouts): ${JSON.stringify(aggregatedData.categoryMetrics || [])}
- Average Discount Rate: ${(aggregatedData.discountRate || 0).toFixed(2)}%
- Average Return Rate: ${(aggregatedData.returnRate || 0).toFixed(2)}%
- Total Return Amount: $${(aggregatedData.totalReturnsAmount || 0).toLocaleString()}
- Total Marketing Spend: $${(aggregatedData.totalMarketingSpend || 0).toLocaleString()}
- Average Transaction Value (ATV): $${(aggregatedData.averageTransactionValue || 0).toFixed(2)}

Provide a formatted Markdown report with these sections:
1. **Product Sales Mix & Margin Contribution**: Identify key revenue drivers and assess whether discounts are boosting volume or eroding margins.
2. **Reverse Logistics & Return Prevention Blueprint**: Identify high-return categories and propose root-cause resolutions (e.g. sizing checks, electronic testing, shelf-life).
3. **Marketing ROI & Promotion Reallocation**: Review whether marketing spends align with category performance and propose a reallocated budget plan.
Keep it actionable and analytical.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a professional, world-class retail chief financial officer and merchandizer. You write clear, precise, and highly actionable markdown reports. Focus purely on business intelligence and financial metrics.",
        temperature: 0.2
      }
    });

    return res.status(200).json({
      success: true,
      insight: response.text
    });

  } catch (error: any) {
    console.error("Error generating insights:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// 2. API: Conversational Retail Assistant Chatbot
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, aggregatedData } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      const lastMessage = messages[messages.length - 1]?.content || "";
      return res.status(200).json({
        success: false,
        message: "Gemini API key is missing or not configured. To enable full interactive AI chat with your retail data, please configure a GEMINI_API_KEY in Secrets.",
        response: `I'm currently running in **Demo Mode** because no Gemini API key is configured. 

Based on your local dataset, here is what I can tell you:
* Your total sales revenue is **$${(aggregatedData?.totalSales || 15420000).toLocaleString()}** across **${aggregatedData?.storeCount || 15} stores**.
* The **${aggregatedData?.topRegion || "Northeast"}** region is the highest performing region, while the **${aggregatedData?.bottomRegion || "Southwest"}** region requires immediate focus.
* The average customer satisfaction rating is **${(aggregatedData?.averageCSI || 4.25).toFixed(2)}/5.0**.

To ask custom, deep analytical questions (like *"What should we do to boost Express format stores?"* or *"Analyze Southwest sales trends"*), please add your **GEMINI_API_KEY** in the AI Studio sidebar under **Settings > Secrets**!`
      });
    }

    const conversationHistory = messages.slice(-8).map((m: any) => {
      return {
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      };
    });

    const datasetSummary = `
Active Retail Dataset Context:
- Number of Stores: ${aggregatedData.storeCount || 0}
- Regions Analyzed: Northeast, Southeast, Midwest, Southwest, West
- Total Revenue: $${(aggregatedData.totalSales || 0).toLocaleString()}
- Total Budget/Target: $${(aggregatedData.totalTarget || 0).toLocaleString()}
- Target Achievement Rate: ${aggregatedData.targetProgress || 0}%
- Transaction Volume: ${(aggregatedData.totalTransactions || 0).toLocaleString()}
- Average Basket Value (ATV): $${(aggregatedData.averageTransactionValue || 0).toFixed(2)}
- Customer Satisfaction Index (CSI): ${(aggregatedData.averageCSI || 0).toFixed(2)} / 5.0
- Regional Sales breakdown: ${JSON.stringify(aggregatedData.regions || {})}
- Product category performance: ${JSON.stringify(aggregatedData.categories || {})}
- Format / Store Type performance: ${JSON.stringify(aggregatedData.storeTypes || {})}
- Full Stores Table Snapshot: ${JSON.stringify((aggregatedData.storesList || []).slice(0, 15).map((s: any) => ({ name: s.name, region: s.region, type: s.type, sales: s.sales, target: s.target, csi: s.csi })))}
`;

    const systemInstruction = `You are a high-level Retail Analytics Co-Pilot. You have access to real-time aggregated retail chain performance data.
Your goal is to answer user questions with quantitative precision, business clarity, and clear, action-oriented suggestions.

Guidelines:
1. Always reference actual numbers and percentages from the dataset when explaining points.
2. Keep responses highly organized, utilizing markdown tables, lists, or bold text for key insights.
3. Keep the tone executive, objective, and supportive of regional managers and executives.
4. If the user asks general or unrelated retail questions, connect them back to the active retail dataset statistics if possible.

Here is the current retail performance dataset snapshot:
${datasetSummary}
`;

    // We can use chat.sendMessage or generateContent with history. Let's do a chat flow using generateContent
    // mapping the conversation history and setting system instruction in config.
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        ...conversationHistory.slice(0, -1),
        {
          role: "user",
          parts: [{ text: `System context: ${datasetSummary}\n\nUser Question: ${messages[messages.length - 1].content}` }]
        }
      ],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3
      }
    });

    return res.status(200).json({
      success: true,
      response: response.text
    });

  } catch (error: any) {
    console.error("Error in AI chat co-pilot:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// Serve UI via Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Retail Sales Intelligence Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
