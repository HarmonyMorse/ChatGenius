import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { getUser } from '../services/auth';

function UserList() {
    const [users, setUsers] = useState([]);
    const [sharedChannels, setSharedChannels] = useState({});
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

    return (
        <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">All Users</h2>
            <div className="space-y-3">
                {users.map((user) => (
                    <div
                        key={user.id}
                        className="flex items-start space-x-3 p-3 rounded-lg bg-white shadow-sm"
                    >
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gray-300 flex-shrink-0">
                                {user.avatar_url && (
                                    <img
                                        src={user.avatar_url}
                                        alt="avatar"
                                        className="w-10 h-10 rounded-full"
                                    />
                                )}
                            </div>
                            <div
                                className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white"
                                style={getStatusColor(user.status)}
                            />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-baseline">
                                <h3 className="text-sm font-medium text-gray-900">{user.username}</h3>
                                <span className="ml-2 text-xs text-gray-500">
                                    {getStatusDisplay(user.status)}
                                </span>
                            </div>
                            {sharedChannels[user.id]?.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                    {sharedChannels[user.id].map(channel => (
                                        <span
                                            key={channel.id}
                                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                                        >
                                            #{channel.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default UserList; 