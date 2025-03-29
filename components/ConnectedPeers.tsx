import { Link } from "lucide-react"

type ConnectedPeersProps = {
    peers: Array<{ id: string }>
}

export const ConnectedPeers = ({ peers }: ConnectedPeersProps) => {
    if (peers.length === 0) {
        return (
            <div className="text-muted-foreground text-sm text-center">
                No peers connected
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-2 w-full">
            {peers.map((peer) => (
                <div
                    key={peer.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-primary/5"
                >
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="font-medium">{peer.id}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">Connected</span>
                </div>
            ))}
        </div>
    )
} 