import { cx } from '@/utils/cx';
import type {
  HTMLAttributes,
  HTMLProps,
  ReactNode,
  ElementType,
} from 'react';
import './card.css';

/* Card takes an optional `as` (a HTMLElement or the special `'interactive'`
 * marker) — simpler: expose two surfaces:

 * <Card>                      — plain surface
 * <Card interactive>          — clickable surface (role/cursor managed)
 * <Card as="a" href>          — link surface
 */

export interface CardProps extends Omit<HTMLProps<HTMLDivElement>, 'as'> {
  children: ReactNode;
  /** Marks the card as clickable; applies hover/active affordance. */
  interactive?: boolean;
  /** Render as another element (e.g. 'a', 'article', 'section'). */
  as?: ElementType;
}

export function Card({ interactive = false, as, className, children, ...rest }: CardProps) {
  const Tag = (as ?? 'div') as ElementType;
  return (
    <Tag
      className={cx(
        'card',
        interactive && !as && 'card--interactive',
        interactive && as ? 'card--hover' : undefined,
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('card__header', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cx('card__title', className)} {...rest}>
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cx('card__description', className)} {...rest}>
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('card__content', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('card__footer', className)} {...rest}>
      {children}
    </div>
  );
}