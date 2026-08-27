import { useEffect } from 'react'

/** Confirmação discreta no rodapé. Some sozinha em 2600 ms (handoff). */
export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDone, 2600)
    return () => clearTimeout(t)
  }, [message, onDone])

  if (!message) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-7 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-[9px] rounded-full bg-ink px-[17px] py-[11px] text-[13.5px] text-cream shadow-[0_12px_30px_-12px_rgba(26,29,33,0.5)] [animation:toastIn_.2s_ease]"
    >
      <svg
        viewBox="0 0 14 14"
        className="h-[13px] w-[13px] shrink-0 text-toast-check"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M2.5 7.5l3 3 6-6.5" />
      </svg>
      {message}
    </div>
  )
}
