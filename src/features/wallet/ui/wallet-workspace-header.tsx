// oz-next-app/src/features/wallet/ui/wallet-workspace-header.tsx
import type { ReactElement, ReactNode } from "react";
import { WalletCards } from "lucide-react";

import { WorkspaceHeader } from "@/components/common/workspace-header";

export type WalletWorkspaceHeaderProps = Readonly<{
  titleId: string;
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode | undefined;
}>;

export function WalletWorkspaceHeader({
  titleId,
  title,
  description,
  actions,
}: WalletWorkspaceHeaderProps): ReactElement {
  return (
    <WorkspaceHeader
      titleId={titleId}
      title={title}
      description={description}
      icon={<WalletCards aria-hidden="true" />}
      actions={actions}
      tone="primary"
    />
  );
}
