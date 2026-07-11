import React from "react";
import { motion } from "motion/react";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  progress?: number; // percentage out of 100
  color: "emerald" | "blue" | "indigo" | "amber" | "rose";
}

export default function MetricCard({
  id,
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  progress,
  color,
}: MetricCardProps) {
  // Map color names to Tailwind colors
  const colorMap = {
    emerald: {
      bg: "bg-emerald-50 text-emerald-700 border-emerald-100",
      iconBg: "bg-emerald-500",
      bar: "bg-emerald-500",
      ring: "text-emerald-500",
      shadow: "shadow-emerald-100",
      text: "text-emerald-600",
    },
    blue: {
      bg: "bg-blue-50 text-blue-700 border-blue-100",
      iconBg: "bg-blue-500",
      bar: "bg-blue-500",
      ring: "text-blue-500",
      shadow: "shadow-blue-100",
      text: "text-blue-600",
    },
    indigo: {
      bg: "bg-indigo-50 text-indigo-700 border-indigo-100",
      iconBg: "bg-indigo-500",
      bar: "bg-indigo-500",
      ring: "text-indigo-500",
      shadow: "shadow-indigo-100",
      text: "text-indigo-600",
    },
    amber: {
      bg: "bg-amber-50 text-amber-700 border-amber-100",
      iconBg: "bg-amber-500",
      bar: "bg-amber-500",
      ring: "text-amber-500",
      shadow: "shadow-amber-100",
      text: "text-amber-600",
    },
    rose: {
      bg: "bg-rose-50 text-rose-700 border-rose-100",
      iconBg: "bg-rose-500",
      bar: "bg-rose-500",
      ring: "text-rose-500",
      shadow: "shadow-rose-100",
      text: "text-rose-600",
    },
  };

  const scheme = colorMap[color];

  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className={`relative overflow-hidden bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all duration-200`}
    >
      {/* Visual Accent Corner */}
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.03] -mr-8 -mt-8 ${scheme.iconBg}`} />

      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase font-sans">
            {title}
          </span>
          <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 font-display">
            {value}
          </h3>
        </div>

        <div className={`p-3 rounded-xl ${scheme.bg} border`}>
          <Icon className="w-5 h-5 stroke-[2]" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 font-sans">
          {subtitle}
        </span>

        {trend && (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold font-mono ${
              trend.isPositive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            {trend.isPositive ? "+" : ""}
            {trend.value}
          </span>
        )}
      </div>

      {progress !== undefined && (
        <div className="mt-4">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1 font-mono">
            <span>Progress Goal</span>
            <span className={`font-semibold ${scheme.text}`}>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, progress)}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
              className={`h-full ${scheme.bar} rounded-full`}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
