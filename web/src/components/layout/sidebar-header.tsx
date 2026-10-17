import { FLEET_LOGO } from '@/brand/fleet-mark'

/** Expanded header from the approved artboards: collapse control, then the horizontal logo at 84×31. */
export function SidebarHeader({ collapsed, onToggleCollapse }: {
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  return (
    <div className="sidebar-header">
      <button
        className="sidebar-collapse-btn"
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <HamburgerIcon />
      </button>
      {collapsed ? null : (
        <span className="sidebar-label">
          <img
            src={FLEET_LOGO.light}
            alt="Fleet"
            width={FLEET_LOGO.width}
            height={FLEET_LOGO.height}
            className="sidebar-fleet-logo fleet-mark-light"
          />
          <img
            src={FLEET_LOGO.dark}
            alt="Fleet"
            width={FLEET_LOGO.width}
            height={FLEET_LOGO.height}
            className="sidebar-fleet-logo fleet-mark-dark"
          />
        </span>
      )}
    </div>
  )
}

function HamburgerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}
