declare module 'violet' {
      namespace Events {
            interface callEvent {
                  call: {
                        callType: 'audio' | 'video';
                        method: 'private' | 'groups';
                        attr: {
                              group: boolean;
                              id: string;
                        };
                  };
            }
      }
}

export const CallReceive = (msg: import('violet').Events.callEvent) => {
      if (msg.call) {
            const call = msg.call;
      }
};
