import * as React from "react"
import { cn } from "../../lib/utils"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const variants = {
      default: 'bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 focus:ring-blue-500',
      outline: 'border border-white/10 text-slate-100 bg-white/5 hover:bg-white/10 hover:border-white/20',
      ghost: 'text-slate-200 hover:bg-white/5',
      destructive: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
    }
    
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    }

    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

export { Button }