import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { getUser } from '../services/auth';
import userService from '../services/userService';

function Header({ onLogout }) {
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [currentStatus, setCurrentStatus] = useState('offline');
    const currentUser = getUser();

    useEffect(() => {
        const loadUserStatus = async () => {
            try {
                const userData = await userService.getUserStatus(currentUser.id);
                setCurrentStatus(userData.status);
            } catch (error) {
                console.error('Error loading user status:', error);
            }
        };

        loadUserStatus();
    }, [currentUser.id]);

    const handleStatusChange = async (status) => {
        try {
            await userService.updateStatus(status);
            setCurrentStatus(status);
            setShowStatusMenu(false);
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'online':
                return 'bg-green-500';
            case 'away':
                return 'bg-yellow-500';
            case 'busy':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };

    return (
        <header className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <h1 className="text-xl font-bold text-gray-900">ChatGenius</h1>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <button
                                onClick={() => setShowStatusMenu(!showStatusMenu)}
                                className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100"
                            >
                                <div className="relative">
                                    <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0">
                                        {currentUser?.avatar_url && (
                                            <img
                                                src={currentUser.avatar_url}
                                                alt="avatar"
                                                className="w-8 h-8 rounded-full"
                                            />
                                        )}
                                    </div>
                                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(currentStatus)}`} />
                                </div>
                                <span className="text-gray-700">{currentUser?.username}</span>
                            </button>

                            {showStatusMenu && (
                                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                                    <div className="py-1" role="menu">
                                        <button
                                            onClick={() => handleStatusChange('online')}
                                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                                            Online
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange('away')}
                                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
                                            Away
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange('busy')}
                                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-red-500 mr-2" />
                                            Do Not Disturb
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange('offline')}
                                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-gray-500 mr-2" />
                                            Offline
                                        </button>
                                        <div className="border-t border-gray-100 my-1" />
                                        <button
                                            onClick={onLogout}
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                        >
                                            Sign Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}

Header.propTypes = {
    onLogout: PropTypes.func.isRequired
};

export default Header; 