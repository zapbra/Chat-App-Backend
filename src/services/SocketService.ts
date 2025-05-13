import { getIO } from "./socket";

export const getUserCountInRoom = (roomId: string) => {
    const io = getIO();
    const count = io.sockets.adapter.rooms.get(roomId)?.size || 0;
    return count;
};
