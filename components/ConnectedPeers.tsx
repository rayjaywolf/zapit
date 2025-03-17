import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Link } from "lucide-react"

type ConnectedPeersProps = {
    peers: Array<{ id: string }>
}

export const ConnectedPeers = ({ peers }: ConnectedPeersProps) => {
    if (peers.length === 0) return null

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader className="flex flex-row items-center gap-2">
                <Link className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Connected Peers</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-2">
                    {peers.map((peer) => (
                        <div
                            key={peer.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted"
                        >
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                <span className="font-medium">{peer.id}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">Connected</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
} 