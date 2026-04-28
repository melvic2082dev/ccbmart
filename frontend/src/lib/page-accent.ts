// Per-page accent palette. Each menu has a signature colour reused across
// the sidebar icon, the page header icon, the underline bar, and the
// summary card border. Classes are kept literal so Tailwind's JIT picks
// them up.

export type AccentKey =
  | 'emerald' | 'green' | 'indigo' | 'amber' | 'sky' | 'violet'
  | 'cyan' | 'teal' | 'purple' | 'orange' | 'rose';

export const ACCENT_CLASSES: Record<AccentKey, {
  icon: string;     // text colour for the lucide icon
  bar: string;      // background for the title underline
  border: string;   // border colour for the main card
}> = {
  emerald: { icon: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500/70', border: 'border-emerald-300 dark:border-emerald-800' },
  green:   { icon: 'text-green-600 dark:text-green-400',     bar: 'bg-green-500/70',   border: 'border-green-300 dark:border-green-800'     },
  indigo:  { icon: 'text-indigo-600 dark:text-indigo-400',   bar: 'bg-indigo-500/70',  border: 'border-indigo-300 dark:border-indigo-800'   },
  amber:   { icon: 'text-amber-600 dark:text-amber-400',     bar: 'bg-amber-500/70',   border: 'border-amber-300 dark:border-amber-800'     },
  sky:     { icon: 'text-sky-600 dark:text-sky-400',         bar: 'bg-sky-500/70',     border: 'border-sky-300 dark:border-sky-800'         },
  violet:  { icon: 'text-violet-600 dark:text-violet-400',   bar: 'bg-violet-500/70',  border: 'border-violet-300 dark:border-violet-800'   },
  cyan:    { icon: 'text-cyan-600 dark:text-cyan-400',       bar: 'bg-cyan-500/70',    border: 'border-cyan-300 dark:border-cyan-800'       },
  teal:    { icon: 'text-teal-600 dark:text-teal-400',       bar: 'bg-teal-500/70',    border: 'border-teal-300 dark:border-teal-800'       },
  purple:  { icon: 'text-purple-600 dark:text-purple-400',   bar: 'bg-purple-500/70',  border: 'border-purple-300 dark:border-purple-800'   },
  orange:  { icon: 'text-orange-600 dark:text-orange-400',   bar: 'bg-orange-500/70',  border: 'border-orange-300 dark:border-orange-800'   },
  rose:    { icon: 'text-rose-600 dark:text-rose-400',       bar: 'bg-rose-500/70',    border: 'border-rose-300 dark:border-rose-800'       },
};
