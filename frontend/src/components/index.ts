/**
 * Design-system barrel. Import from '@/components' throughout the app.
 */
export { Button } from './button/button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './button/button';
export { IconButton } from './icon-button/icon-button';
export type { IconButtonProps, IconButtonSize } from './icon-button/icon-button';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card/card';
export type { CardProps } from './card/card';

export { Badge } from './badge/badge';
export type { BadgeProps, BadgeTone } from './badge/badge';

export { Input } from './input/input';
export type { InputProps } from './input/input';
export { Textarea } from './textarea/textarea';
export type { TextareaProps } from './textarea/textarea';
export { Select } from './select/select';
export type { SelectProps } from './select/select';
export { Checkbox } from './checkbox/checkbox';
export type { CheckboxProps } from './checkbox/checkbox';
export { FormField } from './form-field/form-field';
export type { FormFieldProps } from './form-field/form-field';

export { Progress, ProgressCircle } from './progress/progress';
export type { ProgressProps, ProgressCircleProps } from './progress/progress';
export { Spinner } from './spinner/spinner';
export type { SpinnerProps } from './spinner/spinner';
export { Skeleton } from './skeleton/skeleton';
export type { SkeletonProps } from './skeleton/skeleton';

export { Dialog } from './dialog/dialog';
export type { DialogProps } from './dialog/dialog';
export { Dropdown, DropdownItem, DropdownSeparator } from './dropdown/dropdown';
export type { DropdownProps, DropdownItemProps } from './dropdown/dropdown';

export { ToastProvider, useToast } from './toast/toast';
export type { ToastOptions, ToastTone } from './toast/toast';

export { EmptyState } from './empty-state/empty-state';
export type { EmptyStateProps } from './empty-state/empty-state';
export { ErrorState } from './error-state/error-state';
export type { ErrorStateProps } from './error-state/error-state';

export { Container } from './container/container';
export type { ContainerProps } from './container/container';
export { Section } from './section/section';
export type { SectionProps } from './section/section';

export { MotionReveal } from './motion/motion-reveal';
export type { MotionRevealProps } from './motion/motion-reveal';

export { Icon } from './icon/icon';
export type { IconProps, IconName } from './icon/icon';
export { Brand } from './brand/brand';
export type { BrandProps } from './brand/brand';