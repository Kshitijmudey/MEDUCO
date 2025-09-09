import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { forwardRef } from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon?: LucideIcon
  iconPosition?: 'left' | 'right'
  loading?: boolean
  children: React.ReactNode
  as?: any
  to?: string
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    icon: Icon,
    iconPosition = 'left',
    loading = false,
    children,
    className = '',
    disabled,
    as: Component = 'button',
    to,
    ...props
  }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus-ring disabled:opacity-50 disabled:cursor-not-allowed'
    
    const variants = {
      primary: 'btn-primary',
      outline: 'btn-outline',
      ghost: 'btn-ghost',
      danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    }
    
    const sizes = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-3 text-base',
      lg: 'px-6 py-4 text-lg',
    }

    const iconSizes = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    }

    const componentProps = {
      ref,
      className: `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`,
      disabled: disabled || loading,
      ...(to ? { to } : {}),
      ...props
    }

    return (
      <motion.div
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        style={{ display: 'inline-block' }}
      >
        <Component {...componentProps}>
        {loading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className={`${iconSizes[size]} border-2 border-current border-t-transparent rounded-full mr-2`}
          />
        ) : (
          Icon && iconPosition === 'left' && (
            <Icon className={`${iconSizes[size]} ${children ? 'mr-2' : ''}`} />
          )
        )}
        
        {children}
        
        {Icon && iconPosition === 'right' && !loading && (
          <Icon className={`${iconSizes[size]} ${children ? 'ml-2' : ''}`} />
        )}
        </Component>
      </motion.div>
    )
  }
)

Button.displayName = 'Button'

export default Button