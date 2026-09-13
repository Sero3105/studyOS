interface HeaderProps {
    userName: string;
}

function Header({ userName }: HeaderProps) {
  return (
    <header>
      <h3>Welcome, {userName}!</h3>
      <p>Focus. Learn. Improve.</p>
    </header>
  )
}

export default Header   