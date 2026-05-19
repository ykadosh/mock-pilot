import { TopNavAuthButton } from "./TopNavAuthButton";
import { useTopNavAuth } from "./TopNavAuth.hooks";
import { TopNavLoginModal } from "./TopNavLoginModal";
import { TopNavUserMenu } from "./TopNavUserMenu";

export function TopNavAuth() {
  const {
    authenticated,
    avatarUrl,
    handleCancelLoginFlow,
    handleCloseLoginFlow,
    handleLoginClick,
    handleLogout,
    login,
    loginError,
    menuRef,
    showLoginFlow,
    showUserMenu,
    userCode,
  } = useTopNavAuth();

  return (
    <>
      <div className="relative" ref={menuRef}>
        <TopNavAuthButton authenticated={authenticated} avatarUrl={avatarUrl} login={login} onClick={handleLoginClick} />
        {showUserMenu && authenticated && <TopNavUserMenu avatarUrl={avatarUrl} login={login} onLogout={handleLogout} />}
      </div>
      {showLoginFlow && (
        <TopNavLoginModal
          loginError={loginError}
          userCode={userCode}
          onClose={handleCloseLoginFlow}
          onCancel={handleCancelLoginFlow}
        />
      )}
    </>
  );
}
