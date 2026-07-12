import { createNavigation } from "next-intl/navigation";
import { routing } from "@/i18n/routing";

// ロケール付きURLを自動で組み立ててくれる Link / useRouter / usePathname / redirect。
// コンポーネント側は "next/link" ではなくこちらを使うことで、
// 現在選択中の言語を維持したまま画面遷移できる。
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
