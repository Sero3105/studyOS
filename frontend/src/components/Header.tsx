interface HeaderProps {
    userName: string;
}

function Header({ userName }: HeaderProps) {
  return (
    <header>
      <h1>Welcome, {userName}!</h1>
      <p>Focus. Learn. Improve.</p>
    </header>
  )
}

export default Header   