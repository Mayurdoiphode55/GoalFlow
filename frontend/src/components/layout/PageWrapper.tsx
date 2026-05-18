import { motion } from 'framer-motion'

interface PageWrapperProps {
  children: React.ReactNode
}

export function PageWrapper({ children }: PageWrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="page-container"
    >
      {children}
    </motion.div>
  )
}
