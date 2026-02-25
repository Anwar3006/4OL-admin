import { ReactNode } from "react";

/**
 * Configuration for a single field in the mobile card
 */
export interface MobileCardField<TData> {
  /** Unique identifier for the field */
  id: string;

  /** Optional label to display before the value */
  label?: string;

  /** Optional icon component to display before the value */
  icon?: ReactNode;

  /** Function to render the field value */
  render: (data: TData) => ReactNode;

  /** Optional CSS classes for the field wrapper */
  className?: string;

  /** Whether to show this field in the header section (default: false) */
  showInHeader?: boolean;
}

/**
 * Configuration for the card header section
 */
export interface MobileCardHeader<TData> {
  /** Main title - can be a function or static string */
  title: (data: TData) => ReactNode;

  /** Optional subtitle - can be a function or static string */
  subtitle?: (data: TData) => ReactNode;

  /** Optional badge component (e.g., status badge) */
  badge?: (data: TData) => ReactNode;
}

/**
 * Configuration for dropdown menu actions
 */
export interface MobileCardAction<TData> {
  /** Label for the action */
  label: string;

  /** Handler function when action is clicked */
  onClick: (data: TData, e?: React.MouseEvent) => void;

  /** Whether this is a destructive action (renders in red) */
  destructive?: boolean;

  /** Whether to show a separator after this item */
  separator?: boolean;
}

/**
 * Complete configuration for a mobile card
 */
export interface MobileCardConfig<TData> {
  /** Header configuration */
  header: MobileCardHeader<TData>;

  /** Array of fields to display in the card body */
  fields: MobileCardField<TData>[];

  /** Optional actions for the dropdown menu */
  actions?: MobileCardAction<TData>[];

  /** Optional function to get a unique ID from the data (defaults to 'id') */
  getId?: (data: TData) => string;
}
