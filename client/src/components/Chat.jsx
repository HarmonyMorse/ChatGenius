import PropTypes from 'prop-types';
import Header from './Header';

const Chat = ({ onLogout }) => {
    return (
        <div className="min-h-screen bg-white">
            <Header onToggle={() => { }} onLogout={onLogout} />
            <div className="flex flex-1 h-[calc(100vh-64px)]">
                {/* Sidebar */}
                <div className="w-64 bg-gray-50 border-r">
                    <div className="p-4">
                        <h2 className="text-lg font-semibold mb-4 text-gray-900">Channels</h2>
                        <div className="space-y-1">
                            <button className="w-full text-left px-2 py-1 rounded hover:bg-gray-200 text-gray-700">
                                # general
                            </button>
                            <button className="w-full text-left px-2 py-1 rounded hover:bg-gray-200 text-gray-700">
                                # random
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main chat area */}
                <div className="flex-1 flex flex-col bg-white">
                    {/* Messages area */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="space-y-4">
                            <p className="text-center text-gray-500">
                                Welcome to ChatGenius! Start chatting below.
                            </p>
                        </div>
                    </div>

                    {/* Message input */}
                    <div className="p-4 border-t bg-white">
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                placeholder="Type a message..."
                                className="flex-1 rounded-lg border px-4 py-2 focus:outline-none focus:border-blue-500"
                            />
                            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

Chat.propTypes = {
    onLogout: PropTypes.func.isRequired,
};

export default Chat; 