"use client";

/**
 * 14-day clicks line chart. Colors come from the design tokens so the
 * chart flips with the theme (the old canvas did the same via CSS vars).
 */

import { useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
  type ChartData,
} from "chart.js";

import type { SeriesPoint } from "@/types/api";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Filler);

function token(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

export function ClicksChart({
  series,
  height = 160,
  ariaLabel = "Clicks over time",
}: {
  series: SeriesPoint[];
  height?: number;
  ariaLabel?: string;
}) {
  const [themeTick, setThemeTick] = useState(0);

  // Re-read tokens whenever the theme attribute flips (series re-renders
  // reuse the same tokens; theme colors do not depend on the data).
  const colors = useMemo(() => {
    void themeTick;
    return {
      line: token("--line", "#E3DCF2"),
      inkSoft: token("--ink-soft", "#575079"),
      violet: token("--violet", "#6C4DFF"),
      violetSoft: token("--violet-soft", "#ECE6FF"),
    };
  }, [themeTick]);

  useEffect(() => {
    // Theme flips set data-theme on <html> without changing series; pick
    // the new colors up then too.
    const observer = new MutationObserver(() => setThemeTick(Date.now()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  const data: ChartData<"line"> = {
    labels: series.map((point) => point.date),
    datasets: [
      {
        data: series.map((point) => point.clicks),
        borderColor: colors.violet,
        backgroundColor: colors.violetSoft,
        borderWidth: 2,
        tension: 0.35,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 3,
      },
    ],
  };

  // chart.js types labels as possibly-undefined; server always sends them.
  const labels = data.labels as string[];

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        displayColors: false,
        callbacks: {
          title: (items) => {
            const date = items[0]?.label;
            if (!date) return "";
            return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
          },
        },
      },
    },
    interaction: { intersect: false, mode: "index" },
    scales: {
      x: {
        ticks: {
          maxTicksLimit: 7,
          color: colors.inkSoft,
          font: { size: 10, family: "DM Mono" },
          callback: (_value, index) => {
            const label = labels?.[index];
            if (!label) return "";
            return new Date(`${label}T00:00:00`).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
          },
        },
        grid: { color: colors.line, drawOnChartArea: false },
        border: { color: colors.line },
      },
      y: {
        beginAtZero: true,
        ticks: { precision: 0, color: colors.inkSoft, font: { size: 10, family: "DM Mono" }, maxTicksLimit: 5 },
        grid: { color: colors.line },
        border: { color: "transparent" },
      },
    },
  };

  return (
    <div style={{ minHeight: 0, height }} data-testid="clicks-chart">
      <Line data={data} options={options} aria-label={ariaLabel} />
    </div>
  );
}
