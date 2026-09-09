import Image from "next/image"
import { APP_TITLE, LOGO_SRC } from "@/lib/constants"
import { ThemeToggle } from "@/components/theme-toggle"

/**
 * AppHeader — top navigation bar.
 * To customize: edit APP_TITLE and LOGO_SRC in lib/constants.ts.
 */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background text-foreground">
      <div className="w-full px-4 h-14 flex items-center gap-3">
        {LOGO_SRC && (
          // Full navigation resets the quiz state even when already on `/`.
          // eslint-disable-next-line @next/next/no-html-link-for-pages
          <a href="/" aria-label="トップページに戻る" className="shrink-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
            <Image
              src={LOGO_SRC}
              alt={`${APP_TITLE} logo`}
              width={28}
              height={28}
            />
          </a>
        )}
        <span className="text-sm font-semibold tracking-tight">
          {APP_TITLE}
        </span>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
