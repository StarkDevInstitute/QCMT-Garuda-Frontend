import { NavLink } from 'react-router-dom'
import { Globe, ListFilter } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { label: 'Moment Tensor', to: '/', icon: Globe },
  { label: 'Events', to: '/events', icon: ListFilter },
]

export function TabBar() {
  return (
    <nav className="flex items-stretch h-9 px-2 border-b border-border bg-card shrink-0 gap-0.5">
      {tabs.map(({ label, to, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-1.5 px-4 h-full text-[12px] border-b-2 transition-all duration-150',
              isActive
                ? 'border-sky-400 text-sky-400 font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            )
          }
        >
          {({ isActive }: { isActive: boolean }) => (
            <>
              <Icon size={12} className={isActive ? 'text-sky-400' : ''} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

