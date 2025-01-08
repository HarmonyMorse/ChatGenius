import { supabase } from '../supabaseClient';
import { getUser } from './auth';

class UserService {
    constructor() {
        this.autoStatusTimeoutId = null;
        this.isAutoMode = false;
    }

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

    startAutoStatus(onStatusChange) {
        this.isAutoMode = true;

        // Set up activity listeners
        const resetTimer = () => {
            if (!this.isAutoMode) return;

            clearTimeout(this.autoStatusTimeoutId);
            onStatusChange('online');

            this.autoStatusTimeoutId = setTimeout(() => {
                if (this.isAutoMode) {
                    onStatusChange('away');
                }
            }, 5 * 60 * 1000); // 5 minutes
        };

        // Initial status
        resetTimer();

        // Add event listeners for user activity
        const events = ['mousedown', 'keydown', 'mousemove', 'wheel', 'touchstart'];
        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        // Return cleanup function
        return () => {
            this.isAutoMode = false;
            clearTimeout(this.autoStatusTimeoutId);
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }

    stopAutoStatus() {
        this.isAutoMode = false;
        clearTimeout(this.autoStatusTimeoutId);
    }
}

const userService = new UserService();
export default userService; 