import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../supabaseClient';
import { getUser } from '../services/auth';

function DirectMessageList({ onDMSelect, selectedDMId }) {
    const [directMessages, setDirectMessages] = useState([]);
    const [showCreateDM, setShowCreateDM] = useState(false);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const currentUser = getUser();

    useEffect(() => {
        loadDirectMessages();
    }, []);

    const loadDirectMessages = async () => {
        try {
            // Get all DMs where the current user is a member
            const { data: dmMembers, error: dmError } = await supabase
                .from('direct_message_members')
                .select(`
                    dm_id,
                    direct_message:dm_id(
                        id,
                        created_at
                    ),
                    user:user_id(
                        id,
                        username,
                        avatar_url
                    )
                `)
                .eq('user_id', currentUser.id);

            if (dmError) {
                console.error('Error loading DMs:', dmError);
                return;
            }

            // Group DM members by DM ID to get all participants for each DM
            const dmsMap = new Map();
            for (const member of dmMembers) {
                if (!dmsMap.has(member.dm_id)) {
                    dmsMap.set(member.dm_id, {
                        id: member.dm_id,
                        created_at: member.direct_message.created_at,
                        participants: []
                    });
                }
                dmsMap.get(member.dm_id).participants.push(member.user);
            }

            // Convert map to array and sort by most recent
            const dms = Array.from(dmsMap.values())
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            setDirectMessages(dms);
        } catch (error) {
            console.error('Error in DM loading:', error);
        }
    };

    const loadAvailableUsers = async () => {
        try {
            const { data: users, error } = await supabase
                .from('users')
                .select('id, username, avatar_url')
                .neq('id', currentUser.id);

            if (error) {
                console.error('Error loading users:', error);
                return;
            }

            setAvailableUsers(users);
        } catch (error) {
            console.error('Error in users loading:', error);
        }
    };

    const handleCreateDMClick = () => {
        setShowCreateDM(true);
        loadAvailableUsers();
    };

    const handleUserSelect = (user) => {
        setSelectedUsers(prev => {
            const isSelected = prev.some(u => u.id === user.id);
            if (isSelected) {
                return prev.filter(u => u.id !== user.id);
            } else {
                return [...prev, user];
            }
        });
    };

    const handleCreateDM = async () => {
        if (selectedUsers.length === 0) return;

        try {
            // Create new DM
            const { data: dm, error: dmError } = await supabase
                .from('direct_messages')
                .insert({})
                .select()
                .single();

            if (dmError) {
                console.error('Error creating DM:', dmError);
                return;
            }

            // Add all participants (including current user)
            const members = [currentUser, ...selectedUsers].map(user => ({
                dm_id: dm.id,
                user_id: user.id
            }));

            const { error: membersError } = await supabase
                .from('direct_message_members')
                .insert(members);

            if (membersError) {
                console.error('Error adding DM members:', membersError);
                return;
            }

            // Reset state and reload DMs
            setShowCreateDM(false);
            setSelectedUsers([]);
            loadDirectMessages();
            onDMSelect(dm.id);
        } catch (error) {
            console.error('Error in DM creation:', error);
        }
    };

    const getDMName = (dm) => {
        const otherParticipants = dm.participants
            .filter(p => p.id !== currentUser.id)
            .map(p => p.username)
            .sort((a, b) => a.localeCompare(b));

        if (otherParticipants.length <= 2) {
            return otherParticipants.join(', ');
        }

        return `${otherParticipants[0]}, ${otherParticipants[1]}...`;
    };

    return (
        <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    Direct Messages
                </h3>
                <button
                    onClick={handleCreateDMClick}
                    className="text-sm text-gray-600 hover:text-gray-900"
                >
                    +
                </button>
            </div>

            {/* DM List */}
            <div className="space-y-1">
                {directMessages.map((dm) => (
                    <button
                        key={dm.id}
                        onClick={() => onDMSelect(dm.id)}
                        className={`w-full text-left px-2 py-1 rounded text-sm ${selectedDMId === dm.id
                            ? 'bg-blue-100 text-blue-900'
                            : 'text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        {getDMName(dm)}
                    </button>
                ))}
            </div>

            {/* Create DM Modal */}
            {showCreateDM && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-semibold mb-4">Create Direct Message</h3>
                        <div className="mb-4">
                            <div className="flex flex-wrap gap-2 mb-2">
                                {selectedUsers.map(user => (
                                    <span
                                        key={user.id}
                                        className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center"
                                    >
                                        {user.username}
                                        <button
                                            onClick={() => handleUserSelect(user)}
                                            className="ml-2 text-blue-600 hover:text-blue-800"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <div className="max-h-60 overflow-y-auto border rounded">
                                {availableUsers.map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => handleUserSelect(user)}
                                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${selectedUsers.some(u => u.id === user.id)
                                            ? 'bg-blue-50'
                                            : ''
                                            }`}
                                    >
                                        {user.username}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => {
                                    setShowCreateDM(false);
                                    setSelectedUsers([]);
                                }}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateDM}
                                disabled={selectedUsers.length === 0}
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

DirectMessageList.propTypes = {
    onDMSelect: PropTypes.func.isRequired,
    selectedDMId: PropTypes.string
};

export default DirectMessageList; 