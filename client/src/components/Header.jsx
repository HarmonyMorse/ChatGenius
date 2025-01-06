import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";

const Header = ({ isSignIn, onToggle }) => {
    return (
        <header className="bg-white shadow-sm p-4">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">ChatGenius</h1>
                <div className="flex items-center gap-4">
                    <SignedOut>
                        <p className="text-sm text-gray-600">
                            {isSignIn ? "Don't have an account?" : "Already have an account?"}{' '}
                            <Link
                                to={isSignIn ? "/auth/signup" : "/auth/signin"}
                                className="font-medium text-blue-600 hover:text-blue-500"
                            >
                                {isSignIn ? "Sign up" : "Sign in"}
                            </Link>
                        </p>
                    </SignedOut>
                    <SignedIn>
                        <UserButton afterSignOutUrl="/auth" />
                    </SignedIn>
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
    isSignIn: PropTypes.bool.isRequired,
    onToggle: PropTypes.func.isRequired,
};

export default Header; 