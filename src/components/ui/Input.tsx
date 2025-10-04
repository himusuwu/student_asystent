import { InputHTMLAttributes, forwardRef, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  variant?: 'default' | 'filled' | 'outline'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  variant = 'default',
  className = '',
  ...rest
}, ref) => {
  const baseClasses = 'w-full px-4 py-3 rounded-xl transition-all duration-300 focus:outline-none focus:ring-0'
  
  const variantClasses = {
    default: 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400',
    filled: 'bg-gray-100 dark:bg-gray-700 border-2 border-transparent focus:border-blue-500 dark:focus:border-blue-400',
    outline: 'bg-transparent border-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400'
  }
  
  const errorClasses = error 
    ? 'border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400' 
    : ''
  
  const iconPadding = leftIcon ? 'pl-12' : rightIcon ? 'pr-12' : ''
  
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500">
            {leftIcon}
          </div>
        )}
        
        <input
          ref={ref}
          className={`
            ${baseClasses} 
            ${variantClasses[variant]} 
            ${errorClasses} 
            ${iconPadding} 
            ${className}
            focus:shadow-lg focus:shadow-blue-500/20 dark:focus:shadow-blue-400/20
            hover:shadow-md hover:shadow-gray-200/50 dark:hover:shadow-gray-700/50
            placeholder:text-gray-400 dark:placeholder:text-gray-500
          `}
          {...rest}
        />
        
        {rightIcon && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500">
            {rightIcon}
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-2 text-sm text-red-500 dark:text-red-400 animate-slide-up">
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  )
})
