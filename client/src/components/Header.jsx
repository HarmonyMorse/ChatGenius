import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { getUser } from '../services/auth';
import userService from '../services/userService';
import SearchModal from './SearchModal';

function Header({ onLogout = () => { } }) {
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [currentStatus, setCurrentStatus] = useState('offline');
    const [customStatus, setCustomStatus] = useState('');
    const [customStatusColor, setCustomStatusColor] = useState('#9333ea'); // Default purple
    const [isEditingCustomStatus, setIsEditingCustomStatus] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [hexInputValue, setHexInputValue] = useState('#9333ea');
    const [isAutoMode, setIsAutoMode] = useState(false);
    const customStatusInputRef = useRef(null);
    const cleanupAutoStatusRef = useRef(null);
    const currentUser = getUser();

    const statusColors = [
        { name: 'green', hex: '#22c55e' },
        { name: 'yellow', hex: '#eab308' },
        { name: 'red', hex: '#ef4444' },
        { name: 'blue', hex: '#3b82f6' },
        { name: 'purple', hex: '#9333ea' },
        { name: 'pink', hex: '#ec4899' },
        { name: 'white', hex: '#ffffff' },
    ];

    useEffect(() => {
        const loadUserStatus = async () => {
            try {
                const userData = await userService.getUserStatus(currentUser.id);
                setCurrentStatus(userData.status);
                if (userData.status === 'auto') {
                    setIsAutoMode(true);
                    startAutoStatus();
                } else if (!['online', 'away', 'busy', 'offline'].includes(userData.status)) {
                    const [text, color] = userData.status.split('|');
                    setCustomStatus(text);
                    setCustomStatusColor(color || '#9333ea');
                }
            } catch (error) {
                console.error('Error loading user status:', error);
            }
        };

        loadUserStatus();

        return () => {
            if (cleanupAutoStatusRef.current) {
                cleanupAutoStatusRef.current();
            }
        };
    }, [currentUser.id]);

    const startAutoStatus = () => {
        if (cleanupAutoStatusRef.current) {
            cleanupAutoStatusRef.current();
        }

        cleanupAutoStatusRef.current = userService.startAutoStatus(async (newStatus) => {
            await handleStatusChange(newStatus, null, true);
        });
    };

    const handleStatusChange = async (status, color = null, skipAutoCheck = false) => {
        try {
            if (!skipAutoCheck && isAutoMode) {
                userService.stopAutoStatus();
                setIsAutoMode(false);
            }

            const statusToSave = color ? `${status}|${color}` : status;
            await userService.updateStatus(statusToSave);
            setCurrentStatus(statusToSave);

            // Only close the menu if it's not an auto-update
            if (!skipAutoCheck) {
                setShowStatusMenu(false);
            }

            if (!['online', 'away', 'busy', 'offline', 'auto'].includes(status)) {
                setCustomStatus(status);
                if (color) setCustomStatusColor(color);
            }

            if (status === 'auto' && !skipAutoCheck) {
                setIsAutoMode(true);
                startAutoStatus();
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleCustomStatusSubmit = async (e) => {
        e.preventDefault();
        if (customStatus.trim()) {
            await handleStatusChange(customStatus.trim(), customStatusColor);
            setIsEditingCustomStatus(false);
            setShowColorPicker(false);
        }
    };

    const getStatusColor = (status) => {
        if (status.includes('|')) {
            const [, color] = status.split('|');
            return { backgroundColor: color };
        }

        const colors = {
            online: '#22c55e',
            away: '#eab308',
            busy: '#ef4444',
            offline: '#6b7280'
        };

        return { backgroundColor: colors[status] || '#9333ea' };
    };

    const getStatusDisplay = (status) => {
        let text;
        if (status.includes('|')) {
            [text] = status.split('|');
        } else {
            switch (status) {
                case 'online':
                    text = 'Online';
                    break;
                case 'away':
                    text = 'Away';
                    break;
                case 'busy':
                    text = 'Do Not Disturb';
                    break;
                case 'offline':
                    text = 'Offline';
                    break;
                default:
                    text = status;
            }
        }

        return text.length > 10 ? `${text.substring(0, 10)}...` : text;
    };

    const isCurrentStatus = (status) => {
        if (isAutoMode) return status === 'auto';
        if (currentStatus.includes('|')) return false;
        return currentStatus === status;
    };

    const handleColorChange = (e) => {
        const value = e.target.value;
        setHexInputValue(value);

        // Only update the actual color if it's a valid hex
        if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value)) {
            setCustomStatusColor(value);
        }
    };

    const handleHexKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hexInputValue)) {
                setCustomStatusColor(hexInputValue);
            }
        }
    };

    // Update hexInputValue when customStatusColor changes
    useEffect(() => {
        setHexInputValue(customStatusColor);
    }, [customStatusColor]);

    useEffect(() => {
        if (isEditingCustomStatus && customStatusInputRef.current) {
            customStatusInputRef.current.focus();
        }
    }, [isEditingCustomStatus]);

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
                        <button
                            onClick={() => setShowSearchModal(true)}
                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md flex items-center gap-2"
                        >
                            <svg
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                            <span className="text-sm">Search</span>
                        </button>

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
                                    <div
                                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white`}
                                        style={getStatusColor(currentStatus)}
                                    />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-gray-700">{currentUser?.username}</span>
                                    <span className="text-sm text-gray-500 max-w-[150px] truncate" title={getStatusDisplay(currentStatus)}>
                                        {getStatusDisplay(currentStatus)}
                                    </span>
                                </div>
                            </button>

                            {showStatusMenu && (
                                <div className="absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                                    <div className="py-1" role="menu">
                                        <button
                                            onClick={() => handleStatusChange('auto')}
                                            className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            <div className="flex items-center">
                                                <div className="w-2 h-2 rounded-full mr-2 bg-gradient-to-r from-green-500 to-yellow-500" />
                                                Auto (Online/Away)
                                            </div>
                                            {isAutoMode && <span className="text-green-600">✓</span>}
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange('online')}
                                            className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            <div className="flex items-center">
                                                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: '#22c55e' }} />
                                                Online
                                            </div>
                                            {isCurrentStatus('online') && <span className="text-green-600">✓</span>}
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange('away')}
                                            className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            <div className="flex items-center">
                                                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: '#eab308' }} />
                                                Away
                                            </div>
                                            {isCurrentStatus('away') && <span className="text-green-600">✓</span>}
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange('busy')}
                                            className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            <div className="flex items-center">
                                                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: '#ef4444' }} />
                                                Do Not Disturb
                                            </div>
                                            {isCurrentStatus('busy') && <span className="text-green-600">✓</span>}
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange('offline')}
                                            className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            <div className="flex items-center">
                                                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: '#6b7280' }} />
                                                Offline
                                            </div>
                                            {isCurrentStatus('offline') && <span className="text-green-600">✓</span>}
                                        </button>
                                        <div className="border-t border-gray-100 my-1" />
                                        {isEditingCustomStatus ? (
                                            <form onSubmit={handleCustomStatusSubmit} className="px-4 py-2">
                                                <input
                                                    ref={customStatusInputRef}
                                                    type="text"
                                                    value={customStatus}
                                                    onChange={(e) => setCustomStatus(e.target.value)}
                                                    placeholder="What's on your mind?"
                                                    className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:border-blue-500"
                                                    maxLength={50}
                                                />
                                                <div className="mt-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowColorPicker(!showColorPicker)}
                                                        className="flex items-center text-sm text-gray-600 hover:text-gray-800"
                                                    >
                                                        <div className={`w-4 h-4 rounded-full mr-2`} style={{ backgroundColor: customStatusColor }} />
                                                        Choose color
                                                    </button>
                                                    {showColorPicker && (
                                                        <div className="mt-2">
                                                            <div className="flex flex-wrap gap-2 mb-2">
                                                                {statusColors.map(color => (
                                                                    <button
                                                                        key={color.hex}
                                                                        type="button"
                                                                        onClick={() => setCustomStatusColor(color.hex)}
                                                                        className={`w-6 h-6 rounded-full border-2 ${customStatusColor === color.hex ? 'border-blue-500' : 'border-gray-200'}`}
                                                                        style={{ backgroundColor: color.hex }}
                                                                    />
                                                                ))}
                                                            </div>
                                                            <div className="flex items-center mt-2">
                                                                <span className="text-xs text-gray-500 mr-2">Custom:</span>
                                                                <input
                                                                    type="text"
                                                                    value={hexInputValue}
                                                                    onChange={handleColorChange}
                                                                    onKeyDown={handleHexKeyDown}
                                                                    placeholder="#HEX"
                                                                    className="px-2 py-1 text-xs border rounded w-20 focus:outline-none focus:border-blue-500"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex justify-end mt-2 space-x-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setIsEditingCustomStatus(false);
                                                            setShowColorPicker(false);
                                                        }}
                                                        className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        className="px-2 py-1 text-xs text-white bg-blue-500 rounded hover:bg-blue-600"
                                                    >
                                                        Save
                                                    </button>
                                                </div>
                                            </form>
                                        ) : (
                                            <button
                                                onClick={() => setIsEditingCustomStatus(true)}
                                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            >
                                                <div className={`w-2 h-2 rounded-full mr-2`} style={{ backgroundColor: customStatusColor }} />
                                                {customStatus || "Set a custom status"}
                                            </button>
                                        )}
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

            <SearchModal
                isOpen={showSearchModal}
                onClose={() => setShowSearchModal(false)}
            />
        </header>
    );
}

Header.propTypes = {
    onLogout: PropTypes.func
};

export default Header; 