import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { SignIn, SignUp } from "@clerk/clerk-react";
import Header from '../components/Header';
import Footer from '../components/Footer';

const Auth = () => {
    const [showHeader, setShowHeader] = useState(true);
    const [showFooter, setShowFooter] = useState(true);
    const location = useLocation();
    const isSignIn = location.pathname === '/auth' || location.pathname === '/auth/signin';

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            {showHeader && (
                <Header
                    isSignIn={isSignIn}
                    onToggle={() => setShowHeader(!showHeader)}
                />
            )}

            <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
                {isSignIn ? (
                    <SignIn routing="path" path="/auth/signin" signUpUrl="/auth/signup" />
                ) : (
                    <SignUp routing="path" path="/auth/signup" signInUrl="/auth/signin" />
                )}
            </main>

            {showFooter && <Footer onToggle={() => setShowFooter(!showFooter)} />}
        </div>
    );
};

export default Auth; 