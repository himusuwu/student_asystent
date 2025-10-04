import { PropsWithChildren, HTMLAttributes } from 'react'

interface CardProps extends PropsWithChildren<HTMLAttributes<HTMLDivElement>> {
  variant?: 'default' | 'elevated' | 'outline' | 'glass'
  padding?: 'sm' | 'md' | 'lg'
  hover?: boolean
}

export function Card({ 
  children, 
  className = '', 
  variant = 'default',
  padding = 'md',
  hover = false,
  ...rest 
}: CardProps) {
  const baseClasses = 'rounded-2xl transition-all duration-300'
  
  const variantClasses = {
    default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md',
    elevated: 'bg-white dark:bg-gray-800 shadow-xl border-0',
    outline: 'border-2 border-blue-200 dark:border-blue-800 bg-transparent',
    glass: 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 shadow-2xl'
  }
  
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }
  
  const hoverClasses = hover 
    ? 'hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02] cursor-pointer' 
    : ''
  
  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${hoverClasses} ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
