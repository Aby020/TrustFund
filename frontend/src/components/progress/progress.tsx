import { clampPercentage } from '@/utils/format';
import { useId } from 'react';
import { cx } from '@/utils/cx';
import './progress.css';

export interface ProgressProps extends React.ComponentPropsWithoutRef<'div'> {
  /** 0–100 (values outside are clamped). */
  value: number;
  /** Actionable label read by assistive tech. */
  label?: string;
}

/** Progress — determinate horizontal bar. */
export function Progress({ value, label = 'Progress', className, ...rest }: ProgressProps) {
  const clamped = clampPercentage(value / 100) * 100;
  const labelId = useId();
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cx('progress', className)}
      {...rest}
    >
      <span className="sr-only" id={labelId}>
        {label}: {Math.round(clamped)}%
      </span>
      <span className="progress__bar" style={{ width: `${clamped}%` }} />
    </div>
  );
}

export interface ProgressCircleProps {
  /** 0–100. */
  value: number;
  /** Optional size in px. */
  size?: number;
  label?: string;
  className?: string;
}

/** ProgressCircle — compact circular progress, e.g. campaign goal rings. */
export function ProgressCircle({
  value,
  size = 48,
  label = 'Progress',
  className,
}: ProgressCircleProps) {
  const clamped = clampPercentage(value / 100) * 100;
  const strokeWidth = Math.max(3, Math.round(size * 0.12));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / 100);
  const labelId = useId();

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cx('progress-circle', className)}
      style={{ inlineSize: size, blockSize: size }}
    >
      <span className="sr-only" id={labelId}>
        {label}: {Math.round(clamped)}%
      </span>
      <svg width={size} height={size} role="presentation">
        <circle
          className="progress-circle__track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
        />
        <circle
          className="progress-circle__value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <span className="progress-circle__label">{Math.round(clamped)}%</span>
    </div>
  );
}