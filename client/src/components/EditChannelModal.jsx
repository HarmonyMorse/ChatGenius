import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import channelService from '../services/channelService';
import { getUser } from '../services/auth';

function EditChannelModal({ isOpen, onClose, channel, onChannelUpdated, onLeaveChannel }) {
    const [name, setName] = useState(channel?.name || '');
    const [description, setDescription] = useState(channel?.description || '');
    const [isPrivate, setIsPrivate] = useState(channel?.is_private || false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const currentUser = getUser();
    const isOwner = channel?.members?.some(member =>
        member.user.id === currentUser.id && member.role === 'owner'
    );

    // Update local state when channel prop changes
    useEffect(() => {
        if (channel) {
            setName(channel.name);
            setDescription(channel.description || '');
            setIsPrivate(channel.is_private || false);
        }
    }, [channel]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const channelData = {
                name: name.trim(),
                description: description.trim(),
                is_private: isPrivate
            };

            const updatedChannel = await channelService.updateChannel(channel.id, channelData);
            onChannelUpdated(updatedChannel);
            onClose();
        } catch (error) {
            setError(error.response?.data?.message || 'Error updating channel');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLeaveChannel = () => {
        if (window.confirm('Are you sure you want to leave this channel?')) {
            onLeaveChannel();
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Channel Settings</h2>
                    {isOwner ? (
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                        Channel Name
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="e.g. general"
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                                        Description
                                    </label>
                                    <textarea
                                        id="description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="What's this channel about?"
                                        rows="3"
                                    />
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="isPrivate"
                                        checked={isPrivate}
                                        onChange={(e) => setIsPrivate(e.target.checked)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="isPrivate" className="ml-2 block text-sm text-gray-900">
                                        Make channel private
                                    </label>
                                </div>

                                {error && (
                                    <div className="text-red-600 text-sm">
                                        {error}
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 flex justify-between">
                                <button
                                    type="button"
                                    onClick={handleLeaveChannel}
                                    className="px-4 py-2 border border-red-300 text-red-600 rounded-md shadow-sm text-sm font-medium hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                >
                                    Leave Channel
                                </button>
                                <div className="flex space-x-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading || !name.trim()}
                                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                    >
                                        {isLoading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-medium text-gray-900">Channel Information</h3>
                                <div className="mt-2">
                                    <p className="text-sm text-gray-500">
                                        <span className="font-medium">Name:</span> {channel.name}
                                    </p>
                                    {channel.description && (
                                        <p className="text-sm text-gray-500 mt-1">
                                            <span className="font-medium">Description:</span> {channel.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-between pt-4">
                                <button
                                    type="button"
                                    onClick={handleLeaveChannel}
                                    className="px-4 py-2 border border-red-300 text-red-600 rounded-md shadow-sm text-sm font-medium hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                >
                                    Leave Channel
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

EditChannelModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    channel: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        description: PropTypes.string,
        is_private: PropTypes.bool,
        members: PropTypes.arrayOf(PropTypes.shape({
            user: PropTypes.shape({
                id: PropTypes.string.isRequired
            }).isRequired,
            role: PropTypes.string.isRequired
        }))
    }),
    onChannelUpdated: PropTypes.func.isRequired,
    onLeaveChannel: PropTypes.func.isRequired
};

export default EditChannelModal; 