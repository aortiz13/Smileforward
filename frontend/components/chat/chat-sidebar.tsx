'use client'

export function ChatSidebar() {
    const agents = [
        { id: 1, name: 'Onboarding Agent', status: 'online', lastMessage: 'Welcome!' },
        { id: 2, name: 'Finance Agent', status: 'idle', lastMessage: 'Report ready.' },
    ]

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b font-semibold">Agents</div>
            <div className="flex-1 overflow-y-auto">
                {agents.map((agent) => (
                    <div key={agent.id} className="p-4 hover:bg-gray-100 cursor-pointer border-b">
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-sm text-gray-500">{agent.lastMessage}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}
