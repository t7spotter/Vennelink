"use client";

/**
 * Date+time picker built directly on the Vennelink design tokens (no external
 * widget, so theming dark/light and focus states come from CSS variables).
 *
 * Values stay in Django's datetime-local format "Y-m-dTH:i" so they can be
 * POSTed straight into LinkForm — the forms don't know this widget chose
 * to look nice. The trigger shows a human date ("Tue, Feb 3 · 9:00 AM"),
 * common schedules are one click away (preset chips), past days are
 * disabled when `minDate` is given, and the time uses the native
 * `input[type=time]` so mobile gets its own wheel picker. Every selection
 * commits immediately; the "Never" chip (or the trigger's ×) clears.
 *
 * Keyboard: Enter/Space opens, arrows move focus across day cells (roving
 * focus), Escape closes and returns focus to the trigger, outside click
 * closes. Reduced-motion users get no panel animation.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

const HUMAN = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const MONTH_NAME = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});
const DAY_LABEL = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "long",
  day: "numeric",
  year: "numeric",
});
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const DEFAULT_HOUR = 9;
const DAY_MS = 86400000;
const HOUR_MS = 3600000;

/** Local "2025-01-31T14:30" → Date, treating it as local wall-clock time. */
function toDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function toLocalString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Monday-first calendar key for a date ("grid cell identity"). */
function keyOf(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function DateTimeField({
  id,
  value,
  onChange,
  error,
  placeholder = "Never",
  minDate,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  error?: string;
  placeholder?: string;
  minDate?: Date | null;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => startOfDay(new Date()));
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [pendingFocus, setPendingFocus] = useState<Date | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cellRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const today = useMemo(() => startOfDay(new Date()), []);
  const minTs = minDate && typeof minDate === "object" ? minDate.getTime() : 0;
  const floor = useMemo(
    () => (minTs ? startOfDay(new Date(minTs)) : null),
    [minTs],
  );
  const selected = useMemo(() => toDate(value), [value]);

  const close = useCallback(() => {
    setOpen(false);
    setFocusKey(null);
    setPendingFocus(null);
    triggerRef.current?.focus();
  }, []);

  const toggle = useCallback(() => {
    if (open) {
      close();
      return;
    }
    const anchor = selected ?? floor ?? startOfDay(new Date());
    setView(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
    setFocusKey(keyOf(anchor));
    setOpen(true);
  }, [close, floor, open, selected]);

  const commit = useCallback(
    (next: Date) => onChange(toLocalString(next)),
    [onChange],
  );

  const openAnchor = selected ?? floor ?? today;

  // Close on Escape and outside clicks while the panel is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
      }
    };
    const onDown = (event: MouseEvent) => {
      if (wrapRef.current && event.target instanceof Node && !wrapRef.current.contains(event.target)) {
        setOpen(false);
        setFocusKey(null);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [close, open]);

  // Roving focus inside the grid: after a month flip, focus follows the
  // arrow keys across the boundary.
  useEffect(() => {
    if (!pendingFocus || pendingFocus.getMonth() !== view.getMonth()) return;
    cellRefs.current[keyOf(pendingFocus)]?.focus();
    setPendingFocus(null);
  }, [pendingFocus, view]);

  /** Merge the current (or default) clock time onto a day cell. */
  const withTime = useCallback(
    (day: Date): Date => {
      return new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        selected?.getHours() ?? DEFAULT_HOUR,
        selected?.getMinutes() ?? 0,
        0,
        0,
      );
    },
    [selected],
  );

  const pickDay = useCallback(
    (day: Date) => {
      commit(withTime(day));
      setFocusKey(keyOf(day));
    },
    [commit, withTime],
  );

  const setTimeText = useCallback(
    (text: string) => {
      if (!text) return;
      const [hours, minutes] = text.split(":").map(Number);
      const base = openAnchor;
      commit(
        new Date(
          base.getFullYear(),
          base.getMonth(),
          base.getDate(),
          hours,
          minutes,
          0,
          0,
        ),
      );
    },
    [commit, openAnchor],
  );

  const snapTimeNow = useCallback(() => {
    const now = new Date();
    const base = openAnchor;
    commit(
      new Date(
        base.getFullYear(),
        base.getMonth(),
        base.getDate(),
        now.getHours(),
        now.getMinutes(),
        0,
        0,
      ),
    );
  }, [commit, openAnchor]);

  const applyPreset = useCallback(
    (days: number, hoursOffset: number) => {
      // Whole-day offsets land at 9:00 local wall-clock time; sub-hour
      // offsets keep exact relative timing ("In 30 min").
      let next: Date;
      if (hoursOffset > 0) {
        next = new Date(Date.now() + days * DAY_MS + hoursOffset * HOUR_MS);
        next.setSeconds(0, 0);
      } else {
        next = new Date(Date.now() + days * DAY_MS);
        next.setHours(DEFAULT_HOUR, 0, 0, 0);
      }
      commit(next);
      close();
    },
    [close, commit],
  );

  const clear = useCallback(() => {
    onChange("");
    close();
  }, [close, onChange]);

  function moveFocus(day: Date, delta: number) {
    const next = addDays(day, delta);
    if (next.getMonth() !== view.getMonth()) {
      setView(new Date(next.getFullYear(), next.getMonth(), 1));
      setPendingFocus(next);
    } else {
      const key = keyOf(next);
      setFocusKey(key);
      cellRefs.current[key]?.focus();
    }
  }

  function onGridKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const key = target.dataset.key;
    if (!key) return;
    const [y, m, d] = key.split("-").map(Number);
    const day = new Date(y, m, d);
    const moves: Record<string, number> = {
      ArrowUp: -7,
      ArrowDown: 7,
      ArrowLeft: -1,
      ArrowRight: 1,
      Home: -day.getDate() + 1,
      End: 6 - ((day.getDay() + 6) % 7),
    };
    if (moves[event.key] === undefined) return;
    event.preventDefault();
    moveFocus(day, moves[event.key]);
  }

  const cells = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const start = addDays(first, -((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [view]);

  const timeText = selected
    ? `${String(selected.getHours()).padStart(2, "0")}:${String(
        selected.getMinutes(),
      ).padStart(2, "0")}`
    : "";

  return (
    <div id={`${id}-wrap`} className={`vn-dtp${error ? " is-invalid" : ""}`} ref={wrapRef}>
      <div className="vn-dtp-bar">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          className={`vn-dtp-trigger${value ? "" : " is-empty"}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={toggle}
        >
          <svg
            className="vn-dtp-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M8 2v4M16 2v4M3 10h18" />
            <rect x="3" y="4" width="18" height="18" rx="2" />
          </svg>
          <span className="vn-dtp-trigger-text">
            {selected ? HUMAN.format(selected) : placeholder}
          </span>
        </button>
        {value ? (
          <button
            type="button"
            className="vn-dtp-clear"
            aria-label={`Clear ${placeholder}`}
            onClick={clear}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        ) : null}
      </div>
      {open ? (
        <div
          className="vn-dtp-panel"
          role="dialog"
          aria-label="Pick a date and time"
        >
          <div className="vn-dtp-presets">
            <button type="button" className="vn-dtp-chip" onClick={() => applyPreset(0, 0.5)}>
              In 30 min
            </button>
            <button type="button" className="vn-dtp-chip" onClick={() => applyPreset(0, 1)}>
              In 1 hour
            </button>
            <button type="button" className="vn-dtp-chip" onClick={() => applyPreset(1, 0)}>
              Tomorrow 9:00
            </button>
            <button type="button" className="vn-dtp-chip" onClick={() => applyPreset(7, 0)}>
              In 1 week
            </button>
            {value ? (
              <button type="button" className="vn-dtp-chip vn-dtp-chip-never" onClick={clear}>
                Never
              </button>
            ) : null}
          </div>
          <div className="vn-dtp-month">
            <button
              type="button"
              className="vn-dtp-nav"
              aria-label="Previous month"
              onClick={() =>
                setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))
              }
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <span className="vn-dtp-month-name" aria-live="polite">
              {MONTH_NAME.format(view)}
            </span>
            <button
              type="button"
              className="vn-dtp-nav"
              aria-label="Next month"
              onClick={() =>
                setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))
              }
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
          <div className="vn-dtp-grid" onKeyDown={onGridKeyDown}>
            {WEEKDAYS.map((name) => (
              <span key={name} className="vn-dtp-dow" aria-hidden="true">
                {name}
              </span>
            ))}
            {cells.map((day) => {
              const key = keyOf(day);
              const other = day.getMonth() !== view.getMonth();
              const disabled = floor !== null && day < floor;
              const isSelected = selected !== null && sameDay(day, selected);
              return (
                <button
                  key={key}
                  ref={(el) => {
                    cellRefs.current[key] = el;
                  }}
                  data-key={key}
                  type="button"
                  tabIndex={focusKey === key ? 0 : -1}
                  className={`vn-dtp-day${other ? " vn-dtp-day--other" : ""}${
                    isSelected ? " vn-dtp-day--selected" : ""
                  }${sameDay(day, today) ? " vn-dtp-day--today" : ""}`}
                  aria-label={DAY_LABEL.format(day)}
                  aria-current={sameDay(day, today) ? "date" : undefined}
                  disabled={disabled}
                  onFocus={() => setFocusKey(key)}
                  onClick={() => pickDay(day)}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <div className="vn-dtp-timerow">
            <input
              type="time"
              step={300}
              className="vn-dtp-time"
              aria-label="Time"
              value={timeText}
              onChange={(event) => setTimeText(event.target.value)}
            />
            <button type="button" className="vn-dtp-chip" onClick={snapTimeNow}>
              Now
            </button>
          </div>
        </div>
      ) : null}
      {error ? <p className="vn-field-error">{error}</p> : null}
    </div>
  );
}
