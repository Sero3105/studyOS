interface HeaderProps {
    userName: string;
}

function Header({ userName }: HeaderProps) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">Today&apos;s focus</p>
        <h1>Welcome back, {userName}</h1>
      </div>
      <p className="header-note">Focus. Learn. Improve.</p>
    </header>
  )
}

export default Header   