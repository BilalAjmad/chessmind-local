// ─── Brand mark: the MasterBot knight — our own piece set, flat ink tile ────
// No gradients, no glow, no borrowed logos: the same cburnett knight you play
// with, stamped on an ink square. Works in light and dark mode as-is.

export function KnightMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span
      className={className}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 45 45" width={size} height={size} className="block">
        <rect
          x="1" y="1" width="43" height="43" rx="7"
          fill="#1c1917"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1"
        />
        <g
          transform="translate(0,1.5)"
          fill="none"
          fillRule="evenodd"
          stroke="#000"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        >
          <path fill="#fff" d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" />
          <path
            fill="#fff"
            d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"
          />
          <path
            fill="#000"
            d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0m5.433-9.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5"
          />
        </g>
      </svg>
    </span>
  );
}
