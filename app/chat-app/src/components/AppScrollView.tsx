// src/components/AppScrollView.tsx

import { PropsWithChildren, useState } from "react";
import { RefreshControl, ScrollView, ScrollViewProps } from "react-native";

interface AppScrollViewProps extends ScrollViewProps {
  onRefreshPage?: () => Promise<void> | void;
}

export default function AppScrollView({
  children,
  onRefreshPage,
  ...props
}: PropsWithChildren<AppScrollViewProps>) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefreshPage) return;

    try {
      setRefreshing(true);
      await onRefreshPage();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView
      {...props}
      refreshControl={
        onRefreshPage ? (
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}
