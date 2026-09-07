"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavTabs({
  items,
}: {
  items: { href: string; label: string }[];
}) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b bg-white px-6 dark:bg-black">
      {items.map((item) => {
        const active =
          item.href === pathname ||
          (item.href !== items[0].href && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
              active
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
