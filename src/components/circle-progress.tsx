type CircleProgressProps = {
    value: number; // 0 - 100
    size?: number;
    strokeWidth?: number;
};

export function CircleProgress({
    value,
    size = 96,
    strokeWidth = 8,
}: CircleProgressProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    const isDone = value >= 100;

    return (
        <div className="relative flex items-center justify-center">
            <svg
                width={size}
                height={size}
                className="-rotate-90"
            >
                {/* Glow filter */}
                <defs>
                    <filter id="glow">
                        <feGaussianBlur
                            stdDeviation="3"
                            result="coloredBlur"
                        />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Background */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="hsl(var(--muted))"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />

                {/* Glow progress */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="hsl(var(--primary))"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    filter="url(#glow)"
                    className={`
                        transition-[stroke-dashoffset] duration-500 ease-out
                        ${!isDone ? "animate-pulse" : ""}
                    `}
                />
            </svg>

            {/* Center label */}
            <span
                className={`
                    absolute text-sm font-semibold
                    ${isDone ? "text-green-500" : "text-foreground"}
                `}
            >
                {isDone ? "✓" : `${value}%`}
            </span>
        </div>
    );
}
