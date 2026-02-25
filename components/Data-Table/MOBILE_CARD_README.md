# Dynamic Mobile Card System

A flexible, reusable card system for displaying data in mobile views, similar to how DataTable columns work.

## 📁 Files Created

```
components/Data-Table/
├── mobile-card-types.ts          # Type definitions for card configurations
├── mobile-card.tsx                # Generic mobile card component
├── userCardConfig.tsx             # User entity card configuration
├── facilityCardConfig.tsx         # Facility entity card configuration
└── marketingCardConfig.tsx        # Marketing entity card configuration
```

## 🚀 Quick Start

### 1. Using with DataTable (Recommended)

Simply pass the `cardConfig` prop to your DataTable:

```tsx
import { DataTable } from "@/components/Data-Table/data-table";
import { userColumns } from "@/components/Data-Table/userColumns";
import { userCardConfig } from "@/components/Data-Table/userCardConfig";

<DataTable
  columns={userColumns}
  data={users}
  cardConfig={userCardConfig}  // 👈 Add this for mobile view
  route="users"
  pagination={paginationProps}
/>
```

### 2. Using Standalone

You can also use the MobileCard component directly:

```tsx
import { MobileCard } from "@/components/Data-Table/mobile-card";
import { userCardConfig } from "@/components/Data-Table/userCardConfig";

<MobileCard
  data={user}
  config={userCardConfig}
  onClick={() => router.push(`/users/${user.id}`)}
/>
```

## 🎨 Creating a New Card Configuration

Create a new file like `yourEntityCardConfig.tsx`:

```tsx
"use client";

import { Mail, Phone } from "lucide-react";
import { MobileCardConfig } from "./mobile-card-types";

export const yourEntityCardConfig: MobileCardConfig<YourEntityType> = {
  // Header Section
  header: {
    title: (data) => data.name,           // Main title
    subtitle: (data) => data.category,     // Optional subtitle
    badge: (data) => <StatusBadge />,      // Optional badge (status, etc.)
  },

  // Body Fields
  fields: [
    {
      id: "email",
      icon: <Mail className="h-4 w-4 shrink-0" />,
      render: (data) => <span>{data.email}</span>,
    },
    {
      id: "phone",
      icon: <Phone className="h-4 w-4 shrink-0" />,
      render: (data) => <span>{data.phone}</span>,
    },
    {
      id: "custom-field",
      label: "Label",  // Optional label before value
      render: (data) => <span>{data.customField}</span>,
      className: "pt-2 border-t",  // Optional custom styling
    },
  ],

  // Dropdown Actions
  actions: [
    {
      label: "Copy ID",
      onClick: (data) => navigator.clipboard.writeText(data.id),
      separator: true,  // Add separator after this item
    },
    {
      label: "Edit",
      onClick: (data) => console.log("Edit", data.id),
    },
    {
      label: "Delete",
      onClick: (data) => console.log("Delete", data.id),
      destructive: true,  // Renders in red
    },
  ],

  // Optional: Custom ID getter
  getId: (data) => data.id,
};
```

## 📦 Type Reference

### MobileCardConfig<TData>

The main configuration object for a card.

```typescript
interface MobileCardConfig<TData> {
  header: MobileCardHeader<TData>;
  fields: MobileCardField<TData>[];
  actions?: MobileCardAction<TData>[];
  getId?: (data: TData) => string;
}
```

### MobileCardHeader<TData>

Configuration for the card header section.

```typescript
interface MobileCardHeader<TData> {
  title: (data: TData) => ReactNode;     // Main title (required)
  subtitle?: (data: TData) => ReactNode;  // Subtitle (optional)
  badge?: (data: TData) => ReactNode;     // Badge component (optional)
}
```

### MobileCardField<TData>

Configuration for a single field in the card body.

```typescript
interface MobileCardField<TData> {
  id: string;                             // Unique identifier (required)
  label?: string;                         // Label before value (optional)
  icon?: ReactNode;                       // Icon component (optional)
  render: (data: TData) => ReactNode;     // Render function (required)
  className?: string;                     // Custom CSS classes (optional)
}
```

