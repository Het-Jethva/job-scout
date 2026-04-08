"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Resume", href: "/resume" },
  { name: "Jobs", href: "/jobs" },
  { name: "Matches", href: "/matches" },
]

export function PrimaryNav() {
  const pathname = usePathname()

  return (
    <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
      {navigation.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "transition-colors hover:text-foreground",
            pathname === item.href ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {item.name}
        </Link>
      ))}
    </nav>
  )
}
