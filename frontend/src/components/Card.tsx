import { motion } from 'framer-motion'
import { forwardRef } from 'react'

interface CardProps {
  hover?: boolean
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hover = true, children, className = '', ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        whileHover={hover ? { y: -4, scale: 1.01 } : {}}
        className={`card ${hover ? 'card-hover' : ''} ${className}`}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

Card.displayName = 'Card'

export default Card