### MobileCardAction<TData>

Configuration for dropdown menu actions.

```typescript
interface MobileCardAction<TData> {
  label: string;                                      // Action label (required)
  onClick: (data: TData, e?: MouseEvent) => void;    // Click handler (required)
  destructive?: boolean;                              // Renders in red (optional)
  separator?: boolean;                                // Add separator after (optional)
}
```

## 🎯 Examples

### Example 1: User Card (already implemented)

```tsx
// components/Data-Table/userCardConfig.tsx
import { userCardConfig } from "./userCardConfig";

// In your page:
<DataTable
  columns={userColumns}
  data={users}
  cardConfig={userCardConfig}
  route="users"
/>
```

### Example 2: Facility Card (already implemented)

```tsx
// components/Data-Table/facilityCardConfig.tsx
import { facilityCardConfig } from "./facilityCardConfig";

// In your page:
<DataTable
  columns={facilityColumns}
  data={facilities}
  cardConfig={facilityCardConfig}
  route="facilities"
/>
```

### Example 3: Marketing Card (already implemented)

```tsx
// components/Data-Table/marketingCardConfig.tsx
import { marketingCardConfig } from "./marketingCardConfig";

// In your page:
<DataTable
  columns={marketingColumns}
  data={campaigns}
  cardConfig={marketingCardConfig}
  route="marketing"
/>
```

## 🎨 Advanced Customization

### Custom Field Rendering

You can render complex components in fields:

```tsx
{
  id: "status-with-action",
  render: (data) => (
    <div className="flex items-center justify-between">
      <StatusBadge status={data.status} />
      <Button size="sm" onClick={() => handleAction(data)}>
        Quick Action
      </Button>
    </div>
  ),
}
```

### Conditional Fields

Show fields based on data:

```tsx
fields: [
  {
    id: "email",
    icon: <Mail className="h-4 w-4" />,
    render: (data) => data.email ? (
      <span>{data.email}</span>
    ) : (
      <span className="text-muted-foreground">No email</span>
    ),
  },
]
```

### Dynamic Actions

Actions can be conditional:

```tsx
actions: [
  {
    label: data.status === "active" ? "Deactivate" : "Activate",
    onClick: (data) => toggleStatus(data.id),
  },
]
```

## 🔄 Migration from Old MobileUserCard

**Before:**
```tsx
<MobileUserCard user={user} onClick={handleClick} />
```

**After:**
```tsx
<MobileCard
  data={user}
  config={userCardConfig}
  onClick={handleClick}
/>
```

Or simply add `cardConfig` to your DataTable and it will automatically use the new system!

## ✨ Benefits

1. **Reusable**: Create once, use anywhere
2. **Type-Safe**: Full TypeScript support with generics
3. **Consistent**: Same pattern as table columns
4. **Flexible**: Easy to customize for any data type
5. **Maintainable**: Single source of truth for card layouts

## 🐛 Troubleshooting

### Cards not showing on mobile

Make sure you've passed the `cardConfig` prop to DataTable:

```tsx
<DataTable
  columns={yourColumns}
  data={yourData}
  cardConfig={yourCardConfig}  // Don't forget this!
  route="your-route"
/>
```

### TypeScript errors

Ensure your card config type matches your data type:

```tsx
// ✅ Correct
const cardConfig: MobileCardConfig<User> = { ... }

// ❌ Wrong
const cardConfig: MobileCardConfig<any> = { ... }
```

## 📝 Notes

- The old `mobile-user-card.tsx` can now be removed
- DataTable automatically switches between table (desktop) and cards (mobile)
- Cards are responsive by default
- All actions include click event stopPropagation to prevent card click

## 🤝 Contributing

When adding a new entity type:
1. Create a new card config file: `yourEntityCardConfig.tsx`
2. Import and use it in your page with DataTable
3. Update this README with your example
