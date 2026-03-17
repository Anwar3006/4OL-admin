import { MobileCardConfig } from '../mobile-card-types';
import { TConversationOutput } from '@/schemas/conversation.schema';
import { Badge } from '@/components/ui/badge';

export const conversationCardConfig: MobileCardConfig<TConversationOutput> = {
  header: {
    title: (data) => data.name || (data.type === 'direct' ? 'Direct Message' : 'Unnamed Group'),
    subtitle: (data) => data.description || 'No Description',
    badge: (data) => (
      <Badge
        variant={data.type === 'group' ? 'default' : 'secondary'}
      >
        {data.type}
      </Badge>
    ),
  },
  fields: [
    {
      id: 'members',
      label: 'Members',
      render: (data) => String(data.member_count),
    },
    {
      id: 'created_at',
      label: 'Created At',
      render: (data) => new Date(data.created_at).toLocaleDateString(),
    },
  ],
  getId: (data) => data.id,
};
