// oz-next-app/src/features/wallet/ui/wallet-workspace-header.tsx
import type { ReactElement, ReactNode } from "react";
import { ReceiptText, WalletCards } from "lucide-react";

import { WorkspaceHeader } from "@/components/common/workspace-header";

export type WalletWorkspaceHeaderProps = Readonly<{
  titleId: string;
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode | undefined;
  workspace?: "wallet" | "credit-note";
}>;

export function WalletWorkspaceHeader({
  titleId,
  title,
  description,
  actions,
  workspace = "wallet",
}: WalletWorkspaceHeaderProps): ReactElement {
  return (
    <WorkspaceHeader
      titleId={titleId}
      title={title}
      description={description}
      icon={
        workspace === "credit-note" ? (
          <ReceiptText aria-hidden="true" />
        ) : (
          <WalletCards aria-hidden="true" />
        )
      }
      actions={actions}
      tone="primary"
    />
  );
}
