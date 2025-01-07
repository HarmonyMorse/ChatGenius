import PropTypes from 'prop-types';

const Header = ({ isSignIn, onToggle, onLogout, onModeToggle }) => {
    return (
        <header className="bg-white shadow-sm p-4">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">ChatGenius</h1>
                <div className="flex items-center gap-4">
                    {onLogout ? (
                        <button
                            onClick={onLogout}
                            className="text-sm font-medium text-blue-600 hover:text-blue-500"
                        >
                            Sign out
                        </button>
                    ) : (
                        <button
                            onClick={onModeToggle}
                            className="text-sm text-gray-600"
                        >
                            {isSignIn ? "Don't have an account?" : "Already have an account?"}{' '}
                            <span className="font-medium text-blue-600 hover:text-blue-500">
                                {isSignIn ? "Sign up" : "Sign in"}
                            </span>
                        </button>
                    )}
                    <button
                        onClick={onToggle}
                        className="text-sm text-gray-600 hover:text-gray-900"
                    >
                        Toggle Header
                    </button>
                </div>
            </div>
        </header>
    );
};

Header.propTypes = {
    isSignIn: PropTypes.bool,
    onToggle: PropTypes.func.isRequired,
    onLogout: PropTypes.func,
    onModeToggle: PropTypes.func,
};

export default Header; 