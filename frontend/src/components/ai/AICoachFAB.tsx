import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { AICoachDrawer } from './AICoachDrawer'

export function AICoachFAB() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 group">
        <button
          id="ai-coach-fab"
          onClick={() => setOpen(true)}
          className="w-14 h-14 bg-gradient-to-br from-primary-500 to-teal-600 rounded-full shadow-lg flex items-center justify-center cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-200"
        >
          <Sparkles className="w-6 h-6 text-white" />
        </button>
        <span className="absolute right-16 top-1/2 -translate-y-1/2 bg-neutral-800 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
          AI Goal Coach
        </span>
      </div>
      <AICoachDrawer open={open} onClose={() => setOpen(false)} />
    </>
  )
}
