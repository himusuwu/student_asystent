interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'secondary' | 'white'
  className?: string
}

export function LoadingSpinner({ 
  size = 'md', 
  color = 'primary', 
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }
  
  const colorClasses = {
    primary: 'border-blue-500 border-t-transparent',
    secondary: 'border-gray-400 border-t-transparent',
    white: 'border-white border-t-transparent'
  }
  
  return (
    <div className={`inline-block ${sizeClasses[size]} ${className}`}>
      <div className={`
        ${sizeClasses[size]} 
        ${colorClasses[color]} 
        border-2 
        rounded-full 
        animate-spin
      `} />
    </div>
  )
}

export function LoadingSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-300 dark:bg-gray-700 rounded ${className}`} />
  )
}

export function LoadingCard() {
  return (
    <div className="card-enhanced p-6 animate-pulse">
      <div className="flex items-start gap-4">
        <LoadingSkeleton className="w-12 h-12 rounded-xl" />
        <div className="flex-1 space-y-3">
          <LoadingSkeleton className="h-5 w-3/4" />
          <LoadingSkeleton className="h-4 w-1/2" />
          <div className="grid grid-cols-2 gap-4">
            <LoadingSkeleton className="h-3 w-full" />
            <LoadingSkeleton className="h-3 w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}