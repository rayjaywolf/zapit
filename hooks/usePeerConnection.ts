import { useState, useEffect, useCallback, useRef } from 'react'
import { Peer, DataConnection, PeerError } from 'peerjs'
import { toast } from "sonner"

type PeerConnection = {
    id: string
    connection: DataConnection
    lastSeen: number
}

export type ReceivingFile = {
    name: string
    size: number
    chunks: Array<ArrayBuffer>
    receivedChunks: number
    totalChunks: number
}

type TransferStatus = 'sending' | 'acknowledged' | 'complete' | 'error';

type OutgoingFileTransfer = {
    fileName: string
    peerId: string
    totalChunks: number
    sentChunks: number
    acknowledgedChunks: number
    onProgress: (progress: number, status: TransferStatus) => void
    isCompleteConfirmed: boolean // Flag for final receiver confirmation
}

type UsePeerConnectionReturn = {
    myPeerId: string | null
    peers: PeerConnection[]
    connectToPeer: (peerId: string) => Promise<void>
    sendFile: (file: File, peerId: string, onProgress: (progress: number, status: TransferStatus) => void) => Promise<void>
    isConnected: boolean
    receivingFiles: ReceivingFile[]
    connectionError: PeerError<string> | null
    clearConnectionError: () => void
}

export const usePeerConnection = (): UsePeerConnectionReturn => {
    const [myPeerId, setMyPeerId] = useState<string | null>(null)
    const peerRef = useRef<Peer | null>(null)
    const [peers, setPeers] = useState<PeerConnection[]>([])
    const connectionsRef = useRef<Map<string, DataConnection>>(new Map())
    const [isConnected, setIsConnected] = useState(false)
    const [receivingFiles, setReceivingFiles] = useState<ReceivingFile[]>([])
    const outgoingTransfersRef = useRef<Record<string, OutgoingFileTransfer>>({})
    const [connectionError, setConnectionError] = useState<PeerError<string> | null>(null)

    const clearConnectionError = useCallback(() => {
        setConnectionError(null);
    }, []);

    const generateShortId = useCallback(() => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let result = ''
        for (let i = 0; i < 4; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return result
    }, [])

    const getTransferId = (fileName: string, peerId: string) => {
        return `${fileName}_${peerId}`
    }

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes"
        const k = 1024
        const sizes = ["Bytes", "KB", "MB", "GB"]
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    }

    const handleIncomingData = useCallback((data: any, sourceConnection: DataConnection) => {
        console.log("handleIncomingData called with type:", data.type, "from peer:", sourceConnection.peer);
        const senderId = sourceConnection.peer; // Get sender ID from the connection

        if (data.type === 'file-start') {
            console.log("Received file-start:", data.fileName, "size:", data.fileSize, "chunks:", data.totalChunks);
            setReceivingFiles(prev => {
                // Avoid duplicates if start message is resent
                if (prev.some(f => f.name === data.fileName)) {
                    return prev;
                }
                return [...prev, {
                    name: data.fileName,
                    size: data.fileSize,
                    chunks: new Array(data.totalChunks), // Pre-allocate array for direct indexing
                    receivedChunks: 0,
                    totalChunks: data.totalChunks,
                }];
            })
        } else if (data.type === 'file-chunk') {
            // console.log("Received file-chunk:", data.fileName, "index:", data.chunkIndex);
            setReceivingFiles(prev => {
                return prev.map(file => {
                    if (file.name === data.fileName && !file.chunks[data.chunkIndex]) { // Process only if chunk not already received
                        const updatedChunks = [...file.chunks]
                        updatedChunks[data.chunkIndex] = data.chunk

                        // Send acknowledgment back to the sender
                        try {
                            sourceConnection.send({
                                type: 'chunk-ack',
                                fileName: data.fileName,
                                chunkIndex: data.chunkIndex
                            });
                        } catch (error) {
                            console.error(`Error sending chunk-ack for ${data.fileName} index ${data.chunkIndex}:`, error);
                        }


                        return {
                            ...file,
                            chunks: updatedChunks,
                            receivedChunks: file.receivedChunks + 1,
                        }
                    }
                    return file
                })
            })
        } else if (data.type === 'file-end') {
            console.log("Received file-end:", data.fileName);
            setReceivingFiles(prev => {
                const fileIndex = prev.findIndex(f => f.name === data.fileName)
                if (fileIndex === -1) {
                    console.warn(`Received file-end for unknown file: ${data.fileName}`);
                    return prev;
                }

                const file = prev[fileIndex]
                console.log(`File end check: ${file.name}, Received ${file.receivedChunks}/${file.totalChunks} chunks`);

                // Ensure all chunks are actually received before processing
                if (file.receivedChunks === file.totalChunks && file.chunks.every(chunk => chunk !== undefined)) {
                    console.log(`Assembling file: ${file.name}`);
                    const blob = new Blob(file.chunks)
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = file.name
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)

                    toast.success(`Downloaded ${file.name} (${formatFileSize(file.size)})`)

                    // Send final acknowledgment
                    try {
                        sourceConnection.send({
                            type: 'file-ack',
                            fileName: data.fileName,
                            status: 'complete'
                        });
                        console.log(`Sent final file-ack for ${data.fileName}`);
                    } catch (error) {
                        console.error(`Error sending final file-ack for ${data.fileName}:`, error);
                    }


                    // Remove the file from the receiving list
                    return prev.filter((_, i) => i !== fileIndex)
                } else {
                    console.warn(`File-end received for ${file.name}, but not all chunks are present. Received: ${file.receivedChunks}/${file.totalChunks}. Retaining file in list.`);
                    // Optionally request missing chunks or wait longer? For now, just log.
                    // Maybe send back an error ack?
                    try {
                        sourceConnection.send({
                            type: 'file-ack',
                            fileName: data.fileName,
                            status: 'incomplete' // Indicate an issue on receiver side
                        });
                    } catch (error) {
                        console.error(`Error sending incomplete file-ack for ${data.fileName}:`, error);
                    }
                }
                return prev; // Return unmodified list if not complete or index not found
            })
        } else if (data.type === 'chunk-ack') {
            // console.log(`Received chunk-ack for ${data.fileName}, index ${data.chunkIndex} from ${senderId}`);
            const transferId = getTransferId(data.fileName, senderId);
            const transfer = outgoingTransfersRef.current[transferId];

            if (transfer && !transfer.isCompleteConfirmed) { // Process only if transfer is active
                transfer.acknowledgedChunks += 1;
                // Optional: Could call onProgress with 'acknowledged' status if needed
                // const ackProgress = (transfer.acknowledgedChunks / transfer.totalChunks) * 100;
                // transfer.onProgress(ackProgress, 'acknowledged');
            }
        } else if (data.type === 'file-ack') {
            console.log(`Received file-ack for ${data.fileName} with status ${data.status} from ${senderId}`);
            const transferId = getTransferId(data.fileName, senderId);
            const transfer = outgoingTransfersRef.current[transferId];

            if (transfer) {
                if (data.status === 'complete') {
                    transfer.isCompleteConfirmed = true; // Mark as confirmed by receiver
                    transfer.onProgress(100, 'complete'); // Signal final completion to UI
                    console.log(`File transfer ${transferId} confirmed complete by receiver.`);
                } else {
                    // Handle incomplete/error status from receiver
                    transfer.onProgress(transfer.acknowledgedChunks / transfer.totalChunks * 100, 'error'); // Report error status
                    console.error(`File transfer ${transferId} failed or was incomplete on receiver side.`);
                }
                // Clean up the transfer tracking once acknowledged (success or fail)
                delete outgoingTransfersRef.current[transferId];
            } else {
                console.warn(`Received file-ack for unknown or already cleaned-up transfer: ${transferId}`);
            }
        } else {
            console.warn("Received unknown data type:", data?.type);
        }
    }, []) // Removed peers dependency as senderId comes from connection

    const setupConnectionListeners = useCallback((conn: DataConnection) => {
        const peerId = conn.peer
        console.log(`Setting up listeners for connection with ${peerId}`)

        // Clear any previous error related to connecting to this peer upon success
        setConnectionError(prevError => {
            // Check if the error was related to this specific peer before clearing
            // Note: PeerJS errors might not always directly contain the target peer ID in a structured way
            // Simple clear on any successful connection might be okay, or add more logic if needed.
            return null;
        });


        conn.on('data', (data: any) => {
            // Update lastSeen on any data received
            setPeers(prevPeers => prevPeers.map(p =>
                p.id === peerId ? { ...p, lastSeen: Date.now() } : p
            ))
            handleIncomingData(data, conn) // Pass connection object
        })

        conn.on('open', () => {
            console.log(`Data connection opened with ${peerId}`)
            // setIsConnected(true) // Set based on peerRef connection to server
            connectionsRef.current.set(peerId, conn)
            setPeers(prevPeers => {
                // Avoid adding duplicate peers if 'open' fires multiple times or races with 'connection'
                if (prevPeers.some(p => p.id === peerId)) {
                    return prevPeers.map(p => p.id === peerId ? { ...p, lastSeen: Date.now() } : p);
                }
                return [...prevPeers, { id: peerId, connection: conn, lastSeen: Date.now() }]
            })
        })

        conn.on('close', () => {
            console.warn(`Data connection closed with ${peerId}`)
            connectionsRef.current.delete(peerId)
            setPeers(prevPeers => prevPeers.filter(p => p.id !== peerId))
            // Maybe set global isConnected to false if peers.length becomes 0?
            // if (connectionsRef.current.size === 0) setIsConnected(false);
            toast.info(`Peer ${peerId} disconnected.`);
        })

        conn.on('error', (err) => {
            console.error(`Data connection error with ${peerId}:`, err)
            connectionsRef.current.delete(peerId)
            setPeers(prevPeers => prevPeers.filter(p => p.id !== peerId))
            setConnectionError(err); // Store connection-specific errors too
            toast.error(`Error with peer ${peerId}: ${err.message}`);
        })
    }, [handleIncomingData])

    useEffect(() => {
        const initializePeer = () => {
            console.log("Initializing PeerJS...")
            // Cleanup previous peer instance if exists
            if (peerRef.current) {
                console.log("Destroying previous PeerJS instance.")
                peerRef.current.destroy()
                peerRef.current = null;
                setMyPeerId(null);
                setPeers([]);
                connectionsRef.current.clear();
                setIsConnected(false);
                setConnectionError(null); // Clear error on re-initialization
            }

            const createPeer = () => {
                const shortId = generateShortId()
                console.log(`Attempting to create PeerJS instance with ID: ${shortId}`)
                // Explicitly provide host and port for local development if needed
                // const peer = new Peer(shortId, {
                //     host: 'localhost',
                //     port: 9000,
                //     path: '/myapp'
                // });
                const peer = new Peer(shortId); // Use default PeerServer Cloud
                peerRef.current = peer

                peer.on('open', (id) => {
                    console.log('PeerJS connection open. My Peer ID is:', id)
                    setMyPeerId(id)
                    setIsConnected(true) // Connected to PeerJS server
                    setConnectionError(null); // Clear any previous error on successful open
                })

                peer.on('connection', (conn) => {
                    console.log(`Incoming connection from ${conn.peer}`)
                    if (connectionsRef.current.has(conn.peer)) {
                        console.log(`Already connected to ${conn.peer}. Ignoring new connection request.`);
                        // Optionally close the new connection if needed: conn.close();
                        return;
                    }
                    toast.info(`Incoming connection from ${conn.peer}`)
                    setupConnectionListeners(conn)
                })

                peer.on('error', (err) => {
                    console.error('PeerJS error:', err.type, err);
                    setConnectionError(err); // Store the error object in state

                    // Specific handling for ID taken
                    if (err.type === 'unavailable-id') {
                        console.warn(`Peer ID ${shortId} is already taken. Retrying...`);
                        peer.destroy(); // Clean up the failed peer instance
                        setTimeout(createPeer, 100); // Retry after a short delay
                    } else if (err.type === 'disconnected') {
                        // Handle temporary server disconnection
                        console.warn('PeerJS disconnected from signaling server. Attempting to reconnect...');
                        setIsConnected(false);
                        // PeerJS attempts reconnection automatically. We might want to update UI.
                    } else if (err.type === 'network') {
                        // Handle network errors (e.g., server unreachable)
                        console.error('PeerJS network error. Could not reach signaling server.');
                        setIsConnected(false);
                        // Maybe schedule a retry or inform the user persistently
                    } else if (err.type === 'server-error') {
                        console.error('PeerJS server error.');
                        setIsConnected(false);
                    }
                    // Note: 'peer-unavailable' is typically associated with a DataConnection error,
                    // but might appear here if the server check fails immediately.
                    // The setConnectionError(err) above will capture it.
                })

                peer.on('disconnected', () => {
                    // This event signifies temporary disconnection from the signaling server.
                    console.warn('PeerJS disconnected from signaling server. PeerJS will attempt to reconnect.');
                    setIsConnected(false);
                    // Update UI to show a "reconnecting" or "disconnected" state.
                    // Don't set connectionError here unless reconnection fails persistently (handled by 'error' event).
                });


                peer.on('close', () => {
                    console.log('PeerJS connection closed.');
                    // This happens when destroy() is called or connection is lost permanently.
                    setIsConnected(false);
                    setMyPeerId(null); // Reset ID as the instance is gone
                    setConnectionError(prevError => prevError || new PeerError('network', 'Peer instance closed.')); // Set a generic error if none exists
                });
            }

            createPeer();
        }

        initializePeer()

        return () => {
            if (peerRef.current) {
                console.log("Destroying PeerJS instance on component unmount.")
                peerRef.current.destroy()
                peerRef.current = null;
            }
        }
    }, [setupConnectionListeners]) // setupConnectionListeners is memoized

    const connectToPeer = useCallback(async (peerId: string): Promise<void> => {
        if (!peerRef.current || !myPeerId) {
            throw new Error('PeerJS not initialized.')
        }
        if (peerId === myPeerId) {
            throw new Error('Cannot connect to self.')
        }
        if (connectionsRef.current.has(peerId)) {
            console.log(`Already connected or connecting to ${peerId}.`);
            // Optionally return early or re-setup listeners if needed
            // Re-running setup might be useful if the previous connection state is uncertain
            const existingConn = connectionsRef.current.get(peerId);
            if (existingConn) {
                // Ensure listeners are attached, especially if connection attempt was interrupted
                // setupConnectionListeners(existingConn); // Careful not to duplicate listeners
            }
            return; // Don't attempt a new connection if one exists/is pending
        }


        console.log(`Attempting to connect to peer: ${peerId}`)
        clearConnectionError(); // Clear previous errors before attempting new connection

        try {
            const conn = peerRef.current.connect(peerId, { reliable: true })
            if (!conn) {
                // This case should theoretically not happen if peerRef.current is valid,
                // but handle defensively.
                throw new Error(`Failed to initiate connection to ${peerId}.`);
            }
            connectionsRef.current.set(peerId, conn); // Store connection attempt immediately
            setupConnectionListeners(conn) // Setup listeners immediately
            // The actual 'open' state is handled by the event listeners setup above
        } catch (error) {
            console.error(`Error initiating connection to ${peerId}:`, error);
            // Set error state if the .connect() call itself fails, though unlikely for 'peer-unavailable'
            setConnectionError(new PeerError('network', `Failed to initiate connection: ${error instanceof Error ? error.message : String(error)}`));
            throw error; // Re-throw immediate errors
        }
    }, [myPeerId, setupConnectionListeners, clearConnectionError])

    const sendFile = useCallback(async (file: File, peerId: string, onProgress: (progress: number, status: TransferStatus) => void) => {
        const peer = peers.find(p => p.id === peerId)
        if (!peer?.connection || !peer.connection.open) {
            console.error(`No open connection found for peer ${peerId}`);
            onProgress(0, 'error'); // Signal error immediately
            throw new Error(`No open connection to peer ${peerId}`);
        }

        const connection = peer.connection;
        const chunkSize = 64 * 1024 // 64 KB
        const totalChunks = Math.ceil(file.size / chunkSize)
        const transferId = getTransferId(file.name, peerId)
        console.log(`Starting file send: ${file.name} to ${peerId}, Size: ${file.size}, Chunks: ${totalChunks}`);

        outgoingTransfersRef.current[transferId] = {
            fileName: file.name,
            peerId,
            totalChunks,
            sentChunks: 0,
            acknowledgedChunks: 0,
            onProgress,
            isCompleteConfirmed: false,
        }

        // Send file-start message
        try {
            connection.send({
                type: 'file-start',
                fileName: file.name,
                totalChunks,
                fileSize: file.size
            });
        } catch (error) {
            console.error(`Error sending file-start for ${file.name} to ${peerId}:`, error);
            onProgress(0, 'error');
            delete outgoingTransfersRef.current[transferId];
            throw error; // Rethrow to stop the process
        }


        onProgress(0, 'sending'); // Initial progress update

        // Function to send a specific chunk
        const sendChunk = async (chunkIndex: number): Promise<boolean> => {
            // Check if connection is still open before sending each chunk
            if (!connection.open) {
                console.error(`Connection to ${peerId} closed before sending chunk ${chunkIndex} of ${file.name}`);
                return false; // Indicate failure
            }

            const start = chunkIndex * chunkSize
            const end = Math.min(start + chunkSize, file.size)
            const chunk = await file.slice(start, end).arrayBuffer()

            return new Promise((resolve) => {
                const trySend = () => {
                    // Check connection again right before sending
                    if (!connection.open) {
                        console.error(`Connection to ${peerId} closed while trying to send chunk ${chunkIndex} of ${file.name}`);
                        resolve(false); // Indicate failure
                        return;
                    }
                    try {
                        connection.send({
                            type: 'file-chunk',
                            chunk,
                            chunkIndex,
                            // No need to send totalChunks or fileName in every chunk if receiver tracks it from file-start
                            fileName: file.name // Sending filename for safety/simpler receiver logic
                        });

                        // Update progress based on sending the chunk
                        const transfer = outgoingTransfersRef.current[transferId];
                        if (transfer && !transfer.isCompleteConfirmed) {
                            transfer.sentChunks += 1;
                            const sentProgress = (transfer.sentChunks / transfer.totalChunks) * 100;
                            transfer.onProgress(sentProgress, 'sending');
                        }
                        resolve(true); // Indicate success
                    } catch (error) {
                        // This catch block might not be reliable for DataConnection send errors (like buffer full)
                        // PeerJS handles buffering internally to some extent.
                        // If send fails persistently, the connection might close or error out.
                        console.warn(`Error during trySend chunk ${chunkIndex} (might retry or fail later):`, error);
                        // Simple retry - could implement backoff or max retries
                        setTimeout(trySend, 100);
                        // For now, resolve(false) on immediate error might be too aggressive. Let PeerJS handle it.
                        // Consider resolving false only after multiple failed retries.
                        // Let's assume PeerJS handles buffering and resolve true optimistically,
                        // relying on connection close/error events for hard failures.
                        // resolve(false);
                    }
                }
                trySend()
            })
        }

        // Send all chunks sequentially
        for (let i = 0; i < totalChunks; i++) {
            const success = await sendChunk(i);
            if (!success) {
                console.error(`Failed to send chunk ${i} for ${file.name}. Aborting transfer.`);
                onProgress(outgoingTransfersRef.current[transferId]?.sentChunks / totalChunks * 100 || 0, 'error');
                delete outgoingTransfersRef.current[transferId];
                throw new Error(`Failed to send chunk ${i}`);
            }
            // Optional: Add a small delay if buffer issues persist despite reliable=true
            // await new Promise(resolve => setTimeout(resolve, 5));
        }

        // Send file-end message after all chunks are sent
        if (connection.open) {
            try {
                connection.send({
                    type: 'file-end',
                    fileName: file.name,
                });
                console.log(`Sent file-end for ${file.name} to ${peerId}`);
            } catch (error) {
                console.error(`Error sending file-end for ${file.name} to ${peerId}:`, error);
                // Don't necessarily mark as error yet, wait for potential file-ack timeout/failure
            }
        } else {
            console.error(`Connection to ${peerId} closed before sending file-end for ${file.name}`);
            onProgress(outgoingTransfersRef.current[transferId]?.sentChunks / totalChunks * 100 || 0, 'error');
            delete outgoingTransfersRef.current[transferId];
            throw new Error('Connection closed before sending file-end');
        }

        // --- Removed timeout check - completion is now driven by file-ack ---

    }, [peers]) // Depends on the peers list to find the connection

    return {
        myPeerId,
        peers,
        connectToPeer,
        sendFile,
        isConnected,
        receivingFiles,
        connectionError,
        clearConnectionError
    }
}