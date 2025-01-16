import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { getUser } from '../services/auth';
import { useSearchParams, useNavigate } from 'react-router-dom';

function UserList() {
    const [users, setUsers] = useState([]);
    const [sharedChannels, setSharedChannels] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [existingDMs, setExistingDMs] = useState({});
    const [, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const currentUser = getUser();

    useEffect(() => {
        const loadUsers = async () => {
            try {
                // Get all users
                const { data: allUsers, error: usersError } = await supabase
                    .from('users')
                    .select('id, username, avatar_url, status')
                    .neq('id', currentUser.id);

                if (usersError) throw usersError;

                // Get all channels where current user is a member
                const { data: myChannels, error: channelsError } = await supabase
                    .from('channel_members')
                    .select(`
                        channel:channel_id (
                            id,
                            name
                        )
                    `)
                    .eq('user_id', currentUser.id);

                if (channelsError) throw channelsError;

                // Get existing DMs
                const { data: directMessages, error: dmError } = await supabase
                    .from('direct_message_members')
                    .select(`
                        dm_id,
                        direct_messages!inner (id),
                        user_id
                    `)
                    .eq('user_id', currentUser.id);

                if (dmError) throw dmError;

                // Create a map of user IDs to their DM IDs
                const dmMap = {};
                if (directMessages) {
                    for (const dm of directMessages) {
                        // Get the other member of this DM
                        const { data: otherMember } = await supabase
                            .from('direct_message_members')
                            .select('user_id')
                            .eq('dm_id', dm.dm_id)
                            .neq('user_id', currentUser.id)
                            .single();

                        if (otherMember) {
                            dmMap[otherMember.user_id] = dm.dm_id;
                        }
                    }
                }
                setExistingDMs(dmMap);

                // Get all users in those channels
                const channelIds = myChannels.map(cm => cm.channel.id);
                const { data: channelMembers, error: membersError } = await supabase
                    .from('channel_members')
                    .select(`
                        user_id,
                        channel:channel_id (
                            id,
                            name
                        )
                    `)
                    .in('channel_id', channelIds)
                    .neq('user_id', currentUser.id);

                if (membersError) throw membersError;

                // Group channels by user
                const sharedChannelsMap = {};
                channelMembers.forEach(member => {
                    if (!sharedChannelsMap[member.user_id]) {
                        sharedChannelsMap[member.user_id] = [];
                    }
                    sharedChannelsMap[member.user_id].push(member.channel);
                });

                setSharedChannels(sharedChannelsMap);
                setUsers(allUsers);

                // Subscribe to realtime updates for all users
                const channel = supabase
                    .channel('users-channel')
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'users',
                        filter: `id=neq.${currentUser.id}`
                    }, (payload) => {
                        if (payload.eventType === 'DELETE') {
                            setUsers(prev => prev.filter(user => user.id !== payload.old.id));
                        } else if (payload.eventType === 'INSERT') {
                            setUsers(prev => [...prev, payload.new]);
                        } else if (payload.eventType === 'UPDATE') {
                            setUsers(prev => prev.map(user =>
                                user.id === payload.new.id ? { ...user, ...payload.new } : user
                            ));
                        }
                    })
                    .subscribe();

                return () => {
                    supabase.removeChannel(channel);
                };
            } catch (error) {
                console.error('Error loading users:', error);
            }
        };

        loadUsers();
    }, [currentUser.id]);

    const getStatusColor = (status) => {
        if (status?.includes('|')) {
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
        if (!status) return 'Offline';

        if (status.includes('|')) {
            const [text] = status.split('|');
            return text.length > 20 ? `${text.substring(0, 20)}...` : text;
        }

        switch (status) {
            case 'online':
                return 'Online';
            case 'away':
                return 'Away';
            case 'busy':
                return 'Do Not Disturb';
            case 'offline':
                return 'Offline';
            default:
                return status;
        }
    };

    const filteredUsers = users.filter(user =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleUserClick = (userId) => {
        setSelectedUserId(selectedUserId === userId ? null : userId);
    };

    const handleStartDM = (userId) => {
        if (existingDMs[userId]) {
            // If DM exists, open it
            setSearchParams({ dm: existingDMs[userId] });
        } else {
            // If no DM exists, create one
            setSearchParams({ user: userId });
        }
        setSelectedUserId(null);
    };

    const handleChatWithPersona = (userId) => {
        navigate(`/persona/${userId}`);
        setSelectedUserId(null);
    };

    return (
        <div className="h-full flex flex-col p-4">
            <div className="flex-none">
                <h2 className="text-lg font-semibold mb-2 text-accent1">All Users</h2>
                <div className="relative mb-4">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search users..."
                        className="w-full px-4 py-2 border border-secondary/20 rounded-lg bg-accent1/5 text-accent1 placeholder-accent1/50 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent pl-10"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-accent1/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {filteredUsers.map((user) => (
                    <div key={user.id} className="relative">
                        <div
                            onClick={() => handleUserClick(user.id)}
                            className="flex items-start space-x-3 p-3 rounded-lg bg-secondary/50 border border-secondary/10 hover:bg-secondary/60 cursor-pointer"
                        >
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-accent1 flex-shrink-0 flex items-center justify-center">
                                    {user.avatar_url ? (
                                        <img
                                            src={user.avatar_url}
                                            alt="avatar"
                                            className="w-10 h-10 rounded-full"
                                        />
                                    ) : (
                                        <span className="text-primary">{user.username[0].toUpperCase()}</span>
                                    )}
                                </div>
                                <div
                                    className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-primary"
                                    style={getStatusColor(user.status)}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline">
                                    <h3 className="text-sm font-medium text-accent1">{user.username}</h3>
                                    <span className="ml-2 text-xs text-accent1/60">
                                        {getStatusDisplay(user.status)}
                                    </span>
                                </div>
                                {sharedChannels[user.id]?.length > 0 && (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {sharedChannels[user.id].map(channel => (
                                            <span
                                                key={channel.id}
                                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary/10 text-accent1"
                                            >
                                                #{channel.name}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Menu */}
                        {selectedUserId === user.id && (
                            <div className="absolute right-0 bottom-full mb-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                                <div className="py-1" role="menu">
                                    <button
                                        onClick={() => handleStartDM(user.id)}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                        {existingDMs[user.id] ? 'Open DM' : 'Start DM'}
                                    </button>
                                    <button
                                        onClick={() => handleChatWithPersona(user.id)}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        Chat with AI Persona
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                {filteredUsers.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                        No users found matching &ldquo;{searchQuery}&rdquo;
                    </div>
                )}
            </div>
        </div>
    );
}

export default UserList; 