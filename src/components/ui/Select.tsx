import { SelectHTMLAttributes } from 'react'

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = '', children, ...rest } = props
  return (
    <select className={'rounded-md border border-neutral-600 bg-transparent px-3 py-2 ' + className} {...rest}>
      {children}
    </select>
  )
}
