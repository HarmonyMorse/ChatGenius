import { supabase } from '../supabaseClient';
import { getUser } from './auth';

class UserService {
    async updateStatus(status) {
        const user = getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('users')
            .update({ status })
            .eq('id', user.id);

        if (error) throw error;
        return data;
    }

    async getUserStatus(userId) {
        const { data, error } = await supabase
            .from('users')
            .select('id, status')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data;
    }

    async subscribeToUserStatus(userId, onStatusChange) {
        return supabase
            .channel(`user-status:${userId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'users',
                filter: `id=eq.${userId}`
            }, (payload) => {
                onStatusChange(payload.new.status);
            })
            .subscribe();
    }
}

const userService = new UserService();
export default userService; 