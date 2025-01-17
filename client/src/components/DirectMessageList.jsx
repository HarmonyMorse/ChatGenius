import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../supabaseClient';
import { getUser } from '../services/auth';
import messageService from '../services/messageService';

function DirectMessageList({ onDMSelect, selectedDMId }) {
    const [directMessages, setDirectMessages] = useState([]);
    const [showCreateDM, setShowCreateDM] = useState(false);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);

    // Separate useEffect for authentication
    useEffect(() => {
        const user = getUser();
        setCurrentUser(user);
    }, []);

    useEffect(() => {
        if (!currentUser?.id) {
            console.log('Waiting for user authentication...');
            return;
        }

        loadDirectMessages();

        // Create a unique channel name for this user
        const channelName = `direct-messages-${currentUser.id}`;

        // Subscribe to changes in direct_message_members table
        const channel = supabase
            .channel(channelName)
            .on('postgres_changes',
                {
                    event: '*',  // Listen to all events
                    schema: 'public',
                    table: 'direct_message_members',
                    filter: `user_id=eq.${currentUser.id}`
                },
                (payload) => {
                    console.log('DM member event:', payload);
                    loadDirectMessages();
                }
            );

        // Subscribe with proper error handling
        const setupSubscription = async () => {
            try {
                const { error } = await channel.subscribe();
                if (error) {
                    throw error;
                }
                console.log('Successfully subscribed to direct messages changes');
            } catch (err) {
                console.error('Channel subscription error:', err.message);
                // Attempt to resubscribe after a delay
                setTimeout(setupSubscription, 5000);
            }
        };

        setupSubscription();

        return () => {
            console.log('Cleaning up DM subscription');
            supabase.removeChannel(channel);
        };
    }, [currentUser]); // Only depend on currentUser

    const loadDirectMessages = async () => {
        try {
            // Get all DMs where the current user is a member
            const { data: myDMs, error: dmError } = await supabase
                .from('direct_message_members')
                .select('dm_id')
                .eq('user_id', currentUser.id);

            if (dmError) {
                console.error('Error loading DMs:', dmError);
                return;
            }

            // Get all participants for these DMs
            const dmIds = myDMs.map(dm => dm.dm_id);
            const { data: allMembers, error: membersError } = await supabase
                .from('direct_message_members')
                .select(`
                    dm_id,
                    user:user_id (
                        id,
                        username,
                        avatar_url
                    )
                `)
                .in('dm_id', dmIds);

            if (membersError) {
                console.error('Error loading DM members:', membersError);
                return;
            }

            // Group members by DM
            const dmsMap = new Map();
            allMembers.forEach(member => {
                if (!dmsMap.has(member.dm_id)) {
                    dmsMap.set(member.dm_id, {
                        id: member.dm_id,
                        participants: []
                    });
                }
                dmsMap.get(member.dm_id).participants.push(member.user);
            });

            setDirectMessages(Array.from(dmsMap.values()));
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
            // Create the DM
            const { data: dm, error: dmError } = await supabase
                .from('direct_messages')
                .insert({})
                .select()
                .limit(1)
                .single();

            if (dmError) {
                console.error('Error creating DM:', dmError);
                return;
            }

            // Add all members to the DM
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

            // Send system message about DM creation
            const systemMessage = {
                content: 'A Direct Message has been created',
                dm_id: dm.id,
                is_system_message: true
            };

            await messageService.sendMessage(systemMessage);

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

        const joinedNames = otherParticipants.join(', ');
        if (joinedNames.length <= 20) {
            return joinedNames;
        }

        // Find the last complete name that fits within 20 characters
        let truncatedText = '';
        let nameCount = 0;
        for (const name of otherParticipants) {
            if ((truncatedText + name + ', ').length > 17) { // 17 to leave room for "..."
                break;
            }
            truncatedText += (nameCount > 0 ? ', ' : '') + name;
            nameCount++;
        }

        return truncatedText + '...';
    };

    return (
        <div className="mt-6">
            <div className="flex justify-between items-center mb-2 px-2">
                <h3 className="text-sm font-semibold text-accent1 uppercase tracking-wider">
                    Direct Messages
                </h3>
            </div>

            {/* DM List */}
            <div className="space-y-1 min-h-[50px]">
                {directMessages.map((dm) => (
                    <button
                        key={dm.id}
                        onClick={() => selectedDMId !== dm.id && onDMSelect(dm.id)}
                        className={`w-full text-left px-4 py-2 rounded-md text-sm flex items-center ${selectedDMId === dm.id
                            ? 'bg-accent1 text-primary'
                            : 'text-accent1 hover:text-black hover:bg-accent2'
                            }`}
                    >
                        <span className="mr-1">&gt;</span> {getDMName(dm)}
                    </button>
                ))}
            </div>

            {/* Add DM Button */}
            <button
                onClick={handleCreateDMClick}
                className="w-full text-left px-4 py-2 mt-2 text-sm text-accent1 hover:text-black hover:bg-accent2 rounded-md flex items-center"
            >
                <span className="mr-1">+</span> Add Direct Message
            </button>

            {/* Create DM Modal */}
            {showCreateDM && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-primary rounded-lg shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-medium text-accent1 mb-4">Create Direct Message</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-accent1 mb-2">
                                Select Users
                            </label>
                            <div className="max-h-60 overflow-y-auto border border-secondary/20 rounded-md">
                                {availableUsers.map(user => (
                                    <div
                                        key={user.id}
                                        onClick={() => handleUserSelect(user)}
                                        className={`flex items-center p-2 cursor-pointer ${selectedUsers.some(u => u.id === user.id)
                                            ? 'bg-accent1 text-primary'
                                            : 'text-accent1 hover:text-black hover:bg-accent2'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.some(u => u.id === user.id)}
                                            onChange={() => { }}
                                            className="mr-2"
                                        />
                                        {user.username}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => {
                                    setShowCreateDM(false);
                                    setSelectedUsers([]);
                                }}
                                className="px-4 py-2 text-sm text-accent1 hover:text-black hover:bg-accent2 rounded-md"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateDM}
                                disabled={selectedUsers.length === 0}
                                className="px-4 py-2 text-sm text-accent1 bg-secondary hover:bg-accent2 hover:text-black rounded-md disabled:opacity-50"
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