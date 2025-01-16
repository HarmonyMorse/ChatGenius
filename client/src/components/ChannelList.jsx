import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import CreateChannelModal from './CreateChannelModal';

function ChannelList({ onChannelSelect, selectedChannelId, channels, setChannels }) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [showAddOptions, setShowAddOptions] = useState(false);
    const navigate = useNavigate();

    const handleChannelCreated = (channel) => {
        setChannels(prev => [...prev, channel]);
        onChannelSelect(channel.id);
    };

    const handleAddClick = () => {
        setShowAddOptions(true);
    };

    const handleBrowseClick = () => {
        navigate('/browse-channels');
        setShowAddOptions(false);
    };

    const handleCreateClick = () => {
        setIsCreateModalOpen(true);
        setShowAddOptions(false);
    };

    return (
        <div className="space-y-1">
            {channels.map((channel) => (
                <button
                    key={channel.id}
                    onClick={() => selectedChannelId !== channel.id && onChannelSelect(channel.id)}
                    className={`w-full text-left px-2 py-1 rounded text-accent1 ${selectedChannelId === channel.id
                        ? 'bg-accent1 text-primary'
                        : 'hover:text-black hover:bg-accent2'
                        }`}
                >
                    # {channel.name}
                </button>
            ))}

            {/* Add Channel Section */}
            <div className="relative">
                <button
                    onClick={handleAddClick}
                    className="w-full text-left px-2 py-1 rounded text-accent1 hover:text-black hover:bg-accent2 flex items-center"
                >
                    <span className="mr-1">+</span> Add Channels
                </button>

                {/* Add Options Dropdown */}
                {showAddOptions && (
                    <div className="absolute left-0 mt-1 w-48 rounded-md shadow-lg bg-primary ring-1 ring-black ring-opacity-5">
                        <div className="py-1" role="menu">
                            <button
                                onClick={handleBrowseClick}
                                className="block w-full text-left px-4 py-2 text-sm text-accent1 hover:text-black hover:bg-accent2"
                                role="menuitem"
                            >
                                Browse Channels
                            </button>
                            <button
                                onClick={handleCreateClick}
                                className="block w-full text-left px-4 py-2 text-sm text-accent1 hover:text-black hover:bg-accent2"
                                role="menuitem"
                            >
                                Create Channel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Channel Modal */}
            <CreateChannelModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onChannelCreated={handleChannelCreated}
            />
        </div>
    );
}

ChannelList.propTypes = {
    onChannelSelect: PropTypes.func.isRequired,
    selectedChannelId: PropTypes.string,
    channels: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired
    })).isRequired,
    setChannels: PropTypes.func.isRequired
};

export default ChannelList;
